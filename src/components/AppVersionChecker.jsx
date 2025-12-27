import { useEffect, useRef, useCallback } from 'react';
import { listAppVersions } from '@/components/instabackService';
import { isNativeCapacitor } from '@/components/onesignalService';

// מפתח לשמירת הגרסה ב-localStorage
const LOCAL_VERSION_KEY = 'planora_app_version';
const LAST_CHECK_KEY = 'planora_last_version_check';
const UPDATE_AVAILABLE_KEY = 'planora_update_available';

// זמן מינימלי בין בדיקות (5 דקות)
const MIN_CHECK_INTERVAL = 5 * 60 * 1000;

/**
 * AppVersionChecker
 * בודק אם יש עדכון גרסה חדש כשהאפליקציה חוזרת מהרקע
 * אם יש גרסה חדשה - מרענן את העמוד
 */
export default function AppVersionChecker() {
    const isCheckingRef = useRef(false);
    const isNativeRef = useRef(null);

    // בדיקה אם אנחנו באפליקציה נייטיב
    if (isNativeRef.current === null) {
        isNativeRef.current = isNativeCapacitor();
    }

    const checkForUpdates = useCallback(async (forceRefresh = false) => {
        if (isCheckingRef.current) return;
        if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;

        try {
            if (!forceRefresh) {
                const lastCheck = localStorage.getItem(LAST_CHECK_KEY);
                if (lastCheck && (Date.now() - parseInt(lastCheck, 10)) < MIN_CHECK_INTERVAL) {
                    console.log('[AppVersionChecker] Skipping check - too recent');
                    return;
                }
            }

            isCheckingRef.current = true;
            console.log('[AppVersionChecker] 🔍 Checking for updates...');

            const localVersion = localStorage.getItem(LOCAL_VERSION_KEY);
            console.log('[AppVersionChecker] Local version:', localVersion);
            
            const versions = await listAppVersions();
            console.log('[AppVersionChecker] Server versions:', versions);
            
            if (!versions || !Array.isArray(versions)) {
                console.warn('[AppVersionChecker] Invalid response from server:', versions);
                localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
                return;
            }
            
            const publishedVersions = versions.filter(v => v.isPublished || v.is_published);
            console.log('[AppVersionChecker] Published versions:', publishedVersions.length);
            
            if (!publishedVersions.length) {
                console.log('[AppVersionChecker] No published versions found');
                localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
                return;
            }

            // מיון לפי מספר גרסה (1.0.3 > 1.0.2 > 1.0.1)
            publishedVersions.sort((a, b) => {
                const vA = (a.version || '0.0.0').split('.').map(n => parseInt(n, 10) || 0);
                const vB = (b.version || '0.0.0').split('.').map(n => parseInt(n, 10) || 0);
                
                for (let i = 0; i < Math.max(vA.length, vB.length); i++) {
                    const numA = vA[i] || 0;
                    const numB = vB[i] || 0;
                    if (numB !== numA) return numB - numA;
                }
                return 0;
            });

            const serverVersion = publishedVersions[0].version;
            console.log('[AppVersionChecker] Latest server version:', serverVersion);
            localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));

            if (!localVersion) {
                console.log('[AppVersionChecker] No local version, setting to:', serverVersion);
                localStorage.setItem(LOCAL_VERSION_KEY, serverVersion);
                return;
            }

            // השוואת גרסאות - בדיקה אם הגרסה מהשרת חדשה יותר
            const isNewerVersion = (server, local) => {
                const vServer = (server || '0.0.0').split('.').map(n => parseInt(n, 10) || 0);
                const vLocal = (local || '0.0.0').split('.').map(n => parseInt(n, 10) || 0);
                
                for (let i = 0; i < Math.max(vServer.length, vLocal.length); i++) {
                    const numServer = vServer[i] || 0;
                    const numLocal = vLocal[i] || 0;
                    if (numServer > numLocal) return true;
                    if (numServer < numLocal) return false;
                }
                return false;
            };

            console.log('[AppVersionChecker] Comparing versions:', { local: localVersion, server: serverVersion });

            if (isNewerVersion(serverVersion, localVersion)) {
                console.log('[AppVersionChecker] ✅ Update available:', serverVersion, '> current:', localVersion);
                localStorage.setItem(UPDATE_AVAILABLE_KEY, serverVersion);
                
                // Dispatch event to notify Layout immediately
                try {
                    window.dispatchEvent(new CustomEvent('planora:update-available', { 
                        detail: { version: serverVersion } 
                    }));
                    console.log('[AppVersionChecker] 📢 Dispatched update event');
                } catch (e) {
                    console.warn('[AppVersionChecker] Failed to dispatch event:', e);
                }
            } else {
                console.log('[AppVersionChecker] ℹ️ No update needed, local version is up to date');
            }
        } catch (error) {
            console.error('[AppVersionChecker] ❌ Error checking versions:', error);
            console.error('[AppVersionChecker] Error details:', {
                message: error.message,
                stack: error.stack
            });
        } finally {
            isCheckingRef.current = false;
        }
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        
        const initialTimer = setTimeout(() => {
            checkForUpdates().catch(() => {});
        }, 5000);

        const handleVisibilityChange = () => {
            try {
                if (!document.hidden) {
                    setTimeout(() => {
                        checkForUpdates().catch(() => {});
                    }, 1000);
                }
            } catch (error) {
                console.warn('[AppVersionChecker] visibility error:', error);
            }
        };

        let resumeListener = null;
        if (isNativeRef.current && typeof window !== 'undefined') {
            try {
                const cap = window.Capacitor;
                if (cap?.Plugins?.App?.addListener) {
                    const listener = cap.Plugins.App.addListener('resume', () => {
                        setTimeout(() => {
                            checkForUpdates(true).catch(() => {});
                        }, 1000);
                    });
                    // Capacitor 3+ returns a Promise, older versions return the listener directly
                    if (listener && typeof listener.then === 'function') {
                        listener.then(l => { resumeListener = l; }).catch(() => {});
                    } else {
                        resumeListener = listener;
                    }
                }
            } catch (error) {
                console.warn('[AppVersionChecker] Capacitor error:', error);
            }
        }

        try {
            document.addEventListener('visibilitychange', handleVisibilityChange);
        } catch (error) {
            console.warn('[AppVersionChecker] addEventListener error:', error);
        }

        return () => {
            clearTimeout(initialTimer);
            try {
                document.removeEventListener('visibilitychange', handleVisibilityChange);
            } catch {}
            try {
                if (resumeListener?.remove) resumeListener.remove();
            } catch {}
        };
    }, [checkForUpdates]);

    // הקומפוננטה לא מרנדרת כלום - רק לוגיקה
    return null;
}

/**
 * פונקציית עזר לעדכון הגרסה ב-Instaback
 * ניתן לקרוא לה מתוך דשבורד הניהול
 */
export const updateAppVersionInInstaback = async (newVersion, title = null, features = []) => {
    const { createAppVersion, listAppVersions, updateAppVersion } = await import('@/components/instabackService');
    
    // בדיקה אם הגרסה כבר קיימת
    const existingVersions = await listAppVersions();
    const existing = existingVersions.find(v => v.version === newVersion);
    
    if (existing) {
        // עדכון גרסה קיימת
        return updateAppVersion(existing.id, {
            isPublished: true,
            is_published: true,
            releaseDate: new Date().toISOString(),
            release_date: new Date().toISOString()
        });
    } else {
        // יצירת גרסה חדשה
        return createAppVersion({
            version: newVersion,
            title: title || `גרסה ${newVersion}`,
            releaseDate: new Date().toISOString(),
            release_date: new Date().toISOString(),
            features: features,
            isPublished: true,
            is_published: true,
            showPopup: true,
            show_popup: true,
            notificationSent: false,
            notification_sent: false
        });
    }
};
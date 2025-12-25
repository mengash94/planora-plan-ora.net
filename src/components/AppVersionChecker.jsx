import { useEffect, useRef, useCallback } from 'react';
import { listAppVersions } from '@/components/instabackService';
import { isNativeCapacitor } from '@/components/onesignalService';

// מפתח לשמירת הגרסה ב-localStorage
const LOCAL_VERSION_KEY = 'planora_app_version';
const LAST_CHECK_KEY = 'planora_last_version_check';

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
        // מניעת בדיקות כפולות
        if (isCheckingRef.current) {
            console.log('[AppVersionChecker] Already checking, skipping...');
            return;
        }

        // בדיקת זמן מאז הבדיקה האחרונה
        if (!forceRefresh) {
            const lastCheck = localStorage.getItem(LAST_CHECK_KEY);
            if (lastCheck) {
                const timeSinceLastCheck = Date.now() - parseInt(lastCheck, 10);
                if (timeSinceLastCheck < MIN_CHECK_INTERVAL) {
                    console.log('[AppVersionChecker] Skipping check, too soon since last check');
                    return;
                }
            }
        }

        isCheckingRef.current = true;
        console.log('[AppVersionChecker] 🔍 Checking for app updates...');

        try {
            // שליפת הגרסה השמורה מקומית
            const localVersion = localStorage.getItem(LOCAL_VERSION_KEY);
            
            // שליפת הגרסה העדכנית מהשרת
            const versions = await listAppVersions();
            
            // מציאת הגרסה האחרונה שפורסמה
            const publishedVersions = versions.filter(v => v.isPublished || v.is_published);
            
            if (publishedVersions.length === 0) {
                console.log('[AppVersionChecker] No published versions found');
                localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
                return;
            }

            // מיון לפי תאריך שחרור (הכי חדש ראשון)
            publishedVersions.sort((a, b) => {
                const dateA = new Date(a.releaseDate || a.release_date || a.createdAt || 0);
                const dateB = new Date(b.releaseDate || b.release_date || b.createdAt || 0);
                return dateB - dateA;
            });

            const latestVersion = publishedVersions[0];
            const serverVersion = latestVersion.version;

            console.log('[AppVersionChecker] 📦 Local version:', localVersion);
            console.log('[AppVersionChecker] 🌐 Server version:', serverVersion);

            // שמירת זמן הבדיקה
            localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));

            // אם אין גרסה מקומית - שמור את הגרסה הנוכחית ואל תרענן
            if (!localVersion) {
                console.log('[AppVersionChecker] 💾 First time - saving current version');
                localStorage.setItem(LOCAL_VERSION_KEY, serverVersion);
                return;
            }

            // בדיקה אם הגרסה השתנתה
            if (localVersion !== serverVersion) {
                console.log('[AppVersionChecker] 🚀 New version detected! Reloading...');
                console.log(`[AppVersionChecker] ${localVersion} → ${serverVersion}`);
                
                // שמירת הגרסה החדשה לפני הרענון
                localStorage.setItem(LOCAL_VERSION_KEY, serverVersion);
                
                // רענון העמוד
                window.location.reload();
            } else {
                console.log('[AppVersionChecker] ✅ App is up to date');
            }

        } catch (error) {
            console.warn('[AppVersionChecker] ❌ Error checking for updates:', error.message);
        } finally {
            isCheckingRef.current = false;
        }
    }, []);

    useEffect(() => {
        // בדיקה ראשונית בטעינה
        checkForUpdates();

        // האזנה לאירועי Capacitor (resume מהרקע)
        const handleAppResume = () => {
            console.log('[AppVersionChecker] 📱 App resumed from background');
            checkForUpdates(true); // force check on resume
        };

        // האזנה ל-visibility change (לדפדפן רגיל ול-WebView)
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                console.log('[AppVersionChecker] 👁️ Page became visible');
                checkForUpdates();
            }
        };

        // הוספת listener ל-Capacitor App plugin אם קיים
        let appStateListener = null;
        
        if (isNativeRef.current && window.Capacitor?.Plugins?.App) {
            const { App } = window.Capacitor.Plugins;
            
            App.addListener('appStateChange', ({ isActive }) => {
                if (isActive) {
                    console.log('[AppVersionChecker] 📱 Capacitor: App became active');
                    checkForUpdates(true);
                }
            }).then(listener => {
                appStateListener = listener;
            }).catch(err => {
                console.warn('[AppVersionChecker] Failed to add Capacitor listener:', err);
            });

            // גם listener ל-resume
            App.addListener('resume', () => {
                console.log('[AppVersionChecker] 📱 Capacitor: App resumed');
                checkForUpdates(true);
            }).catch(err => {
                console.warn('[AppVersionChecker] Failed to add resume listener:', err);
            });
        }

        // תמיד מאזינים ל-visibility change (עובד גם ב-WebView)
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Cleanup
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            
            if (appStateListener && typeof appStateListener.remove === 'function') {
                appStateListener.remove();
            }
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
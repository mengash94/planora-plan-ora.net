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

        if (!forceRefresh) {
            const lastCheck = localStorage.getItem(LAST_CHECK_KEY);
            if (lastCheck && (Date.now() - parseInt(lastCheck, 10)) < MIN_CHECK_INTERVAL) {
                return;
            }
        }

        isCheckingRef.current = true;

        try {
            const localVersion = localStorage.getItem(LOCAL_VERSION_KEY);
            const versions = await listAppVersions();
            const publishedVersions = versions.filter(v => v.isPublished || v.is_published);
            
            if (!publishedVersions.length) {
                localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
                return;
            }

            publishedVersions.sort((a, b) => 
                new Date(b.releaseDate || b.release_date || 0) - new Date(a.releaseDate || a.release_date || 0)
            );

            const serverVersion = publishedVersions[0].version;
            localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));

            if (!localVersion) {
                localStorage.setItem(LOCAL_VERSION_KEY, serverVersion);
                return;
            }

            if (localVersion !== serverVersion) {
                // Instead of auto-reload, save that update is available
                localStorage.setItem(UPDATE_AVAILABLE_KEY, serverVersion);
                console.log('[AppVersionChecker] Update available:', serverVersion);
            }
        } catch (error) {
            console.warn('[AppVersionChecker]', error.message);
        } finally {
            isCheckingRef.current = false;
        }
    }, []);

    useEffect(() => {
        // Delayed check to not block initial load
        const initialTimer = setTimeout(() => checkForUpdates(), 5000);

        const handleVisibilityChange = () => {
            if (!document.hidden) {
                setTimeout(() => checkForUpdates(), 1000);
            }
        };

        let resumeListener = null;
        if (isNativeRef.current && window.Capacitor?.Plugins?.App) {
            window.Capacitor.Plugins.App.addListener('resume', () => {
                setTimeout(() => checkForUpdates(true), 1000);
            }).then(l => resumeListener = l).catch(() => {});
        }

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearTimeout(initialTimer);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (resumeListener?.remove) resumeListener.remove();
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
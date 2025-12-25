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
        // Skip version check in native Capacitor apps - they update via app stores
        if (isNativeRef.current) {
            console.log('[AppVersionChecker] Skipping version check in native app');
            return;
        }

        // מניעת בדיקות כפולות
        if (isCheckingRef.current) {
            return;
        }

        // בדיקת זמן מאז הבדיקה האחרונה
        if (!forceRefresh) {
            const lastCheck = localStorage.getItem(LAST_CHECK_KEY);
            if (lastCheck) {
                const timeSinceLastCheck = Date.now() - parseInt(lastCheck, 10);
                if (timeSinceLastCheck < MIN_CHECK_INTERVAL) {
                    return;
                }
            }
        }

        isCheckingRef.current = true;

        try {
            const localVersion = localStorage.getItem(LOCAL_VERSION_KEY);
            const versions = await listAppVersions();
            const publishedVersions = versions.filter(v => v.isPublished || v.is_published);
            
            if (publishedVersions.length === 0) {
                localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
                return;
            }

            publishedVersions.sort((a, b) => {
                const dateA = new Date(a.releaseDate || a.release_date || a.createdAt || 0);
                const dateB = new Date(b.releaseDate || b.release_date || b.createdAt || 0);
                return dateB - dateA;
            });

            const serverVersion = publishedVersions[0].version;
            localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));

            if (!localVersion) {
                localStorage.setItem(LOCAL_VERSION_KEY, serverVersion);
                return;
            }

            if (localVersion !== serverVersion) {
                localStorage.setItem(LOCAL_VERSION_KEY, serverVersion);
                setTimeout(() => window.location.reload(), 100);
            }
        } catch (error) {
            console.warn('[AppVersionChecker] Error:', error.message);
        } finally {
            isCheckingRef.current = false;
        }
    }, []);

    useEffect(() => {
        // Only run version checks for web (PWA), skip for native Capacitor
        if (isNativeRef.current) {
            return;
        }

        // Initial check on load (delayed to not block app startup)
        const initialTimer = setTimeout(() => checkForUpdates(), 3000);

        // Visibility change listener for web/PWA only
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                checkForUpdates();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearTimeout(initialTimer);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
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
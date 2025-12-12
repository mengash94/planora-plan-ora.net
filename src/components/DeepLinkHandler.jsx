import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const DEEPLINK_DOMAIN = 'register.plan-ora.net';

/**
 * יצירת קישור deeplink לשיתוף
 */
export const createDeepLink = (type, id, params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  const query = queryString ? `?${queryString}` : '';
  
  switch (type) {
    case 'event':
      return `https://${DEEPLINK_DOMAIN}/EventDetail?id=${id}${query ? '&' + query : ''}`;
    case 'join':
      return `https://${DEEPLINK_DOMAIN}/JoinEvent?id=${id}${query ? '&' + query : ''}`;
    case 'chat':
      return `https://${DEEPLINK_DOMAIN}/EventDetail?id=${id}&tab=chat${query ? '&' + query : ''}`;
    case 'task':
      return `https://${DEEPLINK_DOMAIN}/EventDetail?id=${id}&tab=tasks${query ? '&' + query : ''}`;
    default:
      return `https://${DEEPLINK_DOMAIN}/${type}/${id}${query}`;
  }
};

/**
 * המרת URL מלא לנתיב יחסי באפליקציה
 */
export const parseDeepLinkUrl = (url) => {
  try {
    console.log('[DeepLink] 📥 Parsing URL:', url);

    // אם זה לא URL מלא, החזר אותו כמו שהוא
    if (!url.startsWith('http')) {
      const path = url.startsWith('/') ? url : '/' + url;
      console.log('[DeepLink] ➡️ Relative path:', path);
      return path;
    }

    const urlObj = new URL(url);
    
    // בדוק שזה הדומיין שלנו
    if (!urlObj.hostname.includes('plan-ora.net')) {
      console.warn('[DeepLink] ⚠️ External URL, redirecting to home');
      return createPageUrl('Home');
    }

    // חלץ את הנתיב והפרמטרים
    const relativePath = urlObj.pathname + urlObj.search + urlObj.hash;
    
    console.log('[DeepLink] ✅ Parsed to:', relativePath);
    return relativePath;

  } catch (error) {
    console.error('[DeepLink] ❌ Parse error:', error);
    return createPageUrl('Home');
  }
};

/**
 * Hook לטיפול ב-deeplinks - עובד ב-Capacitor וב-PWA
 */
export const useDeepLinkHandler = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // ✅ בדוק אם יש Capacitor
    const hasCapacitor = typeof window !== 'undefined' && 
                        window.Capacitor?.Plugins?.App;

    if (!hasCapacitor) {
      console.log('[DeepLink] Running in browser mode');
      return;
    }

    console.log('[DeepLink] ✅ Setting up Capacitor deep link handler');

    const handleAppUrlOpen = (data) => {
      try {
        console.log('[DeepLink] 🔗 App opened with URL:', data.url);

        const targetPath = parseDeepLinkUrl(data.url);
        
        console.log('[DeepLink] ➡️ Navigating to:', targetPath);

        // קצת דיליי כדי שהאפליקציה תהיה מוכנה
        setTimeout(() => {
          navigate(targetPath);
        }, 300);
      } catch (error) {
        console.error('[DeepLink] ❌ Error handling URL:', error);
      }
    };

    const CapacitorApp = window.Capacitor.Plugins.App;

    // ✅ האזן לפתיחת האפליקציה מ-URL (כולל push notifications)
    const listener = CapacitorApp.addListener('appUrlOpen', handleAppUrlOpen);

    // ✅ בדוק אם האפליקציה נפתחה עם URL (cold start)
    CapacitorApp.getLaunchUrl().then((result) => {
      if (result?.url) {
        console.log('[DeepLink] 🚀 App launched with URL:', result.url);
        handleAppUrlOpen({ url: result.url });
      }
    }).catch(err => {
      console.warn('[DeepLink] getLaunchUrl warning:', err);
    });

    // ✅ ניקוי
    return () => {
      listener?.remove();
    };
  }, [navigate]);
};

/**
 * שיתוף deeplink
 */
export const shareDeepLink = async (type, id, title, message, params = {}) => {
  const url = createDeepLink(type, id, params);
  const fullMessage = `${message}\n\n${url}`;

  if (typeof navigator.share !== 'undefined') {
    try {
      await navigator.share({
        title: title,
        text: fullMessage,
        url: url
      });
      return true;
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.warn('[DeepLink] Share failed:', error);
      }
    }
  }

  try {
    await navigator.clipboard.writeText(fullMessage);
    return true;
  } catch (error) {
    console.error('[DeepLink] Copy failed:', error);
    return false;
  }
};

export default useDeepLinkHandler;
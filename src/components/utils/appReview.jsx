/**
 * App Review Utilities for Capacitor
 * מבקש דירוג מהמשתמש באמצעות In-App Review API של Google/Apple
 */

// מפתחות לאחסון מקומי
const USAGE_COUNT_KEY = 'planora_app_usage_count';
const REVIEW_SHOWN_KEY = 'planora_review_prompt_shown';
const LAST_REVIEW_DATE_KEY = 'planora_last_review_date';
const POSITIVE_ACTIONS_KEY = 'planora_positive_actions';

// הגדרות
const MIN_USAGE_FOR_REVIEW = 5;       // מספר פתיחות לפני בקשת דירוג
const MIN_POSITIVE_ACTIONS = 3;       // מספר פעולות חיוביות לפני בקשת דירוג
const DAYS_BETWEEN_PROMPTS = 30;      // ימים בין בקשות דירוג

/**
 * בדיקה אם רצים על Capacitor Native
 */
function isNativeCapacitor() {
  if (typeof window === 'undefined') return false;
  try {
    if (window.Capacitor?.isNativePlatform?.()) return true;
    const platform = window.Capacitor?.getPlatform?.();
    return platform === 'ios' || platform === 'android';
  } catch {
    return false;
  }
}

/**
 * קבלת הפלטפורמה (ios/android/web)
 */
function getPlatform() {
  if (typeof window === 'undefined') return 'web';
  try {
    return window.Capacitor?.getPlatform?.() || 'web';
  } catch {
    return 'web';
  }
}

/**
 * בקשת דירוג מהמשתמש
 * משתמש ב-In-App Review API של Google/Apple
 * ⚠️ לא יעבוד ב-TestFlight או Development - רק באפליקציה מה-Store!
 */
export async function requestReview() {
  if (!isNativeCapacitor()) {
    console.log('[AppReview] Not running on native platform, skipping review request');
    return false;
  }

  try {
    // ⚠️ Dynamic import עם Function constructor כדי לעקוף את Vite
    const importDynamic = new Function('specifier', 'return import(specifier)');
    const module = await importDynamic('@capacitor-community/in-app-review');
    
    if (module?.InAppReview?.requestReview) {
      await module.InAppReview.requestReview();
      
      console.log('[AppReview] Review dialog requested successfully');
      
      // שמור שהוצגה בקשת דירוג
      localStorage.setItem(REVIEW_SHOWN_KEY, 'true');
      localStorage.setItem(LAST_REVIEW_DATE_KEY, Date.now().toString());
      
      return true;
    } else {
      console.warn('[AppReview] InAppReview plugin not available');
      return false;
    }
  } catch (error) {
    console.warn('[AppReview] Error requesting review:', error);
    return false;
  }
}

/**
 * עדכון מונה השימושים
 * קרא בכל פתיחת אפליקציה
 */
export function incrementUsageCount() {
  try {
    const currentCount = parseInt(localStorage.getItem(USAGE_COUNT_KEY) || '0', 10);
    const newCount = currentCount + 1;
    localStorage.setItem(USAGE_COUNT_KEY, newCount.toString());
    console.log(`[AppReview] Usage count: ${newCount}`);
    return newCount;
  } catch {
    return 0;
  }
}

/**
 * עדכון מונה פעולות חיוביות
 * קרא אחרי: יצירת אירוע, שליחת הזמנות, העלאת תמונה, וכו'
 */
export function incrementPositiveActions() {
  try {
    const currentCount = parseInt(localStorage.getItem(POSITIVE_ACTIONS_KEY) || '0', 10);
    const newCount = currentCount + 1;
    localStorage.setItem(POSITIVE_ACTIONS_KEY, newCount.toString());
    console.log(`[AppReview] Positive actions: ${newCount}`);
    return newCount;
  } catch {
    return 0;
  }
}

/**
 * קבלת מספר השימושים הנוכחי
 */
export function getUsageCount() {
  try {
    return parseInt(localStorage.getItem(USAGE_COUNT_KEY) || '0', 10);
  } catch {
    return 0;
  }
}

/**
 * קבלת מספר הפעולות החיוביות
 */
export function getPositiveActions() {
  try {
    return parseInt(localStorage.getItem(POSITIVE_ACTIONS_KEY) || '0', 10);
  } catch {
    return 0;
  }
}

/**
 * בדיקה אם הגיע הזמן לבקש דירוג
 */
export function shouldRequestReview() {
  try {
    const usageCount = getUsageCount();
    const positiveActions = getPositiveActions();
    const reviewShown = localStorage.getItem(REVIEW_SHOWN_KEY) === 'true';
    const lastReviewDate = parseInt(localStorage.getItem(LAST_REVIEW_DATE_KEY) || '0', 10);
    
    // אם לא על פלטפורמה נייטיבית, לא מבקשים
    if (!isNativeCapacitor()) {
      return false;
    }
    
    // אם המשתמש לא השתמש מספיק, לא מבקשים
    if (usageCount < MIN_USAGE_FOR_REVIEW) {
      return false;
    }
    
    // אם אין מספיק פעולות חיוביות, לא מבקשים
    if (positiveActions < MIN_POSITIVE_ACTIONS) {
      return false;
    }
    
    // אם מעולם לא ביקשנו, מבקשים
    if (!reviewShown) {
      return true;
    }
    
    // אם עברו מספיק ימים מהבקשה האחרונה, מבקשים שוב
    const daysSinceLastPrompt = (Date.now() - lastReviewDate) / (1000 * 60 * 60 * 24);
    if (daysSinceLastPrompt >= DAYS_BETWEEN_PROMPTS) {
      return true;
    }
    
    return false;
  } catch {
    return false;
  }
}

/**
 * בקשת דירוג חכמה - רק אם עומדים בתנאים
 * 🎯 קרא אחרי פעולות חיוביות:
 *    - יצירת אירוע מוצלחת
 *    - שליחת הזמנות
 *    - העלאת תמונות לגלריה
 *    - סיום משימה
 */
export async function requestReviewIfAppropriate() {
  if (shouldRequestReview()) {
    console.log('[AppReview] Conditions met, requesting review...');
    return await requestReview();
  }
  console.log('[AppReview] Conditions not met for review request');
  return false;
}

/**
 * פתיחת עמוד האפליקציה בחנות
 * Fallback אם In-App Review לא עובד או למשתמשי Web
 */
export async function openStoreListing() {
  const platform = getPlatform();
  
  const urls = {
    android: 'https://play.google.com/store/apps/details?id=net.planora.app',
    ios: 'https://apps.apple.com/app/id6755497184',
    web: 'https://apps.apple.com/app/id6755497184' // ברירת מחדל
  };
  
  const url = urls[platform] || urls.web;
  
  if (isNativeCapacitor()) {
    try {
      // ⚠️ Dynamic import עם Function constructor
      const importDynamic = new Function('specifier', 'return import(specifier)');
      const module = await importDynamic('@capacitor/browser');
      
      if (module?.Browser?.open) {
        await module.Browser.open({ url });
        return true;
      }
    } catch (error) {
      console.warn('[AppReview] Error opening store:', error);
    }
  }
  
  // Fallback לפתיחה רגילה
  window.open(url, '_blank');
  return true;
}

/**
 * איפוס כל הנתונים (לבדיקות)
 */
export function resetReviewData() {
  localStorage.removeItem(USAGE_COUNT_KEY);
  localStorage.removeItem(REVIEW_SHOWN_KEY);
  localStorage.removeItem(LAST_REVIEW_DATE_KEY);
  localStorage.removeItem(POSITIVE_ACTIONS_KEY);
  console.log('[AppReview] All review data reset');
}

/**
 * קבלת סטטיסטיקות (לדיבאג)
 */
export function getReviewStats() {
  return {
    usageCount: getUsageCount(),
    positiveActions: getPositiveActions(),
    reviewShown: localStorage.getItem(REVIEW_SHOWN_KEY) === 'true',
    lastReviewDate: localStorage.getItem(LAST_REVIEW_DATE_KEY),
    shouldRequest: shouldRequestReview(),
    isNative: isNativeCapacitor(),
    platform: getPlatform()
  };
}


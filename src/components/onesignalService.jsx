/**
 * OneSignal Service – Cordova SDK v5 (Native Only)
 * 
 * ⚠️ CRITICAL: Base44 is web-only, no Capacitor plugins support
 * This service only works in native Capacitor builds
 * 
 * Strategy:
 * - NO imports (would break Base44 web build)
 * - Access OneSignal via window.plugins.OneSignal (available after cap sync)
 * - All calls wrapped in guards to prevent errors in Base44 dev
 * 
 * ✅ Cordova SDK v5 CORRECT API:
 * 1. OneSignal.initialize(APP_ID)
 * 2. OneSignal.Notifications.requestPermission()
 * 3. OneSignal.login(userId)
 * 4. OneSignal.logout()
 * 5. OneSignal.Notifications.addClickListener()
 */

// ✅ GLOBAL STATE - חי מחוץ ל-React, לא מתאפס בין remounts!
let isOneSignalInitialized = false;
let isOneSignalInitializing = false;
let oneSignalSetupCompletedForUser = null; // מזהה המשתמש שעבורו הושלם ה-setup
let oneSignalSetupInProgress = false;

function getWin() {
  return typeof window !== 'undefined' ? window : null;
}

/**
 * Get OneSignal from window.plugins (native only)
 */
function getOneSignal() {
  const w = getWin();
  if (!w) return null;
  
  // ✅ רק window.plugins.OneSignal (זמין רק ב-Native build)
  const OneSignal = w.plugins?.OneSignal || null;
  
  if (OneSignal) {
    console.log('[OneSignal] ✅ Found in window.plugins');
  } else {
    console.log('[OneSignal] ℹ️ Not available (normal in Base44 dev, will work in native build)');
  }
  
  return OneSignal;
}

/**
 * Get native platform type: 'android', 'ios', or null for web
 */
export function getNativePlatform() {
  const w = getWin();
  if (!w) return null;

  // Check Capacitor
  const C = w.Capacitor;
  if (C) {
    try {
      const platform = C.getPlatform?.();
      if (platform === 'android' || platform === 'ios') {
        return platform;
      }
    } catch (err) {
      console.warn('[OneSignal] Capacitor platform detection error:', err);
    }
  }

  // Check UserAgent fallback
  const ua = w.navigator?.userAgent || '';
  const isWebView = /wv\)/.test(ua) || ua.includes('Capacitor');
  
  if (isWebView) {
    if (/Android/i.test(ua)) return 'android';
    if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  }

  return null; // Not native
}

/**
 * Check if running in native environment
 */
export function isNativeCapacitor() {
  const w = getWin();
  if (!w) return false;

  // Check Capacitor
  const C = w.Capacitor;
  if (C) {
    try {
      const platform = C.getPlatform?.();
      const isNative = platform === 'android' || platform === 'ios';
      
      if (isNative) {
        console.log('[OneSignal] 📱 Native platform:', platform);
        return true;
      }
    } catch (err) {
      console.warn('[OneSignal] Capacitor detection error:', err);
    }
  }

  // Check UserAgent
  const ua = w.navigator?.userAgent || '';
  const isWebView = /wv\)/.test(ua) || ua.includes('Capacitor');
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  
  if (isWebView && (isAndroid || isIOS)) {
    console.log('[OneSignal] 📱 Native via UserAgent');
    return true;
  }

  return false;
}

/**
 * Initialize OneSignal (native only)
 * ✅ Cordova SDK v5: initialize() - NOT setAppId()!
 * @param {string} appId - OneSignal App ID
 * @returns {Promise<boolean>}
 */
export async function initOneSignal(appId) {
  console.log('[OneSignal] 🚀 initOneSignal called with App ID:', appId);
  
  // ✅ GLOBAL CHECK - מניעת אתחול חוזר
  if (isOneSignalInitialized) {
    console.log('[OneSignal] ⏭️ Already initialized GLOBALLY, skipping');
    return true;
  }
  
  if (isOneSignalInitializing) {
    console.log('[OneSignal] ⏳ Already initializing GLOBALLY, waiting...');
    // המתן עד 5 שניות לסיום אתחול
    for (let i = 0; i < 50; i++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (isOneSignalInitialized) {
        console.log('[OneSignal] ✅ Initialization completed while waiting');
        return true;
      }
    }
    console.warn('[OneSignal] ⚠️ Timeout waiting for initialization');
    return false;
  }
  
  if (!isNativeCapacitor()) {
    console.log('[OneSignal] ⏭️ Not native, skipping (normal in Base44 dev)');
    return false;
  }

  const OneSignal = getOneSignal();
  if (!OneSignal) {
    console.warn('[OneSignal] ⚠️ Plugin not found (will be available after native build)');
    return false;
  }

  try {
    isOneSignalInitializing = true;
    console.log('[OneSignal] 🔧 Starting initialization...');

    // ✅ v5: Enable debug logging FIRST
    if (OneSignal.Debug?.setLogLevel) {
      OneSignal.Debug.setLogLevel(6); // Verbose
      console.log('[OneSignal] 📝 Debug logging enabled');
    }

    // ✅ Cordova SDK v5: initialize() - NOT setAppId()!
    if (typeof OneSignal.initialize !== 'function') {
      console.error('[OneSignal] ❌ initialize() not found!');
      console.error('[OneSignal] Available methods:', Object.keys(OneSignal));
      isOneSignalInitializing = false;
      return false;
    }

    console.log('[OneSignal] 📲 Calling initialize()...');
    await OneSignal.initialize(appId);
    console.log('[OneSignal] ✅ initialize() completed');

    // ✅ v5: Set up notification click handler
    if (OneSignal.Notifications?.addClickListener) {
      console.log('[OneSignal] 👂 Adding click listener...');
      OneSignal.Notifications.addClickListener((event) => {
        console.log('[OneSignal] 📱 Notification clicked:', event);
        
        try {
          const data = event?.notification?.additionalData || {};
          const actionUrl = data.actionUrl || data.action_url || data.url;
          
          console.log('[OneSignal] 📌 Action URL:', actionUrl);
          
          if (actionUrl) {
            const w = getWin();
            if (w) {
              // ✅ אם זה deeplink של register.plan-ora.net, DeepLinkHandler יטפל בזה
              console.log('[OneSignal] 🧭 Navigating to:', actionUrl);
              
              // ✅ עיכוב קטן כדי לוודא שהאפליקציה מוכנה
              setTimeout(() => {
                if (actionUrl.startsWith('http')) {
                  w.location.href = actionUrl;
                } else {
                  // נתיב פנימי
                  w.dispatchEvent(
                    new CustomEvent('onesignal:navigate', { 
                      detail: { route: actionUrl } 
                    })
                  );
                }
              }, 500);
            }
          }
        } catch (err) {
          console.error('[OneSignal] Error handling click:', err);
        }
      });
      console.log('[OneSignal] ✅ Click listener added');
    }

    console.log('[OneSignal] ✅✅✅ Initialization complete!');
    isOneSignalInitialized = true;
    isOneSignalInitializing = false;
    return true;
  } catch (error) {
    console.error('[OneSignal] ❌ Init failed:', error);
    console.error('[OneSignal] Error details:', {
      message: error?.message,
      stack: error?.stack
    });
    isOneSignalInitializing = false;
    return false;
  }
}

/**
 * Request notification permission (Android 13+, iOS)
 * ✅ Cordova SDK v5: Notifications.requestPermission()
 * @returns {Promise<boolean>}
 */
export async function requestNotificationPermission() {
  console.log('[OneSignal] 🔔 Request permission called');
  
  // ✅ וידוא שהאתחול הושלם
  if (!isOneSignalInitialized) {
    console.warn('[OneSignal] ⚠️ Cannot request permission - OneSignal not initialized');
    return false;
  }
  
  if (!isNativeCapacitor()) {
    console.log('[OneSignal] ⏭️ Not native, skipping');
    return false;
  }

  const OneSignal = getOneSignal();
  if (!OneSignal) {
    console.warn('[OneSignal] ⚠️ Plugin not available');
    return false;
  }

  try {
    // ✅ v5: Notifications.requestPermission()
    if (!OneSignal.Notifications?.requestPermission) {
      console.error('[OneSignal] ❌ Notifications.requestPermission() not found');
      return false;
    }

    console.log('[OneSignal] 🔔 Calling Notifications.requestPermission()...');
    
    // ✅ הוספת timeout למניעת תקיעה
    const permissionPromise = OneSignal.Notifications.requestPermission(true);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Permission request timeout')), 10000)
    );
    
    const granted = await Promise.race([permissionPromise, timeoutPromise]);
    console.log('[OneSignal] ✅ Permission granted:', granted);
    
    return !!granted;
  } catch (error) {
    if (error.message === 'Permission request timeout') {
      console.error('[OneSignal] ⏱️ Permission request timed out after 10 seconds');
    } else {
      console.error('[OneSignal] ❌ Request permission failed:', error);
    }
    return false;
  }
}

/**
 * ✅ פונקציה מרכזית לאתחול OneSignal לפי משתמש - פעם אחת בלבד!
 * @param {string} userId - User ID from InstaBack
 * @param {string} appId - OneSignal App ID
 * @returns {Promise<string|null>} Subscription ID or null
 */
export async function setupOneSignalForUser(userId, appId) {
  console.log('[OneSignal] 🎯 setupOneSignalForUser called for:', userId);
  
  // ✅ GLOBAL CHECK - אם כבר עשינו setup למשתמש הזה, דלג!
  if (oneSignalSetupCompletedForUser === userId) {
    console.log('[OneSignal] ⏭️ Setup already completed for user:', userId);
    return null; // כבר טיפלנו בזה
  }
  
  if (oneSignalSetupInProgress) {
    console.log('[OneSignal] ⏳ Setup already in progress, skipping duplicate call');
    return null;
  }
  
  if (!isNativeCapacitor()) {
    console.log('[OneSignal] ⏭️ Not native, skipping');
    return null;
  }

  try {
    oneSignalSetupInProgress = true;
    
    // שלב 1: אתחול OneSignal (אם עוד לא)
    const initialized = await initOneSignal(appId);
    if (!initialized) {
      console.warn('[OneSignal] ❌ Initialization failed');
      oneSignalSetupInProgress = false;
      return null;
    }

    // שלב 2: בקשת הרשאה (עם timeout)
    console.log('[OneSignal] 🔔 Requesting permission...');
    const permissionPromise = requestNotificationPermission();
    const timeoutPromise = new Promise((resolve) => 
      setTimeout(() => {
        console.warn('[OneSignal] ⏱️ Permission timeout');
        resolve(false);
      }, 15000)
    );
    
    await Promise.race([permissionPromise, timeoutPromise]);

    // שלב 3: login למשתמש ב-OneSignal
    console.log('[OneSignal] 🔐 Logging in user to OneSignal...');
    const subscriptionId = await loginOneSignalExternalId(userId);
    
    // ✅ סימון שהשלמנו את ה-setup למשתמש הזה
    oneSignalSetupCompletedForUser = userId;
    console.log('[OneSignal] ✅✅✅ Setup completed for user:', userId);
    
    oneSignalSetupInProgress = false;
    return subscriptionId;
    
  } catch (error) {
    console.error('[OneSignal] ❌ Setup failed:', error);
    oneSignalSetupInProgress = false;
    return null;
  }
}

/**
 * Login user with External User ID
 * ✅ Cordova SDK v5: login() - NOT setExternalUserId()!
 * @param {string|number} userId
 * @returns {Promise<string|null>}
 */
export async function loginOneSignalExternalId(userId) {
  console.log('[OneSignal] 👤 Login called for user:', userId);
  
  // ✅ וידוא שהאתחול הושלם
  if (!isOneSignalInitialized) {
    console.warn('[OneSignal] ⚠️ Cannot login - OneSignal not initialized');
    return null;
  }
  
  if (!isNativeCapacitor()) {
    console.log('[OneSignal] ⏭️ Not native, skipping');
    return null;
  }

  const OneSignal = getOneSignal();
  if (!OneSignal) {
    console.warn('[OneSignal] ⚠️ Plugin not available');
    return null;
  }

  try {
    // ✅ Cordova SDK v5: login() - NOT setExternalUserId()!
    if (typeof OneSignal.login !== 'function') {
      console.error('[OneSignal] ❌ login() not found!');
      console.error('[OneSignal] Available methods:', Object.keys(OneSignal));
      return null;
    }

    console.log('[OneSignal] 🔐 Calling login()...');
    await OneSignal.login(String(userId));
    console.log('[OneSignal] ✅ login() completed');
    
    // Get subscription ID
    const subscriptionId = await getOneSignalSubscriptionId();
    console.log('[OneSignal] 🆔 Subscription ID:', subscriptionId);
    
    return subscriptionId;
  } catch (error) {
    console.error('[OneSignal] ❌ Login failed:', error);
    return null;
  }
}

/**
 * Logout user
 * ✅ Cordova SDK v5: logout() - NOT removeExternalUserId()!
 */
export async function logoutOneSignal() {
  console.log('[OneSignal] 🚪 Logout called');
  
  if (!isNativeCapacitor()) {
    console.log('[OneSignal] ⏭️ Not native, skipping');
    return;
  }

  const OneSignal = getOneSignal();
  if (!OneSignal) {
    console.warn('[OneSignal] ⚠️ Plugin not available');
    return;
  }

  try {
    // ✅ Cordova SDK v5: logout() - NOT removeExternalUserId()!
    if (typeof OneSignal.logout !== 'function') {
      console.error('[OneSignal] ❌ logout() not found');
      return;
    }

    console.log('[OneSignal] 🚪 Calling logout()...');
    await OneSignal.logout();
    console.log('[OneSignal] ✅ logout() completed');
    
    // ✅ איפוס ה-global state
    oneSignalSetupCompletedForUser = null;
    console.log('[OneSignal] 🔄 Global setup state reset');
  } catch (error) {
    console.error('[OneSignal] ❌ Logout failed:', error);
  }
}

/**
 * Get Subscription ID (Player ID)
 * ✅ v5: User.pushSubscription.getIdAsync()
 * @returns {Promise<string|null>}
 */
export async function getOneSignalSubscriptionId() {
  console.log('[OneSignal] 🆔 Getting subscription ID...');
  
  if (!isNativeCapacitor()) {
    return null;
  }

  const OneSignal = getOneSignal();
  if (!OneSignal) {
    return null;
  }

  try {
    // ✅ v5: User.pushSubscription.getIdAsync()
    if (OneSignal.User?.pushSubscription?.getIdAsync) {
      const subscriptionId = await OneSignal.User.pushSubscription.getIdAsync();
      console.log('[OneSignal] 🆔 Got subscription ID:', subscriptionId);
      return subscriptionId || null;
    } else {
      console.warn('[OneSignal] ⚠️ User.pushSubscription.getIdAsync() not available');
      return null;
    }
  } catch (error) {
    console.error('[OneSignal] ❌ Failed to get subscription ID:', error);
    return null;
  }
}

/**
 * Check if user has notification permission
 * ✅ v5: Notifications.getPermissionAsync()
 * @returns {Promise<boolean>}
 */
export async function hasNotificationPermission() {
  if (!isNativeCapacitor()) {
    return false;
  }

  const OneSignal = getOneSignal();
  if (!OneSignal) {
    return false;
  }

  try {
    // ✅ v5: Notifications.getPermissionAsync()
    if (OneSignal.Notifications?.getPermissionAsync) {
      const granted = await OneSignal.Notifications.getPermissionAsync();
      console.log('[OneSignal] 🔔 Permission status:', granted);
      return !!granted;
    }
    return false;
  } catch (error) {
    console.error('[OneSignal] ❌ Check permission failed:', error);
    return false;
  }
}

/**
 * Reset initialization state (for testing/debugging only)
 */
export function resetOneSignalState() {
  console.log('[OneSignal] 🔄 Resetting ALL initialization state');
  isOneSignalInitialized = false;
  isOneSignalInitializing = false;
  oneSignalSetupCompletedForUser = null;
  oneSignalSetupInProgress = false;
}
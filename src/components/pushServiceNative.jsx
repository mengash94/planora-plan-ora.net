/**
 * Push Notification Service for Native Apps
 * 
 * CORDOVA/CAPACITOR + ONESIGNAL COMPATIBLE VERSION
 * - Works with onesignal-cordova-plugin
 * - OneSignal handles ALL push functionality (no Capacitor plugins needed)
 * - This file provides stubs for compatibility with existing code
 * 
 * STRATEGY:
 * - OneSignal is configured in AuthProvider
 * - Push registration, permissions, and listeners are all handled by OneSignal
 * - No need for separate FCM token management
 * - No need for Capacitor PushNotifications/LocalNotifications plugins
 * 
 * ⚠️ IMPORTANT: Do NOT try to manage FCM tokens manually when using OneSignal!
 * OneSignal handles all token management internally.
 */

/**
 * Guard: Check if running in native environment (Capacitor OR Cordova)
 * Includes UserAgent fallback for early detection
 */
const isNative = () => {
  if (typeof window === 'undefined') return false; // SSR guard
  
  // Check 1: Capacitor API (if exists)
  const C = window.Capacitor;
  if (C) {
    try {
      return !!(
        (C.isNativePlatform && C.isNativePlatform()) ||
        (C.getPlatform && C.getPlatform() !== 'web')
      );
    } catch {
      // Fall through to UserAgent check
    }
  }
  
  // Check 2: Cordova (if exists)
  if (window.cordova) {
    console.log('[Push Native] Detected as Native via Cordova');
    return true;
  }
  
  // Check 3: UserAgent Fallback (for early init before Cordova/Capacitor loads)
  const ua = window.navigator?.userAgent || '';
  const isWebView = /wv\)/.test(ua) || ua.includes('Capacitor') || ua.includes('Cordova');
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  
  if (isWebView && (isAndroid || isIOS)) {
    console.log('[Push Native] Detected as Native via UserAgent (WebView)');
    return true;
  }
  
  return false;
};

/**
 * Create Android notification channel
 * 
 * NOTE: In Cordova/Capacitor with OneSignal, this is NOT needed.
 * OneSignal creates channels automatically.
 * Keeping this as no-op for compatibility.
 */
export async function createNotificationChannel() {
  if (!isNative()) return;
  
  console.log('[Push Native] ⏭️ Skipping channel creation (OneSignal handles this)');
  
  // OneSignal creates notification channels automatically
  // No action needed
}

/**
 * Get FCM token
 * 
 * NOTE: In Cordova/Capacitor with OneSignal, this is NOT needed.
 * OneSignal handles push registration internally.
 * The server sends notifications via OneSignal API using external_id.
 * 
 * ⚠️ DO NOT try to get FCM tokens manually - OneSignal manages everything!
 * 
 * Keeping this for backward compatibility, but it's a no-op.
 */
export async function ensurePushPermissionAndToken() {
  if (!isNative()) {
    console.log('[Push Native] Not in native environment');
    return null;
  }
  
  console.log('[Push Native] ⏭️ Skipping FCM token retrieval (OneSignal handles registration)');
  
  // OneSignal handles all push token management
  // No separate FCM token needed
  return null;
}

/**
 * Attach push listeners for incoming notifications
 * 
 * NOTE: In Cordova/Capacitor with OneSignal, listeners are already attached in AuthProvider
 * via OneSignal.Notifications.addClickListener()
 * 
 * Keeping this as no-op for compatibility.
 * Returns cleanup function (empty) to satisfy caller expectations.
 */
export function attachPushListeners(navigate) {
  if (!isNative()) {
    console.log('[Push Native] Not on native platform, skipping listener setup');
    return () => {}; // Return empty cleanup function
  }

  console.log('[Push Native] ⏭️ Skipping listener setup (OneSignal handles this via AuthProvider)');
  
  // OneSignal click listeners are already set up in:
  // - components/onesignalService.js -> initOneSignal()
  // - components/AuthProvider.jsx -> initializeOneSignalForUser()
  
  // Navigation events are dispatched via 'onesignal:navigate' custom event
  // which is already handled in AuthProvider
  
  // Return empty cleanup function
  return () => {
    console.log('[Push Native] No cleanup needed (OneSignal manages listeners)');
  };
}

/**
 * Refresh FCM token for logged-in user
 * 
 * NOTE: In Cordova/Capacitor with OneSignal, this is NOT needed.
 * OneSignal automatically updates tokens when user logs in via OneSignal.login()
 * 
 * ⚠️ DO NOT call this manually - it's a no-op!
 * 
 * Keeping this as no-op for compatibility.
 */
export async function refreshFcmTokenIfNeeded(userId) {
  if (!isNative() || !userId) {
    return;
  }

  console.log('[Push Native] ⏭️ Skipping FCM token refresh (OneSignal auto-manages tokens)');
  
  // OneSignal handles token refresh automatically
  // when OneSignal.login(userId) is called in AuthProvider
  // No manual token management needed
}

/**
 * SUMMARY FOR CORDOVA/CAPACITOR + ONESIGNAL:
 * 
 * ✅ What OneSignal handles automatically:
 * - Push token registration (FCM for Android, APNs for iOS)
 * - Notification permissions
 * - Notification channels (Android)
 * - Foreground notification display
 * - Background notification handling
 * - Click listeners
 * - Token refresh
 * - User identification via external_id
 * 
 * ✅ Where OneSignal is configured:
 * - components/onesignalService.js -> initOneSignal()
 * - components/AuthProvider.jsx -> initializeOneSignalForUser()
 * - Layout.js -> useEffect (imports pushServiceNative but OneSignal does the work)
 * 
 * ✅ What you need to do:
 * 1. Call initOneSignal(appId) once on app start (AuthProvider does this)
 * 2. Call loginOneSignalExternalId(userId) after user logs in
 * 3. Call logoutOneSignal() when user logs out
 * 
 * ❌ What you should NOT do:
 * - Don't try to get FCM tokens manually
 * - Don't try to register for push notifications manually
 * - Don't try to create notification channels manually
 * - Don't mix OneSignal with other push solutions (e.g., Firebase Cloud Messaging)
 * 
 * ✅ No additional setup needed in this file for Cordova/Capacitor!
 */
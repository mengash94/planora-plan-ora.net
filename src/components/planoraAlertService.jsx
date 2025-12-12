/**
 * Planora Alert Service - Integration with Planora Alert PWA
 * 
 * ⚠️ WEB ONLY - NOT FOR NATIVE APPS ⚠️
 * 
 * This service integrates with the external Planora Alert system for web push notifications.
 * DO NOT use this in Capacitor native apps - it will cause errors.
 * For native apps, use OneSignal (configured in AuthProvider) or FCM (pushServiceNative).
 */

const PLANORA_ALERT_HOST = 'https://studio--planoraaleret-62152057-8e5b6.us-central1.hosted.app';

// Flag to disable silent checks if they consistently fail
let silentCheckEnabled = true;
let consecutiveFailures = 0;
const MAX_FAILURES_BEFORE_DISABLE = 3;

/**
 * Check if we're in a web environment (not Capacitor native)
 * Includes UserAgent fallback for early detection
 */
const isWebOnly = () => {
  if (typeof window === 'undefined') return false; // SSR guard
  
  const C = window.Capacitor;
  
  // Check 1: Capacitor API
  if (C) {
    try {
      const isNative = !!(
        (C.isNativePlatform && C.isNativePlatform()) ||
        (C.getPlatform && C.getPlatform() !== 'web')
      );
      
      if (isNative) {
        return false; // It's native, not web-only
      }
    } catch {
      // Fall through to UserAgent check
    }
  }
  
  // Check 2: UserAgent Fallback
  const ua = window.navigator?.userAgent || '';
  const isWebView = /wv\)/.test(ua) || ua.includes('Capacitor');
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  
  if (isWebView && (isAndroid || isIOS)) {
    console.log('[PlanoraAlert Web] Detected as Native via UserAgent - blocking');
    return false; // It's native WebView, not web-only
  }
  
  // If no Capacitor and not WebView, it's web
  return !C || true;
};

/**
 * Check if silent checks are enabled
 */
export const isSilentCheckEnabled = () => silentCheckEnabled;

/**
 * Manually enable/disable silent checks
 */
export const setSilentCheckEnabled = (enabled) => {
    silentCheckEnabled = enabled;
    if (enabled) {
        consecutiveFailures = 0;
    }
    console.log(`[PlanoraAlert Web] Silent checks ${enabled ? 'enabled' : 'disabled'}`);
};

/**
 * Check device push notification status via Planora Alert iframe
 * ⚠️ WEB ONLY - Returns error immediately if called from native
 * 
 * @param {string} userId - User ID to check
 * @param {object} options - Options: { skipIfDisabled: boolean }
 * @returns {Promise<{isSubscribed: boolean, playerId: string|null, userId: string, skipped?: boolean}>}
 */
export const checkDevicePushStatus = async (userId, options = {}) => {
    const { skipIfDisabled = true } = options;

    if (!userId) {
        throw new Error('userId is required');
    }

    // ⚠️ Guard: Prevent running in native environment
    if (!isWebOnly()) {
        console.warn('[PlanoraAlert Web] ⚠️ Called from native app - Planora Alert is WEB ONLY');
        return {
            isSubscribed: false,
            playerId: null,
            userId: userId,
            error: 'native_platform_not_supported',
            skipped: true
        };
    }

    // If silent checks are disabled and we should skip, return immediately
    if (!silentCheckEnabled && skipIfDisabled) {
        console.log('[PlanoraAlert Web] ⏭️ Silent checks disabled, skipping');
        return {
            isSubscribed: false,
            playerId: null,
            userId: userId,
            skipped: true
        };
    }

    return new Promise((resolve) => {
        if (typeof window === 'undefined') {
            resolve({
                isSubscribed: false,
                playerId: null,
                userId: userId,
                error: 'not_in_browser'
            });
            return;
        }

        const iframeUrl = `${PLANORA_ALERT_HOST}/silent-push-check?userId=${encodeURIComponent(userId)}&origin=${encodeURIComponent(window.location.origin)}`;

        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = iframeUrl;

        const timeout = setTimeout(() => {
            cleanup();
            handleFailure('timeout');
            resolve({
                isSubscribed: false,
                playerId: null,
                userId: userId,
                error: 'timeout'
            });
        }, 8000); // 8-second timeout

        const messageHandler = (event) => {
            // Verify message origin
            if (event.origin !== PLANORA_ALERT_HOST) {
                return;
            }

            if (event.data?.type === 'PLANORA_PUSH_STATUS') {
                cleanup();
                consecutiveFailures = 0; // Reset failures on success
                resolve({
                    isSubscribed: event.data.isSubscribed || false,
                    playerId: event.data.playerId || null,
                    userId: userId
                });
            }

            if (event.data?.type === 'PLANORA_PUSH_ERROR') {
                cleanup();
                handleFailure(event.data.message || 'unknown_error');
                resolve({
                    isSubscribed: false,
                    playerId: null,
                    userId: userId,
                    error: event.data.message || 'planora_error'
                });
            }
        };
        
        const cleanup = () => {
            clearTimeout(timeout);
            window.removeEventListener('message', messageHandler);
            if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
            }
        };

        // Handle iframe load errors
        iframe.onerror = () => {
            cleanup();
            handleFailure('iframe_load_failed');
            resolve({
                isSubscribed: false,
                playerId: null,
                userId: userId,
                error: 'iframe_load_failed'
            });
        };

        window.addEventListener('message', messageHandler);
        document.body.appendChild(iframe);
    });
};

/**
 * Handle consecutive failures and disable checks if needed
 */
function handleFailure(reason) {
    consecutiveFailures++;
    console.warn(`[PlanoraAlert Web] Check failed (${consecutiveFailures}/${MAX_FAILURES_BEFORE_DISABLE}):`, reason);
    
    if (consecutiveFailures >= MAX_FAILURES_BEFORE_DISABLE && silentCheckEnabled) {
        console.warn('[PlanoraAlert Web] ⚠️ Too many failures, disabling silent checks');
        silentCheckEnabled = false;
        
        // Store in localStorage to persist across page reloads
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('planora_silent_check_disabled', 'true');
            localStorage.setItem('planora_silent_check_disabled_at', Date.now().toString());
        }
    }
}

/**
 * Initialize service - check if silent checks should be disabled from localStorage
 */
if (typeof localStorage !== 'undefined' && isWebOnly()) {
    const disabled = localStorage.getItem('planora_silent_check_disabled');
    const disabledAt = localStorage.getItem('planora_silent_check_disabled_at');
    
    if (disabled === 'true' && disabledAt) {
        const hoursSinceDisabled = (Date.now() - parseInt(disabledAt)) / (1000 * 60 * 60);
        
        // Re-enable after 24 hours
        if (hoursSinceDisabled > 24) {
            console.log('[PlanoraAlert Web] Re-enabling silent checks after 24 hours');
            localStorage.removeItem('planora_silent_check_disabled');
            localStorage.removeItem('planora_silent_check_disabled_at');
        } else {
            console.log('[PlanoraAlert Web] Silent checks disabled (will retry in', Math.ceil(24 - hoursSinceDisabled), 'hours)');
            silentCheckEnabled = false;
        }
    }
}

/**
 * Redirect to Planora Alert for registration
 * ⚠️ WEB ONLY - Logs warning if called from native
 * 
 * @param {string} userId - User ID to register
 * @param {string} [returnUrl] - URL to return to after registration
 */
export const registerToPlanoraAlert = (userId, returnUrl = null) => {
    if (!userId) throw new Error('userId is required');
    
    // ⚠️ Guard: Prevent running in native environment
    if (!isWebOnly()) {
        console.warn('[PlanoraAlert Web] ⚠️ registerToPlanoraAlert called from native app - ignoring');
        console.warn('[PlanoraAlert Web] Use OneSignal for native push notifications');
        return;
    }
    
    const finalReturnUrl = returnUrl || (typeof window !== 'undefined' ? window.location.href : '');
    const registerUrl = `${PLANORA_ALERT_HOST}/register?userId=${encodeURIComponent(userId)}&returnUrl=${encodeURIComponent(finalReturnUrl)}`;
    
    console.log('[PlanoraAlert Web] 🔔 Redirecting to registration:', registerUrl);
    
    if (typeof window !== 'undefined') {
        window.location.href = registerUrl;
    }
};

/**
 * Redirect to Planora Alert for unregistration
 * ⚠️ WEB ONLY - Logs warning if called from native
 * 
 * @param {string} userId - User ID to unregister
 * @param {string} [returnUrl] - URL to return to after unregistration
 */
export const unregisterFromPlanoraAlert = (userId, returnUrl = null) => {
    if (!userId) throw new Error('userId is required');
    
    // ⚠️ Guard: Prevent running in native environment
    if (!isWebOnly()) {
        console.warn('[PlanoraAlert Web] ⚠️ unregisterFromPlanoraAlert called from native app - ignoring');
        console.warn('[PlanoraAlert Web] Use OneSignal for native push notifications');
        return;
    }
    
    const finalReturnUrl = returnUrl || (typeof window !== 'undefined' ? window.location.href : '');
    const unregisterUrl = `${PLANORA_ALERT_HOST}/unregister?userId=${encodeURIComponent(userId)}&returnUrl=${encodeURIComponent(finalReturnUrl)}`;
    
    console.log('[PlanoraAlert Web] 🔕 Redirecting to unregistration:', unregisterUrl);
    
    if (typeof window !== 'undefined') {
        window.location.href = unregisterUrl;
    }
};
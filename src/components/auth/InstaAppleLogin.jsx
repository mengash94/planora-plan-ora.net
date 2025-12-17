import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { isNativeCapacitor } from '@/components/onesignalService';
import { loginWithAppleMobile } from '@/components/instabackService';

export default function InstaAppleLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const [isAppleDevice, setIsAppleDevice] = useState(false);
  const [socialLoginReady, setSocialLoginReady] = useState(false);

  const isNative = isNativeCapacitor();

  // Check if device is Apple (iOS/macOS)
  useEffect(() => {
    const checkAppleDevice = () => {
      const ua = navigator.userAgent.toLowerCase();
      const platform = navigator.platform?.toLowerCase() || '';
      
      const isIOS = /iphone|ipad|ipod/.test(ua) || 
                    (platform === 'macintel' && navigator.maxTouchPoints > 1);
      const isMacOS = /macintosh|mac os x/.test(ua);
      const isCapacitorIOS = window.Capacitor?.getPlatform?.() === 'ios';
      
      const isApple = isIOS || isMacOS || isCapacitorIOS;
      
      console.log('[InstaAppleLogin] Device check:', { isIOS, isMacOS, isCapacitorIOS, isApple, isNative });
      setIsAppleDevice(isApple);
    };

    checkAppleDevice();
  }, [isNative]);

  // Wait for SocialLogin plugin
  const waitForSocialLogin = async () => {
    const maxAttempts = 50; // 5 seconds
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      const plugin = window.Capacitor?.Plugins?.SocialLogin;
      if (plugin) {
        console.log('[InstaAppleLogin] ✅ SocialLogin found after', attempts * 100, 'ms');
        return plugin;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    console.error('[InstaAppleLogin] ❌ SocialLogin not found after 5s');
    return null;
  };

  // Initialize native plugin
  useEffect(() => {
    if (!isNative || !isAppleDevice) {
      // For web, mark as ready immediately
      if (isAppleDevice && !isNative) {
        setSocialLoginReady(true);
      }
      return;
    }

    const initializePlugin = async () => {
      try {
        console.log('[InstaAppleLogin] 🔄 Waiting for SocialLogin plugin...');
        const plugin = await waitForSocialLogin();
        
        if (!plugin) {
          console.error('[InstaAppleLogin] ❌ Plugin not available');
          return;
        }

        console.log('[InstaAppleLogin] ✅ Plugin found, initializing Apple...');
        
        await plugin.initialize({
          apple: {
            clientId: 'net.plan-ora.planora', // Your Apple Service ID
            redirectUrl: 'https://easypalnistaback.firebaseapp.com/__/auth/handler'
          }
        });

        console.log('[InstaAppleLogin] ✅ Apple initialized successfully');
        setSocialLoginReady(true);
        
      } catch (error) {
        console.error('[InstaAppleLogin] ❌ Init failed:', error);
        // Still allow attempts - might work on click
        setSocialLoginReady(true);
      }
    };

    initializePlugin();
  }, [isNative, isAppleDevice]);

  const handleAppleLogin = async () => {
    setIsLoading(true);

    try {
      console.log('[InstaAppleLogin] 🍎 Starting Apple Sign In...');
      console.log('[InstaAppleLogin] Environment:', isNative ? 'Native' : 'Web');

      let idToken, email, fullName;

      if (isNative) {
        // Native iOS - use @capgo/capacitor-social-login
        const plugin = await waitForSocialLogin();
        
        if (!plugin) {
          throw new Error('פלאגין Apple Sign-In לא זמין');
        }

        console.log('[InstaAppleLogin] Calling SocialLogin.login for Apple...');
        
        const loginResult = await plugin.login({
          provider: 'apple',
          options: {
            scopes: ['email', 'name']
          }
        });

        console.log('[InstaAppleLogin] Login result:', loginResult);

        idToken = loginResult?.result?.idToken || loginResult?.result?.identityToken;
        email = loginResult?.result?.email;
        fullName = loginResult?.result?.givenName 
          ? `${loginResult.result.givenName} ${loginResult.result.familyName || ''}`.trim()
          : loginResult?.result?.displayName;

        if (!idToken) {
          console.error('[InstaAppleLogin] No idToken in result:', loginResult);
          throw new Error('לא התקבל אסימון מ-Apple');
        }

      } else {
        // Web - Apple Sign In is not supported without Firebase
        throw new Error('התחברות עם Apple נתמכת רק באפליקציה');
      }

      console.log('[InstaAppleLogin] Got Apple credentials:', { email, hasIdToken: !!idToken, fullName });

      // Login/Register to InstaBack with Apple token
      const user = await loginWithAppleMobile(idToken, email, fullName);

      if (!user?.id) {
        throw new Error('התחברות נכשלה - לא התקבל פרטי משתמש');
      }

      console.log('[InstaAppleLogin] ✅ Login successful, user:', user.id);

      // Register for push notifications (background)
      if (isNative) {
        try {
          const { loginOneSignalExternalId } = await import('@/components/onesignalService');
          await loginOneSignalExternalId(user.id);
        } catch (e) {
          console.warn('[InstaAppleLogin] Push registration failed:', e);
        }
      }

      toast.success('התחברת בהצלחה!');

      // Refresh page to update auth state
      setTimeout(() => {
        window.location.href = '/';
      }, 200);

    } catch (error) {
      console.error('[InstaAppleLogin] ❌ Error:', error);

      if (/(canceled|בוטלה|closed|cancelled)/i.test(error?.message || '')) {
        toast.info('ההתחברות בוטלה');
      } else {
        toast.error(error.message || 'שגיאה בהתחברות עם Apple');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render on non-Apple devices
  if (!isAppleDevice) {
    return null;
  }

  // Don't render on web (Apple Sign In requires native or Firebase)
  if (!isNative) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {isLoading ? (
        <div className="flex items-center justify-center gap-2 text-gray-600">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">מתחבר...</span>
        </div>
      ) : (
        <button
          onClick={handleAppleLogin}
          disabled={!firebaseReady}
          className="flex items-center justify-center gap-3 w-full max-w-[280px] px-6 py-3 bg-black text-white rounded-lg shadow-sm hover:bg-gray-900 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          type="button"
          style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}
        >
          <svg 
            viewBox="0 0 24 24" 
            className="w-5 h-5 fill-current"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
          </svg>
          <span className="font-medium">
            {!firebaseReady ? 'טוען...' : 'המשך עם Apple'}
          </span>
        </button>
      )}
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { isNativeCapacitor } from '@/components/onesignalService';
import { 
  instabackLogin, 
  instabackRegister, 
  findUserByEmail 
} from '@/components/instabackService';

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
            clientId: 'net.planora.app',
            redirectUrl: 'https://easypalnistaback.firebaseapp.com/__/auth/handler'
          }
        });

        console.log('[InstaAppleLogin] ✅ Apple initialized successfully');
        setSocialLoginReady(true);
        
      } catch (error) {
        console.error('[InstaAppleLogin] ❌ Init failed:', error);
        setSocialLoginReady(true);
      }
    };

    initializePlugin();
  }, [isNative, isAppleDevice]);

  // Generate a random password for Apple users
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  // Login or register user to Instaback
  const loginOrRegisterToInstaback = async (email, fullName) => {
    if (!email) {
      throw new Error('לא התקבל אימייל מ-Apple');
    }

    console.log('[InstaAppleLogin] 🔐 Checking if user exists in Instaback:', email);
    toast.info('Checking user: ' + email.substring(0, 15) + '...');

    // Check if user already exists
    let existingUser = null;
    try {
      existingUser = await findUserByEmail(email);
      console.log('[InstaAppleLogin] findUserByEmail result:', existingUser);
      toast.info('Find result: ' + (existingUser ? 'found' : 'not found'));
    } catch (findError) {
      console.log('[InstaAppleLogin] findUserByEmail error:', findError?.message);
      toast.info('Find error: ' + (findError?.message || 'unknown'));
      existingUser = null;
    }
    
    const applePassword = `Apple_${btoa(email).slice(0, 12)}!`;
    
    if (existingUser) {
      console.log('[InstaAppleLogin] ✅ User exists, logging in...');
      toast.info('User exists, logging in...');
      
      try {
        const user = await instabackLogin(email, applePassword);
        toast.info('Login OK: ' + (user?.id || 'no id'));
        return user;
      } catch (loginError) {
        console.log('[InstaAppleLogin] Login failed:', loginError?.message);
        toast.info('Login failed: ' + (loginError?.message || 'unknown'));
        return existingUser;
      }
    } else {
      console.log('[InstaAppleLogin] 📝 User not found, registering...');
      toast.info('Registering new user...');
      
      const nameParts = (fullName || '').split(' ');
      const firstName = nameParts[0] || email.split('@')[0];
      const lastName = nameParts.slice(1).join(' ') || '';

      try {
        const regResult = await instabackRegister({
          email: email,
          password: applePassword,
          firstName: firstName,
          lastName: lastName
        });
        
        console.log('[InstaAppleLogin] ✅ Registration result:', regResult);
        toast.info('Register OK, logging in...');
        
        const user = await instabackLogin(email, applePassword);
        toast.info('Login OK: ' + (user?.id || 'no id'));
        return user;
      } catch (registerError) {
        console.error('[InstaAppleLogin] Registration error:', registerError);
        toast.error('Register error: ' + (registerError?.message || 'unknown'));
        
        // Try login anyway (maybe already registered)
        try {
          toast.info('Trying login anyway...');
          const user = await instabackLogin(email, applePassword);
          toast.info('Fallback login OK');
          return user;
        } catch (e2) {
          toast.error('Fallback failed: ' + (e2?.message || 'unknown'));
          throw new Error('שגיאה ברישום המשתמש');
        }
      }
    }
  };

  const handleAppleLogin = async () => {
    console.log('[InstaAppleLogin] 🍎 Button clicked!');
    toast.info('🍎 התחלת התחברות Apple...');
    
    setIsLoading(true);

    try {
      toast.info('שלב 1: מתחיל Apple Sign In...');

      let email, fullName;

      if (isNative) {
        // Native iOS - use @capgo/capacitor-social-login
        console.log('[InstaAppleLogin] 📱 Native mode, waiting for SocialLogin plugin...');
        const plugin = await waitForSocialLogin();
        
        console.log('[InstaAppleLogin] Plugin result:', plugin ? 'Found' : 'NOT FOUND');
        
        if (!plugin) {
          throw new Error('פלאגין Apple Sign-In לא זמין');
        }

        console.log('[InstaAppleLogin] 📞 Calling SocialLogin.login for Apple...');
        
        const loginResult = await plugin.login({
          provider: 'apple',
          options: {
            scopes: ['email', 'name']
          }
        });

        console.log('[InstaAppleLogin] ✅ Login result:', JSON.stringify(loginResult, null, 2));
        toast.info('Apple result: ' + (loginResult?.result?.email || loginResult?.result?.user?.substring(0,10) || 'no data'));

        email = loginResult?.result?.email;
        fullName = loginResult?.result?.givenName 
          ? `${loginResult.result.givenName} ${loginResult.result.familyName || ''}`.trim()
          : loginResult?.result?.displayName;

        // Apple only provides email on first login, so we need to handle this
        if (!email) {
          // Try to get from user identifier
          const userIdentifier = loginResult?.result?.user || loginResult?.result?.userIdentifier;
          if (userIdentifier) {
            // Use a placeholder email based on Apple user ID
            email = `apple_${userIdentifier.substring(0, 20)}@privaterelay.appleid.com`;
            console.log('[InstaAppleLogin] Using generated email for Apple user');
          } else {
            throw new Error('לא התקבל אימייל מ-Apple. נסה שוב או השתמש בשיטת התחברות אחרת.');
          }
        }

      } else {
        throw new Error('התחברות עם Apple נתמכת רק באפליקציה');
      }

      console.log('[InstaAppleLogin] Got Apple credentials:', { email, fullName });
      toast.info('Got email: ' + (email || 'no email'));

      // Login/Register to InstaBack
      toast.info('Calling Instaback...');
      const user = await loginOrRegisterToInstaback(email, fullName);

      if (!user?.id) {
        throw new Error('התחברות נכשלה - לא התקבל פרטי משתמש');
      }

      console.log('[InstaAppleLogin] ✅ Login successful, user:', user.id);

      // Save user to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('instaback_user', JSON.stringify(user));
      }

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
      console.error('[InstaAppleLogin] ❌ Error message:', error?.message);
      console.error('[InstaAppleLogin] ❌ Error stack:', error?.stack);

      if (/(canceled|בוטלה|closed|cancelled)/i.test(error?.message || '')) {
        toast.info('ההתחברות בוטלה');
      } else {
        toast.error(error.message || 'שגיאה בהתחברות עם Apple');
      }
    } finally {
      console.log('[InstaAppleLogin] 🏁 Finally block - setting isLoading to false');
      setIsLoading(false);
    }
  };

  // Don't render on non-Apple devices
  if (!isAppleDevice) {
    return null;
  }

  // Don't render on web (Apple Sign In requires native)
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
          disabled={!socialLoginReady}
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
            {!socialLoginReady ? 'טוען...' : 'המשך עם Apple'}
          </span>
        </button>
      )}
    </div>
  );
}
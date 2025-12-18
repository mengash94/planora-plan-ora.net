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

  // --- פונקציית עזר לדיבאג (מציגה שגיאות על המסך) ---
  const showDebugAlert = (title, err) => {
    try {
      let message = '';
      if (typeof err === 'object' && err !== null) {
        // טריק להציג את כל השדות של השגיאה (כולל message ו-stack)
        const errorObj = {};
        Object.getOwnPropertyNames(err).forEach(key => {
          errorObj[key] = err[key];
        });
        message = JSON.stringify(errorObj, null, 2);
      } else {
        message = String(err);
      }
      // הקפצת חלון באייפון
      alert(`🐞 DEBUG: ${title}\n\n${message}`);
    } catch (e) {
      alert(`DEBUG ERROR: Could not stringify error for ${title}`);
    }
  };
  // ---------------------------------------------------

  useEffect(() => {
    const checkAppleDevice = () => {
      const ua = navigator.userAgent.toLowerCase();
      const platform = navigator.platform?.toLowerCase() || '';
      const isIOS = /iphone|ipad|ipod/.test(ua) || 
                    (platform === 'macintel' && navigator.maxTouchPoints > 1);
      const isMacOS = /macintosh|mac os x/.test(ua);
      const isCapacitorIOS = window.Capacitor?.getPlatform?.() === 'ios';
      
      const isApple = isIOS || isMacOS || isCapacitorIOS;
      setIsAppleDevice(isApple);
    };
    checkAppleDevice();
  }, [isNative]);

  const waitForSocialLogin = async () => {
    let attempts = 0;
    while (attempts < 50) {
      const plugin = window.Capacitor?.Plugins?.SocialLogin;
      if (plugin) return plugin;
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    return null;
  };

  useEffect(() => {
    if (!isNative || !isAppleDevice) {
      if (isAppleDevice && !isNative) setSocialLoginReady(true);
      return;
    }

    const initializePlugin = async () => {
      try {
        const plugin = await waitForSocialLogin();
        if (!plugin) {
          showDebugAlert('Plugin Init', 'SocialLogin plugin not found!');
          return;
        }

        await plugin.initialize({
          apple: {
            clientId: 'net.planora.app', // ה-Bundle ID שלך
            redirectUrl: 'https://easypalnistaback.firebaseapp.com/__/auth/handler'
          }
        });

        console.log('Apple Initialized');
        setSocialLoginReady(true);
        
      } catch (error) {
        showDebugAlert('Init Failed', error);
        setSocialLoginReady(true);
      }
    };

    initializePlugin();
  }, [isNative, isAppleDevice]);


  const loginOrRegisterToInstaback = async (email, fullName, password) => {
    // שלב 1: חיפוש משתמש
    let existingUser = null;
    try {
      existingUser = await findUserByEmail(email);
    } catch (err) {
      console.log('User check error (likely new user)');
    }
    
    // שלב 2: לוגין או רישום
    if (existingUser) {
      return await instabackLogin(email, password);
    } else {
      const nameParts = (fullName || 'Apple User').split(' ');
      await instabackRegister({
        email: email,
        password: password,
        firstName: nameParts[0],
        lastName: nameParts.slice(1).join(' ') || ''
      });
      return await instabackLogin(email, password);
    }
  };

  const handleAppleLogin = async () => {
    toast.info('מתחיל תהליך התחברות...');
    setIsLoading(true);

    try {
      if (!isNative) throw new Error('Not native device');

      const plugin = await waitForSocialLogin();
      
      // --- קריאה לאפל ---
      // alert('Calling Apple Login...'); // ניתן להוריד הערה אם נתקע לפני
      
      const loginResult = await plugin.login({
        provider: 'apple',
        options: { scopes: ['email', 'name'] }
      });

      // --- הצגת התוצאה הגולמית מאפל ---
      // alert('Raw Apple Result:\n' + JSON.stringify(loginResult)); 

      const appleUserId = loginResult.result.user || loginResult.result.userIdentifier;
      
      if (!appleUserId) {
        throw new Error('No User ID received from Apple');
      }

      let email = loginResult.result.email;
      let fullName = null;
      
      if (loginResult.result.givenName) {
        fullName = `${loginResult.result.givenName} ${loginResult.result.familyName || ''}`;
      }

      // טיפול באימייל חסר (התחברות חוזרת)
      if (!email) {
        email = `apple_${appleUserId}@planora.placeholder.com`;
      }

      // סיסמה קבועה מבוססת ID
      const staticSecurePassword = `Apple_${appleUserId}_SecureLogin!`;

      // --- קריאה לשרת שלך ---
      // alert(`Sending to server:\nEmail: ${email}\nPass: ${staticSecurePassword}`);

      const user = await loginOrRegisterToInstaback(email, fullName, staticSecurePassword);

      if (!user?.id) throw new Error('Backend login returned no ID');

      // שמירה וסיום
      if (typeof window !== 'undefined') {
        localStorage.setItem('instaback_user', JSON.stringify(user));
      }

      try {
        const { loginOneSignalExternalId } = await import('@/components/onesignalService');
        await loginOneSignalExternalId(user.id);
      } catch (e) {
        console.warn('Push failed', e);
      }

      toast.success('התחברת בהצלחה!');
      setTimeout(() => { window.location.href = '/'; }, 500);

    } catch (error) {
      // *** כאן הקסם קורה: הצגת השגיאה למסך ***
      showDebugAlert('CRITICAL ERROR', error);
      
      const errMsg = error?.message || 'Unknown error';
      if (!errMsg.includes('cancel')) {
        toast.error('שגיאה: ' + errMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAppleDevice || !isNative) return null;

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
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg">
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
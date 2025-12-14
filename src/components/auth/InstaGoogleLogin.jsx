import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { loginWithGoogleMobile } from '@/components/instabackService';
import { isNativeCapacitor } from '@/components/onesignalService';

const WEB_CLIENT_ID = '741921128539-rmvupu979hlop84t4iucbbauhbcvqunl.apps.googleusercontent.com';
const IOS_CLIENT_ID = '741921128539-vs2vnn0o29hjhietd777ocrnebe7759u.apps.googleusercontent.com';

export default function InstaGoogleLogin() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isGsiLoaded, setIsGsiLoaded] = useState(false);
  const [socialLoginReady, setSocialLoginReady] = useState(false);

  const isNative = isNativeCapacitor();
  
  // 🔍 Debug - הצג את הסביבה בכל רינדר
  console.log('[InstaGoogleLogin] 🔍 Component mounted/rendered');
  console.log('[InstaGoogleLogin] Environment check:', {
    isNative,
    hasCapacitor: !!window.Capacitor,
    platform: window.Capacitor?.getPlatform?.(),
    hasSocialLogin: !!window.Capacitor?.Plugins?.SocialLogin,
    userAgent: navigator.userAgent
  });

  // ✅ פונקציה להמתנה לזמינות SocialLogin (עד 5 שניות)
  const waitForSocialLogin = async () => {
    const maxAttempts = 50; // 5 שניות (50 x 100ms)
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      const plugin = window.Capacitor?.Plugins?.SocialLogin;
      
      if (plugin) {
        console.log('[InstaGoogleLogin] ✅ SocialLogin found after', attempts * 100, 'ms');
        return plugin;
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    console.error('[InstaGoogleLogin] ❌ SocialLogin not found after 5s');
    return null;
  };

  // ✅ אתחול Native (עם המתנה לזמינות)
  useEffect(() => {
    if (!isNative) {
      console.log('[InstaGoogleLogin] Not native, skipping native plugin init');
      return;
    }
    
    // ✅ ב-Native, הכפתור תמיד זמין - נבדוק את הפלאגין בלחיצה
    setIsGsiLoaded(true);
    
    const initializePlugin = async () => {
      try {
        console.log('[InstaGoogleLogin] 🔄 Waiting for SocialLogin plugin...');
        
        const plugin = await waitForSocialLogin();
        
        if (!plugin) {
          console.error('[InstaGoogleLogin] ❌ Plugin not available - will retry on click');
          return;
        }
        
        console.log('[InstaGoogleLogin] ✅ Plugin found, initializing...');
        
        await plugin.initialize({
          google: { 
            webClientId: WEB_CLIENT_ID,
            iOSClientId: IOS_CLIENT_ID,
            iOSServerClientId: WEB_CLIENT_ID
          }
        });
        
        console.log('[InstaGoogleLogin] ✅ Initialized successfully');
        setSocialLoginReady(true);
        
      } catch (error) {
        console.error('[InstaGoogleLogin] ❌ Init failed:', error);
        // לא מציגים toast כאן - ננסה שוב בלחיצה
      }
    };
    
    initializePlugin();
  }, [isNative]);

  // ✅ טען GSI רק בווב (לא ב-Native!)
  useEffect(() => {
    // ⚠️ CRITICAL: אל תטען Web GSI ב-Native
    if (isNative) {
      console.log('[InstaGoogleLogin] ⏭️ Skipping Web GSI load - Native app');
      return;
    }
    
    if (window.google?.accounts?.id) { 
      console.log('[InstaGoogleLogin] Web GSI already loaded');
      setIsGsiLoaded(true); 
      return; 
    }
    
    console.log('[InstaGoogleLogin] Loading web GSI script...');
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => { 
      console.log('[InstaGoogleLogin] ✅ Web GSI loaded');
      setIsGsiLoaded(true); 
    };
    script.onerror = () => { 
      console.error('[InstaGoogleLogin] ❌ Failed to load web GSI');
      toast.error('שגיאה בטעינת Google Sign-In'); 
    };
    document.head.appendChild(script);
    
    return () => { 
      if (document.head.contains(script)) {
        document.head.removeChild(script); 
      }
    };
  }, [isNative]);

  async function getGoogleIdToken() {
    // ✅ Native Login
    if (isNative) {
      console.log('[InstaGoogleLogin] 📱 Starting native Google login...');
      console.log('[InstaGoogleLogin] socialLoginReady:', socialLoginReady);
      
      try {
        // המתנה לפלאגין (אם עוד לא מוכן)
        const plugin = await waitForSocialLogin();
        
        if (!plugin) {
          throw new Error('פלאגין Google Sign-In לא זמין. נסה להפעיל מחדש את האפליקציה.');
        }
        
        // אתחול אם עוד לא בוצע
        if (!socialLoginReady) {
          console.log('[InstaGoogleLogin] 🔄 Late initialization...');
          try {
            await plugin.initialize({
              google: { 
                webClientId: WEB_CLIENT_ID,
                iOSClientId: IOS_CLIENT_ID,
                iOSServerClientId: WEB_CLIENT_ID
              }
            });
            setSocialLoginReady(true);
            console.log('[InstaGoogleLogin] ✅ Late init successful');
          } catch (initErr) {
            console.warn('[InstaGoogleLogin] Late init error (might be already initialized):', initErr);
          }
        }
        
        console.log('[InstaGoogleLogin] Calling SocialLogin.login...');
        
        // ✅ בדיקת פלטפורמה - iOS צריך options, Android לא
        const platform = window.Capacitor?.getPlatform?.() || 'web';
        console.log('[InstaGoogleLogin] Platform:', platform);
        
        let loginResult;
        
        if (platform === 'ios') {
          // iOS - צריך לשלוח options עם scopes
          loginResult = await plugin.login({
            provider: 'google',
            options: {
              scopes: ['profile', 'email']
            }
          });
        } else {
          // Android - קריאה פשוטה ללא options
          loginResult = await plugin.login({
            provider: 'google'
          });
        }
        
        console.log('[InstaGoogleLogin] Login result:', loginResult);
        
        const idToken = loginResult?.result?.idToken || loginResult?.result?.token;
        if (!idToken) {
          console.error('[InstaGoogleLogin] No idToken in result:', loginResult);
          throw new Error('לא התקבל אסימון מ-Google (native)');
        }
        
        console.log('[InstaGoogleLogin] ✅ Got idToken from native');
        return idToken;
        
      } catch (loginError) {
        console.error('[InstaGoogleLogin] ❌ Native login error:', loginError);
        
        // ⚠️ ב-Native, אין fallback ל-Web - רק הצג שגיאה
        throw new Error(`התחברות נכשלה: ${loginError.message || 'שגיאה לא ידועה'}`);
      }
    }

    // ✅ Web Login (GSI) - רק אם לא Native
    if (!isNative) {
      console.log('[InstaGoogleLogin] 🌐 Starting web Google login...');
      
      if (!window.google?.accounts?.id) {
        throw new Error('Google Sign-In לא נטען');
      }
      
      return new Promise((resolve, reject) => {
        const tempDiv = document.createElement('div');
        tempDiv.style.position = 'fixed';
        tempDiv.style.top = '-1000px';
        document.body.appendChild(tempDiv);
        
        try {
          window.google.accounts.id.initialize({
            client_id: WEB_CLIENT_ID,
            callback: (response) => {
              if (document.body.contains(tempDiv)) {
                document.body.removeChild(tempDiv);
              }
              
              if (response.credential) {
                console.log('[InstaGoogleLogin] ✅ Got idToken from web popup');
                resolve(response.credential);
              } else {
                reject(new Error('לא התקבל אסימון מ-Google'));
              }
            },
            cancel_on_tap_outside: true
          });
          
          window.google.accounts.id.renderButton(tempDiv, {
            type: 'standard',
            size: 'large',
            text: 'continue_with',
            shape: 'rectangular',
            theme: 'outline'
          });
          
          setTimeout(() => {
            const btn = tempDiv.querySelector('div[role="button"]');
            if (btn) {
              console.log('[InstaGoogleLogin] Triggering Google popup...');
              btn.click();
            } else {
              reject(new Error('לא נמצא כפתור Google'));
            }
          }, 100);
          
        } catch (error) {
          if (document.body.contains(tempDiv)) {
            document.body.removeChild(tempDiv);
          }
          reject(error);
        }
      });
    }
    
    // אם הגענו לכאן, משהו לא תקין
    throw new Error('סביבה לא נתמכת להתחברות Google');
  }

  async function registerForPushNotifications(userId) {
    if (!isNative) {
      console.log('[InstaGoogleLogin] [Push] Skipping - not native');
      return;
    }
    
    try {
      console.log('[InstaGoogleLogin] [Push] 🔔 Registering user to OneSignal:', userId);
      
      // קריאה ל-OneSignal login (הפלאגין מטפל בכל השאר)
      const { loginOneSignalExternalId } = await import('@/components/onesignalService');
      
      const subscriptionId = await loginOneSignalExternalId(userId);
      
      if (subscriptionId) {
        console.log('[InstaGoogleLogin] [Push] ✅ OneSignal registered with ID:', subscriptionId);
        toast.success('התראות הופעלו! 🔔');
      } else {
        console.warn('[InstaGoogleLogin] [Push] ⚠️ No subscription ID returned');
      }
      
    } catch (error) {
      console.warn('[InstaGoogleLogin] [Push] ⚠️ Failed:', error);
      // לא זורקים שגיאה - זה לא קריטי להצלחת הלוגין
    }
  }

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      console.log('[InstaGoogleLogin] 🚀 Starting Google login flow...');
      console.log('[InstaGoogleLogin] Environment:', isNative ? 'Native' : 'Web');
      console.log('[InstaGoogleLogin] Native plugin ready:', socialLoginReady);
      
      const idToken = await getGoogleIdToken();
      
      console.log('[InstaGoogleLogin] Got idToken, logging in to InstaBack...');
      const user = await loginWithGoogleMobile(idToken);
      
      if (!user?.id) {
        throw new Error('התחברות נכשלה - לא התקבל פרטי משתמש');
      }
      
      console.log('[InstaGoogleLogin] ✅ Login successful, user:', user.id);
      
      // רישום להתראות ברקע (לא חוסם)
      registerForPushNotifications(user.id).catch((err) => {
        console.warn('[InstaGoogleLogin] Background push registration failed:', err);
      });
      
      toast.success('התחברת בהצלחה!');
      
      // ⏱️ רענון מלא בכל הסביבות כדי שה-AuthProvider יזהה את המשתמש
      setTimeout(() => {
        window.location.href = '/';
      }, 200);
      
    } catch (err) {
      console.error('[InstaGoogleLogin] ❌ Login error:', err);
      const errorMsg = err?.message || 'שגיאה בהתחברות';
      
      if (/(canceled|בוטלה|closed|User cancelled)/i.test(errorMsg)) {
        toast.info('ההתחברות בוטלה');
      } else {
        toast.error(errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isButtonReady = isGsiLoaded;

  return (
    <div className="flex flex-col items-center gap-3">
      {isLoading ? (
        <div className="flex items-center justify-center gap-2 text-gray-600">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">מתחבר...</span>
        </div>
      ) : (
        <button
          onClick={handleLogin}
          disabled={!isButtonReady}
          className="flex items-center justify-center gap-3 w-full max-w-[280px] px-6 py-3 bg-white border border-gray-300 rounded-lg shadow-sm hover:shadow-md hover:border-gray-400 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          type="button"
        >
          <img 
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
            alt="Google" 
            className="w-5 h-5" 
          />
          <span className="text-gray-700 font-medium">
            {!isButtonReady ? 'טוען...' : 'המשך עם Google'}
          </span>
        </button>
      )}
    </div>
  );
}
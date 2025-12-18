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

  // 1. בדיקת מכשיר (iOS/Mac)
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

  // 2. המתנה לפלאגין
  const waitForSocialLogin = async () => {
    const maxAttempts = 50; // 5 seconds
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      const plugin = window.Capacitor?.Plugins?.SocialLogin;
      if (plugin) {
        console.log('[InstaAppleLogin] ✅ SocialLogin found');
        return plugin;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    return null;
  };

  // 3. אתחול הפלאגין עם ה-ID הנכון
  useEffect(() => {
    if (!isNative || !isAppleDevice) {
      if (isAppleDevice && !isNative) setSocialLoginReady(true);
      return;
    }

    const initializePlugin = async () => {
      try {
        const plugin = await waitForSocialLogin();
        
        if (!plugin) {
          console.error('[InstaAppleLogin] ❌ Plugin not available');
          return;
        }

        await plugin.initialize({
          apple: {
            // שים לב: ב-iOS Native משתמשים ב-Bundle ID
            clientId: 'net.planora.app', 
            redirectUrl: 'https://easypalnistaback.firebaseapp.com/__/auth/handler'
          }
        });

        console.log('[InstaAppleLogin] ✅ Apple initialized successfully');
        setSocialLoginReady(true);
        
      } catch (error) {
        console.error('[InstaAppleLogin] ❌ Init failed:', error);
        setSocialLoginReady(true); // נאפשר לחיצה כדי לראות שגיאה בלייב
      }
    };

    initializePlugin();
  }, [isNative, isAppleDevice]);

  // 4. פונקציית הלוגין/רישום מול השרת
  // שים לב: הוספתי פרמטר password כדי שנוכל לשלוט עליו מבחוץ
  const loginOrRegisterToInstaback = async (email, fullName, password) => {
    if (!email || !password) {
      throw new Error('חסר אימייל או סיסמה לביצוע הרישום');
    }

    console.log('[InstaAppleLogin] 🔐 Processing user:', email);
    toast.info('בודק משתמש במערכת...');

    // בדיקה אם המשתמש קיים
    let existingUser = null;
    try {
      existingUser = await findUserByEmail(email);
      console.log('[InstaAppleLogin] Find result:', existingUser ? 'Found' : 'Not found');
    } catch (findError) {
      console.log('[InstaAppleLogin] Find error (might be new user):', findError?.message);
    }
    
    if (existingUser) {
      // --- משתמש קיים: התחברות ---
      console.log('[InstaAppleLogin] ✅ User exists, logging in...');
      try {
        const user = await instabackLogin(email, password);
        return user;
      } catch (loginError) {
        console.log('[InstaAppleLogin] Login failed:', loginError?.message);
        
        // במקרה נדיר שהמשתמש קיים אבל הסיסמה לא תואמת (אולי נרשם ידנית בעבר)
        // אפשר לנסות להחזיר את המשתמש שנמצא, אבל עדיף להיכשל כדי לא לפרוץ
        throw new Error('התחברות נכשלה. ייתכן שנרשמת בעבר עם סיסמה אחרת למייל זה.');
      }
    } else {
      // --- משתמש חדש: הרשמה ---
      console.log('[InstaAppleLogin] 📝 User not found, registering...');
      
      const nameParts = (fullName || '').split(' ');
      const firstName = nameParts[0] || 'Apple';
      const lastName = nameParts.slice(1).join(' ') || 'User';

      try {
        await instabackRegister({
          email: email,
          password: password, // שימוש בסיסמה הקבועה שקיבלנו
          firstName: firstName,
          lastName: lastName
        });
        
        console.log('[InstaAppleLogin] ✅ Registration success, now logging in...');
        
        // מיד אחרי רישום - מתחברים
        const user = await instabackLogin(email, password);
        return user;

      } catch (registerError) {
        console.error('[InstaAppleLogin] Registration error:', registerError);
        // ניסיון אחרון - אולי נוצר במקביל
        try {
            return await instabackLogin(email, password);
        } catch {
            throw new Error('שגיאה ביצירת המשתמש');
        }
      }
    }
  };

  // 5. הלוגיקה הראשית של הכפתור
  const handleAppleLogin = async () => {
    console.log('[InstaAppleLogin] 🍎 Button clicked!');
    toast.info('מתחיל הזדהות מול Apple...');
    
    setIsLoading(true);

    try {
      if (!isNative) {
        throw new Error('התחברות עם Apple נתמכת רק באפליקציה');
      }

      const plugin = await waitForSocialLogin();
      if (!plugin) throw new Error('רכיב Apple Sign-In לא זמין');

      // --- שלב א: קריאה לאפל ---
      const loginResult = await plugin.login({
        provider: 'apple',
        options: {
          scopes: ['email', 'name']
        }
      });

      console.log('[InstaAppleLogin] Raw Apple Result:', JSON.stringify(loginResult));

      // --- שלב ב: חילוץ נתונים ---
      // ה-User ID הוא הדבר הכי חשוב ויציב כאן
      const appleUserId = loginResult.result.user || loginResult.result.userIdentifier;
      
      if (!appleUserId) {
          throw new Error('לא התקבל מזהה משתמש (User ID) מאפל');
      }

      let email = loginResult.result.email;
      
      // בניית השם
      let fullName = null;
      if (loginResult.result.givenName) {
        fullName = `${loginResult.result.givenName} ${loginResult.result.familyName || ''}`.trim();
      } else if (loginResult.result.displayName) {
        fullName = loginResult.result.displayName;
      }

      // --- שלב ג: טיפול במקרה של אימייל חסר (התחברות חוזרת) ---
      if (!email) {
        console.log('[InstaAppleLogin] Email is null (returning user), generating from ID...');
        // שים לב: אנחנו מייצרים אימייל פיקטיבי אבל קבוע לאותו משתמש
        // הפורמט חייב להיות זהה למה שיצרנו ברישום!
        email = `apple_${appleUserId}@planora.placeholder.com`;
      }

      // --- שלב ד: יצירת סיסמה "קבועה" ובטוחה ---
      // שימוש ב-User ID כחלק מהסיסמה מבטיח שהיא תהיה זהה בכל התחברות
      const staticSecurePassword = `Apple_${appleUserId}_SecureLogin!`;

      console.log('[InstaAppleLogin] Proceeding with:', { email, hasName: !!fullName });

      // --- שלב ה: שליחה לשרת ---
      const user = await loginOrRegisterToInstaback(email, fullName, staticSecurePassword);

      if (!user?.id) {
        throw new Error('התחברות נכשלה - לא התקבל מזהה משתמש מהשרת');
      }

      // --- שלב ו: הצלחה ושמירה ---
      if (typeof window !== 'undefined') {
        localStorage.setItem('instaback_user', JSON.stringify(user));
      }

      // רישום ל-Push Notifications
      try {
        const { loginOneSignalExternalId } = await import('@/components/onesignalService');
        await loginOneSignalExternalId(user.id);
      } catch (e) {
        console.warn('Push registration skipped:', e);
      }

      toast.success('התחברת בהצלחה!');

      setTimeout(() => {
        window.location.href = '/';
      }, 500);

    } catch (error) {
      console.error('[InstaAppleLogin] Error:', error);
      
      const errMsg = error?.message || '';
      if (/(canceled|בוטלה|closed|cancelled)/i.test(errMsg)) {
        toast.info('ההתחברות בוטלה');
      } else {
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
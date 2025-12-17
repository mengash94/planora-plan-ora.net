import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { isNativeCapacitor } from '@/components/onesignalService';

// Firebase Config for easypalnistaback project
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", // TODO: Add your Firebase API key
  authDomain: "easypalnistaback.firebaseapp.com",
  projectId: "easypalnistaback",
};

// InstaBack API
const API_BASE_URL = 'https://instaback.ai/project/f78de3ce-0cab-4ccb-8442-0c5749792fe8/api';

const getToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('instaback_token');
  }
  return null;
};

// Login/Register with Apple credentials to InstaBack
const loginWithApple = async (email, firebaseUid, fullName) => {
  console.log('[InstaAppleLogin] Sending to InstaBack:', { email, firebaseUid, fullName });
  
  const response = await fetch(`${API_BASE_URL}/auth/apple`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'accept': 'application/json'
    },
    body: JSON.stringify({
      email,
      firebaseUid,
      fullName: fullName || email.split('@')[0]
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Apple login failed');
  }

  const data = await response.json();
  
  // Save token and user
  if (data.token) {
    localStorage.setItem('instaback_token', data.token);
  }
  if (data.user) {
    localStorage.setItem('instaback_user', JSON.stringify(data.user));
  }
  
  return data.user || data;
};

export default function InstaAppleLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const [isAppleDevice, setIsAppleDevice] = useState(false);
  const [firebaseReady, setFirebaseReady] = useState(false);

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
      
      console.log('[InstaAppleLogin] Device check:', { isIOS, isMacOS, isCapacitorIOS, isApple });
      setIsAppleDevice(isApple);
    };

    checkAppleDevice();
  }, []);

  // Load Firebase SDK
  useEffect(() => {
    if (!isAppleDevice) return;

    // Check if Firebase is already loaded
    if (window.firebase?.auth) {
      setFirebaseReady(true);
      return;
    }

    console.log('[InstaAppleLogin] Loading Firebase SDK...');

    // Load Firebase App
    const loadFirebase = async () => {
      try {
        // Firebase App
        const appScript = document.createElement('script');
        appScript.src = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js';
        appScript.async = true;
        document.head.appendChild(appScript);

        await new Promise((resolve, reject) => {
          appScript.onload = resolve;
          appScript.onerror = reject;
        });

        // Firebase Auth
        const authScript = document.createElement('script');
        authScript.src = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js';
        authScript.async = true;
        document.head.appendChild(authScript);

        await new Promise((resolve, reject) => {
          authScript.onload = resolve;
          authScript.onerror = reject;
        });

        // Initialize Firebase
        if (!window.firebase.apps?.length) {
          window.firebase.initializeApp(FIREBASE_CONFIG);
        }

        console.log('[InstaAppleLogin] ✅ Firebase ready');
        setFirebaseReady(true);

      } catch (error) {
        console.error('[InstaAppleLogin] ❌ Firebase load failed:', error);
      }
    };

    loadFirebase();
  }, [isAppleDevice]);

  const handleAppleLogin = async () => {
    if (!firebaseReady) {
      toast.error('Firebase עדיין נטען, נסה שוב');
      return;
    }

    setIsLoading(true);

    try {
      console.log('[InstaAppleLogin] 🍎 Starting Apple Sign In...');

      const provider = new window.firebase.auth.OAuthProvider('apple.com');
      provider.addScope('email');
      provider.addScope('name');

      // Use redirect for native, popup for web
      let result;
      
      if (isNative) {
        // For native iOS, use signInWithRedirect
        await window.firebase.auth().signInWithRedirect(provider);
        // Result will be handled by getRedirectResult on page load
        return;
      } else {
        // For web (macOS Safari), use popup
        result = await window.firebase.auth().signInWithPopup(provider);
      }

      console.log('[InstaAppleLogin] Firebase result:', result);

      const user = result.user;
      const email = user.email;
      const firebaseUid = user.uid;
      const fullName = user.displayName || 
                       (result.additionalUserInfo?.profile?.name?.firstName 
                        ? `${result.additionalUserInfo.profile.name.firstName} ${result.additionalUserInfo.profile.name.lastName || ''}`.trim()
                        : null);

      if (!email) {
        throw new Error('לא התקבל אימייל מ-Apple');
      }

      console.log('[InstaAppleLogin] Got Apple credentials:', { email, firebaseUid, fullName });

      // Login/Register to InstaBack
      const instaUser = await loginWithApple(email, firebaseUid, fullName);

      if (!instaUser?.id) {
        throw new Error('התחברות נכשלה - לא התקבל פרטי משתמש');
      }

      console.log('[InstaAppleLogin] ✅ Login successful:', instaUser.id);

      // Register for push notifications (background)
      if (isNative) {
        try {
          const { loginOneSignalExternalId } = await import('@/components/onesignalService');
          await loginOneSignalExternalId(instaUser.id);
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

      if (error.code === 'auth/popup-closed-by-user' || 
          error.code === 'auth/cancelled-popup-request' ||
          error.message?.includes('cancelled')) {
        toast.info('ההתחברות בוטלה');
      } else {
        toast.error(error.message || 'שגיאה בהתחברות עם Apple');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle redirect result (for native iOS)
  useEffect(() => {
    if (!firebaseReady || !isNative) return;

    const handleRedirectResult = async () => {
      try {
        const result = await window.firebase.auth().getRedirectResult();
        
        if (result?.user) {
          console.log('[InstaAppleLogin] Got redirect result:', result);
          
          const email = result.user.email;
          const firebaseUid = result.user.uid;
          const fullName = result.user.displayName;

          if (email) {
            setIsLoading(true);
            const instaUser = await loginWithApple(email, firebaseUid, fullName);
            
            if (instaUser?.id) {
              toast.success('התחברת בהצלחה!');
              window.location.href = '/';
            }
          }
        }
      } catch (error) {
        console.error('[InstaAppleLogin] Redirect result error:', error);
      }
    };

    handleRedirectResult();
  }, [firebaseReady, isNative]);

  // Don't render on non-Apple devices
  if (!isAppleDevice) {
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
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Sparkles, CheckSquare, BarChart2, MessageSquare, Camera, Bot,
  Users, PartyPopper, Heart, Calendar, MapPin, Smile, Lightbulb, RefreshCw
} from 'lucide-react';

export default function WelcomePage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [showInAppBrowserMessage, setShowInAppBrowserMessage] = useState(false);
  const [storeUrl, setStoreUrl] = useState(null);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [newVersion, setNewVersion] = useState(null);

  // Strict native detection: only treat as native if Capacitor object is present (prevents mis-detection in in-app browsers)
  const isNativeStrict = () => {
    try {
      const cap = window?.Capacitor;
      return !!(cap && (cap.getPlatform || cap.Plugins || cap.isNativePlatform));
    } catch (e) {
      return false;
    }
  };

  // Detect in-app browser (Instagram, Facebook, etc.)
  const isInAppBrowser = () => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera || '';
    // Common in-app browser identifiers - expanded list
    const inAppPatterns = [
      'FBAN',           // Facebook App
      'FBAV',           // Facebook App Version
      'FB_IAB',         // Facebook In-App Browser
      'Instagram',      // Instagram
      'Line',           // Line App
      'Twitter',        // Twitter App
      'Snapchat',       // Snapchat
      'Pinterest',      // Pinterest
      'LinkedIn',       // LinkedIn
      'TikTok',         // TikTok
      'Telegram',       // Telegram
      'WhatsApp',       // WhatsApp (rare but possible)
      'Messenger',      // Facebook Messenger
      'WebView',        // Generic WebView
      'wv',             // Android WebView indicator
    ];
    
    const isInApp = inAppPatterns.some(pattern => 
      userAgent.toLowerCase().includes(pattern.toLowerCase())
    );
    
    console.log('[WelcomePage] User-Agent check:', { userAgent, isInApp });
    return isInApp;
  };

  // Redirect to app stores based on device
  // ALWAYS redirect if NOT in our native Capacitor app (except dev/preview)
  useEffect(() => {
    // ✅ אם אנחנו באפליקציה שלנו (Capacitor Native) - לא מפנים לחנות
    if (isNativeStrict()) {
      console.log('[WelcomePage] ✅ Running in native Capacitor app - no redirect');
      return;
    }

    // Skip redirect in development/preview environments
    const hostname = window.location.hostname || '';
    const isDevOrPreview = hostname.includes('localhost') || 
                           hostname.includes('base44.com') || 
                           hostname.includes('base44.app') ||
                           window.location.search.includes('preview');
    
    if (isDevOrPreview) {
      console.log('[WelcomePage] Skipping store redirect in dev/preview environment');
      return;
    }

    // ✅ לא באפליקציה שלנו - מפנים לחנות לפי סוג המכשיר
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    let targetStoreUrl = null;

    if (/android/i.test(userAgent)) {
      targetStoreUrl = "https://play.google.com/store/apps/details?id=net.planora.app";
    } else if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
      targetStoreUrl = "https://apps.apple.com/il/app/planora-%D7%90%D7%99%D7%A8%D7%95%D7%A2%D7%99%D7%9D/id6755497184";
    }

    if (targetStoreUrl) {
      console.log('[WelcomePage] 📱 Not in native app - redirecting to store:', targetStoreUrl);
      
      // In-app browser: force auto-redirect to store (no button)
      if (isInAppBrowser()) {
        console.log('[WelcomePage] 🔒 In-app browser detected - auto-redirecting to store');
        try {
          if (/android/i.test(userAgent)) {
            // Try to open Play Store app first
            window.location.href = 'market://details?id=net.planora.app';
            // Fallback to web Play Store if blocked
            setTimeout(() => {
              window.location.href = 'https://play.google.com/store/apps/details?id=net.planora.app';
            }, 400);
          } else if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
            // Try to open App Store app first
            window.location.href = 'itms-apps://apps.apple.com/il/app/id6755497184';
            // Fallback to web App Store if blocked
            setTimeout(() => {
              window.location.href = 'https://apps.apple.com/il/app/planora-%D7%90%D7%99%D7%A8%D7%95%D7%A2%D7%99%D7%9D/id6755497184';
            }, 400);
          } else {
            window.location.href = targetStoreUrl;
          }
        } catch (e) {
          window.location.href = targetStoreUrl;
        }
      } else {
        // Regular browser - auto redirect works
        console.log('[WelcomePage] 🌐 Regular browser - auto redirecting');
        window.location.replace(targetStoreUrl);
      }
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      navigate(createPageUrl('Home'));
    }
  }, [isAuthenticated, navigate]);

  // Check for available update
  useEffect(() => {
    const updateAvailable = localStorage.getItem('planora_update_available');
    if (updateAvailable) {
      setNewVersion(updateAvailable);
      setShowUpdateDialog(true);
    }
  }, []);

  const handleUpdateNow = () => {
    const newVer = localStorage.getItem('planora_update_available');
    if (newVer) {
      localStorage.setItem('planora_app_version', newVer);
      localStorage.removeItem('planora_update_available');
    }
    window.location.reload();
  };

  const handleLogin = () => {
    navigate(createPageUrl('Auth'));
  };

  // If in-app browser detected, show message to open in external browser
  if (showInAppBrowserMessage && storeUrl) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-pink-50 flex items-center justify-center p-6" style={{ direction: 'rtl' }}>
        <Card className="max-w-md w-full p-8 text-center shadow-2xl">
          <div className="w-20 h-20 mx-auto bg-orange-100 rounded-full flex items-center justify-center mb-6">
            <Calendar className="w-10 h-10 text-orange-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            כדי להוריד את Planora
          </h1>
          <p className="text-gray-600 mb-6 leading-relaxed">
            הדפדפן הנוכחי לא תומך בהורדה ישירה.<br/>
            לחץ על הכפתור למטה כדי לעבור לחנות האפליקציות:
          </p>
          <Button
            onClick={() => window.open(storeUrl, '_blank')}
            className="w-full h-14 text-lg bg-orange-500 hover:bg-orange-600 rounded-xl shadow-lg mb-4"
          >
            <Sparkles className="w-5 h-5 ml-2" />
            התקן את האפליקציה
          </Button>
          <p className="text-sm text-gray-500 mb-4">
            💡 טיפ: אם זה לא עובד, העתק את הקישור ופתח בדפדפן Chrome או Safari
          </p>
          <button
            onClick={() => {
              navigator.clipboard.writeText(storeUrl);
              alert('קישור לחנות הועתק!');
            }}
            className="text-orange-600 hover:text-orange-700 text-sm underline"
          >
            העתק קישור לחנות
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-pink-50 dark:from-black dark:via-black dark:to-gray-900" style={{ direction: 'rtl' }}>
      {/* Update Available Dialog */}
      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <RefreshCw className="w-6 h-6 text-orange-500" />
              עדכון גרסה זמין!
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-700 mb-4">
              גרסה חדשה של Planora זמינה ({newVersion}). 
            </p>
            <p className="text-gray-600 text-sm">
              האפליקציה תתרענן כדי להביא לך את התכונות החדשות ביותר והשיפורים.
            </p>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                localStorage.removeItem('planora_update_available');
                setShowUpdateDialog(false);
              }}
            >
              אולי מאוחר יותר
            </Button>
            <Button
              onClick={handleUpdateNow}
              className="bg-orange-500 hover:bg-orange-600"
            >
              <RefreshCw className="w-4 h-4 ml-2" />
              עדכן עכשיו
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 md:py-24 text-center bg-gradient-to-br from-orange-400 to-rose-500 text-white">
        <div className="relative z-10 max-w-4xl mx-auto px-6">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-sm rounded-3xl mb-8">
            <Calendar className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            תכנון אירועים מעולם לא היה קל כל כך
          </h1>
          <p className="text-lg md:text-xl opacity-95 max-w-2xl mx-auto mb-8 leading-relaxed">
            Planora - האפליקציה שמשנה את חווית תכנון האירועים: משימות, צ'אטים, סקרים, גלריות ועוד!
          </p>
          <div className="flex justify-center w-full">
            <Button
              onClick={handleLogin}
              className="h-14 px-8 text-lg bg-white text-orange-600 hover:bg-gray-100 rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
            >
              <Sparkles className="w-5 h-5 ml-2" />
              התחל לתכנן את האירוע הבא שלך!
            </Button>
          </div>
          <p className="text-white/80 text-sm mt-4">
            חינם לגמרי • ללא התחייבות • הצטרפות תוך דקה
          </p>
          <div className="mt-6 pt-6 border-t border-white/30">
            <p className="text-white/90 text-base mb-3">כבר יש לך חשבון?</p>
            <Button
              onClick={handleLogin}
              variant="outline"
              className="h-12 px-8 text-base bg-transparent border-2 border-white text-white hover:bg-white hover:text-orange-600 rounded-full transition-all"
            >
              התחבר לחשבון שלך
            </Button>
          </div>
        </div>
      </section>

      {/* Feature Showcase */}
      <section className="py-16 md:py-20 px-6 max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white text-center mb-12">
          כלים שימושיים לכל אירוע
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <FeatureCard
            icon={CheckSquare}
            title="משימות משותפות"
            description="חלקו משימות, עקבו אחר התקדמות וודאו שכל פרט מטופל. אין יותר אי הבנות!"
            color="bg-blue-100 text-blue-600"
          />
          <FeatureCard
            icon={BarChart2}
            title="סקרים חכמים"
            description="הצביעו על תאריכים, מקומות, תפריטים או כל נושא אחר. קבלו החלטות במהירות ובקלות."
            color="bg-green-100 text-green-600"
          />
          <FeatureCard
            icon={MessageSquare}
            title="צ'אט ייעודי לאירוע"
            description="תקשרו עם כל המשתתפים במקום אחד. שתפו רעיונות, עדכונים ותמונות."
            color="bg-purple-100 text-purple-600"
          />
          <FeatureCard
            icon={Camera}
            title="גלריית תמונות משותפת"
            description="אספו את כל הזיכרונות מהאירוע במקום אחד. כולם יכולים להעלות ולשתף תמונות."
            color="bg-yellow-100 text-yellow-600"
          />
          <FeatureCard
            icon={Bot}
            title="תכנון אירועים עם AI"
            description="פשוט תארו את האירוע במילים, והעוזר החכם שלנו יבנה לכם תכנית מושלמת תוך שניות."
            color="bg-pink-100 text-pink-600"
          />
          <FeatureCard
            icon={Users}
            title="הזמנת משתתפים קלה"
            description="שלחו קישורי הצטרפות אישיים בוואטסאפ או SMS. עקבו אחר מי אישר הגעה."
            color="bg-orange-100 text-orange-600"
          />
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-20 px-6 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white text-center mb-12">
            איך זה עובד? פשוט ב-3 שלבים
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <StepCard
              step="1"
              title="צור את האירוע"
              description="בחר תבנית מוכנה, תכנן עם AI חכם או התחל מאפס עם הפרטים שלך."
              icon={PartyPopper}
            />
            <StepCard
              step="2"
              title="הזמן חברים"
              description="שלח קישורי הצטרפות פשוטים ואישיים בוואטסאפ, SMS או אימייל."
              icon={Smile}
            />
            <StepCard
              step="3"
              title="תכננו וחגגו יחד"
              description="נהלו משימות, הצביעו בסקרים, שתפו תמונות והפכו את התכנון לכיף אמיתי!"
              icon={Lightbulb}
            />
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-16 px-6 bg-white dark:bg-black">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-12">
            מה אומרים עלינו המשתמשים
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <TestimonialCard
              quote="לא יכולנו לתכנן בלעדיכם! הכל כל כך מאורגן ונוח"
              author="משפחת כהן"
              event="חתונה 2024"
            />
            <TestimonialCard
              quote="חיסכון אדיר בזמן ובכאב ראש! כל אחד יודע מה הוא צריך לעשות"
              author="רונית לוי"
              event="מסיבת יום הולדת"
            />
            <TestimonialCard
              quote="הסקרים פשוט גאוניים! הגענו להחלטות בקלות"
              author="קבוצת החברים"
              event="טיול משותף"
            />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 md:py-24 px-6 text-center bg-gradient-to-br from-orange-400 to-rose-500 text-white">
        <h2 className="text-3xl md:text-4xl font-bold mb-6">
          מוכנים לתכנן את האירוע המושלם?
        </h2>
        <p className="text-lg opacity-95 max-w-2xl mx-auto mb-8">
          הצטרפו עוד היום ל-Planora ותגלו כמה קל ומהנה יכול להיות תכנון אירועים משותף.
        </p>
        <Button
          onClick={handleLogin}
          className="h-16 px-10 text-xl bg-white text-orange-600 hover:bg-gray-100 rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
        >
          <Sparkles className="w-6 h-6 ml-2" />
          הירשם והתחל בחינם!
        </Button>
        <p className="text-white/80 text-sm mt-4">
          ✨ ללא כרטיס אשראי • ללא התחייבות • התחל תוך דקה אחת
        </p>
      </section>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description, color }) {
  return (
    <Card className="flex flex-col items-center p-6 text-center h-full border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 dark:bg-gray-800 dark:border-gray-700">
      <div className={`w-16 h-16 rounded-full ${color} flex items-center justify-center mb-4`}>
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">{description}</p>
    </Card>
  );
}

function StepCard({ step, title, description, icon: Icon }) {
  return (
    <Card className="flex flex-col items-center p-6 text-center h-full border-0 shadow-md hover:shadow-lg transition-all duration-300 dark:bg-gray-800 dark:border-gray-700">
      <div className="w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 flex items-center justify-center mb-4 text-2xl font-bold border-2 border-orange-300 dark:border-orange-800">
        {step}
      </div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm mb-4">{description}</p>
      <div className="mt-auto text-orange-500">
        <Icon className="w-8 h-8 mx-auto" />
      </div>
    </Card>
  );
}

function TestimonialCard({ quote, author, event }) {
  return (
    <Card className="p-6 border-0 shadow-md bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
      <div className="text-center">
        <p className="text-gray-700 dark:text-gray-300 italic mb-4 text-sm leading-relaxed">"{quote}"</p>
        <div className="text-sm">
          <p className="font-semibold text-gray-900 dark:text-white">{author}</p>
          <p className="text-gray-500 dark:text-gray-400">{event}</p>
        </div>
      </div>
    </Card>
  );
}
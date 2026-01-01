import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/components/AuthProvider';
import {
  Calendar, Users, CheckSquare, MessageSquare, BarChart2, Camera,
  Sparkles, Star, Zap, Clock, X, Bot,
  CheckCircle, Smartphone, Apple, Play, PartyPopper, Smile, Lightbulb
} from 'lucide-react';

export default function WelcomeTest() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const [deviceType, setDeviceType] = useState('desktop');

  const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=net.planora.app";
  const APP_STORE_URL = "https://apps.apple.com/il/app/planora/id6755497184";

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate(createPageUrl('Home'));
    }
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera || '';
    if (/android/i.test(userAgent)) {
      setDeviceType('android');
    } else if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
      setDeviceType('ios');
    }
  }, []);

  const handleDownloadClick = () => {
    if (deviceType === 'android') {
      window.location.href = 'market://details?id=net.planora.app';
      setTimeout(() => { window.location.href = PLAY_STORE_URL; }, 300);
    } else if (deviceType === 'ios') {
      window.location.href = 'itms-apps://apps.apple.com/il/app/id6755497184';
      setTimeout(() => { window.location.href = APP_STORE_URL; }, 300);
    } else {
      navigate(createPageUrl('App'));
    }
  };

  const handleLogin = () => {
    navigate(createPageUrl('Auth'));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-pink-50">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-pink-50" style={{ direction: 'rtl' }}>
      
      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 md:py-28 text-center bg-gradient-to-b from-orange-400 via-orange-500 to-orange-600 text-white">
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-white/20 backdrop-blur-sm rounded-2xl sm:rounded-3xl mb-6 sm:mb-8">
            <Calendar className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </div>
          
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-4 sm:mb-6 leading-tight px-2">
            נמאס לכם מהבלגן
            <br />
            בתכנון אירועים?
          </h1>
          
          <p className="text-sm sm:text-base md:text-lg opacity-95 max-w-xl mx-auto mb-4 leading-relaxed px-4">
            <span className="font-semibold">Planora</span> מרכזת הכל במקום אחד - מיציאה לסרט עם חברים ועד חתונה משפחתית
          </p>
          
          <p className="text-xs sm:text-sm opacity-80 max-w-md mx-auto mb-6 sm:mb-8 px-4">
            אירועים קטנים וגדולים • יומיומיים ומיוחדים • חברתיים ומשפחתיים
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col gap-3 justify-center px-4 mb-4">
            <Button
              onClick={handleDownloadClick}
              className="h-12 sm:h-14 px-6 sm:px-10 text-base sm:text-lg bg-white text-orange-500 hover:bg-gray-100 rounded-full shadow-lg hover:shadow-xl transition-all font-medium"
            >
              <Sparkles className="w-5 h-5 ml-2" />
              התחל לתכנן עכשיו!
            </Button>
            <Button
              onClick={handleLogin}
              variant="outline"
              className="h-12 sm:h-14 px-6 sm:px-10 text-base sm:text-lg border-2 border-white text-white bg-transparent hover:bg-white/20 rounded-full transition-all font-medium"
            >
              כבר רשום? התחבר
            </Button>
          </div>
          
          <p className="text-white/80 text-xs sm:text-sm">
            חינם לגמרי • ללא התחייבות • הצטרפות תוך דקה
          </p>

          {/* App Store Badges */}
          <div className="flex justify-center gap-3 mt-6">
            <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-black/30 hover:bg-black/50 px-3 py-2 rounded-lg transition-colors">
              <Apple className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-xs sm:text-sm">App Store</span>
            </a>
            <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-black/30 hover:bg-black/50 px-3 py-2 rounded-lg transition-colors">
              <Play className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-xs sm:text-sm">Google Play</span>
            </a>
          </div>
        </div>
      </section>

      {/* Pain Points Section */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-gradient-to-br from-orange-50 via-white to-pink-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8 sm:mb-10">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-3">
              מכירים את זה? 🤯
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-8 sm:mb-10">
            {[
              { text: '100 הודעות בוואטסאפ ואף אחד לא יודע מה סוכם' },
              { text: '"מתי נפגשים?" - שאלה שחוזרת 50 פעם' },
              { text: 'מי מביא מה? אף אחד לא זוכר' },
              { text: 'תמונות מפוזרות ב-10 קבוצות שונות' },
            ].map((pain, i) => (
              <Card key={i} className="p-4 border-red-100 bg-red-50/50 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                    <X className="w-4 h-4 text-red-500" />
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed">{pain.text}</p>
                </div>
              </Card>
            ))}
          </div>

          {/* Solution */}
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 sm:p-8 text-center border border-green-100">
            <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto bg-green-100 rounded-xl flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 sm:w-7 sm:h-7 text-green-600" />
            </div>
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-3">
              עם Planora – הכל מסודר!
            </h3>
            <p className="text-gray-600 text-sm sm:text-base max-w-lg mx-auto mb-5">
              פלטפורמה אחת לכל התכנון: משימות, צ'אטים, הצבעות, גלריות ועוד.
              <br />
              <span className="font-medium text-green-700">בלי בלגן. בלי כאב ראש.</span>
            </p>
            <Button onClick={handleDownloadClick} className="bg-green-600 hover:bg-green-700 text-sm sm:text-base py-5 px-8 rounded-full">
              <Zap className="w-4 h-4 ml-2" />
              בואו נתחיל!
            </Button>
          </Card>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 text-center mb-8 sm:mb-10">
            כלים שימושיים לכל אירוע
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <FeatureCard 
              icon={CheckSquare} 
              title="משימות משותפות" 
              description="חלקו משימות, עקבו אחר התקדמות וודאו שכל פרט מטופל"
              color="bg-blue-100 text-blue-600"
            />
            <FeatureCard 
              icon={BarChart2} 
              title="סקרים חכמים" 
              description="איזה סרט? איפה נאכל? מתי נוח? הצביעו וקבלו החלטות בקלות"
              color="bg-green-100 text-green-600"
            />
            <FeatureCard 
              icon={MessageSquare} 
              title="צ'אט קבוצתי" 
              description="תקשרו עם כל המשתתפים במקום אחד, בלי להיאבד בקבוצות"
              color="bg-purple-100 text-purple-600"
            />
            <FeatureCard 
              icon={Camera} 
              title="גלריית תמונות" 
              description="כל הזיכרונות מהאירוע במקום אחד. כולם יכולים להעלות"
              color="bg-yellow-100 text-yellow-600"
            />
            <FeatureCard 
              icon={Bot} 
              title="תכנון עם AI" 
              description="תארו מה אתם רוצים והעוזר החכם יבנה תכנית מושלמת"
              color="bg-pink-100 text-pink-600"
            />
            <FeatureCard 
              icon={Users} 
              title="הזמנות בקליק" 
              description="שלחו הזמנות בוואטסאפ או SMS ועקבו מי אישר הגעה"
              color="bg-orange-100 text-orange-600"
            />
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 text-center mb-3">
            מתאים לכל סוג אירוע
          </h2>
          <p className="text-gray-600 text-center text-sm mb-8">
            מהמפגשים היומיומיים ועד האירועים הגדולים
          </p>

          <div className="grid grid-cols-4 gap-2 sm:gap-4">
            {[
              { emoji: '🎬', label: 'סרט' },
              { emoji: '🍕', label: 'ארוחה' },
              { emoji: '🏃', label: 'אימון' },
              { emoji: '🎂', label: 'יום הולדת' },
              { emoji: '🗺️', label: 'טיול' },
              { emoji: '💒', label: 'חתונה' },
              { emoji: '👶', label: 'ברית' },
              { emoji: '🎓', label: 'בר מצווה' },
            ].map((item, i) => (
              <Card key={i} className="p-3 sm:p-4 text-center hover:shadow-lg transition-all hover:-translate-y-1 border-0 bg-gradient-to-br from-orange-50 to-pink-50">
                <span className="text-2xl sm:text-3xl mb-1 block">{item.emoji}</span>
                <span className="font-medium text-gray-900 text-xs sm:text-sm block">{item.label}</span>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 text-center mb-8 sm:mb-10">
            איך זה עובד? פשוט ב-3 שלבים
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <StepCard
              step="1"
              title="צור תכנון"
              description="בחר תבנית מוכנה, תכנן עם AI או התחל מאפס"
              icon={PartyPopper}
            />
            <StepCard
              step="2"
              title="הזמן חברים"
              description="שלח קישורים בוואטסאפ, SMS או אימייל"
              icon={Smile}
            />
            <StepCard
              step="3"
              title="תכננו יחד"
              description="משימות, סקרים, צ'אט - הכל במקום אחד"
              icon={Lightbulb}
            />
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 text-center mb-8 sm:mb-10">
            מה אומרים עלינו
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <TestimonialCard 
              quote="סוף סוף אפליקציה שמסדרת את כל הבלגן! ארגנתי יום הולדת הפתעה בלי שום לחץ"
              author="מיכל, 28"
              event="יום הולדת הפתעה"
            />
            <TestimonialCard 
              quote="הצבעות על תאריכים ומיקומים חסכו לנו שעות של דיונים מיותרים"
              author="יוסי, 34"
              event="טיול שנתי עם חברים"
            />
            <TestimonialCard 
              quote="הגלריה המשותפת זה גאוני! כל התמונות מהחתונה במקום אחד"
              author="נועה ודני"
              event="חתונה"
            />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 text-center bg-gradient-to-br from-orange-400 to-rose-500 text-white">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 px-2">
          מוכנים לתכנון חכם יותר?
        </h2>
        <p className="text-base sm:text-lg opacity-95 max-w-xl mx-auto mb-6 sm:mb-8 px-4">
          הצטרפו לאלפי משתמשים שכבר מתכננים אירועים בקלות
        </p>
        
        <div className="flex flex-col gap-3 justify-center px-4 max-w-md mx-auto mb-6">
          <Button 
            onClick={handleDownloadClick}
            className="h-14 sm:h-16 px-8 text-base sm:text-lg bg-white text-orange-600 hover:bg-gray-100 rounded-full shadow-lg hover:shadow-xl transition-all font-bold"
          >
            <Smartphone className="w-5 h-5 ml-2" />
            הורד את האפליקציה - חינם!
          </Button>
          <Button 
            onClick={handleLogin}
            variant="outline" 
            className="h-12 sm:h-14 px-8 text-base sm:text-lg border-2 border-white text-white bg-transparent hover:bg-white/20 rounded-full transition-all"
          >
            כבר רשום? התחבר
          </Button>
        </div>

        <p className="text-white/80 text-xs sm:text-sm mb-6">
          ✨ ללא כרטיס אשראי • ללא התחייבות • התחל תוך דקה
        </p>

        {/* Store badges */}
        <div className="flex justify-center gap-3 sm:gap-4">
          <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-black text-white px-4 py-2 sm:px-5 sm:py-3 rounded-xl hover:bg-gray-900 transition-colors">
            <Apple className="w-5 h-5 sm:w-6 sm:h-6" />
            <div className="text-right">
              <div className="text-[9px] sm:text-[10px] opacity-70">הורד מ-</div>
              <div className="font-semibold text-sm sm:text-base">App Store</div>
            </div>
          </a>
          <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-black text-white px-4 py-2 sm:px-5 sm:py-3 rounded-xl hover:bg-gray-900 transition-colors">
            <Play className="w-5 h-5 sm:w-6 sm:h-6" />
            <div className="text-right">
              <div className="text-[9px] sm:text-[10px] opacity-70">הורד מ-</div>
              <div className="font-semibold text-sm sm:text-base">Google Play</div>
            </div>
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-6 sm:py-8 px-4">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-500 rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <span className="text-lg sm:text-xl font-bold">Planora</span>
          </div>
          <p className="text-gray-400 text-xs sm:text-sm">
            © 2025 Planora. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description, color }) {
  return (
    <Card className="flex flex-col items-center p-5 sm:p-6 text-center h-full border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white">
      <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full ${color} flex items-center justify-center mb-3 sm:mb-4`}>
        <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
      </div>
      <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 leading-relaxed text-xs sm:text-sm">{description}</p>
    </Card>
  );
}

function StepCard({ step, title, description, icon: Icon }) {
  return (
    <Card className="flex flex-col items-center p-5 sm:p-6 text-center h-full border-0 shadow-md hover:shadow-lg transition-all duration-300 bg-white">
      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mb-3 sm:mb-4 text-xl sm:text-2xl font-bold border-2 border-orange-300">
        {step}
      </div>
      <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 leading-relaxed text-xs sm:text-sm mb-3">{description}</p>
      <div className="mt-auto text-orange-500">
        <Icon className="w-6 h-6 sm:w-8 sm:h-8 mx-auto" />
      </div>
    </Card>
  );
}

function TestimonialCard({ quote, author, event }) {
  return (
    <Card className="p-5 sm:p-6 border-0 shadow-md bg-gray-50">
      <div className="flex gap-1 mb-3 justify-center">
        {[1,2,3,4,5].map(i => (
          <Star key={i} className="w-3 h-3 sm:w-4 sm:h-4 fill-yellow-400 text-yellow-400" />
        ))}
      </div>
      <p className="text-gray-700 mb-4 leading-relaxed text-xs sm:text-sm text-center">"{quote}"</p>
      <div className="text-center border-t pt-3">
        <p className="font-semibold text-gray-900 text-sm">{author}</p>
        <p className="text-xs text-orange-600">{event}</p>
      </div>
    </Card>
  );
}
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
      <section className="relative overflow-hidden py-20 md:py-28 text-center bg-gradient-to-b from-orange-400 via-orange-500 to-orange-600 text-white">
        <div className="relative z-10 max-w-4xl mx-auto px-6">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-sm rounded-3xl mb-8">
            <Calendar className="w-10 h-10 text-white" />
          </div>
          
          <h1 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
            נמאס לכם מהבלגן
            <br />
            בתכנון אירועים?
          </h1>
          
          <p className="text-base md:text-lg opacity-95 max-w-xl mx-auto mb-4 leading-relaxed">
            <span className="font-semibold">Planora</span> מרכזת הכל במקום אחד - מיציאה לסרט עם חברים ועד חתונה משפחתית
          </p>
          
          <p className="text-sm opacity-80 max-w-md mx-auto mb-10">
            אירועים קטנים וגדולים • יומיומיים ומיוחדים • חברתיים ומשפחתיים
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-4">
            <Button
              onClick={handleDownloadClick}
              className="h-14 px-10 text-lg bg-white text-orange-500 hover:bg-gray-100 rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-105 font-medium"
            >
              <Sparkles className="w-5 h-5 ml-2" />
              התחל לתכנן עכשיו!
            </Button>
            <Button
              onClick={handleLogin}
              variant="outline"
              className="h-14 px-10 text-lg border-2 border-white text-white bg-transparent hover:bg-white/20 rounded-full transition-all font-medium"
            >
              כבר רשום? התחבר
            </Button>
          </div>
          
          <p className="text-white/80 text-sm mt-4">
            חינם לגמרי • ללא התחייבות • הצטרפות תוך דקה
          </p>

          {/* App Store Badges */}
          <div className="flex justify-center gap-3 mt-6">
            <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-black/30 hover:bg-black/50 px-4 py-2 rounded-lg transition-colors">
              <Apple className="w-5 h-5" />
              <span className="text-sm">App Store</span>
            </a>
            <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-black/30 hover:bg-black/50 px-4 py-2 rounded-lg transition-colors">
              <Play className="w-5 h-5" />
              <span className="text-sm">Google Play</span>
            </a>
          </div>
        </div>
      </section>

      {/* Pain Points Section */}
      <section className="py-16 md:py-20 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            מכירים את זה? 🤯
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {[
            { text: '100 הודעות בוואטסאפ ואף אחד לא יודע מה סוכם' },
            { text: '"מתי נפגשים?" - שאלה שחוזרת 50 פעם' },
            { text: 'מי מביא מה? אף אחד לא זוכר' },
            { text: 'תמונות מפוזרות ב-10 קבוצות שונות' },
          ].map((pain, i) => (
            <Card key={i} className="p-5 border-0 shadow-lg bg-red-50/80 hover:shadow-xl transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <X className="w-5 h-5 text-red-500" />
                </div>
                <p className="text-gray-700 text-sm leading-relaxed pt-2">{pain.text}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Solution */}
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 md:p-10 text-center border-0 shadow-lg">
          <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
            עם Planora – הכל מסודר!
          </h3>
          <p className="text-gray-600 text-base max-w-lg mx-auto mb-6 leading-relaxed">
            פלטפורמה אחת לכל התכנון: משימות, צ'אטים, הצבעות, גלריות ועוד.
            <br />
            <span className="font-medium text-green-700">בלי בלגן. בלי כאב ראש.</span>
          </p>
          <Button onClick={handleDownloadClick} className="bg-green-600 hover:bg-green-700 h-14 px-10 text-lg rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
            <Zap className="w-5 h-5 ml-2" />
            בואו נתחיל!
          </Button>
        </Card>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-12">
            כלים שימושיים לכל אירוע
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
      <section className="py-16 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-4">
            מתאים לכל סוג אירוע
          </h2>
          <p className="text-gray-600 text-center mb-12">
            מהמפגשים היומיומיים ועד האירועים הגדולים
          </p>

          <div className="grid grid-cols-4 gap-4">
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
              <Card key={i} className="p-4 text-center hover:shadow-lg transition-all duration-300 hover:-translate-y-2 border-0 shadow-md bg-gradient-to-br from-orange-50 to-pink-50">
                <span className="text-3xl md:text-4xl mb-2 block">{item.emoji}</span>
                <span className="font-medium text-gray-900 text-sm block">{item.label}</span>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-20 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-12">
            איך זה עובד? פשוט ב-3 שלבים
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
      <section className="py-16 px-6 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-12">
            מה אומרים עלינו
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
      <section className="py-16 md:py-24 px-6 text-center bg-gradient-to-br from-orange-400 to-rose-500 text-white">
        <h2 className="text-3xl md:text-4xl font-bold mb-6">
          מוכנים לתכנון חכם יותר?
        </h2>
        <p className="text-lg opacity-95 max-w-2xl mx-auto mb-8">
          הצטרפו לאלפי משתמשים שכבר מתכננים אירועים בקלות
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
          <Button 
            onClick={handleDownloadClick}
            className="h-16 px-10 text-xl bg-white text-orange-600 hover:bg-gray-100 rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
          >
            <Smartphone className="w-6 h-6 ml-2" />
            הורד את האפליקציה - חינם!
          </Button>
          <Button 
            onClick={handleLogin}
            variant="outline" 
            className="h-16 px-10 text-xl border-2 border-white text-white bg-transparent hover:bg-white/20 rounded-full transition-all"
          >
            כבר רשום? התחבר
          </Button>
        </div>

        <p className="text-white/80 text-sm mb-8">
          ✨ ללא כרטיס אשראי • ללא התחייבות • התחל תוך דקה אחת
        </p>

        {/* Store badges */}
        <div className="flex justify-center gap-4">
          <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-black text-white px-5 py-3 rounded-xl hover:bg-gray-900 transition-colors">
            <Apple className="w-6 h-6" />
            <div className="text-right">
              <div className="text-[10px] opacity-70">הורד מ-</div>
              <div className="font-semibold">App Store</div>
            </div>
          </a>
          <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-black text-white px-5 py-3 rounded-xl hover:bg-gray-900 transition-colors">
            <Play className="w-6 h-6" />
            <div className="text-right">
              <div className="text-[10px] opacity-70">הורד מ-</div>
              <div className="font-semibold">Google Play</div>
            </div>
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 px-6">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold">Planora</span>
          </div>
          <p className="text-gray-400 text-sm">
            © 2025 Planora. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description, color }) {
  return (
    <Card className="flex flex-col items-center p-6 text-center h-full border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 bg-white">
      <div className={`w-16 h-16 rounded-full ${color} flex items-center justify-center mb-4`}>
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 leading-relaxed text-sm">{description}</p>
    </Card>
  );
}

function StepCard({ step, title, description, icon: Icon }) {
  return (
    <Card className="flex flex-col items-center p-6 text-center h-full border-0 shadow-md hover:shadow-lg transition-all duration-300 bg-white">
      <div className="w-16 h-16 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mb-4 text-2xl font-bold border-2 border-orange-300">
        {step}
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 leading-relaxed text-sm mb-4">{description}</p>
      <div className="mt-auto text-orange-500">
        <Icon className="w-8 h-8 mx-auto" />
      </div>
    </Card>
  );
}

function TestimonialCard({ quote, author, event }) {
  return (
    <Card className="p-6 border-0 shadow-md bg-gray-50">
      <div className="text-center">
        <p className="text-gray-700 italic mb-4 text-sm leading-relaxed">"{quote}"</p>
        <div className="text-sm">
          <p className="font-semibold text-gray-900">{author}</p>
          <p className="text-gray-500">{event}</p>
        </div>
      </div>
    </Card>
  );
}
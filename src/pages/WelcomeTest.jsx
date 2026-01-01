import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/components/AuthProvider';
import {
  Calendar, Users, CheckSquare, MessageSquare, BarChart2, Camera,
  Sparkles, ArrowLeft, Star, Heart, Zap, Shield, Clock, X,
  AlertTriangle, CheckCircle, Smartphone, Apple, Play
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-pink-50">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white" style={{ direction: 'rtl' }}>
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-orange-500 via-rose-500 to-pink-500 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative max-w-6xl mx-auto px-4 py-16 sm:py-24">
          <div className="text-center max-w-3xl mx-auto">
            
            {/* Logo */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center mb-6 shadow-xl border border-white/30">
              <Calendar className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 leading-tight">
              נמאס לכם מהבלגן בתכנון אירועים?
            </h1>
            <p className="text-lg sm:text-xl text-white/90 mb-3 leading-relaxed">
              <span className="font-semibold">Planora</span> מרכזת הכל במקום אחד
            </p>
            <p className="text-base sm:text-lg text-white/80 mb-8">
              מיציאה לסרט עם חברים ועד חתונה משפחתית – אירועים קטנים וגדולים, יומיומיים ומיוחדים
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
              <Button 
                onClick={handleDownloadClick}
                size="lg" 
                className="bg-white text-orange-600 hover:bg-gray-100 text-base sm:text-lg py-6 px-8 shadow-xl font-bold"
              >
                <Sparkles className="w-5 h-5 ml-2" />
                התחל לתכנן את האירוע הבא
              </Button>
              <Link to={createPageUrl('Auth')}>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="w-full sm:w-auto border-2 border-white text-white hover:bg-white/20 text-base sm:text-lg py-6 px-8"
                >
                  כבר רשום? התחבר
                </Button>
              </Link>
            </div>

            {/* App Store Badges */}
            <div className="flex justify-center gap-3">
              <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-black/30 hover:bg-black/50 px-4 py-2 rounded-xl transition-colors">
                <Apple className="w-5 h-5" />
                <span className="text-sm">App Store</span>
              </a>
              <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-black/30 hover:bg-black/50 px-4 py-2 rounded-xl transition-colors">
                <Play className="w-5 h-5" />
                <span className="text-sm">Google Play</span>
              </a>
            </div>
          </div>
        </div>

        {/* Wave Bottom */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 100V50C240 0 480 0 720 25C960 50 1200 75 1440 50V100H0Z" fill="white"/>
          </svg>
        </div>
      </section>

      {/* Pain Points Section */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
              מכירים את זה?
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              תכנון אירועים יכול להיות כאב ראש אמיתי...
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {[
              { icon: MessageSquare, text: '100 הודעות בוואטסאפ ואף אחד לא יודע מה סוכם', color: 'red' },
              { icon: Clock, text: '"מתי נפגשים?" - שאלה שחוזרת 50 פעם', color: 'orange' },
              { icon: Users, text: 'מי מביא מה? אף אחד לא זוכר', color: 'yellow' },
              { icon: Camera, text: 'תמונות מפוזרות ב-10 קבוצות שונות', color: 'purple' },
            ].map((pain, i) => (
              <Card key={i} className="p-5 border-red-100 bg-red-50/50 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                    <X className="w-5 h-5 text-red-500" />
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed">{pain.text}</p>
                </div>
              </Card>
            ))}
          </div>

          {/* Solution */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl p-8 sm:p-12 text-center border border-green-100">
            <div className="w-16 h-16 mx-auto bg-green-100 rounded-2xl flex items-center justify-center mb-6">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
              עם Planora – הכל מסודר במקום אחד
            </h3>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto mb-6">
              פלטפורמה אחת לכל התכנון: משימות, צ'אטים, הצבעות, גלריות ועוד.
              <br />
              <span className="font-medium text-green-700">בלי בלגן. בלי כאב ראש. רק תכנון חכם.</span>
            </p>
            <Button onClick={handleDownloadClick} size="lg" className="bg-green-600 hover:bg-green-700 text-lg py-6 px-10">
              <Zap className="w-5 h-5 ml-2" />
              בואו נתחיל!
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
              מה תקבלו עם Planora?
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard 
              icon={CheckSquare} 
              title="משימות משותפות" 
              description="חלקו משימות בין המשתתפים ועקבו אחרי ההתקדמות בזמן אמת"
              color="blue"
            />
            <FeatureCard 
              icon={BarChart2} 
              title="סקרים והצבעות" 
              description="תאריך, מיקום, מה להביא? החליטו ביחד בקלות"
              color="green"
            />
            <FeatureCard 
              icon={MessageSquare} 
              title="צ'אט מרוכז" 
              description="כל התקשורת של האירוע במקום אחד, בלי להיאבד בקבוצות"
              color="purple"
            />
            <FeatureCard 
              icon={Camera} 
              title="גלריה משותפת" 
              description="כל התמונות מהאירוע נאספות אוטומטית לגלריה אחת"
              color="pink"
            />
            <FeatureCard 
              icon={Sparkles} 
              title="תכנון עם AI" 
              description="תנו ל-AI לעזור לכם ליצור אירוע מושלם בדקות"
              color="orange"
            />
            <FeatureCard 
              icon={Users} 
              title="הזמנות בקליק" 
              description="שלחו הזמנות בוואטסאפ או SMS בלחיצת כפתור"
              color="teal"
            />
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
              מתאים לכל סוג אירוע
            </h2>
            <p className="text-gray-600">
              מהמפגשים היומיומיים ועד האירועים הגדולים
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { emoji: '🎬', label: 'יציאה לסרט', desc: 'עם החברה' },
              { emoji: '🍕', label: 'ארוחה משותפת', desc: 'מי מביא מה?' },
              { emoji: '🏃', label: 'אימון קבוצתי', desc: 'כושר עם חברים' },
              { emoji: '🎂', label: 'יום הולדת', desc: 'הפתעה מושלמת' },
              { emoji: '🗺️', label: 'טיול', desc: 'יום כיף או שבוע' },
              { emoji: '💒', label: 'חתונה', desc: 'היום הגדול' },
              { emoji: '👶', label: 'ברית/בריתה', desc: 'אירוע משפחתי' },
              { emoji: '🎓', label: 'בר/בת מצווה', desc: 'חגיגה גדולה' },
            ].map((item, i) => (
              <Card key={i} className="p-4 text-center hover:shadow-lg transition-all hover:-translate-y-1 border-0 bg-gradient-to-br from-orange-50 to-pink-50">
                <span className="text-4xl mb-2 block">{item.emoji}</span>
                <span className="font-bold text-gray-900 block">{item.label}</span>
                <span className="text-xs text-gray-500">{item.desc}</span>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 px-4 bg-gradient-to-br from-orange-50 to-pink-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
              מה אומרים המשתמשים שלנו?
            </h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            <TestimonialCard 
              quote="סוף סוף אפליקציה שמסדרת את כל הבלגן! ארגנתי יום הולדת הפתעה בלי שום לחץ"
              author="מיכל, 28"
              event="יום הולדת הפתעה"
            />
            <TestimonialCard 
              quote="הצבעות על תאריכים ומיקומים חסכו לנו שעות של דיונים מיותרים בקבוצה"
              author="יוסי, 34"
              event="טיול שנתי עם חברים"
            />
            <TestimonialCard 
              quote="הגלריה המשותפת זה פשוט גאוני! כל התמונות מהחתונה במקום אחד"
              author="נועה ודני"
              event="חתונה"
            />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 bg-gradient-to-r from-orange-500 via-rose-500 to-pink-500 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            מוכנים לתכנון חכם יותר?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            הצטרפו לאלפי משתמשים שכבר מתכננים אירועים בקלות
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Button 
              onClick={handleDownloadClick}
              size="lg" 
              className="bg-white text-orange-600 hover:bg-gray-100 text-lg py-6 px-10 shadow-xl font-bold"
            >
              <Smartphone className="w-5 h-5 ml-2" />
              הורד את האפליקציה - חינם!
            </Button>
            <Link to={createPageUrl('Auth')}>
              <Button 
                size="lg" 
                variant="outline" 
                className="w-full sm:w-auto border-2 border-white text-white hover:bg-white/20 text-lg py-6 px-8"
              >
                כבר רשום? התחבר
              </Button>
            </Link>
          </div>

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
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
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
  const colors = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    pink: 'bg-pink-100 text-pink-600',
    orange: 'bg-orange-100 text-orange-600',
    teal: 'bg-teal-100 text-teal-600',
  };

  return (
    <Card className="p-6 border-0 shadow-md hover:shadow-xl transition-all hover:-translate-y-1 bg-white">
      <div className={`w-14 h-14 rounded-2xl ${colors[color]} flex items-center justify-center mb-4`}>
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm leading-relaxed">{description}</p>
    </Card>
  );
}

function TestimonialCard({ quote, author, event }) {
  return (
    <Card className="p-6 border-0 shadow-md bg-white">
      <div className="flex gap-1 mb-4">
        {[1,2,3,4,5].map(i => (
          <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
        ))}
      </div>
      <p className="text-gray-700 mb-4 leading-relaxed">"{quote}"</p>
      <div className="border-t pt-4">
        <p className="font-bold text-gray-900">{author}</p>
        <p className="text-sm text-orange-600">{event}</p>
      </div>
    </Card>
  );
}
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Calendar, Users, CheckSquare, MessageSquare, BarChart2, Camera,
  Sparkles, TrendingUp, Shield, Zap, Globe, Heart, Star, ArrowLeft,
  Smartphone, Apple, Play, Target, Award, Rocket
} from 'lucide-react';

export default function OnePager() {
  const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=net.planora.app";
  const APP_STORE_URL = "https://apps.apple.com/il/app/planora-%D7%90%D7%99%D7%A8%D7%95%D7%A2%D7%99%D7%9D/id6755497184";

  return (
    <div className="min-h-screen bg-white" style={{ direction: 'rtl' }}>
      {/* Header */}
      <header className="bg-gradient-to-r from-orange-500 to-rose-500 text-white py-4 px-6 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6" />
            </div>
            <span className="text-2xl font-bold">Planora</span>
          </div>

        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-orange-500 via-rose-500 to-pink-500 text-white py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full text-sm mb-6">
                <Rocket className="w-4 h-4" />
                אפליקציה חדשנית לתכנון שיתופי
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                Planora
                <span className="block text-white/90 text-2xl md:text-3xl mt-2 font-normal">
                  לתכנן הכל יחד עם חברים
                </span>
              </h1>
              <p className="text-xl text-white/90 mb-8 leading-relaxed">
                פלטפורמה מתקדמת לתכנון אירועים שיתופי - מיציאה לסרט ועד חתונות.
                משימות, צ'אטים, הצבעות וגלריות במקום אחד.
              </p>
              <div className="flex flex-wrap gap-4">
                <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-xl hover:bg-gray-900 transition-colors">
                  <Apple className="w-5 h-5" />
                  App Store
                </a>
                <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-white text-gray-900 px-6 py-3 rounded-xl hover:bg-gray-100 transition-colors">
                  <Play className="w-5 h-5" />
                  Google Play
                </a>
              </div>
            </div>
            <div className="relative">
              <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20">
                <div className="text-center">
                  <Calendar className="w-16 h-16 mx-auto mb-4 opacity-80" />
                  <p className="text-xl font-medium">אפליקציה זמינה ב-</p>
                  <p className="text-lg opacity-90">App Store & Google Play</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem & Solution */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12">
            <Card className="p-8 border-red-200 bg-red-50">
              <h3 className="text-xl font-bold text-red-700 mb-4 flex items-center gap-2">
                <Target className="w-6 h-6" />
                הבעיה
              </h3>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">✗</span>
                  תכנון אירועים מפוזר בין וואטסאפ, אקסל והודעות
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">✗</span>
                  קשה לעקוב אחרי מי עושה מה ומתי
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">✗</span>
                  החלטות קבוצתיות לוקחות זמן רב
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">✗</span>
                  תמונות מהאירוע מפוזרות בכל מקום
                </li>
              </ul>
            </Card>

            <Card className="p-8 border-green-200 bg-green-50">
              <h3 className="text-xl font-bold text-green-700 mb-4 flex items-center gap-2">
                <Sparkles className="w-6 h-6" />
                הפתרון
              </h3>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  פלטפורמה אחת לכל התכנון והתקשורת
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  משימות משותפות עם מעקב בזמן אמת
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  סקרים חכמים להחלטות מהירות
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  גלריה משותפת לכל הזיכרונות
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              תכונות מרכזיות
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              כל מה שצריך לתכנון אירוע מושלם - בממשק אחד פשוט ונוח
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={CheckSquare}
              title="משימות משותפות"
              description="חלוקת משימות חכמה עם מעקב התקדמות בזמן אמת"
              color="blue"
            />
            <FeatureCard
              icon={BarChart2}
              title="סקרים והצבעות"
              description="החלטות קבוצתיות מהירות על תאריכים, מיקומים ועוד"
              color="green"
            />
            <FeatureCard
              icon={MessageSquare}
              title="צ'אט קבוצתי"
              description="תקשורת מרוכזת לכל משתתפי האירוע"
              color="purple"
            />
            <FeatureCard
              icon={Camera}
              title="גלריה משותפת"
              description="כל התמונות מהאירוע במקום אחד מסודר"
              color="pink"
            />
            <FeatureCard
              icon={Sparkles}
              title="תכנון עם AI"
              description="יצירת אירוע מושלם בעזרת בינה מלאכותית"
              color="orange"
            />
            <FeatureCard
              icon={Users}
              title="הזמנות קלות"
              description="שיתוף קישורים אישיים בוואטסאפ ו-SMS"
              color="teal"
            />
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-20 px-6 bg-gradient-to-br from-orange-50 to-pink-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              מתאים לכל סוג אירוע
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { emoji: '🎬', label: 'יציאה לסרט' },
              { emoji: '🍕', label: 'ארוחה משותפת' },
              { emoji: '🏃', label: 'אימון קבוצתי' },
              { emoji: '🎂', label: 'יום הולדת' },
              { emoji: '🗺️', label: 'טיול' },
              { emoji: '💒', label: 'חתונה' },
              { emoji: '👶', label: 'ברית/בריתה' },
              { emoji: '🎓', label: 'בר/בת מצווה' },
            ].map((item, i) => (
              <Card key={i} className="p-4 text-center hover:shadow-lg transition-shadow border-0">
                <span className="text-4xl mb-2 block">{item.emoji}</span>
                <span className="text-gray-700 font-medium">{item.label}</span>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              הצוות
            </h2>
          </div>

          <div className="flex justify-center">
            <Card className="p-8 text-center max-w-sm">
              <div className="w-24 h-24 bg-orange-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Users className="w-12 h-12 text-orange-500" />
              </div>
              <h3 className="font-bold text-gray-900 text-xl mb-2">מנגשה אטלאי</h3>
              <p className="text-gray-600">מייסד</p>
              <p className="text-gray-500 text-sm mt-1">מנהל פרויקטים ומערכות מידע | 5 שנות ניסיון</p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-gradient-to-r from-orange-500 to-rose-500 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            מעוניינים לשמוע עוד?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            נשמח לספר לכם עוד על החזון, האסטרטגיה והתוכניות שלנו
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a 
              href="mailto:contact@plan-ora.net?subject=מעוניין לשמוע עוד על Planora"
              className="bg-white text-orange-600 px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-100 transition-colors"
            >
              צור קשר
            </a>
            <a 
              href="https://plan-ora.net"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white/20 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/30 transition-colors"
            >
              בקר באתר
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <span className="font-bold">Planora</span>
          </div>
          <p className="text-gray-400 text-sm">
            © 2024 Planora. All rights reserved.
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
    <Card className="p-6 border-0 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
      <div className={`w-14 h-14 rounded-xl ${colors[color]} flex items-center justify-center mb-4`}>
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </Card>
  );
}
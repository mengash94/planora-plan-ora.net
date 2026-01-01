import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Calendar, Users, CheckSquare, MessageSquare, BarChart2, Camera,
  Sparkles, Target, Rocket, Download, Apple, Play
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function OnePager() {
  const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=net.planora.app";
  const APP_STORE_URL = "https://apps.apple.com/il/app/planora/id6755497184";
  const contentRef = useRef(null);

  const handleDownloadPDF = async () => {
    if (!contentRef.current) return;
    
    try {
      const canvas = await html2canvas(contentRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      let heightLeft = pdfHeight;
      let position = 0;
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save('Planora-OnePager.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  return (
    <div className="min-h-screen bg-white" style={{ direction: 'rtl' }}>
      {/* Download Button - Fixed */}
      <button
        onClick={handleDownloadPDF}
        className="fixed bottom-6 left-6 z-50 bg-orange-500 hover:bg-orange-600 text-white p-4 rounded-full shadow-xl transition-all hover:scale-105 print:hidden"
        title="הורד PDF"
      >
        <Download className="w-6 h-6" />
      </button>

      <div ref={contentRef}>
        {/* Header */}
        <header className="bg-gradient-to-r from-orange-500 to-rose-500 text-white py-3 px-4 sm:py-4 sm:px-6">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <span className="text-xl sm:text-2xl font-bold">Planora</span>
            </div>
            <div className="flex gap-2">
              <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className="bg-black/30 hover:bg-black/50 p-2 rounded-lg transition-colors">
                <Apple className="w-5 h-5" />
              </a>
              <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="bg-black/30 hover:bg-black/50 p-2 rounded-lg transition-colors">
                <Play className="w-5 h-5" />
              </a>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="bg-gradient-to-br from-orange-500 via-rose-500 to-pink-500 text-white py-12 sm:py-20 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 bg-white/20 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm mb-4 sm:mb-6">
                <Rocket className="w-3 h-3 sm:w-4 sm:h-4" />
                אפליקציה חדשנית לתכנון שיתופי
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 leading-tight">
                Planora
                <span className="block text-white/90 text-lg sm:text-2xl md:text-3xl mt-2 font-normal">
                  לתכנן הכל יחד עם חברים
                </span>
              </h1>
              <p className="text-base sm:text-xl text-white/90 mb-6 sm:mb-8 leading-relaxed px-2">
                פלטפורמה מתקדמת לתכנון אירועים שיתופי - מיציאה לסרט ועד חתונות.
                משימות, צ'אטים, הצבעות וגלריות במקום אחד.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
                <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 bg-black text-white px-6 py-3 rounded-xl hover:bg-gray-900 transition-colors">
                  <Apple className="w-5 h-5" />
                  App Store
                </a>
                <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 bg-white text-gray-900 px-6 py-3 rounded-xl hover:bg-gray-100 transition-colors">
                  <Play className="w-5 h-5" />
                  Google Play
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Problem & Solution */}
        <section className="py-12 sm:py-20 px-4 sm:px-6 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <div className="grid sm:grid-cols-2 gap-4 sm:gap-8">
              <Card className="p-5 sm:p-8 border-red-200 bg-red-50">
                <h3 className="text-lg sm:text-xl font-bold text-red-700 mb-3 sm:mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 sm:w-6 sm:h-6" />
                  הבעיה
                </h3>
                <ul className="space-y-2 sm:space-y-3 text-gray-700 text-sm sm:text-base">
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">✗</span>
                    תכנון אירועים מפוזר בין וואטסאפ, אקסל והודעות
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">✗</span>
                    קשה לעקוב אחרי מי עושה מה ומתי
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">✗</span>
                    החלטות קבוצתיות לוקחות זמן רב
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">✗</span>
                    תמונות מהאירוע מפוזרות בכל מקום
                  </li>
                </ul>
              </Card>

              <Card className="p-5 sm:p-8 border-green-200 bg-green-50">
                <h3 className="text-lg sm:text-xl font-bold text-green-700 mb-3 sm:mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
                  הפתרון
                </h3>
                <ul className="space-y-2 sm:space-y-3 text-gray-700 text-sm sm:text-base">
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✓</span>
                    פלטפורמה אחת לכל התכנון והתקשורת
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✓</span>
                    משימות משותפות עם מעקב בזמן אמת
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✓</span>
                    סקרים חכמים להחלטות מהירות
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✓</span>
                    גלריה משותפת לכל הזיכרונות
                  </li>
                </ul>
              </Card>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-12 sm:py-20 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10 sm:mb-16">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
                תכונות מרכזיות
              </h2>
              <p className="text-gray-600 text-sm sm:text-lg max-w-2xl mx-auto px-2">
                כל מה שצריך לתכנון אירוע מושלם - בממשק אחד פשוט ונוח
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-6">
              <FeatureCard icon={CheckSquare} title="משימות משותפות" description="חלוקת משימות עם מעקב בזמן אמת" color="blue" />
              <FeatureCard icon={BarChart2} title="סקרים והצבעות" description="החלטות קבוצתיות מהירות" color="green" />
              <FeatureCard icon={MessageSquare} title="צ'אט קבוצתי" description="תקשורת מרוכזת לכל המשתתפים" color="purple" />
              <FeatureCard icon={Camera} title="גלריה משותפת" description="כל התמונות במקום אחד" color="pink" />
              <FeatureCard icon={Sparkles} title="תכנון עם AI" description="יצירת אירוע בעזרת AI" color="orange" />
              <FeatureCard icon={Users} title="הזמנות קלות" description="שיתוף בוואטסאפ ו-SMS" color="teal" />
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <section className="py-12 sm:py-20 px-4 sm:px-6 bg-gradient-to-br from-orange-50 to-pink-50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8 sm:mb-16">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
                מתאים לכל סוג אירוע
              </h2>
            </div>

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
                <Card key={i} className="p-2 sm:p-4 text-center hover:shadow-lg transition-shadow border-0 bg-white">
                  <span className="text-2xl sm:text-4xl mb-1 sm:mb-2 block">{item.emoji}</span>
                  <span className="text-gray-700 font-medium text-xs sm:text-sm">{item.label}</span>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="py-12 sm:py-20 px-4 sm:px-6 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8 sm:mb-16">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
                הצוות
              </h2>
            </div>

            <div className="flex justify-center">
              <Card className="p-6 sm:p-8 text-center w-full max-w-xs sm:max-w-sm">
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-orange-100 rounded-full mx-auto mb-3 sm:mb-4 flex items-center justify-center">
                  <Users className="w-10 h-10 sm:w-12 sm:h-12 text-orange-500" />
                </div>
                <h3 className="font-bold text-gray-900 text-lg sm:text-xl mb-1 sm:mb-2">מנגשה אטלאי</h3>
                <p className="text-gray-600 text-sm sm:text-base">מייסד</p>
                <p className="text-gray-500 text-xs sm:text-sm mt-1">מנהל פרויקטים ומערכות מידע | 5 שנות ניסיון</p>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-12 sm:py-20 px-4 sm:px-6 bg-gradient-to-r from-orange-500 to-rose-500 text-white">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6">
              מעוניינים לשמוע עוד?
            </h2>
            <p className="text-base sm:text-xl text-white/90 mb-6 sm:mb-8 px-2">
              נשמח לספר לכם עוד על החזון והתוכניות שלנו
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
              <a 
                href="https://plan-ora.net"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white text-orange-600 px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg hover:bg-gray-100 transition-colors"
              >
                בקר באתר
              </a>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-900 text-white py-6 sm:py-8 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <span className="font-bold text-sm sm:text-base">Planora</span>
            </div>
            <p className="text-gray-400 text-xs sm:text-sm">
              © 2025 Planora. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
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
    <Card className="p-3 sm:p-6 border-0 shadow-md hover:shadow-xl transition-all hover:-translate-y-1">
      <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-xl ${colors[color]} flex items-center justify-center mb-2 sm:mb-4`}>
        <Icon className="w-5 h-5 sm:w-7 sm:h-7" />
      </div>
      <h3 className="text-sm sm:text-xl font-bold text-gray-900 mb-1 sm:mb-2">{title}</h3>
      <p className="text-gray-600 text-xs sm:text-base leading-snug">{description}</p>
    </Card>
  );
}
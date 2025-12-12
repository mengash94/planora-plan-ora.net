import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Calendar, 
  CheckSquare, 
  MessageCircle, 
  Users, 
  BarChart3, 
  Image, 
  FileText, 
  Clock,
  Sparkles,
  ArrowLeft,
  Shield,
  Zap
} from 'lucide-react';
import SEOHead from '@/components/SEOHead';

export default function LandingPage() {
  const navigate = useNavigate();

  const features = [
    {
      icon: Calendar,
      title: 'ניהול אירועים',
      description: 'צור ונהל אירועים בקלות עם כל הפרטים במקום אחד',
      color: 'text-blue-500',
      bgColor: 'bg-blue-100'
    },
    {
      icon: CheckSquare,
      title: 'משימות משותפות',
      description: 'חלק משימות בין המשתתפים ועקוב אחר ההתקדמות',
      color: 'text-green-500',
      bgColor: 'bg-green-100'
    },
    {
      icon: MessageCircle,
      title: 'צ\'אט קבוצתי',
      description: 'תקשורת ישירה עם כל המשתתפים באירוע',
      color: 'text-purple-500',
      bgColor: 'bg-purple-100'
    },
    {
      icon: BarChart3,
      title: 'סקרים והצבעות',
      description: 'קבלו החלטות יחד על תאריכים, מקומות ועוד',
      color: 'text-orange-500',
      bgColor: 'bg-orange-100'
    },
    {
      icon: Image,
      title: 'גלריית תמונות',
      description: 'שתפו תמונות מהאירוע עם כל המשתתפים',
      color: 'text-pink-500',
      bgColor: 'bg-pink-100'
    },
    {
      icon: FileText,
      title: 'מסמכים וקבצים',
      description: 'העלו ושתפו מסמכים חשובים לאירוע',
      color: 'text-teal-500',
      bgColor: 'bg-teal-100'
    }
  ];

  const benefits = [
    {
      icon: Zap,
      title: 'מהיר וקל',
      description: 'צור אירוע תוך שניות עם AI או תבניות מוכנות'
    },
    {
      icon: Users,
      title: 'שיתוף פעולה',
      description: 'עבודה משותפת עם כל המארגנים והמשתתפים'
    },
    {
      icon: Shield,
      title: 'מאובטח',
      description: 'הנתונים שלך מוגנים ונשמרים בענן'
    },
    {
      icon: Clock,
      title: 'תזכורות',
      description: 'קבל התראות על משימות ואירועים קרובים'
    }
  ];

  const handleGetStarted = () => {
    navigate(createPageUrl('WelcomePage'));
  };

  return (
    <div className="min-h-screen bg-white" style={{ direction: 'rtl' }}>
      <SEOHead 
        title="Planora - תכנון אירועים חכם | ניהול אירועים, משימות וצ'אטים"
        description="Planora היא הפלטפורמה המובילה לתכנון אירועים בישראל. נהל משימות, צ'אטים, סקרים, גלריות ועוד - הכל באפליקציה אחת חינמית. התחל לתכנן עכשיו!"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "Planora",
          "applicationCategory": "LifestyleApplication",
          "operatingSystem": "Web, Android, iOS",
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "ILS"
          },
          "description": "אפליקציה לתכנון אירועים עם משימות, צ'אטים, סקרים וגלריות",
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.8",
            "ratingCount": "150"
          }
        }}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-orange-500 via-orange-400 to-rose-500 text-white">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative max-w-6xl mx-auto px-4 py-16 sm:py-24">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <img 
                src="/project/f78de3ce-0cab-4ccb-8442-0c574979fe8/assets/PlanoraLogo_512.png" 
                alt="Planora Logo" 
                className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl shadow-2xl"
              />
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
              תכנון אירועים חכם
            </h1>
            <p className="text-xl sm:text-2xl text-white/90 mb-8 max-w-3xl mx-auto">
              נהל את האירועים שלך במקום אחד - משימות, צ'אטים, סקרים, גלריות ועוד.
              <br />
              <span className="font-semibold">חינם לגמרי!</span>
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                onClick={handleGetStarted}
                className="bg-white text-orange-600 hover:bg-gray-100 text-lg px-8 py-6 rounded-xl shadow-xl"
              >
                <Sparkles className="w-5 h-5 ml-2" />
                התחל עכשיו - חינם
              </Button>
            </div>
          </div>
        </div>
        
        {/* Wave decoration */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="white"/>
          </svg>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              הכל מה שאתה צריך לאירוע מושלם
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Planora מספקת את כל הכלים לניהול אירועים מוצלחים - ממסיבות יום הולדת ועד חתונות
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-6">
                  <div className={`w-12 h-12 ${feature.bgColor} rounded-xl flex items-center justify-center mb-4`}>
                    <feature.icon className={`w-6 h-6 ${feature.color}`} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 sm:py-24 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              למה לבחור ב-Planora?
            </h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <div key={index} className="text-center p-6">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <benefit.icon className="w-8 h-8 text-orange-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{benefit.title}</h3>
                <p className="text-gray-600 text-sm">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-16 sm:py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              מתאים לכל סוג של אירוע
            </h2>
          </div>
          
          <div className="flex flex-wrap justify-center gap-3">
            {[
              '🎂 יום הולדת',
              '💒 חתונה',
              '🎉 מסיבה',
              '👔 אירוע עסקי',
              '⚽ פעילות ספורט',
              '✈️ טיול קבוצתי',
              '🎓 סיום לימודים',
              '🍽️ ארוחה משפחתית',
              '🎭 אירוע תרבות',
              '🤝 מפגש חברים'
            ].map((useCase, index) => (
              <span 
                key={index}
                className="px-4 py-2 bg-orange-50 text-orange-700 rounded-full text-sm font-medium"
              >
                {useCase}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-24 px-4 bg-gradient-to-br from-orange-500 to-rose-500 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            מוכנים להתחיל לתכנן?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            הצטרפו לאלפי משתמשים שכבר מתכננים אירועים עם Planora
          </p>
          <Button 
            size="lg" 
            onClick={handleGetStarted}
            className="bg-white text-orange-600 hover:bg-gray-100 text-lg px-8 py-6 rounded-xl shadow-xl"
          >
            צור אירוע ראשון
            <ArrowLeft className="w-5 h-5 mr-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-gray-900 text-gray-400">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex justify-center gap-6 mb-4">
            <a href={createPageUrl('Privacy')} className="hover:text-white transition-colors">מדיניות פרטיות</a>
            <a href={createPageUrl('Terms')} className="hover:text-white transition-colors">תנאי שימוש</a>
            <a href={createPageUrl('AccessibilityStatement')} className="hover:text-white transition-colors">נגישות</a>
          </div>
          <p className="text-sm">
            © {new Date().getFullYear()} Planora. כל הזכויות שמורות.
          </p>
        </div>
      </footer>
    </div>
  );
}
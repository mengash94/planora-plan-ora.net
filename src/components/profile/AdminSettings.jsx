import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import {
  Calendar,
  Users,
  Bell,
  Package,
  MessageSquare,
  FileText,
  ClipboardCheck,
  ChevronLeft,
  Shield,
  Megaphone,
  BarChart,
  Zap
} from 'lucide-react';

export default function AdminSettings() {
  const navigate = useNavigate();

  const adminSections = [
    {
      id: 'events',
      title: 'ניהול אירועים',
      description: 'הגדרות ותצורה עבור אירועים באפליקציה',
      icon: Calendar,
      color: 'from-orange-500 to-pink-500',
      items: [
        {
          label: 'קטגוריות RSVP',
          description: 'הגדר קטגוריות שמציגות את טאב אישורי ההגעה',
          action: 'rsvp-categories',
          icon: ClipboardCheck
        },
        {
          label: 'ניהול תבניות',
          description: 'צור וערוך תבניות לאירועים',
          page: 'AdminTemplatesManage',
          icon: FileText
        }
      ]
    },
    {
      id: 'users',
      title: 'ניהול משתמשים',
      description: 'צפייה וניהול משתמשי המערכת',
      icon: Users,
      color: 'from-blue-500 to-cyan-500',
      items: [
        {
          label: 'רשימת משתמשים',
          description: 'צפה, ערוך ונהל משתמשים',
          page: 'AdminUsers',
          icon: Users
        },
        {
          label: 'לוח בקרה מתקדם',
          description: 'סטטיסטיקות ואנליטיקס מפורטים',
          page: 'AdminDashboard',
          icon: BarChart
        }
      ]
    },
    {
      id: 'communication',
      title: 'תקשורת והודעות',
      description: 'שלח הודעות והתראות למשתמשים',
      icon: Bell,
      color: 'from-purple-500 to-indigo-500',
      items: [
        {
          label: 'הודעות מערכת',
          description: 'צור באנרים והודעות לכל המשתמשים',
          page: 'AdminSystemMessages',
          icon: Megaphone
        },
        {
          label: 'שליחה מהירה',
          description: 'שלח התראת Push לכל המשתמשים',
          action: 'quick-broadcast',
          icon: Zap
        }
      ]
    },
    {
      id: 'updates',
      title: 'עדכוני גרסאות',
      description: 'תעד שינויים ושלח עדכונים למשתמשים',
      icon: Package,
      color: 'from-green-500 to-emerald-500',
      items: [
        {
          label: 'ניהול גרסאות',
          description: 'תעד פיצ\'רים, שיפורים ותיקוני באגים',
          page: 'AdminVersions',
          icon: Package
        },
        {
          label: 'דף "מה חדש"',
          description: 'צפה איך המשתמשים רואים את העדכונים',
          page: 'WhatsNew',
          icon: FileText
        }
      ]
    },
    {
      id: 'feedback',
      title: 'משובים ותמיכה',
      description: 'צפה ונהל משובי משתמשים',
      icon: MessageSquare,
      color: 'from-pink-500 to-rose-500',
      items: [
        {
          label: 'ניהול משובים',
          description: 'ראה ותמוך במשובי משתמשים',
          action: 'manage-feedback',
          icon: MessageSquare
        }
      ]
    }
  ];

  const handleItemClick = (item) => {
    if (item.page) {
      navigate(createPageUrl(item.page));
    } else if (item.action) {
      // Dispatch event to parent
      window.dispatchEvent(new CustomEvent('admin-action', { detail: { action: item.action } }));
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 px-1">
      {/* Header - responsive */}
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">הגדרות מנהל</h2>
          <p className="text-xs sm:text-sm text-gray-500">כלי ניהול מתקדמים למערכת</p>
        </div>
      </div>

      <div className="space-y-6 sm:space-y-8">
        {adminSections.map((section) => {
          const SectionIcon = section.icon;
          
          return (
            <div key={section.id}>
              {/* Section Header - responsive */}
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br ${section.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <SectionIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 truncate">{section.title}</h3>
                  <p className="text-[10px] sm:text-xs text-gray-500 line-clamp-1">{section.description}</p>
                </div>
              </div>

              {/* Items Grid - single column on mobile, 2 on desktop */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                {section.items.map((item, index) => {
                  const ItemIcon = item.icon;
                  
                  return (
                    <Card
                      key={index}
                      className="hover:shadow-lg active:scale-[0.98] transition-all cursor-pointer group border-r-4 border-r-transparent hover:border-r-orange-500"
                      onClick={() => handleItemClick(item)}
                    >
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gray-100 group-hover:bg-orange-100 rounded-lg flex items-center justify-center transition-colors flex-shrink-0">
                            <ItemIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 group-hover:text-orange-600 transition-colors" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">{item.label}</p>
                            <p className="text-[10px] sm:text-xs text-gray-500 line-clamp-2">{item.description}</p>
                          </div>
                          <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 group-hover:text-orange-500 transition-colors flex-shrink-0" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Info Box - responsive */}
      <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-purple-900 mb-1 sm:mb-2 text-sm sm:text-base">💡 טיפ לניהול יעיל</h4>
              <p className="text-xs sm:text-sm text-purple-800 leading-relaxed">
                השתמש בהודעות מערכת לעדכונים חשובים, בניהול גרסאות לתיעוד שינויים, 
                ובלוח הבקרה לניתוח התנהגות המשתמשים.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
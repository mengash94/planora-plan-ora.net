import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { ArrowRight, Calendar, Bot, Sparkles, ClipboardList, Star, Users, Briefcase } from 'lucide-react';
import EventTemplateSelector from '@/components/event/EventTemplateSelector';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import toast from 'react-hot-toast';
import {
  notifyAdminsNewEvent,
} from '@/components/instabackService';

// Event type configurations for styling and content
const EVENT_TYPE_CONFIG = {
  production: {
    title: 'יצירת אירוע הפקה',
    subtitle: 'חתונה, בר מצווה, כנס או אירוע עסקי',
    bgGradient: 'from-amber-50 via-white to-orange-50',
    accentColor: 'orange',
    borderColor: 'border-orange-400',
    ai: {
      title: 'תכנון עם AI',
      description: 'העוזר החכם שלנו יעזור לך לתכנן את כל הפרטים - ספקים, תקציב, לוח זמנים ומשימות מקצועיות.',
      badge: 'מומלץ למפיקים!',
      gradient: 'from-orange-500 to-amber-500',
      hoverBorder: 'hover:border-orange-500'
    },
    template: {
      title: 'תבניות הפקה',
      description: 'חתונה, בר מצווה, כנס מקצועי - תבניות מוכנות עם רשימות ספקים ומשימות הפקה.',
      badge: 'התחל מוכן!',
      gradient: 'from-amber-500 to-yellow-500',
      hoverBorder: 'hover:border-amber-500',
      headerGradient: 'from-amber-500 to-orange-500'
    },
    manual: {
      title: 'יצירה מותאמת',
      description: 'בנה את האירוע שלך מאפס - הגדר תקציב, ספקים, אישורי הגעה ולוח זמנים מדויק.',
      badge: 'שליטה מלאה!',
      gradient: 'from-orange-600 to-red-500',
      hoverBorder: 'hover:border-orange-600'
    }
  },
  social: {
    title: 'יצירת מפגש חברתי',
    subtitle: 'יציאה לסרט, ארוחה, טיול או בילוי עם חברים',
    bgGradient: 'from-blue-50 via-white to-purple-50',
    accentColor: 'blue',
    borderColor: 'border-blue-400',
    ai: {
      title: 'תכנון עם AI',
      description: 'ספר לעוזר החכם מה בא לך לעשות והוא יעזור לארגן את המפגש המושלם עם החברים!',
      badge: 'הכי קל!',
      gradient: 'from-blue-500 to-purple-500',
      hoverBorder: 'hover:border-blue-500'
    },
    template: {
      title: 'תבניות מוכנות',
      description: 'סרט, פיצה, טיול, אימון - בחר תבנית ותתחיל לתאם עם החברים תוך שניות!',
      badge: 'מהיר וקל!',
      gradient: 'from-purple-500 to-pink-500',
      hoverBorder: 'hover:border-purple-500',
      headerGradient: 'from-purple-500 to-blue-500'
    },
    manual: {
      title: 'יצירה חופשית',
      description: 'צור מפגש מאפס - הוסף סקר לתאריך ומקום, משימות קלילות וצ\'אט קבוצתי.',
      badge: 'גמישות מלאה!',
      gradient: 'from-teal-500 to-cyan-500',
      hoverBorder: 'hover:border-teal-500'
    }
  }
};

export default function CreateEvent() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState(null);
  const [selectedEventType, setSelectedEventType] = useState(null);

  // Scroll to top on mount
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Scroll to top on mount
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleEventCreated = async (eventResult) => {
    console.log('🎉 Event result received:', eventResult);

    try {
      // If template is selected - navigate to CreateEventManual without creating an event here
      if (eventResult && (eventResult.templateId || eventResult.type === 'template')) {
        console.log('📋 Template selected, navigating to manual creation');
        setMode(null);

        toast.success('תבנית נבחרה בהצלחה! 🎯', {
          description: 'עכשיו תוכלו להתאים את פרטי האירוע'
        });

        navigate(createPageUrl('CreateEventManual'), {
          state: {
            templateData: {
              title: eventResult.title || '',
              description: eventResult.description || '',
              category: eventResult.category || '',
              coverImageUrl: eventResult.coverImageUrl || '',
              defaultTasks: eventResult.defaultTasks || [],
              defaultItinerary: eventResult.defaultItinerary || [],
              canBePublic: eventResult.canBePublic ?? true,
              templateId: eventResult.templateId,
              eventType: selectedEventType || 'social'
            },
            fromTemplate: true
          }
        });
        return;
      }

      if (!eventResult || !eventResult.id) {
        console.error('❌ No event ID received or invalid eventResult:', eventResult);
        toast.error('התרחשה שגיאה ביצירת האירוע.');
        return;
      }

      console.log('✅ Event created successfully with ID:', eventResult.id);

      setMode(null);

      try {
        const creatorName = user?.name ||
                           user?.full_name ||
                           `${user?.firstName || ''} ${user?.lastName || ''}`.trim() ||
                           user?.email ||
                           'משתמש';

        console.log('[CreateEvent] Notifying admins with creator name:', creatorName);

        await notifyAdminsNewEvent({
          eventId: eventResult.id,
          eventTitle: eventResult.title,
          creatorId: user.id,
          creatorName: creatorName
        });
      } catch (notifyError) {
        console.warn('Failed to notify admins (from handleEventCreated):', notifyError);
      }

      await new Promise(resolve => setTimeout(resolve, 800));

      console.log('🚀 Navigating to event:', eventResult.id);
      navigate(createPageUrl(`EventDetail?id=${eventResult.id}&new=true`));

    } catch (error) {
      console.error('❌ Error in handleEventCreated:', error);
      toast.error('שגיאה בטיפול באירוע שנוצר', {
        description: error.message
      });
    }
  };

  const config = selectedEventType ? EVENT_TYPE_CONFIG[selectedEventType] : null;

  return (
    <div className={`min-h-screen bg-gradient-to-br ${selectedEventType ? config.bgGradient : 'from-orange-50 via-white to-pink-50'} dark:from-black dark:via-black dark:to-gray-900 pb-20`} style={{ direction: 'rtl' }}>
      <div className="max-w-6xl mx-auto px-3 py-3 sm:px-4 sm:py-6">
        {/* Compact Header */}
        <div className="flex items-center justify-between mb-2 sm:mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (selectedEventType && !mode) {
                setSelectedEventType(null);
              } else if (mode) {
                setMode(null);
              } else {
                navigate(createPageUrl('Home'));
              }
            }}
            className="flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-2"
          >
            <ArrowRight className="w-4 h-4" />
            <span className="text-sm">
              {selectedEventType && !mode ? 'חזור' : mode ? 'חזור' : 'חזרה'}
            </span>
          </Button>
          <div className="text-center">
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
              {!selectedEventType ? 'איזה סוג ארגון?' : config.title}
            </h1>
            {selectedEventType && !mode && (
              <p className="text-sm text-gray-500 mt-1">{config.subtitle}</p>
            )}
          </div>
          <div className="w-16"></div>
        </div>

        {!selectedEventType ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Production Event */}
            <button
              onClick={() => setSelectedEventType('production')}
              className="group relative overflow-hidden rounded-2xl border-2 border-gray-200 hover:border-orange-400 transition-all hover:shadow-xl bg-white"
            >
              <div className="aspect-[4/3] relative">
                <img
                  src="https://images.unsplash.com/photo-1519167758481-83f29da8c2b6?w=800&q=80"
                  alt="אירוע הפקה"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-0 right-0 left-0 p-6 text-white">
                  <div className="flex items-center gap-2 mb-2">
                    <Briefcase className="w-7 h-7" />
                    <h3 className="text-2xl font-bold">אירוע הפקה</h3>
                  </div>
                  <p className="text-white/90 text-sm leading-relaxed">
                    חתונות, בר/בת מצווה, כנסים - ניהול מקצועי עם תקציב, ספקים ואישורי הגעה
                  </p>
                </div>
              </div>
            </button>

            {/* Social Gathering */}
            <button
              onClick={() => setSelectedEventType('social')}
              className="group relative overflow-hidden rounded-2xl border-2 border-gray-200 hover:border-blue-400 transition-all hover:shadow-xl bg-white"
            >
              <div className="aspect-[4/3] relative">
                <img
                  src="https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=800&q=80"
                  alt="מפגש חברתי"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-0 right-0 left-0 p-6 text-white">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-7 h-7" />
                    <h3 className="text-2xl font-bold">מפגש חברתי</h3>
                  </div>
                  <p className="text-white/90 text-sm leading-relaxed">
                    סרט, ארוחה, טיול, מסיבה - תיאום קל ומהיר עם החברים
                  </p>
                </div>
              </div>
            </button>
          </div>
        ) : !mode ? (
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* AI Mode */}
            <Card
              className={`cursor-pointer hover:shadow-2xl transition-all duration-300 border-2 ${config.ai.hoverBorder} group`}
              onClick={() => navigate(createPageUrl(`CreateEventAI?eventType=${selectedEventType}`))}
            >
              <CardContent className="p-8 text-center">
                <div className="mb-6 relative">
                  <div className={`absolute inset-0 bg-gradient-to-br ${config.ai.gradient} rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity`}></div>
                  <div className={`relative bg-gradient-to-br ${config.ai.gradient} w-20 h-20 rounded-2xl flex items-center justify-center mx-auto transform group-hover:scale-110 transition-transform`}>
                    <Sparkles className="w-10 h-10 text-white" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold mb-3 text-gray-900">
                  {config.ai.title}
                </h3>
                <p className="text-gray-600 mb-4 leading-relaxed">
                  {config.ai.description}
                </p>
                <div className={`flex items-center justify-center gap-2 text-${config.accentColor}-600 font-semibold`}>
                  <span>{config.ai.badge}</span>
                  <Star className="w-5 h-5 fill-current" />
                </div>
              </CardContent>
            </Card>

            {/* Template Mode */}
            <Card
              className={`cursor-pointer hover:shadow-2xl transition-all duration-300 border-2 ${config.template.hoverBorder} group`}
              onClick={() => setMode('template')}
            >
              <CardContent className="p-8 text-center">
                <div className="mb-6 relative">
                  <div className={`absolute inset-0 bg-gradient-to-br ${config.template.gradient} rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity`}></div>
                  <div className={`relative bg-gradient-to-br ${config.template.gradient} w-20 h-20 rounded-2xl flex items-center justify-center mx-auto transform group-hover:scale-110 transition-transform`}>
                    <Calendar className="w-10 h-10 text-white" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold mb-3 text-gray-900">
                  {config.template.title}
                </h3>
                <p className="text-gray-600 mb-4 leading-relaxed">
                  {config.template.description}
                </p>
                <div className={`flex items-center justify-center gap-2 text-${config.accentColor}-600 font-semibold`}>
                  <span>{config.template.badge}</span>
                  <ClipboardList className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            {/* Manual Mode */}
            <Card
              className={`cursor-pointer hover:shadow-2xl transition-all duration-300 border-2 ${config.manual.hoverBorder} group`}
              onClick={() => navigate(createPageUrl(`CreateEventManual?mode=custom&eventType=${selectedEventType}`))}
            >
              <CardContent className="p-8 text-center">
                <div className="mb-6 relative">
                  <div className={`absolute inset-0 bg-gradient-to-br ${config.manual.gradient} rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity`}></div>
                  <div className={`relative bg-gradient-to-br ${config.manual.gradient} w-20 h-20 rounded-2xl flex items-center justify-center mx-auto transform group-hover:scale-110 transition-transform`}>
                    <ClipboardList className="w-10 h-10 text-white" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold mb-3 text-gray-900">
                  {config.manual.title}
                </h3>
                <p className="text-gray-600 mb-4 leading-relaxed">
                  {config.manual.description}
                </p>
                <div className={`flex items-center justify-center gap-2 text-${config.accentColor}-600 font-semibold`}>
                  <span>{config.manual.badge}</span>
                  <Bot className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {/* Template Selector Mode */}
        {mode === 'template' && config && (
          <Card className={`max-w-5xl mx-auto shadow-2xl border-2 ${config.borderColor} mt-8`}>
            <CardHeader className={`bg-gradient-to-r ${config.template.headerGradient} text-white`}>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <Calendar className="w-7 h-7" />
                  <span>
                    {selectedEventType === 'production' ? 'בחר תבנית הפקה' : 'בחר תבנית'}
                  </span>
                </CardTitle>
                <Button
                  variant="ghost"
                  onClick={() => setMode(null)}
                  className="text-white hover:bg-white/20 p-2"
                >
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 h-[600px] overflow-y-auto">
              <EventTemplateSelector onTemplateSelected={handleEventCreated} eventType={selectedEventType} />
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}
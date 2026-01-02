import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { ArrowRight, Calendar, Bot, Sparkles, ClipboardList, Star } from 'lucide-react';
import EventTemplateSelector from '@/components/event/EventTemplateSelector';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import toast from 'react-hot-toast';
import {
  notifyAdminsNewEvent,
} from '@/components/instabackService';

export default function CreateEvent() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState(null);

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
              eventType: 'social'
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-pink-50 pb-20" style={{ direction: 'rtl' }}>
      <div className="max-w-6xl mx-auto px-3 py-3 sm:px-4 sm:py-6">
        {/* Compact Header */}
        <div className="flex items-center justify-between mb-2 sm:mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (mode) {
                setMode(null);
              } else {
                navigate(createPageUrl('Home'));
              }
            }}
            className="flex items-center gap-1 text-gray-600 hover:text-gray-900 px-2"
          >
            <ArrowRight className="w-4 h-4" />
            <span className="text-sm">
              {mode ? 'חזור' : 'חזרה'}
            </span>
          </Button>
          <div className="text-center">
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900">
              יצירת ארגון חדש
            </h1>
            {!mode && (
              <p className="text-sm text-gray-500 mt-1">בחר איך תרצה להתחיל</p>
            )}
          </div>
          <div className="w-16"></div>
        </div>

        {!mode ? (
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* AI Mode */}
            <Card
              className="cursor-pointer hover:shadow-2xl transition-all duration-300 border-2 hover:border-orange-500 group"
              onClick={() => navigate(createPageUrl('CreateEventAI'))}
            >
              <CardContent className="p-8 text-center">
                <div className="mb-6 relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-pink-500 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
                  <div className="relative bg-gradient-to-br from-orange-500 to-pink-500 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto transform group-hover:scale-110 transition-transform">
                    <Sparkles className="w-10 h-10 text-white" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold mb-3 text-gray-900">
                  תכנון עם AI
                </h3>
                <p className="text-gray-600 mb-4 leading-relaxed">
                  ספר לעוזר החכם מה בא לך לעשות והוא יעזור לארגן הכל בקלות!
                </p>
                <div className="flex items-center justify-center gap-2 text-orange-600 font-semibold">
                  <span>הכי קל!</span>
                  <Star className="w-5 h-5 fill-current" />
                </div>
              </CardContent>
            </Card>

            {/* Template Mode */}
            <Card
              className="cursor-pointer hover:shadow-2xl transition-all duration-300 border-2 hover:border-purple-500 group"
              onClick={() => setMode('template')}
            >
              <CardContent className="p-8 text-center">
                <div className="mb-6 relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
                  <div className="relative bg-gradient-to-br from-purple-500 to-pink-500 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto transform group-hover:scale-110 transition-transform">
                    <Calendar className="w-10 h-10 text-white" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold mb-3 text-gray-900">
                  תבניות מוכנות
                </h3>
                <p className="text-gray-600 mb-4 leading-relaxed">
                  סרט, פיצה, טיול, אימון - בחר תבנית ותתחיל לתאם תוך שניות!
                </p>
                <div className="flex items-center justify-center gap-2 text-purple-600 font-semibold">
                  <span>מהיר וקל!</span>
                  <ClipboardList className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            {/* Manual Mode */}
            <Card
              className="cursor-pointer hover:shadow-2xl transition-all duration-300 border-2 hover:border-teal-500 group"
              onClick={() => navigate(createPageUrl('CreateEventManual?mode=custom'))}
            >
              <CardContent className="p-8 text-center">
                <div className="mb-6 relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
                  <div className="relative bg-gradient-to-br from-teal-500 to-cyan-500 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto transform group-hover:scale-110 transition-transform">
                    <ClipboardList className="w-10 h-10 text-white" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold mb-3 text-gray-900">
                  יצירה חופשית
                </h3>
                <p className="text-gray-600 mb-4 leading-relaxed">
                  צור מאפס - הוסף סקר לתאריך ומקום, משימות וצ'אט קבוצתי.
                </p>
                <div className="flex items-center justify-center gap-2 text-teal-600 font-semibold">
                  <span>גמישות מלאה!</span>
                  <Bot className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {/* Template Selector Mode */}
        {mode === 'template' && (
          <Card className="max-w-5xl mx-auto shadow-2xl border-2 border-purple-400 mt-8">
            <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <Calendar className="w-7 h-7" />
                  <span>בחר תבנית</span>
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
              <EventTemplateSelector onTemplateSelected={handleEventCreated} />
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}
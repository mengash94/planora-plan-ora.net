import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, CheckCircle2, Calendar, MapPin, PartyPopper } from 'lucide-react';
import SmartEventChat from '@/components/ai/SmartEventChat';
import { useAuth } from '@/components/AuthProvider';
import { toast } from 'sonner';
import { notifyAdminsNewEvent } from '@/components/instabackService';
import { base44 } from '@/api/base44Client';

export default function CreateEventAI() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isNavigating, setIsNavigating] = useState(false);
  const [createdEvent, setCreatedEvent] = useState(null);

  // Scroll to top on mount
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleEventCreated = async (eventResult) => {
    console.log('🎉 Event result received:', eventResult);

    try {
      if (!eventResult || !eventResult.id) {
        console.error('❌ No event ID received or invalid eventResult:', eventResult);
        toast.error('התרחשה שגיאה ביצירת האירוע.');
        return;
      }

      console.log('✅ Event created successfully with ID:', eventResult.id);
      setCreatedEvent(eventResult);
      setIsNavigating(true);

      try {
        const creatorName = user?.name ||
                           user?.full_name ||
                           `${user?.firstName || ''} ${user?.lastName || ''}`.trim() ||
                           user?.email ||
                           'משתמש';

        console.log('[CreateEventAI] Notifying admins with creator name:', creatorName);

        await notifyAdminsNewEvent({
          eventId: eventResult.id,
          eventTitle: eventResult.title,
          creatorId: user.id,
          creatorName: creatorName
        });
      } catch (notifyError) {
        console.warn('Failed to notify admins:', notifyError);
      }

      // Track analytics event - AI creation
      try {
        await base44.functions.invoke('trackAnalyticsEvent', {
          eventType: 'event_created_ai',
          metadata: {
            eventId: eventResult.id,
            eventTitle: eventResult.title
          }
        });
      } catch (analyticsError) {
        console.warn('[CreateEventAI] Failed to track analytics:', analyticsError);
      }

      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log('🚀 Navigating to event:', eventResult.id);
      navigate(createPageUrl(`EventDetail?id=${eventResult.id}&new=true`));

    } catch (error) {
      console.error('❌ Error in handleEventCreated:', error);
      toast.error('שגיאה בטיפול באירוע שנוצר', {
        description: error.message
      });
      setIsNavigating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-pink-50 flex flex-col" style={{ direction: 'rtl' }}>
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-pink-500 text-white px-4 py-4 flex-shrink-0 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-7 h-7" />
            <h1 className="text-2xl font-bold">יצירת אירוע עם AI</h1>
          </div>
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl('CreateEvent'))}
            className="text-white hover:bg-white/20 rounded-full"
          >
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Success Screen - shown while navigating */}
      {isNavigating && createdEvent && (
        <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-white to-emerald-50 z-50 flex items-center justify-center">
          <div className="text-center space-y-6 px-8 max-w-md">
            {/* Success Animation */}
            <div className="relative w-32 h-32 mx-auto">
              <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full opacity-20 animate-ping"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                <PartyPopper className="w-16 h-16 text-white animate-bounce" />
              </div>
            </div>

            {/* Success Message */}
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
                <h2 className="text-2xl font-bold text-gray-900">האירוע נוצר בהצלחה!</h2>
              </div>
              
              <div className="bg-white rounded-xl p-4 shadow-sm border border-green-100 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-orange-500" />
                  <p className="font-semibold text-gray-900">{createdEvent.title}</p>
                </div>
                
                {createdEvent.location && (
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <MapPin className="w-3.5 h-3.5 text-blue-500" />
                    <p>{createdEvent.location}</p>
                  </div>
                )}
              </div>

              <p className="text-sm text-gray-600 animate-pulse">
                מעביר אותך לאירוע...
              </p>
            </div>

            {/* Loading dots */}
            <div className="flex justify-center gap-2">
              <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-bounce"></div>
              <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
              <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            </div>
          </div>
        </div>
      )}

      {/* Chat Area - Full Height */}
      <div className="flex-1 overflow-hidden">
        <SmartEventChat
          onEventCreated={handleEventCreated}
          currentUser={user}
        />
      </div>
    </div>
  );
}
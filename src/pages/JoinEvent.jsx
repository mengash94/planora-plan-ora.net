import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/components/AuthProvider';
import { getEventDetails, getUserById, joinEvent as joinEventService, getEventMembers, createNotificationAndSendPush } from '@/components/instabackService';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Calendar, MapPin, PartyPopper, AlertCircle, Users, UserCheck, Sparkles, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import PaymentButton from '@/components/event/PaymentButton';

export default function JoinEventPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get('id')?.trim();
  
  const { user, isAuthenticated, login, isLoading: isAuthLoading } = useAuth();
  const [event, setEvent] = useState(null);
  const [ownerName, setOwnerName] = useState('מארגן האירוע');
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isAuthenticated && user && !eventId) {
      const pendingEventId = localStorage.getItem('pendingEventJoin');
      if (pendingEventId) {
        localStorage.removeItem('pendingEventJoin');
        navigate(createPageUrl(`JoinEvent?id=${pendingEventId}`));
      }
    }
  }, [isAuthenticated, user, navigate, eventId]);

  const loadEventData = useCallback(async () => {
    if (!eventId) {
      setError('לא נמצא מזהה אירוע בקישור');
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('[JoinEvent] Loading event data for:', eventId);
      
      const eventDetails = await getEventDetails(eventId);
      console.log('[JoinEvent] Event details:', eventDetails);
      
      if (!eventDetails || !eventDetails.title) {
        console.warn('[JoinEvent] Event not found or invalid details');
        
        // Clean invalid event from localStorage
        if (typeof window !== 'undefined') {
            try {
                // Remove from single pending
                const singlePending = localStorage.getItem('pendingEventJoin');
                if (singlePending === eventId) {
                    localStorage.removeItem('pendingEventJoin');
                    console.log('[JoinEvent] Removed invalid event from pendingEventJoin');
                }
                
                // Remove from pending array
                const storedPendingJoins = JSON.parse(localStorage.getItem('pendingEventJoins') || '[]');
                const updatedPendingJoins = storedPendingJoins.filter(id => id !== eventId);
                localStorage.setItem('pendingEventJoins', JSON.stringify(updatedPendingJoins));
                console.log('[JoinEvent] Cleaned invalid event from pendingEventJoins');
            } catch (cleanErr) {
                console.warn('[JoinEvent] Error cleaning localStorage:', cleanErr);
            }
        }

        setError('האירוע לא נמצא או שהקישור לא תקין');
        setIsLoading(false);
        return;
      }

      setEvent(eventDetails);

      const ownerId = eventDetails.ownerId || eventDetails.owner_id || eventDetails._uid;
      console.log('[JoinEvent] Loading owner details for:', ownerId);
      
      if (ownerId) {
        try {
          const ownerDetails = await getUserById(ownerId);
          console.log('[JoinEvent] Owner details:', ownerDetails);
          
          if (ownerDetails) {
            const resolvedOwnerName = ownerDetails.name || 
                            ownerDetails.full_name ||
                            `${ownerDetails.firstName || ''} ${ownerDetails.lastName || ''}`.trim() ||
                            ownerDetails.username ||
                            ownerDetails.email ||
                            'מארגן האירוע';
            
            console.log('[JoinEvent] Resolved owner name:', resolvedOwnerName);
            setOwnerName(resolvedOwnerName);
          } else {
            console.warn('[JoinEvent] No owner details found');
            setOwnerName('מארגן האירוע');
          }
        } catch (ownerError) {
          console.error('[JoinEvent] Failed to load owner details:', ownerError);
          setOwnerName('מארגן האירוע');
        }
      } else {
        console.warn('[JoinEvent] No owner ID found in event');
        setOwnerName('מארגן האירוע');
      }

    } catch (err) {
      console.error('[JoinEvent] Error loading event:', err);
      
      // Handle 401 - token expired, need to refresh
      if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
        console.log('[JoinEvent] Token expired, redirecting to login...');
        // Save pending event
        if (typeof window !== 'undefined') {
          localStorage.setItem('pendingEventJoin', eventId);
        }
        // Redirect to auth to refresh session
        toast.error('נדרש להתחבר מחדש', {
          description: 'הפעלה תסתיים לאחר התחברות',
        });
        setTimeout(() => {
          navigate(createPageUrl('Auth?mode=login'));
        }, 1000);
        return;
      }
      
      if (err.message?.includes('404') || err.message?.includes('not found') || err.message?.includes('Event not found')) {
        setError('האירוע לא נמצא. יתכן שהקישור לא תקין או שהאירוע נמחק.');
      } else if (err.message?.includes('403')) {
        setError('אין הרשאה לצפות באירוע זה.');
      } else if (err.message?.includes('timeout') || err.message?.includes('נמשכה יותר מדי')) {
        setError('הטעינה נמשכה יותר מדי זמן. אנא רענן את הדף ונסה שוב.');
      } else if (err.message?.includes('network') || err.message?.includes('תקשורת') || err.message?.includes('Failed to fetch')) {
        setError('בעיית תקשורת. אנא בדוק את החיבור לאינטרנט ונסה שוב.');
      } else {
        setError('שגיאה בטעינת האירוע: ' + (err.message || 'שגיאה לא ידועה'));
      }
    } finally {
      setIsLoading(false);
    }
  }, [eventId, navigate]);

  useEffect(() => {
    loadEventData();
  }, [eventId, loadEventData]);

  const handleLogin = () => {
    if (eventId) {
      localStorage.setItem('pendingEventJoin', eventId);
      try {
        const arr = JSON.parse(localStorage.getItem('pendingEventJoins') || '[]');
        if (!arr.includes(eventId)) {
          arr.push(eventId);
          localStorage.setItem('pendingEventJoins', JSON.stringify(arr));
        }
      } catch (e) {
        console.error("Failed to update pendingEventJoins in localStorage:", e);
      }
    }
    navigate(createPageUrl('Auth?mode=register'));
  };

  const handleJoinEvent = useCallback(async () => {
    if (!user || !eventId) {
      toast.error('שגיאה: חסרים נתונים נדרשים להצטרפות');
      return;
    }
    
    setIsJoining(true);
    try {
      console.log('Attempting to join event:', eventId, 'for user:', user.id);
      
      await joinEventService(eventId, user.id);
      
      // Send notifications to all event members
      try {
        const members = await getEventMembers(eventId);
        const otherMembers = members.filter(m => String(m.id) !== String(user.id));
        
        const userName = user.name || user.full_name || user.email;
        
        for (const member of otherMembers) {
          try {
            await createNotificationAndSendPush({
              userId: String(member.id),
              type: 'member_joined',
              title: 'משתתף חדש הצטרף! 🎉',
              message: `${userName} הצטרף/ה לאירוע ${event.title}`,
              eventId: eventId,
              actionUrl: `https://register.plan-ora.net${createPageUrl(`EventDetail?id=${eventId}`)}`,
              priority: 'normal'
            });
          } catch (notifErr) {
            console.warn('Failed to send notification to member:', member.id, notifErr);
          }
        }
      } catch (notifError) {
        console.warn('Failed to send notifications:', notifError);
      }
      
      // Track analytics event - join
      try {
        const { trackAnalyticsEvent } = await import('@/functions/trackAnalyticsEvent');
        await trackAnalyticsEvent({
          eventType: 'event_joined',
          metadata: {
            eventId: eventId,
            eventTitle: event.title
          }
        });
      } catch (analyticsError) {
        console.warn('[JoinEvent] Failed to track analytics:', analyticsError);
      }

      localStorage.removeItem('pendingEventJoin');
      try {
        const arr = JSON.parse(localStorage.getItem('pendingEventJoins') || '[]');
        const updatedArr = arr.filter(id => id !== eventId);
        localStorage.setItem('pendingEventJoins', JSON.stringify(updatedArr));
      } catch (e) {
        console.error("Failed to update pendingEventJoins in localStorage after join:", e);
      }
      
      toast.success('הצטרפת בהצלחה לאירוע! 🎉', {
        description: 'עכשיו תוכל לראות את כל פרטי האירוע ולהשתתף',
        duration: 4000
      });
      
      setTimeout(() => {
        navigate(createPageUrl(`EventDetail?id=${eventId}&new=true`));
      }, 1500);
      
    } catch (err) {
      console.error('Error joining event:', err);
      
      let errorMessage = 'שגיאה בהצטרפות לאירוע';
      
      if (err.message?.includes('already a member') || err.message?.includes('כבר חבר')) {
        localStorage.removeItem('pendingEventJoin');
        try {
          const arr = JSON.parse(localStorage.getItem('pendingEventJoins') || '[]');
          const updatedArr = arr.filter(id => id !== eventId);
          localStorage.setItem('pendingEventJoins', JSON.stringify(updatedArr));
        } catch (e) {
          console.error("Failed to update pendingEventJoins in localStorage after already member:", e);
        }

        toast.success('אתה כבר חבר באירוע זה! 🎉');
        navigate(createPageUrl(`EventDetail?id=${eventId}`));
        return;
      } else if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
        errorMessage = 'יש להתחבר כדי להצטרף לאירוע';
      } else if (err.message?.includes('404') || err.message?.includes('not found')) {
        errorMessage = 'האירוע לא נמצא';
      }
      
      toast.error(errorMessage, {
        description: err.message || 'אנא נסה שוב',
        duration: 4000
      });
    } finally {
      setIsJoining(false);
    }
  }, [user, eventId, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-rose-50 flex items-center justify-center p-4" style={{ direction: 'rtl' }}>
      {isLoading || isAuthLoading ? (
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-12 h-12 text-orange-500 animate-spin mb-4" />
            <p className="text-gray-600 text-center">טוען פרטי האירוע...</p>
            <p className="text-gray-400 text-sm text-center mt-2">אנא המתן...</p>
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="w-full max-w-md border-red-200">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-red-800 mb-2 text-center">אירעה שגיאה</h3>
            <p className="text-red-600 text-center mb-6">{error}</p>
            <Button onClick={() => navigate(createPageUrl('Home'))} variant="outline" className="w-full">
              חזרה לעמוד הבית
            </Button>
          </CardContent>
        </Card>
      ) : event ? (
        <Card className="w-full max-w-md overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-rose-500 px-6 py-8 text-white">
            <div className="text-center">
              <PartyPopper className="w-16 h-16 mx-auto mb-4 animate-bounce" />
              <h1 className="text-2xl font-bold mb-2">הוזמנת לאירוע!</h1>
              <div className="w-12 h-1 bg-white/30 mx-auto rounded-full"></div>
            </div>
          </div>
          
          <CardContent className="p-6 space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{event.title}</h2>
              {event.description && (
                <p className="text-gray-600">{event.description}</p>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Users className="w-5 h-5 text-orange-500 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-500">מארגן</p>
                  <p className="font-semibold text-gray-900">{ownerName}</p>
                </div>
              </div>

              {(event.date || event.eventDate || event.event_date) && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Calendar className="w-5 h-5 text-orange-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-500">תאריך</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(event.date || event.eventDate || event.event_date).toLocaleDateString('he-IL', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              )}

              {/* Category for public events */}
              {event.category && (
                <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                  <span className="text-xl">
                    {event.category === 'party' && '🎉'}
                    {event.category === 'wedding' && '💒'}
                    {event.category === 'birthday' && '🎂'}
                    {event.category === 'business' && '💼'}
                    {event.category === 'sport' && '⚽'}
                    {event.category === 'culture' && '🎭'}
                    {event.category === 'music' && '🎵'}
                    {event.category === 'food' && '🍽️'}
                    {event.category === 'travel' && '✈️'}
                    {event.category === 'community' && '🤝'}
                    {!['party', 'wedding', 'birthday', 'business', 'sport', 'culture', 'music', 'food', 'travel', 'community'].includes(event.category) && '📋'}
                  </span>
                  <div>
                    <p className="text-sm text-purple-600">קטגוריה</p>
                    <p className="font-semibold text-purple-800 capitalize">{event.category}</p>
                  </div>
                </div>
              )}

              {event.location && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <MapPin className="w-5 h-5 text-orange-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-500">מקום</p>
                    <p className="font-semibold text-gray-900">{event.location}</p>
                  </div>
                </div>
              )}

              {/* Participation Cost Display */}
              {(event.participationCost || event.participation_cost) && Number(event.participationCost || event.participation_cost) > 0 && (
                <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-6 h-6 text-green-600 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-green-700 font-medium">עלות השתתפות</p>
                      <p className="text-2xl font-bold text-green-800">
                        ₪{Number(event.participationCost || event.participation_cost).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {isAuthenticated && (event.paymentMethod || event.payment_method) && (
                    <div className="mt-3 pt-3 border-t border-green-200">
                      <PaymentButton event={event} className="w-full" />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="pt-4 space-y-3">
              {!isAuthenticated ? (
                <div className="text-center space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <UserCheck className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                    <p className="text-sm text-blue-700">
                      כדי להצטרף לאירוע צריך להירשם למערכת
                    </p>
                  </div>
                  <Button onClick={handleLogin} className="w-full bg-orange-500 hover:bg-orange-600 h-12 text-lg">
                    הירשם כדי להצטרף
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={handleJoinEvent}
                  disabled={isJoining}
                  className="w-full bg-green-600 hover:bg-green-700 h-12 text-lg"
                >
                  {isJoining ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin ml-2" />
                      מצטרף לאירוע...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 ml-2" />
                      הצטרף לאירוע!
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
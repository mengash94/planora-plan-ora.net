import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/components/AuthProvider';
import { getEventDetails, createNotificationAndSendPush, getInviteLinkByCode, getEventMembers } from '@/components/instabackService';
import { isNativeCapacitor, openExternalUrl } from '@/components/shareHelper';

// Local createEventRSVP function
const createEventRSVP = async (rsvpData) => {
  const API_BASE_URL = 'https://instaback.ai/project/f78de3ce-0cab-4ccb-8442-0c5749792fe8/api';
  const token = typeof window !== 'undefined' ? localStorage.getItem('instaback_token') : null;
  
  const payload = {
    eventId: rsvpData.eventId,
    name: rsvpData.name,
    phone: rsvpData.phone || null,
    email: rsvpData.email || null,
    attendance: rsvpData.attendance,
    guestCount: rsvpData.guestCount || 1,
    notes: rsvpData.notes || null,
    userId: rsvpData.userId || null,
    submittedAt: new Date().toISOString()
  };

  const response = await fetch(`${API_BASE_URL}/EventRSVP`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      'accept': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('טבלת EventRSVP לא קיימת ב-InstaBack.');
    }
    const errorText = await response.text();
    throw new Error(`שגיאה בשמירת התשובה: ${errorText}`);
  }

  return response.json();
};

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  Loader2, Calendar, MapPin, PartyPopper, AlertCircle, Users, 
  Check, X, HelpCircle, Sparkles, UserPlus, Gift, MessageCircle,
  Star, Bell, CheckCircle2, Heart, Zap, Camera,
  Navigation, CalendarPlus, Map
  } from 'lucide-react';
import { toast } from 'sonner';

export default function EventRSVPPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const eventIdFromUrl = searchParams.get('id')?.trim();
  const inviteCode = searchParams.get('code')?.trim();
  
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [event, setEvent] = useState(null);
  const [organizerName, setOrganizerName] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [inviteLink, setInviteLink] = useState(null);
  const [eventId, setEventId] = useState(eventIdFromUrl);
  
  // Prevent infinite loop - load only once
  const hasLoadedRef = useRef(false);
  
  // Robust calculation of guest limit
  const maxGuestsLimit = React.useMemo(() => {
    // 1. Invite Link has highest priority
    if (inviteLink && inviteLink.maxGuests !== undefined && inviteLink.maxGuests !== null) {
      return Number(inviteLink.maxGuests);
    }

    // 2. URL Parameters
    // Try searchParams hook first
    let val = searchParams.get('max') || searchParams.get('limit');
    
    // Fallback to location.search (handles cases where hook might be stale or different router mode)
    if (!val) {
      const sp = new URLSearchParams(location.search);
      val = sp.get('max') || sp.get('limit');
    }

    if (val && !isNaN(Number(val)) && Number(val) > 0) {
      return Number(val);
    }

    return null;
  }, [inviteLink, searchParams, location.search]);
  
  // RSVP Form State
  const [rsvpData, setRsvpData] = useState({
    name: '',
    phone: '',
    attendance: '',
    guestCount: 1,
    notes: ''
    });

    console.log('[RSVP] Render - maxGuestsLimit:', maxGuestsLimit, 'guestCount:', rsvpData?.guestCount);

    // Handle invite code - fetch the link details and redirect to proper URL with eventId
  useEffect(() => {
    const loadInviteLink = async () => {
      if (inviteCode && !eventIdFromUrl) {
        try {
          console.log('[RSVP] Loading invite link for code:', inviteCode);
          const link = await getInviteLinkByCode(inviteCode);
          console.log('[RSVP] Got invite link:', link);
          
          if (link && link.eventId) {
            // Redirect to the same page but with id parameter (keeps the code for maxGuests)
            // FIX: Preserve all existing params (like max/limit) when redirecting
            const currentParams = new URLSearchParams(window.location.search);
            currentParams.set('id', link.eventId);
            currentParams.set('code', inviteCode);
            
            const newUrl = `${window.location.pathname}?${currentParams.toString()}`;
            console.log('[RSVP] Redirecting to:', newUrl);
            window.location.replace(newUrl);
            return;
          } else {
            setError('קישור ההזמנה לא נמצא או שאינו תקף');
            setIsLoading(false);
          }
        } catch (err) {
          console.error('[RSVP] Error loading invite link:', err);
          setError('שגיאה בטעינת קישור ההזמנה');
          setIsLoading(false);
        }
      }
    };
    loadInviteLink();
  }, [inviteCode, eventIdFromUrl]);

  // Load invite link data when we have both eventId and code
  useEffect(() => {
    const loadInviteLinkData = async () => {
      if (inviteCode && eventIdFromUrl && !inviteLink) {
        try {
          const link = await getInviteLinkByCode(inviteCode);
          if (link) {
            setInviteLink(link);
          }
        } catch (err) {
          console.warn('[RSVP] Could not load invite link data:', err);
        }
      }
    };
    loadInviteLinkData();
  }, [inviteCode, eventIdFromUrl, inviteLink]);

  // Clamp guest count once we know the limit
  useEffect(() => {
    const limit = maxGuestsLimit;
    if (limit !== null && limit > 0 && rsvpData.guestCount > limit) {
      console.log('[RSVP] Clamping guestCount from', rsvpData.guestCount, 'to', limit);
      setRsvpData(prev => ({ ...prev, guestCount: Math.max(1, limit) }));
    }
  }, [maxGuestsLimit, rsvpData.guestCount]);

  // Load event data only once
  useEffect(() => {
    if (hasLoadedRef.current || !eventId) {
      if (!eventId && !inviteCode) {
        setError('לא נמצא מזהה אירוע בקישור');
        setIsLoading(false);
      }
      return;
    }
    
    hasLoadedRef.current = true;
    
    const loadEventData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const eventDetails = await getEventDetails(eventId);
        
        if (!eventDetails || !eventDetails.title) {
          setError('האירוע לא נמצא או שהקישור לא תקין');
          setIsLoading(false);
          return;
        }

        setEvent(eventDetails);

        // Fetch organizer name from EventMembers
        try {
          const members = await getEventMembers(eventId);
          console.log('[RSVP] Event members:', members);
          const organizer = members.find(m => m.role === 'organizer');
          console.log('[RSVP] Found organizer:', organizer);
          if (organizer) {
            // The name could be in different fields
            const name = organizer.name || organizer.full_name || organizer.userName;
            if (name && !name.includes('@')) {
              // Only use if it's not an email
              setOrganizerName(name);
            }
          }
        } catch (memberError) {
          console.warn('[RSVP] Failed to load organizer:', memberError);
        }

        } catch (err) {
        console.error('[RSVP] Error loading event:', err);
        setError('שגיאה בטעינת האירוע');
      } finally {
        setIsLoading(false);
      }
    };

    loadEventData();
  }, [eventId]);

  // Pre-fill name if user is authenticated
  useEffect(() => {
    if (isAuthenticated && user && !rsvpData.name) {
      setRsvpData(prev => ({
        ...prev,
        name: user.name || user.full_name || prev.name,
        phone: user.phone || prev.phone
      }));
    }
  }, [isAuthenticated, user, rsvpData.name]);

  const handleSubmitRSVP = async () => {
    if (!rsvpData.name.trim()) {
      toast.error('נא להזין שם');
      return;
    }
    if (!rsvpData.attendance) {
          toast.error('נא לבחור האם מגיעים');
          return;
        }

        // Enforce invite link/URL guest limit
        const limit = maxGuestsLimit;
        if (rsvpData.attendance === 'yes' && limit !== null && limit > 0) {
          if (rsvpData.guestCount > limit) {
            toast.error(`הגבלת קישור: עד ${limit} אורחים בלבד`);
            setRsvpData(prev => ({ ...prev, guestCount: limit }));
            return;
          }
        }

        setIsSubmitting(true);

        console.log('[RSVP] ========== STARTING RSVP SUBMISSION ==========');
        console.log('[RSVP] Event data:', event);
        console.log('[RSVP] RSVP data:', rsvpData);

        try {
          console.log('[RSVP] Step 1: Creating RSVP record...');
          await createEventRSVP({
            eventId: eventId,
            name: rsvpData.name,
            phone: rsvpData.phone || null,
            attendance: rsvpData.attendance,
            guestCount: rsvpData.attendance === 'yes' ? rsvpData.guestCount : 0,
            notes: rsvpData.notes || null,
            userId: isAuthenticated && user?.id ? user.id : null
          });
          console.log('[RSVP] ✅ RSVP record created successfully');

          // Send notification to event owner if notifyOnRsvp is enabled (default true)
          const notifyOnRsvp = event?.notifyOnRsvp !== false;
          const ownerId = event?.owner_id || event?.ownerId;

          console.log('[RSVP] Step 2: Checking notification settings...');
          console.log('[RSVP] 🔔 notifyOnRsvp:', notifyOnRsvp);
          console.log('[RSVP] 🔔 ownerId:', ownerId);
          console.log('[RSVP] 🔔 event.title:', event?.title);

          if (notifyOnRsvp && ownerId) {
            try {
              const attendanceText = rsvpData.attendance === 'yes' ? 'מגיע/ה' : rsvpData.attendance === 'no' ? 'לא מגיע/ה' : 'אולי';
              const guestText = rsvpData.attendance === 'yes' && rsvpData.guestCount > 1 ? ` (${rsvpData.guestCount} אנשים)` : '';

              const notificationPayload = {
                userId: ownerId,
                type: 'rsvp_received',
                title: `אישור הגעה חדש! 📋`,
                message: `${rsvpData.name} הגיב/ה לאירוע "${event.title}": ${attendanceText}${guestText}`,
                eventId: eventId,
                actionUrl: `https://register.plan-ora.net${createPageUrl(`EventDetail?id=${eventId}&tab=rsvp`)}`,
                priority: 'high',
                sendPush: true
              };

              console.log('[RSVP] Step 3: Sending notification with payload:', notificationPayload);

              const notifResult = await createNotificationAndSendPush(notificationPayload);

              console.log('[RSVP] ✅✅✅ Notification sent successfully! Result:', notifResult);
            } catch (notifyErr) {
              console.error('[RSVP] ❌❌❌ NOTIFICATION FAILED:', notifyErr);
              console.error('[RSVP] Error details:', {
                message: notifyErr.message,
                stack: notifyErr.stack,
                name: notifyErr.name
              });
            }
          } else {
            console.log('[RSVP] ⚠️ Notification SKIPPED - Reason:', {
              notifyOnRsvp,
              hasOwnerId: !!ownerId,
              ownerId
            });
          }

          console.log('[RSVP] ========== RSVP SUBMISSION COMPLETED ==========');
          setSubmitted(true);
          toast.success('התשובה נשמרה בהצלחה! 🎉');
        } catch (err) {
          console.error('[RSVP] ❌❌❌ RSVP SUBMISSION ERROR:', err);
          console.error('[RSVP] Error details:', {
            message: err.message,
            stack: err.stack
          });
          toast.error(err.message || 'שגיאה בשמירת התשובה');
        } finally {
          setIsSubmitting(false);
        }
  };

  const handleJoinApp = () => {
    // Redirect to app store based on device type
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua);

    const APP_STORE_URL = 'https://apps.apple.com/il/app/planora/id6755497184';
    const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=net.planora.app';

    window.location.href = isIOS ? APP_STORE_URL : PLAY_STORE_URL;
  };

  const benefits = [
    { icon: Bell, text: 'קבלו התראות ועדכונים בזמן אמת', color: 'text-blue-500' },
    { icon: Users, text: 'ראו מי עוד מגיע ותיאמו איתם', color: 'text-green-500' },
    { icon: CheckCircle2, text: 'קבלו משימות וראו את לו"ז האירוע', color: 'text-purple-500' },
    { icon: Camera, text: 'שתפו תמונות בגלריה משותפת', color: 'text-pink-500' },
    { icon: MessageCircle, text: 'צ\'אט קבוצתי עם כל המשתתפים', color: 'text-indigo-500' },
    { icon: Star, text: 'צרו אירועים משלכם בחינם!', color: 'text-orange-500' },
  ];

  const addToCalendar = () => {
    if (!event) return;
    const startDate = event.date || event.eventDate || event.event_date;
    if (!startDate) return;

    const start = new Date(startDate);
    const endDate = event.end_date || event.endDate;
    const end = endDate ? new Date(endDate) : new Date(start.getTime() + 2 * 60 * 60 * 1000);

    // Native calendar support - create ICS file
    if (isNativeCapacitor()) {
      try {
        const formatDate = (date) => {
          return date.toISOString().replace(/-|:|\.\d+/g, '');
        };

        // Create ICS content
        const icsContent = [
          'BEGIN:VCALENDAR',
          'VERSION:2.0',
          'PRODID:-//Planora//Event//EN',
          'BEGIN:VEVENT',
          `DTSTART:${formatDate(start)}`,
          `DTEND:${formatDate(end)}`,
          `SUMMARY:${event.title}`,
          `DESCRIPTION:${event.description || 'הוזמנת לאירוע'}`,
          `LOCATION:${event.location || ''}`,
          'END:VEVENT',
          'END:VCALENDAR'
        ].join('\r\n');

        // Create data URL for ICS
        const dataUrl = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(icsContent);

        // Open data URL - this will trigger the native calendar app
        openExternalUrl(dataUrl);

        toast.success('נפתח יומן הטלפון 📅');
      } catch (error) {
        console.error('Failed to open native calendar:', error);
        toast.error('לא ניתן לפתוח את היומן');
      }
    } else {
      // Web - Google Calendar
      const startStr = start.toISOString().replace(/-|:|\.\d+/g, '');
      const endStr = end.toISOString().replace(/-|:|\.\d+/g, '');

      const title = encodeURIComponent(event.title);
      const details = encodeURIComponent(event.description || 'הוזמנת לאירוע');
      const location = encodeURIComponent(event.location || '');

      const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startStr}/${endStr}&details=${details}&location=${location}`;
      window.open(url, '_blank');
    }
  };

  const openWaze = () => {
    if (!event?.location) return;
    const query = encodeURIComponent(event.location);
    const url = `https://waze.com/ul?q=${query}&navigate=yes`;
    openExternalUrl(url);
  };

  const openGoogleMaps = () => {
    if (!event?.location) return;
    const query = encodeURIComponent(event.location);
    const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    openExternalUrl(url);
  };

  // Loading state
  if (isLoading || isAuthLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-rose-50 flex items-center justify-center p-4" style={{ direction: 'rtl' }}>
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-12 h-12 text-orange-500 animate-spin mb-4" />
            <p className="text-gray-600 text-center">טוען פרטי האירוע...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-rose-50 flex items-center justify-center p-4" style={{ direction: 'rtl' }}>
        <Card className="w-full max-w-md border-red-200">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-red-800 mb-2 text-center">אירעה שגיאה</h3>
            <p className="text-red-600 text-center mb-6">{error}</p>
            <Button onClick={() => navigate(createPageUrl('WelcomePage'))} variant="outline" className="w-full">
              לעמוד הראשי
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state after submission
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4" style={{ direction: 'rtl' }}>
        <Card className="w-full max-w-md overflow-hidden shadow-xl">
          <div className="bg-gradient-to-r from-green-500 to-teal-500 px-6 py-8 text-white text-center">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-10 h-10" />
            </div>
            <h1 className="text-2xl font-bold mb-2">התשובה נשמרה!</h1>
            <p className="text-white/90">תודה שעניתם על ההזמנה</p>
          </div>
          
          <CardContent className="p-6 space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-900 mb-2">{event?.title}</h2>
              <p className="text-gray-600 text-lg font-medium">
                {rsvpData.attendance === 'yes' && `מעולה! אישרת הגעה עבור ${rsvpData.guestCount} משתתפים`}
                {rsvpData.attendance === 'no' && 'תודה על העדכון. נתראה באירוע הבא!'}
                {rsvpData.attendance === 'maybe' && 'תודה! נעדכן אותך קרוב לאירוע'}
              </p>
            </div>

            {/* Enhanced Registration CTA */}
            {!isAuthenticated && (
              <div className="bg-gradient-to-br from-orange-500 to-rose-500 rounded-2xl p-6 text-white shadow-lg">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <Gift className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">רוצים ליהנות מהרבה יותר?</h3>
                    <p className="text-white/80 text-sm">הצטרפו ל-Planora בחינם!</p>
                  </div>
                </div>

                <div className="space-y-2 mb-5">
                  {benefits.slice(0, 4).map((benefit, index) => (
                    <div key={index} className="flex items-center gap-3 bg-white/10 rounded-lg p-2">
                      <benefit.icon className="w-5 h-5 text-white" />
                      <span className="text-sm text-white/90">{benefit.text}</span>
                    </div>
                  ))}
                </div>

                <Button 
                  onClick={handleJoinApp}
                  className="w-full bg-white text-orange-600 hover:bg-gray-100 h-12 text-lg font-bold shadow-md"
                >
                  <Zap className="w-5 h-5 ml-2" />
                  הירשמו עכשיו - בחינם!
                </Button>
                
                <p className="text-center text-white/70 text-xs mt-3">
                  ✓ ללא עלות ✓ ללא התחייבות ✓ תוך שניות
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main RSVP Form
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-rose-50 flex items-center justify-center p-4" style={{ direction: 'rtl' }}>
      <Card className="w-full max-w-md overflow-hidden shadow-xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-rose-500 px-6 py-6 text-white">
          <div className="text-center">
            <PartyPopper className="w-12 h-12 mx-auto mb-3" />
            <h1 className="text-xl font-bold mb-1">הוזמנתם לאירוע!</h1>
            <p className="text-white/90 text-sm">עדכנו אותנו האם אתם מגיעים</p>
          </div>
        </div>
        
        <CardContent className="p-6 space-y-5">
          {/* Event Info */}
          <div className="text-center pb-4 border-b">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">{event?.title}</h2>
            {event?.description && (
              <p className="text-gray-600 text-sm">{event.description}</p>
            )}
          </div>

          {/* Event Details - Styled for "Hagiga" */}
          <div className="bg-white/50 rounded-xl border border-orange-100 p-1">

            {/* Standard Cover */}
            {event?.cover_image_url && (
              <div className="w-full h-32 rounded-lg mb-3 overflow-hidden">
                <img 
                  src={event.cover_image_url} 
                  alt="Cover" 
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="space-y-3 p-2">
              {/* Date & Calendar */}
              {(event?.date || event?.eventDate || event?.event_date) && (
                <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-orange-100 p-2 rounded-full">
                      <Calendar className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">מתי חוגגים?</p>
                      <p className="font-bold text-gray-900 text-lg">
                        {new Date(event.date || event.eventDate || event.event_date).toLocaleDateString('he-IL', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long'
                        })}
                      </p>
                      <p className="text-sm text-gray-600">
                        בשעה {new Date(event.date || event.eventDate || event.event_date).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  {/* Prominent Add to Calendar Button */}
                  <Button 
                    onClick={addToCalendar}
                    className="w-full bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white h-11 font-semibold shadow-md"
                  >
                    <CalendarPlus className="w-5 h-5 ml-2" />
                    שמור ביומן  📅
                  </Button>
                </div>
              )}

              {/* Organizer */}
              {organizerName && (
                <div className="flex items-center gap-2 justify-center py-2">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    מארגן/ת: <span className="font-medium">{organizerName}</span>
                  </span>
                </div>
              )}

              {/* Location & Navigation */}
              {event?.location && (
                <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-rose-100 p-2 rounded-full">
                      <MapPin className="w-5 h-5 text-rose-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">איפה?</p>
                      <p className="font-medium text-gray-900">{event.location}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <Button 
                      variant="outline" 
                      className="w-full text-xs h-9 border-blue-200 text-blue-700 hover:bg-blue-50"
                      onClick={openWaze}
                    >
                      <Navigation className="w-3 h-3 ml-1.5" />
                      Waze
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full text-xs h-9 border-green-200 text-green-700 hover:bg-green-50"
                      onClick={openGoogleMaps}
                    >
                      <Map className="w-3 h-3 ml-1.5" />
                      Google Maps
                    </Button>
                  </div>
                </div>
              )}


              </div>
              </div>

          {/* RSVP Form */}
          <div className="space-y-4 pt-4 border-t">
            <div>
              <Label htmlFor="name" className="text-sm font-medium">השם שלך *</Label>
              <Input
                id="name"
                value={rsvpData.name}
                onChange={(e) => setRsvpData({ ...rsvpData, name: e.target.value })}
                placeholder="הזינו את שמכם"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="phone" className="text-sm font-medium">טלפון (אופציונלי)</Label>
              <Input
                id="phone"
                value={rsvpData.phone}
                onChange={(e) => setRsvpData({ ...rsvpData, phone: e.target.value })}
                placeholder="050-0000000"
                type="tel"
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-sm font-medium mb-3 block">האם את/ה מגיע/ה? *</Label>
              <RadioGroup 
                value={rsvpData.attendance} 
                onValueChange={(value) => setRsvpData({ ...rsvpData, attendance: value })}
                className="grid grid-cols-3 gap-2"
              >
                <Label
                  htmlFor="yes"
                  className={`flex flex-col items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    rsvpData.attendance === 'yes' 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-gray-200 hover:border-green-300'
                  }`}
                >
                  <RadioGroupItem value="yes" id="yes" className="sr-only" />
                  <Check className={`w-6 h-6 mb-1 ${rsvpData.attendance === 'yes' ? 'text-green-600' : 'text-gray-400'}`} />
                  <span className={`text-sm font-medium ${rsvpData.attendance === 'yes' ? 'text-green-700' : 'text-gray-600'}`}>מגיע/ה</span>
                </Label>

                <Label
                  htmlFor="no"
                  className={`flex flex-col items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    rsvpData.attendance === 'no' 
                      ? 'border-red-500 bg-red-50' 
                      : 'border-gray-200 hover:border-red-300'
                  }`}
                >
                  <RadioGroupItem value="no" id="no" className="sr-only" />
                  <X className={`w-6 h-6 mb-1 ${rsvpData.attendance === 'no' ? 'text-red-600' : 'text-gray-400'}`} />
                  <span className={`text-sm font-medium ${rsvpData.attendance === 'no' ? 'text-red-700' : 'text-gray-600'}`}>לא מגיע/ה</span>
                </Label>

                <Label
                  htmlFor="maybe"
                  className={`flex flex-col items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    rsvpData.attendance === 'maybe' 
                      ? 'border-yellow-500 bg-yellow-50' 
                      : 'border-gray-200 hover:border-yellow-300'
                  }`}
                >
                  <RadioGroupItem value="maybe" id="maybe" className="sr-only" />
                  <HelpCircle className={`w-6 h-6 mb-1 ${rsvpData.attendance === 'maybe' ? 'text-yellow-600' : 'text-gray-400'}`} />
                  <span className={`text-sm font-medium ${rsvpData.attendance === 'maybe' ? 'text-yellow-700' : 'text-gray-600'}`}>אולי</span>
                </Label>
              </RadioGroup>
            </div>

            {/* Guest count - Show only when "yes" is selected */}
            {rsvpData.attendance === 'yes' && (
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <Label className="text-sm font-medium text-green-800 mb-3 block">
                  <Users className="w-4 h-4 inline ml-1" />
                  כמה אנשים מגיעים? (כולל אותך)
                  {maxGuestsLimit !== null && (
                    <span className="text-xs text-amber-600 mr-2 font-bold">(מקסימום {maxGuestsLimit})</span>
                  )}
                </Label>
                <div className="flex items-center justify-center gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setRsvpData({ ...rsvpData, guestCount: Math.max(1, rsvpData.guestCount - 1) })}
                    disabled={rsvpData.guestCount <= 1}
                    className="h-12 w-12 rounded-full border-green-300 text-xl font-bold"
                  >
                    -
                  </Button>
                  <span className="text-4xl font-bold text-green-700 w-20 text-center">{rsvpData.guestCount}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      console.log('[RSVP] Plus clicked - maxGuestsLimit:', maxGuestsLimit, 'guestCount:', rsvpData.guestCount);
                      // Check max guests limit from invite link or URL
                      if (maxGuestsLimit !== null && maxGuestsLimit > 0 && rsvpData.guestCount >= maxGuestsLimit) {
                        toast.error(`הגבלת קישור: עד ${maxGuestsLimit} אורחים בלבד`);
                        return;
                      }
                      setRsvpData({ ...rsvpData, guestCount: rsvpData.guestCount + 1 });
                    }}
                    disabled={(inviteCode && !inviteLink) || (maxGuestsLimit !== null && maxGuestsLimit > 0 && rsvpData.guestCount >= maxGuestsLimit)}
                    className="h-12 w-12 rounded-full border-green-300 text-xl font-bold"
                  >
                    +
                  </Button>
                </div>
                {maxGuestsLimit !== null && maxGuestsLimit > 0 && rsvpData.guestCount >= maxGuestsLimit && (
                  <div className="text-center mt-3 p-2 bg-amber-100 rounded-lg border border-amber-300">
                    <p className="text-sm text-amber-800 font-medium">
                      🔒 הגעת למקסימום האורחים המותר ({maxGuestsLimit})
                    </p>
                  </div>
                )}
                {rsvpData.guestCount > 1 && (maxGuestsLimit === null || maxGuestsLimit <= 0 || rsvpData.guestCount < maxGuestsLimit) && (
                  <p className="text-center text-sm text-green-600 mt-2">
                    מעולה! {rsvpData.guestCount} אנשים מגיעים 🎉
                  </p>
                )}
              </div>
            )}

            <div>
              <Label htmlFor="notes" className="text-sm font-medium">הערות (אופציונלי)</Label>
              <Input
                id="notes"
                value={rsvpData.notes}
                onChange={(e) => setRsvpData({ ...rsvpData, notes: e.target.value })}
                placeholder="אלרגיות, בקשות מיוחדות..."
                className="mt-1"
              />
            </div>
          </div>

          {/* Submit Button */}
          <Button 
            onClick={handleSubmitRSVP}
            disabled={isSubmitting || !rsvpData.name || !rsvpData.attendance}
            className="w-full bg-orange-500 hover:bg-orange-600 h-12 text-lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin ml-2" />
                שולח...
              </>
            ) : (
              'שלח תשובה'
            )}
          </Button>

          {/* Registration CTA for non-authenticated users - VERY PROMINENT */}
          {!isAuthenticated && (
            <div className="bg-gradient-to-br from-orange-500 via-rose-500 to-purple-500 rounded-2xl p-6 text-white shadow-xl">
              <div className="text-center mb-4">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-1">גם אתם רוצים לתכנן אירועים?</h3>
                <p className="text-white/90 text-sm">הצטרפו ל-Planora ותתחילו לתכנן ולנהל את האירועים שלכם במקום אחד!</p>
              </div>

              <div className="bg-white/10 rounded-xl p-4 mb-4 space-y-2">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-300 flex-shrink-0" />
                  <span className="text-sm">ניהול משימות ומעקב התקדמות</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-300 flex-shrink-0" />
                  <span className="text-sm">צ'אט קבוצתי עם כל המשתתפים</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-300 flex-shrink-0" />
                  <span className="text-sm">התראות ועדכונים בזמן אמת</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-300 flex-shrink-0" />
                  <span className="text-sm">גלריית תמונות משותפת</span>
                </div>
              </div>

              <Button 
                onClick={handleJoinApp}
                className="w-full bg-white text-orange-600 hover:bg-gray-100 h-14 text-lg font-bold shadow-lg"
              >
                <Zap className="w-5 h-5 ml-2" />
                הצטרפו עכשיו - בחינם!
              </Button>
              
              <p className="text-center text-white/70 text-xs mt-3">
                ✓ ללא עלות ✓ ללא כרטיס אשראי ✓ תוך 30 שניות
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/components/AuthProvider';
import { getEventDetails, getUserById, createNotificationAndSendPush } from '@/components/instabackService';

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
  Star, Bell, CheckCircle2, Heart, Zap, Camera
} from 'lucide-react';
import { toast } from 'sonner';

export default function EventRSVPPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get('id')?.trim();
  
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [event, setEvent] = useState(null);
  const [ownerName, setOwnerName] = useState('מארגן האירוע');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  
  // Prevent infinite loop - load only once
  const hasLoadedRef = useRef(false);
  
  // RSVP Form State
  const [rsvpData, setRsvpData] = useState({
    name: '',
    phone: '',
    attendance: '',
    guestCount: 1,
    notes: ''
  });

  // Load event data only once
  useEffect(() => {
    if (hasLoadedRef.current || !eventId) {
      if (!eventId) {
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

        const ownerId = eventDetails.ownerId || eventDetails.owner_id || eventDetails._uid;
        
        if (ownerId) {
          try {
            const ownerDetails = await getUserById(ownerId);
            if (ownerDetails) {
              const resolvedOwnerName = ownerDetails.name || 
                              ownerDetails.full_name ||
                              `${ownerDetails.firstName || ''} ${ownerDetails.lastName || ''}`.trim() ||
                              'מארגן האירוע';
              setOwnerName(resolvedOwnerName);
            }
          } catch (ownerError) {
            console.error('[RSVP] Failed to load owner details:', ownerError);
          }
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

    setIsSubmitting(true);
    try {
      await createEventRSVP({
        eventId: eventId,
        name: rsvpData.name,
        phone: rsvpData.phone || null,
        attendance: rsvpData.attendance,
        guestCount: rsvpData.attendance === 'yes' ? rsvpData.guestCount : 0,
        notes: rsvpData.notes || null,
        userId: isAuthenticated && user?.id ? user.id : null
      });
      
      // Send notification to event owner if notifyOnRsvp is enabled (default true)
      const notifyOnRsvp = event?.notifyOnRsvp !== false;
      const ownerId = event?.owner_id || event?.ownerId;
      
      if (notifyOnRsvp && ownerId) {
        try {
          const attendanceText = rsvpData.attendance === 'yes' ? 'מגיע/ה' : rsvpData.attendance === 'no' ? 'לא מגיע/ה' : 'אולי';
          const guestText = rsvpData.attendance === 'yes' && rsvpData.guestCount > 1 ? ` (${rsvpData.guestCount} אנשים)` : '';
          
          await createNotificationAndSendPush({
            userId: ownerId,
            type: 'rsvp_received',
            title: `אישור הגעה חדש! 📋`,
            message: `${rsvpData.name} הגיב/ה לאירוע "${event.title}": ${attendanceText}${guestText}`,
            eventId: eventId,
            actionUrl: `https://register.plan-ora.net${createPageUrl(`EventDetail?id=${eventId}&tab=rsvp`)}`,
            priority: 'normal'
          });
        } catch (notifyErr) {
          console.warn('[RSVP] Failed to notify event owner:', notifyErr);
        }
      }
      
      setSubmitted(true);
      toast.success('התשובה נשמרה בהצלחה! 🎉');
    } catch (err) {
      console.error('Error submitting RSVP:', err);
      toast.error(err.message || 'שגיאה בשמירת התשובה');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinApp = () => {
    if (eventId) {
      localStorage.setItem('pendingEventJoin', eventId);
    }
    navigate(createPageUrl('Auth?mode=register'));
  };

  const benefits = [
    { icon: Bell, text: 'קבלו התראות ועדכונים בזמן אמת', color: 'text-blue-500' },
    { icon: Users, text: 'ראו מי עוד מגיע ותיאמו איתם', color: 'text-green-500' },
    { icon: CheckCircle2, text: 'קבלו משימות וראו את לו"ז האירוע', color: 'text-purple-500' },
    { icon: Camera, text: 'שתפו תמונות בגלריה משותפת', color: 'text-pink-500' },
    { icon: MessageCircle, text: 'צ\'אט קבוצתי עם כל המשתתפים', color: 'text-indigo-500' },
    { icon: Star, text: 'צרו אירועים משלכם בחינם!', color: 'text-orange-500' },
  ];

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
              <p className="text-gray-600">
                {rsvpData.attendance === 'yes' && `מעולה! נרשמת כמגיע/ה${rsvpData.guestCount > 1 ? ` עם ${rsvpData.guestCount - 1} אורחים נוספים` : ''}`}
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

          {/* Event Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Users className="w-5 h-5 text-orange-500 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">מארגן</p>
                <p className="font-medium text-gray-900">{ownerName}</p>
              </div>
            </div>

            {(event?.date || event?.eventDate || event?.event_date) && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Calendar className="w-5 h-5 text-orange-500 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">תאריך</p>
                  <p className="font-medium text-gray-900">
                    {new Date(event.date || event.eventDate || event.event_date).toLocaleDateString('he-IL', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            )}

            {event?.location && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <MapPin className="w-5 h-5 text-orange-500 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">מיקום</p>
                  <p className="font-medium text-gray-900">{event.location}</p>
                </div>
              </div>
            )}
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
                    onClick={() => setRsvpData({ ...rsvpData, guestCount: rsvpData.guestCount + 1 })}
                    className="h-12 w-12 rounded-full border-green-300 text-xl font-bold"
                  >
                    +
                  </Button>
                </div>
                {rsvpData.guestCount > 1 && (
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
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/components/AuthProvider';
import { getEventDetails, getUserById, createNotificationAndSendPush, getInviteLinkByCode } from '@/components/instabackService';

// פונקציית עזר לשליחת הנתונים ל-API
const createEventRSVP = async (rsvpData) => {
  const API_BASE_URL = 'https://instaback.ai/project/f78de3ce-0cab-4ccb-8442-0c5749792fe8/api';
  const token = typeof window !== 'undefined' ? localStorage.getItem('instaback_token') : null;
  
  const payload = {
    eventId: rsvpData.eventId,
    name: rsvpData.name,
    phone: rsvpData.phone || null,
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

  if (!response.ok) throw new Error('שגיאה בשמירת התשובה');
  return response.json();
};

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  Loader2, Calendar, MapPin, PartyPopper, AlertCircle, Users, 
  Check, X, HelpCircle, Sparkles, Gift, MessageCircle,
  Star, Bell, CheckCircle2, Zap, Camera
} from 'lucide-react';
import { toast } from 'sonner';

export default function EventRSVPPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  
  const eventIdFromUrl = searchParams.get('id')?.trim();
  const inviteCode = searchParams.get('code')?.trim();
  
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  
  const [event, setEvent] = useState(null);
  const [ownerName, setOwnerName] = useState('מארגן האירוע');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [inviteLinkData, setInviteLinkData] = useState(null);
  const [eventId, setEventId] = useState(eventIdFromUrl);

  const [rsvpData, setRsvpData] = useState({
    name: '',
    phone: '',
    attendance: '',
    guestCount: 1,
    notes: ''
  });

  // --- לוגיקת הגבלת אורחים "משוריינת" ---
  const maxGuestsLimit = useMemo(() => {
    const limits = [];
    
    // 1. הגבלה מה-DB (אם הקישור נטען)
    if (inviteLinkData?.maxGuests) {
      limits.push(Number(inviteLinkData.maxGuests));
    }
    
    // 2. הגבלה מה-URL (פרמטר max)
    const urlMax = searchParams.get('max') || searchParams.get('limit');
    if (urlMax && !isNaN(Number(urlMax))) {
      limits.push(Number(urlMax));
    }

    // החזרת המינימום (ההגבלה המחמירה ביותר)
    return limits.length > 0 ? Math.min(...limits) : null;
  }, [inviteLinkData, searchParams]);

  // טעינת נתוני קוד הזמנה (Invite Code)
  useEffect(() => {
    const fetchLink = async () => {
      if (!inviteCode) return;
      try {
        const link = await getInviteLinkByCode(inviteCode);
        if (link) {
          setInviteLinkData(link);
          if (link.eventId && !eventId) setEventId(link.eventId);
        }
      } catch (err) {
        console.error("Failed to load link code", err);
      }
    };
    fetchLink();
  }, [inviteCode]);

  // תיקון אוטומטי של כמות אורחים אם היא חורגת מהמגבלה שנטענה
  useEffect(() => {
    if (maxGuestsLimit && rsvpData.guestCount > maxGuestsLimit) {
      setRsvpData(prev => ({ ...prev, guestCount: maxGuestsLimit }));
    }
  }, [maxGuestsLimit]);

  // טעינת פרטי אירוע
  useEffect(() => {
    const loadEvent = async () => {
      if (!eventId) return;
      setIsLoading(true);
      try {
        const data = await getEventDetails(eventId);
        if (!data) throw new Error('אירוע לא נמצא');
        setEvent(data);
        
        const oId = data.ownerId || data.owner_id;
        if (oId) {
          const oData = await getUserById(oId);
          if (oData) setOwnerName(oData.name || oData.full_name || 'מארגן האירוע');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    loadEvent();
  }, [eventId]);

  const handleSubmitRSVP = async () => {
    if (!rsvpData.name.trim()) return toast.error('נא להזין שם');
    if (!rsvpData.attendance) return toast.error('נא לבחור סטטוס הגעה');
    
    setIsSubmitting(true);
    try {
      await createEventRSVP({
        eventId,
        ...rsvpData,
        guestCount: rsvpData.attendance === 'yes' ? rsvpData.guestCount : 0,
        userId: user?.id
      });
      setSubmitted(true);
      toast.success('התשובה נשמרה! 🎉');
    } catch (err) {
      toast.error('שגיאה בשליחה');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-orange-500" /></div>;

  if (submitted) return (
    <div className="min-h-screen bg-orange-50 p-4 flex items-center justify-center" dir="rtl">
      <Card className="w-full max-w-md text-center p-8">
        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">תודה, {rsvpData.name}!</h2>
        <p className="text-gray-600 mb-6">התשובה שלך לאירוע "{event?.title}" נשמרה בהצלחה.</p>
        <Button onClick={() => navigate('/')} className="w-full bg-orange-500">חזרה לדף הבית</Button>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-rose-50 p-4" dir="rtl">
      <Card className="w-full max-w-md mx-auto overflow-hidden shadow-2xl">
        <div className="bg-orange-500 p-6 text-white text-center">
          <PartyPopper className="w-12 h-12 mx-auto mb-2" />
          <h1 className="text-xl font-bold">{event?.title || 'הזמנה לאירוע'}</h1>
          <p className="opacity-90">מאת: {ownerName}</p>
        </div>

        <CardContent className="p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <Label>השם שלך</Label>
              <Input 
                value={rsvpData.name} 
                onChange={e => setRsvpData({...rsvpData, name: e.target.value})}
                placeholder="איך קוראים לך?"
              />
            </div>

            <div>
              <Label>האם תגיע/י?</Label>
              <RadioGroup 
                value={rsvpData.attendance} 
                onValueChange={v => setRsvpData({...rsvpData, attendance: v})}
                className="grid grid-cols-3 gap-2 mt-2"
              >
                {['yes', 'no', 'maybe'].map(opt => (
                  <Label key={opt} className={`border p-3 rounded-lg flex flex-col items-center cursor-pointer ${rsvpData.attendance === opt ? 'bg-orange-50 border-orange-500' : ''}`}>
                    <RadioGroupItem value={opt} className="sr-only" />
                    {opt === 'yes' ? <Check /> : opt === 'no' ? <X /> : <HelpCircle />}
                    <span className="text-xs mt-1">{opt === 'yes' ? 'מגיע' : opt === 'no' ? 'לא' : 'אולי'}</span>
                  </Label>
                ))}
              </RadioGroup>
            </div>

            {rsvpData.attendance === 'yes' && (
              <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                <Label className="block text-center mb-4">כמות אורחים (כולל אותך)</Label>
                <div className="flex items-center justify-center gap-6">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => setRsvpData(p => ({...p, guestCount: Math.max(1, p.guestCount - 1)}))}
                    disabled={rsvpData.guestCount <= 1}
                  >-</Button>
                  
                  <span className="text-3xl font-bold w-12 text-center">{rsvpData.guestCount}</span>
                  
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => {
                      if (maxGuestsLimit && rsvpData.guestCount >= maxGuestsLimit) {
                        return toast.error(`הגבלה: עד ${maxGuestsLimit} אורחים`);
                      }
                      setRsvpData(p => ({...p, guestCount: p.guestCount + 1}));
                    }}
                    disabled={maxGuestsLimit !== null && rsvpData.guestCount >= maxGuestsLimit}
                  >+</Button>
                </div>
                {maxGuestsLimit && (
                  <p className="text-center text-xs text-orange-600 mt-2">מקסימום בקישור זה: {maxGuestsLimit}</p>
                )}
              </div>
            )}

            <div>
              <Label>הערות למארגן</Label>
              <Input 
                value={rsvpData.notes} 
                onChange={e => setRsvpData({...rsvpData, notes: e.target.value})}
                placeholder="אלרגיות, ברכות וכו'..."
              />
            </div>
          </div>

          <Button 
            className="w-full h-12 text-lg bg-orange-600 hover:bg-orange-700" 
            disabled={isSubmitting}
            onClick={handleSubmitRSVP}
          >
            {isSubmitting ? <Loader2 className="animate-spin" /> : 'אישור הגעה'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
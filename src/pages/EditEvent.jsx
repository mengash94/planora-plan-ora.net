import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/components/AuthProvider';
import { getEventDetails, updateEvent, uploadFileToInstaback, checkEventMembership } from '@/components/instabackService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { toDateTimeLocalValue } from '@/components/utils/dateHelpers';
import DateRangePicker from '@/components/ui/DateRangePicker';
import { compressImage } from '@/components/utils/imageCompressor';
import PaymentSettingsSection from '@/components/event/PaymentSettingsSection';
import RecurrenceSettings from '@/components/event/RecurrenceSettings';
import { getRecurringEventRule, updateRecurringEventRule, createRecurringEventRule, deleteRecurringEventRule } from '@/components/instabackService';

export default function EditEventPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get('id')?.trim();
  const { user } = useAuth();

  const [formData, setFormData] = useState({ 
    title: '', 
    description: '', 
    location: '', 
    coverImageUrl: '', 
    eventDate: '', 
    endDate: '', 
    privacy: 'private', 
    budget: '',
    category: '',
    customCategory: '',
    participationCost: '',
    hidePaymentsFromMembers: false,
    visibleTabs: ['updates', 'tasks', 'chat', 'polls', 'itinerary', 'professionals', 'links', 'gallery', 'documents', 'participants', 'payments'],
    paymentMethod: '',
    paymentMethods: [],
    paymentPhone: '',
    bankDetails: null,
    isRecurring: false,
    recurrenceRule: null
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [error, setError] = useState(null);
  const [originalRecurringRuleId, setOriginalRecurringRuleId] = useState(null);

  useEffect(() => {
    const fetchEventData = async () => {
      setError(null);
      if (!eventId) {
        setError('מזהה אירוע לא תקין');
        setIsLoading(false);
        return;
      }
      try {
        const event = await getEventDetails(eventId);
        if (!event || !event.id) {
          setError("האירוע לא נמצא");
          setIsLoading(false);
          return;
        }
        
        // Check membership instead of event owner_id
        const membership = await checkEventMembership(eventId, user.id);
        if (!membership) {
          toast.error("אין לך הרשאה לערוך אירוע זה.");
          navigate(createPageUrl(`EventDetail?id=${eventId}`));
          return;
        }
        
        const memberRole = membership.role?.toLowerCase();
        const canManage = memberRole === 'organizer' || memberRole === 'manger' || memberRole === 'manager';
        
        if (!canManage) {
          toast.error("אין לך הרשאה לערוך אירוע זה.");
          navigate(createPageUrl(`EventDetail?id=${eventId}`));
          return;
        }

        // Convert server date to datetime-local format using the helper (Israel timezone)
        const formattedEventDate = event.eventDate
          ? toDateTimeLocalValue(event.eventDate)
          : '';
        const formattedEndDate = event.endDate
          ? toDateTimeLocalValue(event.endDate)
          : '';

        // Load recurring rule if event is recurring
        let recurringRule = null;
        let recurringRuleId = null;
        if (event.is_recurring || event.isRecurring) {
          try {
            const rule = await getRecurringEventRule(eventId);
            if (rule) {
              recurringRule = rule;
              recurringRuleId = rule.id;
            }
          } catch (ruleErr) {
            console.warn('Failed to load recurring rule:', ruleErr);
          }
        }

        setFormData({
          title: event.title || '',
          description: event.description || '',
          location: event.location || '',
          coverImageUrl: event.coverImageUrl || event.cover_image_url || '',
          eventDate: formattedEventDate,
          endDate: formattedEndDate,
          privacy: event.privacy || 'private',
          budget: event.budget ? String(event.budget) : '',
          category: event.category || '',
          customCategory: '',
          participationCost: event.participationCost || event.participation_cost ? String(event.participationCost || event.participation_cost) : '',
          hidePaymentsFromMembers: event.hidePaymentsFromMembers || event.hide_payments_from_members || false,
          visibleTabs: event.visibleTabs || event.visible_tabs || ['updates', 'tasks', 'chat', 'polls', 'itinerary', 'professionals', 'links', 'gallery', 'documents', 'participants', 'payments'],
          paymentMethod: event.paymentMethod || event.payment_method || '',
          paymentMethods: event.paymentMethods || event.payment_methods || (event.paymentMethod || event.payment_method ? [event.paymentMethod || event.payment_method] : []),
          paymentPhone: event.paymentPhone || event.payment_phone || '',
          bankDetails: event.bankDetails || event.bank_details || null,
          isRecurring: event.is_recurring || event.isRecurring || false,
          recurrenceRule: recurringRule
        });
        setOriginalRecurringRuleId(recurringRuleId);
      } catch (e) {
        setError("שגיאה בטעינת פרטי האירוע");
        console.error("Failed to fetch event for editing", e);
      }
      setIsLoading(false);
    };
    if (user?.id) {
        fetchEventData();
    }
  }, [eventId, navigate, user]);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'קובץ לא תקין',
        description: 'אנא בחר קובץ תמונה',
        variant: 'destructive'
      });
      return;
    }

    setIsUploadingImage(true);

    try {
      toast({
        title: 'מכין את התמונה... 🖼️',
        description: 'דוחס ומעלה תמונת שער',
        duration: 2000
      });

      console.log('[EditEvent] Compressing cover image...');
      const compressedFile = await compressImage(file, {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.85
      });

      console.log('[EditEvent] Uploading compressed cover image...');
      const uploadResult = await uploadFileToInstaback(compressedFile, eventId, 'covers');

      if (!uploadResult.file_url) {
        throw new Error('No file URL returned from upload');
      }

      setFormData(prev => ({
        ...prev,
        coverImageUrl: uploadResult.file_url
      }));

      toast({
        title: 'תמונת השער עודכנה! ✅',
        description: 'התמונה הועלתה בהצלחה',
        duration: 3000
      });
    } catch (error) {
      console.error('[EditEvent] Image upload failed:', error);
      toast({
        title: 'שגיאה בהעלאת התמונה',
        description: error.message || 'אירעה שגיאה',
        variant: 'destructive'
      });
    } finally {
      setIsUploadingImage(false);
      // Clear the file input value to allow re-uploading the same file if needed
      if (e.target) e.target.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title?.trim()) {
      toast.error('נא להזין שם לאירוע');
      return;
    }

    setIsSaving(true);
    try {
      const finalCategory = formData.category || '';
      
      const payload = {
        title: formData.title.trim(),
        description: formData.description?.trim() || '',
        location: formData.location?.trim() || '',
        event_date: formData.eventDate || null,
        end_date: formData.endDate || null,
        cover_image_url: formData.coverImageUrl || '',
        privacy: formData.privacy || 'private',
        budget: formData.budget ? Number(formData.budget) : null,
        status: 'active',
        category: finalCategory || null,
        // Payment fields - available for all events (private and public)
        participationCost: formData.participationCost ? Number(formData.participationCost) : null,
        participation_cost: formData.participationCost ? Number(formData.participationCost) : null,
        hidePaymentsFromMembers: formData.hidePaymentsFromMembers || false,
        hide_payments_from_members: formData.hidePaymentsFromMembers || false,
        visibleTabs: formData.privacy === 'public' ? formData.visibleTabs : null,
        visible_tabs: formData.privacy === 'public' ? formData.visibleTabs : null,
        paymentMethod: formData.participationCost ? (formData.paymentMethods?.[0] || formData.paymentMethod) : null,
        payment_method: formData.participationCost ? (formData.paymentMethods?.[0] || formData.paymentMethod) : null,
        paymentMethods: formData.participationCost ? formData.paymentMethods : null,
        payment_methods: formData.participationCost ? formData.paymentMethods : null,
        paymentPhone: (formData.paymentMethods?.includes('bit') || formData.paymentMethods?.includes('paybox')) ? formData.paymentPhone : null,
        payment_phone: (formData.paymentMethods?.includes('bit') || formData.paymentMethods?.includes('paybox')) ? formData.paymentPhone : null,
        bankDetails: formData.paymentMethods?.includes('bank_transfer') ? formData.bankDetails : null,
        bank_details: formData.paymentMethods?.includes('bank_transfer') ? formData.bankDetails : null,
        is_recurring: formData.isRecurring || false
      };

      console.log('[EditEvent] Sending payload:', payload);

      await updateEvent(eventId, payload);

      // Handle recurring rule changes
      if (formData.isRecurring && formData.recurrenceRule && formData.eventDate) {
        const rulePayload = {
          event_id: eventId,
          recurrence_pattern: formData.recurrenceRule.recurrence_pattern,
          recurrence_interval: formData.recurrenceRule.recurrence_interval || 1,
          recurrence_days_of_week: formData.recurrenceRule.recurrence_days_of_week || [],
          recurrence_day_of_month: formData.recurrenceRule.recurrence_day_of_month || null,
          recurrence_nth_day_of_week: formData.recurrenceRule.recurrence_nth_day_of_week || null,
          recurrence_end_type: formData.recurrenceRule.recurrence_end_type || 'NEVER',
          recurrence_end_date: formData.recurrenceRule.recurrence_end_date || null,
          recurrence_count: formData.recurrenceRule.recurrence_count || null,
          original_event_start_time: formData.eventDate ? new Date(formData.eventDate).toTimeString().slice(0, 5) : null,
          original_event_duration_minutes: formData.eventDate && formData.endDate 
            ? Math.round((new Date(formData.endDate) - new Date(formData.eventDate)) / 60000)
            : 60,
          excluded_dates: formData.recurrenceRule.excluded_dates || []
        };

        if (originalRecurringRuleId) {
          await updateRecurringEventRule(originalRecurringRuleId, rulePayload);
        } else {
          await createRecurringEventRule(rulePayload);
        }
      } else if (!formData.isRecurring && originalRecurringRuleId) {
        // Delete rule if isRecurring was turned off
        await deleteRecurringEventRule(originalRecurringRuleId);
      }

      toast.success('האירוע עודכן בהצלחה! ✨');
      navigate(createPageUrl(`EventDetail?id=${eventId}`));
    } catch (error) {
      console.error('Failed to update event:', error);
      toast.error('שגיאה בעדכון האירוע', { description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div>;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-6 text-center">
        <p className="text-xl font-semibold text-red-600 mb-4">{error}</p>
        <Button onClick={() => navigate(createPageUrl('Home'))}>חזרה לדף הבית</Button>
      </div>
    );
  }

  return (
    <div className="p-6" dir="rtl">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl(`EventDetail?id=${eventId}`))}>
            <ArrowRight className="w-5 h-5"/>
        </Button>
        <h1 className="text-2xl font-bold mr-2">עריכת אירוע</h1>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <Label htmlFor="title">שם האירוע</Label>
              <Input id="title" value={formData.title} onChange={handleInputChange} required />
            </div>
            <div>
              <Label htmlFor="location">מיקום</Label>
              <Input id="location" value={formData.location} onChange={handleInputChange} />
            </div>
            <div>
              <Label htmlFor="description">תיאור</Label>
              <Textarea id="description" value={formData.description} onChange={handleInputChange} />
            </div>
            <div>
              <Label htmlFor="budget">תקציב (אופציונלי)</Label>
              <div className="relative mt-1">
                <Input
                  id="budget"
                  type="number"
                  value={formData.budget}
                  onChange={handleInputChange}
                  placeholder="לדוגמה: 5000"
                  className="pr-10"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">₪</span>
              </div>
            </div>
            <div>
              <Label>סוג האירוע</Label>
              <Select value={formData.privacy} onValueChange={(value) => setFormData(prev => ({ ...prev, privacy: value, category: value === 'private' ? '' : prev.category }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="בחר סוג אירוע" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">🔒 פרטי - רק מוזמנים יכולים לראות</SelectItem>
                  <SelectItem value="public">🌍 ציבורי - כולם יכולים לראות ולהצטרף</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Category Selection - For all events (required) */}
            <div>
              <Label>קטגוריית האירוע *</Label>
              <p className="text-xs text-gray-500 mb-2">
                בחר קטגוריה לאירוע (לאירועי משפחה יוצג טאב אישורי הגעה)
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {[
                  { value: 'party', label: '🎉 מסיבה' },
                  { value: 'חתונה', label: '💒 חתונה' },
                  { value: 'אירוסין', label: '💍 אירוסין' },
                  { value: 'ברית מילה', label: '👶 ברית מילה' },
                  { value: 'בר מצווה', label: '🎓 בר מצווה' },
                  { value: 'בת מצווה', label: '🎓 בת מצווה' },
                  { value: 'חינה', label: '🎊 חינה' },
                  { value: 'שבת חתן', label: '🕍 שבת חתן' },
                  { value: 'birthday', label: '🎂 יום הולדת' },
                  { value: 'business', label: '💼 עסקי' },
                  { value: 'sport', label: '⚽ ספורט' },
                  { value: 'culture', label: '🎭 תרבות' },
                  { value: 'music', label: '🎵 מוזיקה' },
                  { value: 'food', label: '🍽️ אוכל' },
                  { value: 'travel', label: '✈️ טיול' },
                  { value: 'community', label: '🤝 קהילה' },
                  { value: 'other', label: '📋 אחר' }
                ].map(cat => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, category: cat.value }))}
                    className={`p-2 rounded-lg border text-xs transition-all ${
                      formData.category === cat.value
                        ? 'border-orange-500 bg-orange-50 font-medium'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Participation Cost - Available for all events */}
            <div className="p-4 border-2 border-green-200 rounded-lg bg-green-50">
              <Label className="flex items-center gap-2 text-green-800">
                💰 עלות השתתפות (אופציונלי)
              </Label>
              <p className="text-xs text-green-700 mb-2">הגדר עלות השתתפות שתוצג למשתתפים</p>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  value={formData.participationCost}
                  onChange={(e) => setFormData(prev => ({ ...prev, participationCost: e.target.value }))}
                  placeholder="לדוגמה: 50"
                  className="pr-10 bg-white"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">₪</span>
              </div>
              
              {formData.participationCost && Number(formData.participationCost) > 0 && (
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="hidePaymentsFromMembers"
                    checked={formData.hidePaymentsFromMembers}
                    onChange={(e) => setFormData(prev => ({ ...prev, hidePaymentsFromMembers: e.target.checked }))}
                    className="w-4 h-4 text-green-600 rounded border-gray-300"
                  />
                  <label htmlFor="hidePaymentsFromMembers" className="text-sm text-green-800">
                    הסתר טאב תשלומים ממשתתפים רגילים (רק מארגנים יראו)
                  </label>
                </div>
              )}
            </div>

            {/* Payment Method Settings */}
            {formData.participationCost && Number(formData.participationCost) > 0 && (
              <PaymentSettingsSection formData={formData} setFormData={setFormData} />
            )}

            {/* Public Event Settings */}
            {formData.privacy === 'public' && (
              <>
                {/* Tab Visibility Settings */}
                <div className="p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
                  <Label className="flex items-center gap-2 text-blue-800 mb-2">
                    👁️ טאבים גלויים למשתתפים
                  </Label>
                  <p className="text-xs text-blue-700 mb-3">בחר אילו טאבים יוצגו למשתתפים רגילים (מארגנים תמיד רואים הכל)</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'updates', label: '📢 עדכונים', alwaysVisible: true },
                      { id: 'tasks', label: '✅ משימות' },
                      { id: 'chat', label: '💬 צ\'אט' },
                      { id: 'polls', label: '📊 סקרים' },
                      { id: 'itinerary', label: '📅 לו"ז' },
                      { id: 'professionals', label: '👔 ספקים' },
                      { id: 'links', label: '🔗 קישורים' },
                      { id: 'gallery', label: '🖼️ גלריה' },
                      { id: 'documents', label: '📁 מסמכים' },
                      { id: 'participants', label: '👥 משתתפים' },
                      { id: 'payments', label: '💰 תשלומים' }
                    ].map(tab => {
                      const isChecked = formData.visibleTabs?.includes(tab.id);
                      return (
                        <label
                          key={tab.id}
                          className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                            isChecked 
                              ? 'border-blue-500 bg-blue-100' 
                              : 'border-gray-200 bg-white hover:border-blue-300'
                          } ${tab.alwaysVisible ? 'opacity-60' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={tab.alwaysVisible}
                            onChange={(e) => {
                              if (tab.alwaysVisible) return;
                              setFormData(prev => ({
                                ...prev,
                                visibleTabs: e.target.checked
                                  ? [...(prev.visibleTabs || []), tab.id]
                                  : (prev.visibleTabs || []).filter(t => t !== tab.id)
                              }));
                            }}
                            className="w-4 h-4 text-blue-600 rounded border-gray-300"
                          />
                          <span className="text-xs">{tab.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
            <div>
                <DateRangePicker
                    startDate={formData.eventDate}
                    endDate={formData.endDate}
                    onStartDateChange={(date) => setFormData({ ...formData, eventDate: date })}
                    onEndDateChange={(date) => setFormData({ ...formData, endDate: date })}
                    showTime={true}
                    label="תאריך האירוע"
                    placeholder="בחר תאריך או טווח תאריכים"
                    allowRange={true}
                    required={false}
                />
            </div>

            {/* Recurring Event Settings */}
            {formData.eventDate && (
              <RecurrenceSettings
                isRecurring={formData.isRecurring}
                onIsRecurringChange={(value) => setFormData(prev => ({ ...prev, isRecurring: value }))}
                recurrenceRule={formData.recurrenceRule}
                onRecurrenceRuleChange={(rule) => setFormData(prev => ({ ...prev, recurrenceRule: rule }))}
                eventDate={formData.eventDate}
              />
            )}
            {/* Start of cover image upload section */}
            <div>
              <Label>תמונת נושא</Label>
              <div className="flex items-center space-x-2 mt-2">
                <Input
                  id="imageUpload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden" // Hide the default file input
                />
                <Label
                  htmlFor="imageUpload"
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 cursor-pointer"
                >
                  {isUploadingImage ? (
                    <>
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      מעלה...
                    </>
                  ) : (
                    'העלה תמונה'
                  )}
                </Label>
                {formData.coverImageUrl && (
                  <Button variant="outline" onClick={() => setFormData(prev => ({ ...prev, coverImageUrl: '' }))} disabled={isUploadingImage}>
                    הסר תמונה
                  </Button>
                )}
              </div>
              {formData.coverImageUrl && (
                <div className="mt-4">
                  <p className="text-sm text-gray-500 mb-2">תמונה נוכחית:</p>
                  <img src={formData.coverImageUrl} alt="תצוגה מקדימה" className="rounded-lg aspect-video object-cover w-full max-w-md border" />
                </div>
              )}
            </div>
            {/* End of cover image upload section */}
          </CardContent>
        </Card>
        <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600" disabled={isSaving || isUploadingImage}>
          {isSaving ? <Loader2 className="animate-spin" /> : 'שמירת שינויים'}
        </Button>
      </form>
    </div>
  );
}
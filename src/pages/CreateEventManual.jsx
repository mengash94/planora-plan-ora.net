import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, MapPin, Upload, Loader2, ArrowRight, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import {
  createEvent,
  createEventMember,
  createTask,
  getEventTemplates,
  getTaskTemplates, // This is now used for fetching tasks from templates
  uploadFileToInstaback,
  notifyAdminsNewEvent,
  createPoll,
  listUsers,
  createNotificationAndSendPush,
  createItineraryItem,
  createRecurringEventRule
} from '@/components/instabackService';
import CreatePollDialog from '../components/event/CreatePollDialog';
import DateRangePicker from '@/components/ui/DateRangePicker';
import { compressImage } from '@/components/utils/imageCompressor';
import PaymentSettingsSection from '@/components/event/PaymentSettingsSection';
import RecurrenceSettings from '@/components/event/RecurrenceSettings';

export default function CreateEventManualPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const location = useLocation();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    eventDate: null,
    endDate: null,
    coverImageUrl: '',
    privacy: 'private',
    category: '',
    customCategory: '',
    budget: '',
    createDatePoll: false,
    createLocationPoll: false,
    dateOptions: [],
    locationOptions: [],
    datePollTitle: '',
    locationPollTitle: '',
    // Public event payment fields
    participationCost: '',
    hidePaymentsFromMembers: false,
    // Tab visibility settings for public events
    visibleTabs: ['updates', 'tasks', 'chat', 'polls', 'itinerary', 'professionals', 'links', 'gallery', 'documents', 'participants', 'payments'],
    // Payment method settings
    paymentMethod: '',
    paymentMethods: [],
    paymentPhone: '',
    bankDetails: null,
    // Recurring event settings
    isRecurring: false,
    recurrenceRule: null
  });

  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const [showDatePollDialog, setShowDatePollDialog] = useState(false);
  const [showLocationPollDialog, setShowLocationPollDialog] = useState(false);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Load template data from navigation state
  useEffect(() => {
    if (location.state?.templateData) {
      const templateData = location.state.templateData;
      console.log('[CreateEventManual] Loading template data:', templateData);
      console.log('[CreateEventManual] defaultTasks:', templateData.defaultTasks);
      console.log('[CreateEventManual] defaultItinerary:', templateData.defaultItinerary);

      setSelectedTemplate({
        ...templateData,
        defaultTasks: templateData.defaultTasks || templateData.default_tasks || [],
        defaultItinerary: templateData.defaultItinerary || templateData.default_itinerary || []
      });
      setFormData(prev => ({
        ...prev,
        title: templateData.name || templateData.title || '',
        description: templateData.description || '',
        coverImageUrl: templateData.coverImageUrl || templateData.cover_image_url || '',
        category: templateData.category || '',
        location: templateData.location || '',
        budget: templateData.budget ? String(templateData.budget) : '',
        privacy: templateData.privacy || 'private',
        participationCost: templateData.participationCost ? String(templateData.participationCost) : '',
        hidePaymentsFromMembers: templateData.hidePaymentsFromMembers || false,
        paymentMethod: templateData.paymentMethod || '',
        paymentMethods: templateData.paymentMethods || [],
        paymentPhone: templateData.paymentPhone || '',
        bankDetails: templateData.bankDetails || null
      }));
    }
  }, [location.state]);

  // Handlers for poll dialog results - now update formData
  const handleDatePollCreated = (pollData) => {
    console.log('📅 Date poll data saved:', pollData);
    setFormData(prev => ({
      ...prev,
      createDatePoll: true,
      dateOptions: pollData.options,
      datePollTitle: pollData.title,
      // Clear eventDate/endDate if a poll is created
      eventDate: null,
      endDate: null
    }));
    setShowDatePollDialog(false);
    toast.success('סקר תאריכים נשמר, ייווצר עם האירוע');
  };

  const handleLocationPollCreated = (pollData) => {
    console.log('📍 Location poll data saved:', pollData);
    setFormData(prev => ({
      ...prev,
      createLocationPoll: true,
      locationOptions: pollData.options,
      locationPollTitle: pollData.title,
      // Clear location if a poll is created
      location: ''
    }));
    setShowLocationPollDialog(false);
    toast.success('סקר מקום נשמר, ייווצר עם האירוע');
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();

    const titleValue = formData?.title;
    if (!titleValue || (typeof titleValue === 'string' && titleValue.trim().length === 0)) {
      toast.error('שם האירוע הוא שדה חובה');
      return;
    }

    if (!user?.id) {
      toast.error('אנא התחבר כדי ליצור אירוע');
      return;
    }

    // Validation for date/poll: one must be present
    if (!formData.createDatePoll && (!formData.eventDate && !formData.endDate)) {
      toast.error('יש לבחור תאריך לאירוע או ליצור סקר תאריכים.');
      return;
    }

    // Validation - category is required for all events
    if (!formData.category) {
      toast.error('יש לבחור קטגוריה לאירוע');
      return;
    }

    setIsCreating(true);

    try {
      // Prepare event data - use template category if formData.category is empty
      const finalCategory = formData.category || selectedTemplate?.category || '';
      
      const eventPayload = {
        title: String(formData.title || '').trim(),
        description: String(formData.description || '').trim(),
        location: formData.createLocationPoll ? null : String(formData.location || '').trim(),
        privacy: formData.privacy || 'private',
        category: finalCategory || null,
        owner_id: user.id, // Add snake_case
        ownerId: user.id,  // Add camelCase
        coverImageUrl: formData.coverImageUrl || '',
        cover_image_url: formData.coverImageUrl || '', // Add snake_case
        budget: formData.budget ? Number(formData.budget) : null,
        status: 'active',
        // Payment fields - available for all events (private and public)
        participationCost: formData.participationCost ? Number(formData.participationCost) : null,
        participation_cost: formData.participationCost ? Number(formData.participationCost) : null,
        hidePaymentsFromMembers: formData.hidePaymentsFromMembers || false,
        hide_payments_from_members: formData.hidePaymentsFromMembers || false,
        visibleTabs: formData.privacy === 'public' ? formData.visibleTabs : null,
        visible_tabs: formData.privacy === 'public' ? formData.visibleTabs : null,
        // Payment method settings - support multiple methods for all events
        paymentMethod: formData.participationCost ? (formData.paymentMethods?.[0] || formData.paymentMethod) : null,
        payment_method: formData.participationCost ? (formData.paymentMethods?.[0] || formData.paymentMethod) : null,
        paymentMethods: formData.participationCost ? formData.paymentMethods : null,
        payment_methods: formData.participationCost ? formData.paymentMethods : null,
        paymentPhone: (formData.paymentMethods?.includes('bit') || formData.paymentMethods?.includes('paybox')) ? formData.paymentPhone : null,
        payment_phone: (formData.paymentMethods?.includes('bit') || formData.paymentMethods?.includes('paybox')) ? formData.paymentPhone : null,
        bankDetails: formData.paymentMethods?.includes('bank_transfer') ? formData.bankDetails : null,
        bank_details: formData.paymentMethods?.includes('bank_transfer') ? formData.bankDetails : null,
        // Recurring event fields
        is_recurring: formData.isRecurring || false,
        isRecurring: formData.isRecurring || false
      };

      // Handle eventDate - convert to ISO if needed
      if (!formData.createDatePoll && formData.eventDate) { // Only set if no date poll
        eventPayload.eventDate = typeof formData.eventDate === 'string'
          ? formData.eventDate
          : (formData.eventDate instanceof Date
            ? formData.eventDate.toISOString()
            : new Date(formData.eventDate).toISOString());
        eventPayload.event_date = eventPayload.eventDate; // Add snake_case
      } else {
        eventPayload.eventDate = null;
        eventPayload.event_date = null; // Add snake_case
      }

      // Handle endDate - convert to ISO if needed
      if (!formData.createDatePoll && formData.endDate) { // Only set if no date poll
        eventPayload.endDate = typeof formData.endDate === 'string'
          ? formData.endDate
          : (formData.endDate instanceof Date
            ? formData.endDate.toISOString()
            : new Date(formData.endDate).toISOString());
        eventPayload.end_date = eventPayload.endDate; // Add snake_case
      } else if (!formData.createDatePoll && eventPayload.eventDate) {
        // If no end date specified and no date poll, use start date as end date (single day event)
        eventPayload.endDate = eventPayload.eventDate;
        eventPayload.end_date = eventPayload.eventDate; // Add snake_case
      } else {
        eventPayload.endDate = null;
        eventPayload.end_date = null; // Add snake_case
      }

      // Handle recurring event rule
      if (formData.isRecurring && formData.recurrenceRule) {
        eventPayload.recurrenceRule = {
          ...formData.recurrenceRule,
          original_event_start_time: eventPayload.eventDate ? new Date(eventPayload.eventDate).toTimeString().slice(0, 5) : null,
          original_event_duration_minutes: eventPayload.eventDate && eventPayload.endDate 
            ? Math.round((new Date(eventPayload.endDate) - new Date(eventPayload.eventDate)) / 60000)
            : 60
        };
      }

      console.log('[CreateEventManual] Creating event with payload:', eventPayload);
      console.log('[CreateEventManual] Category debug - formData.category:', formData.category, '| selectedTemplate?.category:', selectedTemplate?.category, '| finalCategory:', finalCategory);

      // Create the event
      const newEvent = await createEvent(eventPayload);
      const eventId = newEvent?.id || newEvent?.eventId;

      if (!eventId) {
        throw new Error('Failed to create event - no ID returned');
      }

      console.log('✅ Event created:', eventId);

      // Create RecurringEventRule if event is recurring
      if (formData.isRecurring && formData.recurrenceRule) {
        try {
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
            original_event_start_time: eventPayload.eventDate ? new Date(eventPayload.eventDate).toTimeString().slice(0, 5) : null,
            original_event_duration_minutes: eventPayload.eventDate && eventPayload.endDate 
              ? Math.round((new Date(eventPayload.endDate) - new Date(eventPayload.eventDate)) / 60000)
              : 60,
            excluded_dates: []
          };
          
          await createRecurringEventRule(rulePayload);
          console.log('✅ Recurring event rule created');
          toast.success('הוגדר אירוע חוזר! 🔄');
        } catch (recurringError) {
          console.warn('Failed to create recurring rule:', recurringError);
          toast.warning('האירוע נוצר אך הגדרת החזרתיות נכשלה');
        }
      }

      // Create EventMember record for owner
      try {
        await createEventMember({
          eventId,
          userId: user.id,
          role: 'organizer' // Changed role from 'owner' to 'organizer'
        });
      } catch (memberError) {
        console.warn('Failed to create event membership:', memberError);
      }

      // If template was used, create tasks from template
      if (selectedTemplate?.templateId || selectedTemplate?.id) {
        try {
          const templateId = selectedTemplate.templateId || selectedTemplate.id;
          console.log('[CreateEventManual] Loading tasks from template:', templateId);

          const templateTasks = await getTaskTemplates(templateId);
          console.log('[CreateEventManual] Template tasks loaded:', templateTasks);

          if (templateTasks && templateTasks.length > 0) {
            for (const taskTemplate of templateTasks) {
              if (!taskTemplate) continue;

              try {
                const taskData = {
                  eventId,
                  title: String(taskTemplate.title || 'משימה'),
                  description: String(taskTemplate.description || taskTemplate.title || ''), // Adjusted description fallback
                  status: 'todo',
                  priority: taskTemplate.priority || 'medium'
                };

                // Calculate due date based on event date and template offset (days_before)
                if (typeof taskTemplate.days_before === 'number' && eventPayload.eventDate) {
                  const eventDate = new Date(eventPayload.eventDate);
                  const dueDate = new Date(eventDate);
                  dueDate.setDate(dueDate.getDate() - taskTemplate.days_before); // Subtract days
                  taskData.dueDate = dueDate.toISOString();
                }

                await createTask(taskData);
              } catch (taskError) {
                console.warn('[CreateEventManual] Failed to create task from template:', taskError);
              }
            }
            toast.success(`נוצרו ${templateTasks.length} משימות מהתבנית! 📋`);
          } else {
            console.log('No tasks found in template');
          }
        } catch (error) {
          console.warn('[CreateEventManual] Failed to load template tasks:', error);
          toast.warning('לא ניתן היה לטעון משימות מהתבנית');
        }
      } else if (selectedTemplate?.defaultTasks && Array.isArray(selectedTemplate.defaultTasks) && selectedTemplate.defaultTasks.length > 0) {
        // Fallback to original defaultTasks if templateId/id not present (e.g. from inline template data)
        console.log('[CreateEventManual] Creating tasks from embedded defaultTasks:', selectedTemplate.defaultTasks);

        for (const taskTemplate of selectedTemplate.defaultTasks) {
          if (!taskTemplate) continue;

          try {
            const taskData = {
              eventId,
              title: String(taskTemplate.title || 'משימה'),
              description: String(taskTemplate.description || ''),
              status: 'todo',
              priority: taskTemplate.priority || 'medium'
            };

            // Calculate due date based on event date and template offset
            if (typeof taskTemplate.due_offset_days === 'number' && eventPayload.eventDate) {
              const eventDate = new Date(eventPayload.eventDate);
              const dueDate = new Date(eventDate);
              dueDate.setDate(dueDate.getDate() + taskTemplate.due_offset_days);
              taskData.dueDate = dueDate.toISOString();
            }

            await createTask(taskData);
          } catch (taskError) {
            console.warn('[CreateEventManual] Failed to create task from embedded template:', taskError);
          }
        }
        toast.success(`נוצרו ${selectedTemplate.defaultTasks.length} משימות מהתבנית! 📋`);
      }

      // Create itinerary items from template
      if (selectedTemplate?.defaultItinerary && Array.isArray(selectedTemplate.defaultItinerary) && selectedTemplate.defaultItinerary.length > 0) {
        console.log('[CreateEventManual] Creating itinerary from template:', selectedTemplate.defaultItinerary);
        
        let itineraryCreated = 0;
        for (const item of selectedTemplate.defaultItinerary) {
          if (!item) continue;

          try {
            // Calculate actual date/time based on event date and offset
            let itemDate = null;
            let itemEndDate = null;
            
            if (eventPayload.eventDate) {
              const eventStart = new Date(eventPayload.eventDate);
              const offsetMinutes = item.offsetMinutes || 0;
              const duration = item.duration || 30;
              
              itemDate = new Date(eventStart.getTime() + offsetMinutes * 60 * 1000);
              itemEndDate = new Date(itemDate.getTime() + duration * 60 * 1000);
            }

            await createItineraryItem({
              eventId,
              title: String(item.title || 'פריט בלוז'),
              date: itemDate ? itemDate.toISOString() : null,
              endDate: itemEndDate ? itemEndDate.toISOString() : null,
              order: item.order || 0,
              location: item.location || ''
            });
            itineraryCreated++;
          } catch (itinError) {
            console.warn('[CreateEventManual] Failed to create itinerary item:', itinError);
          }
        }
        
        if (itineraryCreated > 0) {
          toast.success(`נוצרו ${itineraryCreated} פריטים בלוח הזמנים! 📅`);
        }
      }

      // Create polls if requested
      if (formData.createDatePoll && formData.dateOptions?.length > 0) {
        try {
          // Helper to convert to ISO string safely
          const toISOSafe = (dateValue) => {
            if (!dateValue) return null;
            if (typeof dateValue === 'string') {
              // If it's already a full ISO string (e.g., from DB or another ISO conversion)
              if (dateValue.includes('T') && dateValue.includes('Z')) return dateValue;
              try {
                // Attempt to convert other string formats
                const date = new Date(dateValue);
                if (!isNaN(date.getTime())) {
                  return date.toISOString();
                }
                return null;
              } catch {
                return null;
              }
            }
            if (dateValue instanceof Date) {
              return dateValue.toISOString();
            }
            try {
              // Attempt to convert other types, like numbers (timestamps)
              const date = new Date(dateValue);
              if (!isNaN(date.getTime())) {
                return date.toISOString();
              }
              return null;
            } catch {
              return null;
            }
          };

          const dateOptions = formData.dateOptions.map((opt, idx) => {
            const startISO = toISOSafe(opt.startDate || opt.date);
            const endISO = toISOSafe(opt.endDate);

            return {
              id: opt.id || String(idx),
              text: opt.text || `תאריך ${idx + 1}`,
              date: startISO, // Primary date for sorting/display
              startDate: startISO,
              endDate: endISO
            };
          }).filter(opt => opt.date); // Only include options with a valid 'date' (startDate)

          if (dateOptions.length > 0) {
            await createPoll({
              eventId: newEvent.id,
              userId: user.id,
              title: formData.datePollTitle || 'מתי נקבע את האירוע?', // Use saved title
              type: 'date',
              options: dateOptions,
              allowMultiple: false,
              isActive: true
            });

            toast.success('סקר תאריכים נוצר! 📅');
          }
        } catch (pollError) {
          console.warn('Failed to create date poll:', pollError);
          toast.warning('לא ניתן היה ליצור סקר תאריכים');
        }
      }

      if (formData.createLocationPoll && formData.locationOptions?.length > 0) {
        try {
          const locationOptions = formData.locationOptions.map((opt, idx) => ({
            id: opt.id || String(idx),
            text: opt.text || opt.location || `מיקום ${idx + 1}`,
            location: opt.location || opt.text
          }));

          await createPoll({
            eventId: newEvent.id,
            userId: user.id,
            title: formData.locationPollTitle || 'איפה נקיים את האירוע?', // Use saved title
            type: 'location',
            options: locationOptions,
            allowMultiple: false,
            isActive: true
          });

          toast.success('סקר מיקומים נוצר! 📍');
        } catch (pollError) {
          console.warn('Failed to create location poll:', pollError);
          toast.warning('לא ניתן היה ליצור סקר מיקומים');
        }
      }

      // Send notification to admins
      try {
        console.log('📧 Notifying admins about new event...');

        const creatorName = user.name ||
                           user.full_name ||
                           `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
                           user.email ||
                           'משתמש';

        // 1. Call Instaback function (for logging/legacy)
        await notifyAdminsNewEvent({
          eventId: newEvent.id,
          eventTitle: newEvent.title,
          creatorId: user.id,
          creatorName: creatorName
        }).catch(err => console.warn('InstaBack notify failed (optional):', err)); // Use catch to prevent blocking

        // 2. Get list of admins and send direct notifications (preserving comprehensive logic)
        const allUsers = await listUsers();
        const admins = allUsers.filter(u => u.role === 'admin' && u.id !== user.id);

        console.log(`Found ${admins.length} admins to notify`);

        // 3. Create in-app notification and send push notification for each admin
        for (const admin of admins) {
          try {
            await createNotificationAndSendPush({
              userId: admin.id,
              type: 'new_event_created',
              title: 'אירוע חדש נוצר 🎉',
              message: `${creatorName} יצר אירוע חדש: "${newEvent.title}"`,
              eventId: newEvent.id,
              actionUrl: `https://register.plan-ora.net${createPageUrl(`EventDetail?id=${newEvent.id}`)}`,
              priority: 'normal'
            });

            console.log(`✅ Notified admin: ${admin.email} (ID: ${admin.id})`);
          } catch (adminError) {
            console.warn(`Failed to notify admin ${admin.email} (ID: ${admin.id}):`, adminError);
          }
        }
      } catch (notifyError) {
        console.warn('Failed to notify admins in bulk:', notifyError);
      }

      toast.success('האירוע נוצר בהצלחה! 🎉', {
        description: 'מועבר לדף האירוע...'
      });

      // Wait a bit to ensure everything is saved and notifications are sent
      await new Promise(resolve => setTimeout(resolve, 800));

      navigate(createPageUrl(`EventDetail?id=${eventId}&new=true`)); // Added &new=true

    } catch (error) {
      console.error('[CreateEventManual] Error creating event:', error);
      toast.error('שגיאה ביצירת האירוע: ' + (error?.message || 'שגיאה לא ידועה'));
    } finally {
      setIsCreating(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('אנא בחר קובץ תמונה');
      return;
    }

    setIsUploadingImage(true);
    
    try {
      toast.loading('מכין את התמונה... 🖼️');

      // Compress image
      console.log('[CreateEvent] Compressing cover image...');
      const compressedFile = await compressImage(file, {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.85
      });

      console.log('[CreateEvent] Uploading compressed cover image...');
      const result = await uploadFileToInstaback(compressedFile, user.id, 'event_covers');
      
      if (result?.file_url) {
        setFormData(prev => ({ ...prev, coverImageUrl: result.file_url }));
        toast.success('תמונת השער הועלתה בהצלחה! ✅');
      } else {
        throw new Error('לא התקבל URL לתמונה');
      }
    } catch (error) {
      console.error('[CreateEvent] Failed to upload cover image:', error);
      toast.error('שגיאה בהעלאת תמונת השער');
    } finally {
      setIsUploadingImage(false);
      e.target.value = null; // Reset the input to allow re-uploading the same file
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50 pb-20" style={{ direction: 'rtl' }}>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <Button
          variant="ghost"
          onClick={() => navigate(createPageUrl('CreateEvent'))}
          className="mb-6"
        >
          <ArrowRight className="w-4 h-4 ml-2" />
          חזור לבחירת שיטה
        </Button>

        <h2 className="text-2xl font-semibold mb-6 text-center">צור אירוע חדש</h2>

        <form onSubmit={handleCreateEvent} className="space-y-6">
          <div>
            <Label htmlFor="title">שם האירוע *</Label>
            <Input
              id="title"
              value={formData.title || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value || '' }))}
              placeholder="למשל: מסיבת יום הולדת"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">תיאור</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value || '' }))}
              placeholder="תאר את האירוע..."
              rows={4}
            />
          </div>

          <div>
            <Label htmlFor="location">מיקום</Label>
            <div className="relative">
              <MapPin className="absolute right-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                id="location"
                value={formData.location || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value || '' }))}
                placeholder="איפה האירוע מתקיים?"
                className="pr-10"
                disabled={formData.createLocationPoll}
              />
              {formData.createLocationPoll && <p className="text-xs text-gray-500 mt-1">מיקום יוצג כסקר, שדה זה מושבת.</p>}
            </div>
          </div>

          {/* Date Range Picker */}
          <DateRangePicker
            startDate={formData.eventDate}
            endDate={formData.endDate}
            onStartDateChange={(date) => setFormData({ ...formData, eventDate: date })}
            onEndDateChange={(date) => setFormData({ ...formData, endDate: date })}
            showTime={true}
            label="תאריך האירוע"
            placeholder="בחר תאריך או טווח תאריכים"
            allowRange={true}
            required={true}
            disabled={formData.createDatePoll}
          />
          {formData.createDatePoll && <p className="text-xs text-gray-500 mt-1">תאריך יוצג כסקר, שדה זה מושבת.</p>}

          {/* Recurring Event Settings */}
          {!formData.createDatePoll && formData.eventDate && (
            <RecurrenceSettings
              isRecurring={formData.isRecurring}
              onIsRecurringChange={(value) => setFormData(prev => ({ ...prev, isRecurring: value }))}
              recurrenceRule={formData.recurrenceRule}
              onRecurrenceRuleChange={(rule) => setFormData(prev => ({ ...prev, recurrenceRule: rule }))}
              eventDate={formData.eventDate}
            />
          )}

          {/* Poll buttons section */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">סקרים (אופציונלי)</Label>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDatePollDialog(true)}
                className={`flex-1 ${formData.createDatePoll ? 'border-green-500 bg-green-50' : ''}`}
              >
                <Calendar className="w-4 h-4 ml-2" />
                {formData.createDatePoll ? '✓ סקר תאריכים הוגדר' : 'הוסף סקר תאריכים'}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => setShowLocationPollDialog(true)}
                className={`flex-1 ${formData.createLocationPoll ? 'border-green-500 bg-green-50' : ''}`}
              >
                <MapPin className="w-4 h-4 ml-2" />
                {formData.createLocationPoll ? '✓ סקר מקום הוגדר' : 'הוסף סקר מקום'}
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              הסקרים ייווצרו אוטומטית עם האירוע ויאפשרו לחברי האירוע להצביע
            </p>
          </div>

          {/* Budget */}
          <div>
            <Label htmlFor="budget">תקציב (אופציונלי)</Label>
            <div className="relative mt-1">
              <Input
                id="budget"
                type="number"
                value={formData.budget}
                onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
                placeholder="לדוגמה: 5000"
                className="pr-10"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">₪</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">הגדר תקציב כדי לעקוב אחרי הוצאות האירוע</p>
          </div>

          {/* Privacy Selection */}
          <div>
            <Label>סוג האירוע</Label>
            <div className="mt-2 flex gap-3">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, privacy: 'private', category: '' }))}
                className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                  formData.privacy === 'private'
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <span className="text-lg">🔒</span>
                  <span className="font-medium">פרטי</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">רק מוזמנים יכולים לראות ולהצטרף</p>
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, privacy: 'public' }))}
                className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                  formData.privacy === 'public'
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <span className="text-lg">🌍</span>
                  <span className="font-medium">ציבורי</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">כל המשתמשים יכולים לראות ולהצטרף</p>
              </button>
            </div>
          </div>

          {/* Category Selection - For all events (required) - auto-filled from template */}
          <div>
            <Label htmlFor="category">קטגוריית האירוע *</Label>
            {selectedTemplate?.category && (
              <p className="text-xs text-green-600 mb-2">
                ✓ הקטגוריה נבחרה אוטומטית מהתבנית
              </p>
            )}
            {!selectedTemplate?.category && (
              <p className="text-xs text-gray-500 mb-2">
                בחר קטגוריה לאירוע (לאירועי משפחה יוצג טאב אישורי הגעה)
              </p>
            )}
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
            <Label htmlFor="participationCost" className="flex items-center gap-2 text-green-800">
              💰 עלות השתתפות (אופציונלי)
            </Label>
            <p className="text-xs text-green-700 mb-2">הגדר עלות השתתפות שתוצג למשתתפים</p>
            <div className="relative">
              <Input
                id="participationCost"
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
              <>
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
              </>
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

          {/* Image upload section */}
          <div>
            <Label>תמונת שער</Label>
            <div className="mt-2">
              {formData.coverImageUrl ? (
                <div className="relative">
                  <img
                    src={formData.coverImageUrl}
                    alt="Cover"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => setFormData(prev => ({ ...prev, coverImageUrl: '' }))}
                    className="absolute top-2 left-2"
                  >
                    הסר
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-orange-400 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {isUploadingImage ? (
                      <Loader2 className="w-10 h-10 text-orange-500 animate-spin mb-2" />
                    ) : (
                      <ImageIcon className="w-10 h-10 text-gray-400 mb-2" />
                    )}
                    <p className="text-sm text-gray-600">לחץ להעלאת תמונה</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload} // Changed to pass the event directly
                    disabled={isUploadingImage}
                  />
                </label>
              )}
            </div>
          </div>

          <Button
            type="submit"
            disabled={isCreating}
            className="w-full bg-orange-500 hover:bg-orange-600"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                יוצר אירוע...
              </>
            ) : (
              <>
                צור אירוע
                <ArrowRight className="w-4 h-4 mr-2" />
              </>
            )}
          </Button>
        </form>
      </div>

      {selectedTemplate?.defaultTasks && Array.isArray(selectedTemplate.defaultTasks) && selectedTemplate.defaultTasks.length > 0 && (
        <Card className="mt-6 max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>משימות שייווצרו ({selectedTemplate.defaultTasks.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {selectedTemplate.defaultTasks.map((tt, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <div className="w-2 h-2 bg-orange-400 rounded-full" />
                  <span className="text-sm">{tt?.title || 'משימה'}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Date Poll Dialog */}
      {showDatePollDialog && (
        <CreatePollDialog
          isOpen={showDatePollDialog}
          onOpenChange={setShowDatePollDialog}
          onPollCreated={handleDatePollCreated}
          eventId={null}
          currentUserId={user?.id}
          previewMode={true}
        />
      )}

      {/* Location Poll Dialog */}
      {showLocationPollDialog && (
        <CreatePollDialog
          isOpen={showLocationPollDialog}
          onOpenChange={setShowLocationPollDialog}
          onPollCreated={handleLocationPollCreated}
          eventId={null}
          currentUserId={user?.id}
          previewMode={true}
        />
      )}
    </div>
  );
}
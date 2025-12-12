
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Plus, X, Loader2 } from 'lucide-react';
import { createPoll } from '@/components/instabackService';
import { toast } from 'sonner';
import DateRangePicker from '@/components/ui/DateRangePicker';

export default function CreatePollDialog({
  isOpen,
  onOpenChange, // Corresponds to onOpenChange in Dialog, renamed from onClose
  eventId,
  onPollCreated,
  currentUserId, // New prop
  previewMode = false // NEW: preview mode for creating polls before event exists
}) {
  const [title, setTitle] = useState('');
  const [pollType, setPollType] = useState('date'); // Default to 'date' as per outline
  const [options, setOptions] = useState([
    { id: crypto.randomUUID(), startDate: null, endDate: null }, // Default to date-specific options
    { id: crypto.randomUUID(), startDate: null, endDate: null },
  ]);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [error, setError] = useState(''); // State for form-level errors
  const [isSubmitting, setIsSubmitting] = useState(false); // Renamed from isCreating

  // Removed useEffect for forcedType as forcedType prop is removed

  const handleTypeChange = (newType) => {
    setPollType(newType);
    let newOptions;
    if (newType === 'date') {
      newOptions = [{ id: crypto.randomUUID(), startDate: null, endDate: null }, { id: crypto.randomUUID(), startDate: null, endDate: null }];
    } else if (newType === 'location') {
      newOptions = [{ id: crypto.randomUUID(), text: '', location: '' }, { id: crypto.randomUUID(), text: '', location: '' }];
    } else { // generic
      newOptions = [{ id: crypto.randomUUID(), text: '' }, { id: crypto.randomUUID(), text: '' }];
    }
    setOptions(newOptions);
  };

  const handleAddOption = () => {
    let newOption;
    if (pollType === 'date') {
      newOption = { id: crypto.randomUUID(), startDate: null, endDate: null };
    } else if (pollType === 'location') {
      newOption = { id: crypto.randomUUID(), text: '', location: '' };
    } else { // generic
      newOption = { id: crypto.randomUUID(), text: '' };
    }
    setOptions(prev => [...prev, newOption]);
  };

  const handleRemoveOption = (id) => {
    if (options.length <= 2) {
      toast.error(pollType === 'date' ? 'חייבות להיות לפחות 2 אפשרויות תאריך' : 'חייבות להיות לפחות 2 אפשרויות');
      return;
    }
    setOptions(options.filter((opt) => opt.id !== id));
  };

  const handleOptionChange = (id, field, value) => {
    setOptions(prevOptions => prevOptions.map((opt) =>
      opt.id === id ? { ...opt, [field]: value } : opt
    ));
  };

  const handleCancel = () => {
    // Reset form states
    setTitle('');
    setPollType('date'); // Reset to default type
    setOptions([
      { id: crypto.randomUUID(), startDate: null, endDate: null }, // Reset to default date options
      { id: crypto.randomUUID(), startDate: null, endDate: null },
    ]);
    setAllowMultiple(false);
    setError(''); // Clear any errors
    // Close dialog
    if (typeof onOpenChange === 'function') {
      onOpenChange(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); // Clear previous errors

    if (!title?.trim()) {
      setError('נא להזין כותרת לסקר');
      return;
    }

    setIsSubmitting(true);

    try {
      // Helper to convert to ISO string safely
      const toISOSafe = (dateValue) => {
        if (!dateValue) return null;
        if (typeof dateValue === 'string') {
          if (dateValue.includes('T') && dateValue.includes('Z')) return dateValue;
          try {
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
          const date = new Date(dateValue);
          if (!isNaN(date.getTime())) {
            return date.toISOString();
          }
          return null;
        } catch {
          return null;
        }
      };

      let finalOptions = [];

      if (pollType === 'date') {
        finalOptions = options.map((opt, idx) => {
          const startISO = toISOSafe(opt.startDate || opt.date);
          const endISO = toISOSafe(opt.endDate);

          const optionData = {
            id: opt.id || `option_${idx}`,
            text: opt.text?.trim() || `אפשרות תאריך ${idx + 1}`,
            date: startISO, // Keep for backward compatibility
          };
          
          // Add start_date and end_date if they exist
          if (startISO) {
            optionData.start_date = startISO;
            optionData.startDate = startISO;
          }
          if (endISO) {
            optionData.end_date = endISO;
            optionData.endDate = endISO;
          }
          
          return optionData;
        }).filter(opt => opt.start_date);

        if (finalOptions.length < 2) {
          setError('נא להוסיף לפחות 2 תאריכים תקפים');
          setIsSubmitting(false);
          return;
        }

      } else if (pollType === 'location') {
        finalOptions = options.map((opt, idx) => ({
          id: opt.id || `option_${idx}`,
          text: (opt.text || opt.location || `מיקום ${idx + 1}`).trim(),
          location: (opt.location || opt.text || '').trim(),
        })).filter(opt => !!opt.location.trim()); // Filter out options with empty location

        if (finalOptions.length < 2) {
          setError('נא להוסיף לפחות 2 מקומות תקפים');
          setIsSubmitting(false);
          return;
        }

      } else { // Generic poll
        finalOptions = options.map((opt, idx) => ({
          id: opt.id || `option_${idx}`,
          text: (opt.text || `אופציה ${idx + 1}`).trim(),
        })).filter(opt => !!opt.text.trim()); // Filter out options with empty text

        if (finalOptions.length < 2) {
          setError('נא להוסיף לפחות 2 אפשרויות תקפות');
          setIsSubmitting(false);
          return;
        }
      }

      // If preview mode, just return the poll data without creating it
      if (previewMode) {
        const pollData = {
          title: title.trim(),
          type: pollType,
          options: finalOptions,
          allowMultiple: allowMultiple,
        };

        toast.success('הסקר נשמר, ייווצר עם האירוע');
        
        // Reset form
        setTitle('');
        setPollType('date');
        setOptions([
          { id: crypto.randomUUID(), startDate: null, endDate: null },
          { id: crypto.randomUUID(), startDate: null, endDate: null },
        ]);
        setAllowMultiple(false);
        setError(''); // Clear any errors
        
        // Close dialog
        if (typeof onOpenChange === 'function') {
          onOpenChange(false);
        }
        
        if (onPollCreated) {
          onPollCreated(pollData); // Pass the data back
        }
        
        setIsSubmitting(false);
        return; // Exit here for preview mode
      }

      // Normal mode - create poll on server
      if (!eventId) {
        setError('שגיאה: חסר מזהה אירוע ליצירת סקר.');
        setIsSubmitting(false);
        return;
      }
      if (!currentUserId) {
        setError('שגיאה: חסר מזהה משתמש ליצירת סקר.');
        setIsSubmitting(false);
        return;
      }

      const pollPayload = {
        eventId,
        userId: currentUserId, // Added currentUserId
        title: title.trim(),
        type: pollType,
        options: finalOptions,
        allowMultiple: allowMultiple,
        isActive: true,
      };

      await createPoll(pollPayload);

      console.log('[CreatePollDialog] Poll created successfully');

      toast.success('הסקר נוצר בהצלחה! 🎉', {
        description: 'המשתתפים יכולים להצביע עכשיו',
        duration: 3000,
      });

      // Reset form
      setTitle('');
      setPollType('date');
      setOptions([
        { id: crypto.randomUUID(), startDate: null, endDate: null },
        { id: crypto.randomUUID(), startDate: null, endDate: null },
      ]);
      setAllowMultiple(false);
      
      onOpenChange(false);

      if (onPollCreated) {
        console.log('[CreatePollDialog] Calling onPollCreated');
        onPollCreated(); // Notify parent to refresh
      }

    } catch (error) {
      console.error('Failed to create poll:', error);
      setError(error.message || 'שגיאה ביצירת הסקר');
      toast.error('שגיאה ביצירת הסקר', {
        description: error.message || 'אנא נסה שוב',
        duration: 4000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>יצירת סקר חדש</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* כותרת */}
          <div className="space-y-2">
            <Label htmlFor="poll-title">כותרת הסקר</Label>
            <Input
              id="poll-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="למשל: באיזה תאריך נקיים את האירוע?"
              required
            />
          </div>

          {/* סוג הסקר */}
          <div className="space-y-2">
            <Label>סוג סקר</Label>
            <Select
              value={pollType}
              onValueChange={handleTypeChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="בחר סוג סקר" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">טווח תאריכים</SelectItem>
                <SelectItem value="location">מיקום</SelectItem>
                <SelectItem value="generic">מותאם אישית</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* אפשר בחירה מרובה */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="allow-multiple"
              checked={allowMultiple}
              onChange={(e) => setAllowMultiple(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <Label htmlFor="allow-multiple" className="cursor-pointer">
              אפשר בחירה מרובה
            </Label>
          </div>

          {/* אפשרויות */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>אפשרויות</Label>
              <Button
                type="button"
                onClick={handleAddOption}
                size="sm"
                variant="outline"
              >
                <Plus className="w-4 h-4 ml-1" /> הוסף אפשרות
              </Button>
            </div>

            {pollType === 'date' ? (
              // Date Range Options
              <div className="space-y-3">
                {options.map((option, index) => (
                  <div key={option.id} className="space-y-2 p-3 border rounded-lg bg-gray-50">
                    <div className="flex items-start justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        אופציה {index + 1}
                      </span>
                      {options.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveOption(option.id)}
                          className="text-red-500 hover:text-red-700 h-6 w-6"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <DateRangePicker
                      startDate={option.startDate}
                      endDate={option.endDate}
                      onStartDateChange={(date) => handleOptionChange(option.id, 'startDate', date)}
                      onEndDateChange={(date) => handleOptionChange(option.id, 'endDate', date)}
                      showTime={true}
                      label=""
                      placeholder="בחר תאריך או טווח"
                      allowRange={true}
                      required={true}
                      requireEndDate={false}
                    />
                  </div>
                ))}
              </div>
            ) : (
              // Generic / Location Options
              options.map((option, index) => (
                <div
                  key={option.id}
                  className="p-4 border rounded-lg space-y-3 bg-gray-50"
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 space-y-3">
                      {pollType === 'location' ? (
                        <Input
                          placeholder="כתובת או שם מקום"
                          value={option.location}
                          onChange={(e) =>
                            handleOptionChange(
                              option.id,
                              'location',
                              e.target.value
                            )
                          }
                          required
                        />
                      ) : ( // generic type
                        <Input
                          placeholder={`אפשרות ${index + 1}`}
                          value={option.text}
                          onChange={(e) =>
                            handleOptionChange(option.id, 'text', e.target.value)
                          }
                          required
                        />
                      )}
                    </div>

                    {options.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveOption(option.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {error && <p className="text-red-500 text-sm text-center mt-4">{error}</p>}

          <DialogFooter className="gap-2">
            <Button
              type="button" // Changed to type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              ביטול
            </Button>
            <Button
              type="submit" // Changed to type="submit"
              disabled={isSubmitting || !title || options.length === 0}
              className="bg-orange-500 hover:bg-orange-600" // Added color class
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" /> יוצר סקר...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 ml-2" />
                  צור סקר
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

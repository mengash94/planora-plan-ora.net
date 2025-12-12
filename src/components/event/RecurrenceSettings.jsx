import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Repeat, CalendarDays } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

const DAYS_OF_WEEK = [
  { value: 0, label: 'א׳', fullLabel: 'ראשון' },
  { value: 1, label: 'ב׳', fullLabel: 'שני' },
  { value: 2, label: 'ג׳', fullLabel: 'שלישי' },
  { value: 3, label: 'ד׳', fullLabel: 'רביעי' },
  { value: 4, label: 'ה׳', fullLabel: 'חמישי' },
  { value: 5, label: 'ו׳', fullLabel: 'שישי' },
  { value: 6, label: 'ש׳', fullLabel: 'שבת' }
];

const RECURRENCE_PATTERNS = [
  { value: 'DAILY', label: 'יומי' },
  { value: 'WEEKLY', label: 'שבועי' },
  { value: 'MONTHLY_BY_DAY_OF_MONTH', label: 'חודשי (לפי יום בחודש)' },
  { value: 'MONTHLY_BY_DAY_OF_WEEK', label: 'חודשי (לפי יום בשבוע)' },
  { value: 'YEARLY', label: 'שנתי' }
];

const RECURRENCE_END_TYPES = [
  { value: 'NEVER', label: 'ללא סיום' },
  { value: 'ON_DATE', label: 'עד תאריך' },
  { value: 'AFTER_COUNT', label: 'אחרי מספר חזרות' }
];

const WEEK_OF_MONTH = [
  { value: 1, label: 'ראשון בחודש' },
  { value: 2, label: 'שני בחודש' },
  { value: 3, label: 'שלישי בחודש' },
  { value: 4, label: 'רביעי בחודש' },
  { value: -1, label: 'אחרון בחודש' }
];

export default function RecurrenceSettings({ 
  isRecurring, 
  onIsRecurringChange,
  recurrenceRule, 
  onRecurrenceRuleChange,
  eventDate 
}) {
  const [localRule, setLocalRule] = useState({
    recurrence_pattern: 'WEEKLY',
    recurrence_interval: 1,
    recurrence_days_of_week: [],
    recurrence_day_of_month: 1,
    recurrence_nth_day_of_week: { week: 1, day: 0 },
    recurrence_end_type: 'NEVER',
    recurrence_end_date: null,
    recurrence_count: 10,
    ...recurrenceRule
  });

  // אתחול ימי השבוע לפי תאריך האירוע
  useEffect(() => {
    if (eventDate && localRule.recurrence_days_of_week.length === 0) {
      const dayOfWeek = new Date(eventDate).getDay();
      setLocalRule(prev => ({
        ...prev,
        recurrence_days_of_week: [dayOfWeek],
        recurrence_day_of_month: new Date(eventDate).getDate(),
        recurrence_nth_day_of_week: {
          week: Math.ceil(new Date(eventDate).getDate() / 7),
          day: dayOfWeek
        }
      }));
    }
  }, [eventDate]);

  useEffect(() => {
    if (isRecurring) {
      onRecurrenceRuleChange(localRule);
    }
  }, [localRule, isRecurring]);

  const updateRule = (field, value) => {
    setLocalRule(prev => ({ ...prev, [field]: value }));
  };

  const toggleDayOfWeek = (day) => {
    setLocalRule(prev => {
      const days = prev.recurrence_days_of_week || [];
      if (days.includes(day)) {
        return { ...prev, recurrence_days_of_week: days.filter(d => d !== day) };
      } else {
        return { ...prev, recurrence_days_of_week: [...days, day].sort() };
      }
    });
  };

  const getIntervalLabel = () => {
    switch (localRule.recurrence_pattern) {
      case 'DAILY': return 'ימים';
      case 'WEEKLY': return 'שבועות';
      case 'MONTHLY_BY_DAY_OF_MONTH':
      case 'MONTHLY_BY_DAY_OF_WEEK': return 'חודשים';
      case 'YEARLY': return 'שנים';
      default: return '';
    }
  };

  const getRecurrenceSummary = () => {
    if (!isRecurring) return '';
    
    let summary = '';
    const interval = localRule.recurrence_interval;
    
    switch (localRule.recurrence_pattern) {
      case 'DAILY':
        summary = interval === 1 ? 'כל יום' : `כל ${interval} ימים`;
        break;
      case 'WEEKLY':
        const days = (localRule.recurrence_days_of_week || [])
          .map(d => DAYS_OF_WEEK.find(day => day.value === d)?.fullLabel)
          .filter(Boolean)
          .join(', ');
        summary = interval === 1 
          ? `כל שבוע ב${days || 'ימים נבחרים'}` 
          : `כל ${interval} שבועות ב${days || 'ימים נבחרים'}`;
        break;
      case 'MONTHLY_BY_DAY_OF_MONTH':
        summary = interval === 1 
          ? `כל חודש ביום ${localRule.recurrence_day_of_month}` 
          : `כל ${interval} חודשים ביום ${localRule.recurrence_day_of_month}`;
        break;
      case 'MONTHLY_BY_DAY_OF_WEEK':
        const weekLabel = WEEK_OF_MONTH.find(w => w.value === localRule.recurrence_nth_day_of_week?.week)?.label || '';
        const dayLabel = DAYS_OF_WEEK.find(d => d.value === localRule.recurrence_nth_day_of_week?.day)?.fullLabel || '';
        summary = interval === 1 
          ? `כל חודש ביום ${dayLabel} ה${weekLabel}` 
          : `כל ${interval} חודשים ביום ${dayLabel} ה${weekLabel}`;
        break;
      case 'YEARLY':
        summary = interval === 1 ? 'כל שנה' : `כל ${interval} שנים`;
        break;
    }

    // הוספת מידע על סיום
    switch (localRule.recurrence_end_type) {
      case 'ON_DATE':
        if (localRule.recurrence_end_date) {
          summary += ` עד ${format(new Date(localRule.recurrence_end_date), 'dd/MM/yyyy')}`;
        }
        break;
      case 'AFTER_COUNT':
        summary += ` (${localRule.recurrence_count} פעמים)`;
        break;
    }

    return summary;
  };

  return (
    <div className="space-y-4 border rounded-lg p-4 bg-gray-50">
      {/* מתג הפעלה */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Repeat className="w-5 h-5 text-blue-500" />
          <Label htmlFor="is-recurring" className="font-medium">אירוע חוזר</Label>
        </div>
        <Switch
          id="is-recurring"
          checked={isRecurring}
          onCheckedChange={onIsRecurringChange}
        />
      </div>

      {isRecurring && (
        <div className="space-y-4 pt-2 border-t">
          {/* סוג חזרתיות */}
          <div className="space-y-2">
            <Label>תדירות</Label>
            <Select
              value={localRule.recurrence_pattern}
              onValueChange={(value) => updateRule('recurrence_pattern', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RECURRENCE_PATTERNS.map(pattern => (
                  <SelectItem key={pattern.value} value={pattern.value}>
                    {pattern.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* מרווח */}
          <div className="flex items-center gap-2">
            <Label className="whitespace-nowrap">כל</Label>
            <Input
              type="number"
              min={1}
              max={99}
              value={localRule.recurrence_interval}
              onChange={(e) => updateRule('recurrence_interval', parseInt(e.target.value) || 1)}
              className="w-20"
            />
            <span className="text-gray-600">{getIntervalLabel()}</span>
          </div>

          {/* בחירת ימים בשבוע (רק ל-WEEKLY) */}
          {localRule.recurrence_pattern === 'WEEKLY' && (
            <div className="space-y-2">
              <Label>ימים בשבוע</Label>
              <div className="flex gap-1 flex-wrap">
                {DAYS_OF_WEEK.map(day => (
                  <Button
                    key={day.value}
                    type="button"
                    variant={localRule.recurrence_days_of_week?.includes(day.value) ? 'default' : 'outline'}
                    size="sm"
                    className="w-10 h-10 p-0"
                    onClick={() => toggleDayOfWeek(day.value)}
                  >
                    {day.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* בחירת יום בחודש */}
          {localRule.recurrence_pattern === 'MONTHLY_BY_DAY_OF_MONTH' && (
            <div className="flex items-center gap-2">
              <Label className="whitespace-nowrap">ביום</Label>
              <Input
                type="number"
                min={1}
                max={31}
                value={localRule.recurrence_day_of_month}
                onChange={(e) => updateRule('recurrence_day_of_month', parseInt(e.target.value) || 1)}
                className="w-20"
              />
              <span className="text-gray-600">בחודש</span>
            </div>
          )}

          {/* בחירת יום בשבוע ושבוע בחודש */}
          {localRule.recurrence_pattern === 'MONTHLY_BY_DAY_OF_WEEK' && (
            <div className="flex items-center gap-2 flex-wrap">
              <Label className="whitespace-nowrap">ביום</Label>
              <Select
                value={String(localRule.recurrence_nth_day_of_week?.day || 0)}
                onValueChange={(value) => updateRule('recurrence_nth_day_of_week', {
                  ...localRule.recurrence_nth_day_of_week,
                  day: parseInt(value)
                })}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map(day => (
                    <SelectItem key={day.value} value={String(day.value)}>
                      {day.fullLabel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-gray-600">ה</span>
              <Select
                value={String(localRule.recurrence_nth_day_of_week?.week || 1)}
                onValueChange={(value) => updateRule('recurrence_nth_day_of_week', {
                  ...localRule.recurrence_nth_day_of_week,
                  week: parseInt(value)
                })}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WEEK_OF_MONTH.map(week => (
                    <SelectItem key={week.value} value={String(week.value)}>
                      {week.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-gray-600">בחודש</span>
            </div>
          )}

          {/* סוג סיום */}
          <div className="space-y-2">
            <Label>סיום</Label>
            <Select
              value={localRule.recurrence_end_type}
              onValueChange={(value) => updateRule('recurrence_end_type', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RECURRENCE_END_TYPES.map(endType => (
                  <SelectItem key={endType.value} value={endType.value}>
                    {endType.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* תאריך סיום */}
          {localRule.recurrence_end_type === 'ON_DATE' && (
            <div className="space-y-2">
              <Label>תאריך סיום</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-right">
                    <CalendarDays className="ml-2 h-4 w-4" />
                    {localRule.recurrence_end_date 
                      ? format(new Date(localRule.recurrence_end_date), 'dd/MM/yyyy', { locale: he })
                      : 'בחר תאריך'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={localRule.recurrence_end_date ? new Date(localRule.recurrence_end_date) : undefined}
                    onSelect={(date) => updateRule('recurrence_end_date', date?.toISOString())}
                    disabled={(date) => date < new Date()}
                    locale={he}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* מספר חזרות */}
          {localRule.recurrence_end_type === 'AFTER_COUNT' && (
            <div className="flex items-center gap-2">
              <Label className="whitespace-nowrap">אחרי</Label>
              <Input
                type="number"
                min={1}
                max={365}
                value={localRule.recurrence_count}
                onChange={(e) => updateRule('recurrence_count', parseInt(e.target.value) || 1)}
                className="w-20"
              />
              <span className="text-gray-600">חזרות</span>
            </div>
          )}

          {/* סיכום */}
          {isRecurring && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              <strong>סיכום:</strong> {getRecurrenceSummary()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
import React from 'react';
import { Repeat } from 'lucide-react';

const DAYS_OF_WEEK_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const WEEK_OF_MONTH_HE = { 1: 'ראשון', 2: 'שני', 3: 'שלישי', 4: 'רביעי', '-1': 'אחרון' };

// Helper to calculate recurrence end date
export function calculateRecurrenceEndDate(rule, eventStartDate) {
  if (!rule || !eventStartDate) return null;
  
  const startDate = new Date(eventStartDate);
  
  if (rule.recurrence_end_type === 'ON_DATE' && rule.recurrence_end_date) {
    return new Date(rule.recurrence_end_date);
  }
  
  if (rule.recurrence_end_type === 'AFTER_COUNT' && rule.recurrence_count) {
    const count = rule.recurrence_count;
    const interval = rule.recurrence_interval || 1;
    const pattern = rule.recurrence_pattern;
    
    let endDate = new Date(startDate);
    
    switch (pattern) {
      case 'DAILY':
        endDate.setDate(endDate.getDate() + (count - 1) * interval);
        break;
      case 'WEEKLY':
        endDate.setDate(endDate.getDate() + (count - 1) * interval * 7);
        break;
      case 'MONTHLY_BY_DAY_OF_MONTH':
      case 'MONTHLY_BY_DAY_OF_WEEK':
        endDate.setMonth(endDate.getMonth() + (count - 1) * interval);
        break;
      case 'YEARLY':
        endDate.setFullYear(endDate.getFullYear() + (count - 1) * interval);
        break;
    }
    
    return endDate;
  }
  
  return null;
}

export function getRecurrenceDisplayText(rule) {
  if (!rule) return null;

  const interval = rule.recurrence_interval || 1;
  const pattern = rule.recurrence_pattern;

  let text = '';

  switch (pattern) {
    case 'DAILY':
      text = interval === 1 ? 'כל יום' : `כל ${interval} ימים`;
      break;

    case 'WEEKLY': {
      const days = (rule.recurrence_days_of_week || [])
        .sort()
        .map(d => DAYS_OF_WEEK_HE[d])
        .join(', ');
      
      if (interval === 1) {
        text = days ? `כל ${days}` : 'כל שבוע';
      } else {
        text = days ? `כל ${interval} שבועות ב${days}` : `כל ${interval} שבועות`;
      }
      break;
    }

    case 'MONTHLY_BY_DAY_OF_MONTH': {
      const day = rule.recurrence_day_of_month;
      text = interval === 1 
        ? `כל חודש ביום ${day}` 
        : `כל ${interval} חודשים ביום ${day}`;
      break;
    }

    case 'MONTHLY_BY_DAY_OF_WEEK': {
      const nthDay = rule.recurrence_nth_day_of_week;
      if (nthDay?.week !== undefined && nthDay?.day !== undefined) {
        const weekLabel = WEEK_OF_MONTH_HE[nthDay.week] || '';
        const dayLabel = DAYS_OF_WEEK_HE[nthDay.day] || '';
        text = interval === 1 
          ? `כל חודש ביום ${dayLabel} ה${weekLabel}` 
          : `כל ${interval} חודשים ביום ${dayLabel} ה${weekLabel}`;
      }
      break;
    }

    case 'YEARLY':
      text = interval === 1 ? 'כל שנה' : `כל ${interval} שנים`;
      break;

    default:
      text = 'אירוע חוזר';
  }

  // Add end information if available
  if (rule.recurrence_end_type === 'AFTER_COUNT' && rule.recurrence_count) {
    text += ` (${rule.recurrence_count} פעמים)`;
  } else if (rule.recurrence_end_type === 'ON_DATE' && rule.recurrence_end_date) {
    try {
      const endDate = new Date(rule.recurrence_end_date);
      text += ` עד ${endDate.toLocaleDateString('he-IL')}`;
    } catch (e) {
      // Ignore date parsing errors
    }
  }

  return text;
}

export default function RecurrenceDisplay({ rule, className = '' }) {
  if (!rule) return null;

  const displayText = getRecurrenceDisplayText(rule);
  if (!displayText) return null;

  return (
    <div className={`flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-md ${className}`}>
      <Repeat className="w-3 h-3 text-blue-600" />
      <span className="text-[10px] text-blue-700 font-medium">
        {displayText}
      </span>
    </div>
  );
}
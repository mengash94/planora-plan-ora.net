
/**
 * Date/Time helper functions for consistent Israel timezone handling
 */

/**
 * Format date/time to Israel timezone display
 * @param {string|Date} dateInput - The date to format
 * @param {object} options - Formatting options
 * @returns {string} Formatted date string in Israel timezone
 */
export const formatIsraelDateTime = (dateInput, options = {}) => {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';
  
  const defaultOptions = {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    ...options
  };
  
  return date.toLocaleString('he-IL', defaultOptions);
};

/**
 * Format date only (no time) to Israel timezone
 * @param {string|Date} dateInput - The date to format
 * @returns {string} Formatted date string
 */
export const formatIsraelDate = (dateInput) => {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';
  
  return date.toLocaleDateString('he-IL', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

/**
 * Format time only to Israel timezone
 * @param {string|Date} dateInput - The date to format
 * @returns {string} Formatted time string
 */
export const formatIsraelTime = (dateInput) => {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';
  
  return date.toLocaleTimeString('he-IL', {
    timeZone: 'Asia/Jerusalem',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Convert server date/time to datetime-local input format
 * @param {string|Date} dateInput - The date from server
 * @returns {string} Format: YYYY-MM-DDTHH:mm for datetime-local input
 */
export const toDateTimeLocalValue = (dateInput) => {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';
  
  // Convert to Israel timezone then format for input
  // toLocaleString with timeZone option is useful for getting date parts in target timezone
  // We specify 'en-US' locale just to ensure common separators for parsing,
  // the key is the `timeZone: 'Asia/Jerusalem'`
  const year = date.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem', year: 'numeric' });
  const month = date.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem', month: '2-digit' });
  const day = date.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem', day: '2-digit' });
  const hours = date.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem', hour: '2-digit', hour12: false });
  const minutes = date.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem', minute: '2-digit' });
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

/**
 * Get relative time display (e.g., "לפני 5 דקות")
 * @param {string|Date} dateInput - The date to compare
 * @returns {string} Relative time string
 */
export const getRelativeTime = (dateInput) => {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';
  
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'עכשיו';
  if (diffMins < 60) return `לפני ${diffMins} דקות`;
  if (diffHours < 24) return `לפני ${diffHours} שעות`;
  if (diffDays < 7) return `לפני ${diffDays} ימים`;
  
  return formatIsraelDate(date);
};

/**
 * Format a poll option date into two lines, subtracting 3 hours from server time.
 * Output:
 *  - "YYYY-MM-DD תאריך"
 *  - "שעה HH:MM"
 */
export const formatPollOptionLines = (dateInput) => {
  if (!dateInput) return { dateLine: "", timeLine: "" };
  const s = String(dateInput).trim();

  // Try native parse first
  let d = new Date(s);

  // If native parse fails, handle naive "YYYY-MM-DDTHH:mm"
  if (isNaN(d.getTime())) {
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
    if (m) {
      const y = parseInt(m[1], 10);
      const mo = parseInt(m[2], 10) - 1;
      const day = parseInt(m[3], 10);
      const hh = parseInt(m[4], 10);
      const mm = parseInt(m[5], 10);
      // Build a UTC time from components to avoid client TZ variance
      const msUtc = Date.UTC(y, mo, day, hh, mm);
      d = new Date(msUtc);
    } else {
      return { dateLine: "", timeLine: "" };
    }
  }

  // Subtract 3 hours from server time
  const shifted = new Date(d.getTime() - 3 * 60 * 60 * 1000);

  // Use existing helper to format in Israel timezone as YYYY-MM-DDTHH:mm
  const local = toDateTimeLocalValue(shifted);
  if (local && local.includes("T")) {
    const [datePart, timePart] = local.split("T");
    return { dateLine: `${datePart} תאריך`, timeLine: `שעה ${timePart}` };
  }

  return { dateLine: "", timeLine: "" };
};

/**
 * Check if two dates are on the same day
 * @param {string|Date} date1 - First date
 * @param {string|Date} date2 - Second date
 * @returns {boolean} True if same day
 */
export const isSameDay = (date1, date2) => {
  if (!date1 || !date2) return false;
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return false;
  
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
};

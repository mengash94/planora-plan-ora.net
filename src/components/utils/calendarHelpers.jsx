/**
 * Calendar/ICS helper functions for adding events to user's calendar
 */

/**
 * Generate an .ics file content for calendar download
 * @param {object} eventData - The event data
 * @returns {string} ICS file content
 */
export const generateICSFile = (eventData) => {
  if (!eventData) return null;

  const {
    title,
    description,
    location,
    event_date,
    eventDate,
    end_date,
    endDate,
  } = eventData;

  const eventDateTime = event_date || eventDate;
  
  if (!eventDateTime) {
    return null;
  }

  // Convert to Date object
  const startDate = new Date(eventDateTime);
  
  // Format dates for ICS (YYYYMMDDTHHMMSS format in UTC)
  const formatICSDate = (date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  // End time - use end_date if exists, otherwise 2 hours after start
  const endDateTime = end_date || endDate;
  const endDate_obj = endDateTime ? new Date(endDateTime) : new Date(startDate.getTime() + (2 * 60 * 60 * 1000));

  // Generate unique ID
  const uid = `event-${eventData.id || Date.now()}@planora.app`;

  // Clean text for ICS format (escape special characters)
  const cleanText = (text) => {
    if (!text) return '';
    return text.replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  };

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Planora//Event Calendar//HE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    `DTSTART:${formatICSDate(startDate)}`,
    `DTEND:${formatICSDate(endDate_obj)}`,
    `SUMMARY:${cleanText(title)}`,
    description ? `DESCRIPTION:${cleanText(description)}` : '',
    location ? `LOCATION:${cleanText(location)}` : '',
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(line => line).join('\r\n');

  return icsContent;
};

/**
 * Download ICS file - DEPRECATED, use direct download in component
 * @param {string} icsContent - The ICS file content
 * @param {string} filename - The filename for download
 */
export const downloadICSFile = (icsContent, filename = 'event.ics') => {
  if (!icsContent) return;

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(link.href);
};

/**
 * Generate Google Calendar URL
 * @param {object} eventData - The event data
 * @returns {string} Google Calendar URL
 */
export const generateGoogleCalendarUrl = (eventData) => {
  if (!eventData) return null;

  const {
    title,
    description,
    location,
    event_date,
    eventDate,
  } = eventData;

  const eventDateTime = event_date || eventDate;
  
  if (!eventDateTime) {
    return null;
  }

  const startDate = new Date(eventDateTime);
  const endDate = new Date(startDate.getTime() + (2 * 60 * 60 * 1000));

  // Format for Google Calendar (YYYYMMDDTHHMMSSZ)
  const formatGoogleDate = (date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title || 'אירוע',
    dates: `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`,
    details: description || '',
    location: location || '',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};
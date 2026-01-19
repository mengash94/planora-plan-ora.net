/**
 * Utilities to open external apps (Waze, Maps, Calendar)
 * Optimized for Capacitor Native vs Web environments.
 */

function getWin() {
  return typeof window !== 'undefined' ? window : null;
}

function isNativeCapacitor() {
  const w = getWin();
  if (!w) return false;
  try {
    // Check if Capacitor bridge is present and we are on a native platform
    if (w.Capacitor?.isNativePlatform?.()) return true;
    const platform = w.Capacitor?.getPlatform?.();
    return platform === 'ios' || platform === 'android';
  } catch {
    return false;
  }
}

function getNativePlatform() {
  const w = getWin();
  if (!w) return null;
  try {
    const p = w.Capacitor?.getPlatform?.();
    if (p === 'ios' || p === 'android') return p;
  } catch {}
  const ua = w.navigator?.userAgent || '';
  if (/Android/i.test(ua)) return 'android';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  return null;
}

/**
 * הליבה של פתיחת אפליקציות חיצוניות
 * ⚠️ עובד בדיוק כמו WhatsApp ב-shareHelper.jsx
 * משתמש ב-Browser plugin דרך Capacitor bridge או window.open('_system')
 */
export async function openExternalApp(url) {
  const w = getWin();
  if (!w) return false;

  if (isNativeCapacitor()) {
    // ⚠️ ניסיון 1: דרך Capacitor Browser plugin (כמו WhatsApp)
    if (w.Capacitor?.Plugins?.Browser?.open) {
      try {
        await w.Capacitor.Plugins.Browser.open({ url });
        return true;
      } catch (error) {
        console.warn('[externalApps] Capacitor Browser failed:', error);
      }
    }
    
    // ⚠️ ניסיון 2: Dynamic import של Browser plugin
    try {
      const importDynamic = new Function('specifier', 'return import(specifier)');
      const browserModule = await importDynamic('@capacitor/browser');
      
      if (browserModule?.Browser?.open) {
        await browserModule.Browser.open({ url });
        return true;
      }
    } catch (importErr) {
      // זה בסדר - החבילה לא מותקנת או לא זמינה
      console.debug('[externalApps] Browser plugin import failed:', importErr.message);
    }
    
    // ⚠️ Fallback: window.open עם '_system' (כמו ב-shareHelper.jsx שורה 44)
    // זה פותח בדפדפן החיצוני, שם Universal Links עובדים
    w.open(url, '_system');
    return true;
  }
  
  // Web רגיל - פתיחה רגילה
  w.open(url, '_blank');
}

// פתיחת Waze עם שאילתת חיפוש
export async function openWazeByQuery(query, navigate = true) {
  const raw = String(query || '').trim();
  const coordMatch = raw.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  const useLl = !!coordMatch;
  const ll = useLl ? `${coordMatch[1]},${coordMatch[2]}` : null;
  const q = encodeURIComponent(raw);
  
  const w = getWin();
  const platform = getNativePlatform();
  
  // ב-Native: נסה URL scheme ישיר (פותח ישירות את האפליקציה)
  if (isNativeCapacitor() && platform) {
    try {
      const schemeUrl = useLl
        ? `waze://?ll=${ll}&navigate=${navigate ? 'yes' : 'no'}`
        : `waze://?q=${q}&navigate=${navigate ? 'yes' : 'no'}`;
      
      // נסה לפתוח URL scheme ישיר דרך location.href
      // זה יעבוד אם LSApplicationQueriesSchemes מוגדר ב-Info.plist
      w.location.href = schemeUrl;
      
      // תן זמן לאפליקציה להיפתח
      await new Promise(resolve => setTimeout(resolve, 500));
      return true;
    } catch (err) {
      console.debug('[externalApps] Waze URL scheme failed, trying Universal Link:', err);
    }
  }
  
  // Fallback: Universal Link (יעבוד בדפדפן או אם URL scheme לא עובד)
  const url = useLl
    ? `https://waze.com/ul?ll=${ll}&navigate=${navigate ? 'yes' : 'no'}`
    : `https://waze.com/ul?q=${q}&navigate=${navigate ? 'yes' : 'no'}`;
  
  return openExternalApp(url);
}

// פתיחת Waze עם קואורדינטות (קיצור)
export async function openWaze(lat, lng, navigate = true) {
  const w = getWin();
  const platform = getNativePlatform();
  
  // ב-Native: נסה URL scheme ישיר
  if (isNativeCapacitor() && platform) {
    try {
      const schemeUrl = `waze://?ll=${lat},${lng}&navigate=${navigate ? 'yes' : 'no'}`;
      w.location.href = schemeUrl;
      await new Promise(resolve => setTimeout(resolve, 500));
      return true;
    } catch (err) {
      console.debug('[externalApps] Waze URL scheme failed, trying Universal Link:', err);
    }
  }
  
  // Fallback: Universal Link
  const url = `https://waze.com/ul?ll=${lat},${lng}&navigate=${navigate ? 'yes' : 'no'}`;
  return openExternalApp(url);
}

// פתיחת Google Maps עם שאילתת חיפוש
export async function openGoogleMapsByQuery(query) {
  const q = encodeURIComponent(query || '');
  // Universal Link של Google Maps
  const url = `https://www.google.com/maps/search/?api=1&query=${q}`;
  return openExternalApp(url);
}

// פתיחת Google Maps עם קואורדינטות
export async function openGoogleMaps(lat, lng) {
  const url = `https://www.google.com/maps/?q=${lat},${lng}`;
  return openExternalApp(url);
}

// פתיחת Apple Maps עם שאילתת חיפוש (iOS בלבד)
export async function openAppleMapsByQuery(query) {
  const platform = getNativePlatform();
  if (platform !== 'ios') return false;
  
  const q = encodeURIComponent(query || '');
  const url = `https://maps.apple.com/?q=${q}`;
  return openExternalApp(url);
}

// פתיחת Apple Maps עם קואורדינטות
export async function openAppleMaps(lat, lng) {
  const platform = getNativePlatform();
  if (platform !== 'ios') return false;
  
  const url = `https://maps.apple.com/?ll=${lat},${lng}`;
  return openExternalApp(url);
}

// ניסיון ניווט רב-שלבי עם שאילתת חיפוש
export async function openNavigationByQuery(query) {
  if (!query) return false;
  
  // ניסיון ראשון: Waze (הכי פופולרי בישראל)
  if (await openWazeByQuery(query)) return true;

  // ניסיון שני: Google Maps
  if (await openGoogleMapsByQuery(query)) return true;
  
  // ניסיון שלישי: Apple Maps (אם iOS)
  const platform = getNativePlatform();
  if (platform === 'ios' && await openAppleMapsByQuery(query)) return true;
  
  return false;
}

// ניסיון ניווט עם קואורדינטות
export async function openNavigation(lat, lng) {
  // נסה Waze
  if (await openWaze(lat, lng)) return true;
  
  // נסה Google Maps
  if (await openGoogleMaps(lat, lng)) return true;
  
  // נסה Apple Maps (אם iOS)
  const platform = getNativePlatform();
  if (platform === 'ios' && await openAppleMaps(lat, lng)) return true;
  
  return false;
}

// פתיחת אירוע ביומן - מוריד קובץ ICS
// המשתמש יבחר לאיזה יומן להוסיף לפי מה שמותקן במכשיר
export async function openCalendarEvent({ title, description, location, start, end }) {
  const formatICSDate = (date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const startDate = start instanceof Date ? start : new Date(start);
  const endDate = end 
    ? (end instanceof Date ? end : new Date(end))
    : new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // +2 שעות כברירת מחדל

  const startStr = formatICSDate(startDate);
  const endStr = formatICSDate(endDate);
  
  // Clean text for ICS format (escape special characters)
  const cleanText = (text) => {
    if (!text) return '';
    return text.replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  };

  const cleanTitle = cleanText(title || 'אירוע');
  const cleanDescription = cleanText(description || '');
  const cleanLocation = cleanText(location || '');

  // Generate unique ID
  const uid = `event-${Date.now()}@planora.app`;

  // Generate ICS file content
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Planora//Event Calendar//HE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    `DTSTART:${startStr}`,
    `DTEND:${endStr}`,
    `SUMMARY:${cleanTitle}`,
    cleanDescription ? `DESCRIPTION:${cleanDescription}` : '',
    cleanLocation ? `LOCATION:${cleanLocation}` : '',
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(line => line).join('\r\n');

  // Create and download ICS file
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${cleanTitle.replace(/[^a-z0-9]/gi, '_')}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
  
  return true;
}
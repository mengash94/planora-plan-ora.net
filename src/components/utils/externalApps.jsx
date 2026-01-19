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
 * ⚠️ פתרון שעובד בלי שינויים ב-Capacitor/Info.plist/AndroidManifest
 * משתמש ב-window.location.href שפועל עם Universal Links
 */
export async function openExternalApp(url) {
  const w = getWin();
  if (!w) return false;

  try {
    // ⚠️ פתרון: תמיד משתמש ב-window.location.href
    // זה עובד גם ב-WebView של Capacitor - המערכת תזהה Universal Links אוטומטית
    // אם האפליקציה מותקנת, היא תיפתח. אם לא, זה יפתח בדפדפן
    w.location.href = url;
    
    // תן זמן למערכת לטפל בבקשה
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return true;
  } catch (err) {
    console.error('[externalApps] Failed to open:', url, err);
    
    // Fallback: נסה לפתוח בטאב חדש (רק ב-Web)
    try {
      if (!isNativeCapacitor()) {
        const newWin = w.open(url, '_blank');
        if (newWin) return true;
      }
      return false;
    } catch (fallbackErr) {
      console.error('[externalApps] Fallback also failed:', fallbackErr);
      return false;
    }
  }
}

// פתיחת Waze עם שאילתת חיפוש
export async function openWazeByQuery(query, navigate = true) {
  const raw = String(query || '').trim();
  const coordMatch = raw.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  const useLl = !!coordMatch;
  const ll = useLl ? `${coordMatch[1]},${coordMatch[2]}` : null;
  const q = encodeURIComponent(raw);
  
  // Universal Link של Waze - המערכת תזהה אוטומטית אם האפליקציה מותקנת
  const url = useLl
    ? `https://waze.com/ul?ll=${ll}&navigate=${navigate ? 'yes' : 'no'}`
    : `https://waze.com/ul?q=${q}&navigate=${navigate ? 'yes' : 'no'}`;
  
  return openExternalApp(url);
}

// פתיחת Waze עם קואורדינטות (קיצור)
export async function openWaze(lat, lng, navigate = true) {
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

// פתיחת אירוע ביומן - Google Calendar
export async function openCalendarEvent({ title, description, location, start, end }) {
  const fmt = (d) => {
    const date = d instanceof Date ? d : new Date(d);
    // פורמט עבור Google Calendar: YYYYMMDDTHHMMSSZ
    return date.toISOString().replace(/-|:|\.\d+/g, '').slice(0, 15) + 'Z';
  };

  const startDate = start instanceof Date ? start : new Date(start);
  const endDate = end 
    ? (end instanceof Date ? end : new Date(end))
    : new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // +2 שעות כברירת מחדל

  const startStr = fmt(startDate);
  const endStr = fmt(endDate);
  const text = encodeURIComponent(title || '');
  const details = encodeURIComponent(description || '');
  const loc = encodeURIComponent(location || '');

  // Google Calendar עם Universal Link
  // זה יעבוד גם ב-iOS וגם ב-Android
  // אם Google Calendar מותקן, הוא ייפתח
  // אם לא, זה יפתח ב-Web
  const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${startStr}/${endStr}&details=${details}&location=${loc}`;
  
  return openExternalApp(googleUrl);
}
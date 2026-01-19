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
 * ⚠️ משתמש ב-Browser plugin עם dynamic import (לא נכשל אם לא מותקן)
 * windowName: '_system' פותח בדפדפן החיצוני, שם המערכת מזהה Universal Links
 */
export async function openExternalApp(url) {
  const w = getWin();
  if (!w) return false;

  try {
    if (isNativeCapacitor()) {
      // ⚠️ ניסיון 1: נסה דרך Capacitor bridge ישירות (אם plugin נטען)
      if (w.Capacitor?.Plugins?.Browser?.open) {
        try {
          await w.Capacitor.Plugins.Browser.open({ 
            url, 
            windowName: '_system' 
          });
          return true;
        } catch (err) {
          console.warn('[externalApps] Browser.open failed:', err);
        }
      }
      
      // ⚠️ ניסיון 2: Dynamic import של Browser plugin (עם טיפול בשגיאה)
      // משתמש ב-Function constructor כדי להתחמק מה-Vite build time resolution
      try {
        const importDynamic = new Function('specifier', 'return import(specifier)');
        const browserModule = await importDynamic('@capacitor/browser');
        
        if (browserModule?.Browser?.open) {
          await browserModule.Browser.open({ 
            url, 
            windowName: '_system' 
          });
          return true;
        }
      } catch (importErr) {
        // זה בסדר - החבילה לא מותקנת או לא זמינה
        // Vite לא יכול לפתור את זה בזמן build, אז זה נכשל כאן
        console.debug('[externalApps] Browser plugin import failed (expected if not installed):', importErr.message);
      }
      
      // ⚠️ ניסיון 3: נסה לפתוח דרך iframe (עבודה עוקפת)
      // יוצר iframe זמני שפותח את הקישור, מה שיגרום ל-WebView להעביר למערכת
      try {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = 'none';
        iframe.src = url;
        document.body.appendChild(iframe);
        
        // הסר אחרי זמן קצר
        setTimeout(() => {
          try {
            if (iframe.parentNode) {
              document.body.removeChild(iframe);
            }
          } catch {}
        }, 1000);
        
        return true;
      } catch (iframeErr) {
        console.warn('[externalApps] iframe method failed:', iframeErr);
      }
      
      // ⚠️ Fallback: נסה location.href (למרות שזה יפתח ב-WebView)
      // לפחות זה לא יכשל לחלוטין
      w.location.href = url;
      return true;
    } else {
      // Web רגיל - פתיחה רגילה
      const newWin = w.open(url, '_blank');
      if (newWin) return true;
      
      // Fallback
      w.location.href = url;
      return true;
    }
  } catch (err) {
    console.error('[externalApps] Failed to open:', url, err);
    
    // Fallback אחרון
    try {
      w.location.href = url;
      return true;
    } catch (fallbackErr) {
      console.error('[externalApps] All methods failed:', fallbackErr);
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
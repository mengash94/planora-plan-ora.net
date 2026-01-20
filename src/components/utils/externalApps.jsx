/**
 * Utilities to open external apps (Waze, Maps, Calendar)
 * Optimized for Capacitor Native vs Web environments.
 * 
 * ⚠️ דרישות ב-Native:
 * - iOS: LSApplicationQueriesSchemes ב-Info.plist עם waze, comgooglemaps, maps
 * - Android: <queries> ב-AndroidManifest.xml עם com.waze, com.google.android.apps.maps
 * - Plugins: @capacitor/app-launcher, @capacitor/browser, @capacitor/filesystem, @capacitor/share
 */

function getWin() {
  return typeof window !== 'undefined' ? window : null;
}

function isNativeCapacitor() {
  const w = getWin();
  if (!w) return false;
  try {
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
 * פתיחת URL scheme (waze://, comgooglemaps://, וכו')
 * משתמש ב-App Launcher plugin אם זמין
 */
async function openUrlScheme(schemeUrl, fallbackUrl) {
  const w = getWin();
  if (!w) return false;

  if (isNativeCapacitor()) {
    // ⚠️ ניסיון 1: App Launcher plugin (הדרך הנכונה לפתוח URL schemes)
    if (w.Capacitor?.Plugins?.AppLauncher?.openUrl) {
      try {
        // תמיד נסה לפתוח, גם אם canOpenUrl מחזיר false (יכול להיות בעיית הרשאות)
        await w.Capacitor.Plugins.AppLauncher.openUrl({ url: schemeUrl });
        // תן זמן לאפליקציה להיפתח
        await new Promise(resolve => setTimeout(resolve, 300));
        return true;
      } catch (err) {
        console.debug('[externalApps] AppLauncher.openUrl failed:', err.message);
      }
    }
    
    // ⚠️ ניסיון 2: Dynamic import של App Launcher
    try {
      const importDynamic = new Function('specifier', 'return import(specifier)');
      const appLauncherModule = await importDynamic('@capacitor/app-launcher');
      
      if (appLauncherModule?.AppLauncher?.openUrl) {
        await appLauncherModule.AppLauncher.openUrl({ url: schemeUrl });
        await new Promise(resolve => setTimeout(resolve, 300));
        return true;
      }
    } catch (importErr) {
      console.debug('[externalApps] AppLauncher import failed:', importErr.message);
    }
    
    // ⚠️ לא משתמשים ב-location.href כי זה פותח ב-WebView ונותן שגיאה
    // במקום זה, עוברים ישירות ל-Universal Link דרך Browser plugin
  }
  
  // Fallback: פתח את ה-fallback URL (Universal Link) דרך Browser plugin
  // Universal Link יעבוד טוב יותר ויפתח את Waze אם הוא מותקן
  if (fallbackUrl) {
    return openExternalApp(fallbackUrl);
  }
  
  return false;
}

/**
 * הליבה של פתיחת קישורים חיצוניים (Universal Links)
 * משתמש ב-Browser plugin לפתיחה בדפדפן החיצוני
 */
export async function openExternalApp(url) {
  const w = getWin();
  if (!w) return false;

  if (isNativeCapacitor()) {
    console.log('[externalApps] Opening URL in native app:', url);
    
    // ⚠️ ניסיון 1: Browser plugin (פותח בדפדפן החיצוני)
    if (w.Capacitor?.Plugins?.Browser?.open) {
      try {
        console.log('[externalApps] Using Browser plugin...');
        await w.Capacitor.Plugins.Browser.open({ url });
        return true;
      } catch (error) {
        console.warn('[externalApps] Browser plugin failed:', error);
      }
    }
    
    // ⚠️ ניסיון 2: Dynamic import של Browser plugin
    try {
      console.log('[externalApps] Trying dynamic import of Browser plugin...');
      const importDynamic = new Function('specifier', 'return import(specifier)');
      const browserModule = await importDynamic('@capacitor/browser');
      
      if (browserModule?.Browser?.open) {
        await browserModule.Browser.open({ url });
        console.log('[externalApps] Browser plugin opened successfully via dynamic import');
        return true;
      }
    } catch (importErr) {
      console.debug('[externalApps] Browser import failed:', importErr.message);
    }
    
    // ⚠️ Fallback: אם Browser plugin לא זמין, זה בעיה - צריך להתקין אותו
    console.error('[externalApps] Browser plugin not available! Cannot open external URL without it.');
    // לא משתמשים ב-window.open או location.href כי זה פותח ב-WebView
    // המשתמש צריך לוודא ש-Browser plugin מותקן ומוגדר נכון
    return false;
  }
  
  // Web רגיל - פתיחה בטאב חדש
  w.open(url, '_blank');
  return true;
}

// פתיחת Waze עם שאילתת חיפוש
export async function openWazeByQuery(query, navigate = true) {
  const raw = String(query || '').trim();
  const coordMatch = raw.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  const useLl = !!coordMatch;
  const ll = useLl ? `${coordMatch[1]},${coordMatch[2]}` : null;
  const q = encodeURIComponent(raw);
  
  // Universal Link - הדרך הטובה ביותר לפתוח Waze ב-Capacitor
  // Universal Link יפתח את Waze אם הוא מותקן, או יעביר לדף ההורדה
  const universalLink = useLl
    ? `https://www.waze.com/ul?ll=${ll}&navigate=${navigate ? 'yes' : 'no'}`
    : `https://www.waze.com/ul?q=${q}&navigate=${navigate ? 'yes' : 'no'}`;
  
  // ⚠️ תמיד משתמשים ב-Universal Link דרך Browser plugin (לא waze:// ישירות)
  // זה מונע פתיחה ב-WebView
  return openExternalApp(universalLink);
}

// פתיחת Waze עם קואורדינטות
export async function openWaze(lat, lng, navigate = true) {
  // Universal Link - הדרך הטובה ביותר לפתוח Waze ב-Capacitor
  const universalLink = `https://www.waze.com/ul?ll=${lat},${lng}&navigate=${navigate ? 'yes' : 'no'}`;
  
  // ⚠️ תמיד משתמשים ב-Universal Link דרך Browser plugin (לא waze:// ישירות)
  // זה מונע פתיחה ב-WebView
  return openExternalApp(universalLink);
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

// פתיחת אירוע ביומן
// ב-Native: משתמש ב-Filesystem + Share plugins לשיתוף קובץ ICS
// ב-Web: מוריד קובץ ICS או פותח Google Calendar
export async function openCalendarEvent({ title, description, location, start, end }) {
  const formatICSDate = (date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const startDate = start instanceof Date ? start : new Date(start);
  const endDate = end 
    ? (end instanceof Date ? end : new Date(end))
    : new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

  const startStr = formatICSDate(startDate);
  const endStr = formatICSDate(endDate);
  
  const cleanText = (text) => {
    if (!text) return '';
    return text.replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  };

  const cleanTitle = cleanText(title || 'אירוע');
  const cleanDescription = cleanText(description || '');
  const cleanLocation = cleanText(location || '');
  const uid = `event-${Date.now()}@planora.app`;

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

  const w = getWin();
  const filename = `${(title || 'event').replace(/[^a-z0-9\u0590-\u05FF]/gi, '_')}.ics`;

  // ⚠️ ב-Native: פתח ישירות את Google Calendar דרך Browser plugin
  // זה יפתח את אפליקציית היומן במכשיר (Google Calendar או Apple Calendar)
  if (isNativeCapacitor()) {
    const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title || '')}&dates=${startStr}/${endStr}&details=${encodeURIComponent(description || '')}&location=${encodeURIComponent(location || '')}`;
    console.log('[externalApps] Opening calendar in native app:', googleUrl);
    return openExternalApp(googleUrl);
  }

  // ⚠️ ב-Web: פתח Google Calendar ישירות במקום להוריד קובץ
  // אם המשתמש רוצה להוריד קובץ, הוא יכול להשתמש בכפתור הנפרד להורדה
  const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title || '')}&dates=${startStr}/${endStr}&details=${encodeURIComponent(description || '')}&location=${encodeURIComponent(location || '')}`;
  return openExternalApp(googleUrl);
}
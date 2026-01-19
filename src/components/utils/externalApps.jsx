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
        // בדוק אם אפשר לפתוח
        const canOpen = await w.Capacitor.Plugins.AppLauncher.canOpenUrl({ url: schemeUrl });
        if (canOpen?.value) {
          await w.Capacitor.Plugins.AppLauncher.openUrl({ url: schemeUrl });
          return true;
        }
      } catch (err) {
        console.debug('[externalApps] AppLauncher failed:', err.message);
      }
    }
    
    // ⚠️ ניסיון 2: Dynamic import של App Launcher
    try {
      const importDynamic = new Function('specifier', 'return import(specifier)');
      const appLauncherModule = await importDynamic('@capacitor/app-launcher');
      
      if (appLauncherModule?.AppLauncher?.openUrl) {
        const canOpen = await appLauncherModule.AppLauncher.canOpenUrl({ url: schemeUrl });
        if (canOpen?.value) {
          await appLauncherModule.AppLauncher.openUrl({ url: schemeUrl });
          return true;
        }
      }
    } catch (importErr) {
      console.debug('[externalApps] AppLauncher import failed:', importErr.message);
    }
    
    // ⚠️ Fallback: נסה location.href (יעבוד אם LSApplicationQueriesSchemes מוגדר)
    try {
      w.location.href = schemeUrl;
      // תן זמן לאפליקציה להיפתח
      await new Promise(resolve => setTimeout(resolve, 300));
      return true;
    } catch {
      // נכשל, נסה fallback URL
    }
  }
  
  // Fallback: פתח את ה-fallback URL (Universal Link או דף אינטרנט)
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
    // ⚠️ ניסיון 1: Browser plugin (פותח בדפדפן החיצוני)
    if (w.Capacitor?.Plugins?.Browser?.open) {
      try {
        await w.Capacitor.Plugins.Browser.open({ url });
        return true;
      } catch (error) {
        console.warn('[externalApps] Browser plugin failed:', error);
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
      console.debug('[externalApps] Browser import failed:', importErr.message);
    }
    
    // ⚠️ Fallback: window.open עם '_system'
    w.open(url, '_system');
    return true;
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
  
  // URL scheme ישיר - יפתח את Waze ישירות אם מותקן
  const schemeUrl = useLl
    ? `waze://?ll=${ll}&navigate=${navigate ? 'yes' : 'no'}`
    : `waze://?q=${q}&navigate=${navigate ? 'yes' : 'no'}`;
  
  // Universal Link - fallback אם Waze לא מותקן
  const fallbackUrl = useLl
    ? `https://www.waze.com/ul?ll=${ll}&navigate=${navigate ? 'yes' : 'no'}`
    : `https://www.waze.com/ul?q=${q}&navigate=${navigate ? 'yes' : 'no'}`;
  
  // ⚠️ ב-Native: נסה URL scheme קודם, אחרת Universal Link
  if (isNativeCapacitor()) {
    return openUrlScheme(schemeUrl, fallbackUrl);
  }
  
  // ב-Web: פתח Universal Link
  return openExternalApp(fallbackUrl);
}

// פתיחת Waze עם קואורדינטות
export async function openWaze(lat, lng, navigate = true) {
  const schemeUrl = `waze://?ll=${lat},${lng}&navigate=${navigate ? 'yes' : 'no'}`;
  const fallbackUrl = `https://www.waze.com/ul?ll=${lat},${lng}&navigate=${navigate ? 'yes' : 'no'}`;
  
  if (isNativeCapacitor()) {
    return openUrlScheme(schemeUrl, fallbackUrl);
  }
  
  return openExternalApp(fallbackUrl);
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

  // ⚠️ ב-Native: השתמש ב-Filesystem + Share plugins
  if (isNativeCapacitor()) {
    try {
      // ניסיון 1: Filesystem + Share plugins
      if (w.Capacitor?.Plugins?.Filesystem && w.Capacitor?.Plugins?.Share) {
        const { Filesystem, Share } = w.Capacitor.Plugins;
        
        // כתוב קובץ זמני
        const result = await Filesystem.writeFile({
          path: filename,
          data: btoa(unescape(encodeURIComponent(icsContent))), // Base64 encode
          directory: 'CACHE',
          encoding: 'utf8'
        });
        
        // שתף את הקובץ
        await Share.share({
          title: cleanTitle,
          text: `הוסף ליומן: ${cleanTitle}`,
          url: result.uri,
          dialogTitle: 'הוסף ליומן'
        });
        
        return true;
      }
      
      // ניסיון 2: Dynamic import
      try {
        const importDynamic = new Function('specifier', 'return import(specifier)');
        const [fsModule, shareModule] = await Promise.all([
          importDynamic('@capacitor/filesystem'),
          importDynamic('@capacitor/share')
        ]);
        
        if (fsModule?.Filesystem && shareModule?.Share) {
          const result = await fsModule.Filesystem.writeFile({
            path: filename,
            data: btoa(unescape(encodeURIComponent(icsContent))),
            directory: 'CACHE'
          });
          
          await shareModule.Share.share({
            title: cleanTitle,
            text: `הוסף ליומן: ${cleanTitle}`,
            url: result.uri,
            dialogTitle: 'הוסף ליומן'
          });
          
          return true;
        }
      } catch (importErr) {
        console.debug('[externalApps] Filesystem/Share import failed:', importErr.message);
      }
      
      // ניסיון 3: Share plugin בלבד עם data URL
      if (w.Capacitor?.Plugins?.Share) {
        const dataUrl = `data:text/calendar;base64,${btoa(unescape(encodeURIComponent(icsContent)))}`;
        await w.Capacitor.Plugins.Share.share({
          title: cleanTitle,
          text: icsContent,
          dialogTitle: 'הוסף ליומן'
        });
        return true;
      }
    } catch (err) {
      console.warn('[externalApps] Native calendar failed:', err);
    }
    
    // Fallback ל-Google Calendar
    const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title || '')}&dates=${startStr}/${endStr}&details=${encodeURIComponent(description || '')}&location=${encodeURIComponent(location || '')}`;
    return openExternalApp(googleUrl);
  }

  // ⚠️ ב-Web: הורדת קובץ ICS
  try {
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    await new Promise(resolve => setTimeout(resolve, 50));
    link.click();
    
    setTimeout(() => {
      try {
        if (link.parentNode) document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch {}
    }, 200);
    
    return true;
  } catch (err) {
    console.error('[externalApps] Failed to download ICS:', err);
    
    // Fallback: Google Calendar
    const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title || '')}&dates=${startStr}/${endStr}&details=${encodeURIComponent(description || '')}&location=${encodeURIComponent(location || '')}`;
    return openExternalApp(googleUrl);
  }
}
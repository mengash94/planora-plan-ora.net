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

function getCapacitorBrowser() {
  const w = getWin();
  // Prefer Capacitor v5 Browser API if present, else Plugins.Browser
  return w?.Capacitor?.Browser || w?.Capacitor?.Plugins?.Browser || null;
}

/**
 * הליבה של פתיחת אפליקציות חיצוניות
 */
export async function openExternalApp(url) {
  const w = getWin();
  if (!w) return false;

  try {
    if (isNativeCapacitor()) {
      // Always open in external browser to mimic regular browser behavior
      const Browser = getCapacitorBrowser();
      if (Browser?.open) {
        await Browser.open({ url });
        return true;
      }
      // Fallback for older Capacitor builds
      w.open(url, '_system');
      return true;
    }

    // Web: open new tab
    const newWin = w.open(url, '_blank');
    if (newWin) return true;
    w.location.href = url;
    return true;
  } catch (err) {
    console.error('[externalApps] Failed to open:', url, err);
    return false;
  }
}

// פתיחת Waze
export async function openWazeByQuery(query, navigate = true) {
  const q = encodeURIComponent(query || '');
  // Always use universal link to mimic normal browser behavior
  const url = `https://www.waze.com/ul?q=${q}&navigate=${navigate ? 'yes' : 'no'}`;
  return openExternalApp(url);
}

// פתיחת Google Maps
export async function openGoogleMapsByQuery(query) {
  const q = encodeURIComponent(query || '');
  // Always use the https link so OS can decide what to do
  const url = `https://www.google.com/maps/search/?api=1&query=${q}`;
  return openExternalApp(url);
}

// פתיחת Apple Maps (iOS בלבד)
export async function openAppleMapsByQuery(query) {
  const q = encodeURIComponent(query || '');
  const url = `https://maps.apple.com/?q=${q}`;
  return openExternalApp(url);
}

// ניסיון ניווט רב-שלבי
export async function openNavigationByQuery(query) {
  if (!query) return false;
  
  // ניסיון ראשון: Waze (הכי פופולרי בישראל)
  const openedWaze = await openWazeByQuery(query);
  if (openedWaze) return true;

  // ניסיון שני: Google Maps
  return openGoogleMapsByQuery(query);
}

// פתיחת אירוע ביומן
export async function openCalendarEvent({ title, description, location, start, end }) {
  const pad = (n) => String(n).padStart(2, '0');
  const fmt = (d) => {
    const date = d instanceof Date ? d : new Date(d);
    return date.toISOString().replace(/-|:|\.\d+/g, '');
  };

  const startDate = start instanceof Date ? start : new Date(start);
  const endDate = end ? (end instanceof Date ? end : new Date(end)) : new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

  const startStr = fmt(startDate);
  const endStr = fmt(endDate);
  const text = encodeURIComponent(title || '');
  const details = encodeURIComponent(description || '');
  const loc = encodeURIComponent(location || '');

  // ב-Capacitor Native, קבצי ICS (data URL) ו-calshow לעיתים קרובות נחסמים בתוך ה-WebView.
  // הדרך הכי בטוחה היא לפתוח את גוגל יומן ב-System Browser.
  
  const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${startStr}/${endStr}&details=${details}&location=${loc}`;
  
  // ב-Native נכריח פתיחה ביומן גוגל (שהוא דף אינטרנט שמזהה את היומן המקומי)
  return openExternalApp(googleUrl);
}
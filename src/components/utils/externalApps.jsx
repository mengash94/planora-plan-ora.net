// Utilities to open external apps (Waze, Maps) via Capacitor Browser plugin when available
// No direct imports to keep web bundle clean. Uses window.Capacitor at runtime.

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

// Browser plugin not used; we rely on universal links and window.open

export async function openExternalApp(url) {
  const w = getWin();
  try {
    if (!w) return false;
    // Prefer opening in a new context to avoid WebView restrictions
    const newWin = w.open(url, '_blank');
    if (newWin) return true;
    // Fallback to same-window navigation
    w.location.href = url;
    return true;
  } catch (err) {
    console.error('[externalApps] Failed to open:', url, err);
    try {
      w?.location && (w.location.href = url);
      return true;
    } catch (fallbackErr) {
      console.error('[externalApps] Fallback failed:', fallbackErr);
      return false;
    }
  }
}

// Open Waze with a text query (address/place)
export async function openWazeByQuery(query, navigate = true) {
  const q = encodeURIComponent(query || '');
  // Use universal link to avoid custom URL schemes on iOS
  const url = `https://www.waze.com/ul?query=${q}&navigate=${navigate ? 'true' : 'false'}`;
  return openExternalApp(url);
}

// Open Google Maps with a text query; try app scheme on native, fallback to web
export async function openGoogleMapsByQuery(query) {
  const q = encodeURIComponent(query || '');
  const webUrl = `https://www.google.com/maps/search/?api=1&query=${q}`;
  return openExternalApp(webUrl);
}

// Open Apple Maps with a text query (iOS only)
export async function openAppleMapsByQuery(query) {
  const q = encodeURIComponent(query || '');
  // Use HTTPS so it can open externally without custom scheme
  const url = `https://maps.apple.com/?q=${q}`;
  return openExternalApp(url);
}

// Try Waze -> Google Maps -> Apple Maps -> web fallback
export async function openNavigationByQuery(query) {
  if (await openWazeByQuery(query)) return true;
  if (await openGoogleMapsByQuery(query)) return true;
  if (await openAppleMapsByQuery(query)) return true;
  const q = encodeURIComponent(query || '');
  return openExternalApp(`https://maps.google.com/?q=${q}`);
}

// Open calendar event: iOS calshow -> Google Calendar deep link -> ICS fallback
export async function openCalendarEvent({ title, description, location, start, end }) {
  const pad = (n) => String(n).padStart(2, '0');
  const fmt = (d) => {
    const yyyy = d.getUTCFullYear();
    const mm = pad(d.getUTCMonth() + 1);
    const dd = pad(d.getUTCDate());
    const hh = pad(d.getUTCHours());
    const mi = pad(d.getUTCMinutes());
    const ss = pad(d.getUTCSeconds());
    return `${yyyy}${mm}${dd}T${hh}${mi}${ss}Z`;
  };

  const startDate = start instanceof Date ? start : new Date(start);
  const endDate = end ? (end instanceof Date ? end : new Date(end)) : new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

  const startStr = fmt(startDate);
  const endStr = fmt(endDate);
  const text = encodeURIComponent(title || '');
  const details = encodeURIComponent(description || '');
  const loc = encodeURIComponent(location || '');

  // iOS: open Calendar app at the event date (native Calendar)
  const platform = getNativePlatform();
  if (platform === 'ios') {
    const secondsSince2001 = Math.floor(startDate.getTime() / 1000) - 978307200; // 2001-01-01 epoch
    const calshowUrl = `calshow:${secondsSince2001}`;
    const opened = await openExternalApp(calshowUrl);
    if (opened) return true;
  }

  // Google Calendar deep link (often opens the app on Android and some iOS setups)
  const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${startStr}/${endStr}&details=${details}&location=${loc}`;
  const openedGoogle = await openExternalApp(googleUrl);
  if (openedGoogle) return true;

  // Fallback: ICS data URL (some devices will hand off to native calendar)
  const sanitize = (v) => (v || '').replace(/\n/g, ' ').replace(/,/g, '\\,');
  const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Planora//Event//HE\nBEGIN:VEVENT\nUID:${Date.now()}@planora\nDTSTAMP:${fmt(new Date())}\nDTSTART:${startStr}\nDTEND:${endStr}\nSUMMARY:${sanitize(title)}\nDESCRIPTION:${sanitize(description)}\nLOCATION:${sanitize(location)}\nEND:VEVENT\nEND:VCALENDAR`;
  const dataUrl = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics);
  return openExternalApp(dataUrl);
}
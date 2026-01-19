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

function getBrowserPlugin() {
  const w = getWin();
  return w?.Capacitor?.Plugins?.Browser || null;
}

export async function openExternalApp(url) {
  const w = getWin();
  try {
    if (isNativeCapacitor()) {
      const Browser = getBrowserPlugin();
      if (Browser?.open) {
        await Browser.open({ url });
        return true;
      }
      // Fallback to location if plugin missing
      if (w) {
        w.location.href = url;
        return true;
      }
    } else if (w) {
      // Web
      w.location.href = url;
      return true;
    }
  } catch (err) {
    console.error('[externalApps] Failed to open:', url, err);
    try {
      const Browser = getBrowserPlugin();
      if (isNativeCapacitor() && Browser?.open) {
        await Browser.open({ url, windowName: '_system' });
        return true;
      }
      if (w) {
        w.open(url, '_blank');
        return true;
      }
    } catch (fallbackErr) {
      console.error('[externalApps] Fallback failed:', fallbackErr);
      return false;
    }
  }
  return false;
}

// Open Waze with a text query (address/place)
export async function openWazeByQuery(query, navigate = true) {
  const q = encodeURIComponent(query || '');
  const url = `waze://?q=${q}&navigate=${navigate ? 'yes' : 'no'}`;
  return openExternalApp(url);
}

// Open Google Maps with a text query; try app scheme on native, fallback to web
export async function openGoogleMapsByQuery(query) {
  const q = encodeURIComponent(query || '');
  const platform = getNativePlatform();
  const appUrl = `comgooglemaps://?q=${q}`;
  const webUrl = `https://www.google.com/maps/search/?api=1&query=${q}`;
  if (platform) {
    const ok = await openExternalApp(appUrl);
    if (ok) return true;
  }
  return openExternalApp(webUrl);
}

// Open Apple Maps with a text query (iOS only)
export async function openAppleMapsByQuery(query) {
  const q = encodeURIComponent(query || '');
  const url = `maps://?q=${q}`;
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
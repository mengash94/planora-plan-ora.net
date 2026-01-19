/**
 * Share Helper - handles sharing across web and native (Capacitor)
 * Uses AppLauncher for direct app opening, with Browser plugin as fallback
 * 
 * ⚠️ All Capacitor imports are dynamic to avoid Vite build errors
 */

// Check if running in Capacitor native environment
const isCapacitor = () => {
  return typeof window !== 'undefined' && 
         window.Capacitor && 
         window.Capacitor.isNativePlatform && 
         window.Capacitor.isNativePlatform();
};

// Get current platform
const getPlatform = () => {
  if (typeof window === 'undefined') return 'web';
  try {
    const platform = window.Capacitor?.getPlatform?.();
    if (platform === 'ios' || platform === 'android') return platform;
  } catch {}
  return 'web';
};

// Dynamic import helper (bypasses Vite resolution)
const dynamicImport = (specifier) => {
  const importFn = new Function('specifier', 'return import(specifier)');
  return importFn(specifier);
};

/**
 * Try to open URL using AppLauncher (direct app opening)
 */
const tryAppLauncher = async (url) => {
  try {
    const module = await dynamicImport('@capacitor/app-launcher');
    if (module?.AppLauncher?.openUrl) {
      const result = await module.AppLauncher.openUrl({ url });
      console.log('[ShareHelper] AppLauncher opened:', url, result);
      return true;
    }
  } catch (error) {
    console.warn('[ShareHelper] AppLauncher failed:', error);
  }
  return false;
};

/**
 * Try to open URL using Browser plugin (external browser)
 */
const tryBrowser = async (url) => {
  try {
    const module = await dynamicImport('@capacitor/browser');
    if (module?.Browser?.open) {
      await module.Browser.open({ url });
      console.log('[ShareHelper] Browser opened:', url);
      return true;
    }
  } catch (error) {
    console.warn('[ShareHelper] Browser plugin failed:', error);
  }
  return false;
};

/**
 * Open a URL externally with multiple fallbacks
 * Priority: AppLauncher → Browser → window.open
 */
export const openExternalUrl = async (url) => {
  console.log('[ShareHelper] Opening:', url, 'Platform:', getPlatform());
  
  if (isCapacitor()) {
    // Try AppLauncher first for URL schemes
    if (await tryAppLauncher(url)) return true;
    
    // Fallback to Browser plugin
    if (await tryBrowser(url)) return true;
    
    // Last resort: window.open with _system
    window.open(url, '_system');
    return true;
  }
  
  // Web - open in new tab
  window.open(url, '_blank');
  return true;
};

/**
 * Open WhatsApp with a message
 * Uses direct URL scheme on native, Universal Link as fallback
 */
export const openWhatsApp = async (message, phoneNumber = null) => {
  const encodedMessage = encodeURIComponent(message);
  const platform = getPlatform();
  
  console.log('[ShareHelper] Opening WhatsApp, platform:', platform);
  
  if (isCapacitor()) {
    // ניסיון 1: URL Scheme ישיר (פותח את WhatsApp ישירות)
    const schemeUrl = phoneNumber 
      ? `whatsapp://send?phone=${phoneNumber}&text=${encodedMessage}`
      : `whatsapp://send?text=${encodedMessage}`;
    
    if (await tryAppLauncher(schemeUrl)) {
      console.log('[ShareHelper] ✅ WhatsApp opened via AppLauncher');
      return true;
    }
    
    // ניסיון 2: Universal Link דרך Browser
    const universalUrl = phoneNumber 
      ? `https://api.whatsapp.com/send/?phone=${phoneNumber}&text=${encodedMessage}`
      : `https://api.whatsapp.com/send/?text=${encodedMessage}`;
    
    if (await tryBrowser(universalUrl)) {
      console.log('[ShareHelper] ✅ WhatsApp opened via Browser');
      return true;
    }
    
    // Fallback
    window.open(universalUrl, '_system');
    return true;
  }
  
  // Web - use Universal Link
  const url = phoneNumber 
    ? `https://api.whatsapp.com/send/?phone=${phoneNumber}&text=${encodedMessage}`
    : `https://api.whatsapp.com/send/?text=${encodedMessage}`;
  
  window.open(url, '_blank');
  return true;
};

/**
 * Open Telegram with a message
 * Uses direct URL scheme on native
 */
export const openTelegram = async (message, username = null) => {
  const encodedMessage = encodeURIComponent(message);
  const platform = getPlatform();
  
  console.log('[ShareHelper] Opening Telegram, platform:', platform);
  
  if (isCapacitor()) {
    // ניסיון 1: URL Scheme ישיר
    const schemeUrl = username 
      ? `tg://msg?to=${username}&text=${encodedMessage}`
      : `tg://msg?text=${encodedMessage}`;
    
    if (await tryAppLauncher(schemeUrl)) {
      console.log('[ShareHelper] ✅ Telegram opened via AppLauncher');
      return true;
    }
    
    // ניסיון 2: Universal Link
    const universalUrl = username
      ? `https://t.me/${username}?text=${encodedMessage}`
      : `https://t.me/share/url?text=${encodedMessage}`;
    
    if (await tryBrowser(universalUrl)) {
      console.log('[ShareHelper] ✅ Telegram opened via Browser');
      return true;
    }
    
    window.open(universalUrl, '_system');
    return true;
  }
  
  // Web
  const url = username
    ? `https://t.me/${username}?text=${encodedMessage}`
    : `https://t.me/share/url?text=${encodedMessage}`;
  
  window.open(url, '_blank');
  return true;
};

/**
 * Open SMS app with a message
 */
export const openSMS = async (phoneNumber, message) => {
  const encodedMessage = encodeURIComponent(message);
  const url = `sms:${phoneNumber}?body=${encodedMessage}`;
  
  console.log('[ShareHelper] Opening SMS:', phoneNumber);
  
  if (isCapacitor()) {
    // SMS scheme עובד טוב עם AppLauncher
    if (await tryAppLauncher(url)) return true;
    if (await tryBrowser(url)) return true;
  }
  
  // Fallback
  window.location.href = url;
  return true;
};

/**
 * Open phone dialer
 */
export const openPhone = async (phoneNumber) => {
  const url = `tel:${phoneNumber}`;
  
  console.log('[ShareHelper] Opening Phone:', phoneNumber);
  
  if (isCapacitor()) {
    if (await tryAppLauncher(url)) return true;
    if (await tryBrowser(url)) return true;
  }
  
  // Fallback
  window.location.href = url;
  return true;
};

/**
 * Share content using native share or Web Share API
 */
export const shareContent = async ({ text, url, title }) => {
  console.log('[ShareHelper] Sharing content');
  
  if (isCapacitor()) {
    try {
      const module = await dynamicImport('@capacitor/share');
      if (module?.Share?.share) {
        await module.Share.share({
          text,
          url,
          title,
          dialogTitle: title
        });
        return { success: true, method: 'capacitor' };
      }
    } catch (error) {
      console.warn('[ShareHelper] Capacitor Share failed:', error);
    }
  }
  
  // Try Web Share API
  if (navigator.share) {
    try {
      await navigator.share({ text, url, title });
      return { success: true, method: 'webshare' };
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.warn('[ShareHelper] Web Share API failed:', error);
      }
      return { success: false, method: 'aborted' };
    }
  }
  
  // Fallback: copy to clipboard
  try {
    const shareText = url ? `${text}\n${url}` : text;
    await navigator.clipboard.writeText(shareText);
    return { success: true, method: 'clipboard' };
  } catch (error) {
    console.error('[ShareHelper] Clipboard fallback failed:', error);
    return { success: false, method: 'failed' };
  }
};

/**
 * Open email client
 */
export const openEmail = async ({ to = '', subject, body }) => {
  const mailtoUrl = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  
  console.log('[ShareHelper] Opening Email');
  
  if (isCapacitor()) {
    if (await tryAppLauncher(mailtoUrl)) return true;
    if (await tryBrowser(mailtoUrl)) return true;
  }
  
  // Fallback
  window.open(mailtoUrl);
  return true;
};

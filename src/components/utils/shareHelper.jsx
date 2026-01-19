/**
 * Share Helper - handles sharing across web and native (Capacitor)
 * Uses Capacitor Browser/Share plugins when available, falls back to web APIs
 */

// Check if running in Capacitor native environment
const isCapacitor = () => {
  return typeof window !== 'undefined' && 
         window.Capacitor && 
         window.Capacitor.isNativePlatform && 
         window.Capacitor.isNativePlatform();
};

// Get Capacitor plugins
const getCapacitorPlugins = () => {
  if (typeof window !== 'undefined' && window.Capacitor && window.Capacitor.Plugins) {
    return window.Capacitor.Plugins;
  }
  return null;
};

// Prefer Capacitor v5 Browser API if present, else Plugins.Browser
const getCapacitorBrowser = () => {
  const w = typeof window !== 'undefined' ? window : null;
  return w?.Capacitor?.Browser || w?.Capacitor?.Plugins?.Browser || null;
};

/**
 * Open a URL externally (WhatsApp, browser, Waze, Maps, Calendar, etc.)
 * @param {string} url - The URL to open
 */
export const openExternalUrl = async (url) => {
  if (isCapacitor()) {
    const Browser = getCapacitorBrowser();
    if (Browser?.open) {
      try {
        await Browser.open({ url });
        return;
      } catch (error) {
        console.warn('[ShareHelper] Capacitor Browser failed:', error);
      }
    }
    // Fallback for native: try to leave the WebView
    window.open(url, '_system');
    return;
  }
  // Web - open in new tab
  window.open(url, '_blank');
};

/**
 * Open WhatsApp with a message
 * @param {string} message - The message to send
 * @param {string} [phoneNumber] - Optional phone number (with country code, no +)
 */
export const openWhatsApp = async (message, phoneNumber = null) => {
  const encodedMessage = encodeURIComponent(message);
  const url = phoneNumber 
    ? `https://api.whatsapp.com/send/?phone=${phoneNumber}&text=${encodedMessage}`
    : `https://api.whatsapp.com/send/?text=${encodedMessage}`;
  await openExternalUrl(url);
};

/**
 * Open SMS app with a message
 * @param {string} phoneNumber - The phone number
 * @param {string} message - The message body
 */
export const openSMS = async (phoneNumber, message) => {
  const encodedMessage = encodeURIComponent(message);
  const url = `sms:${phoneNumber}?body=${encodedMessage}`;
  if (isCapacitor()) {
    const Browser = getCapacitorBrowser();
    if (Browser?.open) {
      try {
        await Browser.open({ url });
        return;
      } catch (error) {
        console.warn('[ShareHelper] Capacitor Browser failed for SMS, falling back:', error);
      }
    }
  }
  window.location.href = url;
};

/**
 * Open phone dialer
 * @param {string} phoneNumber - The phone number to call
 */
export const openPhone = async (phoneNumber) => {
  const url = `tel:${phoneNumber}`;
  if (isCapacitor()) {
    const Browser = getCapacitorBrowser();
    if (Browser?.open) {
      try {
        await Browser.open({ url });
        return;
      } catch (error) {
        console.warn('[ShareHelper] Capacitor Browser failed for phone, falling back:', error);
      }
    }
  }
  window.location.href = url;
};

/**
 * Share content using native share or Web Share API
 * @param {Object} options - Share options
 * @param {string} options.text - Text to share
 * @param {string} [options.url] - URL to share
 * @param {string} [options.title] - Title for share dialog
 */
export const shareContent = async ({ text, url, title }) => {
  const plugins = getCapacitorPlugins();
  
  // Try Capacitor Share plugin first (for native)
  if (isCapacitor() && plugins?.Share) {
    try {
      await plugins.Share.share({
        text,
        url,
        title,
        dialogTitle: title
      });
      return { success: true, method: 'capacitor' };
    } catch (error) {
      console.warn('[ShareHelper] Capacitor Share failed:', error);
    }
  }
  
  // Try Web Share API
  if (navigator.share) {
    try {
      await navigator.share({
        text,
        url,
        title
      });
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
 * @param {Object} options - Email options
 * @param {string} [options.to] - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.body - Email body
 */
export const openEmail = async ({ to = '', subject, body }) => {
  const mailtoUrl = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  if (isCapacitor()) {
    const Browser = getCapacitorBrowser();
    if (Browser?.open) {
      try {
        await Browser.open({ url: mailtoUrl });
        return;
      } catch (error) {
        console.warn('[ShareHelper] Capacitor Browser failed for email, falling back:', error);
      }
    }
  }
  window.open(mailtoUrl);
};
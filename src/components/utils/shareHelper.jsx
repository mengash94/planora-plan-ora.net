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

/**
 * Open a URL externally (WhatsApp, browser, etc.)
 * @param {string} url - The URL to open
 */
export const openExternalUrl = async (url) => {
  const plugins = getCapacitorPlugins();
  
  if (isCapacitor() && plugins?.Browser) {
    try {
      await plugins.Browser.open({ url });
      return;
    } catch (error) {
      console.warn('[ShareHelper] Capacitor Browser failed, falling back to window.open:', error);
    }
  }
  
  // Fallback for web
  window.open(url, '_blank');
};

/**
 * Open WhatsApp with a message
 * @param {string} message - The message to send
 * @param {string} [phoneNumber] - Optional phone number (with country code, no +)
 */
export const openWhatsApp = async (message, phoneNumber = null) => {
  // Ensure proper UTF-8 encoding for emojis
  const encodedMessage = encodeURIComponent(message);
  const url = phoneNumber 
    ? `https://wa.me/${phoneNumber}?text=${encodedMessage}`
    : `https://wa.me/?text=${encodedMessage}`;
  
  // For Capacitor, try using the App plugin to open WhatsApp directly
  // This handles emojis better than the Browser plugin
  if (isCapacitor()) {
    const plugins = getCapacitorPlugins();
    
    // Try App.openUrl first (better for deep links)
    if (plugins?.App) {
      try {
        await plugins.App.openUrl({ url });
        return;
      } catch (error) {
        console.warn('[ShareHelper] Capacitor App.openUrl failed:', error);
      }
    }
  }
  
  // Fallback to openExternalUrl
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
  
  const plugins = getCapacitorPlugins();
  
  if (isCapacitor() && plugins?.Browser) {
    try {
      await plugins.Browser.open({ url });
      return;
    } catch (error) {
      console.warn('[ShareHelper] Capacitor Browser failed for SMS, falling back:', error);
    }
  }
  
  // Fallback for web
  window.location.href = url;
};

/**
 * Open phone dialer
 * @param {string} phoneNumber - The phone number to call
 */
export const openPhone = async (phoneNumber) => {
  const url = `tel:${phoneNumber}`;
  
  const plugins = getCapacitorPlugins();
  
  if (isCapacitor() && plugins?.Browser) {
    try {
      await plugins.Browser.open({ url });
      return;
    } catch (error) {
      console.warn('[ShareHelper] Capacitor Browser failed for phone, falling back:', error);
    }
  }
  
  // Fallback for web
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
  
  const plugins = getCapacitorPlugins();
  
  if (isCapacitor() && plugins?.Browser) {
    try {
      await plugins.Browser.open({ url: mailtoUrl });
      return;
    } catch (error) {
      console.warn('[ShareHelper] Capacitor Browser failed for email, falling back:', error);
    }
  }
  
  // Fallback for web
  window.open(mailtoUrl);
};
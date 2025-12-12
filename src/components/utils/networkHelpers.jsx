/**
 * Network Helpers - Utilities for handling network issues
 */

// Check if user is online
export const isOnline = () => {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
};

// Wait for network to be available
export const waitForNetwork = (timeoutMs = 10000) => {
  return new Promise((resolve, reject) => {
    if (isOnline()) {
      resolve(true);
      return;
    }

    const timeout = setTimeout(() => {
      window.removeEventListener('online', onlineHandler);
      reject(new Error('Network timeout'));
    }, timeoutMs);

    const onlineHandler = () => {
      clearTimeout(timeout);
      window.removeEventListener('online', onlineHandler);
      resolve(true);
    };

    window.addEventListener('online', onlineHandler);
  });
};

// Exponential backoff retry
export const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      // Check if online before attempting
      if (!isOnline()) {
        console.warn(`[retryWithBackoff] Device is offline, waiting... (attempt ${i + 1})`);
        try {
          await waitForNetwork(5000);
        } catch {
          // Continue anyway after timeout
        }
      }

      const result = await fn();
      return result;
    } catch (error) {
      const isLastAttempt = i === maxRetries - 1;
      
      // If it's a network error and not the last attempt, retry
      if (error.message?.includes('fetch') || error.message?.includes('Network')) {
        if (!isLastAttempt) {
          const delay = baseDelay * Math.pow(2, i); // Exponential backoff
          console.warn(`[retryWithBackoff] Network error, retrying in ${delay}ms... (attempt ${i + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      
      // Re-throw on last attempt or non-network errors
      throw error;
    }
  }
};

// Check if error is a network error
export const isNetworkError = (error) => {
  if (!error) return false;
  
  const message = error.message?.toLowerCase() || '';
  return (
    message.includes('failed to fetch') ||
    message.includes('network error') ||
    message.includes('networkerror') ||
    message.includes('network request failed') ||
    error.name === 'NetworkError' ||
    error.name === 'TypeError' && message.includes('fetch')
  );
};

// Get user-friendly error message
export const getNetworkErrorMessage = (error) => {
  if (!isOnline()) {
    return 'אין חיבור לאינטרנט. אנא בדוק את החיבור שלך.';
  }
  
  if (isNetworkError(error)) {
    return 'בעיית תקשורת עם השרת. מנסה שוב...';
  }
  
  return error.message || 'שגיאה לא ידועה';
};
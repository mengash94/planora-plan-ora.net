/**
 * Device detection utilities
 */

/**
 * Check if current device is mobile
 * @returns {boolean}
 */
export const isMobileDevice = () => {
    if (typeof window === 'undefined') return false;
    
    // Check user agent
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    
    // Check screen size as backup
    const isSmallScreen = window.innerWidth <= 768;
    
    // Check touch support
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    return mobileRegex.test(userAgent) || (isSmallScreen && isTouchDevice);
};

/**
 * Check if device is iOS
 * @returns {boolean}
 */
export const isIOS = () => {
    if (typeof window === 'undefined') return false;
    
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
};

/**
 * Check if device is Android
 * @returns {boolean}
 */
export const isAndroid = () => {
    if (typeof window === 'undefined') return false;
    
    return /Android/i.test(navigator.userAgent);
};

/**
 * Get device type string
 * @returns {'mobile'|'tablet'|'desktop'}
 */
export const getDeviceType = () => {
    if (typeof window === 'undefined') return 'desktop';
    
    const userAgent = navigator.userAgent;
    
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(userAgent)) {
        return 'tablet';
    }
    
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(userAgent)) {
        return 'mobile';
    }
    
    return 'desktop';
};
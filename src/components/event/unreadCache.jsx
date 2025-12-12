// Cache for unread messages to prevent excessive API calls
const unreadCache = {
    data: null,
    lastFetchTime: 0,
};

const UNREAD_CACHE_DURATION = 120 * 1000; // 2 minutes cache

export const getCachedUnreadData = () => {
    const now = Date.now();
    if (unreadCache.data && (now - unreadCache.lastFetchTime < UNREAD_CACHE_DURATION)) {
        return unreadCache.data;
    }
    return null;
};

export const setCachedUnreadData = (data) => {
    unreadCache.data = data;
    unreadCache.lastFetchTime = Date.now();
};

export const clearUnreadCache = () => {
    unreadCache.data = null;
    unreadCache.lastFetchTime = 0;
};
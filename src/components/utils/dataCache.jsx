/**
 * Client-side cache with Stale-While-Revalidate pattern
 * Shows cached data immediately while fetching fresh data in background
 */

const CACHE_PREFIX = 'planora_cache_';
const DEFAULT_STALE_TIME = 60 * 1000; // 1 minute - data considered fresh
const DEFAULT_MAX_AGE = 5 * 60 * 1000; // 5 minutes - max cache age before forced refresh

// In-memory cache for faster access (avoids localStorage parsing overhead)
const memoryCache = new Map();

/**
 * Get cached data
 * @param {string} key - Cache key
 * @returns {{ data: any, timestamp: number, isStale: boolean } | null}
 */
export const getCachedData = (key) => {
  // Try memory cache first
  if (memoryCache.has(key)) {
    const cached = memoryCache.get(key);
    const age = Date.now() - cached.timestamp;
    const isStale = age > DEFAULT_STALE_TIME;
    return { ...cached, isStale };
  }

  // Fall back to localStorage
  try {
    const stored = localStorage.getItem(CACHE_PREFIX + key);
    if (!stored) return null;

    const cached = JSON.parse(stored);
    const age = Date.now() - cached.timestamp;
    
    // If too old, remove from cache
    if (age > DEFAULT_MAX_AGE) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }

    const isStale = age > DEFAULT_STALE_TIME;
    
    // Store in memory for faster subsequent access
    memoryCache.set(key, cached);
    
    return { ...cached, isStale };
  } catch (e) {
    console.warn('[dataCache] Failed to read cache:', e);
    return null;
  }
};

/**
 * Set cached data
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 */
export const setCachedData = (key, data) => {
  const cached = {
    data,
    timestamp: Date.now()
  };

  // Update memory cache
  memoryCache.set(key, cached);

  // Persist to localStorage
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(cached));
  } catch (e) {
    console.warn('[dataCache] Failed to write cache:', e);
  }
};

/**
 * Clear specific cache key
 * @param {string} key - Cache key
 */
export const clearCache = (key) => {
  memoryCache.delete(key);
  try {
    localStorage.removeItem(CACHE_PREFIX + key);
  } catch (e) {
    // Ignore
  }
};

/**
 * Clear all cache
 */
export const clearAllCache = () => {
  memoryCache.clear();
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));
    keys.forEach(k => localStorage.removeItem(k));
  } catch (e) {
    // Ignore
  }
};

/**
 * Fetch with Stale-While-Revalidate pattern
 * Returns cached data immediately if available, then updates in background
 * 
 * @param {string} cacheKey - Unique cache key
 * @param {() => Promise<any>} fetchFn - Function to fetch fresh data
 * @param {(data: any) => void} onData - Callback when data is available (called twice if cache exists)
 * @param {Object} options - Options
 * @param {number} options.staleTime - Time in ms before data is considered stale
 * @param {boolean} options.forceRefresh - Skip cache and fetch fresh data
 * @returns {Promise<any>} - The fetched data
 */
export const fetchWithCache = async (cacheKey, fetchFn, onData, options = {}) => {
  const { staleTime = DEFAULT_STALE_TIME, forceRefresh = false } = options;

  // Check cache first
  if (!forceRefresh) {
    const cached = getCachedData(cacheKey);
    if (cached?.data !== undefined) {
      // Immediately return cached data
      onData?.(cached.data);

      // If data is fresh enough, don't refetch
      if (!cached.isStale) {
        return cached.data;
      }
    }
  }

  // Fetch fresh data in background
  try {
    const freshData = await fetchFn();
    
    // Update cache
    setCachedData(cacheKey, freshData);
    
    // Notify with fresh data
    onData?.(freshData);
    
    return freshData;
  } catch (error) {
    // On error, keep showing cached data if available
    const cached = getCachedData(cacheKey);
    if (cached?.data !== undefined) {
      console.warn('[dataCache] Fetch failed, using cached data:', error.message);
      return cached.data;
    }
    throw error;
  }
};

// Cache keys
export const CACHE_KEYS = {
  ANNOUNCEMENTS: 'announcements',
  UNREAD_MESSAGES: 'unread_messages',
  UNREAD_NOTIFICATIONS: 'unread_notifications'
};
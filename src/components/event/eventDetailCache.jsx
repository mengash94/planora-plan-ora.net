// זיכרון מטמון פשוט בצד הלקוח לנתוני פרטי אירוע
const eventDetailCache = new Map();
// משך זמן שהמידע נחשב טרי - 5 דקות
const CACHE_DURATION = 5 * 60 * 1000; 

/**
 * קבלת נתונים מה-cache אם קיימים וטריים
 * @param {string} eventId - מזהה האירוע
 * @returns {object|null} - נתוני האירוע או null
 */
export const getCachedEventData = (eventId) => {
    if (!eventId) return null;
    const cached = eventDetailCache.get(eventId);
    if (!cached) return null;

    const isStale = (Date.now() - cached.timestamp) > CACHE_DURATION;
    if (isStale) {
        // אם המידע ישן, נמחק אותו מה-cache
        eventDetailCache.delete(eventId);
        return null;
    }
    
    return cached.data;
};

/**
 * שמירת נתונים ב-cache
 * @param {string} eventId - מזהה האירוע
 * @param {object} data - הנתונים לשמירה
 */
export const setCachedEventData = (eventId, data) => {
    if (!eventId || !data) return;
    const cacheEntry = {
        timestamp: Date.now(),
        data: data,
    };
    eventDetailCache.set(eventId, cacheEntry);
};

/**
 * ניקוי ה-cache עבור אירוע ספציפי או כולו
 * @param {string} [eventId] - מזהה אירוע (אופציונלי)
 */
export const clearEventCache = (eventId) => {
    if (eventId) {
        eventDetailCache.delete(eventId);
    } else {
        eventDetailCache.clear();
    }
};
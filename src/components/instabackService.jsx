import { proxyInstaback } from "@/functions/proxyInstaback";

// --- Network Helpers (defined inline for a fully functional single file) ---
// Improved network detection
const isOnline = () => {
    if (typeof navigator === 'undefined') return true;
    return navigator.onLine;
};

// Improved network error detection
const isNetworkError = (error) => {
    if (!error) return false;

    // Check for common network error patterns
    const errorMessage = String(error.message || '').toLowerCase();
    const errorName = String(error.name || '').toLowerCase();

    // Type errors from fetch failures
    if (errorName === 'typeerror' && (
        errorMessage.includes('failed to fetch') ||
        errorMessage.includes('network request failed') ||
        errorMessage.includes('networkerror')
    )) {
        return true;
    }

    // Explicit network errors
    if (errorName === 'networkerror') {
        return true;
    }

    // Other network-related errors
    if (errorMessage.includes('network error') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('connection refused') ||
        errorMessage.includes('dns') ||
        errorMessage.includes('enotfound')) {
        return true;
    }

    // HTTP status codes that indicate network issues
    if (error.status && [0, 502, 503, 504].includes(error.status)) {
        return true;
    }

    return false;
};

// This helper is imported but the _fetchWithAuth function implements its own retry logic.
// Keeping a basic definition to satisfy the import if it's used elsewhere.
const retryWithBackoff = async (fn, retries = 3, delay = 1000) => {
    try {
        return await fn();
    } catch (error) {
        if (retries > 0 && isNetworkError(error)) {
            console.warn(`Retrying in ${delay}ms... (${retries} retries left)`);
            await new Promise(res => setTimeout(res, delay));
            return retryWithBackoff(fn, retries - 1, delay * 2);
        }
        throw error;
    }
};
// --- End Network Helpers ---


let token = null;

const setToken = (newToken) => {
    token = newToken;
    if (typeof window !== 'undefined') {
        if (newToken) {
            localStorage.setItem('instaback_token', newToken);
        } else {
            localStorage.removeItem('instaback_token');
        }
    }
};

export const getToken = () => {
    if (token) return token;
    if (typeof window !== 'undefined') {
        token = localStorage.getItem('instaback_token');
    }
    return token;
};

// Project Root URL (without /api)
const PROJECT_ROOT_URL = 'https://instaback.ai/project/f78de3ce-0cab-4ccb-8442-0c5749792fe8';

// API Base URL for most data endpoints (with /api/ at the end)
const API_BASE_URL = `${PROJECT_ROOT_URL}/api`;

// Base path for authentication (without /api)
const AUTH_BASE_URL = PROJECT_ROOT_URL;

// --- Helper function to resolve InstaBack file URLs ---
export const resolveInstabackFileUrl = (fileUrl) => {
    if (!fileUrl) return null;

    // אם זה כבר URL מלא ותקין של InstaBack, נחזיר אותו
    if (fileUrl.startsWith('https://instaback.ai')) {
        return fileUrl;
    }

    // אם זה URL של Base44 - נזהיר ונחזיר null (לא תומדים בזה)
    if (fileUrl.startsWith('https://base44.app') || fileUrl.startsWith('http://base44.app')) {
        console.warn('[resolveInstabackFileUrl] Found Base44 URL. Only InstaBack URLs are supported:', fileUrl);
        return null;
    }

    // אם זה נתיב יחסי שמתחיל ב-Project ID של InstaBack
    if (fileUrl.startsWith('/f78de3ce-0cab-4ccb-8442-0c5749792fe8') || fileUrl.startsWith('f78de3ce-0cab-4ccb-8442-0c5749792fe8')) {
        const cleanPath = fileUrl.startsWith('/') ? fileUrl.substring(1) : fileUrl;
        return `https://instaback.ai/project/${cleanPath}`;
    }

    // אם זה נתיב יחסי מתוך תיקיית /assets
    const cleanPath = fileUrl.startsWith('/') ? fileUrl.substring(1) : fileUrl;
    return `${PROJECT_ROOT_URL}/assets/${cleanPath}`;
};

// ✅ Fetch ממוטב - פחות retries, timeout קצר יותר
const _fetchWithAuth = async (endpoint, options = {}, retryCount = 0) => {
    const currentToken = getToken();
    const maxRetries = 1; // ✅ הפחתה מ-2 ל-1

    try {
        // Check if device is online before attempting request
        if (!isOnline()) {
            console.warn('[InstaBack] Device is offline');
            throw new Error('אין חיבור לאינטרנט');
        }

        // Build the full URL
        const url = `${API_BASE_URL}${endpoint}`;

        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': options.headers?.['Content-Type'] || 'application/json',
                'Authorization': currentToken ? `Bearer ${currentToken}` : '',
                'accept': 'application/json',
                ...(options.method === 'GET' && !options.headers?.['Cache-Control'] ? {
                    'Cache-Control': 'no-cache, no-store',
                    'Pragma': 'no-cache'
                } : {}),
                ...options.headers
            },
            ...(options.method === 'GET' && options.cache === undefined ? { cache: 'no-store' } : {}),
            signal: options.signal || AbortSignal.timeout(8000) // ✅ timeout של 8 שניות
        });

        if (!response.ok) {
            let errorMessage = `HTTP ${response.status}`;
            try {
                const errorText = await response.text();
                if (errorText) {
                    try {
                        const errorObj = JSON.parse(errorText);
                        const detail = errorObj.error || errorObj.message || errorObj.details || JSON.stringify(errorObj);
                        errorMessage += `: ${detail}`;
                    } catch {
                        errorMessage += `: ${errorText}`;
                    }
                }
            } catch (e) {
                // Ignore error reading body
            }

            const err = new Error(errorMessage);
            err.status = response.status;
            throw err;
        }

        const contentLength = response.headers.get('content-length');
        const contentType = response.headers.get('content-type');

        if (response.status === 204 || contentLength === '0' || !contentType?.includes('application/json')) {
            return { success: true };
        }

        const responseText = await response.text();
        if (!responseText.trim()) {
            return { success: true };
        }

        try {
            return JSON.parse(responseText);
        } catch (jsonError) {
            console.warn('[InstaBack] Invalid JSON response:', responseText);
            return { success: true, rawResponse: responseText };
        }

    } catch (error) {
        // Check if it's a network error
        const isNetError = isNetworkError(error);
        const shouldRetry = isNetError && retryCount < maxRetries;

        // Try proxy fallback for network errors (if not already tried via proxy)
        // Proxy fallback - רק פעם אחת
        if (isNetError && !options?._viaProxy && retryCount === 0) {
            try {
                console.log(`[InstaBack] Network error detected, trying proxy fallback...`);
                const headers = {
                    'Content-Type': 'application/json',
                    'accept': 'application/json',
                    ...(options.headers || {})
                };
                delete headers['Authorization'];

                const payload = {
                    endpoint,
                    options: {
                        method: options.method || 'GET',
                        headers,
                        body: options.body ?? null
                    },
                    token: currentToken || null
                };

                const { data } = await proxyInstaback(payload);
                console.log(`[InstaBack] Proxy fallback successful for ${endpoint}`);
                return typeof data === 'undefined' || data === null ? { success: true } : data;
            } catch (proxyError) {
                console.warn('[InstaBack] Proxy failed:', proxyError?.message);
                // Continue to retry logic below
            }
        }

        // Retry logic with exponential backoff
        // ✅ Retry עם delay קצר יותר
        if (shouldRetry) {
            const delay = 500; // ✅ הפחתה מ-1000 ל-500ms
            console.log(`[InstaBack] Retrying ${endpoint} in ${delay}ms`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return _fetchWithAuth(endpoint, { ...options, _viaProxy: options?._viaProxy || false }, retryCount + 1);
        }

        // After all retries failed, throw a user-friendly error
        if (isNetError) {
            const userError = new Error(isOnline() ? 'בעיית תקשורת עם השרת. אנא נסה שוב מאוחר יותר.' : 'אין חיבור לאינטרנט');
            userError.originalError = error;
            userError.isNetworkError = true;
            throw userError;
        }

        throw error;
    }
};

// Helper function to clean invalid event IDs from localStorage
const cleanInvalidEventFromLocalStorage = (eventId) => {
    if (typeof window === 'undefined') return;

    try {
        console.log(`[cleanInvalidEventFromLocalStorage] Removing invalid event ${eventId} from localStorage`);

        // Clean from pendingEventJoin (single)
        const singlePending = localStorage.getItem('pendingEventJoin');
        if (singlePending === eventId) {
            localStorage.removeItem('pendingEventJoin');
            console.log(`[cleanInvalidEventFromLocalStorage] Removed ${eventId} from pendingEventJoin`);
        }

        // Clean from pendingEventJoins (array)
        const storedPendingJoins = JSON.parse(localStorage.getItem('pendingEventJoins') || '[]');
        const updatedPendingJoins = storedPendingJoins.filter(id => id !== eventId);

        if (storedPendingJoins.length !== updatedPendingJoins.length) { // Corrected typo here
            localStorage.setItem('pendingEventJoins', JSON.stringify(updatedPendingJoins));
            console.log(`[cleanInvalidEventFromLocalStorage] Removed ${eventId} from pendingEventJoins array`);
        }
    } catch (err) {
        console.warn('[cleanInvalidEventFromLocalStorage] Error cleaning localStorage:', err);
    }
};


// --- Auth ---
export const instabackLogin = async (email, password) => {
    try {
        const response = await fetch(`${AUTH_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'accept': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Login failed');

        if (data.token) {
            setToken(data.token);

            // Save only the user object (not the full response)
            const userObject = data.user || data;
            if (typeof window !== 'undefined') {
                localStorage.setItem('instaback_user', JSON.stringify(userObject));
            }
        }
        return data.user || data;
    } catch (error) {
        throw new Error(error.message.includes('fetch') ? 'בעיה בהתחברות לשרת' : error.message);
    }
};

export const instabackRegister = async (userData) => {
    try {
        const response = await fetch(`${AUTH_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'accept': 'application/json' },
            body: JSON.stringify(userData),
        });
        const data = await response.json();
        if (!response.ok) {
            const errorDetail = data.issues?.[0]?.message || data.message || `שגיאה ${response.status}`;
            throw new Error(errorDetail);
        }
        return data;
    } catch (error) {
        throw new Error(error.message.includes('fetch') ? 'בעיה בהתחברות לשרת' : error.message);
    }
};

// ✅ איפוס סיסמה - בקשת קוד אימות וקבלת resetToken
export const requestPasswordReset = async (email) => {
    try {
        console.log('[requestPasswordReset] Sending request for:', email);

        // 🔧 InstaBack מצפה ל-username ולא ל-email!
        const response = await fetch(`${AUTH_BASE_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'accept': 'application/json' },
            body: JSON.stringify({ username: email }), // ✅ שינוי מ-email ל-username
        });

        const data = await response.json();

        if (!response.ok) {
            const errorDetail = data.message || `שגיאה ${response.status}`;
            throw new Error(errorDetail);
        }

        console.log('[requestPasswordReset] Success:', data);

        // ✅ מחזיר את כל התגובה כולל resetToken
        return {
            success: true,
            resetToken: data.resetToken || data.reset_token ||data.token || null,
            message: data.message || 'קוד אימות נשלח למייל'
        };
    } catch (error) {
        console.error('[requestPasswordReset] Error:', error);
        throw new Error(error.message.includes('fetch') ? 'בעיה בהתחברות לשרת' : error.message);
    }
};

// ✅ איפוס סיסמה - שינוי בפועל עם resetToken וקוד אימות
export const resetPassword = async (email, verificationCode, newPassword, resetToken) => {
    try {
        console.log('[resetPassword] Resetting password for:', email);

        if (!email || !verificationCode || !newPassword) {
            throw new Error('Email, verification code, and new password are required');
        }

        if (!resetToken) {
            throw new Error('Reset token is required');
        }

        // 🎯 שליחת הנתונים המלאים כולל resetToken
        const payload = {
            username: String(email).trim(),
            password: String(newPassword),
            otp: String(verificationCode).trim(),
            resetToken: String(resetToken).trim()
        };

        console.log('[resetPassword] 📤 Sending payload (without sensitive data):', {
            username: payload.username,
            hasPassword: !!payload.password,
            hasOtp: !!payload.otp,
            hasResetToken: !!payload.resetToken
        });

        const response = await fetch(`${AUTH_BASE_URL}/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'accept': 'application/json' },
            body: JSON.stringify(payload),
        });

        console.log('[resetPassword] Response status:', response.status);

        const data = await response.json();
        console.log('[resetPassword] Response data:', JSON.stringify(data, null, 2));

        if (!response.ok) {
            const errorDetail = data.message || data.error || data.details || `שגיאה ${response.status}`;
            throw new Error(errorDetail);
        }

        console.log('[resetPassword] ✅ Success!');
        return data;
    } catch (error) {
        console.error('[resetPassword] Error:', error);
        throw new Error(error.message.includes('fetch') ? 'בעיה בהתחברות לשרת' : error.message);
    }
};

export const instabackLogout = () => {
    setToken(null);
    if (typeof window !== 'undefined') {
        localStorage.removeItem('instaback_user');
    }
};

export const getCurrentUser = () => {
    try {
        if (typeof window !== 'undefined') {
            const userStr = localStorage.getItem('instaback_user');
            if (!userStr) return null;

            const parsed = JSON.parse(userStr);

            // If the stored data has a 'data' property (old format), extract it
            if (parsed && typeof parsed === 'object' && parsed.data) {
                console.warn('[getCurrentUser] Found user in old format with "data" wrapper, extracting...');
                const cleanUser = parsed.data;
                // Update localStorage with clean format
                localStorage.setItem('instaback_user', JSON.stringify(cleanUser));
                return cleanUser;
            }

            return parsed;
        }
        return null;
    } catch (e) {
        console.error('[getCurrentUser] Error parsing user from localStorage:', e);
        return null;
    }
};

export const getCurrentUserFromServer = async () => {
    const currentToken = getToken();
    if (!currentToken) return null;

    try {
        const storedUser = getCurrentUser();
        if (!storedUser?.id) return null;

        console.log('[getCurrentUserFromServer] Fetching user from server:', storedUser.id);
        const freshUser = await _fetchWithAuth(`/User/${storedUser.id}`, { method: 'GET' });

        if (freshUser) {
            console.log('[getCurrentUserFromServer] Fresh user from server:', freshUser);

            const normalizedUser = {
                ...freshUser,
                role: freshUser.role || freshUser.Role || (Array.isArray(freshUser.roles) ? freshUser.roles[0] : freshUser.roles)
            };

            console.log('[getCurrentUserFromServer] Normalized user:', normalizedUser);

            // Update localStorage with fresh data (clean format, no wrapper)
            if (typeof window !== 'undefined') {
                localStorage.setItem('instaback_user', JSON.stringify(normalizedUser));
                console.log('[getCurrentUserFromServer] Updated localStorage with fresh user data');
            }

            return normalizedUser;
        }

        return freshUser;
    } catch (error) {
        console.warn('[getCurrentUserFromServer] Failed to fetch user from server:', error);
        return null;
    }
};

const _parseDataFromParam = (param) => {
    if (!param) return null;
    try {
        return JSON.parse(param);
    } catch (_) {
        try {
            const b64 = param.replace(/-/g, '+').replace(/_/g, '/');
            const json = atob(b64);
            return JSON.parse(json);
        } catch {
            return null;
        }
    }
};

export const startGoogleLogin = (redirectUrl) => {
    const state = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now());
    try { sessionStorage.setItem('google_oauth_state', state); } catch {}

    const redirect_to = redirectUrl || (typeof window !== 'undefined'
        ? `${window.location.origin}/Auth?provider=google`
        : '');

    const url = `${AUTH_BASE_URL}/auth/google?redirect_url=${encodeURIComponent(redirect_to)}&state=${encodeURIComponent(state)}`;
    if (typeof window !== 'undefined') {
        window.location.href = url;
    }
};

export const handleGoogleOAuthCallback = () => {
    if (typeof window === 'undefined') return { handled: false };
    const url = new URL(window.location.href);
    const provider = url.searchParams.get('provider');

    if (provider !== 'google') return { handled: false };

    let token = url.searchParams.get('token') || url.searchParams.get('access_token') || url.searchParams.get('jwt');
    let user = _parseDataFromParam(url.searchParams.get('user'));

    if (!token) {
        const dataParam = url.searchParams.get('data');
        const parsed = _parseDataFromParam(dataParam);
        if (parsed?.data) {
            token = parsed.data.token || token;
            user = parsed.data.user || user;
        } else if (parsed) {
            token = parsed.token || token;
            user = parsed.user || user;
        }
    }

    if (!token && window.location.hash) {
        const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
        const params = new URLSearchParams(hash);
        token = params.get('token') || params.get('access_token') || params.get('jwt') || token;
        if (!user) {
            const userHashParam = params.get('user') || params.get('data');
            const parsed = _parseDataFromParam(userHashParam);
            if (parsed?.data?.user) user = parsed.data.user;
            else if (parsed?.user) user = parsed.user;
            else user = _parseDataFromParam(userHashParam) || user;
        }
    }

    if (!token) {
        return { handled: true, success: false, error: 'Missing token from Google callback' };
    }

    setToken(token);

    if (user) {
        try { localStorage.setItem('instaback_user', JSON.stringify(user)); } catch {}
        return { handled: true, success: true, user };
    }

    return { handled: true, success: true, user: null, warning: 'No user data returned in callback' };
};

export const loginWithGoogleMobile = async (idToken) => {
    if (!idToken) throw new Error('idToken is required');

    console.log('[loginWithGoogleMobile] 🚀 Starting Google mobile login...');

    const res = await fetch(`${AUTH_BASE_URL}/auth/google-mobile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'accept': 'application/json' },
        body: JSON.stringify({ id_token: idToken })
    });

    const data = await res.json().catch(() => ({}));
    console.log('[loginWithGoogleMobile] 📦 Server response:', data);

    if (!res.ok) {
        const msg = data?.message || `Google mobile login failed (HTTP ${res.status})`;
        throw new Error(msg);
    }

    if (data.token) {
        console.log('[loginWithGoogleMobile] 🔑 Saving token...');
        setToken(data.token);
    } else {
        console.error('[loginWithGoogleMobile] ❌ NO TOKEN IN RESPONSE!');
    }

    if (data.user) {
        console.log('[loginWithGoogleMobile] 👤 Saving user:', data.user);
        try { 
            localStorage.setItem('instaback_user', JSON.stringify(data.user)); 
            console.log('[loginWithGoogleMobile] ✅ User saved to localStorage');
        } catch (e) {
            console.error('[loginWithGoogleMobile] ❌ Failed to save user:', e);
        }
    } else {
        console.error('[loginWithGoogleMobile] ❌ NO USER IN RESPONSE!');
    }

    console.log('[loginWithGoogleMobile] ✅ Login complete, returning user');
    return data.user || data;
};

export const loginWithAppleMobile = async (idToken, email = null, fullName = null) => {
    if (!idToken) throw new Error('idToken is required');

    console.log('[loginWithAppleMobile] 🍎 Starting Apple mobile login...');

    const res = await fetch(`${AUTH_BASE_URL}/auth/apple-mobile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'accept': 'application/json' },
        body: JSON.stringify({ 
            id_token: idToken,
            email: email,
            full_name: fullName
        })
    });

    const data = await res.json().catch(() => ({}));
    console.log('[loginWithAppleMobile] 📦 Server response:', data);

    if (!res.ok) {
        const msg = data?.message || `Apple mobile login failed (HTTP ${res.status})`;
        throw new Error(msg);
    }

    if (data.token) {
        console.log('[loginWithAppleMobile] 🔑 Saving token...');
        setToken(data.token);
    } else {
        console.error('[loginWithAppleMobile] ❌ NO TOKEN IN RESPONSE!');
    }

    if (data.user) {
        console.log('[loginWithAppleMobile] 👤 Saving user:', data.user);
        try { 
            localStorage.setItem('instaback_user', JSON.stringify(data.user)); 
            console.log('[loginWithAppleMobile] ✅ User saved to localStorage');
        } catch (e) {
            console.error('[loginWithAppleMobile] ❌ Failed to save user:', e);
        }
    } else {
        console.error('[loginWithAppleMobile] ❌ NO USER IN RESPONSE!');
    }

    console.log('[loginWithAppleMobile] ✅ Login complete, returning user');
    return data.user || data;
};

// --- Users ---
export const getUserById = async (userId) => {
    if (!userId) throw new Error("User ID is required.");
    return _fetchWithAuth(`/User/${userId}`, { method: 'GET' });
};

export const listUsers = async (query = "") => {
    const qs = query ? (query.startsWith("?") ? query : `?${query}`) : "";
    return _fetchWithAuth(`/User${qs}`, { method: 'GET' });
};

export const findUserByEmail = async (email) => {
    if (!email) return null;
    const qs = `?email=${encodeURIComponent(email)}`;
    const res = await _fetchWithAuth(`/User${qs}`, { method: 'GET' });
    if (Array.isArray(res)) return res[0] || null;
    if (res && Array.isArray(res.items)) return res.items[0] || null;
    return null;
};

export const updateUser = async (userId, data) => {
    if (!userId) throw new Error("userId is required");
    return _fetchWithAuth(`/User/${userId}`, { method: 'PUT', body: JSON.stringify(data) });
};

export const deleteUser = async (userId) => {
    if (!userId) throw new Error("userId is required");
    try {
        return await _fetchWithAuth(`/User/${userId}`, { method: 'DELETE' });
    } catch (error) {
        if (error?.status === 404) {
            return { success: true, ignored404: true };
        }
        throw error;
    }
};

export const deleteUserSafe = async ({ id, email } = {}) => {
    try {
        let targetId = id || null;
        if (!targetId && email) {
            const match = await findUserByEmail(email).catch(() => null);
            targetId = match?.id || match?.Id || null;
        }
        if (!targetId) {
            return { success: true, skipped: true, reason: 'not_found' };
        }
        const res = await deleteUser(targetId);
        return res || { success: true };
    } catch (e) {
        if (e?.status === 404) {
            return { success: true, ignored404: true };
        }
        throw e;
    }
};

// --- Events ---
export const createEvent = async (data) => {
    if (!data.title) throw new Error("Event title is required");
    if (!data.owner_id) throw new Error("owner_id is required");

    // Update lastAction for the user creating the event
    updateUserLastAction(data.owner_id).catch(() => {});

    const payload = {
        title: data.title,
        description: data.description || '',
        location: data.location || '',
        owner_id: data.owner_id,
        privacy: data.privacy || 'private',
        category: data.category || null,
        eventDate: data.event_date || data.eventDate || null,
        event_date: data.event_date || data.eventDate || null,
        endDate: data.end_date || data.endDate || null,
        end_date: data.end_date || data.endDate || null,
        cover_image_url: data.cover_image_url || data.coverImageUrl || '',
        budget: data.budget || null,
        status: data.status || 'active',
        datePollEnabled: data.datePollEnabled || false,
        locationPollEnabled: data.locationPollEnabled || false,
        // Payment fields
        participationCost: data.participationCost || data.participation_cost || null,
        participation_cost: data.participationCost || data.participation_cost || null,
        hidePaymentsFromMembers: data.hidePaymentsFromMembers ?? data.hide_payments_from_members ?? false,
        hide_payments_from_members: data.hidePaymentsFromMembers ?? data.hide_payments_from_members ?? false,
        visibleTabs: data.visibleTabs || data.visible_tabs || null,
        visible_tabs: data.visibleTabs || data.visible_tabs || null,
        paymentMethod: data.paymentMethod || data.payment_method || null,
        payment_method: data.paymentMethod || data.payment_method || null,
        paymentMethods: data.paymentMethods || data.payment_methods || null,
        payment_methods: data.paymentMethods || data.payment_methods || null,
        paymentPhone: data.paymentPhone || data.payment_phone || null,
        payment_phone: data.paymentPhone || data.payment_phone || null,
        bankDetails: data.bankDetails || data.bank_details || null,
        bank_details: data.bankDetails || data.bank_details || null,
        // Recurring event field
        is_recurring: data.is_recurring || data.isRecurring || false
    };

    console.log('[createEvent] Sending payload to server:', payload);

    const result = await _fetchWithAuth('/Event', {
        method: 'POST',
        body: JSON.stringify(payload)
    });

    console.log('[createEvent] Server response:', result);
    return result;
};

export const getMyEvents = async (userId) => {
    if (!userId) throw new Error("User ID is required to fetch events.");

    try {
        const memberships = await _fetchWithAuth(`/EventMember?userId=${encodeURIComponent(userId)}`, { method: 'GET' });

        if (!memberships || memberships.length === 0) {
            return [];
        }

        const eventIds = memberships.map(m => m.eventId || m.EventId).filter(Boolean);
        const uniqueEventIds = Array.from(new Set(eventIds));

        if (uniqueEventIds.length === 0) {
            return [];
        }

        const eventsPromises = uniqueEventIds.map(async (eventId) => {
            try {
                const event = await _fetchWithAuth(`/Event/${eventId}`, { method: 'GET' });
                const membership = memberships.find(m => (m.eventId || m.EventId) === eventId);

                console.log('Event membership mapping:', {
                    eventId,
                    membership,
                    role: membership?.role || membership?.Role
                });

                return {
                    ...event,
                    userRole: membership?.role || membership?.Role || 'member',
                    membershipId: membership?.id
                };
            } catch (e) {
                console.warn(`Failed to load event ${eventId}:`, e.message);

                // If event failed to load (404 or network error), clean it from localStorage
                cleanInvalidEventFromLocalStorage(eventId);

                return null;
            }
        });

        const events = await Promise.all(eventsPromises);
        const validEvents = events.filter(Boolean);

        const uniqueEvents = validEvents.reduce((acc, event) => {
            if (!acc.find(e => e.id === event.id)) {
                acc.push(event);
            }
            return acc;
        }, []);

        console.log('Final events with roles:', uniqueEvents.map(e => ({
            id: e.id,
            title: e.title,
            userRole: e.userRole
        })));

        return uniqueEvents;

    } catch (error) {
        console.error("Failed to load user events:", error);
        throw error;
    }
};

// Get all public events
export const getPublicEvents = async () => {
    try {
        // Fetch all events and filter by privacy on client side
        const events = await _fetchWithAuth(`/Event`, { method: 'GET' });
        const allEvents = Array.isArray(events) ? events : (events?.items || []);
        
        // Filter for public and active events
        const publicEvents = allEvents.filter(e => 
            e.privacy === 'public' && 
            (e.status === 'active' || !e.status)
        );
        console.log('[getPublicEvents] Found', publicEvents.length, 'public events out of', allEvents.length, 'total');
        
        return publicEvents;
    } catch (error) {
        console.error("Failed to load public events:", error);
        return [];
    }
};

export const getEventDetails = async (eventId, retryCount = 0) => {
    if (!eventId) throw new Error("Event ID is required.");
    
    const MAX_RETRIES = 2;
    const TIMEOUT_MS = 10000; // 10 seconds timeout
    
    const currentToken = getToken();
    const url = `${API_BASE_URL}/Event/${eventId}?ts=${Date.now()}`;
    
    try {
        console.log(`[getEventDetails] Fetching event ${eventId} (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
        
        const res = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': currentToken ? `Bearer ${currentToken}` : '',
                'accept': 'application/json',
                'Cache-Control': 'no-cache, no-store',
                'Pragma': 'no-cache'
            },
            cache: 'no-store',
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (res.status === 404) {
            console.log(`[getEventDetails] Event ${eventId} not found (404)`);
            // Clean from localStorage if event doesn't exist
            cleanInvalidEventFromLocalStorage(eventId);
            return null;
        }
        
        if (!res.ok) {
            const errorText = await res.text().catch(() => '');
            throw new Error(`HTTP ${res.status}: ${errorText}`);
        }
        
        const data = await res.json();
        console.log(`[getEventDetails] Successfully loaded event ${eventId}`);
        return data;
        
    } catch (err) {
        // Handle timeout/abort errors
        if (err.name === 'AbortError') {
            console.warn(`[getEventDetails] Request timed out for event ${eventId}`);
            
            if (retryCount < MAX_RETRIES) {
                console.log(`[getEventDetails] Retrying... (${retryCount + 1}/${MAX_RETRIES})`);
                await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms before retry
                return getEventDetails(eventId, retryCount + 1);
            }
            
            throw new Error('הטעינה נמשכה יותר מדי זמן. אנא נסה שוב.');
        }
        
        // Handle network errors with retry
        if (isNetworkError(err) && retryCount < MAX_RETRIES) {
            console.log(`[getEventDetails] Network error, retrying... (${retryCount + 1}/${MAX_RETRIES})`);
            await new Promise(resolve => setTimeout(resolve, 500));
            return getEventDetails(eventId, retryCount + 1);
        }
        
        console.error(`[getEventDetails] Error loading event ${eventId}:`, err.message);
        throw err;
    }
};

export const checkEventMembership = async (eventId, userId) => {
    if (!eventId || !userId) return null;

    try {
        const memberships = await _fetchWithAuth(`/EventMember?eventId=${encodeURIComponent(eventId)}&userId=${encodeURIComponent(userId)}`, { method: 'GET' });
        console.log('User membership check:', { eventId, userId, memberships });
        return memberships && memberships.length > 0 ? memberships[0] : null;
    } catch (error) {
        console.warn("Failed to check event membership:", error);
        return null;
    }
};

export const getEventJoinData = async (eventId, userId = null) => {
    if (!eventId) throw new Error("Event ID is required.");

    const params = new URLSearchParams();
    params.append('eventId', eventId);
    if (userId) {
        params.append('userId', userId);
    }

    const currentToken = getToken();

    try {
        const response = await fetch(`${API_BASE_URL}/edge-function/join_getdata_event?${params.toString()}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': currentToken ? `Bearer ${currentToken}` : '',
                'accept': 'application/json',
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error calling join_getdata_event:', error);
        throw error;
    }
};

export const updateEvent = async (eventId, updates) => {
    if (!eventId) throw new Error("eventId is required");

    const payload = {
        title: updates.title,
        description: updates.description || '',
        location: updates.location || '',
        privacy: updates.privacy,
        event_date: updates.event_date || updates.eventDate || null,
        end_date: updates.end_date || updates.endDate || null,
        cover_image_url: updates.cover_image_url || updates.coverImageUrl || '',
        status: updates.status,
        budget: updates.budget,
        category: updates.category || null,
        // Public event payment fields
        participationCost: updates.participationCost || updates.participation_cost || null,
        participation_cost: updates.participationCost || updates.participation_cost || null,
        hidePaymentsFromMembers: updates.hidePaymentsFromMembers ?? updates.hide_payments_from_members ?? false,
        hide_payments_from_members: updates.hidePaymentsFromMembers ?? updates.hide_payments_from_members ?? false,
        // Tab visibility settings
        visibleTabs: updates.visibleTabs || updates.visible_tabs || null,
        visible_tabs: updates.visibleTabs || updates.visible_tabs || null,
        // Payment method settings
        paymentMethod: updates.paymentMethod || updates.payment_method || null,
        payment_method: updates.paymentMethod || updates.payment_method || null,
        paymentPhone: updates.paymentPhone || updates.payment_phone || null,
        payment_phone: updates.paymentPhone || updates.payment_phone || null,
        bankDetails: updates.bankDetails || updates.bank_details || null,
        bank_details: updates.bankDetails || updates.bank_details || null
    };

    console.log('[updateEvent] Sending payload to server:', payload);

    const result = await _fetchWithAuth(`/Event/${eventId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
    });

    console.log('[updateEvent] Server response:', result);
    return result;
};

export const deleteEvent = async (eventId, eventTitle = null) => {
    // Get event details before deletion for notifications
    let eventName = eventTitle;
    let eventMembers = [];
    
    try {
        if (!eventName) {
            const eventDetails = await _fetchWithAuth(`/Event/${eventId}`, { method: 'GET' }).catch(() => null);
            eventName = eventDetails?.title || 'האירוע';
        }
        
        // Get members to notify them
        eventMembers = await _fetchWithAuth(`/EventMember?eventId=${encodeURIComponent(eventId)}`, { method: 'GET' }).catch(() => []);
    } catch (err) {
        console.warn('[deleteEvent] Failed to get event details/members:', err);
    }

    const result = await _fetchWithAuth(`/Event/${eventId}`, { method: 'DELETE' });

    // Notify all members about event deletion
    const currentUser = getCurrentUser();
    const currentUserId = currentUser?.id;
    
    for (const member of (eventMembers || [])) {
        const memberId = member.userId || member.UserId || member.user_id;
        if (memberId && memberId !== currentUserId) {
            try {
                await createNotificationAndSendPush({
                    userId: memberId,
                    type: 'event_reminder',
                    title: 'אירוע בוטל ❌',
                    message: `האירוע "${eventName}" בוטל`,
                    priority: 'high'
                });
            } catch (notifErr) {
                console.warn('[deleteEvent] Failed to notify member:', memberId, notifErr);
            }
        }
    }

    return result;
};

// --- Event Members ---
export const joinEvent = async (eventId, userId) => {
    return _fetchWithAuth('/EventMember', {
        method: 'POST',
        body: JSON.stringify({ eventId, userId, role: 'member' })
    });
};

export const getEventMembers = async (eventId) => {
    if (!eventId) throw new Error("Event ID is required to get members.");

    try {
        const members = await _fetchWithAuth(`/EventMember?eventId=${encodeURIComponent(eventId)}`, { method: 'GET' });

        if (!members || members.length === 0) return [];

        const membersWithDetails = await Promise.all(
            members.map(async (member) => {
                const userId = member.userId || member.user_id;
                try {
                    if (!userId) return member;

                    const userDetails = await _fetchWithAuth(`/User/${userId}`, { method: 'GET' });
                    return {
                        ...member,
                        name: userDetails?.name || userDetails?.full_name || userDetails?.email || 'משתמש',
                        email: userDetails?.email || '',
                        avatar_url: userDetails?.avatar_url || null
                    };
                } catch (err) {
                    console.warn(`Failed to get user details for member ${userId}:`, err);
                    return member;
                }
            })
        );
        return membersWithDetails;
    } catch (err) {
        console.warn('Failed to fetch event members:', err);
        return [];
    }
};

export const createEventMember = async (membershipData) => {
    console.log('Creating EventMember with data:', membershipData);

    // Normalize role names to match InstaBack server expectations
    // Server expects: 'organizer', 'member', 'manger' (note the typo)
    let serverRole = membershipData.role;

    if (membershipData.role === 'owner') {
        serverRole = 'organizer';
    } else if (membershipData.role === 'manager') {
        serverRole = 'manger'; // Server has typo: "manger" instead of "manager"
    }

    const adjustedData = {
        eventId: membershipData.eventId,
        userId: membershipData.userId,
        role: serverRole
    };

    console.log('Adjusted EventMember data for server:', adjustedData);
    return _fetchWithAuth('/EventMember', { method: 'POST', body: JSON.stringify(adjustedData) });
};

export const listAllEventMembers = async () => {
    return _fetchWithAuth(`/EventMember`, { method: 'GET' });
};

export const updateEventMember = async (membershipId, data) => {
    const payload = {};
    if (data.lastSeenMessageTimestamp !== undefined) {
        payload.lastSeenMessageTimestamp = data.lastSeenMessageTimestamp;
    }
    if (data.role !== undefined) {
        payload.role = data.role;
    }
    // Payment status fields
    if (data.paymentStatus !== undefined) {
        payload.paymentStatus = data.paymentStatus;
        payload.payment_status = data.paymentStatus;
    }
    if (data.paymentDate !== undefined) {
        payload.paymentDate = data.paymentDate;
        payload.payment_date = data.paymentDate;
    }
    if (data.paymentNote !== undefined) {
        payload.paymentNote = data.paymentNote;
        payload.payment_note = data.paymentNote;
    }

    return _fetchWithAuth(`/EventMember/${membershipId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
    });
};

export const markChatAsRead = async (eventId, userId) => {
    const instabackToken = getToken();
    if (!instabackToken || !eventId || !userId) {
        console.warn('Missing required parameters for markChatAsRead');
        return { success: false };
    }

    try {
        const response = await fetch(`${API_BASE_URL}/edge-function/markchatasread`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${instabackToken}`,
                'accept': 'application/json'
            },
            body: JSON.stringify({
                params: {
                    eventId: eventId,
                    userId: userId
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.warn('markChatAsRead failed:', errorText);
            return { success: false };
        }

        const result = await response.json();
        console.log('📖 Chat marked as read:', result);
        return result;
    } catch (error) {
        console.warn('markChatAsRead error:', error);
        return { success: false };
    }
};

export const setEventMemberRole = async (membershipId, role) => {
    if (!membershipId) throw new Error("membershipId is required");
    if (!['member', 'manger', 'manager', 'organizer'].includes(role)) throw new Error("invalid role");

    const serverRole = role === 'manager' ? 'manger' : role;

    return _fetchWithAuth(`/EventMember/${membershipId}`, {
        method: 'PUT',
        body: JSON.stringify({ role: serverRole })
    });
};

export const removeEventMember = async (eventId, userId, eventTitle = null) => {
    if (!eventId || !userId) throw new Error("eventId and userId are required");
    
    const result = await _fetchWithAuth(`/edge-function/remove_event_member`, {
        method: 'POST',
        body: JSON.stringify({ eventId, userId })
    });

    // Notify the removed user
    try {
        let eventName = eventTitle;
        if (!eventName) {
            const eventDetails = await _fetchWithAuth(`/Event/${eventId}`, { method: 'GET' }).catch(() => null);
            eventName = eventDetails?.title || 'האירוע';
        }

        await createNotificationAndSendPush({
            userId: userId,
            type: 'event_invitation',
            title: 'הוסרת מאירוע',
            message: `הוסרת מ"${eventName}"`,
            priority: 'normal'
        });
    } catch (notifyError) {
        console.warn('[removeEventMember] Failed to notify removed user:', notifyError);
    }

    return result;
};

export const leaveEvent = async (eventId, eventTitle = null) => {
    try {
        const currentUser = getCurrentUser();
        if (!currentUser?.id) {
            throw new Error('User not authenticated');
        }

        console.log('[leaveEvent] Leaving event:', { eventId, userId: currentUser.id });

        const memberships = await _fetchWithAuth(
            `/EventMember?eventId=${encodeURIComponent(eventId)}&userId=${encodeURIComponent(currentUser.id)}`,
            { method: 'GET' }
        );

        if (!memberships || memberships.length === 0) {
            console.warn('[leaveEvent] No membership found');
            return { success: true, message: 'Not a member' };
        }

        const membership = Array.isArray(memberships) ? memberships[0] : memberships;

        if (membership.role === 'owner' || membership.role === 'organizer') {
            throw new Error('מארגן האירוע לא יכול לעזוב את האירוע');
        }

        await _fetchWithAuth(`/EventMember/${membership.id}`, { method: 'DELETE' });

        // Notify event organizer about member leaving
        try {
            const eventDetails = await _fetchWithAuth(`/Event/${eventId}`, { method: 'GET' });
            const ownerId = eventDetails?.owner_id || eventDetails?.ownerId;
            const eventName = eventTitle || eventDetails?.title || 'האירוע';
            const userName = currentUser.name || currentUser.full_name || currentUser.email || 'משתמש';

            if (ownerId && ownerId !== currentUser.id) {
                await createNotificationAndSendPush({
                    userId: ownerId,
                    type: 'member_joined',
                    title: 'משתתף עזב את האירוע 👋',
                    message: `${userName} עזב/ה את "${eventName}"`,
                    eventId: eventId,
                    priority: 'normal'
                });
            }
        } catch (notifyError) {
            console.warn('[leaveEvent] Failed to notify organizer:', notifyError);
        }

        console.log('[leaveEvent] Successfully left event');
        return { success: true };
    } catch (error) {
        console.error('[leaveEvent] Failed:', error);
        throw error;
    }
};

// --- Tasks ---
export const listTasks = async (eventId) => {
    if (!eventId) throw new Error("Event ID is required to list tasks.");
    return _fetchWithAuth(`/Task?eventId=${eventId}`, { method: 'GET' });
};

export const updateTask = async (taskId, taskData) => {
    return _fetchWithAuth(`/Task/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify(taskData)
    });
};

export const updateTaskWithNotifications = async (taskId, updates) => {
    const instabackToken = getToken();
    if (!instabackToken) throw new Error('Authentication required');

    try {
        const response = await fetch(`${API_BASE_URL}/edge-function/updatetaskwithnotifications`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${instabackToken}`,
                'accept': 'application/json'
            },
            body: JSON.stringify({
                params: {
                    taskId: taskId,
                    updates: updates
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to update task: ${errorText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error updating task with notifications:', error);
        throw error;
    }
};

export const createTask = async (taskData) => {
    // Update lastAction for the current user
    const currentUser = getCurrentUser();
    if (currentUser?.id) {
        updateUserLastAction(currentUser.id).catch(() => {});
    }

    const payload = {
        eventId: taskData.eventId,
        title: taskData.title,
        description: taskData.description || taskData.title || 'משימה חדשה',
        status: taskData.status || 'todo',
        assigneeId: taskData.assigneeId || null
    };

    return _fetchWithAuth('/Task', { method: 'POST', body: JSON.stringify(payload) });
};

export const deleteTask = async (taskId) => {
    if (!taskId) throw new Error("Task ID is required");

    try {
        const result = await _fetchWithAuth(`/Task/${taskId}`, { method: 'DELETE' });
        return result;
    } catch (error) {
        console.error("Failed to delete task:", error);
        throw new Error(`Failed to delete task: ${error.message}`);
    }
};

// --- Messages ---
export const getMessages = async (eventId) => {
    if (!eventId) throw new Error("Event ID is required to get messages.");
    const t = getToken();
    if (!t) {
        console.warn("Skipping getMessages(): InstaBack token is missing. Returning empty list.");
        return [];
    }
    const encodedId = encodeURIComponent(eventId);
    return await _fetchWithAuth(`/Message?eventId=${encodedId}`, { method: 'GET' });
};

export const createMessage = async (messageData) => {
    const instabackToken = getToken();
    if (!instabackToken) throw new Error('Authentication required');

    // Update lastAction for the current user
    const currentUser = getCurrentUser();
    if (currentUser?.id) {
        updateUserLastAction(currentUser.id).catch(() => {});
    }

    try {
        const response = await fetch(`${API_BASE_URL}/edge-function/createmessagewithnotifications`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${instabackToken}`,
                'accept': 'application/json'
            },
            body: JSON.stringify({
                params: {
                    eventId: messageData.eventId,
                    content: messageData.content,
                    fileUrl: messageData.fileUrl || null
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        return result.message || result;
    } catch (error) {
        console.error('Error creating message:', error);
        throw error;
    }
};

// --- Itinerary ---
export const listItineraryItems = async (eventId) => {
    if (!eventId) throw new Error("eventId is required");
    return _fetchWithAuth(`/ItineraryItem?eventId=${encodeURIComponent(eventId)}`, { method: 'GET' });
};

export const createItineraryItem = async (data) => {
    const eid = String(data.eventId ?? data.event_id ?? '').trim();
    if (!eid) throw new Error("eventId is required for itinerary item");

    const payload = {
        eventId: eid,
        title: data.title,
        location: data.location ?? '',
        date: data.date,
        endDate: data.endDate || null,
        order: typeof data.order === 'number' ? data.order : undefined,
        assigneeId: data.assigneeId || undefined
    };

    return _fetchWithAuth('/ItineraryItem', {
        method: 'POST',
        body: JSON.stringify(payload)
    });
};

export const updateItineraryItem = async (itemId, data) => {
    if (!itemId) throw new Error("itemId is required");

    const payload = {
        title: data.title,
        location: data.location,
        date: data.date,
        endDate: data.endDate || null,
        assigneeId: data.assigneeId || undefined
    };

    return _fetchWithAuth(`/ItineraryItem/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
    });
};

export const deleteItineraryItem = async (itemId) => {
    if (!itemId) throw new Error("itemId is required");
    return _fetchWithAuth(`/ItineraryItem/${itemId}`, { method: 'DELETE' });
};

// --- Professionals ---
export const listProfessionals = async (eventId) => {
    if (!eventId) throw new Error("eventId is required");
    return _fetchWithAuth(`/Professional?eventId=${encodeURIComponent(eventId)}`, { method: 'GET' });
};

export const createProfessional = async (data) => {
    console.log('Creating Professional with data:', data);

    const payload = {
        eventId: data.eventId,
        _uid: data.createdBy || data._uid,
        name: data.name,
        profession: data.profession,
        phone: data.phone,
        email: data.email,
        website: data.website,
        notes: data.notes,
        cost: data.cost,
        status: data.status
    };

    console.log('Professional payload:', payload);
    return _fetchWithAuth('/Professional', { method: 'POST', body: JSON.stringify(payload) });
};

export const updateProfessional = async (id, data) => {
    if (!id) throw new Error("id is required");
    return _fetchWithAuth(`/Professional/${id}`, { method: 'PUT', body: JSON.stringify(data) });
};

export const deleteProfessional = async (id) => {
    if (!id) throw new Error("id is required");
    return _fetchWithAuth(`/Professional/${id}`, { method: 'DELETE' });
};

// --- Event Links ---
export const listEventLinks = async (eventId) => {
    if (!eventId) throw new Error("eventId is required");
    return _fetchWithAuth(`/EventLink?eventId=${encodeURIComponent(eventId)}`, { method: 'GET' });
};

export const createEventLink = async (data) => {
    return _fetchWithAuth('/EventLink', { method: 'POST', body: JSON.stringify(data) });
};

export const updateEventLink = async (linkId, data) => {
    if (!linkId) throw new Error("linkId is required");
    return _fetchWithAuth(`/EventLink/${linkId}`, { method: 'PUT', body: JSON.stringify(data) });
};

export const deleteEventLink = async (linkId) => {
    if (!linkId) throw new Error("linkId is required");
    return _fetchWithAuth(`/EventLink/${linkId}`, { method: 'DELETE' });
};

// --- Media Items ---
export const listMediaItems = async (eventId) => {
    if (!eventId) throw new Error("eventId is required");

    console.log('[listMediaItems] Fetching media items for event:', eventId);

    const items = await _fetchWithAuth(`/MediaItem?eventId=${encodeURIComponent(eventId)}`, { method: 'GET' });

    console.log('[listMediaItems] Raw response:', JSON.stringify(items, null, 2));

    // Normalize field names - InstaBack might return snake_case
    const normalized = (Array.isArray(items) ? items : []).map(item => {
        const normalized = {
            ...item,
            // Make sure we have fileUrl in camelCase
            fileUrl: item.fileUrl || item.file_url || item.FileUrl || item.url,
            fileName: item.fileName || item.file_name || item.FileName,
            fileType: item.fileType || item.file_type || item.FileType,
            fileSize: item.fileSize || item.file_size || item.FileSize,
            uploaderId: item.uploaderId || item.uploader_id || item.UploaderId,
            eventId: item.eventId || item.event_id || item.EventId
        };

        console.log('[listMediaItems] Normalized item:', {
            id: normalized.id,
            fileUrl: normalized.fileUrl,
            fileName: normalized.fileName
        });

        return normalized;
    });

    return normalized;
};

export const createMediaItem = async (data) => {
    console.log('[createMediaItem] Creating with data:', JSON.stringify(data, null, 2));

    const payload = {
        eventId: data.eventId,
        uploaderId: data.uploaderId,
        fileUrl: data.fileUrl, // השדה הנכון
        fileName: data.fileName,
        fileType: data.fileType,
        fileSize: data.fileSize
    };

    console.log('[createMediaItem] Sending payload:', JSON.stringify(payload, null, 2));

    const result = await _fetchWithAuth('/MediaItem', {
        method: 'POST',
        body: JSON.stringify(payload)
    });

    console.log('[createMediaItem] Server response:', JSON.stringify(result, null, 2));

    // Normalize the response
    return {
        ...result,
        fileUrl: result.fileUrl || result.file_url || result.FileUrl,
        fileName: result.fileName || result.file_name || result.FileName,
        fileType: result.fileType || result.file_type || result.FileType,
        fileSize: result.fileSize || result.file_size || result.FileSize,
        uploaderId: result.uploaderId || result.uploader_id || result.UploaderId,
        eventId: result.eventId || result.event_id || result.EventId
    };
};

export const updateMediaItem = async (mediaId, updates) => {
    if (!mediaId) throw new Error("mediaId is required");
    return _fetchWithAuth(`/MediaItem/${encodeURIComponent(mediaId)}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
    });
};

export const deleteMediaItem = async (mediaId) => {
    if (!mediaId) throw new Error("mediaId is required");
    return _fetchWithAuth(`/MediaItem/${mediaId}`, { method: 'DELETE' });
};

// --- Event Documents ---
export const listEventDocuments = async (eventId) => {
    if (!eventId) throw new Error("eventId is required");
    const docs = await _fetchWithAuth(`/EventDocument?eventId=${encodeURIComponent(eventId)}`, { method: 'GET' });

    // Normalize fileUrl field (support both fileUrl and file_url)
    return (Array.isArray(docs) ? docs : []).map(doc => ({
        ...doc,
        fileUrl: doc.fileUrl || doc.file_url || doc.FileUrl
    }));
};

export const createEventDocument = async (data) => {
    console.log('[createEventDocument] Input data:', JSON.stringify(data, null, 2));

    if (!data.fileUrl) {
        console.error('[createEventDocument] ERROR: fileUrl is missing from input data!');
        throw new Error('fileUrl is required but missing from document data');
    }

    if (!data.fileName) {
        console.error('[createEventDocument] ERROR: fileName is missing from input data!');
        throw new Error('fileName is required but missing from document data');
    }

    const payload = {
        eventId: data.eventId,
        uploaderId: data.uploaderId,
        fileName: data.fileName, // הכותרת
        description: data.description || '', // תיאור אופציונלי
        fileUrl: data.fileUrl,
        fileType: data.fileType || 'application/octet-stream',
        fileSize: data.fileSize || 0
    };

    console.log('[createEventDocument] Sending payload to InstaBack:', JSON.stringify(payload, null, 2));

    const result = await _fetchWithAuth('/EventDocument', { method: 'POST', body: JSON.stringify(payload) });

    console.log('[createEventDocument] Server response:', JSON.stringify(result, null, 2));

    // Check if server saved the fileUrl
    const savedFileUrl = result.fileUrl || result.file_url || result.FileUrl;
    if (!savedFileUrl) {
        console.error('[createEventDocument] WARNING: Server response does not contain fileUrl!');
        console.error('[createEventDocument] Server may not have saved the fileUrl properly');
    }

    // Normalize response
    return {
        ...result,
        fileUrl: savedFileUrl,
        fileName: result.fileName || result.file_name || result.FileName,
        description: result.description || result.Description || ''
    };
};

export const updateEventDocument = async (docId, updates) => {
    if (!docId) throw new Error("docId is required");
    return _fetchWithAuth(`/EventDocument/${encodeURIComponent(docId)}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
    });
};

export const deleteEventDocument = async (docId) => {
    if (!docId) throw new Error("docId is required");
    return _fetchWithAuth(`/EventDocument/${docId}`, { method: 'DELETE' });
};

// --- Event Expenses ---
export const listEventExpenses = async (eventId) => {
    if (!eventId) throw new Error("eventId is required");
    return _fetchWithAuth(`/EventExpense?eventId=${encodeURIComponent(eventId)}`, { method: 'GET' });
};

export const createEventExpense = async (data) => {
    if (!data?.eventId) throw new Error("eventId is required");
    if (!data?.userId) throw new Error("userId is required");
    if (typeof data.amount === 'undefined' || data.amount === null) throw new Error("amount is required");
    const payload = {
        eventId: data.eventId,
        userId: data.userId,
        description: data.description || '',
        amount: Number(data.amount),
        isGeneral: data.isGeneral !== false,
        paidForUserId: data.paidForUserId || null,
        receiptUrl: data.receiptUrl || null,
    };
    return _fetchWithAuth('/EventExpense', { method: 'POST', body: JSON.stringify(payload) });
};

export const updateEventExpense = async (id, data) => {
    if (!id) throw new Error("id is required");
    return _fetchWithAuth(`/EventExpense/${id}`, { method: 'PUT', body: JSON.stringify(data || {}) });
};

export const deleteEventExpense = async (id) => {
    if (!id) throw new Error("id is required");
    return _fetchWithAuth(`/EventExpense/${id}`, { method: 'DELETE' });
};

// --- Polls ---
const _normalizePollOptions = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) {
        return raw.map((o, idx) => {
            if (typeof o === 'string') return { id: o, text: o, order: idx };
            const id = o.id ?? o.value ?? o.text ?? String(idx);
            const text = o.text ?? o.label ?? o.value ?? String(id);
            return { id: String(id), text: String(text), ...o, order: idx };
        });
    }
    if (typeof raw === 'object') {
        return Object.entries(raw).map(([key, val], idx) => {
            if (typeof val === 'string') return { id: String(key), text: val, order: idx };
            const id = val.id ?? key;
            const text = val.text ?? val.label ?? String(key);
            return { id: String(id), text: String(text), ...val, order: idx };
        });
    }
    return [];
};

const _normalizePollVotesMap = (raw) => {
    const map = {};
    if (!raw) return map;

    if (Array.isArray(raw)) {
        raw.forEach((v) => {
            const optionId = v.optionId ?? v.option_id ?? v.option ?? v.optionID;
            const userId = v.userId ?? v.user_id ?? v.user ?? v.userID;
            const voteType = v.voteType ?? v.vote_type ?? v.type ?? 'yes';
            if (!optionId || !userId) return;
            if (!map[optionId]) map[optionId] = {};
            map[optionId][userId] = voteType;
        });
        return map;
    }

    if (typeof raw === 'object') {
        return raw;
    }

    return map;
};

const _votesMapToArray = (votesMap) => {
    const res = [];
    if (!votesMap || typeof votesMap !== 'object') return res;
    Object.entries(votesMap).forEach(([optionId, byUser]) => {
        Object.entries(byUser || {}).forEach(([userId, voteType]) => {
            res.push({ option_id: String(optionId), user_id: String(userId), vote_type: String(voteType) });
        });
    });
    return res;
};

const _normalizePollType = (rawType) => {
    if (!rawType) return 'generic';
    const v = String(rawType).toLowerCase();
    if (v === 'multiple_choice' || v === 'custom' || v === 'מותאם אישית') return 'generic';
    if (v === 'תאריך' || v === 'date') return 'date';
    if (v === 'מקום' || v === 'location') return 'location';
    return v;
};

const _parseFlexibleDateToISO = (value) => {
    if (!value) return null;
    if (value instanceof Date) return value.toISOString();
    const str = String(value).trim();

    const dNative = new Date(str);
    if (!isNaN(dNative.getTime())) return dNative.toISOString();

    const m = str.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2}|\d{4})$/);
    if (m) {
        const dd = parseInt(m[1], 10);
        const mm = parseInt(m[2], 10) - 1;
        let yyyy = parseInt(m[3], 10);
        if (yyyy < 100) yyyy = 2000 + yyyy;
        const d = new Date(yyyy, mm, dd, 12, 0, 0);
        if (!isNaN(d.getTime())) return d.toISOString();
    }
    return null;
};

export const updateEventPollFlag = async ({ eventId, pollType }) => {
    if (!eventId) throw new Error("eventId is required");
    if (!pollType) throw new Error("pollType is required");
    const type = _normalizePollType(pollType);
    if (!['date', 'location'].includes(type)) {
        return { success: true, skipped: true };
    }

    const payload = { eventId: String(eventId), pollType: type };

    const endpoints = [
        `${API_BASE_URL}/edge-function/Update_Event_poll`,
        `${API_BASE_URL}/edge-function/update_event_poll`,
        `${API_BASE_URL}/edge-function/updateEventPoll`
    ];

    let lastErr = null;
    for (const ep of endpoints) {
        try {
            const res = await _fetchWithAuth(ep.replace(API_BASE_URL, ''), { method: 'POST', body: JSON.stringify(payload) });
            return res || { success: true };
        } catch (e) {
            if (e?.status === 404 || e?.status === 405) {
                lastErr = e;
                continue;
            }
            throw e;
        }
    }
    return { success: true, attempted: endpoints };
};

export const applyEventResultFromPoll = async ({ eventId, date, location } = {}) => {
    if (!eventId) throw new Error("eventId is required");
    const payload = { eventId: String(eventId) };
    if (date) payload.date = typeof date === 'string' ? new Date(date).toISOString() : new Date(date).toISOString();
    if (location) payload.location = String(location);

    const endpoints = [
        `${API_BASE_URL}/edge-function/update_event_result`,
        `${API_BASE_URL}/edge-function/updateEventResult`,
        `${API_BASE_URL}/edge-function/update_event_from_poll`,
        `${API_BASE_URL}/edge-function/updateEventFromPoll`
    ];

    for (const ep of endpoints) {
        try {
            const res = await _fetchWithAuth(ep.replace(API_BASE_URL, ''), { method: 'POST', body: JSON.stringify(payload) });
            return res || { success: true };
        } catch (e) {
            if (e?.status === 404 || e?.status === 405) continue;
            throw e;
        }
    }

    const updates = {};
    if (payload.date) {
        updates.eventDate = payload.date;
        updates.event_date = payload.date;
        updates.datePollEnabled = false;
        updates.hasActiveDatePoll = false;
        updates.has_active_date_poll = false;
    }
    if (payload.location) {
        updates.location = payload.location;
        updates.locationPollEnabled = false;
        updates.hasActiveLocationPoll = false;
        updates.has_active_location_poll = false;
    }
    if (Object.keys(updates).length > 0) {
        await _fetchWithAuth(`/Event/${encodeURIComponent(eventId)}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
    }
    return { success: true, fallback: true };
};

export const clearEventPollFlags = async (eventId) => {
    if (!eventId) throw new Error("eventId is required");
    const payload = { eventId: String(eventId), pollType: 'generic' };
    const endpoints = [
        `${API_BASE_URL}/edge-function/Update_Event_poll`,
        `${API_BASE_URL}/edge-function/update_event_poll`,
        `${API_BASE_URL}/edge-function/updateEventPoll`
    ];
    for (const ep of endpoints) {
        try {
            const res = await _fetchWithAuth(ep.replace(API_BASE_URL, ''), { method: 'POST', body: JSON.stringify(payload) });
            return res || { success: true };
        } catch (e) {
            if (e?.status === 404 || e?.status === 405) continue;
            throw e;
        }
    }
    return { success: true, attempted: endpoints };
};

export const getPollById = async (pollId) => {
    if (!pollId) throw new Error("pollId is required");
    const data = await _fetchWithAuth(`/Poll/${pollId}`, { method: 'GET' });
    if (!data) return null;
    const options = _normalizePollOptions(data.options);
    const votesMap = _normalizePollVotesMap(data.votes);
    const votes = _votesMapToArray(votesMap);
    return {
        ...data,
        type: _normalizePollType(data.type),
        allowMultiple: !!(data.allowMultiple ?? data.allow_multiple),
        isActive: !!(data.isActive ?? data.is_active ?? true),
        options,
        votes,
        votesMap
    };
};

export const getPolls = async (eventId) => {
    console.log('[getPolls] Fetching polls for eventId:', eventId);

    if (!eventId) throw new Error("eventId is required");

    const ts = Date.now();

    let res = await _fetchWithAuth(`/Poll?eventId=${encodeURIComponent(eventId)}&ts=${ts}`, { method: 'GET' }).catch(() => null);

    if (!res || (Array.isArray(res) ? res.length === 0 : !Array.isArray(res?.items))) {
        console.log('[getPolls] Trying with event_id fallback');
        res = await _fetchWithAuth(`/Poll?event_id=${encodeURIComponent(eventId)}&ts=${ts}`, { method: 'GET' }).catch(() => null);
    }

    let listRaw;
    if (res) {
        listRaw = Array.isArray(res) ? res : (Array.isArray(res?.items) ? res.items : []);
        console.log('[getPolls] Got polls from query:', listRaw.length);
    } else {
        console.log('[getPolls] Using final fallback - fetch all');
        const all = await _fetchWithAuth(`/Poll?ts=${ts}`, { method: 'GET' }).catch(() => []);
        const arr = Array.isArray(all) ? all : (Array.isArray(all?.items) ? all.items : []);
        listRaw = arr.filter(p => {
            const pollEventId = p.eventId || p.event_id || p.EventId;
            return String(pollEventId) === String(eventId);
        });
        console.log('[getPolls] Filtered polls:', listRaw.length);
    }

    const normalized = (listRaw || []).map((p) => {
        const options = _normalizePollOptions(p.options);
        const votesMap = _normalizePollVotesMap(p.votes);
        const votes = _votesMapToArray(votesMap);
        return {
            ...p,
            eventId: p.eventId || p.event_id || p.EventId,
            type: _normalizePollType(p.type),
            allowMultiple: !!(p.allowMultiple ?? p.allow_multiple),
            isActive: !!(p.isActive ?? p.is_active ?? true),
            options,
            votes,
            votesMap
        };
    });

    console.log('[getPolls] Normalized polls:', normalized);
    return normalized;
};

export const getPollVotes = async ({ pollId }) => {
    if (!pollId) return [];
    const poll = await getPollById(pollId);
    return poll?.votes ?? [];
};

export const voteInPoll = async ({ poll, optionId, voteType, currentUserId }) => {
    if (!poll?.id) throw new Error("poll is required");
    if (!optionId) throw new Error("optionId is required");
    if (!['yes', 'no', 'maybe'].includes(voteType)) throw new Error("voteType must be yes/no/maybe");
    if (!currentUserId) throw new Error("currentUserId is required");

    const latest = await getPollById(poll.id);
    const allowMultiple = !!latest.allowMultiple;
    const votesMap = { ...(latest.votesMap || {}) };

    votesMap[optionId] = votesMap[optionId] || {};

    const already = votesMap[optionId][currentUserId];

    if (already === voteType) {
        delete votesMap[optionId][currentUserId];
        if (Object.keys(votesMap[optionId]).length === 0) delete votesMap[optionId];
    } else {
        if (!allowMultiple) {
            Object.keys(votesMap).forEach((oid) => {
                if (votesMap[oid] && votesMap[oid][currentUserId]) {
                    delete votesMap[oid][currentUserId];
                    if (Object.keys(votesMap[oid]).length === 0) delete votesMap[oid];
                }
            });
        }
        votesMap[optionId] = votesMap[optionId] || {};
        votesMap[optionId][currentUserId] = voteType;
    }

    const payload = {
        votes: votesMap
    };
    await _fetchWithAuth(`/Poll/${latest.id}`, { method: 'PUT', body: JSON.stringify(payload) });

    const updated = await getPollById(latest.id);
    return { success: true, poll: updated };
};

export const createPoll = async (data) => {
    const eid = String(data.eventId ?? data.event_id ?? '').trim();
    if (!eid) throw new Error("eventId is required for poll");

    console.log('[createPoll] Creating poll with eventId:', eid);

    const transformedOptions = (data.options || []).map(opt => {
        const transformed = {
            id: opt.id,
            text: opt.text
        };

        if (opt.description) transformed.description = opt.description;
        if (opt.location) transformed.location = opt.location;

        if (opt.date) transformed.date = opt.date;
        if (opt.start_date || opt.startDate) {
            transformed.start_date = opt.start_date || opt.startDate;
        }
        if (opt.end_date || opt.endDate) {
            transformed.end_date = opt.end_date || opt.endDate;
        }

        return transformed;
    });

    const payload = {
        eventId: eid,
        event_id: eid,
        title: data.title,
        type: data.type || 'generic',
        options: transformedOptions,
        votes: [],
        allow_multiple: data.allowMultiple ?? data.allow_multiple ?? false,
        allowMultiple: data.allowMultiple ?? data.allow_multiple ?? false,
        is_active: data.isActive ?? data.is_active ?? true,
        isActive: data.isActive ?? data.is_active ?? true,
    };

    console.log('[createPoll] Sending payload:', JSON.stringify(payload, null, 2));

    const result = await _fetchWithAuth('/Poll', {
        method: 'POST',
        body: JSON.stringify(payload)
    });

    console.log('[createPoll] Server response:', result);

    return result;
};

export const updatePoll = async (pollId, data) => {
    if (!pollId) throw new Error("pollId is required");
    const payload = {
        ...data,
        allowMultiple: data?.allowMultiple ?? data?.allow_multiple,
        isActive: data?.isActive ?? data?.is_active
    };
    const res = await _fetchWithAuth(`/Poll/${pollId}`, { method: 'PUT', body: JSON.stringify(payload) });

    const pollType = _normalizePollType(payload.type);
    if (['date', 'location'].includes(pollType) && (payload.isActive !== false)) {
        try {
            let eventId = payload.eventId || payload.event_id;
            if (!eventId) {
                const latest = await getPollById(pollId).catch(() => null);
                eventId = latest?.eventId || latest?.event_id;
            }
            if (eventId) {
                await updateEventPollFlag({ eventId, pollType });
            }
        } catch (_) {}
    }

    return res;
};

export const finalizePoll = async ({ poll, optionId, currentUserId, eventId = null, eventTitle = null } = {}) => {
    if (!poll?.id) throw new Error("poll is required");
    if (!optionId) throw new Error("optionId is required");

    let finalUserId = currentUserId;
    if (!finalUserId) {
        const storedUser = getCurrentUser();
        if (storedUser?.id) {
            finalUserId = storedUser.id;
        }
    }

    if (!finalUserId) {
        throw new Error("A user ID is required to finalize a poll. Please re-login.");
    }

    const serverPayload = {
        pollId: String(poll.id),
        optionId: String(optionId),
        userId: String(finalUserId),
    };

    await _fetchWithAuth(`/edge-function/finalize_event_poll`, {
        method: 'POST',
        body: JSON.stringify(serverPayload)
    });

    const rawType = poll?.type || '';
    const pollType = String(rawType).toLowerCase();
    const opts = Array.isArray(poll?.options) ? poll.options : [];
    const selected = opts.find(o => String(o.id) === String(optionId));
    if (!selected) {
        return { success: true, eventPatch: null, localPollPatch: null };
    }

    const eventPatch = {
        datePollEnabled: false,
        locationPollEnabled: false,
        hasActiveDatePoll: false,
        has_active_date_poll: false,
        hasActiveLocationPoll: false,
        has_active_location_poll: false,
    };

    if (pollType === 'date') {
        const dateVal = selected.date || selected.start_date || selected.startDate || _parseFlexibleDateToISO(selected.text);
        if (dateVal) {
            const iso = new Date(dateVal).toISOString();
            eventPatch.eventDate = iso;
            eventPatch.event_date = iso;
        }
    } else if (pollType === 'location') {
        const loc = (selected.location || selected.text || '').trim();
        if (loc) {
            eventPatch.location = loc;
        }
    }

    const localPollPatch = {
        id: poll.id,
        isActive: false,
        is_active: false,
        finalResult: {
            optionId: String(optionId),
            decidedBy: String(finalUserId),
            decidedAt: new Date().toISOString(),
        },
        final_result: {
            option_id: String(optionId),
            decided_by: String(finalUserId),
            decided_at: new Date().toISOString(),
        }
    };

    // Notify event members about poll finalization
    try {
        const evtId = eventId || poll.eventId || poll.event_id;
        if (evtId) {
            const members = await _fetchWithAuth(`/EventMember?eventId=${encodeURIComponent(evtId)}`, { method: 'GET' }).catch(() => []);
            
            let eventName = eventTitle;
            if (!eventName) {
                const eventDetails = await _fetchWithAuth(`/Event/${evtId}`, { method: 'GET' }).catch(() => null);
                eventName = eventDetails?.title || 'האירוע';
            }

            const resultText = selected.text || selected.location || '';
            
            for (const member of (members || [])) {
                const memberId = member.userId || member.UserId || member.user_id;
                if (memberId && memberId !== finalUserId) {
                    try {
                        await createNotificationAndSendPush({
                            userId: memberId,
                            type: 'poll_closed',
                            title: 'סקר נסגר! 📊',
                            message: `הסקר "${poll.title}" נסגר. התוצאה: ${resultText}`,
                            eventId: evtId,
                            priority: 'normal'
                        });
                    } catch (notifErr) {
                        console.warn('[finalizePoll] Failed to notify member:', memberId);
                    }
                }
            }
        }
    } catch (notifyError) {
        console.warn('[finalizePoll] Failed to notify members:', notifyError);
    }

    return { success: true, eventPatch, localPollPatch };
};

export const deletePoll = async (arg = {}) => {
    let pollId = null;
    let eventId = undefined;

    if (typeof arg === 'string' || typeof arg === 'number') {
        pollId = String(arg);
    } else if (arg && typeof arg === 'object') {
        pollId = arg.pollId || arg.id || (arg.poll && (arg.poll.id || arg.poll.pollId)) || null;
        eventId = arg.eventId || arg.event_id || (arg.poll && (arg.poll.eventId || arg.poll.event_id));
    }

    if (!pollId) {
        throw new Error("pollId is required");
    }

    try {
        const res = await _fetchWithAuth(`/edge-function/delete_event_poll`, {
            method: 'POST',
            body: JSON.stringify({ pollId: String(pollId), eventId: eventId ? String(eventId) : undefined })
        });
        return res || { success: true };
    } catch (e) {
        if (e?.status === 404 || e?.status === 405) {
            return await _fetchWithAuth(`/Poll/${encodeURIComponent(pollId)}`, { method: 'DELETE' });
        }
        throw e;
    }
};

// --- Event Templates ---
export const getEventTemplates = async () => {
    try {
        return await _fetchWithAuth('/EventTemplate', { method: 'GET' });
    } catch (error) {
        console.error('Failed to fetch event templates:', error);
        throw error;
    }
};

export const createEventTemplate = async (templateData) => {
    try {
        const tasks = templateData.default_tasks || templateData.defaultTasks || [];
        const itinerary = templateData.defaultItinerary || templateData.default_itinerary || [];
        
        const payload = {
            name: templateData.name || templateData.title,
            title: templateData.title || templateData.name,
            category: templateData.category,
            description: templateData.description,
            icon_display_name: templateData.icon_display_name || templateData.iconDisplayName,
            iconDisplayName: templateData.iconDisplayName || templateData.icon_display_name,
            cover_image_url: templateData.cover_image_url || templateData.coverImageUrl,
            order: templateData.order,
            // Send both snake_case and camelCase for InstaBack compatibility
            default_tasks: tasks,
            defaultTasks: tasks,
            default_itinerary: itinerary,
            defaultItinerary: itinerary,
            can_be_public: templateData.canBePublic ?? templateData.can_be_public ?? true,
            canBePublic: templateData.canBePublic ?? templateData.can_be_public ?? true
        };
        
        console.log('[createEventTemplate] Sending payload:', JSON.stringify(payload, null, 2));
        
        return await _fetchWithAuth('/EventTemplate', { method: 'POST', body: JSON.stringify(payload) });
    } catch (error) {
        console.error('Failed to create event template:', error);
        throw error;
    }
};

export const updateEventTemplate = async (templateId, templateData) => {
    try {
        const payload = {
            name: templateData.name || templateData.title,
            title: templateData.title || templateData.name,
            category: templateData.category,
            description: templateData.description,
            icon_display_name: templateData.icon_display_name,
            cover_image_url: templateData.cover_image_url || templateData.coverImageUrl,
            order: templateData.order,
            default_tasks: templateData.default_tasks || []
        };
        return await _fetchWithAuth(`/EventTemplate/${templateId}`, { method: 'PUT', body: JSON.stringify(payload) });
    } catch (error) {
        console.error('Failed to update event template:', error);
        throw error;
    }
};

export const deleteEventTemplate = async (templateId) => {
    try {
        return await _fetchWithAuth(`/EventTemplate/${templateId}`, { method: 'DELETE' });
    } catch (error) {
        console.error('Failed to delete event template:', error);
        throw error;
    }
};

// --- Task Templates ---
export const getTaskTemplates = async (eventTemplateId = null) => {
    try {
        const query = eventTemplateId ? `?eventTemplateId=${encodeURIComponent(eventTemplateId)}` : '';
        return await _fetchWithAuth(`/TaskTemplate${query}`, { method: 'GET' });
    } catch (error) {
        console.error('Failed to fetch task templates:', error);
        throw error;
    }
};

export const createTaskTemplate = async (taskTemplateData) => {
    try {
        const payload = {
            templateId: taskTemplateData.templateId,
            eventTemplateId: taskTemplateData.eventTemplateId || taskTemplateData.templateId,
            template_id: taskTemplateData.template_id || taskTemplateData.templateId,
            title: taskTemplateData.title,
            description: taskTemplateData.description,
            priority: taskTemplateData.priority,
            days_before: taskTemplateData.days_before,
            category: taskTemplateData.category,
            order: taskTemplateData.order
        };
        return await _fetchWithAuth('/TaskTemplate', { method: 'POST', body: JSON.stringify(payload) });
    }
    catch (error) {
        console.error('Failed to create task template:', error);
        throw error;
    }
};

export const deleteTaskTemplate = async (taskTemplateId) => {
    try {
        return await _fetchWithAuth(`/TaskTemplate/${taskTemplateId}`, { method: 'DELETE' });
    } catch (error) {
        console.error('Failed to delete task template:', error);
        throw error;
    }
};

// --- Announcements ---
export const getAnnouncements = async () => {
    try {
        const response = await _fetchWithAuth('/SystemMessage', { method: 'GET' });
        const messages = Array.isArray(response) ? response : (response?.items || []);
        
        const currentUser = getCurrentUser();
        const now = new Date();
        const userId = currentUser?.id;
        const userRole = (currentUser?.role || '').toString().toLowerCase();
        const userCreated = currentUser?.created_date || currentUser?.createdAt || currentUser?.created_at;

        console.log('[getAnnouncements] Current user ID:', userId);
        console.log('[getAnnouncements] Total messages from server:', messages.length);

        const filtered = messages.filter(msg => {
            // 1. Active check
            if (msg.isActive === false) {
                console.log(`[getAnnouncements] ${msg.id} filtered out: not active`);
                return false;
            }
            
            // 2. Date check
            if (msg.startDate && new Date(msg.startDate) > now) {
                console.log(`[getAnnouncements] ${msg.id} filtered out: startDate in future`, msg.startDate);
                return false;
            }
            if (msg.endDate && new Date(msg.endDate) < now) {
                console.log(`[getAnnouncements] ${msg.id} filtered out: endDate passed`, msg.endDate);
                return false;
            }

            // 3. Audience check
            if (msg.targetAudience === 'all') return true;
            
            if (!userId) {
                console.log(`[getAnnouncements] ${msg.id} filtered out: no userId for specific targeting`);
                return false;
            }

            if (msg.targetAudience === 'specific_users') {
                const userIds = msg.specificUserIds || [];
                const isIncluded = userIds.includes(userId);
                console.log(`[getAnnouncements] ${msg.id} specific_users check:`, { 
                    targetUsers: userIds, 
                    currentUserId: userId, 
                    isIncluded 
                });
                return isIncluded;
            }

            if (msg.targetAudience === 'admins') {
                return userRole === 'admin' || userRole === 'superadmin' || userRole === 'owner';
            }

            if (msg.targetAudience === 'new_users') {
                if (!userCreated) return false;
                const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                return new Date(userCreated) > sevenDaysAgo;
            }
            
            // Default include for other cases
            return true;
        });

        console.log('[getAnnouncements] Filtered messages:', filtered.length);

        return filtered.sort((a, b) => {
            const priorityOrder = { urgent: 3, high: 2, normal: 1, low: 0 };
            const pA = priorityOrder[a.priority] || 1;
            const pB = priorityOrder[b.priority] || 1;
            if (pA !== pB) return pB - pA;
            return new Date(b.startDate || 0) - new Date(a.startDate || 0);
        });
    } catch (error) {
        console.error('Failed to fetch announcements:', error);
        return [];
    }
};

export const getEventInitialData = async (eventId, userId) => {
    if (!eventId) throw new Error("eventId is required");
    const currentToken = getToken();
    const base = `${API_BASE_URL}/edge-function`;
    const headers = {
        'Authorization': currentToken ? `Bearer ${currentToken}` : '',
        'accept': 'application/json',
        'Content-Type': 'application/json'
    };

    let uid = userId;
    if (!uid && typeof window !== 'undefined') {
        try {
            const stored = JSON.parse(localStorage.getItem('instaback_user') || '{}');
            if (stored?.id) uid = stored.id;
        } catch {}
    }

    const q = new URLSearchParams();
    q.set('eventId', String(eventId));
    if (uid) q.set('userId', String(uid));
    q.set('ts', String(Date.now()));

    const getPaths = [
        `${base}/geteventinitialdata?${q.toString()}`,
        `${base}/getEventInitialData?${q.toString()}`,
        `${base}/get_event_initial_data?${q.toString()}`
    ];

    for (const url of getPaths) {
        const res = await fetch(url, {
            method: 'GET',
            headers: {
                ...headers,
                'Cache-Control': 'no-cache, no-store',
                'Pragma': 'no-cache'
            },
            cache: 'no-store'
        });
        if (res.ok) {
            const parsed = await res.json().catch(() => ({}));
            const payload = (parsed && typeof parsed === 'object' && parsed.data) ? parsed.data : parsed;
            return payload;
        }
        if (res.status === 404 || res.status === 405) continue;
        const text = await res.text().catch(() => '');
        const err = new Error(`HTTP ${res.status}: ${text || 'getEventInitialData failed (GET)'}`);
        err.status = res.status;
        throw err;
    }

    const postBody = JSON.stringify({ eventId: String(eventId), userId: uid || null });
    const postPaths = [
        `${base}/geteventinitialdata`,
        `${base}/getEventInitialData`,
        `${base}/get_event_initial_data`
    ];
    for (const url of postPaths) {
        const res = await fetch(url, { method: 'POST', headers, body: postBody });
        if (res.ok) {
            const parsed = await res.json().catch(() => ({}));
            const payload = (parsed && typeof parsed === 'object' && parsed.data) ? parsed.data : parsed;
            return payload;
        }
        if (res.status === 404 || res.status === 405) continue;
        const text = await res.text().catch(() => '');
        const err = new Error(`HTTP ${res.status}: ${text || 'getEventInitialData failed (POST)'}`);
        err.status = res.status;
        throw err;
    }

    const err = new Error('Event initial data function not found (tried multiple endpoints)');
    err.status = 404;
    throw err;
};

export const getEventFullDetails = async (eventId, userId) => {
    if (!eventId) throw new Error("eventId is required");
    const currentToken = getToken();
    const base = `${API_BASE_URL}/edge-function`;
    const headers = {
        'Authorization': currentToken ? `Bearer ${currentToken}` : '',
        'accept': 'application/json',
        'Content-Type': 'application/json'
    };

    let uid = userId;
    if (!uid && typeof window !== 'undefined') {
        try {
            const stored = JSON.parse(localStorage.getItem('instaback_user') || '{}');
            if (stored?.id) uid = stored.id;
        } catch {}
    }

    const q = new URLSearchParams();
    q.set('eventId', String(eventId));
    if (uid) q.set('userId', String(uid));
    q.set('ts', String(Date.now()));

    const getPaths = [
        `${base}/getEventFullDetails?${q.toString()}`,
        `${base}/get_event_full_details?${q.toString()}`
    ];
    for (const url of getPaths) {
        const res = await fetch(url, {
            method: 'GET',
            headers: {
                ...headers,
                'Cache-Control': 'no-cache, no-store',
                'Pragma': 'no-cache'
            },
            cache: 'no-store'
        });
        if (res.ok) {
            const parsed = await res.json().catch(() => ({}));
            const payload = (parsed && typeof parsed === 'object' && parsed.data) ? parsed.data : parsed;
            return payload;
        }
        if (res.status === 404 || res.status === 405) continue;
        const text = await res.text().catch(() => '');
        const err = new Error(`HTTP ${res.status}: ${text || 'getEventFullDetails failed (GET)'}`);
        err.status = res.status;
        throw err;
    }

    const postBody = JSON.stringify({ eventId: String(eventId), userId: uid || null });
    const postPaths = [
        `${base}/getEventFullDetails`,
        `${base}/getEventFullDetails`,
        `${base}/get_event_full_details`
    ];
    for (const url of postPaths) {
        const res = await fetch(url, { method: 'POST', headers, body: postBody });
        if (res.ok) {
            const parsed = await res.json().catch(() => ({}));
            const payload = (parsed && typeof parsed === 'object' && parsed.data) ? parsed.data : parsed;
            return payload;
        }
        if (res.status === 404 || res.status === 405) continue;
        const text = await res.text().catch(() => '');
        const err = new Error(`HTTP ${res.status}: ${text || 'getEventFullDetails failed (POST)'}`);
        err.status = res.status;
        throw err;
    }

    const err = new Error('Event full details function not found (tried multiple endpoints)');
    err.status = 404;
    throw err;
};

// --- Dashboard Overview ---
export const getDashboardOverview = async (payload = {}) => {
    const currentToken = getToken();
    const baseUrl = `${API_BASE_URL}/edge-function/dashboard_overview`;

    const doPost = async () => {
        const res = await fetch(baseUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': currentToken ? `Bearer ${currentToken}` : '',
                'accept': 'application/json',
            },
            body: JSON.stringify(payload || {})
        });
        if (!res.ok) {
            const text = await res.text().catch(() => '');
            const err = new Error(`HTTP ${res.status}: ${text || 'dashboard_overview failed (POST)'}`);
            err.status = res.status;
            throw err;
        }
        return res.json();
    };

    const doGetFallback = async () => {
        const p = payload || {};
        const q = new URLSearchParams();
        if (p.scope) q.set('scope', String(p.scope));
        if (typeof p.time_window_days !== 'undefined') q.set('time_window_days', String(p.time_window_days));
        const limits = p.limits || {};
        if (typeof limits.recent_messages_limit !== 'undefined') q.set('recent_messages_limit', String(limits.recent_messages_limit));
        if (typeof limits.upcoming_events_limit !== 'undefined') q.set('upcoming_events_limit', String(limits.upcoming_events_limit));
        if (typeof limits.samples_limit !== 'undefined') q.set('samples_limit', String(limits.samples_limit));
        const include = p.include || {};
        if (typeof include.include_tasks_by_event !== 'undefined') q.set('include_tasks_by_event', String(include.include_tasks_by_event));
        q.set('ts', String(Date.now()));

        const res = await fetch(`${baseUrl}?${q.toString()}`, {
            method: 'GET',
            headers: {
                'Authorization': currentToken ? `Bearer ${currentToken}` : '',
                'accept': 'application/json',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            },
            cache: 'no-store'
        });
        if (!res.ok) {
            const text = await res.text().catch(() => '');
            const err = new Error(`HTTP ${res.status}: ${text || 'dashboard_overview failed (GET fallback)'}`);
            err.status = res.status;
            throw err;
        }
        return res.json();
    };

    try {
        return await doPost();
    } catch (e) {
        if (e?.status === 404 || e?.status === 405) {
            return await doGetFallback();
        }
        throw e;
    }
};

// Event Overview
export const getEventOverview = async (eventId, { include = {}, limits = {}, withRecentMessages = true } = {}) => {
    if (!eventId) throw new Error("eventId is required");
    const currentToken = getToken();
    const baseUrl = `${API_BASE_URL}/edge-function/event_overview`;

    const payload = {
        eventId: String(eventId),
        with_recent_messages: withRecentMessages !== false,
        ...Object.fromEntries(Object.entries(include || {}).map(([k, v]) => [`include_${k}`, v])),
        ...(limits || {})
    };

    try {
        const res = await fetch(baseUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`,
                'accept': 'application/json',
                'Cache-Control': 'no-cache'
            },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const text = await res.text().catch(() => '');
            const err = new Error(`HTTP ${res.status}: ${text || 'event_overview failed (POST)'}`);
            err.status = res.status;
            throw err;
        }
        return await res.json();
    } catch (e) {
        if (e?.status === 404 || e?.status === 405) {
            const q = new URLSearchParams();
            q.set('eventId', String(eventId));
            if (withRecentMessages === false) q.set('with_recent_messages', 'false');
            if (include && typeof include === 'object') {
                Object.entries(include).forEach(([k, v]) => {
                    if (typeof v !== 'undefined') q.set(`include_${k}`, String(v));
                });
            }
            if (limits && typeof limits === 'object') {
                Object.entries(limits).forEach(([k, v]) => {
                    if (typeof v !== 'undefined') q.set(`${k}`, String(v));
                });
            }
            q.set('ts', String(Date.now()));

            const res = await fetch(`${baseUrl}?${q.toString()}`, {
                method: 'GET',
                headers: {
                    'Authorization': currentToken ? `Bearer ${currentToken}` : '',
                    'accept': 'application/json',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                },
                cache: 'no-store'
            });
            if (!res.ok) {
                const text = await res.text().catch(() => '');
                const err = new Error(`HTTP ${res.status}: ${text || 'event_overview failed (GET)'}`);
                err.status = res.status;
                throw err;
            }
            return await res.json();
        }
        throw e;
    }
};

// --- Assets Management ---
export const ensureEventFolderExists = async (eventId) => {
    const folderName = `event_${eventId}`;

    try {
        console.log(`[ensureEventFolderExists] Creating folder: ${folderName}`);

        const currentToken = getToken();

        const response = await fetch(`${PROJECT_ROOT_URL}/assets/folder`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': currentToken ? `Bearer ${currentToken}` : '',
                'accept': 'application/json'
            },
            body: JSON.stringify({ folderName })
        });

        if (!response.ok && response.status !== 409) {
            const errorText = await response.text().catch(() => '');
            console.warn(`[ensureEventFolderExists] Failed to create folder:`, errorText);
        }

        console.log(`[ensureEventFolderExists] Folder ready: ${folderName}`);
        return folderName;
    } catch (error) {
        console.warn('[ensureEventFolderExists] Error with folder:', error);
        return folderName;
    }
};

export const uploadFileToInstaback = async (file, eventId = null, subfolder = null) => {
    if (!file || !(file instanceof File || file instanceof Blob)) {
        throw new Error('Invalid file object provided');
    }

    try {
        let folderName = '';
        if (eventId) {
            folderName = await ensureEventFolderExists(eventId);
            if (subfolder) {
                const subfolderName = `${folderName}/${subfolder}`;
                const currentToken = getToken();

                try {
                    await fetch(`${PROJECT_ROOT_URL}/assets/folder`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': currentToken ? `Bearer ${currentToken}` : '',
                            'accept': 'application/json'
                        },
                        body: JSON.stringify({ folderName: subfolderName })
                    });
                } catch (subError) {
                    console.log(`[uploadFileToInstaback] Subfolder exists or created: ${subfolderName}`);
                }
                folderName = subfolderName;
            }
        }

        console.log(`[uploadFileToInstaback] Uploading file: ${file.name} to folder: ${folderName}`);

        const formData = new FormData();
        formData.append('file', file);

        const currentToken = getToken();

        const uploadUrl = folderName
            ? `${PROJECT_ROOT_URL}/assets/upload?folder=${encodeURIComponent(folderName)}`
            : `${PROJECT_ROOT_URL}/assets/upload`;

        console.log(`[uploadFileToInstaback] Upload URL: ${uploadUrl}`);

        const response = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'Authorization': currentToken ? `Bearer ${currentToken}` : '',
                'accept': 'application/json'
            },
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            console.error(`[uploadFileToInstaback] Upload failed:`, errorText);
            throw new Error(`Upload failed: HTTP ${response.status} - ${errorText.substring(0, 200)}`);
        }

        const result = await response.json();

        console.log('[uploadFileToInstaback] Raw upload result:', result);

        // Get the URL from response - handle different response formats
        let fileUrl = result.data?.url || result.url || result.file_url;

        console.log('[uploadFileToInstaback] Raw fileUrl from server:', fileUrl);

        // Resolve the file URL using the new helper
        const resolvedFileUrl = resolveInstabackFileUrl(fileUrl);
        if (!resolvedFileUrl) {
            throw new Error('Failed to resolve InstaBack file URL after upload.');
        }

        return {
            file_url: resolvedFileUrl,
            file_path: resolvedFileUrl,
            file_name: file.name,
            file_size: result.data?.size || result.size || file.size
        };

    } catch (error) {
        console.error('[uploadFileToInstaback] Upload failed:', error);
        throw new Error(`File upload failed: ${error.message}`);
    }
};

export const listEventFiles = async (eventId, subfolder = null) => {
    try {
        let folderPath = `event_${eventId}`;
        if (subfolder) {
            folderPath = `${folderPath}/${subfolder}`;
        }

        const currentToken = getToken();

        const response = await fetch(`${PROJECT_ROOT_URL}/assets/list?folder=${encodeURIComponent(folderPath)}`, {
            method: 'GET',
            headers: {
                'Authorization': currentToken ? `Bearer ${currentToken}` : '',
                'accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to list files: HTTP ${response.status}`);
        }

        const result = await response.json();

        // Resolve URLs for listed files
        const files = (result.files || []).map(file => ({
            ...file,
            url: resolveInstabackFileUrl(file.url)
        }));

        return {
            files: files.filter(f => f.url !== null), // Filter out any unresolved Base44 URLs
            folders: result.folders || []
        };
    } catch (error) {
        console.error('[listEventFiles] Failed to list files:', error);
        return { files: [], folders: [] };
    }
};

export const deleteFileFromInstaback = async (fileUrl) => {
    if (!fileUrl) {
        console.warn('[deleteFileFromInstaback] No fileUrl provided');
        return { success: true, skipped: true };
    }

    try {
        console.log(`[deleteFileFromInstaback] Attempting to delete: ${fileUrl}`);

        // Extract file path from URL if it's a full URL
        let filePath = fileUrl;
        if (fileUrl.startsWith('http')) {
            const url = new URL(fileUrl);
            filePath = url.pathname.replace('/assets/', '');
        }

        const currentToken = getToken();

        const response = await fetch(`${PROJECT_ROOT_URL}/assets/delete`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': currentToken ? `Bearer ${currentToken}` : '',
                'accept': 'application/json'
            },
            body: JSON.stringify({ filePath })
        });

        if (!response.ok) {
            // If 404 or 405, the file doesn't exist or endpoint not available - that's okay
            if (response.status === 404 || response.status === 405) {
                console.warn('[deleteFileFromInstaback] File not found or endpoint not available (ignoring)');
                return { success: true, notFound: true };
            }
            throw new Error(`HTTP ${response.status}`);
        }

        console.log('[deleteFileFromInstaback] ✅ File deleted successfully');
        return { success: true };
    } catch (error) {
        console.warn('[deleteFileFromInstaback] Delete failed (non-critical):', error.message);
        // Don't throw - deletion is not critical
        return { success: false, error: error.message };
    }
};

export const getFileDownloadUrl = (fileUrl) => {
    // Use the new helper function to resolve the URL
    return resolveInstabackFileUrl(fileUrl);
};

// --- Notifications ---
export const createNotificationAndSendPush = async (data) => {
    const instabackToken = getToken();

    // Support both userId (single) and userIds (array)
    const userIds = data.userIds || (data.userId ? [data.userId] : null);
    
    if (!userIds || userIds.length === 0) {
        console.error('🔔 ERROR: No userId/userIds provided for notification!');
        throw new Error('userId or userIds is required for notification');
    }

    const response = await fetch(`${API_BASE_URL}/edge-function/createNotificationAndSendPush`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${instabackToken}`,
            'accept': 'application/json'
        },
        body: JSON.stringify({
            params: {
                userIds: userIds,
                type: data.type,
                title: data.title,
                message: data.message,
                eventId: data.eventId || null,
                relatedId: data.relatedId || null,
                actionUrl: data.actionUrl || null,
                priority: data.priority || 'normal',
                sendPush: data.sendPush !== false
            }
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('🔔 Failed to create notification:', errorText);
        throw new Error(`Failed to create notification: HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log('🔔 Notification created successfully:', result);
    return result;
};

export const createNotificationsAndSendPushBulk = async (data) => {
    const instabackToken = getToken();

    if (!instabackToken) {
        throw new Error('Authentication required');
    }

    if (!data.userIds || !Array.isArray(data.userIds) || data.userIds.length === 0) {
        console.error('🔔 ERROR: userIds array is required for bulk notification!');
        throw new Error('userIds array is required');
    }

    console.log(`🔔 Sending bulk notifications to ${data.userIds.length} users`);

    // Process in parallel batches of 5 to avoid overwhelming the server
    const BATCH_SIZE = 5;
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < data.userIds.length; i += BATCH_SIZE) {
        const batch = data.userIds.slice(i, i + BATCH_SIZE);
        
        const promises = batch.map(async (userId) => {
            try {
                await createNotificationAndSendPush({
                    userIds: [String(userId)],
                    type: data.type || 'system_announcement',
                    title: data.title,
                    message: data.message,
                    eventId: data.eventId || null,
                    relatedId: data.relatedId || null,
                    actionUrl: data.actionUrl || null,
                    priority: data.priority || 'normal',
                    sendPush: true
                });
                return { success: true };
            } catch (err) {
                console.warn(`🔔 Failed to send notification to user ${userId}:`, err.message);
                return { success: false, error: err.message };
            }
        });

        const results = await Promise.all(promises);
        successCount += results.filter(r => r.success).length;
        failCount += results.filter(r => !r.success).length;
    }

    console.log(`🔔 Bulk notifications complete. Success: ${successCount}, Failed: ${failCount}`);

    return {
        success: true,
        total: data.userIds.length,
        sent: successCount,
        failed: failCount
    };
};

export const broadcastMessageToEvent = async (eventId, messageData) => {
    if (!eventId) {
        throw new Error('eventId is required to broadcast a message.');
    }
    if (!messageData || !messageData.title || !messageData.message) {
        throw new Error('messageData (title and message) is required to broadcast a message.');
    }

    const instabackToken = getToken();
    if (!instabackToken) {
        throw new Error('Authentication required: Missing InstaBack token.');
    }

    const payload = {
        eventId: String(eventId),
        title: messageData.title,
        message: messageData.message,
        actionUrl: messageData.actionUrl || null,
        relatedId: messageData.relatedId || null,
        type: messageData.type || 'broadcast',
        priority: messageData.priority || 'normal'
    };

    try {
        const response = await fetch(`${API_BASE_URL}/edge-function/broadcast_message_to_event`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${instabackToken}`,
                'accept': 'application/json'
            },
            body: JSON.stringify({ params: payload })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('📢 Failed to broadcast message to event:', errorText);
            throw new Error(`Failed to broadcast message: HTTP ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        console.log('📢 Message broadcasted successfully to event:', result);
        return result;
    } catch (error) {
        console.error('📢 Error during broadcastMessageToEvent:', error);
        throw error;
    }
};

export const getMyNotifications = async ({ is_read = null, limit = 20, offset = 0 } = {}) => {
    const instabackToken = getToken();

    if (!instabackToken) {
        console.warn('🔔 No InstaBack token available for getMyNotifications');
        return [];
    }

    console.log('🔔 Calling getmynotifications with params:', { is_read, limit, offset });

    try {
        const response = await fetch(`${API_BASE_URL}/edge-function/getmynotifications`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${instabackToken}`,
                'accept': 'application/json'
            },
            body: JSON.stringify({
                params: {
                    is_read,
                    limit,
                    offset
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text(); // Defined errorText here
            console.error('🔔 getmynotifications HTTP error:', response.status, errorText);

            if (response.status === 404 || response.status === 405) {
                console.warn('🔔 Notifications function not found or not supported');
                return [];
            }

            throw new Error(`Failed to get notifications: HTTP ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        console.log('🔔 getmynotifications response:', result);

        if (Array.isArray(result)) {
            return result;
        } else if (result && Array.isArray(result.data)) {
            return result.data;
        } else if (result && Array.isArray(result.notifications)) {
            return result.notifications;
        }

        console.warn('🔔 Unexpected response format:', result);
        return [];

    } catch (error) {
        console.error('🔔 getMyNotifications error:', error);
        return [];
    }
};

export const markNotificationAsRead = async (notificationId, userId = null) => {
    const instabackToken = getToken();

    if (!userId && typeof window !== 'undefined') {
        try {
            const stored = JSON.parse(localStorage.getItem('instaback_user') || '{}');
            userId = stored?.id || null;
        } catch {}
    }

    const response = await fetch(`${API_BASE_URL}/edge-function/marknotificationasread`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${instabackToken}`,
            'accept': 'application/json'
        },
        body: JSON.stringify({
            params: {
                notification_id: notificationId,
                userId: userId
            }
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to mark notification as read: HTTP ${response.status}: ${errorText}`);
    }

    return response.json();
};

export const markAllNotificationsAsRead = async () => {
    const instabackToken = getToken();

    const response = await fetch(`${API_BASE_URL}/edge-function/markallnotificationsasread`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${instabackToken}`,
            'accept': 'application/json'
        },
        body: JSON.stringify({
            params: {}
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to mark all notifications as read: HTTP ${response.status}: ${errorText}`);
    }

    return response.json();
};

// --- Task Lists ---
export const getTaskLists = async (taskId) => {
    if (!taskId) throw new Error("taskId is required");
    return _fetchWithAuth(`/TaskList?taskId=${encodeURIComponent(taskId)}`, { method: 'GET' });
};

export const createTaskList = async (listData) => {
    return _fetchWithAuth('/TaskList', { method: 'POST', body: JSON.stringify(listData) });
};

export const updateTaskList = async (listId, updates) => {
    return _fetchWithAuth(`/TaskList/${encodeURIComponent(listId)}`, { method: 'PUT', body: JSON.stringify(updates) });
};

export const deleteTaskList = async (listId) => {
    return _fetchWithAuth(`/TaskList/${encodeURIComponent(listId)}`, { method: 'DELETE' });
};

// --- Task List Items ---
export const getTaskListItems = async (listId) => {
    if (!listId) throw new Error("listId is required");
    return _fetchWithAuth(`/TaskListItem?listId=${encodeURIComponent(listId)}`, { method: 'GET' });
};

export const createTaskListItem = async (itemData) => {
    return _fetchWithAuth('/TaskListItem', { method: 'POST', body: JSON.stringify(itemData) });
};

export const updateTaskListItem = async (itemId, updates) => {
    return _fetchWithAuth(`/TaskListItem/${encodeURIComponent(itemId)}`, { method: 'PUT', body: JSON.stringify(updates) });
};

export const deleteTaskListItem = async (itemId) => {
    return _fetchWithAuth(`/TaskListItem/${encodeURIComponent(itemId)}`, { method: 'DELETE' });
};

export const getUnreadMessagesCount = async (userId) => {
    if (!userId) return { totalUnread: 0, unreadByEvent: {} };

    try {
        const instabackToken = getToken();
        if (!instabackToken) {
            console.warn('💬 No InstaBack token available');
            return { totalUnread: 0, unreadByEvent: {} };
        }

        const response = await fetch(`${API_BASE_URL}/edge-function/getmymessageunread`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${instabackToken}`,
                'accept': 'application/json'
            },
            body: JSON.stringify({ params: {} })
        });

        if (!response.ok) {
            console.warn('💬 Failed to get unread messages:', response.status);
            return { totalUnread: 0, unreadByEvent: {} };
        }

        const result = await response.json();

        // הפונקציה שלך מחזירה:
        // {
        //   "totalUnread": 3,
        //   "unreadByEvent": {
        //     "eventId1": {"count": 2},
        //     "eventId2": {"count": 1}
        //   }
        // }

        let data = result;

        // אם התשובה עטופה ב-data, נחלץ אותה
        if (result.data && typeof result.data === 'object') {
            data = result.data;
        }

        const totalUnread = data.totalUnread || 0;
        const unreadByEvent = data.unreadByEvent || {};

        console.log('💬 Unread messages:', {
            totalUnread,
            unreadByEventCount: Object.keys(unreadByEvent).length
        });

        return {
            totalUnread,
            unreadByEvent
        };
    } catch (error) {
        console.error('💬 Error getting unread messages:', error);
        return { totalUnread: 0, unreadByEvent: {} };
    }
};

export const getUnreadNotificationsCount = async () => {
    const instabackToken = getToken();

    if (!instabackToken) {
        return { count: 0 };
    }

    try {
        const response = await fetch(`${API_BASE_URL}/edge-function/getUnreadNotificationsCount`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${instabackToken}`,
                'accept': 'application/json'
            },
            body: JSON.stringify({
                params: {}
            }),
            signal: AbortSignal.timeout(5000) // 5 second timeout
        });

        if (!response.ok) {
            // If function doesn't exist (404/405), return 0 silently
            if (response.status === 404 || response.status === 405) {
                return { count: 0 };
            }

            // Try to get error text
            let errorText = `HTTP ${response.status}`;
            try {
                const errorBody = await response.text();
                if (errorBody) {
                    errorText = errorBody;
                }
            } catch (e) {
                // Ignore error reading body
            }

            throw new Error(errorText);
        }

        const result = await response.json();

        // הפונקציה שלך מחזירה {"data": {"count": NUMBER}} או {"count": NUMBER}
        let count = 0;

        if (result.data && typeof result.data.count === 'number') {
            count = result.data.count;
        } else if (typeof result.count === 'number') {
            count = result.count;
        }

        console.log('🔔 Unread notifications count:', count);
        return { count };

    } catch (error) {
        // Network errors or timeouts - return 0 silently
        if (error?.name === 'AbortError' ||
            error?.message?.includes('Failed to fetch') ||
            error?.message?.includes('Network')) {
            return { count: 0 };
        }

        // Other errors - log but still return 0
        console.warn('getUnreadNotificationsCount error:', error?.message);
        return { count: 0 };
    }
};

// Delete My Account
export const deleteMyAccount = async () => {
  const currentToken = getToken();
  if (!currentToken) throw new Error('לא מחובר למערכת');

  const response = await fetch(`${API_BASE_URL}/edge-function/delete_my_account`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${currentToken}`,
      'Content-Type': 'application/json',
      'accept': 'application/json'
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'שגיאה במחיקת החשבון');
  }

  return await response.json();
};

// Notify admins about new user
export const notifyAdminsNewUser = async ({ userId, userEmail, userName }) => {
    if (!userId || !userEmail) {
        console.warn('Missing required params for notifyAdminsNewUser');
        return { success: false, error: 'Missing parameters' };
    }

    try {
        const allUsers = await _fetchWithAuth('/User', { method: 'GET' });
        const admins = (Array.isArray(allUsers) ? allUsers : (allUsers?.items || [])).filter(u => {
            const role = u.role || u.Role;
            return role === 'admin';
        });

        for (const admin of admins) {
            try {
                await createNotificationAndSendPush({
                    userId: admin.id,
                    type: 'new_user',
                    title: 'משתמש חדש נרשם למערכת',
                    message: `${userName || userEmail} הצטרף/ה לפלטפורמה`,
                    priority: 'normal'
                });
            } catch (notifError) {
                console.warn('Failed to notify admin:', admin.id, notifError);
            }
        }

        return { success: true };
    } catch (error) {
        console.warn('Failed to notify admins about new user:', error);
        return { success: false, error: error.message };
    }
};

// Notify admins about new event
export const notifyAdminsNewEvent = async ({ eventId, eventTitle, creatorId, creatorName }) => {
    if (!eventId || !creatorId) {
        console.warn('Missing required params for notifyAdminsNewEvent');
        return { success: false, error: 'Missing parameters' };
    }

    const instabackToken = getToken();
    if (!instabackToken) {
        throw new Error('Authentication required');
    }

    try {
        console.log('[notifyAdminsNewEvent] Calling edge function with:', {
            eventId,
            eventTitle,
            creatorId,
            creatorName
        });

        const response = await fetch(`${API_BASE_URL}/edge-function/notify_admins_new_event`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${instabackToken}`,
                'accept': 'application/json'
            },
            body: JSON.stringify({
                params: {
                    eventId,
                    eventTitle,
                    creatorId,
                    creatorName
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[notifyAdminsNewEvent] Failed:', errorText);
            throw new Error(`Failed to notify admins: ${errorText}`);
        }

        const result = await response.json();
        console.log('[notifyAdminsNewEvent] Success:', result);
        return result;
    } catch (error) {
        console.error('[notifyAdminsNewEvent] Error:', error);
        return { success: false, error: error.message };
    }
};

// Update task status with notifications
export const updateTaskStatusWithNotifications = async (taskId, status) => {
    const instabackToken = getToken();
    if (!instabackToken) throw new Error('Authentication required');

    try {
        const response = await fetch(`${API_BASE_URL}/edge-function/updatetaskwithnotifications`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${instabackToken}`,
                'accept': 'application/json'
            },
            body: JSON.stringify({
                params: {
                    taskId: taskId,
                    updates: { status: status }
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to update task status: ${errorText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error updating task status with notifications:', error);
        throw error;
    }
};

// Update task assignee with notifications
export const updateTaskAssigneeWithNotifications = async (taskId, assigneeId) => {
    const instabackToken = getToken();
    if (!instabackToken) throw new Error('Authentication required');

    try {
        const response = await fetch(`${API_BASE_URL}/edge-function/updatetaskwithnotifications`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${instabackToken}`,
                'accept': 'application/json'
            },
            body: JSON.stringify({
                params: {
                    taskId: taskId,
                    updates: { assigneeId: assigneeId }
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to update task assignee: ${errorText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error updating task assignee with notifications:', error);
        throw error;
    }
};

// Assign task to self with notifications
export const assignTaskToSelfWithNotifications = async (taskId) => {
    const instabackToken = getToken();
    if (!instabackToken) throw new Error('Authentication required');

    const currentUser = getCurrentUser();
    if (!currentUser?.id) throw new Error('User not found');

    try {
        const response = await fetch(`${API_BASE_URL}/edge-function/updatetaskwithnotifications`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${instabackToken}`,
                'accept': 'application/json'
            },
            body: JSON.stringify({
                params: {
                    taskId: taskId,
                    updates: { assigneeId: currentUser.id }
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to assign task: ${errorText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error assigning task to self:', error);
        throw error;
    }
};

// Unassign task from self with notifications to event managers
export const unassignTaskFromSelfWithNotifications = async (taskId) => {
    const instabackToken = getToken();
    if (!instabackToken) throw new Error('Authentication required');

    const currentUser = getCurrentUser();
    if (!currentUser?.id) throw new Error('User not found');

    try {
        // Use updatetaskwithnotifications to clear assignee
        const response = await fetch(`${API_BASE_URL}/edge-function/updatetaskwithnotifications`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${instabackToken}`,
                'accept': 'application/json'
            },
            body: JSON.stringify({
                params: {
                    taskId: taskId,
                    updates: { 
                        assigneeId: null,
                        assignee_id: null 
                    }
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to unassign task: ${errorText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error unassigning task from self:', error);
        throw error;
    }
};

// Toggle task visibility (hide/show)
export const toggleTaskVisibility = async (taskId, isHidden) => {
    if (!taskId) throw new Error('taskId is required');
    
    return updateTask(taskId, { isHidden: isHidden });
};

// Admin delete user with reassignment
export const adminDeleteUserWithReassign = async (userIdToDelete, reassignToUserId = null) => {
  const currentToken = getToken();
  if (!currentToken) throw new Error('לא מחובר למערכת');

  const response = await fetch(`${API_BASE_URL}/edge-function/admin_delete_user_with_reassign`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${currentToken}`,
      'Content-Type': 'application/json',
      'accept': 'application/json'
    },
    body: JSON.stringify({
        params: {
            userIdToDelete: userIdToDelete,
            reassignToUserId: reassignToUserId
        }
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'שגיאה במחיקת החשבון');
  }

  return await response.json();
};

// Send push notification via Planora webhook
export const sendPlanoraNotification = async ({ userId, title, body, data = {}, provider = 'onesignal' }) => {
  if (!userId) throw new Error('userId is required');
  if (!title || !body) throw new Error('title and body are required');

  try {
    const currentToken = getToken();
    if (!currentToken) throw new Error('Authentication required: Missing InstaBack token.');

    const response = await fetch(`${API_BASE_URL}/edge-function/send_planora_notification`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${currentToken}`,
        'Content-Type': 'application/json',
        'accept': 'application/json'
      },
      body: JSON.stringify({
        params: {
          userId: String(userId),
          title,
          body,
          data,
          provider
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Planora notification failed:', errorData);
      throw new Error(errorData.message || `Failed to send notification: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Planora notification sent:', result);
    return result;
  } catch (error) {
    console.error('Error sending Planora notification:', error);
    throw error;
  }
};

// ===== NEW PLANORA ALERT FUNCTIONS =====

// Check device push notification status via Planora Alert iframe
export const checkDevicePushStatus = async (userId) => {
    if (!userId) {
        throw new Error('userId is required');
    }

    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined') {
            return reject(new Error('This function can only be run in a browser environment.'));
        }

        const planoraHost = 'https://studio--planoraaleret-62152057-8e5b6.us-central1.hosted.app';
        const iframeUrl = `${planoraHost}/silent-push-check?userId=${encodeURIComponent(userId)}&origin=${encodeURIComponent(window.location.origin)}`;

        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = iframeUrl;

        const timeout = setTimeout(() => {
            cleanup();
            reject(new Error('Timeout: No response from Planora iframe.'));
        }, 10000); // 10-second timeout

        const messageHandler = (event) => {
            // Verify message origin
            if (event.origin !== planoraHost) {
                return;
            }

            if (event.data?.type === 'PLANORA_PUSH_STATUS') {
                console.log('[checkDevicePushStatus] ✅ Received push status from Planora:', event.data);
                cleanup();
                resolve(event.data);
            }

            if (event.data?.type === 'PLANORA_PUSH_ERROR') {
                console.error('[checkDevicePushStatus] ❌ Error from Planora iframe:', event.data.message);
                cleanup();
                reject(new Error(event.data.message));
            }
        };

        const cleanup = () => {
            clearTimeout(timeout);
            window.removeEventListener('message', messageHandler);
            if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
            }
        };

        window.addEventListener('message', messageHandler);
        document.body.appendChild(iframe);
    });
};

// Update user's OneSignal subscription ID
export const updateUserOneSignalId = async (userId, oneSignalSubscriptionId) => {
    if (!userId) throw new Error('userId is required');
    if (!oneSignalSubscriptionId) throw new Error('oneSignalSubscriptionId is required');

    try {
        console.log('[updateUserOneSignalId] 💾 Updating OneSignal ID for user:', userId);

        // Use InstaBack API directly
        const result = await _fetchWithAuth(`/User/${userId}`, {
            method: 'PUT',
            body: JSON.stringify({ oneSignalSubscriptionId })
        });

        console.log('[updateUserOneSignalId] ✅ OneSignal ID updated successfully');

        // Update localStorage cache as well
        if (typeof window !== 'undefined') {
            const storedUser = getCurrentUser();
            if (storedUser && storedUser.id === userId) {
                storedUser.oneSignalSubscriptionId = oneSignalSubscriptionId;
                localStorage.setItem('instaback_user', JSON.stringify(storedUser));
            }
        }

        return result;
    } catch (error) {
        console.error('[updateUserOneSignalId] ❌ Failed to update OneSignal ID:', error);
        throw error;
    }
};

// Redirect to Planora Alert for registration
export const registerToPlanoraAlert = (userId, returnUrl = null) => {
  if (!userId) throw new Error('userId is required');

  const planoraHost = 'https://studio--planoraaleret-62152057-8e5b6.us-central1.hosted.app';
  const finalReturnUrl = returnUrl || (typeof window !== 'undefined' ? window.location.href : '');
  const registerUrl = `${planoraHost}/register?userId=${encodeURIComponent(userId)}&returnUrl=${encodeURIComponent(finalReturnUrl)}`;

  console.log('[registerToPlanoraAlert] 🔔 Redirecting to:', registerUrl);

  if (typeof window !== 'undefined') {
    window.location.href = registerUrl;
  }
};

// Redirect to Planora Alert for unregistration
export const unregisterFromPlanoraAlert = (userId, returnUrl = null) => {
  if (!userId) throw new Error('userId is required');

  const planoraHost = 'https://studio--planoraaleret-62152057-8e5b6.us-central1.hosted.app';
  const finalReturnUrl = returnUrl || (typeof window !== 'undefined' ? window.location.href : '');
  const unregisterUrl = `${planoraHost}/unregister?userId=${encodeURIComponent(userId)}&returnUrl=${encodeURIComponent(finalReturnUrl)}`;

  console.log('[unregisterFromPlanoraAlert] 🔕 Redirecting to:', unregisterUrl);

  if (typeof window !== 'undefined') {
    window.location.href = unregisterUrl;
  }
};

// --- Delete Device from OneSignal ---
export const deleteDeviceFromOneSignal = async (userId) => {
    const instabackToken = getToken();
    if (!instabackToken) throw new Error('Authentication required');
    if (!userId) throw new Error('userId is required');

    try {
        console.log('[deleteDeviceFromOneSignal] 🗑️ Calling with userId:', userId);

        const response = await fetch(`${API_BASE_URL}/edge-function/delete_user_fromm_onesignal`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${instabackToken}`,
                'accept': 'application/json'
            },
            body: JSON.stringify({
                params: {
                    userId: userId
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to delete device: ${errorText}`);
        }

        const result = await response.json();
        console.log('[deleteDeviceFromOneSignal] ✅ Success:', result);
        return result;
    } catch (error) {
        console.error('[deleteDeviceFromOneSignal] ❌ Error:', error);
        throw error;
    }
};

// --- OneSignal Status Check ---
export const checkOneSignalDeviceStatus = async () => {
    console.log('🔍 [checkOneSignalDeviceStatus] === STARTING CLIENT CALL ===');

    try {
        const instabackUser = getCurrentUser();
        const userId = instabackUser?.id;

        console.log('[checkOneSignalDeviceStatus] InstaBack User ID:', userId);

        if (!userId) {
            console.warn('[checkOneSignalDeviceStatus] ❌ No InstaBack User ID found');
            return {
                hasDevices: false,
                error: 'No InstaBack User ID',
                debug: { reason: 'Missing InstaBack User ID' }
            };
        }

        const endpoint = `/edge-function/check_onesignal_device_status`;
        const payload = { params: { userId: userId } }; // Changed payload structure

        console.log('[checkOneSignalDeviceStatus] 📡 Calling InstaBack Edge Function:', endpoint);
        console.log('[checkOneSignalDeviceStatus] 📤 Sending payload:', payload);

        const result = await _fetchWithAuth(endpoint, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        console.log('[checkOneSignalDeviceStatus] ✅ Result from InstaBack:', result);

        // התשובה מגיעה בתוך result.data
        const data = result.data || result; // Extract data from result.data if present

        return data;

    } catch (error) {
        console.error('[checkOneSignalDeviceStatus] ❌ Exception caught:', error);
        return {
            hasDevices: false,
            error: error.message || 'Unknown error during OneSignal status check',
            debug: {
                exception: true,
                errorMessage: error.message,
                timestamp: new Date().toISOString()
            }
        };
    }
};

// --- Feedback Management ---
export const submitFeedback = async (feedbackData) => {
    if (!feedbackData.userId || !feedbackData.title || !feedbackData.message || !feedbackData.feedbackType) {
        throw new Error('Missing required feedback fields');
    }

    // Update lastAction for the user submitting feedback
    updateUserLastAction(feedbackData.userId).catch(() => {});

    const feedback = await _fetchWithAuth('/Feedback', {
        method: 'POST',
        body: JSON.stringify({
            userId: feedbackData.userId,
            userName: feedbackData.userName || feedbackData.userEmail,
            userEmail: feedbackData.userEmail,
            feedbackType: feedbackData.feedbackType,
            title: feedbackData.title,
            message: feedbackData.message,
            status: 'new'
        })
    });

    // Notify admins about new feedback - create both Notification and SystemMessage (banner)
    try {
        const allUsers = await _fetchWithAuth('/User', { method: 'GET' });
        const admins = (Array.isArray(allUsers) ? allUsers : (allUsers?.items || [])).filter(u => {
            const role = u.role || u.Role || u.roles;
            return role === 'admin' || role === 'superadmin';
        });

        console.log(`📬 Notifying ${admins.length} admins about new feedback`);

        const feedbackTypeLabel = getFeedbackTypeLabel(feedbackData.feedbackType);
        const notificationTitle = `📬 משוב חדש: ${feedbackData.title}`;
        const notificationMessage = `${feedbackData.userName || feedbackData.userEmail} שלח/ה משוב מסוג "${feedbackTypeLabel}"`;

        // 1. Create internal Notification for each admin
        for (const admin of admins) {
            try {
                // Create Notification entity directly
                await _fetchWithAuth('/Notification', {
                    method: 'POST',
                    body: JSON.stringify({
                        userId: admin.id,
                        type: 'feedback_received',
                        title: notificationTitle,
                        message: notificationMessage,
                        priority: 'high',
                        relatedId: feedback.id,
                        actionUrl: '/Profile#manage-feedback',
                        isRead: false
                    })
                });
                console.log(`✅ Created notification for admin: ${admin.id}`);

                // Also try to send push notification via edge function
                await createNotificationAndSendPush({
                    userId: admin.id,
                    type: 'feedback_received',
                    title: notificationTitle,
                    message: notificationMessage,
                    priority: 'high',
                    relatedId: feedback.id,
                    actionUrl: 'https://register.plan-ora.net/Profile#manage-feedback'
                }).catch(err => console.warn('Push notification failed:', err.message));

            } catch (notifError) {
                console.warn('Failed to notify admin:', admin.id, notifError);
            }
        }

        // 2. Create SystemMessage banner for admins
        try {
            await _fetchWithAuth('/SystemMessage', {
                method: 'POST',
                body: JSON.stringify({
                    title: notificationTitle,
                    content: `**${notificationMessage}**\n\nלחץ כאן לצפייה ומענה למשובים.`,
                    type: 'announcement',
                    priority: 'high',
                    targetAudience: 'admins',
                    displayMode: 'banner',
                    dismissible: true,
                    requireConfirm: false,
                    isActive: true,
                    startDate: new Date().toISOString(),
                    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
                })
            });
            console.log('✅ Created SystemMessage banner for admins');
        } catch (bannerError) {
            console.warn('Failed to create banner for admins:', bannerError);
        }

    } catch (notifyError) {
        console.warn('Failed to notify admins about feedback:', notifyError);
    }

    return feedback;
};

const getFeedbackTypeLabel = (type) => {
    const labels = {
        'general': 'כללי',
        'suggestion': 'הצעה לשיפור',
        'bug_report': 'דיווח על באג',
        'question': 'שאלה'
    };
    return labels[type] || type;
};

export const listFeedbacks = async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.feedbackType) params.set('feedbackType', filters.feedbackType);
    if (filters.userId) params.set('userId', filters.userId);

    const query = params.toString() ? `?${params.toString()}` : '';
    return _fetchWithAuth(`/Feedback${query}`, { method: 'GET' });
};

export const updateFeedback = async (feedbackId, updates) => {
    if (!feedbackId) throw new Error('feedbackId is required');
    return _fetchWithAuth(`/Feedback/${feedbackId}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
    });
};

export const deleteFeedback = async (feedbackId) => {
    if (!feedbackId) throw new Error('feedbackId is required');
    return _fetchWithAuth(`/Feedback/${feedbackId}`, { method: 'DELETE' });
};

// === Google Places Search ===
export const googleSearchPlaces = async (query) => {
    if (!query) throw new Error('Search query is required');

    const currentToken = getToken();
    if (!currentToken) throw new Error('Authentication required');

    try {
        console.log('[googleSearchPlaces] 🔍 Searching for:', query);

        const response = await fetch(`${API_BASE_URL}/edge-function/Google_search_places`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`,
                'accept': 'application/json'
            },
            body: JSON.stringify({
                params: {
                    input: query,
                    fields: 'name,formatted_address,geometry,rating,user_ratings_total,photos,types,business_status,icon,vicinity,place_id,url'
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[googleSearchPlaces] Error response:', errorText);
            throw new Error(`Failed to search places: ${response.status} - ${errorText}`);
        }

        const result = await response.json();

        // חילוץ התוצאות
        let results = [];
        if (result.data?.data?.results) {
            results = result.data.data.results;
        } else if (result.data?.results) {
            results = result.data.results;
        } else if (result.data?.candidates) {
            results = result.data.candidates;
        } else if (Array.isArray(result.data)) {
            results = result.data;
        } else if (result.results) {
            results = result.results;
        } else if (Array.isArray(result)) {
            results = result;
        }

        console.log('[googleSearchPlaces] 📍 Total places found:', results.length);

        // Map to consistent format
        const places = results.map((place, index) => ({
            id: place.place_id || place.id || `place_${index}`,
            name: place.name || 'Unknown',
            address: place.formatted_address || place.vicinity || place.address || '',
            location: place.geometry?.location || null,
            rating: place.rating || null,
            user_ratings_total: place.user_ratings_total || 0,
            priceLevel: place.price_level,
            types: place.types || [],
            businessStatus: place.business_status,
            icon: place.icon,
            url: place.url || null,
            place_id: place.place_id // ✅ חשוב לקריאה ל-Place Details
        }));

        return places;
    } catch (error) {
        console.error('[googleSearchPlaces] ❌ Error:', error);
        throw error;
    }
};

// === Google Place Details - קבלת פרטים מלאים על מקום ספציפי ===
export const getPlaceDetails = async (placeId) => {
    if (!placeId) throw new Error('placeId is required');

    const currentToken = getToken();
    if (!currentToken) throw new Error('Authentication required');

    try {
        console.log('[getPlaceDetails] 🔍 Fetching details for placeId:', placeId);

        // ✅ שימוש בשדות של Google Places API הישן (לא החדש!)
        const response = await fetch(`${API_BASE_URL}/edge-function/Google_Place_Details`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`,
                'accept': 'application/json'
            },
            body: JSON.stringify({
                params: {
                    placeId: placeId,
                    // ✅ שדות של Places API הישן
                    fields: 'name,formatted_address,geometry,website,international_phone_number,rating,user_ratings_total,price_level,business_status'
                }
            })
        });

        console.log('[getPlaceDetails] Response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[getPlaceDetails] ❌ Error response:', errorText);
            throw new Error(`Failed to get place details: ${response.status}`);
        }

        const result = await response.json();
        console.log('[getPlaceDetails] 📦 Raw response:', JSON.stringify(result, null, 2));

        // חילוץ הנתונים מהתשובה
        let placeData = null;

        // InstaBack מחזיר: { success: true, data: { result: {...} } }
        if (result.data?.result) {
            placeData = result.data.result;
            console.log('[getPlaceDetails] ✅ Extracted from result.data.result');
        } else if (result.data?.data?.result) {
            placeData = result.data.data.result;
            console.log('[getPlaceDetails] ✅ Extracted from result.data.data.result');
        } else if (result.result) {
            placeData = result.result;
            console.log('[getPlaceDetails] ✅ Extracted from result.result');
        } else if (result.data) {
            placeData = result.data;
            console.log('[getPlaceDetails] ✅ Extracted from result.data');
        } else {
            placeData = result;
            console.log('[getPlaceDetails] ⚠️ Using result as-is');
        }

        if (!placeData) {
            console.error('[getPlaceDetails] ❌ Could not extract place data from response');
            throw new Error('Invalid response structure');
        }

        // ✅ נרמול השדות של API הישן
        const normalized = {
            name: placeData.name,
            address: placeData.formatted_address,
            location: placeData.geometry?.location,
            website: placeData.website,
            phoneNumber: placeData.international_phone_number,
            rating: placeData.rating,
            userRatingCount: placeData.user_ratings_total,
            priceLevel: placeData.price_level,
            businessStatus: placeData.business_status
        };

        console.log('[getPlaceDetails] 🎯 Normalized result:', {
            hasWebsite: !!normalized.website,
            website: normalized.website || '❌ MISSING',
            hasPhone: !!normalized.phoneNumber,
            phoneNumber: normalized.phoneNumber || '❌ MISSING',
            hasRating: !!normalized.rating,
            rating: normalized.rating
        });

        return normalized;
    } catch (error) {
        console.error('[getPlaceDetails] ❌ Error:', error);

        // Return empty object instead of throwing, so we can fallback gracefully
        return {
            name: null,
            address: null,
            location: null,
            website: null,
            phoneNumber: null,
            rating: null,
            userRatingCount: null,
            priceLevel: null,
            businessStatus: null
        };
    }
};

// --- System Messages ---
export const listSystemMessages = async () => {
    return _fetchWithAuth('/SystemMessage', { method: 'GET' });
};

export const createSystemMessage = async (data) => {
    return _fetchWithAuth('/SystemMessage', { 
        method: 'POST', 
        body: JSON.stringify(data) 
    });
};

export const updateSystemMessage = async (messageId, data) => {
    if (!messageId) throw new Error('messageId is required');
    return _fetchWithAuth(`/SystemMessage/${messageId}`, { 
        method: 'PUT', 
        body: JSON.stringify(data) 
    });
};

export const deleteSystemMessage = async (messageId) => {
    if (!messageId) throw new Error('messageId is required');
    return _fetchWithAuth(`/SystemMessage/${messageId}`, { method: 'DELETE' });
};

// Increment view count for a system message
export const incrementSystemMessageViewCount = async (messageId) => {
    if (!messageId) return;
    
    try {
        // Get current message
        const message = await _fetchWithAuth(`/SystemMessage/${messageId}`, { method: 'GET' });
        if (!message) return;
        
        const currentViewCount = message.viewCount || 0;
        
        // Update view count
        await _fetchWithAuth(`/SystemMessage/${messageId}`, {
            method: 'PUT',
            body: JSON.stringify({ viewCount: currentViewCount + 1 })
        });
        
        console.log(`[incrementSystemMessageViewCount] Updated viewCount to ${currentViewCount + 1} for message ${messageId}`);
    } catch (error) {
        console.warn('[incrementSystemMessageViewCount] Failed to increment view count:', error);
    }
};

// --- Event RSVP ---
export const createEventRSVP = async (rsvpData) => {
    if (!rsvpData.eventId) throw new Error('eventId is required');
    if (!rsvpData.name) throw new Error('name is required');
    if (!rsvpData.attendance) throw new Error('attendance is required');

    const payload = {
        eventId: rsvpData.eventId,
        name: rsvpData.name,
        phone: rsvpData.phone || null,
        email: rsvpData.email || null,
        attendance: rsvpData.attendance, // 'yes', 'no', 'maybe'
        guestCount: rsvpData.guestCount || 1,
        notes: rsvpData.notes || null,
        userId: rsvpData.userId || null,
        submittedAt: new Date().toISOString()
    };

    console.log('[createEventRSVP] Creating RSVP:', payload);
    return _fetchWithAuth('/EventRSVP', { method: 'POST', body: JSON.stringify(payload) });
};

export const getEventRSVPs = async (eventId) => {
    if (!eventId) throw new Error('eventId is required');
    return _fetchWithAuth(`/EventRSVP?eventId=${encodeURIComponent(eventId)}`, { method: 'GET' });
};

export const updateEventRSVP = async (rsvpId, updates) => {
    if (!rsvpId) throw new Error('rsvpId is required');
    return _fetchWithAuth(`/EventRSVP/${rsvpId}`, { method: 'PUT', body: JSON.stringify(updates) });
};

export const deleteEventRSVP = async (rsvpId) => {
    if (!rsvpId) throw new Error('rsvpId is required');
    return _fetchWithAuth(`/EventRSVP/${rsvpId}`, { method: 'DELETE' });
};

export const getEventRSVPStats = async (eventId) => {
    if (!eventId) throw new Error('eventId is required');
    
    const rsvps = await getEventRSVPs(eventId);
    const rsvpList = Array.isArray(rsvps) ? rsvps : [];
    
    const stats = {
        total: rsvpList.length,
        attending: 0,
        notAttending: 0,
        maybe: 0,
        totalGuests: 0
    };
    
    rsvpList.forEach(rsvp => {
        if (rsvp.attendance === 'yes') {
            stats.attending++;
            stats.totalGuests += (rsvp.guestCount || 1);
        } else if (rsvp.attendance === 'no') {
            stats.notAttending++;
        } else if (rsvp.attendance === 'maybe') {
            stats.maybe++;
        }
    });
    
    return stats;
};

// --- FCM Token Registration ---
// --- Update User Last Action ---
export const updateUserLastAction = async (userId) => {
    if (!userId) return;
    
    try {
        await _fetchWithAuth(`/User/${userId}`, {
            method: 'PUT',
            body: JSON.stringify({ lastAction: new Date().toISOString() })
        });
        console.log('[updateUserLastAction] ✅ Updated lastAction for user:', userId);
    } catch (error) {
        console.warn('[updateUserLastAction] Failed:', error.message);
    }
};

export const registerFcmToken = async ({ userId, token }) => {
    if (!userId || !token) {
        throw new Error('userId and token are required');
    }

    const instabackToken = getToken();
    if (!instabackToken) {
        throw new Error('Authentication required');
    }

    try {
        console.log('[registerFcmToken] 💾 Registering FCM token for user:', userId);

        const response = await fetch(`${API_BASE_URL}/edge-function/registerFcmToken`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${instabackToken}`,
                'accept': 'application/json'
            },
            body: JSON.stringify({
                params: {
                    userId: String(userId),
                    token: String(token)
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[registerFcmToken] ❌ Failed:', errorText);
            throw new Error(`Failed to register FCM token: ${errorText}`);
        }

        const result = await response.json();
        console.log('[registerFcmToken] ✅ Success:', result);
        return result;

    } catch (error) {
        console.error('[registerFcmToken] ❌ Error:', error);
        throw error;
    }
};

// --- Recurring Event Rules ---
export const createRecurringEventRule = async (ruleData) => {
    if (!ruleData.event_id) throw new Error('event_id is required');
    if (!ruleData.recurrence_pattern) throw new Error('recurrence_pattern is required');

    console.log('[createRecurringEventRule] Creating rule:', ruleData);
    return _fetchWithAuth('/RecurringEventRule', { method: 'POST', body: JSON.stringify(ruleData) });
};

export const getRecurringEventRule = async (eventId) => {
    if (!eventId) throw new Error('eventId is required');
    
    const rules = await _fetchWithAuth(`/RecurringEventRule?event_id=${encodeURIComponent(eventId)}`, { method: 'GET' });
    const ruleList = Array.isArray(rules) ? rules : (rules?.items || []);
    return ruleList.length > 0 ? ruleList[0] : null;
};

export const updateRecurringEventRule = async (ruleId, updates) => {
    if (!ruleId) throw new Error('ruleId is required');
    return _fetchWithAuth(`/RecurringEventRule/${ruleId}`, { method: 'PUT', body: JSON.stringify(updates) });
};

export const deleteRecurringEventRule = async (ruleId) => {
    if (!ruleId) throw new Error('ruleId is required');
    return _fetchWithAuth(`/RecurringEventRule/${ruleId}`, { method: 'DELETE' });
};

// Get recurring event instances for a date range
export const getRecurringEventInstances = async (eventId, startDate, endDate) => {
    if (!eventId) throw new Error('eventId is required');
    if (!startDate || !endDate) throw new Error('startDate and endDate are required');

    const instabackToken = getToken();
    if (!instabackToken) throw new Error('Authentication required');

    try {
        console.log('[getRecurringEventInstances] 📅 Fetching instances for event:', eventId);

        const response = await fetch(`${API_BASE_URL}/edge-function/get_recurring_event_instances`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${instabackToken}`,
                'accept': 'application/json'
            },
            body: JSON.stringify({
                params: {
                    eventId: String(eventId),
                    startDate: typeof startDate === 'string' ? startDate : startDate.toISOString(),
                    endDate: typeof endDate === 'string' ? endDate : endDate.toISOString()
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[getRecurringEventInstances] ❌ Failed:', errorText);
            throw new Error(`Failed to get recurring instances: ${errorText}`);
        }

        const result = await response.json();
        console.log('[getRecurringEventInstances] ✅ Got instances:', result);
        
        // Extract instances from response
        const instances = result.data?.instances || result.instances || [];
        return instances;

    } catch (error) {
        console.error('[getRecurringEventInstances] ❌ Error:', error);
        throw error;
    }
};

// Exclude a specific date from recurring event
export const excludeRecurringEventDate = async (eventId, dateToExclude) => {
    if (!eventId) throw new Error('eventId is required');
    if (!dateToExclude) throw new Error('dateToExclude is required');

    try {
        // Get the current rule
        const rule = await getRecurringEventRule(eventId);
        if (!rule) throw new Error('No recurring rule found for this event');

        // Add date to excluded_dates array
        const excludedDates = rule.excluded_dates || [];
        const dateStr = typeof dateToExclude === 'string' 
            ? dateToExclude.split('T')[0] 
            : dateToExclude.toISOString().split('T')[0];
        
        if (!excludedDates.includes(dateStr)) {
            excludedDates.push(dateStr);
            await updateRecurringEventRule(rule.id, { excluded_dates: excludedDates });
        }

        return { success: true };
    } catch (error) {
        console.error('[excludeRecurringEventDate] ❌ Error:', error);
        throw error;
    }
};

// --- App Versions ---
export const listAppVersions = async () => {
    const res = await _fetchWithAuth('/AppVersion', { method: 'GET' });
    return Array.isArray(res) ? res : (res?.items || []);
};

export const createAppVersion = async (data) => {
    return _fetchWithAuth('/AppVersion', { method: 'POST', body: JSON.stringify(data) });
};

export const updateAppVersion = async (id, data) => {
    if (!id) throw new Error('id is required');
    return _fetchWithAuth(`/AppVersion/${id}`, { method: 'PUT', body: JSON.stringify(data) });
};

export const deleteAppVersion = async (id) => {
    if (!id) throw new Error('id is required');
    return _fetchWithAuth(`/AppVersion/${id}`, { method: 'DELETE' });
};
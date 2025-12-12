import React, { createContext, useContext, useState, useEffect } from 'react';
import {
    instabackLogin,
    instabackRegister,
    instabackLogout,
    getCurrentUser as getStoredUser,
    getCurrentUserFromServer,
    notifyAdminsNewUser,
    updateUserOneSignalId,
    updateUser
} from '@/components/instabackService';
import { Loader2 } from 'lucide-react';
import {
    isNativeCapacitor,
    getNativePlatform,
    setupOneSignalForUser,
    logoutOneSignal
} from '@/components/onesignalService';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

// 🔔 OneSignal App ID
const ONESIGNAL_APP_ID = '7f593882-9d51-45bc-b3ca-e17ee2d54a0d';

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // ✅ טעינה מהירה - לא חוסמת!
    useEffect(() => {
        const checkUser = async () => {
            const storedUser = getStoredUser();
            const token = typeof window !== 'undefined' ? localStorage.getItem('instaback_token') : null;

            console.log('[AuthProvider] 🚀 Fast init:', { 
                hasStoredUser: !!storedUser, 
                hasToken: !!token,
                userId: storedUser?.id 
            });

            // ✅ הצגה מיידית אם יש משתמש שמור
            if (storedUser && token) {
                setUser(storedUser);
                setIsAuthenticated(true);
                setIsLoading(false); // ✅ סיום טעינה מיידי!
                
                // ✅ עדכון ברקע - לא חוסם!
                getCurrentUserFromServer()
                    .then((freshUser) => {
                        if (freshUser) {
                            const mergedUser = {
                                ...freshUser,
                                avatar_url: freshUser.avatar_url || storedUser.avatar_url
                            };
                            
                            setUser(mergedUser);
                            
                            if (typeof window !== 'undefined') {
                                localStorage.setItem('instaback_user', JSON.stringify(mergedUser));
                            }
                        }
                    })
                    .catch(error => {
                        console.warn('[AuthProvider] Background user refresh failed:', error);
                    });

                // 🔔 אתחול OneSignal ברקע - לא חוסם!
                if (isNativeCapacitor() && storedUser.id) {
                    setupOneSignalForUser(storedUser.id, ONESIGNAL_APP_ID)
                        .then((subscriptionId) => {
                            if (subscriptionId) {
                                console.log('[AuthProvider] ✅ Got Subscription ID:', subscriptionId);
                                
                                updateUserOneSignalId(storedUser.id, subscriptionId)
                                    .then(() => {
                                        console.log('[AuthProvider] ✅ Subscription ID saved');
                                        
                                        const updatedUser = { ...storedUser, oneSignalSubscriptionId: subscriptionId };
                                        setUser(updatedUser);
                                        
                                        if (typeof window !== 'undefined') {
                                                                    localStorage.setItem('instaback_user', JSON.stringify(updatedUser));
                                                                }
                                                            })
                                                            .catch(err => console.error('[AuthProvider] Failed to save subscription:', err));
                                                    }
                                                })
                                                .catch(err => console.error('[AuthProvider] OneSignal setup error:', err));
                                        }

                                        // 📱 Update user's app platform (android/ios)
                                        const platform = getNativePlatform();
                                        if (platform && storedUser.app !== platform) {
                                            console.log('[AuthProvider] 📱 Updating user app platform to:', platform);
                                            updateUser(storedUser.id, { app: platform })
                                                .then(() => {
                                                    console.log('[AuthProvider] ✅ User app platform updated to:', platform);
                                                    const updatedUser = { ...storedUser, app: platform };
                                                    setUser(updatedUser);
                                                    if (typeof window !== 'undefined') {
                                                        localStorage.setItem('instaback_user', JSON.stringify(updatedUser));
                                                    }
                                                })
                                                .catch(err => console.warn('[AuthProvider] Failed to update app platform:', err));
                                        }
                                        } else {
                                        instabackLogout();
                                        setIsAuthenticated(false);
                                        setIsLoading(false);
                                        }
                                        };

                                        checkUser();
                                        }, []);

    // Listener לניווט מהתראות OneSignal
    useEffect(() => {
        const handleOneSignalNavigation = (event) => {
            const { route, url } = event.detail || {};
            console.log('[AuthProvider] OneSignal navigation:', { route, url });
            
            if (route) {
                window.location.href = route;
            } else if (url) {
                window.location.href = url;
            }
        };

        window.addEventListener('onesignal:navigate', handleOneSignalNavigation);
        
        return () => {
            window.removeEventListener('onesignal:navigate', handleOneSignalNavigation);
        };
    }, []);

    const login = async (email, password) => {
        const loggedInUser = await instabackLogin(email, password);
        setUser(loggedInUser);
        setIsAuthenticated(true);
        
        sessionStorage.setItem('last_login_time', String(Date.now()));

        // 🔔 אתחול OneSignal ברקע
        if (isNativeCapacitor() && loggedInUser.id) {
            setupOneSignalForUser(loggedInUser.id, ONESIGNAL_APP_ID)
                .then((subscriptionId) => {
                    if (subscriptionId) {
                        updateUserOneSignalId(loggedInUser.id, subscriptionId)
                            .then(() => {
                                const updatedUser = { ...loggedInUser, oneSignalSubscriptionId: subscriptionId };
                                setUser(updatedUser);
                                if (typeof window !== 'undefined') {
                                    localStorage.setItem('instaback_user', JSON.stringify(updatedUser));
                                }
                            })
                            .catch(err => console.error('[AuthProvider] Failed to save subscription:', err));
                    }
                })
                .catch(err => console.error('[AuthProvider] OneSignal setup error:', err));
        }

        // 📱 Update user's app platform on login (android/ios)
        const platform = getNativePlatform();
        if (platform) {
            console.log('[AuthProvider] 📱 Updating user app platform on login:', platform);
            updateUser(loggedInUser.id, { app: platform })
                .catch(err => console.warn('[AuthProvider] Failed to update app platform:', err));
        }

        return loggedInUser;
        };

    const register = async (userData) => {
        console.log('📝 Registering user...');
        const newUser = await instabackRegister(userData);
        console.log('✅ User registered:', newUser);
        
        try {
            await notifyAdminsNewUser({
                userId: newUser.id,
                userEmail: newUser.email,
                userName: newUser.name || newUser.email
            });
        } catch (err) {
            console.warn('❌ Failed to notify admins:', err);
        }
        
        sessionStorage.setItem('last_login_time', String(Date.now()));
        
        return newUser;
    };

    const logout = async () => {
        // 🔔 יציאה מ-OneSignal לפני logout
        if (isNativeCapacitor()) {
            try {
                await logoutOneSignal();
                console.log('[AuthProvider] ✅ Logged out from OneSignal');
            } catch (error) {
                console.error('[AuthProvider] ❌ OneSignal logout failed:', error);
            }
        }
        
        instabackLogout();
        setUser(null);
        setIsAuthenticated(false);
        
        sessionStorage.removeItem('last_login_time');
        
        if (typeof window !== 'undefined') {
            window.location.href = '/';
        }
    };

    const updateUserData = (updatedUser) => {
        setUser(updatedUser);
        
        if (typeof window !== 'undefined') {
            localStorage.setItem('instaback_user', JSON.stringify(updatedUser));
        }
    };

    const value = {
        user,
        setUser: updateUserData,
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
            </div>
        );
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
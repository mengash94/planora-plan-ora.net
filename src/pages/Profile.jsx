import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, User, Bell, Settings, TrendingUp, MessageSquare, Shield, ChevronLeft, ChevronRight, Smartphone, FileText, BarChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
    updateUser,
    deleteMyAccount,
    // Removed registerToPlanoraAlert, unregisterFromPlanoraAlert as their logic moves to NotificationSettings
    getCurrentUser,
    getCurrentUserFromServer,
    uploadFileToInstaback,
    createNotificationAndSendPush,
    listUsers
} from '@/components/instabackService';
import { isMobileDevice } from '@/components/utils/deviceDetection';

import ProfileDetails from '@/components/profile/ProfileDetails';
import NotificationSettings from '@/components/profile/NotificationSettings';
import AppSettings from '@/components/profile/AppSettings';
import UsageJourney from '@/components/profile/UsageJourney';
import FeedbackForm from '@/components/profile/FeedbackForm';
import ManageFeedback from '@/components/profile/ManageFeedback';
import PushNotificationDebug from '@/components/profile/PushNotificationDebug';
import AdminSettings from '@/components/profile/AdminSettings';
import RSVPCategoriesSettings from '@/components/profile/RSVPCategoriesSettings';
import QuickBroadcast from '@/components/profile/QuickBroadcast';

export default function ProfilePage() {
    const { user, isAuthenticated, isLoading: isAuthLoading, logout, setUser } = useAuth();
    const [activeTab, setActiveTab] = useState('details'); // Changed 'profile' to 'details'
    const [adminSubView, setAdminSubView] = useState(null); // 'rsvp-categories', 'quick-broadcast', or null
    const [formData, setFormData] = useState({ name: '', phone: '', avatar_url: '' });
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);
    const [serverUser, setServerUser] = useState(null);
    const [isLoadingServerUser, setIsLoadingServerUser] = useState(true);
    const scrollContainerRef = React.useRef(null);
    const navigate = useNavigate();

    const isMobile = isMobileDevice();

    // Fetch fresh user data from server to verify admin role
    useEffect(() => {
        const fetchServerUser = async () => {
            if (!user?.id) {
                setIsLoadingServerUser(false);
                return;
            }

            try {
                console.log('[Profile] Fetching user from InstaBack server...');
                const freshUser = await getCurrentUserFromServer();
                console.log('[Profile] Fresh user from server:', {
                    id: freshUser?.id,
                    email: freshUser?.email,
                    role: freshUser?.role,
                    Role: freshUser?.Role,
                    allKeys: freshUser ? Object.keys(freshUser) : []
                });
                setServerUser(freshUser);
            } catch (error) {
                console.error('[Profile] Failed to fetch user from server:', error);
                // Optionally handle specific errors, e.g., if user is not found or unauthorized
            } finally {
                setIsLoadingServerUser(false);
            }
        };

        fetchServerUser();
    }, [user?.id]); // Depend on user.id to re-fetch if user changes or becomes available

    // Check if user is admin - prioritize server data
    const isAdmin = React.useMemo(() => {
        const storedUser = getCurrentUser();
        
        // Prioritize server data if available
        if (serverUser) {
            const role = serverUser.role || serverUser.Role;
            const isAdminRole = role === 'admin';
            console.log('[Profile] Admin check from SERVER:', { 
                serverRole: serverUser.role,
                serverRoleCap: serverUser.Role,
                isAdmin: isAdminRole 
            });
            return isAdminRole;
        }

        // Fallback to user state and localStorage if server data isn't loaded or available yet
        const role = user?.role || user?.Role || storedUser?.role || storedUser?.Role;
        const isAdminRole = role === 'admin';
        console.log('[Profile] Admin check from STATE/STORAGE:', { 
            userRole: user?.role, 
            userRoleCap: user?.Role,
            storedRole: storedUser?.role,
            storedRoleCap: storedUser?.Role,
            isAdmin: isAdminRole 
        });
        return isAdminRole;
    }, [user, serverUser]); // Re-calculate if user or serverUser changes

    // Load initial data
    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || user.firstName || '',
                phone: user.phone || '',
                avatar_url: user.avatar_url || ''
            });
        }
    }, [user]);

    // Read hash ONLY on mount
    useEffect(() => {
        const hash = window.location.hash.replace('#', '');
        if (hash && ['details', 'notifications', 'settings', 'journey', 'feedback', 'manage-feedback', 'push-debug', 'admin-settings'].includes(hash)) {
            setActiveTab(hash);
        }
    }, []);

    // Listen for admin actions from AdminSettings component
    useEffect(() => {
        const handleAdminAction = (e) => {
            const { action } = e.detail;
            if (action === 'rsvp-categories') {
                setAdminSubView('rsvp-categories');
            } else if (action === 'quick-broadcast') {
                setAdminSubView('quick-broadcast');
            } else if (action === 'manage-feedback') {
                setActiveTab('manage-feedback');
            }
        };

        window.addEventListener('admin-action', handleAdminAction);
        return () => window.removeEventListener('admin-action', handleAdminAction);
    }, []);

    // Redirect if not authenticated
    useEffect(() => {
        if (!isAuthLoading && !isAuthenticated) {
            navigate(createPageUrl('Auth'));
        }
    }, [isAuthLoading, isAuthenticated, navigate]);

    // Check scroll position for arrows
    useEffect(() => {
        const checkScroll = () => {
            const container = scrollContainerRef.current;
            if (!container) return;

            setCanScrollLeft(container.scrollLeft > 0);
            setCanScrollRight(
                container.scrollLeft < container.scrollWidth - container.clientWidth - 10
            );
        };

        const container = scrollContainerRef.current;
        if (container) {
            checkScroll();
            container.addEventListener('scroll', checkScroll);
            window.addEventListener('resize', checkScroll);
            
            return () => {
                container.removeEventListener('scroll', checkScroll);
                window.removeEventListener('resize', checkScroll);
            };
        }
    }, [activeTab, isAdmin]); // Re-evaluate scroll when tab or admin status (which can affect tabs) changes

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateUser(user.id, formData);
            // After successful update, refresh the user object in the AuthProvider
            const updatedUser = { ...user, ...formData };
            setUser(updatedUser);
            toast.success('הפרטים עודכנו בהצלחה');
        } catch (error) {
            console.error('Failed to update profile:', error);
            toast.error('שגיאה בעדכון הפרטים');
        } finally {
            setIsSaving(false);
        }
    };

    const handleAvatarUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
    
        setIsUploadingAvatar(true);
        toast.info("מעלה תמונת פרופיל...");
    
        try {
            console.log('[Profile] Uploading avatar:', file.name);
    
            const uploadResult = await uploadFileToInstaback(file, user.id, 'avatars');
    
            if (!uploadResult.file_url) {
                throw new Error('No file URL returned from upload');
            }
    
            await updateUser(user.id, { avatar_url: uploadResult.file_url });
    
            // Update local user state from AuthProvider
            setUser(prev => ({ ...prev, avatar_url: uploadResult.file_url }));
            
            // Optionally, update localStorage directly if AuthProvider doesn't immediately reflect changes
            if (typeof window !== 'undefined') {
                const stored = JSON.parse(localStorage.getItem('instaback_user') || '{}');
                stored.avatar_url = uploadResult.file_url;
                localStorage.setItem('instaback_user', JSON.stringify(stored));
            }
    
            toast.success("תמונת הפרופיל עודכנה! 📸");
        } catch (error) {
            console.error('[Profile] Avatar upload failed:', error);
            toast.error(`שגיאה בהעלאת התמונה: ${error.message}`);
        } finally {
            setIsUploadingAvatar(false);
            if (e.target) e.target.value = ''; // Clear the file input
        }
    };

    const handleSubmitFeedback = async (feedbackData) => {
        try {
            const { submitFeedback } = await import('@/components/instabackService');
            const result = await submitFeedback(feedbackData);
            return result;
        } catch (error) {
            console.error('Failed to submit feedback:', error);
            throw error;
        }
    };

    const handleDeleteAccount = async () => {
        if (!confirm('האם אתה בטוח שברצונך למחוק את החשבון? פעולה זו בלתי הפיכה!')) {
            return;
        }

        const userName = user?.name || user?.full_name || user?.email || 'משתמש';
        const userEmail = user?.email || '';

        try {
            await deleteMyAccount();
            
            // Notify admins about account deletion
            try {
                const allUsers = await listUsers();
                const admins = (Array.isArray(allUsers) ? allUsers : (allUsers?.items || [])).filter(u => {
                    const role = u.role || u.Role;
                    return role === 'admin';
                });

                for (const admin of admins) {
                    try {
                        await createNotificationAndSendPush({
                            userId: admin.id,
                            type: 'system_announcement',
                            title: 'משתמש מחק את חשבונו 😢',
                            message: `${userName} (${userEmail}) מחק את החשבון שלו מהמערכת`,
                            priority: 'normal'
                        });
                    } catch (notifErr) {
                        console.warn('Failed to notify admin about account deletion:', notifErr);
                    }
                }
            } catch (notifyError) {
                console.warn('Failed to notify admins about account deletion:', notifyError);
            }

            toast.success('החשבון נמחק בהצלחה');
            logout(); // Log out the user after account deletion
        } catch (error) {
            console.error('Failed to delete account:', error);
            toast.error(error.message || 'שגיאה במחיקת החשבון');
        }
    };

    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        window.history.replaceState(null, '', `#${tabId}`);
    };

    const scroll = (direction) => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const scrollAmount = 200;
        const newScrollLeft = direction === 'left'
            ? container.scrollLeft - scrollAmount
            : container.scrollLeft + scrollAmount;

        container.scrollTo({
            left: newScrollLeft,
            behavior: 'smooth'
        });
    };

    const handleUserUpdate = (updatedUser) => {
        setUser(updatedUser);
    };

    if (isAuthLoading || isLoadingServerUser) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-2" />
                    <p className="text-gray-600 text-sm">טוען נתונים...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated || !user) {
        return null; // Should ideally be redirected by useEffect, but good for safety
    }

    const tabs = [
        { id: 'details', label: 'פרטים אישיים', icon: User },
        { id: 'notifications', label: 'התראות', icon: Bell },
        { id: 'settings', label: 'הגדרות', icon: Settings },
        { id: 'journey', label: 'מסלול שימוש', icon: TrendingUp },
        { id: 'feedback', label: 'משוב', icon: MessageSquare },
        ...(isAdmin ? [
            { id: 'admin-settings', label: 'הגדרות מנהל', icon: Shield },
            { id: 'manage-feedback', label: 'ניהול משוב', icon: BarChart }
        ] : []),
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50 p-4 md:p-6" style={{ direction: 'rtl' }}>
            <div className="w-full px-4 py-6">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold text-gray-900">הפרופיל שלי</h1>
                        {isMobile && (
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                                <Smartphone className="w-4 h-4" />
                                מובייל
                            </div>
                        )}
                        {isAdmin && (
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
                                <Shield className="w-4 h-4" />
                                מנהל
                            </div>
                        )}
                    </div>
                    <p className="text-gray-600 mt-1">נהל את החשבון וההגדרות שלך</p>
                </div>

                {/* Category Tabs - Desktop: Horizontal scroll, Mobile: Grid */}
                {isMobile ? (
                    // Mobile: Grid layout with all tabs visible - Compact
                    <div className="grid grid-cols-3 gap-2 mb-6">
                        {tabs.map((category) => {
                            const Icon = category.icon;
                            const isActive = activeTab === category.id;
                            return (
                                <button
                                    key={category.id}
                                    onClick={() => handleTabChange(category.id)}
                                    className={`flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-lg font-medium transition-all ${
                                        isActive
                                            ? 'bg-orange-500 text-white shadow-md'
                                            : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-100'
                                    }`}
                                >
                                    <Icon className="w-5 h-5" />
                                    <span className="text-xs text-center leading-tight">{category.label}</span>
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    // Desktop: Horizontal scrollable tabs
                    <div className="relative mb-6">
                        {/* Left Arrow */}
                        {canScrollRight && (
                            <button
                                onClick={() => scroll('right')}
                                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white shadow-lg rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
                                aria-label="גלול שמאלה"
                            >
                                <ChevronLeft className="w-5 h-5 text-gray-600" />
                            </button>
                        )}

                        {/* Right Arrow */}
                        {canScrollLeft && (
                            <button
                                onClick={() => scroll('left')}
                                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white shadow-lg rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
                                aria-label="גלול ימינה"
                            >
                                <ChevronRight className="w-5 h-5 text-gray-600" />
                            </button>
                        )}

                        {/* Scrollable Tabs Container */}
                        <div
                            ref={scrollContainerRef}
                            className="flex gap-2 overflow-x-auto pb-2 px-10 hide-scrollbar"
                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        >
                            {tabs.map((category) => {
                                const Icon = category.icon;
                                const isActive = activeTab === category.id;
                                return (
                                    <button
                                        key={category.id}
                                        onClick={() => handleTabChange(category.id)}
                                        className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                                            isActive
                                                ? 'bg-orange-500 text-white shadow-lg'
                                                : 'bg-white text-gray-700 hover:bg-gray-100'
                                        }`}
                                    >
                                        <Icon className="w-5 h-5" />
                                        {category.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Content */}
                <div className="w-full space-y-6">
                    {activeTab === 'details' && (
                        <ProfileDetails
                            user={user}
                            formData={formData}
                            setFormData={setFormData}
                            onSave={handleSave}
                            isSaving={isSaving}
                            onAvatarUpload={handleAvatarUpload}
                            isUploadingAvatar={isUploadingAvatar}
                        />
                    )}

                    {activeTab === 'notifications' && (
                        <NotificationSettings
                            user={user}
                            onUserUpdate={handleUserUpdate}
                        />
                    )}

                    {activeTab === 'settings' && (
                        <AppSettings
                            user={user}
                            onDeleteAccount={handleDeleteAccount}
                        />
                    )}

                    {activeTab === 'journey' && (
                        <UsageJourney user={user} />
                    )}

                    {activeTab === 'feedback' && (
                        <FeedbackForm
                            user={user}
                            onSubmitFeedback={handleSubmitFeedback}
                        />
                    )}

                    {activeTab === 'admin-settings' && isAdmin && (
                        <>
                            {adminSubView === 'rsvp-categories' ? (
                                <RSVPCategoriesSettings onBack={() => setAdminSubView(null)} />
                            ) : adminSubView === 'quick-broadcast' ? (
                                <QuickBroadcast onBack={() => setAdminSubView(null)} currentUser={user} />
                            ) : (
                                <AdminSettings />
                            )}
                        </>
                    )}

                    {activeTab === 'manage-feedback' && isAdmin && (
                        <ManageFeedback user={user} />
                    )}
                </div>


            </div>
            
            <style>{`
                .hide-scrollbar::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
        </div>
    );
}
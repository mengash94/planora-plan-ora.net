import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Calendar, Home, CheckSquare, User as UserIcon, MessageSquare, RefreshCw } from 'lucide-react';
import AnnouncementBanner from '@/components/AnnouncementBanner';
import PwaUpdateBanner from "@/components/PwaUpdateBanner";
import NetworkStatusBanner from '@/components/NetworkStatusBanner';
import { AuthProvider, useAuth } from '@/components/AuthProvider';
import { getAnnouncements, getUnreadNotificationsCount, getUnreadMessagesCount, updateSystemMessage, incrementSystemMessageViewCount } from '@/components/instabackService';
import NotificationDropdown from '@/components/NotificationDropdown';
import SideHelpTab from '@/components/SideHelpTab';
import { isNativeCapacitor } from '@/components/onesignalService';
import { useDeepLinkHandler } from '@/components/DeepLinkHandler';
import SEOHead, { generateWebsiteStructuredData, generateOrganizationStructuredData } from '@/components/SEOHead';
import HelpChatbot from '@/components/HelpChatbot';
import AppVersionChecker from '@/components/AppVersionChecker';
import { getCachedData, setCachedData, CACHE_KEYS } from '@/components/utils/dataCache';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import AppDownloadPage from '@/pages/App';
export default function LayoutWrapper({ children, currentPageName }) {
  return (
    <AuthProvider>
      <LayoutContent currentPageName={currentPageName}>
        {children}
      </LayoutContent>
    </AuthProvider>
  );
}

function LayoutContent({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const isCheckingChatsRef = useRef(false);
  const isCheckingNotificationsRef = useRef(false);
  const pollIntervalRef = useRef(null);
  const lastCheckTimeRef = useRef(Date.now());
  const [newVersions, setNewVersions] = useState([]);
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [updateVersion, setUpdateVersion] = useState(null);
  
  useDeepLinkHandler();

  // Pages allowed on mobile web (without redirecting to app store)
  const mobileAllowedPages = useMemo(() => ['EventRSVP', 'ShortLink', 'CreateEventAI','App'], []);
  
  // Check if device is mobile
  const isMobileDevice = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  }, []);

  // Allow forcing web mode (use ?web=1 or ?noapp=1 or localStorage 'disable_mobile_redirect' = 'true')
  const disableMobileRedirect = useMemo(() => {
    if (typeof window === 'undefined') return false;
    try {
      const params = new URLSearchParams(window.location.search);
      const q = params.get('web') || params.get('noapp');
      if (q === '1') return true;
      return localStorage.getItem('disable_mobile_redirect') === 'true';
    } catch { return false; }
  }, []);

  // Check if should redirect mobile users to app store
  const shouldRedirectToAppStore = useMemo(() => {
    // Never redirect if in native app
    if (isNativeCapacitor()) return false;

    // Respect override to keep web while testing
    if (disableMobileRedirect) return false;

    // Only redirect on mobile devices
    if (!isMobileDevice) return false;

    // Allow specific pages on mobile web
    if (mobileAllowedPages.includes(currentPageName)) return false;

    return true;
  }, [currentPageName, mobileAllowedPages, isMobileDevice, disableMobileRedirect]);

  const isNativeRef = useRef(null);
  if (isNativeRef.current === null) {
    isNativeRef.current = isNativeCapacitor();
  }
  const isNative = isNativeRef.current;

  // Ensure light mode only
  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  // Google Analytics
  useEffect(() => {
    // Add gtag.js script
    const gtagScript = document.createElement('script');
    gtagScript.async = true;
    gtagScript.src = 'https://www.googletagmanager.com/gtag/js?id=G-9B9CTF7BEB';
    document.head.appendChild(gtagScript);

    // Add gtag initialization script
    const gtagInitScript = document.createElement('script');
    gtagInitScript.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-9B9CTF7BEB');
    `;
    document.head.appendChild(gtagInitScript);

    return () => {
      // Cleanup on unmount
      if (gtagScript.parentNode) gtagScript.parentNode.removeChild(gtagScript);
      if (gtagInitScript.parentNode) gtagInitScript.parentNode.removeChild(gtagInitScript);
    };
  }, []);

  // Check for available update
  useEffect(() => {
    if (!isAuthenticated || !user || typeof window === 'undefined') return;
    
    const checkForUpdate = () => {
      try {
        const updateAvailable = localStorage.getItem('planora_update_available');
        if (updateAvailable && !showUpdateDialog) {
          console.log('[Layout] 🔔 Update available detected:', updateAvailable);
          setUpdateVersion(updateAvailable);
          setShowUpdateDialog(true);
        }
      } catch (error) {
        console.warn('[Layout] Error checking for updates:', error);
      }
    };
    
    // Check immediately
    checkForUpdate();
    
    // Also check periodically (every 10 seconds) in case AppVersionChecker updated localStorage
    const interval = setInterval(checkForUpdate, 10000);
    
    // Listen for custom event from AppVersionChecker
    const handleUpdateAvailable = (e) => {
      console.log('[Layout] 🔔 Received update event:', e.detail);
      if (e.detail?.version) {
        setUpdateVersion(e.detail.version);
        setShowUpdateDialog(true);
      }
    };
    window.addEventListener('planora:update-available', handleUpdateAvailable);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('planora:update-available', handleUpdateAvailable);
    };
  }, [isAuthenticated, user, showUpdateDialog]);

  const handleUpdateNow = () => {
    try {
      const newVer = localStorage.getItem('planora_update_available');
      if (newVer) {
        localStorage.setItem('planora_app_version', newVer);
        localStorage.removeItem('planora_update_available');
      }
      window.location.reload();
    } catch (error) {
      console.error('[Layout] Error updating:', error);
      window.location.reload();
    }
  };

  // PWA Manifest and Meta Data Setup
  useEffect(() => {
    let viewportMeta = document.querySelector('meta[name="viewport"]');
    if (!viewportMeta) {
      viewportMeta = document.createElement('meta');
      viewportMeta.name = 'viewport';
      document.head.appendChild(viewportMeta);
    }
    viewportMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';

    const manifest = {
      name: "Planora",
      short_name: "Planora",
      description: "תכנון אירועים חכם וקל",
      start_url: "/",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#f97316",
      orientation: "portrait",
      icons: [
        {
          src: "/project/f78de3ce-0cab-4ccb-8442-0c574979fe8/assets/PlanoraLogo_192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "any maskable"
        },
        {
          src: "/project/f78de3ce-0cab-4ccb-8442-0c574979fe8/assets/PlanoraLogo_512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any maskable"
        }
      ]
    };

    const manifestBlob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
    const manifestUrl = URL.createObjectURL(manifestBlob);

    const existingLink = document.querySelector('link[rel="manifest"]');
    if (existingLink) {
      existingLink.remove();
    }

    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = manifestUrl;
    document.head.appendChild(link);
    
    const setMetaTag = (name, content) => {
        let meta = document.querySelector(`meta[name="${name}"]`);
        if (!meta) {
          meta = document.createElement("meta");
          meta.name = name;
          document.head.appendChild(meta);
        }
        meta.content = content;
    };
    
    setMetaTag("theme-color", "#f97316");
    setMetaTag("apple-mobile-web-app-capable", "yes");
    setMetaTag("apple-mobile-web-app-status-bar-style", "black-translucent");
    setMetaTag("apple-mobile-web-app-title", "Planora");

    let appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
    if (!appleIcon) {
        appleIcon = document.createElement("link");
        appleIcon.rel = "apple-touch-icon";
        appleIcon.href = "/project/f78de3ce-0cab-4ccb-8442-0c574979fe8/assets/PlanoraLogo_180.png";
        document.head.appendChild(appleIcon);
    }

    document.title = "Planora - תכנון אירועים חכם";

    return () => {
        URL.revokeObjectURL(manifestUrl);
    };
  }, [isNative]);

  // PWA install prompt disabled - we want users to download native app instead

  const viewedAnnouncementsRef = useRef(new Set());
  
  const fetchAnnouncements = useCallback(async (forceRefresh = false) => {
    if (!isAuthenticated || !user) {
        setAnnouncements([]);
        return;
    }
    
    const userId = user?.id;
    
    // Show cached data immediately
    if (!forceRefresh) {
      const cached = getCachedData(CACHE_KEYS.ANNOUNCEMENTS);
      if (cached?.data) {
        const filteredCached = cached.data.filter(ann => {
          const dismissedBy = ann.dismissedBy || [];
          return !dismissedBy.includes(userId);
        });
        setAnnouncements(filteredCached);
        
        // If cache is fresh, don't fetch
        if (!cached.isStale) {
          return;
        }
      }
    }
    
    // Fetch fresh data in background
    try {
        const data = await getAnnouncements();
        
        // Cache the raw data
        setCachedData(CACHE_KEYS.ANNOUNCEMENTS, data);
        
        // Filter out messages already dismissed by this user
        const filteredAnnouncements = data.filter(ann => {
            const dismissedBy = ann.dismissedBy || [];
            return !dismissedBy.includes(userId);
        });
        setAnnouncements(filteredAnnouncements);
        
        // Increment view count for each announcement shown (only once per session)
        for (const ann of filteredAnnouncements) {
            if (!viewedAnnouncementsRef.current.has(ann.id)) {
                viewedAnnouncementsRef.current.add(ann.id);
                incrementSystemMessageViewCount(ann.id);
            }
        }
    } catch (error) {
        console.error("Failed to fetch announcements:", error);
        // Keep cached data on error
    }
  }, [isAuthenticated, user]);

  const checkUnreadMessages = useCallback(async (forceRefresh = false) => {
    if (!isAuthenticated || !user?.id || isCheckingChatsRef.current) {
      return;
    }
    
    // Show cached data immediately
    if (!forceRefresh) {
      const cached = getCachedData(CACHE_KEYS.UNREAD_MESSAGES);
      if (cached?.data !== undefined) {
        setUnreadChatCount(cached.data);
        
        // If cache is fresh, don't fetch
        if (!cached.isStale) {
          return;
        }
      }
    }
    
    isCheckingChatsRef.current = true;
    
    try {
      const result = await getUnreadMessagesCount(user.id);
      
      if (result && typeof result.totalUnread === 'number') {
        setCachedData(CACHE_KEYS.UNREAD_MESSAGES, result.totalUnread);
        setUnreadChatCount(result.totalUnread);
      }
    } catch (error) {
      if (!error?.message?.includes('Failed to fetch') && !error?.message?.includes('Network')) {
        console.error('💬 Error getting unread messages:', error);
      }
      // Keep cached data on error
    } finally {
      isCheckingChatsRef.current = false;
    }
  }, [isAuthenticated, user]);

  const checkUnreadNotifications = useCallback(async (forceRefresh = false) => {
    if (!isAuthenticated || isCheckingNotificationsRef.current) {
      return;
    }
    
    // Show cached data immediately
    if (!forceRefresh) {
      const cached = getCachedData(CACHE_KEYS.UNREAD_NOTIFICATIONS);
      if (cached?.data !== undefined) {
        setUnreadNotificationsCount(cached.data);
        
        // If cache is fresh, don't fetch
        if (!cached.isStale) {
          return;
        }
      }
    }
    
    isCheckingNotificationsRef.current = true;
    
    try {
      const result = await getUnreadNotificationsCount();
      
      if (result && typeof result.count === 'number') {
        setCachedData(CACHE_KEYS.UNREAD_NOTIFICATIONS, result.count);
        setUnreadNotificationsCount(result.count);
      }
    } catch (error) {
      if (error?.message?.includes('Failed to fetch') || error?.message?.includes('Network')) {
        return;
      }
      console.warn('🔔 Failed to check notifications (non-network error):', error?.message);
      // Keep cached data on error
    } finally {
      isCheckingNotificationsRef.current = false;
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setUnreadChatCount(0);
      setUnreadNotificationsCount(0);
      setAnnouncements([]);
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }

    fetchAnnouncements();
    checkUnreadMessages();
    checkUnreadNotifications();

    const smartCheck = () => {
      const now = Date.now();
      const timeSinceLastCheck = now - lastCheckTimeRef.current;
      
      // Check every 60 seconds instead of 30, and only if tab is visible
      if (timeSinceLastCheck >= 60000 && !document.hidden) {
        lastCheckTimeRef.current = now;
        fetchAnnouncements(true); // force refresh
        checkUnreadMessages(true);
        checkUnreadNotifications(true);
      }
    };

    // Check every 30 seconds, but actual fetch only happens if 60+ seconds passed
    pollIntervalRef.current = setInterval(smartCheck, 30000);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        const now = Date.now();
        const timeSinceLastCheck = now - lastCheckTimeRef.current;
        
        // When returning to tab, show cached data immediately
        // Only force refresh if more than 30 seconds passed
        if (timeSinceLastCheck >= 30000) {
          lastCheckTimeRef.current = now;
          fetchAnnouncements(true);
          checkUnreadMessages(true);
          checkUnreadNotifications(true);
        } else {
          // Just show cached data without fetching
          fetchAnnouncements(false);
          checkUnreadMessages(false);
          checkUnreadNotifications(false);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, user?.id, fetchAnnouncements, checkUnreadMessages, checkUnreadNotifications]);

  useEffect(() => {
    const onChatRead = () => {
      // Force refresh when user reads a chat
      checkUnreadMessages(true);
    };
    const onNotificationRead = () => {
      // Force refresh when user reads a notification
      checkUnreadNotifications(true);
    };
    window.addEventListener('chat:read', onChatRead);
    window.addEventListener('notification:read', onNotificationRead);
    return () => {
      window.removeEventListener('chat:read', onChatRead);
      window.removeEventListener('notification:read', onNotificationRead);
    };
  }, [checkUnreadMessages, checkUnreadNotifications]);

  const handleDismiss = useCallback(async (announcementId) => {
    // Remove from UI immediately
    setAnnouncements(prev => prev.filter(ann => ann.id !== announcementId));
    
    // Update on server - add user to dismissedBy array
    if (user?.id) {
      try {
        const announcement = announcements.find(a => a.id === announcementId);
        const currentDismissedBy = announcement?.dismissedBy || [];
        if (!currentDismissedBy.includes(user.id)) {
          await updateSystemMessage(announcementId, {
            dismissedBy: [...currentDismissedBy, user.id]
          });
        }
      } catch (error) {
        console.error('Failed to update dismissedBy on server:', error);
      }
    }
  }, [user, announcements]);

  const isActivePage = useCallback((pageName) => {
    const { pathname } = location;
    if (pageName === 'Home') {
      return pathname === '/' || pathname === createPageUrl('Home');
    }
    if (pageName === 'ChatOverview') {
      return pathname.includes('ChatOverview') || pathname.includes('EventChat');
    }
    if (pageName === 'NotificationCenter') {
      return pathname.includes('NotificationCenter');
    }
    return pathname.includes(pageName);
  }, [location]);

  const hideBottomNavPages = useMemo(() => ['Auth', 'WelcomePage', 'CreateEvent', 'CreateEventAI', 'EventChat', 'App'], []);
  const showBottomNav = isAuthenticated && !hideBottomNavPages.includes(currentPageName);

  // If mobile user should be redirected to app store, show the app download page
  if (shouldRedirectToAppStore) {
    return <AppDownloadPage />;
  }
  
  return (
    <div className="min-h-screen w-full bg-white text-gray-900" style={{ direction: 'rtl', margin: 0, padding: 0 }}>
      {/* SEO Head - Global structured data */}
      <SEOHead 
        structuredData={{
          "@context": "https://schema.org",
          "@graph": [
            generateWebsiteStructuredData(),
            generateOrganizationStructuredData()
          ]
        }}
      />

      {/* Update Available Dialog */}
      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <RefreshCw className="w-6 h-6 text-orange-500" />
              עדכון גרסה זמין!
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-700 mb-4">
              גרסה חדשה של Planora זמינה ({updateVersion}). 
            </p>
            <p className="text-gray-600 text-sm">
              האפליקציה תתרענן כדי להביא לך את התכונות החדשות ביותר והשיפורים.
            </p>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                localStorage.removeItem('planora_update_available');
                setShowUpdateDialog(false);
              }}
            >
              אולי מאוחר יותר
            </Button>
            <Button
              onClick={handleUpdateNow}
              className="bg-orange-500 hover:bg-orange-600"
            >
              <RefreshCw className="w-4 h-4 ml-2" />
              עדכן עכשיו
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Background layer */}
      <div className="fixed inset-0 -z-10 bg-white" />



      {/* Native status bar background */}
      <div 
        className="fixed top-0 left-0 right-0 z-[9999]" 
        style={{ 
          height: 'env(safe-area-inset-top, 0px)',
          backgroundColor: '#f97316'
        }} 
      />

      <PwaUpdateBanner />
      <NetworkStatusBanner />
      
      <AnnouncementBanner announcements={announcements} onDismiss={handleDismiss} />
      
      {/* Side Help Tab - Accessibility + Help combined */}
      <SideHelpTab />

      {/* Help Chatbot - AI Assistant */}
      {isAuthenticated && <HelpChatbot />}

      {/* App Version Checker - Auto-reload on new version */}
      <AppVersionChecker />

      {/* PWA install banner removed - redirecting mobile users to app store instead */}

      <main 
        className={`w-full ${showBottomNav ? "pb-20" : ""}`}
        style={{ paddingTop: 'env(safe-area-inset-top, 20px)' }}
      >
        {children}
      </main>

      {showBottomNav && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50" style={isNative ? { paddingBottom: 'env(safe-area-inset-bottom)' } : {}}>
          <div className="flex justify-around items-center h-16" title="Tip: כדי לכפות מצב ווב הוסיפו ?web=1 לכתובת או הגדירו localStorage.disable_mobile_redirect=true">
            <NavLink 
              to={createPageUrl('Home')} 
              isActive={isActivePage('Home')}
              icon={Home}
              label="בית"
              color="text-orange-500"
            />

            <NavLink 
              to={createPageUrl('MyEventsList')} 
              isActive={isActivePage('MyEventsList')}
              icon={Calendar}
              label="אירועים"
              color="text-blue-500"
            />

            <NavLink 
              to={createPageUrl('Tasks')} 
              isActive={isActivePage('Tasks')}
              icon={CheckSquare}
              label="משימות"
              color="text-green-500"
            />

            <NavLink 
              to={createPageUrl('ChatOverview')} 
              isActive={isActivePage('ChatOverview')}
              icon={MessageSquare}
              label="צ'אטים"
              badge={unreadChatCount}
              color="text-purple-500"
            />

            <NotificationDropdown 
              unreadCount={unreadNotificationsCount} 
              onCountChange={checkUnreadNotifications}
            />

            <NavLink 
              to={createPageUrl('Profile')} 
              isActive={isActivePage('Profile')}
              icon={UserIcon}
              label="פרופיל"
              color="text-teal-500"
            />
          </div>
        </nav>
      )}
    </div>
  );
}

const NavLink = React.memo(({ to, isActive, icon: Icon, label, badge, color }) => (
  <Link
    to={to}
    className={`flex flex-col items-center justify-center flex-1 h-full relative transition-colors ${
      isActive ? color : 'text-gray-600'
    }`}
  >
    <Icon className="w-6 h-6" />
    <span className="text-xs mt-1">{label}</span>
    {badge > 0 && (
      <span className="absolute top-0 right-1/4 translate-x-1/2 -translate-y-1/2 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
        {badge}
      </span>
    )}
  </Link>
));

NavLink.displayName = 'NavLink';
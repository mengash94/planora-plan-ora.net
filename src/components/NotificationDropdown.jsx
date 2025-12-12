import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { createPageUrl } from '@/utils';
import {
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '@/components/instabackService';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, CheckCheck, Calendar, CheckSquare, MessageSquare, Users, DollarSign, BarChart3 } from 'lucide-react';
import { formatIsraelDate } from '@/components/utils/dateHelpers';
import { toast } from 'sonner';

// ✅ פונקציות עזר ממוטבות - מחוץ לקומפוננטה
const getNotificationIcon = (type) => {
  const iconProps = { className: "w-4 h-4" };
  
  switch (type) {
    case 'event_invitation':
    case 'event_reminder':
      return <Calendar {...iconProps} />;
    case 'task_assigned':
    case 'task_completed':
    case 'task_unassigned':
      return <CheckSquare {...iconProps} />;
    case 'new_message':
      return <MessageSquare {...iconProps} />;
    case 'member_joined':
      return <Users {...iconProps} />;
    case 'payment_received':
      return <DollarSign {...iconProps} />;
    case 'poll_created':
    case 'poll_closed':
      return <BarChart3 {...iconProps} />;
    default:
      return <Bell {...iconProps} />;
  }
};

const getNotificationColor = (type) => {
  switch (type) {
    case 'event_invitation':
    case 'event_reminder':
      return 'bg-blue-50 text-blue-600';
    case 'task_assigned':
    case 'task_completed':
      return 'bg-green-50 text-green-600';
    case 'task_unassigned':
      return 'bg-orange-50 text-orange-600';
    case 'new_message':
      return 'bg-purple-50 text-purple-600';
    case 'member_joined':
      return 'bg-indigo-50 text-indigo-600';
    case 'payment_received':
      return 'bg-emerald-50 text-emerald-600';
    case 'poll_created':
    case 'poll_closed':
      return 'bg-pink-50 text-pink-600';
    default:
      return 'bg-gray-50 text-gray-600';
  }
};

// ✅ קומפוננטת התראה בודדת - ממוטבת עם React.memo
const NotificationItem = React.memo(({ notification, onClick }) => {
  const isUnread = !notification.isRead && !notification.is_read;
  const createdAt = notification.createdAt || notification.created_at || notification.CreatedAt;
  
  return (
    <button
      onClick={() => onClick(notification)}
      className={`w-full text-right p-3 hover:bg-gray-50 transition-colors ${
        isUnread ? 'bg-orange-50/50' : 'bg-white'
      }`}
    >
      <div className="flex items-start gap-2">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${getNotificationColor(notification.type)}`}>
          {getNotificationIcon(notification.type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1 mb-1">
            <h4 className={`text-xs font-semibold ${isUnread ? 'text-gray-900' : 'text-gray-700'}`}>
              {notification.title}
            </h4>
            {isUnread && (
              <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0 mt-1"></span>
            )}
          </div>
          <p className="text-xs text-gray-600 line-clamp-2 mb-1">
            {notification.message}
          </p>
          <span className="text-[10px] text-gray-400">
            {formatIsraelDate(createdAt)}
          </span>
        </div>
      </div>
    </button>
  );
});

NotificationItem.displayName = 'NotificationItem';

export default function NotificationDropdown({ unreadCount = 0, onCountChange }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getMyNotifications({ limit: 20 });
      setNotifications(data || []);
    } catch (error) {
      if (!error?.message?.includes('Failed to fetch')) {
        console.error('Failed to load notifications:', error);
      }
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen, loadNotifications]);

  const handleNotificationClick = useCallback(async (notification) => {
    try {
      // Mark as read first
      if (!notification.isRead && !notification.is_read) {
        try {
          await markNotificationAsRead(notification.id);
          
          setNotifications(prev =>
            prev.map(n =>
              n.id === notification.id
                ? { ...n, isRead: true, is_read: true }
                : n
            )
          );

          window.dispatchEvent(new Event('notification:read'));
          if (onCountChange) onCountChange();
        } catch (error) {
          if (!error?.message?.includes('Failed to fetch')) {
            console.error('Failed to mark notification as read:', error);
            toast.error('שגיאה בסימון ההתראה כנקראה');
          }
        }
      }

      // Get action URL
      let actionUrl = notification.actionUrl || notification.action_url;
      
      if (!actionUrl) {
        setIsOpen(false);
        return;
      }

      // Clean up the URL to get only the path
      let cleanPath = actionUrl;

      // If it's a full URL, extract the path
      if (actionUrl.includes('://')) {
        try {
          const urlObj = new URL(actionUrl);
          cleanPath = urlObj.pathname + urlObj.search + urlObj.hash;
        } catch (e) {
          console.warn('Could not parse URL:', actionUrl);
        }
      }

      // Remove /project/... prefix if exists (Base44 specific)
      cleanPath = cleanPath.replace(/^\/project\/[^\/]+\//, '/');

      // Ensure it starts with /
      if (!cleanPath.startsWith('/')) {
        cleanPath = '/' + cleanPath;
      }

      // Close popup
      setIsOpen(false);

      // Navigate using React Router
      if (cleanPath.startsWith('/EventDetail') || cleanPath.startsWith('/EventChat')) {
        navigate(cleanPath);
      } else {
        try {
          const [pagePath, queryString] = cleanPath.split('?');
          const pageName = pagePath.replace(/^\//, '');
          
          if (queryString) {
            navigate(createPageUrl(pageName) + '?' + queryString);
          } else {
            navigate(createPageUrl(pageName));
          }
        } catch (e) {
          navigate(cleanPath);
        }
      }

    } catch (error) {
      console.error('Failed to handle notification navigation:', error);
      toast.error('שגיאה בפתיחת ההתראה');
    }
  }, [navigate, onCountChange]);

  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await markAllNotificationsAsRead();
      
      setNotifications(prev =>
        prev.map(n => ({ ...n, isRead: true, is_read: true }))
      );

      window.dispatchEvent(new Event('notification:read'));
      if (onCountChange) onCountChange();
      
      toast.success('כל ההתראות סומנו כנקראו');
    } catch (error) {
      if (!error?.message?.includes('Failed to fetch')) {
        console.error('Failed to mark all as read:', error);
        toast.error('שגיאה בסימון ההתראות');
      }
    }
  }, [onCountChange]);

  // ✅ חישוב התראות שלא נקראו - ממוטב עם useMemo
  const unreadNotifications = useMemo(() => 
    notifications.filter(n => !n.isRead && !n.is_read),
    [notifications]
  );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button className="flex flex-col items-center justify-center flex-1 h-full relative text-gray-600 hover:text-orange-500 transition-colors">
          <Bell className="w-6 h-6" />
          <span className="text-xs mt-1">התראות</span>
          {unreadCount > 0 && (
            <span className="absolute top-1 left-1/2 transform -translate-x-1/2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-0" 
        align="center" 
        side="top" 
        sideOffset={10}
        style={{ direction: 'rtl' }}
      >
        {/* Header with Mark All button */}
        <div className="flex items-center justify-between p-3 border-b bg-gradient-to-r from-orange-50 to-rose-50">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-orange-500" />
            <h3 className="font-semibold text-sm">התראות</h3>
            {unreadNotifications.length > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                {unreadNotifications.length}
              </span>
            )}
          </div>
          {unreadNotifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="h-7 px-2 text-xs hover:bg-orange-100"
            >
              <CheckCheck className="w-3 h-3 ml-1" />
              סמן הכל
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-xs text-gray-500">טוען התראות...</p>
              </div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <Bell className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-700">אין התראות</p>
              <p className="text-xs text-gray-500 mt-1">התראות חדשות יופיעו כאן</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onClick={handleNotificationClick}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer with "Mark all as read" button for easier access */}
        {notifications.length > 0 && unreadNotifications.length > 0 && (
          <div className="border-t p-2 bg-gray-50">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="w-full text-xs hover:bg-orange-100"
            >
              <CheckCheck className="w-3 h-3 ml-1" />
              סמן את כל ההתראות כנקראו
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
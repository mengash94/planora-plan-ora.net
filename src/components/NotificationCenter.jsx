import React, { useState, useEffect, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { 
  getMyNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead 
} from '@/components/instabackService';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { formatIsraelDateTime } from '@/components/utils/dateHelpers';

// Helper function to translate notification messages to Hebrew
const translateNotification = (notification) => {
  let translatedMessage = notification.message;

  // Event announcement
  if (notification.type === 'event_announcement') {
    return translatedMessage; // Already in Hebrew
  }

  // Task assigned
  if (notification.type === 'task_assigned') {
    const taskMatch = notification.message.match(/Task "([^"]+)" assigned to you in event "([^"]+)"/);
    if (taskMatch) {
      const [, taskName, eventName] = taskMatch;
      translatedMessage = `המשימה "${taskName}" שויכה אליך באירוע "${eventName}"`;
    }
  }

  // Task completed
  if (notification.type === 'task_completed') {
    const taskMatch = notification.message.match(/Task "([^"]+)" was completed in event "([^"]+)"/);
    if (taskMatch) {
      const [, taskName, eventName] = taskMatch;
      translatedMessage = `המשימה "${taskName}" הושלמה באירוע "${eventName}"`;
    }
  }

  // New message
  if (notification.type === 'new_message') {
    const msgMatch = notification.message.match(/New message in event "([^"]+)"/);
    if (msgMatch) {
      const [, eventName] = msgMatch;
      translatedMessage = `הודעה חדשה באירוע "${eventName}"`;
    }
  }

  // Poll created
  if (notification.type === 'poll_created') {
    const pollMatch = notification.message.match(/New poll "([^"]+)" created in event "([^"]+)"/);
    if (pollMatch) {
      const [, pollName, eventName] = pollMatch;
      translatedMessage = `סקר חדש "${pollName}" נוצר באירוע "${eventName}"`;
    }
  }

  // Poll closed
  if (notification.type === 'poll_closed') {
    const pollMatch = notification.message.match(/Poll "([^"]+)" was closed in event "([^"]+)"/);
    if (pollMatch) {
      const [, pollName, eventName] = pollMatch;
      translatedMessage = `הסקר "${pollName}" נסגר באירוע "${eventName}"`;
    }
  }

  // Member joined
  if (notification.type === 'member_joined') {
    const memberMatch = notification.message.match(/(.+) joined event "([^"]+)"/);
    if (memberMatch) {
      const [, memberName, eventName] = memberMatch;
      translatedMessage = `${memberName} הצטרף לאירוע "${eventName}"`;
    }
  }

  // Event invitation
  if (notification.type === 'event_invitation') {
    const inviteMatch = notification.message.match(/You were invited to event "([^"]+)"/);
    if (inviteMatch) {
      const [, eventName] = inviteMatch;
      translatedMessage = `הוזמנת לאירוע "${eventName}"`;
    }
  }

  return translatedMessage;
};

const getNotificationIcon = (type) => {
  const icons = {
    task_assigned: '📋',
    task_completed: '✅',
    new_message: '💬',
    poll_created: '🗳️',
    poll_closed: '🔒',
    member_joined: '👋',
    event_invitation: '🎉',
    event_announcement: '📢'
  };
  return icons[type] || '🔔';
};

export default function NotificationCenter({ user, onCountChange }) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadNotifications = useCallback(async () => {
    if (!user?.id) {
      console.warn('🔔 No user ID available for notifications');
      setNotifications([]);
      if (onCountChange) onCountChange(0);
      return;
    }

    // Check if we have a token
    const token = typeof window !== 'undefined' ? localStorage.getItem('instaback_token') : null;
    if (!token) {
      console.warn('🔔 No InstaBack token available');
      setNotifications([]);
      if (onCountChange) onCountChange(0);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('🔔 Loading notifications for user:', user.id);
      
      // Get all notifications (both read and unread)
      const allNotifications = await getMyNotifications({ 
        limit: 50,
        offset: 0
      });

      console.log('🔔 Loaded notifications:', allNotifications?.length || 0);

      if (Array.isArray(allNotifications)) {
        setNotifications(allNotifications);
        
        // Count unread
        const unreadCount = allNotifications.filter(n => !n.isRead && !n.is_read).length;
        if (onCountChange) onCountChange(unreadCount);
      } else {
        console.warn('🔔 Unexpected notifications format:', allNotifications);
        setNotifications([]);
        if (onCountChange) onCountChange(0);
      }

    } catch (err) {
      console.error('🔔 Failed to load notifications:', err);
      setError(err.message || 'שגיאה בטעינת התראות');
      setNotifications([]);
      if (onCountChange) onCountChange(0);
      
      // Don't show error toast on every load - only log it
      // toast.error('לא הצלחנו לטעון התראות');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, onCountChange]);

  // Load notifications on mount and when user changes
  useEffect(() => {
    if (user?.id) {
      loadNotifications();
    }
  }, [user?.id, loadNotifications]);

  // Refresh notifications every 30 seconds
  useEffect(() => {
    if (!user?.id) return;

    const interval = setInterval(() => {
      loadNotifications();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [user?.id, loadNotifications]);

  // Listen for notification:read events
  useEffect(() => {
    const handleNotificationRead = () => {
      loadNotifications();
    };

    window.addEventListener('notification:read', handleNotificationRead);
    return () => window.removeEventListener('notification:read', handleNotificationRead);
  }, [loadNotifications]);

  const handleNotificationClick = async (notification) => {
  try {
    // Mark as read if not already read
    if (!notification.isRead && !notification.is_read) {
      await markNotificationAsRead(notification.id, user?.id);
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === notification.id ? { ...n, isRead: true, is_read: true } : n)
      );

      // Update count
      const newUnreadCount = notifications.filter(n => 
        n.id !== notification.id && !n.isRead && !n.is_read
      ).length;
      if (onCountChange) onCountChange(newUnreadCount);

      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent('notification:read'));
    }

    // Navigate if there's an action URL
    if (notification.actionUrl) {
      setIsOpen(false);
      
      // ✅ המרת URL מלא לנתיב יחסי
      let targetPath = notification.actionUrl;
      
      // אם זה URL מלא, חלץ רק את החלק היחסי
      if (targetPath.startsWith('http')) {
        try {
          const url = new URL(targetPath);
          // חלץ את הנתיב והפרמטרים (ללא הדומיין)
          targetPath = url.pathname + url.search + url.hash;
        } catch (err) {
          console.warn('Failed to parse actionUrl:', err);
        }
      }
      
      // אם הנתיב לא מתחיל ב-/, הוסף אותו
      if (!targetPath.startsWith('/')) {
        targetPath = '/' + targetPath;
      }
      
      console.log('🔔 Navigating to:', targetPath);
      navigate(targetPath);
    }
  } catch (err) {
    console.error('Failed to handle notification click:', err);
  }
};

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ ...n, isRead: true, is_read: true }))
      );

      if (onCountChange) onCountChange(0);
      
      // Dispatch event
      window.dispatchEvent(new CustomEvent('notification:read'));
      
      toast.success('כל ההתראות סומנו כנקראו');
    } catch (err) {
      console.error('Failed to mark all as read:', err);
      toast.error('שגיאה בסימון ההתראות');
    }
  };

  const unreadNotifications = notifications.filter(n => !n.isRead && !n.is_read);
  const unreadCount = unreadNotifications.length;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 hover:bg-gray-100 rounded-full transition-colors">
          <Bell className="w-6 h-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center">
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
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="font-semibold text-lg">התראות</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="text-xs text-blue-600 hover:text-blue-700"
            >
              סמן הכל כנקרא
            </Button>
          )}
        </div>

        <ScrollArea className="h-96">
          {isLoading && notifications.length === 0 ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-sm text-gray-500">טוען התראות...</p>
              </div>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-sm text-gray-500 mb-2">לא הצלחנו לטעון התראות</p>
              <Button
                variant="outline"
                size="sm"
                onClick={loadNotifications}
                className="text-xs"
              >
                נסה שוב
              </Button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">אין התראות חדשות</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((notification) => {
                const isRead = notification.isRead || notification.is_read;
                const translatedMessage = translateNotification(notification);
                const icon = getNotificationIcon(notification.type);

                return (
                  <Card
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`
                      p-3 cursor-pointer transition-all border-0 rounded-none
                      ${isRead 
                        ? 'bg-white hover:bg-gray-50' 
                        : 'bg-blue-50 hover:bg-blue-100'
                      }
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-2xl flex-shrink-0">
                        {icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${isRead ? 'text-gray-700' : 'text-gray-900'}`}>
                          {notification.title}
                        </p>
                        <p className={`text-xs mt-1 ${isRead ? 'text-gray-500' : 'text-gray-700'}`}>
                          {translatedMessage}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatIsraelDateTime(notification.createdAt || notification.created_at)}
                        </p>
                      </div>
                      {!isRead && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
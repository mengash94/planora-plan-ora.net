
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import {
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '@/components/instabackService';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Bell, BellOff, CheckCheck, Calendar, CheckSquare, MessageSquare, Users, DollarSign, BarChart3 } from 'lucide-react';
import { formatIsraelDate } from '@/components/utils/dateHelpers';
import { toast } from 'sonner';

export default function NotificationCenterPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const data = await getMyNotifications({ limit: 50 });
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      toast.error('שגיאה בטעינת ההתראות');
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadNotifications();
    
    // Auto refresh every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const handleNotificationClick = async (notification) => {
    try {
      // Mark as read
      if (!notification.isRead && !notification.is_read) {
        await markNotificationAsRead(notification.id, user?.id);
        
        // Update local state
        setNotifications(prev =>
          prev.map(n =>
            n.id === notification.id
              ? { ...n, isRead: true, is_read: true }
              : n
          )
        );

        // Dispatch event to update badge count
        window.dispatchEvent(new Event('notification:read'));
      }

      // Navigate if has action URL
      let actionUrl = notification.actionUrl || notification.action_url;
      
      if (actionUrl) {
        // Clean up the URL - remove domain if it's our app
        if (actionUrl.includes('://')) {
          try {
            const url = new URL(actionUrl);
            // If it's our domain, use only the pathname and search
            if (url.hostname === window.location.hostname || 
                url.hostname.includes('base44.app') ||
                url.hostname.includes('plan-ora')) {
              actionUrl = url.pathname + url.search + url.hash;
            } else {
              // External URL - open in new tab
              window.open(actionUrl, '_blank');
              return;
            }
          } catch (e) {
            // Invalid URL, treat as internal path
            console.warn('Invalid URL in notification:', actionUrl, e);
          }
        }

        // Make sure it starts with / for internal navigation
        if (!actionUrl.startsWith('/')) {
          actionUrl = '/' + actionUrl;
        }

        // Navigate internally
        navigate(actionUrl);
      }
    } catch (error) {
      console.error('Failed to handle notification click:', error);
      toast.error('שגיאה בפתיחת ההתראה');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setIsMarkingAllRead(true);
      await markAllNotificationsAsRead();
      
      // Update local state
      setNotifications(prev =>
        prev.map(n => ({ ...n, isRead: true, is_read: true }))
      );

      // Dispatch event to update badge count
      window.dispatchEvent(new Event('notification:read'));
      
      toast.success('כל ההתראות סומנו כנקראו');
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      toast.error('שגיאה בסימון ההתראות');
    } finally {
      setIsMarkingAllRead(false);
    }
  };

  const getNotificationIcon = (type) => {
    const iconProps = { className: "w-5 h-5" };
    
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
        return 'bg-blue-50 border-blue-200 text-blue-600';
      case 'task_assigned':
      case 'task_completed':
        return 'bg-green-50 border-green-200 text-green-600';
      case 'task_unassigned':
        return 'bg-orange-50 border-orange-200 text-orange-600';
      case 'new_message':
        return 'bg-purple-50 border-purple-200 text-purple-600';
      case 'member_joined':
        return 'bg-indigo-50 border-indigo-200 text-indigo-600';
      case 'payment_received':
        return 'bg-emerald-50 border-emerald-200 text-emerald-600';
      case 'poll_created':
      case 'poll_closed':
        return 'bg-pink-50 border-pink-200 text-pink-600';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-600';
    }
  };

  const unreadNotifications = notifications.filter(n => !n.isRead && !n.is_read);
  const readNotifications = notifications.filter(n => n.isRead || n.is_read);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">טוען התראות...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50 pb-20" style={{ direction: 'rtl' }}>
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
              <Bell className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">התראות</h1>
              <p className="text-sm text-gray-600">
                {unreadNotifications.length > 0
                  ? `${unreadNotifications.length} התראות חדשות`
                  : 'אין התראות חדשות'}
              </p>
            </div>
          </div>

          {unreadNotifications.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              disabled={isMarkingAllRead}
              className="gap-2"
            >
              {isMarkingAllRead ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCheck className="w-4 h-4" />
              )}
              סמן הכל כנקרא
            </Button>
          )}
        </div>

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-12 text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <BellOff className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">אין התראות</h3>
              <p className="text-gray-600">כאשר יהיו לך התראות חדשות, הן יופיעו כאן</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Unread Notifications */}
            {unreadNotifications.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 mb-3 px-2">חדשות</h2>
                <div className="space-y-2">
                  {unreadNotifications.map((notification) => {
                    const createdAt = notification.createdAt || notification.created_at || notification.CreatedAt;
                    
                    return (
                      <Card
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className="bg-white border-2 border-orange-200 hover:border-orange-300 cursor-pointer transition-all hover:shadow-md"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getNotificationColor(notification.type)}`}>
                              {getNotificationIcon(notification.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <h3 className="font-semibold text-gray-900">{notification.title}</h3>
                                <span className="text-xs text-gray-500 whitespace-nowrap">
                                  {formatIsraelDate(createdAt)}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600">{notification.message}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Read Notifications */}
            {readNotifications.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 mb-3 px-2 mt-6">קראתי</h2>
                <div className="space-y-2">
                  {readNotifications.map((notification) => {
                    const createdAt = notification.createdAt || notification.created_at || notification.CreatedAt;
                    
                    return (
                      <Card
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className="bg-white/50 border-gray-200 hover:bg-white/70 cursor-pointer transition-all"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center opacity-50 ${getNotificationColor(notification.type)}`}>
                              {getNotificationIcon(notification.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <h3 className="font-semibold text-gray-700">{notification.title}</h3>
                                <span className="text-xs text-gray-400 whitespace-nowrap">
                                  {formatIsraelDate(createdAt)}
                                </span>
                              </div>
                              <p className="text-sm text-gray-500">{notification.message}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

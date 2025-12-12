import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/components/AuthProvider';
import { getMyEvents, getUnreadMessagesCount, getMessages } from '@/components/instabackService';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { MessageSquare, Loader2, ChevronLeft, Calendar, Search, Paperclip } from 'lucide-react';
import { formatIsraelDate, getRelativeTime } from '@/components/utils/dateHelpers';

export default function ChatOverviewPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadData, setUnreadData] = useState({ totalUnread: 0, unreadByEvent: {} });
  const [searchQuery, setSearchQuery] = useState('');
  const [lastMessages, setLastMessages] = useState({});

  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        const [eventsData, unreadCounts] = await Promise.all([
          getMyEvents(user.id),
          getUnreadMessagesCount(user.id)
        ]);
        
        console.log('📊 ChatOverview loaded:', {
          events: eventsData?.length || 0,
          unreadCounts
        });
        
        setEvents(eventsData || []);
        setUnreadData(unreadCounts || { totalUnread: 0, unreadByEvent: {} });

        // טעינת ההודעה האחרונה עבור כל אירוע
        if (eventsData && eventsData.length > 0) {
          const messagesMap = {};
          await Promise.all(
            eventsData.map(async (event) => {
              try {
                const messages = await getMessages(event.id);
                if (messages && messages.length > 0) {
                  // נרמול שדה התאריך ומיון לפי האחרונה
                  const sortedMessages = messages
                    .map(msg => ({
                      ...msg,
                      normalizedDate: msg.createdAt || msg.created_at || msg.created_date || msg.timestamp
                    }))
                    .sort((a, b) => {
                      const dateA = new Date(a.normalizedDate);
                      const dateB = new Date(b.normalizedDate);
                      return dateB - dateA; // החדש ביותר ראשון
                    });
                  
                  messagesMap[event.id] = sortedMessages[0];
                  console.log(`📨 Last message for ${event.title}:`, {
                    content: sortedMessages[0].content?.substring(0, 30),
                    date: sortedMessages[0].normalizedDate
                  });
                }
              } catch (err) {
                console.warn(`Failed to load messages for event ${event.id}:`, err);
              }
            })
          );
          setLastMessages(messagesMap);
        }
      } catch (error) {
        console.error('Failed to load chat overview:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const sortedEvents = [...filteredEvents].sort((a, b) => {
    const aUnread = unreadData.unreadByEvent[a.id]?.count || 0;
    const bUnread = unreadData.unreadByEvent[b.id]?.count || 0;
    
    if ((aUnread > 0 && bUnread > 0) || (aUnread === 0 && bUnread === 0)) {
      const aDate = new Date(a.updated_date || a.created_date);
      const bDate = new Date(b.updated_date || b.created_date);
      return bDate - aDate;
    }
    
    return bUnread - aUnread;
  });

  const formatLastMessage = (message) => {
    if (!message) return 'אין הודעות עדיין';
    
    const fileUrl = message.file_url || message.fileUrl;
    if (fileUrl) {
      return (
        <span className="flex items-center gap-1">
          <Paperclip className="w-3 h-3" />
          <span>קובץ מצורף</span>
        </span>
      );
    }
    
    return message.content || 'הודעה';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50 dark:from-black dark:via-black dark:to-gray-900 p-6" style={{ direction: 'rtl' }}>
      {loading ? (
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      ) : (
        <div className="w-full p-3 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">הצ׳אטים שלי</h1>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                {unreadData.totalUnread > 0 ? (
                  <span className="text-orange-600 dark:text-orange-400 font-semibold">
                    {unreadData.totalUnread} הודעות חדשות
                  </span>
                ) : (
                  'אין הודעות חדשות'
                )}
              </p>
            </div>
            <MessageSquare className="w-7 h-7 text-orange-500" />
          </div>

          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="חיפוש צ׳אטים..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10 h-9 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            />
          </div>

          {sortedEvents.length === 0 ? (
            <Card className="p-6 text-center dark:bg-gray-800 dark:border-gray-700">
              <MessageSquare className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-1">
                {searchQuery ? 'לא נמצאו צ׳אטים' : 'אין צ׳אטים זמינים'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {searchQuery ? 'נסה חיפוש אחר' : 'הצטרף לאירוע כדי להתחיל לשוחח'}
              </p>
            </Card>
          ) : (
            <div className="space-y-2">
              {sortedEvents.map((event) => {
                const unreadCount = unreadData.unreadByEvent[event.id]?.count || 0;
                const hasUnread = unreadCount > 0;
                const lastMessage = lastMessages[event.id];

                return (
                  <Card
                    key={event.id}
                    className={`hover:shadow-lg transition-all duration-300 cursor-pointer dark:bg-gray-800 dark:border-gray-700 ${
                      hasUnread ? 'border-orange-500 border-2 bg-orange-50/30 dark:bg-orange-900/20' : ''
                    }`}
                    onClick={() => navigate(createPageUrl(`EventChat?id=${event.id}`))}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${
                          hasUnread ? 'bg-gradient-to-r from-orange-400 to-pink-400' : 'bg-gradient-to-r from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-500'
                        }`}>
                          {event.cover_image_url ? (
                            <img
                              src={event.cover_image_url}
                              alt={event.title}
                              className="w-full h-full object-cover rounded-full"
                            />
                          ) : (
                            <MessageSquare className="w-5 h-5 text-white" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-2 mb-0.5">
                            <h3 className={`text-base font-bold truncate ${
                              hasUnread ? 'text-orange-600 dark:text-orange-400' : 'text-gray-900 dark:text-white'
                            }`}>
                              {event.title}
                            </h3>
                            {lastMessage && (
                              <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                                {getRelativeTime(lastMessage.normalizedDate)}
                              </span>
                            )}
                          </div>
                          
                          <p className={`text-xs truncate ${
                            hasUnread ? 'text-gray-700 dark:text-gray-200 font-semibold' : 'text-gray-500 dark:text-gray-400'
                          }`}>
                            {formatLastMessage(lastMessage)}
                          </p>
                          
                          {event.event_date && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatIsraelDate(event.event_date)}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col items-center gap-1 flex-shrink-0">
                          {hasUnread && (
                            <div className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs animate-pulse">
                              {unreadCount > 9 ? '9+' : unreadCount}
                            </div>
                          )}
                          <ChevronLeft className={`w-4 h-4 ${
                            hasUnread ? 'text-orange-500' : 'text-gray-400'
                          }`} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
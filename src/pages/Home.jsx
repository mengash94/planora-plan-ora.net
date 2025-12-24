import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Calendar, Plus, MapPin, Sparkles, ArrowLeft, Clock, CheckSquare, MessageCircle, TrendingUp, Handshake, Share2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
// PageGuide removed - using SideHelpTab instead
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/components/AuthProvider';
import SEOHead from '@/components/SEOHead';
import {
  getDashboardOverview,
  getEventDetails,
  checkEventMembership,
  joinEvent
} from '@/components/instabackService';
// useFirstVisit removed - using SideHelpTab instead
import { formatIsraelDate } from '@/components/utils/dateHelpers';
import EventCalendarView from '@/components/event/EventCalendarView';

export default function HomePage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [events, setEvents] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [recentMessages, setRecentMessages] = useState([]);
  const [dashboardCounts, setDashboardCounts] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  const { toast } = useToast();
  // Removed - using SideHelpTab instead

  // ✅ טעינה מהירה - פעם אחת בלבד
  useEffect(() => {
    if (hasLoaded || !isAuthenticated || !user?.id || isAuthLoading) {
      if (!isAuthenticated && !isAuthLoading) {
        setIsLoading(false);
      }
      return;
    }

    const loadData = async () => {
      console.log('[Home] 🚀 Loading data...');
      setIsLoading(false);

      try {
        const { getMyEvents, listTasks, getMessages } = await import('@/components/instabackService');

        const [fetchedEvents, overviewResult] = await Promise.allSettled([
          getMyEvents(user.id),
          getDashboardOverview({
            scope: 'user',
            limits: { recent_messages_limit: 8, upcoming_events_limit: 3, samples_limit: 20 },
            include: { include_tasks_by_event: false },
            time_window_days: 7
          })
        ]);

        const activeEvents = (fetchedEvents.status === 'fulfilled' ? fetchedEvents.value : [])
          .filter(event => (event.status || 'active') === 'active');
        
        console.log('[Home] ✅ Events:', activeEvents.length);
        setEvents(activeEvents);

        if (overviewResult.status === 'fulfilled') {
          const overview = overviewResult.value;
          const ud = overview?.user_dashboard || overview?.data || {};
          setDashboardCounts(ud?.counts || null);
          
          const tasksFromOverview = Array.isArray(ud?.my_tasks) ? ud.my_tasks : [];
          const msgsFromOverview = Array.isArray(ud?.recent_messages) ? ud.recent_messages : [];

          if (tasksFromOverview.length > 0 || msgsFromOverview.length > 0) {
            console.log('[Home] ✅ Dashboard data:', {
              tasks: tasksFromOverview.length,
              messages: msgsFromOverview.length
            });

            setAllTasks(tasksFromOverview);
            
            const mappedMsgs = msgsFromOverview
              .filter(m => (m.user_id || m.userId) !== user.id)
              .map(m => ({
                ...m,
                eventTitle: m.event_title || m.eventTitle,
                createdAt: m.created_at || m.createdAt,
                UserId: m.user_id || m.userId,
                eventId: m.event_id || m.eventId
              }))
              .sort((a, b) => new Date(b.createdAt || b.CreatedAt) - new Date(a.createdAt || a.CreatedAt));

            setRecentMessages(mappedMsgs);
          } else if (activeEvents.length > 0) {
            console.log('[Home] 🔄 Fallback - parallel load from events');
            
            const sampleEvents = activeEvents.slice(0, 5);
            
            const [tasksArrays, msgsArrays] = await Promise.all([
              Promise.all(sampleEvents.map(ev => listTasks(ev.id).catch(() => []))),
              Promise.all(sampleEvents.slice(0, 3).map(async (ev) => {
                const msgs = await getMessages(ev.id).catch(() => []);
                return (msgs || [])
                  .filter(m => (m.userId || m.UserId) !== user.id)
                  .map(m => ({
                    ...m,
                    eventTitle: ev.title || ev.name,
                    createdAt: m.createdAt || m.created_at || m.CreatedAt,
                    eventId: ev.id
                  }));
              }))
            ]);

            const allTasksFlat = tasksArrays.flat();
            const myTasks = allTasksFlat.filter(t => {
              const assigneeId = t.assigneeId || t.assignee_id;
              return !assigneeId || assigneeId === user.id;
            });
            
            console.log('[Home] ✅ Tasks:', myTasks.length);
            setAllTasks(myTasks);

            const allMsgs = msgsArrays.flat();
            const latestByEvent = new Map();
            for (const msg of allMsgs) {
              const eid = msg.eventId;
              if (!eid) continue;
              const prev = latestByEvent.get(eid);
              const msgTime = new Date(msg.createdAt || msg.CreatedAt).getTime();
              if (!prev || msgTime > new Date(prev.createdAt || prev.CreatedAt).getTime()) {
                latestByEvent.set(eid, msg);
              }
            }
            
            const uniqueLatest = Array.from(latestByEvent.values())
              .sort((a, b) => new Date(b.createdAt || b.CreatedAt) - new Date(a.createdAt || a.CreatedAt))
              .slice(0, 8);
            
            console.log('[Home] ✅ Messages:', uniqueLatest.length);
            setRecentMessages(uniqueLatest);
          }
        }

        console.log('[Home] ✅ Load complete');
        setHasLoaded(true);
      } catch (error) {
        console.error("[Home] ❌ Load error", error);
        setEvents([]);
        setAllTasks([]);
        setRecentMessages([]);
        setHasLoaded(true);
      }
    };

    loadData();
  }, [isAuthLoading, isAuthenticated, user?.id, hasLoaded]);

  // ✅ טיפול ב-pending invites - ברקע בלבד
  useEffect(() => {
    if (!isAuthenticated || !user?.id || typeof window === 'undefined') return;

    const processPendingInvites = async () => {
      try {
        let pendingIds = [];
        const storedList = localStorage.getItem('pendingEventJoins');
        const storedSingle = localStorage.getItem('pendingEventJoin');

        if (storedList) {
          try {
            pendingIds = JSON.parse(storedList);
            if (!Array.isArray(pendingIds)) pendingIds = [];
          } catch (e) {
            pendingIds = [];
          }
        }
        if (storedSingle && !pendingIds.includes(storedSingle)) {
          pendingIds.push(storedSingle);
        }

        if (pendingIds.length === 0) return;

        console.log('[Home] Processing pending invites:', pendingIds);

        const updatedPending = [];
        for (const eventId of pendingIds) {
          try {
            const eventDetails = await getEventDetails(eventId);

            if (!eventDetails) {
              console.warn(`[Home] Event ${eventId} not found`);
              continue;
            }

            const membership = await checkEventMembership(eventId, user.id);
            
            if (!membership) {
              await joinEvent(eventId, user.id);
            }
            updatedPending.push(eventId);
          } catch (err) {
            console.warn(`[Home] Failed to process ${eventId}:`, err);
          }
        }

        if (updatedPending.length > 0) {
          localStorage.setItem('pendingEventJoins', JSON.stringify(updatedPending));
        } else {
          localStorage.removeItem('pendingEventJoins');
          localStorage.removeItem('pendingEventJoin');
        }
      } catch (error) {
        console.warn('[Home] Error processing invites:', error);
      }
    };

    const timer = setTimeout(processPendingInvites, 2000);
    return () => clearTimeout(timer);
  }, [isAuthenticated, user?.id]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "בוקר טוב";
    if (hour < 17) return "צהרים טובים";
    if (hour < 21) return "ערב טוב";
    return "לילה טוב";
  };

  // ✅ מציג 3 אירועים קרובים (לפי תאריך האירוע, ואם אין - לפי תאריך יצירה)
  const getUpcomingEvents = () => {
    const now = new Date();

    // אירועים עם תאריך עתידי - ממוינים לפי תאריך האירוע
    const eventsWithFutureDate = events
      .filter(event => {
        const eventDate = event.eventDate || event.event_date;
        if (!eventDate) return false;
        const eventDateObj = new Date(eventDate);
        return !isNaN(eventDateObj.getTime()) && eventDateObj >= now;
      })
      .sort((a, b) => {
        const dateA = new Date(a.eventDate || a.event_date).getTime();
        const dateB = new Date(b.eventDate || b.event_date).getTime();
        return dateA - dateB;
      });

    // אירועים בלי תאריך - ממוינים לפי תאריך יצירה (החדשים קודם)
    const eventsWithoutDate = events
      .filter(event => {
        const eventDate = event.eventDate || event.event_date;
        if (!eventDate) return true;
        const eventDateObj = new Date(eventDate);
        return isNaN(eventDateObj.getTime());
      })
      .sort((a, b) => {
        const createdA = new Date(a.createdAt || a.created_date || 0).getTime();
        const createdB = new Date(b.createdAt || b.created_date || 0).getTime();
        return createdB - createdA;
      });

    // מאחד: קודם אירועים עם תאריך עתידי, אחר כך בלי תאריך
    return [...eventsWithFutureDate, ...eventsWithoutDate].slice(0, 3);
  };

  const handleWhatsAppShareApp = () => {
    const appUrl = window.location.origin;
    const message = `🎉 היי! גיליתי אפליקציה מדהימה לתכנון אירועים!\n\n` +
      `PlanOra הוא הדבר הכי טוב שקרה לי בתכנון - אפשר לתכנן יחד עם כל המשתתפים:\n` +
      `✅ משימות משותפות\n💬 צ'אטים לכל אירוע\n📊 הצבעות על תאריכים ומקומות\n📸 גלריות תמונות\n🤖 יצירת אירועים עם AI\n\n` +
      `בוא/י תנסה, זה חינם לגמרי:\n${appUrl}`;

    window.location.href = `https://wa.me/?text=${encodeURIComponent(message)}`;
  };

  const handleShareApp = async () => {
    const appUrl = window.location.origin;
    const message = `🎉 היי! גיליתי אפליקציה מדהימה לתכנון אירועים!\n\n` +
      `PlanOra הוא הדבר הכי טוב שקרה לי בתכנון - אפשר לתכנן יחד עם כל המשתתפים:\n` +
      `✅ משימות משותפות\n💬 צ'אטים לכל אירוע\n📊 הצבעות על תאריכים ומקומות\n📸 גלריות תמונות\n🤖 יצירת אירועים עם AI\n\n` +
      `בוא/י תנסה, זה חינם לגמרי:\n${appUrl}`;

    try {
      await navigator.clipboard.writeText(message);
      toast({
        title: 'טקסט השיתוף הועתק! 📋',
        description: 'עכשיו אפשר לשלוח לחברים בכל מקום',
        duration: 3000,
      });
    } catch (err) {
      toast({
        title: 'שגיאה בהעתקת הקישור',
        variant: 'destructive',
      });
    }
  };

  const getPendingInvites = () => {
    try {
      const single = localStorage.getItem('pendingEventJoin');
      const list = JSON.parse(localStorage.getItem('pendingEventJoins') || '[]');
      const all = new Set([...(list || [])]);
      if (single) all.add(single);
      return Array.from(all).filter(Boolean);
    } catch {
      return [];
    }
  };
  const pendingInvites = getPendingInvites();

  const handleGoToFirstInvite = () => {
    const first = pendingInvites[0];
    if (first) navigate(createPageUrl(`JoinEvent?id=${first}`));
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">טוען...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    navigate(createPageUrl('WelcomePage'));
    return null;
  }

  const upcomingEvents = getUpcomingEvents();
  const eventsCount = dashboardCounts?.events_total ?? events.length;
  const totalTasksCount = dashboardCounts?.tasks_total ?? allTasks.length;
  const openTasksCount = dashboardCounts?.tasks_open ?? allTasks.filter(t => t.status !== 'done').length;

  const openTasks = allTasks.filter(task => task.status !== 'done');
  const recentOpenTasks = openTasks.slice(0, 3);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50" style={{ direction: 'rtl', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <SEOHead 
        title="Planora - דף הבית | תכנון אירועים חכם"
        description="נהל את האירועים שלך במקום אחד. משימות, צ'אטים, הצבעות וגלריות - הכל באפליקציה אחת."
      />
      <div className="w-full px-4 py-6">
        <div className="flex items-center justify-between gap-3 mb-8">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">שלום, {user?.name || user?.firstName || 'משתמש'}!</h1>
              <p className="text-sm text-gray-600">הנה המידע העדכני שלך</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Button onClick={() => navigate(createPageUrl('CreateEvent'))} size="sm" className="bg-orange-500 hover:bg-orange-600 shadow-lg text-sm whitespace-nowrap">
              <Plus className="w-4 h-4 ml-1" />
              <span className="hidden sm:inline">אירוע חדש</span>
              <span className="sm:hidden">חדש</span>
            </Button>
          </div>
        </div>



        {pendingInvites.length > 0 && (
          <div className="mb-4">
            <div className="bg-white/80 border border-orange-200 rounded-lg p-3 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                  <Handshake className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    יש לך {pendingInvites.length} הזמנות ממתינות להצטרפות
                  </p>
                  <p className="text-xs text-gray-600">לחץ כדי לאשר ולצפות בפרטי האירוע</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" className="bg-orange-500 hover:bg-orange-600" onClick={handleGoToFirstInvite}>
                  עבור להזמנה
                </Button>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <>
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[1, 2, 3].map(i => (
                <Card key={i} className="bg-white">
                  <CardContent className="p-3 text-center">
                    <Skeleton className="w-6 h-6 mx-auto mb-2" />
                    <Skeleton className="h-6 w-12 mx-auto mb-1" />
                    <Skeleton className="h-4 w-20 mx-auto" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              {[1, 2].map(i => (
                <Card key={i} className="bg-white">
                  <CardHeader>
                    <Skeleton className="h-6 w-32" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-16 w-full mb-2" />
                    <Skeleton className="h-16 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 mb-6">
              <Card
                onClick={() => navigate(createPageUrl('MyEventsList'))}
                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 cursor-pointer transition-transform hover:scale-[1.01] active:scale-[0.99]"
              >
                <CardContent className="p-3 text-center">
                  <Calendar className="w-6 h-6 mx-auto mb-1 opacity-80" />
                  <div className="text-xl font-bold">{eventsCount}</div>
                  <div className="text-xs opacity-90">אירועים</div>
                </CardContent>
              </Card>

              <Card
                onClick={() => navigate(createPageUrl('Tasks'))}
                className="bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0 cursor-pointer transition-transform hover:scale-[1.01] active:scale-[0.99]"
              >
                <CardContent className="p-3 text-center">
                  <CheckSquare className="w-6 h-6 mx-auto mb-1 opacity-80" />
                  <div className="text-xl font-bold">{openTasksCount}</div>
                  <div className="text-xs opacity-90">משימות פתוחות</div>
                </CardContent>
              </Card>

              <Card
                onClick={() => navigate(createPageUrl('Tasks'))}
                className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0 cursor-pointer transition-transform hover:scale-[1.01] active:scale-[0.99]"
              >
                <CardContent className="p-3 text-center">
                  <TrendingUp className="w-6 h-6 mx-auto mb-1 opacity-80" />
                  <div className="text-xl font-bold">{totalTasksCount}</div>
                  <div className="text-xs opacity-90">סה"כ משימות</div>
                </CardContent>
              </Card>
            </div>

            {(upcomingEvents.length > 0 || recentOpenTasks.length > 0) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                {upcomingEvents.length > 0 && (
                      <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
                        <CardHeader className="pb-2">
                          <CardTitle className="flex items-center justify-between text-blue-600 text-lg">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              אירועים קרובים
                            </div>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => setShowCalendar(!showCalendar)}
                              className={`w-8 h-8 ${showCalendar ? 'bg-blue-100 border-blue-400' : 'bg-white border-blue-200'} hover:bg-blue-50 text-blue-600`}
                            >
                              <Calendar className="w-4 h-4" />
                            </Button>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="space-y-2">
                            {upcomingEvents.map(event => (
                              <Link to={createPageUrl(`EventDetail?id=${event.id}`)} key={event.id}>
                                <div className="flex items-center p-2 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-100 transition-colors cursor-pointer">
                                  <div className="w-2 h-2 bg-blue-400 rounded-full ml-2 flex-shrink-0"></div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-900 text-sm truncate">{event.title || event.name || 'ללא שם'}</p>
                                    <div className="flex items-center gap-2 text-xs text-gray-600">
                                      {(event.eventDate || event.event_date) ? (
                                        <span className="flex items-center gap-1">
                                          <Calendar className="w-3 h-3" />
                                          {formatIsraelDate(event.eventDate || event.event_date)}
                                        </span>
                                      ) : (
                                        <span className="flex items-center gap-1 text-gray-400">
                                          <Clock className="w-3 h-3" />
                                          נוצר {formatIsraelDate(event.createdAt || event.created_date)}
                                        </span>
                                      )}
                                      {event.location && (
                                        <span className="flex items-center gap-1 truncate">
                                          <MapPin className="w-3 h-3" />
                                          {event.location}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <ArrowLeft className="w-3 h-3 text-gray-400" />
                                </div>
                              </Link>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Calendar View (toggleable) */}
                    {showCalendar && events.length > 0 && (
                      <div className="lg:col-span-1">
                        <EventCalendarView events={events} userId={user?.id} />
                      </div>
                    )}

                {recentOpenTasks.length > 0 && (
                  <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-orange-600 text-lg">
                        <CheckSquare className="w-4 h-4" />
                        משימות פתוחות
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        {recentOpenTasks.map(task => {
                          const eventId = task.eventId || task.event_id || task.EventId;
                          const toUrl = eventId
                            ? createPageUrl(`EventDetail?id=${eventId}&tab=tasks&taskId=${task.id}`)
                            : createPageUrl('Tasks');
                          return (
                            <Link key={task.id} to={toUrl}>
                              <div className="flex items-center p-2 bg-orange-50 hover:bg-orange-100 rounded-lg border border-orange-100 transition-colors cursor-pointer">
                                <div className="w-2 h-2 bg-orange-400 rounded-full ml-2 flex-shrink-0"></div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-900 text-sm truncate">{task.title}</p>
                                  {task.description && (
                                    <p className="text-xs text-gray-600 truncate">{task.description}</p>
                                  )}
                                </div>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                      <div className="mt-3 text-center">
                        <Button variant="outline" size="sm" asChild className="text-orange-600 hover:bg-orange-50 text-xs">
                          <Link to={createPageUrl('Tasks')}>
                            ראה הכל
                            <ArrowLeft className="w-3 h-3 mr-1" />
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {recentMessages.length > 0 && (
              <Card className="mb-6 bg-white/70 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-purple-600 text-lg">
                    <MessageCircle className="w-4 h-4" />
                    הודעות אחרונות
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {recentMessages.map((message, index) => {
                      const eventId = message.eventId || message.event_id;
                      const toUrl = eventId ? createPageUrl(`EventChat?id=${eventId}`) : createPageUrl('ChatOverview');
                      const createdAt = message.createdAt || message.created_at || message.CreatedAt;

                      return (
                        <Link key={index} to={toUrl}>
                          <div className="flex items-start p-2 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-100 cursor-pointer transition-colors">
                            <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 ml-2 flex-shrink-0"></div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-purple-800 font-medium">{message.eventTitle}</p>
                              <p className="text-gray-700 text-sm truncate">{message.content}</p>
                              <p className="text-xs text-gray-500">
                                {formatIsraelDate(createdAt)}
                              </p>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                  <div className="mt-3 text-center">
                    <Button variant="outline" size="sm" asChild className="text-purple-600 hover:bg-purple-50 text-xs">
                      <Link to={createPageUrl('ChatOverview')}>
                        ראה הכל
                        <ArrowLeft className="w-3 h-3 mr-1" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card 
              className="bg-gradient-to-br from-orange-400 to-pink-500 border-0 shadow-xl text-white cursor-pointer hover:shadow-2xl transition-shadow"
              onClick={() => navigate(createPageUrl('CreateEvent'))}
            >
              <CardContent className="p-4 text-center">
                <h3 className="text-lg font-bold mb-2">יוצרים משהו חדש?</h3>
                <Button
                  className="bg-white text-gray-900 hover:bg-gray-100 px-4 py-2 font-semibold shadow-lg text-sm"
                >
                  <Sparkles className="w-4 h-4 ml-1" />
                  צור אירוע חדש
                </Button>
              </CardContent>
            </Card>

            {events.length === 0 && (
              <div className="text-center mt-6 opacity-60">
                <p className="text-gray-500 text-sm">עדיין לא יצרת אף אירוע</p>
                <p className="text-xs text-gray-400 mt-1">זה הזמן להתחיל!</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
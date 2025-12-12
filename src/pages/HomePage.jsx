import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Calendar, Plus, MapPin, Sparkles, ArrowRight, CheckSquare, MessageCircle, Users, Handshake } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { getDashboardOverview } from '@/components/instabackService';
import { toast } from 'sonner';
import PageGuide from '../components/ui/PageGuide';
import AuthPage from './Auth';

export default function HomePage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const loadDashboardData = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      const overview = await getDashboardOverview({
        scope: 'user',
        limits: { recent_messages_limit: 5, upcoming_events_limit: 3, samples_limit: 5 },
        include: { include_tasks_by_event: false },
        time_window_days: 30
      });
      
      const ud = overview?.user_dashboard || overview?.data || {};
      
      const mappedData = {
          counts: ud.counts || { events_total: 0, tasks_total: 0, tasks_open: 0 },
          myTasks: (Array.isArray(ud.my_tasks) ? ud.my_tasks : []).filter(t => t.status !== 'done'),
          upcomingEvents: (Array.isArray(ud.upcoming_events) ? ud.upcoming_events : []).slice(0, 3),
          recentMessages: (Array.isArray(ud.recent_messages) ? ud.recent_messages : [])
            .filter(m => (m.user_id || m.userId) !== user.id)
            .map(m => ({
              ...m,
              eventTitle: m.event_title || m.eventTitle,
              createdAt: m.created_at || m.createdAt,
              eventId: m.event_id || m.eventId
            }))
            .reduce((acc, msg) => { // Keep only latest message per event
                if (!acc.find(m => m.eventId === msg.eventId)) acc.push(msg);
                return acc;
            }, [])
            .slice(0, 5)
      };

      setDashboardData(mappedData);

    } catch (error) {
      const msg = error?.status === 404 || error?.status === 405
        ? 'פונקציית הדשבורד אינה זמינה ב-InstaBack. מוצגים נתוני ברירת מחדל.'
        : 'נכשל בטעינת נתוני הדשבורד.';
      console.warn("Failed to load dashboard overview:", error);
      toast.warning('בעיה בטעינת הדשבורד', { description: msg, duration: 3000 });
      setDashboardData({ counts: {}, myTasks: [], upcomingEvents: [], recentMessages: [] }); // Fallback
    } finally {
      setIsLoading(false);
    }
  }, [user, isAuthenticated]);

  useEffect(() => {
    if (!isAuthLoading) {
      loadDashboardData();
    }
  }, [isAuthLoading, loadDashboardData]);

  // ... (getGreeting, sharing functions, invite handling - keep as is) ...
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "בוקר טוב";
    if (hour < 17) return "צהרים טובים"; 
    if (hour < 21) return "ערב טוב";
    return "לילה טוב";
  };
  const getPendingInvites = () => {
    try {
      const single = localStorage.getItem('pendingEventJoin');
      const list = JSON.parse(localStorage.getItem('pendingEventJoins') || '[]').filter(Boolean);
      const all = new Set(list);
      if (single) all.add(single);
      return Array.from(all);
    } catch { return []; }
  };
  const pendingInvites = getPendingInvites();
  const handleGoToFirstInvite = () => {
    if (pendingInvites[0]) navigate(createPageUrl(`JoinEvent?id=${pendingInvites[0]}`));
  };


  if (isAuthLoading || (isAuthenticated && isLoading)) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20" style={{ direction: 'rtl' }}>
       <PageGuide
        title="עמוד הבית 🏠"
        content="המרכז האישי שלך לתכנון אירועים. כאן תוכל לראות במבט את כל הנתונים החשובים ולנהל את האירועים שלך."
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        
        {/* Header */}
        <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800">{getGreeting()}, {user?.name || user?.firstName}!</h1>
            <p className="text-gray-500">זהו מרכז הבקרה שלך לתכנון מושלם.</p>
        </div>

        {/* Pending Invites Banner */}
        {pendingInvites.length > 0 && (
          <Card className="mb-6 bg-orange-50 border-orange-200 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Handshake className="w-6 h-6 text-orange-600" />
                    <div>
                        <p className="font-semibold text-gray-800">יש לך {pendingInvites.length} הזמנות שממתינות לאישור</p>
                        <p className="text-sm text-gray-600">לחץ כדי להצטרף לאירועים</p>
                    </div>
                </div>
                <Button size="sm" className="bg-orange-500 hover:bg-orange-600" onClick={handleGoToFirstInvite}>
                    צפה בהזמנה
                </Button>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center gap-4">
                    <div className="bg-blue-100 p-3 rounded-lg"><Calendar className="w-6 h-6 text-blue-600"/></div>
                    <div>
                        <div className="text-2xl font-bold text-gray-800">{dashboardData?.counts?.events_total ?? 0}</div>
                        <p className="text-sm text-gray-500">סה"כ אירועים</p>
                    </div>
                </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center gap-4">
                    <div className="bg-orange-100 p-3 rounded-lg"><CheckSquare className="w-6 h-6 text-orange-600"/></div>
                    <div>
                        <div className="text-2xl font-bold text-gray-800">{dashboardData?.counts?.tasks_open ?? 0}</div>
                        <p className="text-sm text-gray-500">משימות פתוחות</p>
                    </div>
                </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center gap-4">
                    <div className="bg-green-100 p-3 rounded-lg"><Users className="w-6 h-6 text-green-600"/></div>
                    <div>
                        <div className="text-2xl font-bold text-gray-800">{dashboardData?.counts?.total_members ?? 0}</div>
                        <p className="text-sm text-gray-500">סה"כ משתתפים</p>
                    </div>
                </CardContent>
            </Card>
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column (Main Content) */}
            <div className="lg:col-span-2 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Calendar className="w-5 h-5 text-blue-500"/> אירועים קרובים</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {dashboardData?.upcomingEvents?.length > 0 ? (
                            <div className="space-y-3">
                                {dashboardData.upcomingEvents.map(event => (
                                    <Link to={createPageUrl(`EventDetail?id=${event.id}`)} key={event.id} className="block p-3 rounded-lg hover:bg-gray-50 border transition-colors">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="font-semibold text-gray-800">{event.title || event.name}</p>
                                                <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                                                    <span className="flex items-center gap-1"><Calendar className="w-4 h-4"/> {new Date(event.event_date || event.eventDate).toLocaleDateString('he-IL')}</span>
                                                    <span className="flex items-center gap-1"><MapPin className="w-4 h-4"/> {event.location || 'לא צוין'}</span>
                                                </div>
                                            </div>
                                            <ArrowRight className="w-5 h-5 text-gray-400"/>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (<p className="text-center text-gray-500 py-4">אין אירועים קרובים בתכנון.</p>)}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><CheckSquare className="w-5 h-5 text-orange-500"/> המשימות הפתוחות שלי</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {dashboardData?.myTasks?.length > 0 ? (
                           <div className="space-y-3">
                                {dashboardData.myTasks.slice(0, 5).map(task => (
                                    <Link to={createPageUrl(`EventDetail?id=${task.eventId || task.event_id}&tab=tasks&taskId=${task.id}`)} key={task.id} className="block p-3 rounded-lg hover:bg-gray-50 border transition-colors">
                                        <p className="font-semibold text-gray-800">{task.title}</p>
                                        {task.description && <p className="text-sm text-gray-500 mt-1">{task.description}</p>}
                                    </Link>
                                ))}
                            </div>
                        ) : (<p className="text-center text-gray-500 py-4">כל הכבוד, אין לך משימות פתוחות!</p>)}
                         <div className="mt-4 text-center">
                            <Button variant="ghost" size="sm" asChild className="text-orange-600 hover:text-orange-700">
                                <Link to={createPageUrl('Tasks')}>כל המשימות <ArrowRight className="w-4 h-4 mr-1"/></Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Right Column (Side Content) */}
            <div className="space-y-6">
                 <Card className="bg-gradient-to-br from-orange-500 to-rose-500 text-white">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5"/> מתכננים משהו חדש?</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="mb-4">התחילו ליצור את האירוע הבא שלכם בכמה קליקים.</p>
                        <Button variant="secondary" className="w-full bg-white text-orange-600 hover:bg-orange-50" onClick={() => navigate(createPageUrl('CreateEvent'))}>
                            <Plus className="w-4 h-4 ml-2"/> צור אירוע חדש
                        </Button>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><MessageCircle className="w-5 h-5 text-purple-500"/> הודעות אחרונות</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {dashboardData?.recentMessages?.length > 0 ? (
                            <div className="space-y-3">
                                {dashboardData.recentMessages.map((msg, idx) => (
                                    <Link to={createPageUrl(`EventChat?id=${msg.eventId}`)} key={idx} className="block p-2 rounded-lg hover:bg-gray-50 transition-colors">
                                        <p className="text-sm font-semibold text-purple-800">{msg.eventTitle}</p>
                                        <p className="text-sm text-gray-600 truncate">{msg.content}</p>
                                        <p className="text-xs text-gray-400">{new Date(msg.createdAt).toLocaleDateString('he-IL')}</p>
                                    </Link>
                                ))}
                            </div>
                        ) : (<p className="text-center text-gray-500 py-4">אין הודעות חדשות.</p>)}
                    </CardContent>
                </Card>
            </div>
        </div>
      </div>
    </div>
  );
}
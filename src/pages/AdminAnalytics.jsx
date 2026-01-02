import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Loader2, 
  ArrowRight, 
  TrendingUp, 
  Users, 
  Calendar, 
  Sparkles,
  FileText,
  UserPlus,
  LogIn,
  BarChart3,
  PieChart,
  Activity,
  Smartphone,
  Monitor,
  Target
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart as RechartsPie,
  Pie,
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

export default function AdminAnalyticsPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  
  const [isLoading, setIsLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState(null);
  
  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Chart colors
  const COLORS = {
    ai: '#f97316', // orange
    manual: '#3b82f6', // blue
    template: '#8b5cf6', // purple
    joins: '#10b981', // green
    logins: '#06b6d4', // cyan
    active: '#22c55e',
    churned: '#ef4444',
    new: '#f59e0b'
  };

  // Redirect non-admin users
  useEffect(() => {
    if (!isAuthenticated || !user) {
      toast.error('נדרשת התחברות');
      navigate(createPageUrl('Auth'));
      return;
    }
    
    if (user.role !== 'admin') {
      toast.error('גישה למנהלים בלבד');
      navigate(createPageUrl('Home'));
      return;
    }
  }, [isAuthenticated, user, navigate]);

  // Load analytics data
  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const payload = {};
      if (startDate) payload.startDate = new Date(startDate).toISOString();
      if (endDate) payload.endDate = new Date(endDate).toISOString();
      
      const { data } = await base44.functions.invoke('getAnalyticsData', payload);
      
      if (data.success) {
        setAnalyticsData(data);
      } else {
        throw new Error(data.error || 'Failed to load analytics');
      }
    } catch (error) {
      console.error('[AdminAnalytics] Error:', error);
      toast.error('שגיאה בטעינת הנתונים: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      loadAnalytics();
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">טוען נתוני ניתוח...</p>
        </div>
      </div>
    );
  }

  const metrics = analyticsData?.metrics || {};
  const timeline = metrics.timeline || [];

  // Prepare pie chart data for event creation methods
  const eventCreationData = [
    { name: 'יצירה עם AI', value: metrics.eventsCreatedByAI || 0, color: COLORS.ai },
    { name: 'יצירה ידנית', value: metrics.eventsCreatedManually || 0, color: COLORS.manual },
    { name: 'יצירה מתבנית', value: metrics.eventsCreatedWithTemplate || 0, color: COLORS.template }
  ].filter(d => d.value > 0);

  // Prepare pie chart data for user status
  const userStatusData = [
    { name: 'משתמשים פעילים', value: metrics.activeUsers || 0, color: COLORS.active },
    { name: 'משתמשים חדשים', value: metrics.newUsers || 0, color: COLORS.new },
    { name: 'משתמשים נטושים', value: metrics.churnedUsers || 0, color: COLORS.churned }
  ].filter(d => d.value > 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 pb-20" style={{ direction: 'rtl' }}>
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => navigate(createPageUrl('AdminDashboard'))}
            >
              <ArrowRight className="w-5 h-5" />
            </Button>
            <BarChart3 className="w-8 h-8 text-purple-600" />
            <h1 className="text-3xl font-bold text-gray-900">ניתוח נתונים מתקדם</h1>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">סינון נתונים</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="startDate">מתאריך</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="endDate">עד תאריך</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={loadAnalytics} className="w-full bg-purple-600 hover:bg-purple-700">
                  <Activity className="w-4 h-4 ml-2" />
                  החל סינון
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-purple-600 to-purple-700 text-white shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-xs uppercase tracking-wide mb-1">סה"כ משתמשים</p>
                  <p className="text-4xl font-bold">{metrics.totalUsers || 0}</p>
                </div>
                <Users className="w-12 h-12 text-purple-300" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-600 to-green-700 text-white shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-xs uppercase tracking-wide mb-1">משתמשים פעילים</p>
                  <p className="text-4xl font-bold">{metrics.activeUsers || 0}</p>
                  <p className="text-xs text-green-200 mt-1">7 ימים אחרונים</p>
                </div>
                <Activity className="w-12 h-12 text-green-300" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-600 to-orange-700 text-white shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-xs uppercase tracking-wide mb-1">ממוצע אירועים</p>
                  <p className="text-4xl font-bold">{metrics.avgEventsPerUser || 0}</p>
                  <p className="text-xs text-orange-200 mt-1">לכל משתמש</p>
                </div>
                <Target className="w-12 h-12 text-orange-300" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-cyan-600 to-cyan-700 text-white shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-cyan-100 text-xs uppercase tracking-wide mb-1">כניסות חוזרות</p>
                  <p className="text-4xl font-bold">{metrics.returningUsers || 0}</p>
                  <p className="text-xs text-cyan-200 mt-1">משתמשים נאמנים</p>
                </div>
                <LogIn className="w-12 h-12 text-cyan-300" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Platform & Engagement Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Platform Distribution */}
          <Card className="shadow-lg border-2 border-blue-100">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 border-b">
              <CardTitle className="flex items-center gap-2 text-blue-900">
                <Smartphone className="w-6 h-6" />
                התפלגות לפי פלטפורמה
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                      <Smartphone className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Android</p>
                      <p className="text-sm text-gray-500">{((metrics.androidUsers / metrics.totalUsers) * 100).toFixed(1)}%</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-green-600">{metrics.androidUsers || 0}</p>
                </div>

                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                      <Smartphone className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">iOS</p>
                      <p className="text-sm text-gray-500">{((metrics.iosUsers / metrics.totalUsers) * 100).toFixed(1)}%</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">{metrics.iosUsers || 0}</p>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-500 rounded-full flex items-center justify-center">
                      <Monitor className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Web</p>
                      <p className="text-sm text-gray-500">{((metrics.webUsers / metrics.totalUsers) * 100).toFixed(1)}%</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-600">{metrics.webUsers || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User Engagement */}
          <Card className="shadow-lg border-2 border-purple-100">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
              <CardTitle className="flex items-center gap-2 text-purple-900">
                <Target className="w-6 h-6" />
                מעורבות משתמשים
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <div>
                    <p className="font-semibold text-gray-900">משתמשים עם אירועים</p>
                    <p className="text-sm text-gray-500">{((metrics.usersWithEvents / metrics.totalUsers) * 100).toFixed(1)}% engagement</p>
                  </div>
                  <p className="text-2xl font-bold text-purple-600">{metrics.usersWithEvents || 0}</p>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <p className="font-semibold text-gray-900">משתמשים ללא אירועים</p>
                    <p className="text-sm text-gray-500">הזדמנות לצמיחה</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-600">{metrics.usersWithoutEvents || 0}</p>
                </div>

                <div className="p-4 bg-gradient-to-r from-orange-50 to-pink-50 rounded-lg border-2 border-orange-200">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-orange-900">ממוצע אירועים למשתמש</p>
                    <p className="text-3xl font-bold text-orange-600">{metrics.avgEventsPerUser || 0}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Event Creation Methods */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-xs uppercase tracking-wide mb-1">יצירה עם AI</p>
                  <p className="text-3xl font-bold">{metrics.eventsCreatedByAI || 0}</p>
                </div>
                <Sparkles className="w-10 h-10 text-orange-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-xs uppercase tracking-wide mb-1">יצירה ידנית</p>
                  <p className="text-3xl font-bold">{metrics.eventsCreatedManually || 0}</p>
                </div>
                <FileText className="w-10 h-10 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-xs uppercase tracking-wide mb-1">יצירה מתבנית</p>
                  <p className="text-3xl font-bold">{metrics.eventsCreatedWithTemplate || 0}</p>
                </div>
                <Calendar className="w-10 h-10 text-purple-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-xs uppercase tracking-wide mb-1">הצטרפויות</p>
                  <p className="text-3xl font-bold">{metrics.totalJoins || 0}</p>
                </div>
                <UserPlus className="w-10 h-10 text-green-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* User Activity Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-700 text-sm font-medium">משתמשים פעילים</p>
                  <p className="text-2xl font-bold text-green-900">{metrics.activeUsers || 0}</p>
                  <p className="text-xs text-green-600 mt-1">פעילים ב-7 ימים האחרונים</p>
                </div>
                <Activity className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-700 text-sm font-medium">משתמשים חדשים</p>
                  <p className="text-2xl font-bold text-orange-900">{metrics.newUsers || 0}</p>
                  <p className="text-xs text-orange-600 mt-1">הצטרפו ב-30 ימים האחרונים</p>
                </div>
                <UserPlus className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-700 text-sm font-medium">משתמשים נטושים</p>
                  <p className="text-2xl font-bold text-red-900">{metrics.churnedUsers || 0}</p>
                  <p className="text-xs text-red-600 mt-1">לא פעילים יותר מ-7 ימים</p>
                </div>
                <Users className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Event Creation Methods Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="w-5 h-5 text-purple-600" />
                שיטות יצירת אירועים
              </CardTitle>
            </CardHeader>
            <CardContent>
              {eventCreationData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPie>
                    <Pie
                      data={eventCreationData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {eventCreationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPie>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-500 text-center py-8">אין נתונים להצגה</p>
              )}
            </CardContent>
          </Card>

          {/* User Status Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                סטטוס משתמשים
              </CardTitle>
            </CardHeader>
            <CardContent>
              {userStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPie>
                    <Pie
                      data={userStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {userStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPie>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-500 text-center py-8">אין נתונים להצגה</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Timeline Chart */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              מגמות פעילות (30 ימים אחרונים)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {timeline.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={timeline}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(date) => new Date(date).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' })}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(date) => new Date(date).toLocaleDateString('he-IL')}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="ai" stroke={COLORS.ai} name="יצירה עם AI" strokeWidth={2} />
                  <Line type="monotone" dataKey="manual" stroke={COLORS.manual} name="יצירה ידנית" strokeWidth={2} />
                  <Line type="monotone" dataKey="template" stroke={COLORS.template} name="יצירה מתבנית" strokeWidth={2} />
                  <Line type="monotone" dataKey="joins" stroke={COLORS.joins} name="הצטרפויות" strokeWidth={2} />
                  <Line type="monotone" dataKey="logins" stroke={COLORS.logins} name="כניסות" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-8">אין נתונים להצגה בטווח זמן זה</p>
            )}
          </CardContent>
        </Card>

        {/* Popular Templates */}
        {metrics.popularTemplates && metrics.popularTemplates.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-600" />
                התבניות הפופולריות ביותר
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={metrics.popularTemplates}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill={COLORS.template} name="שימושים" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Top Events by Joins */}
        {metrics.topEvents && metrics.topEvents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                האירועים הפופולריים ביותר
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {metrics.topEvents.map((event, index) => (
                  <div key={event.eventId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{event.title}</p>
                        <p className="text-sm text-gray-500">מזהה: {event.eventId}</p>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="text-2xl font-bold text-green-600">{event.joins}</p>
                      <p className="text-xs text-gray-500">הצטרפויות</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
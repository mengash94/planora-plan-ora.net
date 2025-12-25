import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ArrowRight, 
  TrendingUp, 
  Users, 
  Calendar,
  CheckSquare,
  UserPlus,
  UserX,
  BarChart3,
  Loader2,
  Download,
  Sparkles,
  FileText,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { getAnalyticsData } from '@/functions/getAnalyticsData';

const COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#f59e0b'];

export default function AdminAnalyticsPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState(null);
  
  // טווח תאריכים
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [quickRange, setQuickRange] = useState('30');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate(createPageUrl('Home'));
      return;
    }
    if (user?.role !== 'admin') {
      navigate(createPageUrl('Home'));
      return;
    }
    loadAnalytics();
  }, [isAuthenticated, user]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const response = await getAnalyticsData({ startDate, endDate });
      setAnalyticsData(response.data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      toast.error('שגיאה בטעינת הנתונים');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickRangeChange = (days) => {
    setQuickRange(days);
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - parseInt(days));
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const handleRefresh = () => {
    loadAnalytics();
  };

  if (isLoading || !analyticsData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  const { summary, popularTemplates, activityBreakdown, dailyEventCreation, dailyLogins } = analyticsData;

  // המרת נתונים יומיים למערך לגרפים
  const dailyEventsData = Object.entries(dailyEventCreation || {})
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const dailyLoginsData = Object.entries(dailyLogins || {})
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // נתוני יצירת אירועים לפי סוג
  const eventCreationData = [
    { name: 'יצירה ידנית', value: summary.manualCreated, color: COLORS[0] },
    { name: 'יצירה עם AI', value: summary.aiCreated, color: COLORS[1] },
    { name: 'משימוש בתבנית', value: summary.templateCreated, color: COLORS[2] }
  ].filter(item => item.value > 0);

  // נתוני פעילויות
  const activityData = Object.entries(activityBreakdown || {})
    .map(([type, count]) => ({
      type: translateActivityType(type),
      count
    }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="min-h-screen bg-gray-50" style={{ direction: 'rtl' }}>
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(createPageUrl('AdminDashboard'))} className="hover:bg-white/20 rounded-full p-2">
                <ArrowRight className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <BarChart3 className="w-6 h-6" />
                  ניתוח נתונים מתקדם
                </h1>
                <p className="text-blue-100 text-sm">תובנות ומגמות שימוש באפליקציה</p>
              </div>
            </div>
            <Button 
              onClick={handleRefresh}
              variant="outline"
              className="bg-white text-blue-600 hover:bg-blue-50"
            >
              רענן נתונים
            </Button>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="max-w-7xl mx-auto p-4">
        <Card className="mb-4">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <Label>בחר טווח מהיר</Label>
                <Select value={quickRange} onValueChange={handleQuickRangeChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 ימים אחרונים</SelectItem>
                    <SelectItem value="30">30 ימים אחרונים</SelectItem>
                    <SelectItem value="90">90 ימים אחרונים</SelectItem>
                    <SelectItem value="365">שנה אחרונה</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex-1 min-w-[150px]">
                <Label>תאריך התחלה</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              
              <div className="flex-1 min-w-[150px]">
                <Label>תאריך סיום</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              
              <Button onClick={handleRefresh}>
                החל סינון
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="אירועים חדשים"
            value={summary.totalEvents}
            icon={<Calendar className="w-5 h-5" />}
            color="bg-orange-500"
          />
          <StatCard
            title="משתמשים פעילים"
            value={summary.activeUsers}
            icon={<Users className="w-5 h-5" />}
            color="bg-blue-500"
          />
          <StatCard
            title="משימות שהושלמו"
            value={summary.completedTasks}
            icon={<CheckSquare className="w-5 h-5" />}
            color="bg-green-500"
          />
          <StatCard
            title="הצטרפויות לאירועים"
            value={summary.joinsCount}
            icon={<UserPlus className="w-5 h-5" />}
            color="bg-purple-500"
          />
        </div>

        {/* User Engagement Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-green-500" />
                משתמשים חדשים
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{summary.newUsers}</p>
              <p className="text-sm text-gray-500">בטווח שנבחר</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                משתמשים חוזרים
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{summary.returningUsers}</p>
              <p className="text-sm text-gray-500">שיעור retention: {summary.retentionRate}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <UserX className="w-4 h-4 text-red-500" />
                משתמשים נטושים
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{summary.abandonedUsers}</p>
              <p className="text-sm text-gray-500">לא התחברו 30+ ימים</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Event Creation by Type */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">יצירת אירועים לפי סוג</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={eventCreationData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {eventCreationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-orange-500" />
                    יצירה ידנית
                  </span>
                  <span className="font-bold">{summary.manualCreated}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-500" />
                    יצירה עם AI
                  </span>
                  <span className="font-bold">{summary.aiCreated}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-green-500" />
                    משימוש בתבנית
                  </span>
                  <span className="font-bold">{summary.templateCreated}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Activity Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">פעילויות לפי סוג</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 - Trends */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Daily Event Creation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">מגמת יצירת אירועים יומית</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={dailyEventsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" angle={-45} textAnchor="end" height={60} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="count" stroke="#f97316" name="אירועים" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Daily Logins */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">מגמת התחברויות יומית</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={dailyLoginsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" angle={-45} textAnchor="end" height={60} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="count" stroke="#3b82f6" name="התחברויות" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Popular Templates */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">תבניות פופולריות</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {popularTemplates && popularTemplates.length > 0 ? (
                popularTemplates.map((template, index) => (
                  <div key={template.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center font-bold text-orange-600">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{template.title}</p>
                        <p className="text-xs text-gray-500">{template.category}</p>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="text-2xl font-bold text-orange-600">{template.usageCount}</p>
                      <p className="text-xs text-gray-500">שימושים</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-4">אין נתונים על שימוש בתבניות</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
          </div>
          <div className={`${color} text-white p-3 rounded-full`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function translateActivityType(type) {
  const translations = {
    'login': 'התחברות',
    'event_create': 'יצירת אירוע',
    'event_join': 'הצטרפות לאירוע',
    'task_complete': 'השלמת משימה',
    'message_send': 'שליחת הודעה',
    'poll_vote': 'הצבעה',
    'file_upload': 'העלאת קובץ',
    'profile_update': 'עדכון פרופיל'
  };
  return translations[type] || type;
}
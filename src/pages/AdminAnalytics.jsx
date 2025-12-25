import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
    ArrowLeft, TrendingUp, Users, Calendar, CheckSquare, 
    Loader2, RefreshCw, Download, Filter, Sparkles, FileText
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { he } from 'date-fns/locale';

const COLORS = ['#f97316', '#8b5cf6', '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#06b6d4'];

export default function AdminAnalyticsPage() {
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuth();
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        if (!isAuthenticated || user?.role !== 'admin') {
            navigate(createPageUrl('Home'));
        }
    }, [isAuthenticated, user, navigate]);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const response = await base44.functions.invoke('getAdminAnalytics', {
                startDate: startDate || null,
                endDate: endDate || null
            });

            if (response.data?.success) {
                setAnalytics(response.data.data);
            } else {
                console.error('Failed to fetch analytics:', response.data);
            }
        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const applyDateFilter = () => {
        fetchAnalytics();
    };

    const resetFilters = () => {
        setStartDate('');
        setEndDate('');
        setTimeout(fetchAnalytics, 100);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
            </div>
        );
    }

    if (!analytics) {
        return (
            <div className="p-6 text-center">
                <p className="text-gray-600">לא ניתן לטעון נתונים</p>
                <Button onClick={fetchAnalytics} className="mt-4">
                    נסה שוב
                </Button>
            </div>
        );
    }

    // Prepare chart data
    const eventCreationData = [
        { name: 'יצירה עם AI', value: analytics.eventCreationMethods.ai, color: '#8b5cf6' },
        { name: 'תבניות', value: analytics.eventCreationMethods.template, color: '#10b981' },
        { name: 'יצירה ידנית', value: analytics.eventCreationMethods.manual, color: '#3b82f6' }
    ];

    const userEngagementData = [
        { name: 'משתמשים פעילים', value: analytics.userEngagement.activeUsers },
        { name: 'משתמשים חוזרים', value: analytics.userEngagement.returningUsers },
        { name: 'משתמשים חד-פעמיים', value: analytics.userEngagement.oneTimeUsers },
        { name: 'משתמשים שנטשו', value: analytics.userEngagement.churnedUsers }
    ];

    const eventStatusData = [
        { name: 'פעיל', value: analytics.eventStatus.active, color: '#10b981' },
        { name: 'הושלם', value: analytics.eventStatus.completed, color: '#3b82f6' },
        { name: 'בוטל', value: analytics.eventStatus.cancelled, color: '#ef4444' }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-orange-50 p-4 sm:p-6">
            {/* Header */}
            <div className="max-w-7xl mx-auto mb-6">
                <div className="flex items-center justify-between mb-4">
                    <Button
                        variant="ghost"
                        onClick={() => navigate(createPageUrl('AdminDashboard'))}
                        className="gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        חזרה
                    </Button>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowFilters(!showFilters)}
                        >
                            <Filter className="w-4 h-4 ml-1" />
                            סינון
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={fetchAnalytics}
                        >
                            <RefreshCw className="w-4 h-4 ml-1" />
                            רענן
                        </Button>
                    </div>
                </div>

                <h1 className="text-3xl font-bold text-gray-900 mb-2">ניתוח נתונים מתקדם</h1>
                <p className="text-gray-600">תובנות ומגמות שימוש באפליקציה</p>

                {/* Filters */}
                {showFilters && (
                    <Card className="mt-4">
                        <CardContent className="pt-6">
                            <div className="flex flex-wrap gap-4">
                                <div className="flex-1 min-w-[200px]">
                                    <label className="block text-sm font-medium mb-2">תאריך התחלה</label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full border rounded-lg p-2"
                                    />
                                </div>
                                <div className="flex-1 min-w-[200px]">
                                    <label className="block text-sm font-medium mb-2">תאריך סיום</label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full border rounded-lg p-2"
                                    />
                                </div>
                                <div className="flex items-end gap-2">
                                    <Button onClick={applyDateFilter}>החל</Button>
                                    <Button variant="outline" onClick={resetFilters}>אפס</Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            <div className="max-w-7xl mx-auto space-y-6">
                {/* Key Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                סך משתמשים
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{analytics.totalUsers}</div>
                            <p className="text-xs opacity-80 mt-1">
                                {analytics.userEngagement.retentionRate}% Retention
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                סך אירועים
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{analytics.totalEvents}</div>
                            <p className="text-xs opacity-80 mt-1">
                                ממוצע {analytics.insights.avgEventsPerUser} לכל משתמש
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <CheckSquare className="w-4 h-4" />
                                משימות הושלמו
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{analytics.completedTasks}</div>
                            <p className="text-xs opacity-80 mt-1">
                                {analytics.insights.taskCompletionRate}% שיעור השלמה
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Sparkles className="w-4 h-4" />
                                אימוץ AI
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{analytics.insights.aiAdoptionRate}%</div>
                            <p className="text-xs opacity-80 mt-1">
                                {analytics.eventCreationMethods.ai} אירועים עם AI
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Charts Row 1 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Event Creation Methods */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="w-5 h-5 text-orange-500" />
                                שיטות יצירת אירועים
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
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
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* User Engagement */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="w-5 h-5 text-purple-500" />
                                מעורבות משתמשים
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={userEngagementData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="value" fill="#8b5cf6" />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>

                {/* Charts Row 2 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Top Templates */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-green-500" />
                                תבניות פופולריות (Top 5)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={analytics.topTemplates} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" />
                                    <YAxis dataKey="name" type="category" width={100} />
                                    <Tooltip />
                                    <Bar dataKey="count" fill="#10b981" />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Event Status */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-blue-500" />
                                סטטוס אירועים
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={eventStatusData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {eventStatusData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>

                {/* Daily Activity Trend */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-orange-500" />
                            מגמת פעילות יומית (30 יום אחרונים)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={analytics.dailyActivity}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis 
                                    dataKey="date" 
                                    tickFormatter={(date) => format(new Date(date), 'dd/MM')}
                                />
                                <YAxis />
                                <Tooltip 
                                    labelFormatter={(date) => format(new Date(date), 'dd/MM/yyyy')}
                                />
                                <Legend />
                                <Line 
                                    type="monotone" 
                                    dataKey="count" 
                                    name="פעילויות"
                                    stroke="#f97316" 
                                    strokeWidth={2}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Insights Summary */}
                <Card>
                    <CardHeader>
                        <CardTitle>תובנות מרכזיות</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-4 bg-orange-50 rounded-lg">
                                <div className="text-sm text-gray-600 mb-1">הצטרפויות לאירועים</div>
                                <div className="text-2xl font-bold text-orange-600">
                                    {analytics.totalEventJoins}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">סך משתתפים שהצטרפו</div>
                            </div>
                            <div className="p-4 bg-purple-50 rounded-lg">
                                <div className="text-sm text-gray-600 mb-1">משתמשים פעילים</div>
                                <div className="text-2xl font-bold text-purple-600">
                                    {analytics.userEngagement.recentlyActive}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">פעילים ב-7 ימים אחרונים</div>
                            </div>
                            <div className="p-4 bg-red-50 rounded-lg">
                                <div className="text-sm text-gray-600 mb-1">נטישה</div>
                                <div className="text-2xl font-bold text-red-600">
                                    {analytics.userEngagement.churnedUsers}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">משתמשים שנטשו (30+ ימים)</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar, CheckSquare, MessageSquare, Users, TrendingUp, Award, Loader2 } from 'lucide-react';
import { getMyEvents, getDashboardOverview } from '@/components/instabackService';

export default function UsageJourney({ user }) {
    const [stats, setStats] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadStats = async () => {
            if (!user?.id) return;

            setIsLoading(true);
            try {
                // טעינת נתונים מהדשבורד
                const overview = await getDashboardOverview({
                    scope: 'user',
                    limits: { samples_limit: 1000 }
                }).catch(() => null);

                const counts = overview?.user_dashboard?.counts || {};

                // נסה לקבל נתונים ישירים אם הדשבורד לא עבד
                let eventsCount = counts.events_total || 0;
                let tasksCount = counts.tasks_total || 0;
                let completedTasksCount = counts.tasks_completed || 0;

                if (!eventsCount) {
                    const events = await getMyEvents(user.id).catch(() => []);
                    eventsCount = events.length;
                }

                setStats({
                    eventsCreated: eventsCount,
                    tasksCompleted: completedTasksCount,
                    totalTasks: tasksCount,
                    daysActive: calculateDaysActive(user.created_date),
                    completionRate: tasksCount > 0 ? Math.round((completedTasksCount / tasksCount) * 100) : 0
                });
            } catch (error) {
                console.error('Failed to load usage stats:', error);
                setStats({
                    eventsCreated: 0,
                    tasksCompleted: 0,
                    totalTasks: 0,
                    daysActive: calculateDaysActive(user.created_date),
                    completionRate: 0
                });
            } finally {
                setIsLoading(false);
            }
        };

        loadStats();
    }, [user]);

    const calculateDaysActive = (createdDate) => {
        if (!createdDate) return 0;
        const created = new Date(createdDate);
        const now = new Date();
        const diffTime = Math.abs(now - created);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const getActivityLevel = () => {
        if (!stats) return { level: 'מתחיל', color: 'bg-gray-500', icon: Users };
        if (stats.eventsCreated >= 10 && stats.tasksCompleted >= 50) {
            return { level: 'מתכנן מקצועי', color: 'bg-purple-500', icon: Award };
        }
        if (stats.eventsCreated >= 5 && stats.tasksCompleted >= 20) {
            return { level: 'מארגן מנוסה', color: 'bg-blue-500', icon: TrendingUp };
        }
        if (stats.eventsCreated >= 2) {
            return { level: 'מתכנן פעיל', color: 'bg-green-500', icon: CheckSquare };
        }
        return { level: 'מתחיל', color: 'bg-gray-500', icon: Users };
    };

    if (isLoading) {
        return (
            <Card>
                <CardContent className="py-12 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                    <span className="mr-2 text-gray-600">טוען נתונים...</span>
                </CardContent>
            </Card>
        );
    }

    const activityLevel = getActivityLevel();
    const ActivityIcon = activityLevel.icon;

    return (
        <div className="space-y-6">
            <Card className="bg-gradient-to-br from-orange-500 to-pink-500 text-white border-0">
                <CardHeader>
                    <CardTitle className="text-2xl flex items-center gap-2">
                        <ActivityIcon className="w-8 h-8" />
                        {activityLevel.level}
                    </CardTitle>
                    <CardDescription className="text-white/80">
                        המסע שלך באפליקציה
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-2 text-white/90">
                        <Calendar className="w-4 h-4" />
                        <span>פעיל {stats.daysActive} ימים</span>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4">
                <Card>
                    <CardContent className="pt-6 text-center">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-blue-100 flex items-center justify-center">
                            <Calendar className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="text-3xl font-bold text-blue-600">{stats.eventsCreated}</div>
                        <div className="text-sm text-gray-600 mt-1">אירועים נוצרו</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6 text-center">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-green-100 flex items-center justify-center">
                            <CheckSquare className="w-6 h-6 text-green-600" />
                        </div>
                        <div className="text-3xl font-bold text-green-600">{stats.tasksCompleted}</div>
                        <div className="text-sm text-gray-600 mt-1">משימות הושלמו</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6 text-center">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-purple-100 flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-purple-600" />
                        </div>
                        <div className="text-3xl font-bold text-purple-600">{stats.completionRate}%</div>
                        <div className="text-sm text-gray-600 mt-1">אחוז השלמת משימות</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6 text-center">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-orange-100 flex items-center justify-center">
                            <MessageSquare className="w-6 h-6 text-orange-600" />
                        </div>
                        <div className="text-3xl font-bold text-orange-600">{stats.totalTasks}</div>
                        <div className="text-sm text-gray-600 mt-1">סה"כ משימות</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">ההישגים הבאים שלך</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <Achievement
                        title="מארגן מנוסה"
                        description="צור 5 אירועים והשלם 20 משימות"
                        current={stats.eventsCreated}
                        target={5}
                        completed={stats.eventsCreated >= 5 && stats.tasksCompleted >= 20}
                    />
                    <Achievement
                        title="מתכנן מקצועי"
                        description="צור 10 אירועים והשלם 50 משימות"
                        current={stats.eventsCreated}
                        target={10}
                        completed={stats.eventsCreated >= 10 && stats.tasksCompleted >= 50}
                    />
                </CardContent>
            </Card>
        </div>
    );
}

function Achievement({ title, description, current, target, completed }) {
    const progress = Math.min((current / target) * 100, 100);

    return (
        <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <p className="font-medium text-gray-900">{title}</p>
                    <p className="text-sm text-gray-600">{description}</p>
                </div>
                {completed && (
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                        <CheckSquare className="w-5 h-5 text-green-600" />
                    </div>
                )}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                    className={`h-2 rounded-full transition-all ${completed ? 'bg-green-500' : 'bg-orange-500'}`}
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );
}
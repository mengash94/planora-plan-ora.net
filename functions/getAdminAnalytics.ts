import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
        }

        const { startDate, endDate } = await req.json();

        // Build date filter
        const dateFilter = {};
        if (startDate) {
            dateFilter.created_date = { $gte: startDate };
        }
        if (endDate) {
            if (dateFilter.created_date) {
                dateFilter.created_date.$lte = endDate;
            } else {
                dateFilter.created_date = { $lte: endDate };
            }
        }

        // Fetch all events
        const allEvents = await base44.asServiceRole.entities.Event.list();
        
        // Filter events by date if needed
        const events = startDate || endDate 
            ? allEvents.filter(e => {
                const createdDate = new Date(e.created_date);
                if (startDate && createdDate < new Date(startDate)) return false;
                if (endDate && createdDate > new Date(endDate)) return false;
                return true;
            })
            : allEvents;

        // 1. Event Creation Methods
        const aiCreated = events.filter(e => e.created_with_ai === true).length;
        const templateCreated = events.filter(e => e.template_id && !e.created_with_ai).length;
        const manualCreated = events.filter(e => !e.created_with_ai && !e.template_id).length;

        // 2. Template Usage (Popular Templates)
        const templateUsage = {};
        const templatesData = await base44.asServiceRole.entities.EventTemplate.list();
        const templateMap = {};
        templatesData.forEach(t => {
            templateMap[t.id] = t.title;
            templateUsage[t.title] = 0;
        });

        events.forEach(e => {
            if (e.template_id && templateMap[e.template_id]) {
                templateUsage[templateMap[e.template_id]]++;
            }
        });

        // 3. Event Joins (Users joining existing events)
        const allMembers = await base44.asServiceRole.entities.EventMember.list();
        const membersFiltered = startDate || endDate
            ? allMembers.filter(m => {
                const createdDate = new Date(m.created_date);
                if (startDate && createdDate < new Date(startDate)) return false;
                if (endDate && createdDate > new Date(endDate)) return false;
                return true;
            })
            : allMembers;

        const eventJoins = membersFiltered.filter(m => m.role === 'member').length;

        // 4. User Activity & Retention
        const allUsers = await base44.asServiceRole.entities.User.list();
        const userActivities = await base44.asServiceRole.entities.UserActivity.list();
        
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // Active users (had activity in last 30 days)
        const activeUserIds = new Set(
            userActivities
                .filter(a => new Date(a.created_date) > thirtyDaysAgo)
                .map(a => a.userId)
        );

        // Recently active (last 7 days)
        const recentlyActiveUserIds = new Set(
            userActivities
                .filter(a => new Date(a.created_date) > sevenDaysAgo)
                .map(a => a.userId)
        );

        // Returning users (users with multiple login sessions)
        const userLoginCounts = {};
        userActivities
            .filter(a => a.activityType === 'login')
            .forEach(a => {
                userLoginCounts[a.userId] = (userLoginCounts[a.userId] || 0) + 1;
            });

        const returningUsers = Object.values(userLoginCounts).filter(count => count > 1).length;
        const oneTimeUsers = Object.values(userLoginCounts).filter(count => count === 1).length;

        // Churned users (registered but no activity in 30+ days)
        const churnedUsers = allUsers.filter(u => {
            const userActivitiesForUser = userActivities.filter(a => a.userId === u.id);
            if (userActivitiesForUser.length === 0) return true;
            
            const lastActivity = userActivitiesForUser.reduce((latest, a) => {
                const activityDate = new Date(a.created_date);
                return activityDate > latest ? activityDate : latest;
            }, new Date(0));

            return lastActivity < thirtyDaysAgo;
        }).length;

        // 5. Activity Types Breakdown
        const activityTypesCounts = {};
        userActivities.forEach(a => {
            activityTypesCounts[a.activityType] = (activityTypesCounts[a.activityType] || 0) + 1;
        });

        // 6. Tasks Completed
        const allTasks = await base44.asServiceRole.entities.Task.list();
        const tasksFiltered = startDate || endDate
            ? allTasks.filter(t => {
                const createdDate = new Date(t.created_date);
                if (startDate && createdDate < new Date(startDate)) return false;
                if (endDate && createdDate > new Date(endDate)) return false;
                return true;
            })
            : allTasks;

        const completedTasks = tasksFiltered.filter(t => t.status === 'done').length;
        const totalTasks = tasksFiltered.length;

        // 7. Event Status Distribution
        const activeEvents = events.filter(e => e.status === 'active').length;
        const completedEvents = events.filter(e => e.status === 'completed').length;
        const cancelledEvents = events.filter(e => e.status === 'cancelled').length;

        // 8. Daily Activity Trend (last 30 days)
        const dailyActivity = {};
        for (let i = 0; i < 30; i++) {
            const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const dateStr = date.toISOString().split('T')[0];
            dailyActivity[dateStr] = 0;
        }

        userActivities
            .filter(a => new Date(a.created_date) > thirtyDaysAgo)
            .forEach(a => {
                const dateStr = new Date(a.created_date).toISOString().split('T')[0];
                if (dailyActivity[dateStr] !== undefined) {
                    dailyActivity[dateStr]++;
                }
            });

        // 9. User Growth Over Time
        const userGrowth = {};
        allUsers.forEach(u => {
            const dateStr = new Date(u.created_date).toISOString().split('T')[0];
            userGrowth[dateStr] = (userGrowth[dateStr] || 0) + 1;
        });

        // 10. Average events per user
        const eventsByUser = {};
        events.forEach(e => {
            eventsByUser[e.owner_id] = (eventsByUser[e.owner_id] || 0) + 1;
        });
        const avgEventsPerUser = allUsers.length > 0 
            ? events.length / allUsers.length 
            : 0;

        return Response.json({
            success: true,
            data: {
                // Summary Stats
                totalUsers: allUsers.length,
                totalEvents: events.length,
                totalTasks: totalTasks,
                completedTasks,
                totalEventJoins: eventJoins,

                // Event Creation Methods
                eventCreationMethods: {
                    ai: aiCreated,
                    template: templateCreated,
                    manual: manualCreated
                },

                // Template Usage
                templateUsage,
                topTemplates: Object.entries(templateUsage)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([name, count]) => ({ name, count })),

                // User Engagement
                userEngagement: {
                    activeUsers: activeUserIds.size,
                    recentlyActive: recentlyActiveUserIds.size,
                    returningUsers,
                    oneTimeUsers,
                    churnedUsers,
                    retentionRate: allUsers.length > 0 
                        ? ((activeUserIds.size / allUsers.length) * 100).toFixed(1)
                        : 0
                },

                // Activity Types
                activityTypes: activityTypesCounts,

                // Event Status
                eventStatus: {
                    active: activeEvents,
                    completed: completedEvents,
                    cancelled: cancelledEvents
                },

                // Trends
                dailyActivity: Object.entries(dailyActivity)
                    .sort((a, b) => a[0].localeCompare(b[0]))
                    .map(([date, count]) => ({ date, count })),

                userGrowth: Object.entries(userGrowth)
                    .sort((a, b) => a[0].localeCompare(b[0]))
                    .map(([date, count]) => ({ date, count })),

                // Insights
                insights: {
                    avgEventsPerUser: avgEventsPerUser.toFixed(2),
                    taskCompletionRate: totalTasks > 0 
                        ? ((completedTasks / totalTasks) * 100).toFixed(1)
                        : 0,
                    aiAdoptionRate: events.length > 0
                        ? ((aiCreated / events.length) * 100).toFixed(1)
                        : 0
                }
            }
        });

    } catch (error) {
        console.error('[getAdminAnalytics] Error:', error);
        return Response.json({ 
            error: error.message || 'Failed to fetch analytics' 
        }, { status: 500 });
    }
});
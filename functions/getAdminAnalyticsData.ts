import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const INSTABACK_API_URL = 'https://instaback.ai/project/f78de3ce-0cab-4ccb-8442-0c5749792fe8/api';

async function fetchFromInstaback(endpoint, token) {
    const response = await fetch(`${INSTABACK_API_URL}${endpoint}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
            'accept': 'application/json'
        }
    });
    
    if (!response.ok) {
        console.warn(`[getAdminAnalyticsData] Failed to fetch ${endpoint}: ${response.status}`);
        return [];
    }
    
    const data = await response.json();
    return Array.isArray(data) ? data : (data?.items || []);
}

Deno.serve(async (req) => {
    try {
        // Use INSTABACK_TOKEN from environment
        const token = Deno.env.get('INSTABACK_TOKEN');
        
        if (!token) {
            console.error('[getAdminAnalyticsData] INSTABACK_TOKEN not set');
            return Response.json({ error: 'No authentication token configured' }, { status: 401 });
        }
        
        console.log('[getAdminAnalyticsData] Using INSTABACK_TOKEN from environment');

        // Parse request body for date filters
        let startDate = null;
        let endDate = null;
        try {
            const body = await req.json();
            startDate = body.startDate;
            endDate = body.endDate;
        } catch (e) {
            // No body or invalid JSON - use defaults
        }

        console.log('[getAdminAnalyticsData] Fetching data with filters:', { startDate, endDate });

        // Fetch all data from InstaBack in parallel
        const [users, events, tasks, eventMembers, analyticsEvents, eventTemplates] = await Promise.all([
            fetchFromInstaback('/User', token),
            fetchFromInstaback('/Event', token),
            fetchFromInstaback('/Task', token),
            fetchFromInstaback('/EventMember', token),
            fetchFromInstaback('/AnalyticsEvent', token),
            fetchFromInstaback('/EventTemplate', token)
        ]);

        console.log('[getAdminAnalyticsData] Raw counts:', {
            users: users.length,
            events: events.length,
            tasks: tasks.length,
            eventMembers: eventMembers.length,
            analyticsEvents: analyticsEvents.length,
            eventTemplates: eventTemplates.length
        });

        // Normalize analytics events (handle nested data field)
        const normalizedAnalyticsEvents = analyticsEvents.map(e => ({
            eventType: e.eventType ?? e.data?.eventType,
            timestamp: e.timestamp ?? e.data?.timestamp ?? e.created_date,
            userId: e.userId ?? e.data?.userId ?? e.created_by_id,
            metadata: e.metadata ?? e.data?.metadata ?? {}
        }));

        // Filter analytics events by date if provided
        let filteredAnalyticsEvents = normalizedAnalyticsEvents;
        if (startDate || endDate) {
            filteredAnalyticsEvents = normalizedAnalyticsEvents.filter(e => {
                const eventTime = new Date(e.timestamp).getTime();
                if (startDate && eventTime < new Date(startDate).getTime()) return false;
                if (endDate && eventTime > new Date(endDate).getTime()) return false;
                return true;
            });
        }

        // Calculate metrics
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // User metrics
        const totalUsers = users.length;
        const androidUsers = users.filter(u => u.app === 'android').length;
        const iosUsers = users.filter(u => u.app === 'ios').length;
        const webUsers = users.filter(u => !u.app || u.app === 'web').length;

        // New users (last 30 days)
        const newUsers = users.filter(u => {
            const createdDate = new Date(u.created_date || u.createdAt || 0);
            return createdDate >= thirtyDaysAgo;
        }).length;

        // Active users (logged in last 7 days) - based on analytics events
        const recentLogins = filteredAnalyticsEvents.filter(e => 
            (e.eventType === 'user_login' || e.eventType === 'user_returned') && 
            new Date(e.timestamp) >= sevenDaysAgo
        );
        const activeUserIds = new Set(recentLogins.map(e => e.userId).filter(Boolean));
        const activeUsers = activeUserIds.size;

        // Churned users
        const churnedUsers = Math.max(0, totalUsers - activeUsers - newUsers);

        // Returning users
        const returningUsers = filteredAnalyticsEvents.filter(e => e.eventType === 'user_returned').length;

        // Event creation metrics
        const eventsCreatedByAI = filteredAnalyticsEvents.filter(e => e.eventType === 'event_created_ai').length;
        const eventsCreatedManually = filteredAnalyticsEvents.filter(e => e.eventType === 'event_created_manual').length;
        const eventsCreatedWithTemplate = filteredAnalyticsEvents.filter(e => e.eventType === 'event_created_template').length;

        // Join statistics
        const totalJoins = filteredAnalyticsEvents.filter(e => e.eventType === 'event_joined').length;

        // Users with events
        const usersWithEventsSet = new Set(eventMembers.map(m => m.userId || m.user_id).filter(Boolean));
        const usersWithEvents = usersWithEventsSet.size;
        const usersWithoutEvents = Math.max(0, totalUsers - usersWithEvents);

        // Average events per user
        let avgEventsPerUser = 0;
        if (usersWithEvents > 0) {
            const eventCounts = {};
            eventMembers.forEach(m => {
                const uid = m.userId || m.user_id;
                if (uid) eventCounts[uid] = (eventCounts[uid] || 0) + 1;
            });
            const totalEventsCount = Object.values(eventCounts).reduce((sum, count) => sum + count, 0);
            avgEventsPerUser = (totalEventsCount / usersWithEvents).toFixed(1);
        }

        // Template usage
        const templateUsage = {};
        filteredAnalyticsEvents.filter(e => e.eventType === 'event_created_template').forEach(e => {
            const templateName = e.metadata?.templateName || e.metadata?.templateId || 'Unknown';
            templateUsage[templateName] = (templateUsage[templateName] || 0) + 1;
        });

        const popularTemplates = Object.entries(templateUsage)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        // Top events by joins
        const eventJoinCounts = {};
        filteredAnalyticsEvents.filter(e => e.eventType === 'event_joined').forEach(e => {
            const eventId = e.metadata?.eventId;
            const eventTitle = e.metadata?.eventTitle || 'Unknown Event';
            if (eventId) {
                if (!eventJoinCounts[eventId]) {
                    eventJoinCounts[eventId] = { eventId, title: eventTitle, joins: 0 };
                }
                eventJoinCounts[eventId].joins++;
            }
        });

        const topEvents = Object.values(eventJoinCounts)
            .sort((a, b) => b.joins - a.joins)
            .slice(0, 10);

        // Daily timeline (last 30 days)
        const timeline = {};
        filteredAnalyticsEvents.forEach(e => {
            const eventDate = new Date(e.timestamp);
            if (eventDate >= thirtyDaysAgo) {
                const dateKey = eventDate.toISOString().split('T')[0];
                if (!timeline[dateKey]) {
                    timeline[dateKey] = {
                        date: dateKey,
                        ai: 0,
                        manual: 0,
                        template: 0,
                        joins: 0,
                        logins: 0
                    };
                }
                
                if (e.eventType === 'event_created_ai') timeline[dateKey].ai++;
                if (e.eventType === 'event_created_manual') timeline[dateKey].manual++;
                if (e.eventType === 'event_created_template') timeline[dateKey].template++;
                if (e.eventType === 'event_joined') timeline[dateKey].joins++;
                if (e.eventType === 'user_login' || e.eventType === 'user_returned') timeline[dateKey].logins++;
            }
        });

        const timelineArray = Object.values(timeline).sort((a, b) => 
            new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        // Build response
        const response = {
            success: true,
            
            // User metrics
            totalUsers,
            androidUsers,
            iosUsers,
            webUsers,
            newUsers,
            activeUsers,
            churnedUsers,
            returningUsers,
            
            // Event creation metrics
            eventsCreatedByAI,
            eventsCreatedManually,
            eventsCreatedWithTemplate,
            totalJoins,
            
            // Engagement metrics
            usersWithEvents,
            usersWithoutEvents,
            avgEventsPerUser,
            
            // Additional data
            popularTemplates,
            topEvents,
            timeline: timelineArray,
            
            // Raw counts for debugging
            debug: {
                totalAnalyticsEvents: analyticsEvents.length,
                filteredAnalyticsEvents: filteredAnalyticsEvents.length,
                totalEvents: events.length,
                totalTasks: tasks.length,
                totalEventMembers: eventMembers.length
            }
        };

        console.log('[getAdminAnalyticsData] Response summary:', {
            totalUsers: response.totalUsers,
            activeUsers: response.activeUsers,
            eventsCreatedByAI: response.eventsCreatedByAI,
            totalJoins: response.totalJoins
        });

        return Response.json(response);

    } catch (error) {
        console.error('[getAdminAnalyticsData] Error:', error);
        return Response.json({ 
            success: false,
            error: error.message || 'Failed to get analytics data' 
        }, { status: 500 });
    }
});
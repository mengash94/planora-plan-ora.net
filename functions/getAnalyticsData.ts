import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify user is admin
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ success: false, error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    let startDate, endDate;
    try {
      const body = await req.json();
      startDate = body.startDate;
      endDate = body.endDate;
    } catch (parseError) {
      startDate = null;
      endDate = null;
    }

    // Build query filter
    const filter = {};
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = startDate;
      if (endDate) filter.timestamp.$lte = endDate;
    }

    // Fetch all analytics events (admin access)
    const rawEvents = await base44.asServiceRole.entities.AnalyticsEvent.filter(filter);
    // Normalize possible nested 'data' shape
    const events = rawEvents.map(e => ({
      eventType: e.eventType ?? e.data?.eventType,
      timestamp: e.timestamp ?? e.data?.timestamp ?? e.created_date,
      userId: e.userId ?? e.data?.userId ?? e.created_by_id,
      metadata: e.metadata ?? e.data?.metadata ?? {}
    }));
    
    // Fetch all users for retention analysis
    let users = [];
    try {
      users = await base44.asServiceRole.entities.User.list();
    } catch (_err) {
      users = [];
    }

    // Calculate metrics
    const metrics = {
      totalEvents: events.length,
      totalUsers: users.length,
      
      // Event creation by method
      eventsCreatedByAI: events.filter(e => e.eventType === 'event_created_ai').length,
      eventsCreatedManually: events.filter(e => e.eventType === 'event_created_manual').length,
      eventsCreatedWithTemplate: events.filter(e => e.eventType === 'event_created_template').length,
      
      // Join statistics
      totalJoins: events.filter(e => e.eventType === 'event_joined').length,
      
      // User activity
      totalLogins: events.filter(e => e.eventType === 'user_login').length,
      returningUsers: events.filter(e => e.eventType === 'user_returned').length,
      
      // Platform distribution
      androidUsers: users.filter(u => u.app === 'android').length,
      iosUsers: users.filter(u => u.app === 'ios').length,
      webUsers: users.filter(u => !u.app || u.app === 'web').length,
      
      // Template usage breakdown
      templateUsage: {},
      
      // Timeline data (last 30 days)
      timeline: {},
      
      // User retention data
      activeUsers: 0,
      churnedUsers: 0,
      newUsers: 0,
      
      // Top events
      topEvents: [],
      
      // Most popular templates
      popularTemplates: [],
      
      // Average events per user
      avgEventsPerUser: 0,
      
      // Engagement metrics
      usersWithEvents: 0,
      usersWithoutEvents: 0
    };

    // Calculate template usage
    events.filter(e => e.eventType === 'event_created_template').forEach(e => {
      const templateName = e.metadata?.templateName || e.metadata?.templateId || 'Unknown';
      metrics.templateUsage[templateName] = (metrics.templateUsage[templateName] || 0) + 1;
    });

    // Sort templates by popularity
    metrics.popularTemplates = Object.entries(metrics.templateUsage)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate daily timeline (last 30 days)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    events.forEach(e => {
      const eventDate = new Date(e.timestamp);
      if (eventDate >= thirtyDaysAgo) {
        const dateKey = eventDate.toISOString().split('T')[0];
        if (!metrics.timeline[dateKey]) {
          metrics.timeline[dateKey] = {
            date: dateKey,
            ai: 0,
            manual: 0,
            template: 0,
            joins: 0,
            logins: 0
          };
        }
        
        if (e.eventType === 'event_created_ai') metrics.timeline[dateKey].ai++;
        if (e.eventType === 'event_created_manual') metrics.timeline[dateKey].manual++;
        if (e.eventType === 'event_created_template') metrics.timeline[dateKey].template++;
        if (e.eventType === 'event_joined') metrics.timeline[dateKey].joins++;
        if (e.eventType === 'user_login' || e.eventType === 'user_returned') metrics.timeline[dateKey].logins++;
      }
    });

    // Convert timeline to array and sort by date
    metrics.timeline = Object.values(metrics.timeline).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Calculate user retention (active vs churned)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgoDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const recentLogins = events.filter(e => 
      (e.eventType === 'user_login' || e.eventType === 'user_returned') && 
      new Date(e.timestamp) >= sevenDaysAgo
    );
    const activeUserIds = new Set(recentLogins.map(e => e.userId));
    metrics.activeUsers = activeUserIds.size;

    // Calculate new users (created in last 30 days)
    metrics.newUsers = users.filter(u => {
      const createdDate = new Date(u.created_date || u.createdAt || 0);
      return createdDate >= thirtyDaysAgoDate;
    }).length;

    // Churned users = total users - active users - new users
    metrics.churnedUsers = Math.max(0, users.length - metrics.activeUsers - metrics.newUsers);

    // Fallback when User entity is empty (use events-based estimation)
    if (users.length === 0) {
      const userIdsFromEvents = Array.from(new Set(events.map(e => e.userId).filter(Boolean)));
      metrics.totalUsers = userIdsFromEvents.length;
      // Platform distribution unknown without user records
      metrics.androidUsers = 0;
      metrics.iosUsers = 0;
      metrics.webUsers = 0;

      const userFirstSeen = {};
      events.forEach(e => {
        if (e.userId && e.timestamp) {
          const ts = new Date(e.timestamp).getTime();
          if (!userFirstSeen[e.userId] || ts < userFirstSeen[e.userId]) {
            userFirstSeen[e.userId] = ts;
          }
        }
      });
      metrics.newUsers = Object.values(userFirstSeen).filter(ts => ts >= thirtyDaysAgoDate.getTime()).length;
      metrics.churnedUsers = Math.max(0, metrics.totalUsers - metrics.activeUsers - metrics.newUsers);
    }

    // Top events by joins
    const eventJoinCounts = {};
    events.filter(e => e.eventType === 'event_joined').forEach(e => {
      const eventId = e.metadata?.eventId;
      const eventTitle = e.metadata?.eventTitle || 'Unknown Event';
      if (eventId) {
        if (!eventJoinCounts[eventId]) {
          eventJoinCounts[eventId] = { eventId, title: eventTitle, joins: 0 };
        }
        eventJoinCounts[eventId].joins++;
      }
    });

    metrics.topEvents = Object.values(eventJoinCounts)
      .sort((a, b) => b.joins - a.joins)
      .slice(0, 10);

    // Calculate engagement metrics
    const allEventMembers = await base44.asServiceRole.entities.EventMember.list();
    const usersWithEventsSet = new Set(allEventMembers.map(m => m.userId || m.user_id).filter(Boolean));
    metrics.usersWithEvents = usersWithEventsSet.size;
    metrics.usersWithoutEvents = Math.max(0, metrics.totalUsers - metrics.usersWithEvents);
    
    // Average events per user
    if (metrics.usersWithEvents > 0) {
      const eventCounts = {};
      allEventMembers.forEach(m => {
        const uid = m.userId || m.user_id;
        if (uid) eventCounts[uid] = (eventCounts[uid] || 0) + 1;
      });
      const totalEventsCount = Object.values(eventCounts).reduce((sum, count) => sum + count, 0);
      metrics.avgEventsPerUser = (totalEventsCount / metrics.usersWithEvents).toFixed(1);
    }

    // Return comprehensive analytics
    return Response.json({
      success: true,
      metrics,
      rawEvents: events
    });

  } catch (error) {
    console.error('[getAnalyticsData] Error:', error);
    return Response.json({ 
      success: false,
      error: error.message || 'Failed to get analytics data' 
    }, { status: 500 });
  }
});
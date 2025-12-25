import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify user is admin
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    const url = new URL(req.url);
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    // Build query filter
    const filter = {};
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = startDate;
      if (endDate) filter.timestamp.$lte = endDate;
    }

    // Fetch all analytics events (admin access)
    const events = await base44.asServiceRole.entities.AnalyticsEvent.filter(filter);
    
    // Fetch all users for retention analysis
    const users = await base44.asServiceRole.entities.User.list();

    // Calculate metrics
    const metrics = {
      totalEvents: events.length,
      
      // Event creation by method
      eventsCreatedByAI: events.filter(e => e.eventType === 'event_created_ai').length,
      eventsCreatedManually: events.filter(e => e.eventType === 'event_created_manual').length,
      eventsCreatedWithTemplate: events.filter(e => e.eventType === 'event_created_template').length,
      
      // Join statistics
      totalJoins: events.filter(e => e.eventType === 'event_joined').length,
      
      // User activity
      totalLogins: events.filter(e => e.eventType === 'user_login').length,
      returningUsers: events.filter(e => e.eventType === 'user_returned').length,
      
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
      popularTemplates: []
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

    // Return comprehensive analytics
    return Response.json({
      success: true,
      metrics,
      rawEvents: events // Include raw events for detailed analysis
    });

  } catch (error) {
    console.error('[getAnalyticsData] Error:', error);
    return Response.json({ 
      error: error.message || 'Failed to get analytics data' 
    }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // בדיקת הרשאות אדמין
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { startDate, endDate } = await req.json();

    // המרת תאריכים לאובייקטי Date
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // ברירת מחדל: 30 יום אחורה
    const end = endDate ? new Date(endDate) : new Date();

    // שימוש ב-service role לגישה לכל הנתונים
    const serviceClient = base44.asServiceRole;

    // 1. אחזור כל האירועים עם המידע על יצירתם
    const allEvents = await serviceClient.entities.Event.list();
    const eventsInRange = allEvents.filter(e => {
      const created = new Date(e.created_date);
      return created >= start && created <= end;
    });

    // 2. ספירת יצירות לפי סוג (AI vs ידני vs תבנית)
    let aiCreated = 0;
    let manualCreated = 0;
    let templateCreated = 0;
    const templateUsage = {}; // מפה של תבנית למספר שימושים

    for (const event of eventsInRange) {
      // בדיקה אם האירוע נוצר מתבנית
      if (event.template_id) {
        templateCreated++;
        templateUsage[event.template_id] = (templateUsage[event.template_id] || 0) + 1;
      } 
      // בדיקה אם האירוע נוצר עם AI (נניח שיש שדה ai_generated או דרך אחרת לזהות)
      else if (event.ai_generated || event.description?.includes('AI')) {
        aiCreated++;
      } 
      // אחרת - יצירה ידנית
      else {
        manualCreated++;
      }
    }

    // 3. אחזור תבניות פופולריות
    const templates = await serviceClient.entities.EventTemplate.list();
    const popularTemplates = templates
      .map(t => ({
        id: t.id,
        title: t.title,
        category: t.category,
        usageCount: templateUsage[t.id] || 0
      }))
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 10);

    // 4. ספירת הצטרפויות לאירועים קיימים (EventMember)
    const allMembers = await serviceClient.entities.EventMember.list();
    const membersInRange = allMembers.filter(m => {
      const joined = new Date(m.created_date);
      return joined >= start && joined <= end && m.role !== 'organizer';
    });
    const joinsCount = membersInRange.length;

    // 5. משתמשים חוזרים ונטישה
    const allUsers = await serviceClient.entities.User.list();
    const userActivities = await serviceClient.entities.UserActivity.list();
    
    // חישוב משתמשים פעילים (התחברו בטווח)
    const activeUserIds = new Set();
    const loginActivities = userActivities.filter(a => 
      a.activityType === 'login' && 
      new Date(a.created_date) >= start && 
      new Date(a.created_date) <= end
    );
    loginActivities.forEach(a => activeUserIds.add(a.userId));

    // חישוב retention - משתמשים שנרשמו לפני הטווח וחזרו בטווח
    const usersRegisteredBefore = allUsers.filter(u => new Date(u.created_date) < start);
    const returningUsers = usersRegisteredBefore.filter(u => activeUserIds.has(u.id));
    const retentionRate = usersRegisteredBefore.length > 0 
      ? (returningUsers.length / usersRegisteredBefore.length * 100).toFixed(1)
      : 0;

    // חישוב נטישה - משתמשים שלא התחברו ב-30 הימים האחרונים
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentLogins = userActivities.filter(a => 
      a.activityType === 'login' && 
      new Date(a.created_date) >= thirtyDaysAgo
    );
    const recentActiveUserIds = new Set(recentLogins.map(a => a.userId));
    const abandonedUsers = allUsers.filter(u => 
      new Date(u.created_date) < thirtyDaysAgo && 
      !recentActiveUserIds.has(u.id)
    );

    // 6. משימות שהושלמו
    const allTasks = await serviceClient.entities.Task.list();
    const completedTasksInRange = allTasks.filter(t => {
      if (t.status !== 'done') return false;
      const updated = new Date(t.updated_date || t.created_date);
      return updated >= start && updated <= end;
    });

    // 7. פעילויות לפי סוג
    const activitiesInRange = userActivities.filter(a => {
      const created = new Date(a.created_date);
      return created >= start && created <= end;
    });

    const activityBreakdown = {};
    activitiesInRange.forEach(a => {
      activityBreakdown[a.activityType] = (activityBreakdown[a.activityType] || 0) + 1;
    });

    // 8. מגמות יומיות - יצירת אירועים לפי יום
    const dailyEventCreation = {};
    eventsInRange.forEach(e => {
      const date = new Date(e.created_date).toISOString().split('T')[0];
      dailyEventCreation[date] = (dailyEventCreation[date] || 0) + 1;
    });

    // 9. מגמות יומיות - התחברויות
    const dailyLogins = {};
    loginActivities.forEach(a => {
      const date = new Date(a.created_date).toISOString().split('T')[0];
      dailyLogins[date] = (dailyLogins[date] || 0) + 1;
    });

    // 10. משתמשים חדשים בטווח
    const newUsers = allUsers.filter(u => {
      const created = new Date(u.created_date);
      return created >= start && created <= end;
    });

    // החזרת כל הנתונים
    return Response.json({
      summary: {
        totalEvents: eventsInRange.length,
        aiCreated,
        manualCreated,
        templateCreated,
        joinsCount,
        completedTasks: completedTasksInRange.length,
        activeUsers: activeUserIds.size,
        newUsers: newUsers.length,
        returningUsers: returningUsers.length,
        retentionRate: `${retentionRate}%`,
        abandonedUsers: abandonedUsers.length,
        totalUsers: allUsers.length
      },
      popularTemplates,
      activityBreakdown,
      dailyEventCreation,
      dailyLogins,
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString()
      }
    });

  } catch (error) {
    console.error('Analytics error:', error);
    return Response.json({ 
      error: error.message,
      details: error.stack 
    }, { status: 500 });
  }
});
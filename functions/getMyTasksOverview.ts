import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch all event memberships for the user
    const memberEntries = await base44.asServiceRole.entities.EventMember.filter({ 
      user_id: user.id 
    });
    
    if (!memberEntries || memberEntries.length === 0) {
      return Response.json({ groupedTasks: {}, allTasks: [] });
    }

    const eventIds = memberEntries.map(m => m.event_id);

    // 2. Fetch events first to ensure we have all event details
    const events = await base44.asServiceRole.entities.Event.filter({ 
      id: { $in: eventIds } 
    });
    
    // Create events map for quick lookup
    const eventsMap = events.reduce((acc, event) => {
        acc[event.id] = event.title;
        return acc;
    }, {});

    // 3. Fetch all tasks for those events, but only for existing events
    const existingEventIds = events.map(e => e.id);
    const allTasks = await base44.asServiceRole.entities.Task.filter({ 
      event_id: { $in: existingEventIds } 
    });

    // 4. Group tasks by event - only for existing events
    const tasksByEvent = allTasks.reduce((acc, task) => {
        const eventTitle = eventsMap[task.event_id];
        if (eventTitle) { // רק אם האירוע קיים
            if (!acc[task.event_id]) {
                acc[task.event_id] = { title: eventTitle, tasks: [] };
            }
            acc[task.event_id].tasks.push(task);
        }
        return acc;
    }, {});

    return Response.json({ 
      groupedTasks: tasksByEvent, 
      allTasks: allTasks.filter(task => eventsMap[task.event_id]) // רק משימות מאירועים קיימים
    });

  } catch (error) {
    console.error('getMyTasksOverview error:', error);
    return Response.json({ 
      error: 'Internal server error', 
      details: error?.message || 'Unknown error' 
    }, { status: 500 });
  }
});
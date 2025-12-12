Deno.serve(async (req) => {
  try {
    // קבל את פרטי המשתמש
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('Missing Authorization header');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await req.json().catch(() => ({}));
    if (!userId) {
      console.log('Missing userId in request body');
      return Response.json({ error: 'Missing userId' }, { status: 400 });
    }

    console.log('Loading personal tasks for user:', userId);

    // הגדרות InstaBack
    const INSTABACK_BASE = 'https://instaback.ai/project/f78de3ce-0cab-4ccb-8442-0c5749792fe8/api';
    
    const fetchWithAuth = async (endpoint) => {
      console.log(`Fetching: ${INSTABACK_BASE}${endpoint}`);
      const response = await fetch(`${INSTABACK_BASE}${endpoint}`, {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
          'accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error(`API Error ${response.status}: ${errorText}`);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json().catch(() => ({}));
      return data;
    };

    // 1. קבל את כל החברויות של המשתמש
    let memberships = [];
    try {
      memberships = await fetchWithAuth(`/EventMember?userId=${encodeURIComponent(userId)}`);
      console.log('Memberships loaded:', memberships?.length || 0);
    } catch (error) {
      console.warn('Failed to load memberships:', error.message);
      return Response.json({
        myTasks: [],
        tasksByEvent: {}
      });
    }
    
    if (!Array.isArray(memberships) || memberships.length === 0) {
      console.log('No memberships found for user');
      return Response.json({
        myTasks: [],
        tasksByEvent: {}
      });
    }

    const eventIds = memberships.map(m => m.eventId || m.EventId).filter(Boolean);
    console.log('User is member of events:', eventIds);
    
    if (eventIds.length === 0) {
      return Response.json({
        myTasks: [],
        tasksByEvent: {}
      });
    }

    // 2. טען את כל המשימות מהאירועים שהמשתמש חבר בהם
    const allTasks = [];
    for (const eventId of eventIds) {
      try {
        const eventTasks = await fetchWithAuth(`/Task?eventId=${encodeURIComponent(eventId)}`);
        if (Array.isArray(eventTasks)) {
          console.log(`Event ${eventId} has ${eventTasks.length} tasks:`, eventTasks);
          allTasks.push(...eventTasks);
        }
      } catch (error) {
        console.warn(`Failed to load tasks for event ${eventId}:`, error.message);
        continue;
      }
    }

    console.log('Total tasks loaded:', allTasks.length);
    console.log('All tasks data:', JSON.stringify(allTasks, null, 2));

    // 3. סנן משימות רלוונטיות - רק משימות שמשויכות למשתמש או כלליות
    const myTasks = allTasks.filter(task => {
      const assigneeId = task.assigneeId || task.assignee_id;
      const isAssignedToMe = assigneeId === userId;
      const isGeneral = !assigneeId;
      
      console.log(`Task ${task.id} (${task.title}):`, {
        assigneeId,
        userId,
        isAssignedToMe,
        isGeneral,
        shouldInclude: isAssignedToMe || isGeneral
      });
      
      return isAssignedToMe || isGeneral;
    });

    console.log('Filtered tasks count:', myTasks.length);
    console.log('Filtered tasks:', JSON.stringify(myTasks, null, 2));

    // 4. קבץ לפי אירועים
    const tasksByEvent = {};
    
    // טען פרטי אירועים
    const eventsMap = new Map();
    for (const eventId of eventIds) {
      try {
        const event = await fetchWithAuth(`/Event/${eventId}`);
        if (event && event.id) {
          eventsMap.set(event.id, event.title || event.name || 'אירוע ללא שם');
        }
      } catch (error) {
        console.warn(`Failed to load event ${eventId}:`, error.message);
        eventsMap.set(eventId, 'אירוע לא ידוע');
      }
    }

    // קבץ משימות לפי אירוע
    myTasks.forEach(task => {
      const eventId = task.eventId || task.event_id;
      if (!tasksByEvent[eventId]) {
        tasksByEvent[eventId] = {
          eventTitle: eventsMap.get(eventId) || 'אירוע לא ידוע',
          tasks: []
        };
      }
      tasksByEvent[eventId].tasks.push(task);
    });

    console.log('Final result:', {
      totalTasks: myTasks.length,
      eventCount: Object.keys(tasksByEvent).length,
      tasksByEvent
    });

    return Response.json({
      myTasks: myTasks || [],
      tasksByEvent: tasksByEvent || {}
    });

  } catch (error) {
    console.error('getMyTasks critical error:', error);
    return Response.json({ 
      error: error.message || 'Internal server error',
      myTasks: [],
      tasksByEvent: {}
    }, { status: 500 });
  }
});
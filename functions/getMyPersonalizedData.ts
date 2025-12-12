Deno.serve(async (req) => {
  try {
    // קבל את פרטי המשתמש מה-headers
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return Response.json({ error: 'No auth header' }, { status: 401 });
    }

    // כאן צריך לממש אימות עם InstaBack
    // לעת עתה, נקבל את user ID מה-request או מה-token
    const { userId } = await req.json().catch(() => ({}));
    
    if (!userId) {
      return Response.json({ 
        error: 'Missing userId',
        events: [],
        allTasks: [],
        myTasks: [],
        recentMessages: []
      }, { status: 400 });
    }

    console.log('Loading personalized data for user:', userId);

    // תיקון: השתמש ב-InstaBack API calls במקום Base44
    const INSTABACK_BASE = 'https://instaback.ai/project/f78de3ce-0cab-4ccb-8442-0c5749792fe8/api';
    
    const fetchWithAuth = async (endpoint) => {
      const response = await fetch(`${INSTABACK_BASE}${endpoint}`, {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return response.json();
    };

    // 1. טען חברויות של המשתמש
    const memberships = await fetchWithAuth(`/EventMember?userId=${userId}`);
    
    if (!memberships || memberships.length === 0) {
      return Response.json({
        events: [],
        allTasks: [],
        myTasks: [],
        recentMessages: []
      });
    }

    const eventIds = memberships.map(m => m.eventId || m.EventId).filter(Boolean);
    console.log('User is member of events:', eventIds);

    // 2. טען אירועים
    const eventsPromises = eventIds.map(eventId => 
      fetchWithAuth(`/Event/${eventId}`).catch(err => {
        console.warn(`Failed to load event ${eventId}:`, err);
        return null;
      })
    );
    
    const eventsResults = await Promise.all(eventsPromises);
    const events = eventsResults.filter(Boolean);

    // 3. טען משימות מהאירועים
    const allTasksPromises = eventIds.map(eventId =>
      fetchWithAuth(`/Task?eventId=${eventId}`).catch(() => [])
    );
    
    const allTasksArrays = await Promise.all(allTasksPromises);
    const allTasks = allTasksArrays.flat();

    // 4. סנן משימות שמשויכות למשתמש או כלליות
    const myTasks = allTasks.filter(task => 
      task.assigneeId === userId || !task.assigneeId
    );

    // 5. טען הודעות אחרונות מ-3 אירועים אחרונים
    const recentEventIds = eventIds.slice(0, 3);
    const messagesPromises = recentEventIds.map(eventId =>
      fetchWithAuth(`/Message?eventId=${eventId}`).catch(() => [])
    );
    
    const messagesArrays = await Promise.all(messagesPromises);
    const allMessages = messagesArrays.flat();
    
    // סנן הודעות של אחרים ומיין לפי תאריך
    const recentMessages = allMessages
      .filter(msg => (msg.userId || msg.UserId) !== userId)
      .sort((a, b) => new Date(b.createdAt || b.CreatedAt) - new Date(a.createdAt || a.CreatedAt))
      .slice(0, 10);

    // הוסף שמות אירועים להודעות
    const eventsMap = new Map(events.map(e => [e.id, e.title || e.name]));
    const messagesWithEventNames = recentMessages.map(msg => ({
      ...msg,
      eventTitle: eventsMap.get(msg.eventId || msg.EventId) || 'אירוע לא ידוע'
    }));

    console.log('Returning personalized data:', {
      eventsCount: events.length,
      allTasksCount: allTasks.length,
      myTasksCount: myTasks.length,
      messagesCount: messagesWithEventNames.length
    });

    return Response.json({
      events: events || [],
      allTasks: allTasks || [],
      myTasks: myTasks || [],
      recentMessages: messagesWithEventNames || []
    });

  } catch (error) {
    console.error('getMyPersonalizedData error:', error);
    return Response.json({ 
      error: error.message,
      events: [],
      allTasks: [],
      myTasks: [],
      recentMessages: []
    }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify user is authenticated
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventType, metadata = {} } = await req.json();

    if (!eventType) {
      return Response.json({ error: 'eventType is required' }, { status: 400 });
    }

    // Valid event types
    const validTypes = [
      'event_created_ai',
      'event_created_manual', 
      'event_created_template',
      'event_joined',
      'user_login',
      'user_returned'
    ];

    if (!validTypes.includes(eventType)) {
      return Response.json({ error: 'Invalid eventType' }, { status: 400 });
    }

    // Create analytics event using service role
    const analyticsEvent = await base44.asServiceRole.entities.AnalyticsEvent.create({
      eventType,
      userId: user.id,
      metadata,
      timestamp: new Date().toISOString()
    });

    console.log('[trackAnalyticsEvent] Created:', analyticsEvent);

    return Response.json({ 
      success: true, 
      analyticsEventId: analyticsEvent.id 
    });

  } catch (error) {
    console.error('[trackAnalyticsEvent] Error:', error);
    return Response.json({ 
      error: error.message || 'Failed to track analytics event' 
    }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Parse request body first
    let eventType, metadata;
    try {
      const body = await req.json();
      eventType = body.eventType;
      metadata = body.metadata || {};
    } catch (parseError) {
      return Response.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    if (!eventType) {
      return Response.json({ success: false, error: 'eventType is required' }, { status: 400 });
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
      return Response.json({ success: false, error: 'Invalid eventType' }, { status: 400 });
    }

    // Try to get user, but don't fail if not authenticated
    let userId;
    try {
      const user = await base44.auth.me();
      userId = user?.id;
    } catch (authError) {
      console.warn('[trackAnalyticsEvent] Auth skipped:', authError);
      userId = 'anonymous';
    }

    // Create analytics event using service role
    const analyticsEvent = await base44.asServiceRole.entities.AnalyticsEvent.create({
      eventType,
      userId: userId || 'anonymous',
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
      success: false,
      error: error.message || 'Failed to track analytics event' 
    }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId } = await req.json();
    if (!eventId) {
      return Response.json({ error: 'eventId is required' }, { status: 400 });
    }

    console.log('📖 Marking chat as read for user:', user.id, 'event:', eventId);

    // Find user's membership in this event
    const memberships = await base44.asServiceRole.entities.EventMember.filter({
      user_id: user.id,
      event_id: eventId
    });

    const membership = memberships[0];
    if (!membership) {
      console.log('📖 Membership not found');
      return Response.json({ error: 'Membership not found' }, { status: 404 });
    }

    // Update last seen timestamp to now
    const now = new Date().toISOString();
    await base44.asServiceRole.entities.EventMember.update(membership.id, {
      last_seen_message_timestamp: now
    });

    console.log('📖 Updated last seen timestamp to:', now);
    
    return Response.json({ success: true });

  } catch (error) {
    console.error('📖 markChatAsRead error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
});
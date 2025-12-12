import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (req.method !== 'POST') {
      return Response.json({ error: 'Method Not Allowed' }, { status: 405 });
    }

    const { pollId } = await req.json().catch(() => ({}));
    if (!pollId || typeof pollId !== 'string') {
      return Response.json({ error: 'Missing pollId' }, { status: 400 });
    }

    // Load poll
    const poll = await base44.asServiceRole.entities.Poll.get(pollId).catch(() => null);
    if (!poll) {
      return Response.json({ error: 'Poll not found' }, { status: 404 });
    }

    // Load event for permission checks
    const event = await base44.asServiceRole.entities.Event.get(poll.event_id).catch(() => null);
    if (!event) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }

    // Check permissions: owner or manager
    const isOwner = event.owner_id === user.id;
    let isManager = false;
    if (!isOwner) {
      const membership = await base44.asServiceRole.entities.EventMember.filter(
        { event_id: poll.event_id, user_id: user.id },
        '-created_date',
        1
      ).catch(() => []);
      isManager = Array.isArray(membership) && membership.some(m => ['owner', 'manager'].includes(m.role));
    }

    if (!isOwner && !isManager) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    await base44.asServiceRole.entities.Poll.delete(pollId);

    return Response.json({ success: true });
  } catch (error) {
    console.error('deletePoll error:', error);
    return Response.json({ error: 'Internal server error', details: error?.message || 'Unknown error' }, { status: 500 });
  }
});
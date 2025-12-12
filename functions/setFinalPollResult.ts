import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId, pollId, optionId } = await req.json();
    if (!eventId || !pollId || !optionId) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Verify user is manager/owner of the event
    const event = await base44.asServiceRole.entities.Event.get(eventId);
    const membership = await base44.asServiceRole.entities.EventMember.filter({ event_id: eventId, user_id: user.id });
    const isOwner = event && event.owner_id === user.id;
    const isManager = membership.some(m => ['owner', 'manager'].includes(m.role));
    
    if (!isOwner && !isManager) {
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // 2. Get the poll and the selected option
    const poll = await base44.asServiceRole.entities.Poll.get(pollId);
    if (!poll || poll.event_id !== eventId) {
      return Response.json({ error: 'Poll not found or does not belong to this event' }, { status: 404 });
    }

    const selectedOption = poll.options.find(opt => opt.id === optionId);
    if (!selectedOption) {
      return Response.json({ error: 'Option not found' }, { status: 404 });
    }

    // 3. Update the event based on poll type
    const updates = {};
    if (poll.type === 'date' && selectedOption.date) {
      updates.event_date = selectedOption.date;
      updates.status = 'final';
    } else if (poll.type === 'location' && selectedOption.text) {
      updates.location = selectedOption.text;
    }

    if (Object.keys(updates).length > 0) {
      await base44.asServiceRole.entities.Event.update(eventId, updates);
    }
    
    // 4. Deactivate the poll
    await base44.asServiceRole.entities.Poll.update(pollId, { is_active: false });

    return Response.json({ success: true, message: 'Poll result set as final.' });

  } catch (error) {
    console.error('setFinalPollResult error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
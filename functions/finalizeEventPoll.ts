import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pollId, optionId } = await req.json();
    if (!pollId || !optionId) {
      return Response.json({ error: 'Missing pollId or optionId' }, { status: 400 });
    }

    // Load poll and verify permissions
    const poll = await base44.asServiceRole.entities.Poll.get(pollId);
    if (!poll) {
      return Response.json({ error: 'Poll not found' }, { status: 404 });
    }

    // Check if user is event manager
    const memberships = await base44.asServiceRole.entities.EventMember.filter({
      event_id: poll.event_id,
      user_id: user.id
    });

    const event = await base44.asServiceRole.entities.Event.get(poll.event_id);
    const isOwner = event?.owner_id === user.id;
    const isManager = memberships.length > 0 && (memberships[0].role === 'manager' || memberships[0].role === 'owner');

    if (!isOwner && !isManager) {
      return Response.json({ error: 'Only event managers can finalize polls' }, { status: 403 });
    }

    // Find the selected option
    const selectedOption = poll.options?.find(opt => opt.id === optionId);
    if (!selectedOption) {
      return Response.json({ error: 'Option not found' }, { status: 400 });
    }

    // Update poll with final result
    const finalResult = {
      option_id: optionId,
      decided_by: user.id,
      decided_at: new Date().toISOString()
    };

    await base44.asServiceRole.entities.Poll.update(pollId, {
      final_result: finalResult,
      is_active: false
    });

    // Update event based on poll type
    const eventUpdates = {};
    
    if (poll.type === 'date' && selectedOption.date) {
      eventUpdates.event_date = selectedOption.date;
    } else if (poll.type === 'location' && (selectedOption.location || selectedOption.text)) {
      eventUpdates.location = selectedOption.location || selectedOption.text;
    }

    if (Object.keys(eventUpdates).length > 0) {
      await base44.asServiceRole.entities.Event.update(poll.event_id, eventUpdates);
    }

    return Response.json({ 
      success: true, 
      finalResult,
      eventUpdates 
    });

  } catch (error) {
    console.error('finalizeEventPoll error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
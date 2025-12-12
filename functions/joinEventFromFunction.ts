import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // 1) Auth
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2) Method check
    if (req.method !== 'POST' && req.method !== 'GET') {
      return Response.json({ error: 'Method Not Allowed' }, { status: 405 });
    }

    // 3) Extract eventId from body or query
    let eventId = null;
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      eventId = (body?.eventId ?? body?.id ?? '').toString().trim();
    } else { // GET
      const url = new URL(req.url);
      eventId = (url.searchParams.get('eventId') ?? url.searchParams.get('id') ?? '').toString().trim();
    }

    if (!eventId || eventId === 'null' || eventId === 'undefined' || eventId.length === 0) {
      return Response.json({ error: 'Missing or invalid eventId' }, { status: 400 });
    }

    // 4) Fetch event robustly (service role)
    let event = null;
    try {
      event = await base44.asServiceRole.entities.Event.get(eventId);
    } catch (_e) {
      // ignore and try filter fallback
    }

    if (!event) {
        const candidates = await base44.asServiceRole.entities.Event.filter({ id: eventId }, '', 1).catch(() => []);
        if (Array.isArray(candidates) && candidates.length > 0) {
            event = candidates[0];
        }
    }
    
    if (!event) {
        return Response.json(
            { error: 'Event not found', details: { eventId } },
            { status: 404 }
        );
    }

    // 5) Check if already a member
    const existing = await base44.asServiceRole.entities.EventMember.filter({
      event_id: eventId,
      user_id: user.id
    }).catch(() => []);

    if (!existing || existing.length === 0) {
      // Create new membership
      await base44.asServiceRole.entities.EventMember.create({
        event_id: eventId,
        user_id: user.id,
        role: 'member'
      });
      console.log(`User ${user.id} joined event ${eventId} successfully`);
    } else {
      console.log(`User ${user.id} is already a member of event ${eventId}`);
    }

    return Response.json({ success: true, message: 'Successfully joined event' });
  } catch (error) {
    console.error('Error in joinEventFromFunction:', error);
    return Response.json(
      { error: 'Internal error joining event', details: error?.message || String(error) },
      { status: 500 }
    );
  }
});
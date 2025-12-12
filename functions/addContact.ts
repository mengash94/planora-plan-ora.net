import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contactData = await req.json();
    const eventId = contactData?.event_id;

    if (!eventId) {
      return Response.json({ error: 'Event ID is required' }, { status: 400 });
    }

    // Final, most robust permission check using service role to fetch data
    const event = await base44.asServiceRole.entities.Event.get(eventId).catch(() => null);
    if (!event) {
        return Response.json({ error: 'Event not found' }, { status: 404 });
    }

    const isDirectOwner = event.owner_id === user.id;

    let hasPrivilegedRole = false;
    if (!isDirectOwner) {
        const membership = await base44.asServiceRole.entities.EventMember.filter({
            user_id: user.id,
            event_id: eventId,
            role: { $in: ['owner', 'manager'] }
        }).then(res => res[0]);
        hasPrivilegedRole = !!membership;
    }
    
    if (!isDirectOwner && !hasPrivilegedRole) {
      return Response.json({ error: 'Forbidden: You must be an owner or manager to add contacts.' }, { status: 403 });
    }

    const completeContactData = {
      ...contactData,
      invited_by: user.id,
    };
    
    // Perform the creation using service role to bypass any potential RLS issues
    const newContact = await base44.asServiceRole.entities.Contact.create(completeContactData);

    return Response.json(newContact);

  } catch (error) {
    console.error('addContact function error:', error);
    return Response.json({ 
      error: 'Internal server error', 
      details: error?.message || 'Unknown error' 
    }, { status: 500 });
  }
});
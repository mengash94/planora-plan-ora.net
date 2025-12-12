import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contactId } = await req.json();
    if (!contactId) {
      return Response.json({ error: 'Contact ID is required' }, { status: 400 });
    }

    // Get the contact to check permissions
    const contact = await base44.asServiceRole.entities.Contact.get(contactId).catch(() => null);
    if (!contact) {
      return Response.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Check if user has permission to delete (must be owner or manager of the event)
    const event = await base44.asServiceRole.entities.Event.get(contact.event_id).catch(() => null);
    if (!event) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }

    const isDirectOwner = event.owner_id === user.id;

    let hasPrivilegedRole = false;
    if (!isDirectOwner) {
      const membership = await base44.asServiceRole.entities.EventMember.filter({
        user_id: user.id,
        event_id: contact.event_id,
        role: { $in: ['owner', 'manager'] }
      }).then(res => res[0]);
      hasPrivilegedRole = !!membership;
    }
    
    if (!isDirectOwner && !hasPrivilegedRole) {
      return Response.json({ error: 'Forbidden: You must be an owner or manager to delete contacts.' }, { status: 403 });
    }

    // Delete the contact
    await base44.asServiceRole.entities.Contact.delete(contactId);

    return Response.json({ success: true });

  } catch (error) {
    console.error('deleteContact function error:', error);
    return Response.json({ 
      error: 'Internal server error', 
      details: error?.message || 'Unknown error' 
    }, { status: 500 });
  }
});
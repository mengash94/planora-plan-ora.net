import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Must be authenticated
    const me = await base44.auth.me();
    if (!me) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can use this endpoint
    if (me.role !== 'admin') {
      return Response.json({ error: 'Forbidden: admin only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const userId = body?.userId;
    if (!userId) {
      return Response.json({ error: 'Missing userId' }, { status: 400 });
    }

    // 1) Find events owned by this user
    const ownedEvents = await base44.asServiceRole.entities.Event.filter(
      { owner_id: userId },
      '-created_date',
      500
    );

    // 2) For each owned event, ensure at least one manager exists (other than the user being deleted)
    for (const ev of (ownedEvents || [])) {
      // Get members of the event
      const members = await base44.asServiceRole.entities.EventMember.filter(
        { event_id: ev.id },
        '-created_date',
        500
      );

      // Exclude the user being deleted
      const otherMembers = (members || []).filter(m => m.user_id !== userId);

      // If already has manager/owner among others, nothing to do
      const hasManager = otherMembers.some(m => ['manager', 'owner'].includes(m.role));
      if (!hasManager && otherMembers.length > 0) {
        // Pick a random member and promote to manager
        const chosen = pickRandom(otherMembers);
        if (chosen && chosen.role !== 'manager' && chosen.role !== 'owner') {
          await base44.asServiceRole.entities.EventMember.update(chosen.id, { role: 'manager' });
        }
      }
      // Note: לא מעבירים בעלות אירוע, אלא רק דואגים שיש מנהל זמין.
    }

    // 3) Remove all memberships of the user (cleanup)
    const memberships = await base44.asServiceRole.entities.EventMember.filter(
      { user_id: userId },
      '-created_date',
      1000
    );
    for (const m of (memberships || [])) {
      await base44.asServiceRole.entities.EventMember.delete(m.id);
    }

    // 4) Delete the user
    await base44.asServiceRole.entities.User.delete(userId);

    return Response.json({ success: true });
  } catch (error) {
    console.error('adminDeleteUserWithReassign error:', error);
    return Response.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
});
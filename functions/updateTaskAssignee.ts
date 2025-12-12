import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const taskId = body?.taskId;
    const assigneeId = body?.assigneeId;

    if (!taskId || !assigneeId) {
      return Response.json({ error: 'Missing taskId or assigneeId' }, { status: 400 });
    }

    // Load task and related event
    const task = await base44.asServiceRole.entities.Task.get(taskId).catch(() => null);
    if (!task) {
      return Response.json({ error: 'Task not found' }, { status: 404 });
    }

    const event = await base44.asServiceRole.entities.Event.get(task.event_id).catch(() => null);
    if (!event) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }

    // Admin can proceed
    const isAdmin = user.role === 'admin';

    // Check membership and role
    const membership = await base44.asServiceRole.entities.EventMember.filter(
      { event_id: task.event_id, user_id: user.id },
      '-created_date',
      1
    ).catch(() => []);
    const myRole = membership?.[0]?.role || 'member';
    const isOwner = event.owner_id === user.id;
    const isManager = myRole === 'manager' || myRole === 'owner';

    if (!(isAdmin || isOwner || isManager)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Optional: verify the new assignee is a member of the same event
    const assigneeMembership = await base44.asServiceRole.entities.EventMember.filter(
      { event_id: task.event_id, user_id: assigneeId },
      '-created_date',
      1
    ).catch(() => []);
    if (!assigneeMembership?.length) {
      return Response.json({ error: 'Assignee must be a member of the event' }, { status: 400 });
    }

    const updated = await base44.asServiceRole.entities.Task.update(taskId, { assignee_id: assigneeId });
    return Response.json(updated);
  } catch (error) {
    console.error('updateTaskAssignee error:', error);
    return Response.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
});
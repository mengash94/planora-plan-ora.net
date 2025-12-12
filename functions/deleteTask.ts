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
    if (!taskId) {
      return Response.json({ error: 'Missing taskId' }, { status: 400 });
    }

    const task = await base44.asServiceRole.entities.Task.get(taskId).catch(() => null);
    if (!task) {
      return Response.json({ error: 'Task not found' }, { status: 404 });
    }

    const event = await base44.asServiceRole.entities.Event.get(task.event_id).catch(() => null);
    const membership = await base44.asServiceRole.entities.EventMember.filter(
      { event_id: task.event_id, user_id: user.id },
      '-created_date',
      1
    ).catch(() => []);

    const myRole = membership?.[0]?.role || 'member';
    const isOwner = event && event.owner_id === user.id;
    const isManager = myRole === 'manager' || myRole === 'owner';
    const isCreator = task.created_by === user.email;
    const isAssignee = task.assignee_id === user.id;

    const canDelete = isOwner || isManager || isCreator || isAssignee;
    if (!canDelete) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    await base44.asServiceRole.entities.Task.delete(taskId);
    return Response.json({ success: true });
  } catch (error) {
    console.error('deleteTask error:', error);
    return Response.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
});
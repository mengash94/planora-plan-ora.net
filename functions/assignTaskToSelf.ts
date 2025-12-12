import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { taskId } = await req.json();
    if (!taskId) {
      return Response.json({ error: 'Missing taskId' }, { status: 400 });
    }

    // Get the task and verify user is a member of the event
    const task = await base44.asServiceRole.entities.Task.get(taskId);
    if (!task) {
      return Response.json({ error: 'Task not found' }, { status: 404 });
    }

    const members = await base44.asServiceRole.entities.EventMember.filter({
      event_id: task.event_id,
      user_id: user.id
    });

    if (members.length === 0) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Allow user to assign task to themselves
    const updatedTask = await base44.asServiceRole.entities.Task.update(taskId, { 
      assignee_id: user.id 
    });
    
    return Response.json(updatedTask);

  } catch (error) {
    console.error('assignTaskToSelf error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

// Import the service directly to call InstaBack endpoints from the backend function
import { createNotification, getEventDetails, getCurrentUser } from '../components/instabackService.js';


Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { taskId, newStatus } = await req.json();
    if (!taskId || !newStatus) {
      return Response.json({ error: 'Missing taskId or newStatus' }, { status: 400 });
    }

    // Use service role to get the task and check permissions
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
    
    // Permission check: owner, manager, or assignee can update
    const event = await base44.asServiceRole.entities.Event.get(task.event_id);
    const myRole = members[0].role;
    const isOwner = event.owner_id === user.id;
    const canUpdate = isOwner || myRole === 'manager' || task.assignee_id === user.id;

    if (!canUpdate) {
        return Response.json({ error: 'Forbidden: You do not have permission to update this task.' }, { status: 403 });
    }

    const updatedTask = await base44.asServiceRole.entities.Task.update(taskId, { status: newStatus });

    if (updatedTask && newStatus === 'done') {
      try {
        const [currentUser, eventDetails] = await Promise.all([
          getCurrentUser().catch(() => null),
          getEventDetails(updatedTask.eventId || updatedTask.event_id).catch(() => null)
        ]);
        
        if (currentUser && eventDetails && eventDetails.ownerId) {
            await createNotification({
                userId: eventDetails.ownerId,
                type: 'task_completed',
                title: 'משימה הושלמה',
                message: `${currentUser.name || currentUser.firstName || 'מישהו'} השלים את המשימה "${updatedTask.title}" באירוע "${eventDetails.title || eventDetails.name}"`,
                eventId: eventDetails.id,
                relatedId: updatedTask.id,
                actionUrl: `/EventDetail?id=${eventDetails.id}&tab=tasks`,
                priority: 'normal'
            });
        }
      } catch (notificationError) {
        console.warn('Failed to create task completion notification:', notificationError);
      }
    }

    return Response.json(updatedTask);

  } catch (error) {
    console.error('updateTaskStatus error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
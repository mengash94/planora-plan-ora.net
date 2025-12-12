import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    // ONLY use Base44 SDK for authentication, everything else via InstaBack API
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { taskId, updates } = await req.json();
    if (!taskId) {
      return Response.json({ error: 'Missing taskId' }, { status: 400 });
    }

    console.log('Updating task:', { taskId, updates, userId: user.id });

    // Use InstaBack API token from environment
    const instabackToken = Deno.env.get('INSTABACK_TOKEN');
    if (!instabackToken) {
      return Response.json({ error: 'InstaBack token not configured' }, { status: 500 });
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${instabackToken}`,
      'accept': 'application/json'
    };

    // קבלת המשימה הקיימת
    const taskResponse = await fetch(`https://instaback.ai/project/f78de3ce-0cab-4ccb-8442-0c5749792fe8/api/Task/${taskId}`, {
      method: 'GET',
      headers
    });

    if (!taskResponse.ok) {
      return Response.json({ error: 'Task not found' }, { status: 404 });
    }

    const currentTask = await taskResponse.json();
    console.log('Current task:', currentTask);

    // עדכון המשימה עם השדות הנכונים (camelCase כפי שמופיע בschema)
    const updatePayload = {};
    if (updates.assigneeId !== undefined) updatePayload.assigneeId = updates.assigneeId;
    if (updates.status !== undefined) updatePayload.status = updates.status;
    if (updates.title !== undefined) updatePayload.title = updates.title;
    if (updates.description !== undefined) updatePayload.description = updates.description;

    const updateResponse = await fetch(`https://instaback.ai/project/f78de3ce-0cab-4ccb-8442-0c5749792fe8/api/Task/${taskId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updatePayload)
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('Failed to update task:', errorText);
      return Response.json({ error: `Failed to update task: ${errorText}` }, { status: updateResponse.status });
    }

    const updatedTask = await updateResponse.json();
    console.log('Updated task:', updatedTask);

    // בדיקה אם שויכה משימה למישהו (רק אם השיוך השתנה)
    if (updates.assigneeId && updates.assigneeId !== currentTask.assigneeId) {
      console.log('Task assigned to:', updates.assigneeId);
      
      // קבלת פרטי האירוע
      const eventResponse = await fetch(`https://instaback.ai/project/f78de3ce-0cab-4ccb-8442-0c5749792fe8/api/Event/${currentTask.eventId}`, {
        method: 'GET',
        headers
      });

      const event = eventResponse.ok ? await eventResponse.json() : null;
      
      try {
        const notificationPayload = {
          userId: updates.assigneeId,
          type: 'task_assigned',
          title: 'שויכה לך משימה חדשה',
          message: `המשימה "${currentTask.title}" שויכה לך באירוע "${event?.title || 'האירוע'}"`,
          eventId: currentTask.eventId,
          relatedId: taskId,
          actionUrl: `/EventDetail?id=${currentTask.eventId}&tab=tasks&taskId=${taskId}`,
          priority: 'normal'
        };

        console.log('Creating notification:', notificationPayload);

        const notificationResponse = await fetch('https://instaback.ai/project/f78de3ce-0cab-4ccb-8442-0c5749792fe8/api/edge-function/createNotificationAndSendPush', {
          method: 'POST',
          headers,
          body: JSON.stringify(notificationPayload)
        });

        if (!notificationResponse.ok) {
          const errorText = await notificationResponse.text();
          console.warn('Failed to create task assignment notification:', errorText);
        } else {
          console.log('Task assignment notification created successfully');
        }
      } catch (notificationError) {
        console.warn('Failed to create task assignment notification:', notificationError);
      }
    }

    // בדיקה אם המשימה הושלמה
    if (updates.status === 'done' && currentTask.status !== 'done') {
      console.log('Task completed');
      // יצירת התראה על השלמת משימה - לרק לרלוונטיים (מנהלי האירוע)
      // TODO: implement task completion notification if needed
    }

    return Response.json(updatedTask);

  } catch (error) {
    console.error('updateTaskWithNotifications error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
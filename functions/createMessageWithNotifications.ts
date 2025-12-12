import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

// Helper to get current time in Israel timezone as ISO string
const getIsraelTime = () => {
  const now = new Date();
  // Convert to Israel timezone string, then parse back to create ISO
  const israelTimeString = now.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' });
  const israelDate = new Date(israelTimeString);
  
  // Format as ISO-like string without timezone indicator (server will treat as Israel time)
  const year = israelDate.getFullYear();
  const month = String(israelDate.getMonth() + 1).padStart(2, '0');
  const day = String(israelDate.getDate()).padStart(2, '0');
  const hours = String(israelDate.getHours()).padStart(2, '0');
  const minutes = String(israelDate.getMinutes()).padStart(2, '0');
  const seconds = String(israelDate.getSeconds()).padStart(2, '0');
  const ms = String(israelDate.getMilliseconds()).padStart(3, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${ms}`;
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId, content, fileUrl } = await req.json();
    if (!eventId || !content) {
      return Response.json({ error: 'Missing eventId or content' }, { status: 400 });
    }

    // Get current time in Israel timezone
    const israelTime = getIsraelTime();

    // יצירת ההודעה דרך InstaBack API ישירות
    const messagePayload = {
      eventId: eventId,
      userId: user.id,
      content: content,
      fileUrl: fileUrl || null,
      createdAt: israelTime // Set explicit Israel time
    };

    console.log('Creating message with notifications:', { eventId, content, userId: user.id, createdAt: israelTime });

    const messageResponse = await fetch('https://instaback.ai/project/f78de3ce-0cab-4ccb-8442-0c5749792fe8/api/Message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('INSTABACK_TOKEN')}`,
        'accept': 'application/json'
      },
      body: JSON.stringify(messagePayload)
    });

    if (!messageResponse.ok) {
      throw new Error(`Failed to create message: ${messageResponse.status}`);
    }

    const message = await messageResponse.json();
    console.log('Message created:', message);

    // קבלת חברי האירוע
    const membersResponse = await fetch(`https://instaback.ai/project/f78de3ce-0cab-4ccb-8442-0c5749792fe8/api/EventMember?eventId=${eventId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('INSTABACK_TOKEN')}`,
        'accept': 'application/json'
      }
    });

    if (membersResponse.ok) {
      const eventMembers = await membersResponse.json();
      
      // קבלת פרטי האירוע
      const eventResponse = await fetch(`https://instaback.ai/project/f78de3ce-0cab-4ccb-8442-0c5749792fe8/api/Event/${eventId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('INSTABACK_TOKEN')}`,
          'accept': 'application/json'
        }
      });

      const event = eventResponse.ok ? await eventResponse.json() : null;
      const eventTitle = event?.title || 'האירוע';

      // יצירת התראות
      const senderName = user.firstName || user.name || 'מישהו';
      const messagePreview = content.length > 50 ? content.substring(0, 50) + '...' : content;

      console.log('Creating notifications for members:', (Array.isArray(eventMembers) ? eventMembers : []).length);

      for (const member of (Array.isArray(eventMembers) ? eventMembers : [])) {
        // אל תשלח התראה לשולח עצמו
        if (member.userId === user.id || member.user_id === user.id) continue;

        try {
          const notificationPayload = {
            userId: member.userId || member.user_id,
            type: 'new_message',
            title: 'הודעה חדשה בצ\'אט',
            message: `${senderName}: ${messagePreview}`,
            eventId: eventId,
            actionUrl: `/EventChat?id=${eventId}`,
            priority: 'low',
            createdAt: israelTime // Set explicit Israel time for notification too
          };

          await fetch('https://instaback.ai/project/f78de3ce-0cab-4ccb-8442-0c5749792fe8/api/edge-function/createNotificationAndSendPush', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('INSTABACK_TOKEN')}`,
              'accept': 'application/json'
            },
            body: JSON.stringify({ params: notificationPayload })
          });

          console.log('Notification created for user:', member.userId || member.user_id);
        } catch (notificationError) {
          console.warn(`Failed to create notification for user ${member.userId || member.user_id}:`, notificationError);
        }
      }
    }

    return Response.json(message);

  } catch (error) {
    console.error('createMessageWithNotifications error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
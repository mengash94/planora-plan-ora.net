import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { userId, userEmail, userName } = await req.json();

    if (!userId || !userEmail) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log('📧 Notifying admins about new user:', { userId, userEmail, userName });

    // Get INSTABACK_TOKEN from environment
    const INSTABACK_TOKEN = Deno.env.get('INSTABACK_TOKEN');
    if (!INSTABACK_TOKEN) {
      console.error('INSTABACK_TOKEN not set');
      return Response.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Get all users from InstaBack
    const usersResponse = await fetch(
      'https://instaback.ai/project/f78de3ce-0cab-4ccb-8442-0c5749792fe8/api/User',
      {
        headers: {
          'Authorization': `Bearer ${INSTABACK_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!usersResponse.ok) {
      console.error('Failed to fetch users from InstaBack');
      return Response.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    const allUsers = await usersResponse.json();
    const admins = Array.isArray(allUsers) 
      ? allUsers.filter(u => u.role === 'admin')
      : [];

    console.log(`Found ${admins.length} admins to notify`);

    if (admins.length === 0) {
      return Response.json({ success: true, notified: 0, message: 'No admins found' });
    }

    // Create notifications and send push for each admin
    let notifiedCount = 0;
    
    for (const admin of admins) {
      try {
        console.log(`Notifying admin: ${admin.email}`);

        // Create notification in InstaBack
        const notificationResponse = await fetch(
          'https://instaback.ai/project/f78de3ce-0cab-4ccb-8442-0c5749792fe8/api/edge-function/createNotificationAndSendPush',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${INSTABACK_TOKEN}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              params: {
                userId: admin.id,
                type: 'member_joined',
                title: 'משתמש חדש נרשם 👤',
                message: `${userName || userEmail} הצטרף לאפליקציה`,
                actionUrl: `/AdminUsers`,
                priority: 'normal'
              }
            })
          }
        );

        if (!notificationResponse.ok) {
          console.error(`Failed to create notification for ${admin.email}:`, await notificationResponse.text());
          continue;
        }

        // Send push notification via Planora
        const pushResponse = await fetch(
          'https://instaback.ai/project/f78de3ce-0cab-4ccb-8442-0c5749792fe8/api/edge-function/send_planora_notification',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${INSTABACK_TOKEN}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              params: {
                userId: admin.id,
                title: 'משתמש חדש נרשם 👤',
                body: `${userName || userEmail} הצטרף לאפליקציה`,
                data: {
                  type: 'new_user',
                  userId: userId,
                  url: `/AdminUsers`
                },
                provider: 'onesignal'
              }
            })
          }
        );

        if (!pushResponse.ok) {
          console.error(`Failed to send push to ${admin.email}:`, await pushResponse.text());
        }

        notifiedCount++;
        console.log(`✅ Successfully notified admin: ${admin.email}`);

      } catch (adminError) {
        console.error(`Error notifying admin ${admin.email}:`, adminError);
      }
    }

    console.log(`Successfully notified ${notifiedCount}/${admins.length} admins`);

    return Response.json({ 
      success: true, 
      notified: notifiedCount,
      total: admins.length 
    });

  } catch (error) {
    console.error('notifyAdminsNewUser error:', error);
    return Response.json({ 
      error: 'Internal server error', 
      details: error?.message || 'Unknown error' 
    }, { status: 500 });
  }
});
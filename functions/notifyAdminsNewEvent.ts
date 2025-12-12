import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

const DEEPLINK_DOMAIN = 'register.plan-ora.net';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { eventId, eventTitle, creatorName } = await req.json();

    if (!eventId || !eventTitle) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get all admin users from Base44
    const allUsers = await base44.asServiceRole.entities.User.list();
    const adminUsers = allUsers.filter(u => {
      const role = (u.role || '').toString().toLowerCase();
      return role === 'admin' || role === 'superadmin' || role === 'owner';
    });

    console.log('Found admin users:', adminUsers.length);

    if (adminUsers.length === 0) {
      console.log('No admin users found to notify');
      return Response.json({ success: true, notified: 0 });
    }

    // Create InstaBack notifications for each admin
    const INSTABACK_TOKEN = Deno.env.get('INSTABACK_TOKEN');
    if (!INSTABACK_TOKEN) {
      console.error('INSTABACK_TOKEN not set');
      return Response.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const notifications = await Promise.all(
      adminUsers.map(async (admin) => {
        try {
          // Find matching InstaBack user by email
          const instabackUserRes = await fetch(
            `https://instaback.ai/project/f78de3ce-0cab-4ccb-8442-0c5749792fe8/api/User?email=${encodeURIComponent(admin.email)}`,
            {
              headers: {
                'Authorization': `Bearer ${INSTABACK_TOKEN}`,
                'Content-Type': 'application/json'
              }
            }
          );

          if (!instabackUserRes.ok) {
            console.warn(`Could not find InstaBack user for admin: ${admin.email}`);
            return null;
          }

          const instabackUsers = await instabackUserRes.json();
          const instabackUser = Array.isArray(instabackUsers) ? instabackUsers[0] : null;

          if (!instabackUser) {
            console.warn(`No InstaBack user found for admin: ${admin.email}`);
            return null;
          }

          // Create notification via InstaBack edge function with deeplink
          const notificationRes = await fetch(
            'https://instaback.ai/project/f78de3ce-0cab-4ccb-8442-0c5749792fe8/api/edge-function/createNotificationAndSendPush',
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${INSTABACK_TOKEN}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                params: {
                  userId: instabackUser.id,
                  type: 'new_event',
                  title: '🎉 אירוע חדש נוצר',
                  message: `${creatorName || 'משתמש'} יצר/ה את האירוע "${eventTitle}"`,
                  actionUrl: `https://${DEEPLINK_DOMAIN}/event/${eventId}`,
                  priority: 'normal'
                }
              })
            }
          );

          if (!notificationRes.ok) {
            console.error(`Failed to create notification for admin ${admin.email}:`, await notificationRes.text());
            return null;
          }

          return await notificationRes.json();
        } catch (error) {
          console.error(`Error notifying admin ${admin.email}:`, error);
          return null;
        }
      })
    );

    const successCount = notifications.filter(n => n !== null).length;
    console.log(`Successfully notified ${successCount}/${adminUsers.length} admins`);

    return Response.json({ 
      success: true, 
      notified: successCount,
      total: adminUsers.length 
    });

  } catch (error) {
    console.error('notifyAdminsNewEvent error:', error);
    return Response.json({ 
      error: 'Internal server error', 
      details: error?.message || 'Unknown error' 
    }, { status: 500 });
  }
});
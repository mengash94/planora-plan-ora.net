import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const currentUser = await base44.auth.me();

        if (!currentUser) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { userId, userName, userEmail, feedbackType, title, message } = await req.json();

        // Validate required fields
        if (!userId || !feedbackType || !title || !message) {
            return Response.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Ensure user can only submit feedback for themselves
        if (String(currentUser.id) !== String(userId)) {
            return Response.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Create feedback record in InstaBack
        const feedback = await base44.asServiceRole.entities.Feedback.create({
            userId,
            userName: userName || currentUser.name || currentUser.email,
            userEmail: userEmail || currentUser.email,
            feedbackType,
            title,
            message,
            status: 'new',
            priority: 'low'
        });

        console.log('✅ Feedback created:', feedback.id);

        // Get all admin users
        const allUsers = await base44.asServiceRole.entities.User.list();
        const admins = allUsers.filter(u => u.role === 'admin');

        console.log(`📧 Found ${admins.length} admin(s) to notify`);

        // Send OneSignal notification to each admin via Planora Alert
        const PLANORA_API_KEY = Deno.env.get('PLANORA_API_KEY');
        
        if (!PLANORA_API_KEY) {
            console.warn('⚠️ PLANORA_API_KEY not set, skipping notifications');
        } else {
            const notificationPromises = admins.map(async (admin) => {
                try {
                    const notificationPayload = {
                        userId: String(admin.id),
                        title: `💬 משוב חדש: ${title}`,
                        body: `${userName || userEmail} שלח משוב מסוג ${getFeedbackTypeLabel(feedbackType)}`,
                        data: {
                            type: 'new_feedback',
                            feedbackId: String(feedback.id),
                            feedbackType: feedbackType,
                            url: '/Profile#manage-feedback'
                        }
                    };

                    const response = await fetch(
                        'https://studio--planoraaleret-62152057-8e5b6.us-central1.hosted.app/api/notifications/send',
                        {
                            method: 'POST',
                            headers: {
                                'x-api-key': PLANORA_API_KEY,
                                'Content-Type': 'application/json',
                                'Accept': 'application/json'
                            },
                            body: JSON.stringify(notificationPayload)
                        }
                    );

                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(`HTTP ${response.status}: ${errorText}`);
                    }

                    const result = await response.json();
                    console.log(`✅ Notification sent to admin ${admin.email}:`, result);
                    return { success: true, adminEmail: admin.email };

                } catch (error) {
                    console.error(`❌ Failed to send notification to admin ${admin.email}:`, error.message);
                    return { success: false, adminEmail: admin.email, error: error.message };
                }
            });

            const notificationResults = await Promise.allSettled(notificationPromises);
            const successCount = notificationResults.filter(r => r.status === 'fulfilled' && r.value.success).length;
            
            console.log(`📊 Notifications sent: ${successCount}/${admins.length}`);
        }

        return Response.json({ 
            success: true, 
            feedback,
            message: 'המשוב נשלח בהצלחה והמנהלים קיבלו התראה'
        });

    } catch (error) {
        console.error('❌ Error in submitFeedbackWithNotification:', error);
        return Response.json({ 
            error: 'Internal server error',
            details: error.message 
        }, { status: 500 });
    }
});

function getFeedbackTypeLabel(type) {
    const labels = {
        'general': 'כללי',
        'suggestion': 'הצעה לשיפור',
        'bug_report': 'דיווח באג',
        'question': 'שאלה'
    };
    return labels[type] || type;
}
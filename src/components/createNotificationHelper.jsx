import { createNotificationAndSendPush } from './instabackService';

// Helper functions to create notifications for common events

export const notifyTaskAssigned = async ({ taskId, assigneeId, taskTitle, eventTitle, eventId }) => {
    if (!assigneeId || !taskTitle) return;
    
    try {
        console.log('Creating task assignment notification for:', assigneeId);
        await createNotificationAndSendPush({
            userId: assigneeId,
            type: 'task_assigned',
            title: 'שויכה לך משימה חדשה',
            message: `המשימה "${taskTitle}" שויכה לך באירוע "${eventTitle}"`,
            eventId: eventId,
            relatedId: taskId,
            actionUrl: `/EventDetail?id=${eventId}&tab=tasks&taskId=${taskId}`,
            priority: 'normal'
        });
        console.log('Task assignment notification created successfully');
    } catch (error) {
        console.warn('Failed to create task assignment notification:', error);
    }
};

export const notifyNewMessage = async ({ eventMembers, senderId, senderName, messagePreview, eventId, eventTitle }) => {
    if (!senderName || !Array.isArray(eventMembers) || !messagePreview) return;
    
    console.log('Creating message notifications for event:', eventId);
    
    // Get all members except the sender
    const otherMembers = eventMembers.filter(member => {
        const memberId = member.userId || member.user_id || member.id;
        return memberId && String(memberId) !== String(senderId);
    });
    
    console.log(`Sending notifications to ${otherMembers.length} members`);
    
    // Create notifications for other members (not the sender)
    for (const member of otherMembers) {
        try {
            const memberId = member.userId || member.user_id || member.id;
            if (memberId) {
                await createNotificationAndSendPush({
                    userId: String(memberId),
                    type: 'new_message',
                    title: 'הודעה חדשה בצ\'אט',
                    message: `${senderName}: ${messagePreview}`,
                    eventId: eventId,
                    actionUrl: `/EventChat?id=${eventId}`,
                    priority: 'low' // Low priority to not spam with push notifications
                });
                console.log('Message notification created for user:', memberId);
            }
        } catch (error) {
            console.warn(`Failed to create message notification for member ${member.id}:`, error);
        }
    }
};

export const notifyEventInvitation = async ({ userId, inviterName, eventTitle, eventId }) => {
    if (!userId || !eventTitle) return;
    
    try {
        await createNotification({
            userId: userId,
            type: 'event_invitation',
            title: 'הצטרפת לאירוע',
            message: `${inviterName || 'מישהו'} הזמין אותך לאירוע "${eventTitle}"`,
            eventId: eventId,
            actionUrl: `/EventDetail?id=${eventId}`,
            priority: 'high'
        });
    } catch (error) {
        console.warn('Failed to create event invitation notification:', error);
    }
};
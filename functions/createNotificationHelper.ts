import { createNotification } from '@/components/instabackService';

// Helper functions to create notifications for common events

const DEEPLINK_DOMAIN = 'register.plan-ora.net';

const createDeepLinkUrl = (path) => {
  return `https://${DEEPLINK_DOMAIN}${path}`;
};

export const notifyTaskAssigned = async ({ taskId, assigneeId, taskTitle, eventTitle, eventId }) => {
    if (!assigneeId || !taskTitle) return;
    
    try {
        await createNotification({
            userId: assigneeId,
            type: 'task_assigned',
            title: 'שויכה לך משימה חדשה',
            message: `המשימה "${taskTitle}" שויכה לך באירוע "${eventTitle}"`,
            eventId: eventId,
            relatedId: taskId,
            actionUrl: createDeepLinkUrl(`/event/${eventId}?tab=tasks&taskId=${taskId}`),
            priority: 'normal'
        });
    } catch (error) {
        console.warn('Failed to create task assignment notification:', error);
    }
};

export const notifyEventInvitation = async ({ userId, inviterName, eventTitle, eventId }) => {
    if (!userId || !eventTitle) return;
    
    try {
        await createNotification({
            userId: userId,
            type: 'event_invitation',
            title: 'קיבלת הזמנה לאירוע',
            message: `${inviterName || 'מישהו'} הזמין אותך לאירוע "${eventTitle}"`,
            eventId: eventId,
            actionUrl: createDeepLinkUrl(`/join/${eventId}`),
            priority: 'high'
        });
    } catch (error) {
        console.warn('Failed to create event invitation notification:', error);
    }
};

export const notifyMemberJoined = async ({ eventMembers, newMemberName, eventTitle, eventId }) => {
    if (!newMemberName || !Array.isArray(eventMembers)) return;
    
    // Notify all existing members (except the new member)
    for (const member of eventMembers) {
        if (member.role === 'owner' || member.role === 'manager') {
            try {
                await createNotification({
                    userId: member.userId,
                    type: 'member_joined',
                    title: 'משתתף חדש הצטרף',
                    message: `${newMemberName} הצטרף לאירוע "${eventTitle}"`,
                    eventId: eventId,
                    actionUrl: createDeepLinkUrl(`/event/${eventId}?tab=participants`),
                    priority: 'low'
                });
            } catch (error) {
                console.warn('Failed to create member joined notification:', error);
            }
        }
    }
};

export const notifyPollCreated = async ({ eventMembers, pollTitle, creatorName, eventTitle, eventId, pollId }) => {
    if (!pollTitle || !Array.isArray(eventMembers)) return;
    
    // Notify all members
    for (const member of eventMembers) {
        try {
            await createNotification({
                userId: member.userId,
                type: 'poll_created',
                title: 'סקר חדש נוצר',
                message: `${creatorName || 'מישהו'} יצר את הסקר "${pollTitle}" באירוע "${eventTitle}"`,
                eventId: eventId,
                relatedId: pollId,
                actionUrl: createDeepLinkUrl(`/event/${eventId}?tab=polls`),
                priority: 'normal'
            });
        } catch (error) {
            console.warn('Failed to create poll created notification:', error);
        }
    }
};

export const notifyTaskCompleted = async ({ taskId, taskTitle, completedByName, eventTitle, eventId, eventOwnerId }) => {
    if (!taskTitle || !eventOwnerId) return;
    
    try {
        await createNotification({
            userId: eventOwnerId,
            type: 'task_completed',
            title: 'משימה הושלמה',
            message: `${completedByName || 'מישהו'} השלים את המשימה "${taskTitle}" באירוע "${eventTitle}"`,
            eventId: eventId,
            relatedId: taskId,
            actionUrl: createDeepLinkUrl(`/event/${eventId}?tab=tasks`),
            priority: 'normal'
        });
    } catch (error) {
        console.warn('Failed to create task completed notification:', error);
    }
};
import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ unreadEvents: [], totalUnread: 0 });
    }

    console.log('📊 Getting unread messages for user:', user.id);

    // Get user memberships with timeout protection
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Operation timeout')), 3000)
    );

    const operation = async () => {
      try {
        // Get user's memberships - limit to recent events
        const memberships = await base44.asServiceRole.entities.EventMember.filter({
          user_id: user.id
        }, '-created_date', 10); // Limit to 10 most recent events
        
        console.log('📊 Found memberships:', memberships?.length || 0);
        
        if (!memberships || memberships.length === 0) {
          return { unreadEvents: [], totalUnread: 0 };
        }

        const eventIds = memberships.map(m => m.event_id).filter(Boolean);
        console.log('📊 Event IDs to check:', eventIds);
        
        if (eventIds.length === 0) {
          return { unreadEvents: [], totalUnread: 0 };
        }

        // Get all recent messages from these events (not from the user)
        const allMessages = await base44.asServiceRole.entities.Message.filter({
          event_id: { $in: eventIds },
          user_id: { $ne: user.id } // Not messages from current user
        }, '-created_date', 50); // Get more messages to check properly

        console.log('📊 Found messages:', allMessages?.length || 0);

        if (!allMessages || allMessages.length === 0) {
          return { unreadEvents: [], totalUnread: 0 };
        }

        let totalUnread = 0;
        const unreadByEvent = {};
        const membershipMap = new Map(memberships.map(m => [m.event_id, m]));

        // Group messages by event and count unread
        for (const message of allMessages) {
          const membership = membershipMap.get(message.event_id);
          if (!membership) continue;

          const lastSeenTimestamp = membership.last_seen_message_timestamp 
            ? new Date(membership.last_seen_message_timestamp) 
            : new Date(0); // If never seen, use epoch
          
          const messageTimestamp = new Date(message.created_date);

          if (messageTimestamp > lastSeenTimestamp) {
            if (!unreadByEvent[message.event_id]) {
              unreadByEvent[message.event_id] = { count: 0 };
            }
            unreadByEvent[message.event_id].count++;
            totalUnread++;
          }
        }

        console.log('📊 Final results - totalUnread:', totalUnread, 'unreadByEvent:', unreadByEvent);

        return { 
          unreadEvents: unreadByEvent,
          totalUnread: Math.min(totalUnread, 99) // Cap at 99 for display
        };

      } catch (operationError) {
        console.error('📊 Operation failed:', operationError);
        return { unreadEvents: [], totalUnread: 0 };
      }
    };

    // Run with timeout
    const result = await Promise.race([operation(), timeoutPromise]);
    return Response.json(result);

  } catch (error) {
    console.error('📊 getUnreadMessagesOverview error:', error);
    
    // Always return valid response to not break UI
    return Response.json({ 
      unreadEvents: [], 
      totalUnread: 0,
      error: 'Fallback response due to error'
    });
  }
});
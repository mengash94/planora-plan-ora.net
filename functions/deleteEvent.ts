import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // קרא את ה-body פעם אחת בלבד
    const requestBody = await req.json();
    const { eventId, deleteType } = requestBody;
    
    if (!eventId) {
      return Response.json({ error: 'Missing eventId' }, { status: 400 });
    }

    // Verify ownership before deletion
    const event = await base44.asServiceRole.entities.Event.get(eventId);
    if (!event) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }
    if (event.owner_id !== user.id) {
      return Response.json({ error: 'Forbidden: Only the owner can delete an event.' }, { status: 403 });
    }
    
    if (deleteType === 'cancel') {
      // ביטול האירוע - שמירת הנתונים אבל סימון כמבוטל
      await base44.asServiceRole.entities.Event.update(eventId, { 
        status: 'cancelled' 
      });
      
      return Response.json({ 
        success: true, 
        message: 'האירוע בוטל בהצלחה. כל הנתונים נשמרו.' 
      });
    }

    // מחיקה מלאה
    if (deleteType === 'full_delete') {
      // List of entities to clean up - עדכנתי את השמות לפי הentities שקיימים
      const relatedEntities = [
        { name: 'EventMember', field: 'event_id' },
        { name: 'Task', field: 'event_id' }, 
        { name: 'Poll', field: 'event_id' },
        { name: 'ItineraryItem', field: 'event_id' },
        { name: 'Message', field: 'event_id' },
        { name: 'MediaItem', field: 'event_id' },
        { name: 'Professional', field: 'event_id' },
        { name: 'EventLink', field: 'event_id' },
        { name: 'Contact', field: 'event_id' },
        { name: 'EventDocument', field: 'event_id' }
      ];

      // Delete all related data in parallel
      const deletionPromises = relatedEntities.map(async (entity) => {
        try {
          const items = await base44.asServiceRole.entities[entity.name].filter({ 
            [entity.field]: eventId 
          });
          
          if (items && items.length > 0) {
            const deletePromises = items.map(item => 
              base44.asServiceRole.entities[entity.name].delete(item.id)
            );
            await Promise.all(deletePromises);
            console.log(`Deleted ${items.length} ${entity.name} records`);
          }
        } catch (err) {
          console.log(`Failed to delete ${entity.name} for event ${eventId}:`, err);
        }
      });
      
      await Promise.allSettled(deletionPromises);

      // Finally, delete the event itself
      await base44.asServiceRole.entities.Event.delete(eventId);

      return Response.json({ 
        success: true, 
        message: 'האירוע וכל הנתונים הקשורים נמחקו לצמיתות.' 
      });
    }

    return Response.json({ error: 'Invalid deleteType parameter' }, { status: 400 });

  } catch (error) {
    console.error('deleteEvent function error:', error);
    return Response.json({
      error: 'Internal server error',
      details: error?.message || 'Unknown error'
    }, { status: 500 });
  }
});
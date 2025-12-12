import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // המשתמש יכול להיות לא מחובר, ננסה לקבל אותו אבל לא ניכשל אם הוא לא קיים
    const user = await base44.auth.me().catch(() => null);

    const { eventId } = await req.json();
    if (!eventId || typeof eventId !== 'string' || eventId.trim().length === 0) {
      return Response.json({ error: 'Missing or invalid eventId' }, { status: 400 });
    }
    const trimmedEventId = eventId.trim();

    // 1. Fetch Event using service role
    const event = await base44.asServiceRole.entities.Event.get(trimmedEventId).catch(() => null);
    if (!event) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }
    
    // ההנחה: אם יש לך את הקישור, אתה יכול לראות את התצוגה המקדימה.
    
    let isMember = false;
    if (user) {
        const membership = await base44.asServiceRole.entities.EventMember.filter({ 
            event_id: trimmedEventId, 
            user_id: user.id 
        }).then(res => res?.[0]).catch(() => null);
        isMember = !!membership || event.owner_id === user.id;
    }

    // החזרת פרטי תצוגה מקדימה בלבד
    return Response.json({
      event: {
        id: event.id,
        title: event.title,
        description: event.description,
        location: event.location,
        cover_image_url: event.cover_image_url,
        status: event.status, // כדי שנוכל להציג אם האירוע בוטל
      },
      isMember: isMember,
    });

  } catch (error) {
    console.error('getEventPreview function error:', error);
    return Response.json({ 
      error: 'Internal server error', 
      details: error?.message || 'Unknown error' 
    }, { status: 500 });
  }
});
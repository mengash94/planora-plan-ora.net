import { createClient } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClient(
      Deno.env.get('BASE44_APP_ID'),
      Deno.env.get('BASE44_APP_OWNER'),
      { serviceRole: true }
    );

    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Missing userId parameter' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store' // ✅ ביטלתי קאשינג
        }
      });
    }

    const memberships = await base44.entities.EventMember.filter({ userId });

    if (!memberships || memberships.length === 0) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store' // ✅ ביטלתי קאשינג
        }
      });
    }

    const eventIds = [...new Set(memberships.map(m => m.eventId || m.event_id).filter(Boolean))];
    const events = await Promise.all(
      eventIds.map(async (eventId) => {
        try {
          const event = await base44.entities.Event.get(eventId);
          const membership = memberships.find(m => (m.eventId || m.event_id) === eventId);
          return {
            ...event,
            userRole: membership?.role || 'member',
            membershipId: membership?.id
          };
        } catch (error) {
          console.warn(`Failed to load event ${eventId}:`, error);
          return null;
        }
      })
    );

    const validEvents = events.filter(Boolean);

    return new Response(JSON.stringify(validEvents), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store' // ✅ ביטלתי קאשינג
      }
    });

  } catch (error) {
    console.error('Error in listMyEvents:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store' // ✅ ביטלתי קאשינג
      }
    });
  }
});
import { createClient } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClient(
      Deno.env.get('BASE44_APP_ID'),
      Deno.env.get('BASE44_APP_OWNER'),
      { serviceRole: true }
    );

    const url = new URL(req.url);
    const eventId = url.searchParams.get('eventId');

    if (!eventId) {
      return new Response(JSON.stringify({ error: 'Missing eventId parameter' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store' // ✅ ביטלתי קאשינג
        }
      });
    }

    const event = await base44.entities.Event.get(eventId);

    if (!event) {
      return new Response(JSON.stringify({ error: 'Event not found' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store' // ✅ ביטלתי קאשינג
        }
      });
    }

    return new Response(JSON.stringify(event), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store' // ✅ ביטלתי קאשינג
      }
    });

  } catch (error) {
    console.error('Error in getEventData:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store' // ✅ ביטלתי קאשינג
      }
    });
  }
});
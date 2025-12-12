import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const currentUser = await base44.auth.me();
    if (!currentUser) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const body = await req.json();
    const user = body.user;

    // Validate input
    if (!user?.oneSignalSubscriptionId) {
      return Response.json({ 
        success: false, 
        error: 'User or OneSignal subscription ID not provided' 
      }, { status: 400 });
    }

    // Get OneSignal REST API Key from environment
    const oneSignalApiKey = Deno.env.get('ONSIGNAL_API_KEY');
    if (!oneSignalApiKey) {
      console.error('[delete_device_from_onesignal] Missing ONSIGNAL_API_KEY');
      return Response.json({ 
        success: false, 
        error: 'OneSignal API key not configured' 
      }, { status: 500 });
    }

    // Delete player from OneSignal
    console.log('[delete_device_from_onesignal] Deleting player:', user.oneSignalSubscriptionId);
    
    const oneSignalResponse = await fetch(
      `https://onesignal.com/api/v1/players/${user.oneSignalSubscriptionId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Basic ${oneSignalApiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!oneSignalResponse.ok) {
      const errorText = await oneSignalResponse.text();
      console.error('[delete_device_from_onesignal] OneSignal API error:', errorText);
      
      // If player not found (404), still consider it a success
      if (oneSignalResponse.status === 404) {
        console.log('[delete_device_from_onesignal] Player not found in OneSignal, considering as success');
        return Response.json({ success: true });
      }
      
      return Response.json({ 
        success: false, 
        error: `OneSignal API error: ${oneSignalResponse.status}` 
      }, { status: 500 });
    }

    console.log('[delete_device_from_onesignal] ✅ Player deleted successfully from OneSignal');

    return Response.json({ success: true });

  } catch (error) {
    console.error('[delete_device_from_onesignal] Error:', error);
    return Response.json({ 
      success: false, 
      error: error.message || 'Unknown error' 
    }, { status: 500 });
  }
});
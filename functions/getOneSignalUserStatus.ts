import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  const debugInfo = {
    timestamp: new Date().toISOString(),
    requestMethod: req.method,
    environment: Deno.env.get('DENO_DEPLOYMENT_ID') ? 'production' : 'local'
  };

  console.log('🔧 [getOneSignalUserStatus] === FUNCTION STARTED ===');

  try {
    // Step 1: Get OneSignal credentials
    const ONESIGNAL_APP_ID = Deno.env.get('OneSignal_App_ID');
    const ONESIGNAL_API_KEY = Deno.env.get('ONSIGNAL_API_KEY');

    console.log('OneSignal_App_ID:', ONESIGNAL_APP_ID || 'NOT SET');
    console.log('ONSIGNAL_API_KEY exists:', !!ONESIGNAL_API_KEY);

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_API_KEY) {
      return Response.json({ 
        error: 'Missing OneSignal credentials',
        hasDevices: false,
        deviceCount: 0,
        debug: { 
          configStatus: 'missing_credentials',
          missingVars: {
            appId: !ONESIGNAL_APP_ID,
            apiKey: !ONESIGNAL_API_KEY
          }
        }
      }, { status: 500 });
    }

    debugInfo.oneSignalConfig = {
      appId: ONESIGNAL_APP_ID,
      apiKeyLength: ONESIGNAL_API_KEY.length,
      apiKeyPrefix: ONESIGNAL_API_KEY.substring(0, 12) + '...'
    };

    // Step 2: Get InstaBack User ID from request
    let instabackUserId = null;
    try {
      const body = await req.json();
      instabackUserId = body?.instabackUserId || body?.params?.instabackUserId || null;
      
      // Clean the ID (remove spaces, trim)
      if (instabackUserId) {
        instabackUserId = String(instabackUserId).trim();
      }
      
      console.log('📦 InstaBack User ID from request:', instabackUserId);
    } catch (e) {
      console.log('📦 No body or failed to parse:', e.message);
    }

    // Step 3: Authenticate with Base44
    console.log('👤 Authenticating Base44 user...');
    const base44 = createClientFromRequest(req);
    
    let user;
    try {
      user = await base44.auth.me();
      console.log('✅ Base44 User:', user?.id, user?.email);
    } catch (authError) {
      return Response.json({ 
        error: 'Unauthorized',
        hasDevices: false,
        deviceCount: 0,
        debug: { authError: authError.message }
      }, { status: 401 });
    }

    if (!instabackUserId) {
      console.warn('⚠️ No InstaBack User ID provided, this will likely fail');
      return Response.json({
        error: 'No InstaBack User ID provided',
        message: 'InstaBack User ID is required for OneSignal lookup',
        hasDevices: false,
        deviceCount: 0,
        debug: {
          ...debugInfo,
          instabackUserIdProvided: false,
          base44UserId: user?.id
        }
      }, { status: 400 });
    }

    debugInfo.userIds = {
      instaback: instabackUserId,
      base44: user?.id,
      email: user?.email
    };

    // Step 4: Query OneSignal (EXACTLY like the Python example)
    console.log('🔍 Querying OneSignal API...');
    console.log('Using external_id:', instabackUserId);
    
    const url = `https://onesignal.com/api/v1/players?app_id=${ONESIGNAL_APP_ID}&external_id=${encodeURIComponent(instabackUserId)}`;
    
    console.log('Full URL:', url);

    const requestStartTime = Date.now();

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${ONESIGNAL_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const requestDuration = Date.now() - requestStartTime;

    console.log('📡 OneSignal Response Status:', response.status);
    console.log('⏱️ Request Duration:', requestDuration, 'ms');

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OneSignal API error:', response.status, errorText);
      
      return Response.json({ 
        error: 'OneSignal API Error',
        message: `HTTP ${response.status}: ${errorText}`,
        hasDevices: false,
        deviceCount: 0,
        debug: {
          ...debugInfo,
          oneSignalResponse: {
            status: response.status,
            statusText: response.statusText,
            errorBody: errorText
          }
        }
      }, { status: 500 });
    }

    const data = await response.json();
    const allPlayers = data.players || [];

    console.log('📊 Total players found:', allPlayers.length);

    if (allPlayers.length > 0) {
      console.log('✅ נמצא מכשיר:', JSON.stringify(allPlayers[0], null, 2));
    } else {
      console.log('❌ לא נמצא מכשיר עם external_id:', instabackUserId);
    }

    // Step 5: Filter active devices
    const now = Math.floor(Date.now() / 1000);
    const sevenDaysAgo = now - (7 * 24 * 60 * 60);

    const activeDevices = allPlayers.filter(player => {
      const isValidId = player.id && player.id !== 'invalid_player_id';
      const isNotInvalid = !player.invalid_identifier;
      const isSubscribed = (player.notification_types !== undefined && player.notification_types >= 0);
      const isRecentlyActive = !player.last_active || player.last_active >= sevenDaysAgo;

      return isValidId && isNotInvalid && isSubscribed && isRecentlyActive;
    });

    console.log('✅ Active devices after filtering:', activeDevices.length);

    const devicesSummary = activeDevices.map(p => ({
      playerId: p.id,
      deviceType: p.device_type,
      deviceModel: p.device_model,
      lastActive: p.last_active ? new Date(p.last_active * 1000).toISOString() : null,
      notificationTypes: p.notification_types,
      externalUserId: p.external_user_id
    }));

    // Step 6: Return result
    const result = {
      hasDevices: activeDevices.length > 0,
      deviceCount: activeDevices.length,
      devices: devicesSummary,
      userId: instabackUserId,
      userEmail: user?.email,
      debug: {
        ...debugInfo,
        oneSignalRequest: {
          url,
          external_id: instabackUserId,
          requestDurationMs: requestDuration
        },
        oneSignalResponse: {
          status: 200,
          totalPlayersFound: allPlayers.length,
          activeDevicesAfterFilter: activeDevices.length,
          filteredOut: allPlayers.length - activeDevices.length
        }
      }
    };

    console.log('✅ Returning result:', JSON.stringify(result, null, 2));

    return Response.json(result);

  } catch (error) {
    console.error('❌ Function error:', error);
    
    return Response.json({
      error: 'Internal Server Error',
      message: error.message,
      hasDevices: false,
      deviceCount: 0,
      debug: {
        ...debugInfo,
        exception: {
          name: error.name,
          message: error.message,
          stack: error.stack
        }
      }
    }, { status: 500 });
  }
});
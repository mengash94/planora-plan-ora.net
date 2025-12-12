import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // בדיקת אימות משתמש
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { params } = await req.json();
        const { userId, token } = params;

        // וידוא שהנתונים החיוביים התקבלו
        if (!userId || !token) {
            return Response.json({ 
                error: 'Missing required fields: userId, token' 
            }, { status: 400 });
        }

        // בדיקה שהמשתמש מנסה לרשום טוקן רק לעצמו
        if (String(user.id) !== String(userId)) {
            return Response.json({ 
                error: 'Cannot register token for another user' 
            }, { status: 403 });
        }

        console.log('[registerFcmToken] Registering FCM token for user:', userId);

        // בדיקה אם כבר קיים טוקן זהה למשתמש זה
        const existingTokens = await base44.asServiceRole.entities.NotifTocken.filter({
            userId: String(userId),
            token: String(token)
        });

        if (existingTokens && existingTokens.length > 0) {
            console.log('[registerFcmToken] Token already exists, updating timestamp');
            // אם הטוקן כבר קיים, נעדכן אותו (updatedAt יתעדכן אוטומטית)
            const existingToken = existingTokens[0];
            await base44.asServiceRole.entities.NotifTocken.update(existingToken.id, {
                token: String(token) // עדכון לאותו טוקן כדי לרענן את updatedAt
            });

            return Response.json({
                success: true,
                message: 'Token updated successfully',
                tokenId: existingToken.id
            });
        }

        // יצירת רשומת טוקן חדשה
        const newToken = await base44.asServiceRole.entities.NotifTocken.create({
            userId: String(userId),
            token: String(token)
        });

        console.log('[registerFcmToken] ✅ FCM token registered successfully:', newToken.id);

        return Response.json({
            success: true,
            message: 'FCM token registered successfully',
            tokenId: newToken.id
        });

    } catch (error) {
        console.error('[registerFcmToken] ❌ Error:', error);
        return Response.json({ 
            error: error.message || 'Failed to register FCM token' 
        }, { status: 500 });
    }
});
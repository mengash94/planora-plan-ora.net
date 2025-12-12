import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Verify user is authenticated
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Parse request body
        const body = await req.json();
        const { eventId, title, type, options, allowMultiple = false } = body;

        // Validate required fields
        if (!eventId || !title || !type || !Array.isArray(options) || options.length < 2) {
            return Response.json({ 
                error: 'Missing required fields: eventId, title, type, and at least 2 options required' 
            }, { status: 400 });
        }

        // Validate poll type
        const validTypes = ['date', 'location', 'generic'];
        const normalizedType = type === 'multiple_choice' ? 'generic' : type;
        if (!validTypes.includes(normalizedType)) {
            return Response.json({ 
                error: `Invalid poll type. Must be one of: ${validTypes.join(', ')}` 
            }, { status: 400 });
        }

        // Validate options
        for (const option of options) {
            if (!option.id || !option.text) {
                return Response.json({ 
                    error: 'Each option must have id and text fields' 
                }, { status: 400 });
            }
            
            if (normalizedType === 'date' && !option.date) {
                return Response.json({ 
                    error: 'Date polls require each option to have a date field' 
                }, { status: 400 });
            }
            
            if (normalizedType === 'location' && !option.location) {
                return Response.json({ 
                    error: 'Location polls require each option to have a location field' 
                }, { status: 400 });
            }
        }

        // Create poll using Base44 entity
        const pollData = {
            event_id: eventId,
            title: title.trim(),
            type: normalizedType,
            options: options,
            allow_multiple: normalizedType === 'generic' ? !!allowMultiple : false,
            is_active: true
        };

        const newPoll = await base44.entities.Poll.create(pollData);
        
        return Response.json({ 
            success: true, 
            poll: newPoll,
            message: 'Poll created successfully'
        });
        
    } catch (error) {
        console.error('Create poll error:', error);
        return Response.json({ 
            error: 'Failed to create poll', 
            details: error.message 
        }, { status: 500 });
    }
});
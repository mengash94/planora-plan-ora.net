import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { userMessage, eventData } = await req.json();

        if (!userMessage) {
            return Response.json({ error: 'userMessage is required' }, { status: 400 });
        }

        console.log('[processEventChat] Processing message:', userMessage);
        console.log('[processEventChat] Current eventData:', eventData);

        const currentDate = new Date().toLocaleDateString('he-IL', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });

        // Analyze what data is already collected
        const hasTitle = !!(eventData?.title);
        const hasEventType = !!(eventData?.eventType || eventData?.category);
        const hasLocation = !!(eventData?.location);
        const hasDestination = !!(eventData?.destination);
        const hasDate = !!(eventData?.eventDate);
        const hasParticipants = !!(eventData?.participants);
        const hasBudget = !!(eventData?.budget);
        const hasDatePoll = !!(eventData?.datePollEnabled);
        
        // Determine what's missing
        const missingFields = [];
        if (!hasTitle && !hasEventType) missingFields.push('סוג האירוע');
        if (!hasDate && !hasDatePoll) missingFields.push('תאריך');
        if (!hasLocation && !hasDestination) missingFields.push('מיקום');
        if (!hasParticipants) missingFields.push('כמות אורחים');

        // Check if ready to create
        const isReadyToCreate = hasEventType && (hasDate || hasDatePoll) && (hasLocation || hasDestination);

        // Build the Planora AI prompt
        const prompt = `### זהות ותפקיד
אתה "פלנורה" (Planora) – מומחה AI אישי לתכנון וניהול אירועים.
תאריך היום: ${currentDate}

### מצב נוכחי של האירוע:
${JSON.stringify(eventData, null, 2)}

### ניתוח המצב:
- יש סוג אירוע: ${hasEventType ? 'כן ✓' : 'לא ✗'}
- יש תאריך: ${hasDate ? 'כן ✓' : (hasDatePoll ? 'סקר תאריכים ✓' : 'לא ✗')}
- יש מיקום: ${hasLocation ? 'כן ✓' : (hasDestination ? 'רק עיר' : 'לא ✗')}
- יש כמות אורחים: ${hasParticipants ? 'כן ✓' : 'לא ✗'}
- מוכן ליצירה: ${isReadyToCreate ? 'כן! ✓' : 'לא עדיין'}
${missingFields.length > 0 ? `- חסר: ${missingFields.join(', ')}` : ''}

### המשתמש אמר:
"${userMessage}"

### הוראות חשובות לכפתורים:
**הכפתורים חייבים להיות רלוונטיים למה שחסר או לשלב הבא!**

${isReadyToCreate ? `
🎉 כל הפרטים החיוניים קיימים! הצע:
- { "text": "צור את האירוע! 🎉", "action": "generate_plan", "icon": "🎉" }
- { "text": "הוסף עוד פרטים ✏️", "action": "add_more_details", "icon": "✏️" }
` : ''}

${!hasDate && !hasDatePoll ? `
📅 חסר תאריך - הצע:
- { "text": "בחר תאריך 📅", "action": "select_date", "icon": "📅" }
- { "text": "סקר תאריכים 🗳️", "action": "create_date_poll", "icon": "🗳️" }
` : ''}

${!hasLocation && hasDestination ? `
📍 יש עיר אבל אין מקום ספציפי - הצע:
- { "text": "חפש מקומות 🔍", "action": "search_places_${eventData?.venuePreference || 'restaurant'}", "icon": "🔍" }
- { "text": "כתוב מקום ✏️", "action": "manual_location", "icon": "✏️" }
` : ''}

${!hasLocation && !hasDestination ? `
🏠 חסר מיקום - שאל באיזו עיר או הצע:
- { "text": "תל אביב 🌇", "action": "תל אביב", "icon": "🌇" }
- { "text": "ירושלים 🏛️", "action": "ירושלים", "icon": "🏛️" }
- { "text": "עיר אחרת ✏️", "action": "other_city", "icon": "✏️" }
` : ''}

### חוקים:
1. **אל תציע כפתורים למשהו שכבר קיים!** אם יש location, אל תציע "חפש מקומות"
2. **ענה על שאלת המשתמש קודם** - אם הוא שואל משהו, ענה לו ואז המשך
3. **כפתור אחד עיקרי** - תמיד הצע את הפעולה הכי חשובה לשלב הנוכחי
4. **מקסימום 3 כפתורים** - יותר מדי כפתורים מבלבל

### פורמט פלט (JSON בלבד):
{
  "extractedData": { /* רק שדות חדשים מההודעה */ },
  "reply": "תשובה קצרה וחמה בעברית",
  "suggestedButtons": [
    { "text": "טקסט + אימוג'י", "action": "פעולה", "icon": "אימוג'י" }
  ],
  "isReadyToSummary": ${isReadyToCreate}
}`;

        // Call Base44 LLM to process the conversation
        const result = await base44.integrations.Core.InvokeLLM({
            prompt,
            add_context_from_internet: false,
            response_json_schema: {
                type: 'object',
                properties: {
                    extractedData: {
                        type: 'object',
                        properties: {
                            title: { type: 'string' },
                            eventType: { type: 'string' },
                            category: { type: 'string' },
                            participants: { type: 'number' },
                            destination: { type: 'string' },
                            location: { type: 'string' },
                            eventDate: { type: 'string' },
                            forWhom: { type: 'string' },
                            privacy: { type: 'string' },
                            description: { type: 'string' },
                            venuePreference: { type: 'string' },
                            budget: { type: 'string' },
                            isRecurring: { type: 'boolean' },
                            datePollEnabled: { type: 'boolean' },
                            locationPollEnabled: { type: 'boolean' }
                        }
                    },
                    reply: { type: 'string' },
                    suggestedButtons: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                text: { type: 'string' },
                                action: { type: 'string' },
                                icon: { type: 'string' }
                            }
                        }
                    },
                    isReadyToSummary: { type: 'boolean' }
                }
            }
        });

        console.log('[processEventChat] AI response:', result);

        // Return the AI's response
        return Response.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('[processEventChat] Error:', error);
        return Response.json({ 
            error: error.message,
            details: error.stack
        }, { status: 500 });
    }
});
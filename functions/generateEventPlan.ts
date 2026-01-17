import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { eventData } = await req.json();

        if (!eventData) {
            return Response.json({ error: 'eventData is required' }, { status: 400 });
        }

        console.log('[generateEventPlan] Generating plan for:', eventData);

        const currentDate = new Date().toISOString();
        const eventDate = eventData.eventDate || null;

        // Build the prompt for generating a complete event plan
        const prompt = `### תפקיד
אתה מומחה לתכנון אירועים. עליך ליצור תוכנית אירוע מלאה ומפורטת.

### פרטי האירוע
${JSON.stringify(eventData, null, 2)}

### תאריך היום
${currentDate}

### המשימה שלך
צור תוכנית אירוע מלאה הכוללת:

1. **לו"ז יום האירוע (itinerary)**: רשימה מפורטת של פעילויות עם שעות, כולל:
   - שעת התחלה וסיום לכל פעילות
   - תיאור הפעילות
   - מיקום (אם רלוונטי)
   - סדר הפעילויות (order)

2. **משימות הכנה (tasks)**: רשימת משימות שיש לבצע לפני האירוע, כולל:
   - כותרת המשימה
   - תיאור קצר
   - קטגוריה (logistics, catering, decoration, invitations, entertainment, other)
   - עדיפות (high, medium, low)
   - תאריך יעד (מחושב ביחס לתאריך האירוע)
   - due_offset_days: כמה ימים לפני האירוע (מספר שלילי)

3. **המלצות (suggestions)**: 3-5 טיפים והמלצות ספציפיים לסוג האירוע

### דוגמה לפלט:

לאירוע יום הולדת ב-15 בינואר:
- משימה "הזמנת עוגה" עם due_offset_days: -7 = תאריך יעד 8 בינואר
- משימה "שליחת הזמנות" עם due_offset_days: -14 = תאריך יעד 1 בינואר

### חוקים:
1. התאם את התוכנית לסוג האירוע (חתונה שונה מיום הולדת שונה ממסיבה)
2. התאם את כמות המשימות לגודל האירוע (אירוע ל-10 אנשים ≠ אירוע ל-200)
3. אם אין תאריך אירוע, תן due_offset_days ביחס ל"יום האירוע"
4. לו"ז צריך להיות ריאלי ומפורט
5. משימות צריכות להיות מעשיות וספציפיות
6. כל התוכן בעברית

### סוגי אירועים והתאמות:
- **יום הולדת**: לו"ז כולל קבלת פנים, ארוחה, עוגה ומשאלות, פעילויות. משימות: הזמנות, עוגה, קישוטים, מתנות.
- **חתונה**: לו"ז כולל קבלת פנים, חופה, ריקודים, ארוחה. משימות: אולם, קייטרינג, צלם, DJ, שמלה/חליפה, הזמנות.
- **מסיבה**: לו"ז כולל קבלת פנים, אוכל, מוזיקה, פעילויות. משימות: מקום, אוכל, שתייה, מוזיקה, קישוטים.
- **טיול**: לו"ז יומי כולל יציאה, אטרקציות, ארוחות, חזרה. משימות: הזמנות, אריזה, תיאום הסעות.
- **אירוע עבודה**: לו"ז כולל רישום, הרצאות, הפסקות, נטוורקינג. משימות: מקום, ציוד, מצגות, כיבוד.

### פורמט הפלט (JSON בלבד):
{
  "itinerary": [
    {
      "title": "כותרת הפעילות",
      "description": "תיאור קצר",
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "location": "מיקום (אופציונלי)",
      "order": 1
    }
  ],
  "tasks": [
    {
      "title": "כותרת המשימה",
      "description": "תיאור המשימה",
      "category": "logistics|catering|decoration|invitations|entertainment|other",
      "priority": "high|medium|low",
      "due_offset_days": -7
    }
  ],
  "suggestions": [
    "טיפ או המלצה 1",
    "טיפ או המלצה 2"
  ],
  "summary": "סיכום קצר של התוכנית (2-3 משפטים)"
}`;

        // Call Base44 LLM to generate the plan
        const result = await base44.integrations.Core.InvokeLLM({
            prompt,
            add_context_from_internet: false,
            response_json_schema: {
                type: 'object',
                properties: {
                    itinerary: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                title: { type: 'string' },
                                description: { type: 'string' },
                                startTime: { type: 'string' },
                                endTime: { type: 'string' },
                                location: { type: 'string' },
                                order: { type: 'number' }
                            }
                        }
                    },
                    tasks: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                title: { type: 'string' },
                                description: { type: 'string' },
                                category: { type: 'string' },
                                priority: { type: 'string' },
                                due_offset_days: { type: 'number' }
                            }
                        }
                    },
                    suggestions: {
                        type: 'array',
                        items: { type: 'string' }
                    },
                    summary: { type: 'string' }
                }
            }
        });

        console.log('[generateEventPlan] Generated plan:', result);

        // Calculate actual due dates if eventDate is provided
        let tasksWithDates = result.tasks || [];
        if (eventDate) {
            const eventDateObj = new Date(eventDate);
            tasksWithDates = tasksWithDates.map(task => {
                const dueDate = new Date(eventDateObj);
                dueDate.setDate(dueDate.getDate() + (task.due_offset_days || 0));
                return {
                    ...task,
                    dueDate: dueDate.toISOString()
                };
            });
        }

        // Calculate actual times for itinerary if eventDate is provided
        let itineraryWithDates = result.itinerary || [];
        if (eventDate) {
            const eventDateObj = new Date(eventDate);
            itineraryWithDates = itineraryWithDates.map(item => {
                let date = null;
                let endDate = null;
                
                if (item.startTime) {
                    const [hours, minutes] = item.startTime.split(':').map(Number);
                    date = new Date(eventDateObj);
                    date.setHours(hours, minutes, 0, 0);
                }
                
                if (item.endTime) {
                    const [hours, minutes] = item.endTime.split(':').map(Number);
                    endDate = new Date(eventDateObj);
                    endDate.setHours(hours, minutes, 0, 0);
                }
                
                return {
                    ...item,
                    date: date ? date.toISOString() : null,
                    endDate: endDate ? endDate.toISOString() : null
                };
            });
        }

        return Response.json({
            success: true,
            data: {
                itinerary: itineraryWithDates,
                tasks: tasksWithDates,
                suggestions: result.suggestions || [],
                summary: result.summary || ''
            }
        });

    } catch (error) {
        console.error('[generateEventPlan] Error:', error);
        return Response.json({ 
            error: error.message,
            details: error.stack
        }, { status: 500 });
    }
});
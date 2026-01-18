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

        const now = new Date();
        const currentDate = now.toISOString();
        const eventDate = eventData.eventDate || null;
        
        // Israeli context
        const currentMonth = now.getMonth();
        const isSummer = currentMonth >= 5 && currentMonth <= 8;
        const isWinter = currentMonth >= 11 || currentMonth <= 2;
        
        // Calculate days until event
        let daysUntilEvent = null;
        if (eventDate) {
            const eventDateObj = new Date(eventDate);
            daysUntilEvent = Math.ceil((eventDateObj - now) / (1000 * 60 * 60 * 24));
        }

        // Build the Expert Event Producer prompt
        const prompt = `### 🎭 תפקיד: מפיק אירועים מקצועי בישראל

אתה מפיק אירועים מוביל עם 15+ שנות ניסיון בשוק הישראלי.
אתה מכיר כל ספק, כל מקום, כל טיפ שחוסך כסף וכאבי ראש.

### 📋 פרטי האירוע
\`\`\`json
${JSON.stringify(eventData, null, 2)}
\`\`\`

### 📅 הקשר זמן
- תאריך היום: ${currentDate}
- עונה: ${isSummer ? '☀️ קיץ' : isWinter ? '🌧️ חורף' : '🍂 עונת מעבר'}
${daysUntilEvent ? `- ימים עד האירוע: ${daysUntilEvent}` : '- תאריך אירוע: טרם נקבע'}

### 🎯 המשימה שלך
צור תוכנית אירוע **מקצועית ומותאמת לישראל**, כולל:

---

## 1️⃣ לו"ז יום האירוע (Itinerary)

צור לו"ז ריאלי ומפורט עם:
- שעות התחלה וסיום לכל פעילות
- התחשבות בלוגיסטיקה ישראלית (פקקים, חניה, כניסת שבת)
- זמני Buffer בין פעילויות
- התאמה לסוג האירוע ולעונה

**דוגמאות לפי סוג:**
- יום הולדת: קבלת פנים (30 דק') → ארוחה (1 שעה) → עוגה ושירה (15 דק') → פעילות (45 דק') → סיום
- חתונה: קבלת פנים (1:30) → חופה (30 דק') → צילומים (20 דק') → כניסה לאולם (15 דק') → ריקוד ראשון (5 דק') → ארוחה (2 שעות) → ריקודים
- מסיבת רווקים: התכנסות → הסעה → פעילות 1 → ארוחה → פעילות 2 → מסיבה

---

## 2️⃣ משימות הכנה (Tasks)

צור רשימת משימות עם **due_offset_days** (ימים לפני האירוע):

**חוקי זמנים לפי סוג אירוע:**

| סוג אירוע | משימה | due_offset_days |
|-----------|--------|-----------------|
| חתונה | אולם, צלם | -180 עד -120 |
| חתונה | הזמנות, DJ | -90 עד -60 |
| חתונה | שמלה/חליפה | -60 עד -30 |
| יום הולדת | הזמנות | -14 עד -7 |
| יום הולדת | עוגה | -3 עד -1 |
| מסיבה | מקום | -30 עד -14 |
| טיול | הזמנות | -60 עד -30 |

**קטגוריות:** logistics, catering, decoration, invitations, entertainment, photography, attire, venue, transportation, other

**עדיפות:**
- high: משימות קריטיות שמשפיעות על הכל (מקום, קייטרינג)
- medium: משימות חשובות (צילום, מוזיקה, הזמנות)
- low: נחמד שיהיה (קישוטים מיוחדים, מתנות)

---

## 3️⃣ טיפים והמלצות ישראליות

תן 5-7 טיפים **מקצועיים וספציפיים**:

${isSummer ? `
**טיפים לקיץ:**
- אירועי חוץ: התחילו אחרי 18:00, וודאו צל/מיזוג
- שתייה קרה: הכפילו את הכמות הרגילה
- מזון: הקפידו על שרשרת קור, הימנעו ממאיונז בחוץ
` : ''}

${isWinter ? `
**טיפים לחורף:**
- אירועי חוץ: וודאו גיבוי סגור למקרה גשם
- חניה: תכננו חניה מקורה
- שעות: סיימו לפני חושך או וודאו תאורה
` : ''}

**טיפים כלליים לישראל:**
- יום חמישי: צפי לפקקים קשים מ-16:00
- יום שישי: סיימו 2 שעות לפני כניסת שבת
- חגים: בדקו תאריכים יהודיים!
- כשרות: וודאו מראש אם יש אורחים שומרי כשרות
- חניה: שלחו הוראות הגעה מפורטות + אפליקציית ווייז

---

### 📤 פורמט פלט (JSON בלבד):
{
  "itinerary": [
    {
      "title": "כותרת הפעילות",
      "description": "תיאור קצר",
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "location": "מיקום (אם שונה מהראשי)",
      "order": 1,
      "notes": "הערות לוגיסטיות (אופציונלי)"
    }
  ],
  "tasks": [
    {
      "title": "כותרת המשימה",
      "description": "תיאור מפורט + טיפ מקצועי",
      "category": "logistics|catering|decoration|invitations|entertainment|photography|attire|venue|transportation|other",
      "priority": "high|medium|low",
      "due_offset_days": -7,
      "estimatedCost": "טווח מחירים משוער (אופציונלי)",
      "vendorTip": "טיפ לבחירת ספק (אופציונלי)"
    }
  ],
  "suggestions": [
    "טיפ מקצועי 1",
    "טיפ מקצועי 2"
  ],
  "budgetEstimate": {
    "low": "הערכה נמוכה",
    "medium": "הערכה בינונית", 
    "high": "הערכה גבוהה",
    "notes": "הערות לגבי התקציב"
  },
  "riskAlerts": [
    "אזהרה לוגיסטית 1 (אם רלוונטי)"
  ],
  "summary": "סיכום מקצועי של התוכנית (3-4 משפטים)"
}`;

        // Call Base44 LLM to generate the plan with internet for real-time data
        const result = await base44.integrations.Core.InvokeLLM({
            prompt,
            add_context_from_internet: true, // Enable for venue prices, vendor info
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
                                order: { type: 'number' },
                                notes: { type: 'string' }
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
                                due_offset_days: { type: 'number' },
                                estimatedCost: { type: 'string' },
                                vendorTip: { type: 'string' }
                            }
                        }
                    },
                    suggestions: {
                        type: 'array',
                        items: { type: 'string' }
                    },
                    budgetEstimate: {
                        type: 'object',
                        properties: {
                            low: { type: 'string' },
                            medium: { type: 'string' },
                            high: { type: 'string' },
                            notes: { type: 'string' }
                        }
                    },
                    riskAlerts: {
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
                
                // Don't set due date in the past
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const finalDueDate = dueDate < today ? today : dueDate;
                
                return {
                    ...task,
                    dueDate: finalDueDate.toISOString()
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
                budgetEstimate: result.budgetEstimate || null,
                riskAlerts: result.riskAlerts || [],
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
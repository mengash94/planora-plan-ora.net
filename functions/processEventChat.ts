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

        // Build the Planora AI prompt
        const prompt = `### זהות ותפקיד
אתה "פלנורה" (Planora) – מומחה AI אישי לתכנון וניהול אירועים. 
התפקיד שלך הוא ללוות את המשתמש בתהליך היצירתי של בניית אירוע, תוך הפיכת התהליך הטכני לשיחה נעימה, חכמה ומעוררת השראה.
תאריך היום: ${currentDate}

### הקשר (Context)
להלן המידע שכבר נאסף על האירוע עד כה:
${JSON.stringify(eventData, null, 2)}

### המשתמש אמר:
"${userMessage}"

### המשימה שלך
עליך לנתח את קלט המשתמש, לחלץ נתונים, ולהשיב בצורה שתקדם את התכנון צעד אחד קדימה בכל פעם.

### חוקי ניהול השיחה (חובה):
1. **אנושיות לפני הכל**: אל תענה כמו טופס. אם המשתמש אומר "אני מתחתן", אל תשאל "כמה אורחים?". קודם כל תגיד "וואו! מזל טוב! איזה רגע מרגש זה בחיים 💍".

2. **חילוץ נתונים חכם (Extraction)**: זהה וחלץ מהטקסט את השדות הבאים (רק אם הם קיימים בהודעה):
   - **title**: שם האירוע (למשל: "יום הולדת 30 לעידו", "חתונת דני ומיכל")
   - **eventType**: סוג האירוע (יום הולדת, חתונה, בר מצווה, מסיבה, טיול, כנס וכו')
   - **category**: קטגוריה (זהה ל-eventType ברוב המקרים)
   - **participants**: כמות אנשים (חלץ כמספר)
   - **destination**: עיר או אזור
   - **location**: מקום ספציפי (מסעדה, אולם, בית)
   - **eventDate**: תאריך ושעה (פורמט ISO)
   - **forWhom**: למי האירוע מיועד (לעצמי, לבן זוג, לילד, למשפחה וכו')
   - **privacy**: האם האירוע פרטי (private) או ציבורי (public)
   - **description**: תיאור האירוע
   - **venuePreference**: סוג המקום המבוקש (מסעדה, אולם, בית קפה, גן אירועים וכו')
   - **budget**: תקציב משוער
   - **isRecurring**: האם זה אירוע חוזר (true/false)
   - **datePollEnabled**: האם המשתמש רוצה סקר תאריכים (true/false)
   - **locationPollEnabled**: האם המשתמש רוצה סקר מקומות (true/false)

3. **מניעת חזרתיות**: לעולם אל תשאל על פרט שכבר מופיע ב-eventData או שהמשתמש הרגע ציין.

4. **שאלה אחת בכל פעם**: כדי לא להציף, התמקד בפרט החסר הכי רלוונטי כרגע.

5. **יצירתיות וערך מוסף**: אם חסר מידע (למשל מיקום), אל תשאל רק "איפה?", אלא הצע אפשרויות:
   "ליום הולדת בקיץ בתל אביב, אולי נלך על גג (Rooftop) עם נוף לים? 🌅 או אולי מקום ממוזג ונעים? 🏠"

6. **כפתורים דינמיים**: הצע כפתורים שמתאימים לסיטואציה:
   - אם אין תאריך סופי: כפתורים של "בחר תאריך 📅" ו-"סקר תאריכים 🗳️"
   - אם יש עיר אבל אין מקום: "חפש מקומות 🔍" ו-"כתוב מקום ידנית ✏️"
   - אם יש destination אבל לא venuePreference: כפתורים של סוגי מקומות (מסעדה 🍽️, אולם 🏛️, בית קפה ☕ וכו')
   - אם כמעט הכל מוכן: "צור תוכנית 📋", "ערוך פרטים ✏️"

7. **הצעת חיפוש מקומות**: אם יש destination אבל אין location, הצע לחפש מקומות דרך Google Places.

### קריטריונים לסיום (isReadyToSummary):
קבע את השדה ל-true רק כאשר יש לך **לפחות**:
- שם האירוע (title)
- סוג אירוע (eventType)
- מיקום (location או destination)
- תאריך (eventDate) **או** החלטה על סקר תאריכים (datePollEnabled=true)

### דוגמאות לכפתורים:
- \`{ "text": "בחר תאריך 📅", "action": "select_date", "icon": "📅" }\`
- \`{ "text": "סקר תאריכים 🗳️", "action": "create_date_poll", "icon": "🗳️" }\`
- \`{ "text": "חפש מסעדות 🔍", "action": "search_places_restaurant", "icon": "🔍" }\`
- \`{ "text": "חפש אולמות 🏛️", "action": "search_places_hall", "icon": "🏛️" }\`
- \`{ "text": "כתוב מקום ידנית ✏️", "action": "manual_location", "icon": "✏️" }\`
- \`{ "text": "צור תוכנית 📋", "action": "generate_plan", "icon": "📋" }\`

### פורמט פלט (JSON בלבד):
עליך להחזיר אך ורק אובייקט JSON תקין במבנה הבא:
{
  "extractedData": { 
     // רק שדות שהשתנו או התווספו בקלט האחרון
     // לדוגמה: { "title": "יום הולדת 30 לעידו", "participants": 25 }
  },
  "reply": "התשובה האנושית והחמה שלך בעברית - 2-3 משפטים מקסימום",
  "suggestedButtons": [
    { "text": "טקסט קצר + אימוג'י", "action": "שם_הפעולה", "icon": "אימוג'י" }
  ],
  "isReadyToSummary": false
}

**חשוב מאוד:**
- התשובה שלך צריכה להיות קצרה, ידידותית ואנושית
- אם המשתמש שואל שאלה - ענה עליה תחילה ואז המשך
- אם המשתמש מבולבל - הרגע אותו והסבר
- השתמש באימוג'י אחד-שניים בכל תשובה
- אל תהיה רובוטי!`;

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
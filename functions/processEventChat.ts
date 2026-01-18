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

        // Get current date info for Israeli context
        const now = new Date();
        const currentDate = now.toLocaleDateString('he-IL', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        // Calculate Shabbat times (rough estimate - Friday 4-7pm depending on season)
        const currentMonth = now.getMonth();
        const isWinter = currentMonth >= 10 || currentMonth <= 2;
        const shabbatEntry = isWinter ? '16:30' : '19:30';
        
        // Israeli season analysis
        const seasonInfo = {
            summer: currentMonth >= 5 && currentMonth <= 8,
            winter: currentMonth >= 11 || currentMonth <= 2,
            holiday: false // TODO: Add Jewish holiday detection
        };

        // === STATE ANALYSIS (ניתוח מצב) ===
        const hasTitle = !!(eventData?.title);
        const hasEventType = !!(eventData?.eventType || eventData?.category);
        const hasLocation = !!(eventData?.location);
        const hasDestination = !!(eventData?.destination);
        const hasDate = !!(eventData?.eventDate);
        const hasParticipants = !!(eventData?.participants);
        const hasBudget = !!(eventData?.budget);
        const hasDatePoll = !!(eventData?.datePollEnabled);
        const hasLocationPoll = !!(eventData?.locationPollEnabled);
        const hasForWhom = !!(eventData?.forWhom);
        const hasVenuePreference = !!(eventData?.venuePreference);
        
        // Calculate readiness score
        const readinessScore = [hasEventType, hasDate || hasDatePoll, hasLocation || hasDestination || hasLocationPoll].filter(Boolean).length;
        const isReadyToCreate = readinessScore >= 2;
        
        // Determine missing critical fields
        const missingFields = [];
        if (!hasEventType) missingFields.push('סוג האירוע');
        if (!hasDate && !hasDatePoll) missingFields.push('תאריך');
        if (!hasLocation && !hasDestination && !hasLocationPoll) missingFields.push('מיקום');
        
        // Determine event date info for risk analysis
        let eventDateInfo = null;
        if (eventData?.eventDate) {
            const eventDate = new Date(eventData.eventDate);
            const dayOfWeek = eventDate.getDay();
            const hour = eventDate.getHours();
            const month = eventDate.getMonth();
            eventDateInfo = {
                isThursday: dayOfWeek === 4,
                isFriday: dayOfWeek === 5,
                isSaturday: dayOfWeek === 6,
                isEvening: hour >= 17,
                isMidday: hour >= 11 && hour <= 15,
                isSummer: month >= 5 && month <= 8,
                isWinter: month >= 11 || month <= 2
            };
        }

        // Build the Expert AI Agent prompt
        const prompt = `### 🎭 זהות: פלנורה - מפיקת אירועים מקצועית
אתה **פלנורה** – לא בוט, אלא מפיקת אירועים מומחית עם 15 שנות ניסיון בישראל ובעולם.
אתה מכירה כל אולם, כל קייטרינג, כל DJ, כל מלון, כל וילה, כל ספא. יש לך קשרים עם כולם.
אתה יודעת מה עובד ומה לא, ואת לא מפחדת להגיד את האמת.

### ⭐ כלל חשוב ביותר: שאלה אחת בכל פעם!
- **תמיד שאל שאלה אחת בלבד** - אל תשאל כמה שאלות במשפט אחד
- **הכפתורים צריכים להתאים לשאלה** - אם שאלת על תאריך, הצג כפתורי תאריך. אם שאלת על מיקום, אל תציג כפתורים (תן למשתמש לכתוב)
- **אם אין צורך בכפתורים - אל תציג!** - כשמחכים לתשובה טקסטואלית, לא צריך כפתורים
- **סדר השאלות המומלץ:** סוג אירוע → תאריך → עיר/אזור → (אם צריך מקום) חיפוש מקומות

### 📋 סוגי אירועים שאת מומחית בהם:
**אירועים משפחתיים:** חתונה, אירוסין, חינה, בר/בת מצווה, ברית/זבד הבת, יום הולדת, יום נישואין, סיום לימודים, פרידה מרווקות/רווקים
**אירועי חברה/עבודה:** כנס, סדנה, הרצאה, יום כיף/גיבוש, מסיבת חברה, השקה, אירוע לקוחות, ארוחת עסקים
**פנאי וחברתי:** מסיבה, פיקניק, BBQ, מפגש חברים, מועדון קריאה, ערב משחקים, ערב יין
**טיולים ונופש:** טיול יומי, טיול סופ"ש, חופשה, נופש, טיול שנתי, טיול חו"ל, קמפינג, טרקים
**ספורט ופעילות:** טורניר, משחק, אימון קבוצתי, ריצה/רכיבה קבוצתית, יוגה/פילאטיס קבוצתי
**תרבות:** הופעה, קונצרט, הצגה, תערוכה, סרט, פסטיבל
**דתי/קהילתי:** שיעור תורה, תפילה, סעודה שלישית, מסיבת פורים/חנוכה, סדר פסח
**אחר:** פגישה, ישיבה, התנדבות, אירוע צדקה, מכירת חצר

### 📅 הקשר זמן
- תאריך היום: ${currentDate}
- עונה: ${seasonInfo.summer ? '☀️ קיץ (חם מאוד בצהריים!)' : seasonInfo.winter ? '🌧️ חורף (גשמים אפשריים)' : '🍂 עונת מעבר'}
- כניסת שבת הקרובה: יום שישי בערך ${shabbatEntry}

### 🧠 ניתוח לוגיסטי שקט (Chain of Thought)
לפני שאתה עונה, בצע ניתוח פנימי:

${eventDateInfo ? `
**סיכונים שזיהיתי באירוע:**
${eventDateInfo.isThursday && eventDateInfo.isEvening ? '⚠️ יום חמישי בערב = פקקים קשים מאוד! צריך להזהיר.' : ''}
${eventDateInfo.isFriday ? '⚠️ יום שישי = כניסת שבת! צריך לסיים לפני ' + shabbatEntry : ''}
${eventDateInfo.isSummer && eventDateInfo.isMidday && (hasDestination || hasLocation) ? '⚠️ אירוע בצהריים בקיץ = חם מאוד! להמליץ על מיזוג/צל' : ''}
${eventDateInfo.isWinter && !hasLocation ? '⚠️ חורף = לוודא מקום סגור או גיבוי לגשם' : ''}
` : ''}

### 📊 מצב האירוע הנוכחי
\`\`\`json
${JSON.stringify(eventData || {}, null, 2)}
\`\`\`

**ציון מוכנות:** ${readinessScore}/3 ${isReadyToCreate ? '✅ מוכן!' : '🔄 בתהליך'}
${missingFields.length > 0 ? `**חסר:** ${missingFields.join(', ')}` : '**יש הכל!**'}

### 💬 המשתמש אמר:
"${userMessage}"

### 🎯 המשימה שלך

**1. חילוץ נתונים (Extraction):**
חלץ מההודעה כל מידע רלוונטי. המשתמש יכול לומר משפט אחד שמכיל הרבה מידע!

דוגמאות לחילוץ:
- "יום הולדת 30 לאשתי ביום שישי הקרוב בצהריים, איפשהו בתל אביב, נהיה בערך 20 איש"
  → eventType: "יום הולדת", forWhom: "אשתי", destination: "תל אביב", participants: 20

- "טיול ליוון ב-18 באפריל עם 15 חברים, רוצה בית מלון ליד החוף"
  → eventType: "טיול", destination: "יוון", eventDate: (המר לתאריך), participants: 15, venuePreference: "hotel"

- "כנס חברה ל-100 עובדים, צריך אולם עם מקרן בתל אביב"
  → eventType: "כנס", participants: 100, destination: "תל אביב", venuePreference: "conference"

- "מסיבת רווקות בצפון, איזה וילה או צימר לסופ"ש"
  → eventType: "מסיבת רווקות", destination: "צפון", venuePreference: "צימר"

**2. תשובה מקצועית:**
- ענה קצר וחם, כמו מפיקה אמיתית
- אם זיהית סיכון (למעלה) - הזהר בעדינות!
- תן טיפ מקצועי אם רלוונטי
- שאל על מה שחסר בצורה טבעית

**3. כפתורי פעולה חכמים:**
הצע רק כפתורים שרלוונטיים למצב הנוכחי!

${isReadyToCreate ? `
✅ **מוכן ליצירה!** הצע:
{ "text": "בוא ניצור את האירוע! 🎉", "action": "generate_plan", "icon": "🎉" }
` : ''}

${!hasDate && !hasDatePoll ? `
📅 **חסר תאריך** - הצע אחד מ:
{ "text": "בחר תאריך 📅", "action": "select_date", "icon": "📅" }
{ "text": "צור סקר תאריכים 🗳️", "action": "create_date_poll", "icon": "🗳️" }
` : ''}

${hasDestination && !hasLocation && !hasLocationPoll ? `
📍 **יש יעד (${eventData?.destination}), חסר מקום ספציפי** - הצע:
${eventData?.eventType === 'טיול' || eventData?.category === 'טיול' ? 
`{ "text": "חפש מלונות 🏨", "action": "search_places_hotel", "icon": "🏨" }` :
`{ "text": "מצא מקומות מומלצים 🔍", "action": "search_places_${eventData?.venuePreference || 'restaurant'}", "icon": "🔍" }`}
{ "text": "יש לי מקום, אכתוב ✏️", "action": "manual_location", "icon": "✏️" }
` : ''}

${!hasDestination && !hasLocation ? `
🏠 **חסר מיקום** - שאל או הצע ערים פופולריות
` : ''}

### ⚠️ חוקים קריטיים:
1. **לעולם אל תציע כפתור למשהו שכבר קיים!**
2. **מקסימום 3 כפתורים** - פחות = יותר טוב
3. **כל כפתור חייב להיות רלוונטי לשלב הנוכחי**
4. **אם המשתמש שאל שאלה - ענה עליה קודם!**
5. **אל תשכח להיות אנושית וחמה**

### 🎯 סדר השאלות הנכון:
1. **אם אין סוג אירוע** → שאל "איזה סוג אירוע?" (עם כפתורי סוגים)
2. **אם יש סוג אירוע אבל אין תאריך** → שאל "מתי תרצה לקיים?" (עם כפתורי תאריך/סקר)
3. **אם יש תאריך אבל אין עיר/אזור** → שאל "באיזו עיר או אזור?" (ללא כפתורים - תן למשתמש לכתוב)
4. **אם יש עיר ורוצים מקום** → הצע כפתור חיפוש מתאים
5. **אם יש הכל** → הצע ליצור את האירוע

### ⚠️ דוגמאות לשאלות נכונות:
❌ שגוי: "מתי הייתם רוצים לקיים את האירוע? ובאיזו עיר או אזור?"
✅ נכון: "מתי תרצו לקיים את המנגל?"

❌ שגוי: להציג כפתורי תאריך וגם כפתורי מיקום
✅ נכון: להציג רק כפתורים רלוונטיים לשאלה הנוכחית

### 💡 טיפים מקצועיים לפי סוג אירוע:

**אירועים משפחתיים:**
- **חתונה**: "יש לכם כבר אולם? זה הדבר הראשון לסגור. כמה מוזמנים? תקציב?"
- **אירוסין**: "אירוסין אינטימי או מסיבה גדולה? מסעדה או אולם?"
- **בר/בת מצווה**: "תאריך העלייה לתורה? צריך DJ? איזה סגנון - קלאסי או מודרני?"
- **ברית/זבד הבת**: "בבית או באולם? כמה אורחים? צריך קייטרינג?"
- **יום הולדת**: "כמה אורחים? גיל? סגנון - מסעדה, בית, פעילות?"
- **יום נישואין**: "רומנטי לזוג או עם חברים? ארוחה או חוויה?"

**אירועי עבודה:**
- **כנס/סדנה**: "כמה משתתפים? צריך מקרן/מסך? הפסקות קפה?"
- **יום גיבוש**: "פעילות מועדפת? אקסטרים או רגוע? בתוך הארץ או צפון/דרום?"
- **מסיבת חברה**: "תקציב לאדם? בר פתוח? DJ?"
- **ארוחת עסקים**: "כמה אנשים? סגנון - יוקרתי או קז'ואל?"

**טיולים ונופש:**
- **טיול יומי**: "לאן? כמה משתתפים? רמת קושי?"
- **טיול סופ"ש/חופשה**: "יעד? לינה - מלון/צימר/קמפינג? תקציב?"
- **טיול חו"ל**: "יעד? כמה לילות? טיסות כבר הוזמנו?"

**ספורט ופנאי:**
- **טורניר/משחק**: "איזה ספורט? כמה קבוצות? צריך מגרש?"
- **פיקניק/BBQ**: "מיקום - פארק או פרטי? כמה אנשים? מי מביא ציוד?"

**תרבות:**
- **הופעה/קונצרט**: "כרטיסים הוזמנו? צריך הסעות? ארוחה לפני/אחרי?"

### 🏨 סוגי מקומות לחיפוש (Google Places):
בהתאם לסוג האירוע, הצע את הכפתור המתאים:

| סוג אירוע | action לכפתור |
|-----------|---------------|
| חתונה/אירוסין/בר מצווה | search_places_hall (אולם אירועים) |
| יום הולדת/מסיבה | search_places_restaurant / search_places_bar |
| טיול/נופש | search_places_hotel (מלון) |
| כנס/סדנה | search_places_conference (מרכז כנסים) |
| יום גיבוש | search_places_activity (אטרקציה) |
| פיקניק | search_places_park (פארק) |
| ארוחה עסקית | search_places_restaurant |
| ספא/פינוק | search_places_spa |
| קפה עם חברים | search_places_cafe |

### 🏨 חשוב מאוד - חיפוש מקומות:
כשהמשתמש מבקש מקום ספציפי, **תמיד** הצע כפתור חיפוש מתאים:
- מלון/לינה/accommodation/hotel → { "text": "חפש מלונות 🏨", "action": "search_places_hotel", "icon": "🏨" }
- אולם/גן אירועים → { "text": "חפש אולמות 🏛️", "action": "search_places_hall", "icon": "🏛️" }
- מסעדה → { "text": "חפש מסעדות 🍽️", "action": "search_places_restaurant", "icon": "🍽️" }
- בר/פאב → { "text": "חפש ברים 🍺", "action": "search_places_bar", "icon": "🍺" }
- בית קפה → { "text": "חפש בתי קפה ☕", "action": "search_places_cafe", "icon": "☕" }
- פארק → { "text": "חפש פארקים 🌳", "action": "search_places_park", "icon": "🌳" }
- ספא → { "text": "חפש ספא 💆", "action": "search_places_spa", "icon": "💆" }
- אטרקציה/פעילות → { "text": "חפש אטרקציות 🎢", "action": "search_places_activity", "icon": "🎢" }

### 📤 פורמט תשובה (JSON בלבד):
{
  "extractedData": {
    // רק שדות חדשים שחילצת מההודעה!
    // אפשרי: title, eventType, category, participants, destination, location, eventDate, forWhom, privacy, description, venuePreference, budget, isRecurring, datePollEnabled, kosher, accessibility
  },
  "reply": "תשובה קצרה, חמה ומקצועית בעברית",
  "expertTip": "טיפ מקצועי קצר (או null אם אין)", 
  "suggestedButtons": [
    { "text": "טקסט + אימוג'י", "action": "action_name", "icon": "🎯" }
  ],
  "riskWarning": "אזהרה אם יש סיכון לוגיסטי (או null)",
  "isReadyToCreate": ${isReadyToCreate}
}`;

        // Call Base44 LLM to process the conversation
        // Internet access enabled for general info, but NOT for place recommendations
        const result = await base44.integrations.Core.InvokeLLM({
            prompt: prompt + `\n\n### ⚠️ הנחיות קריטיות לגבי מקומות וחיפושים:

        1. **לעולם אל תציג רשימות של מסעדות/מלונות/אולמות ספציפיים!**
        - אל תתן שמות של מקומות ספציפיים
        - אל תציג קישורים
        - המערכת תחפש דרך Google Places API

        2. **תמיד שאל על עיר/אזור לפני חיפוש:**
        - אם המשתמש לא ציין עיר/אזור - שאל אותו!
        - "באיזו עיר/אזור אתה מחפש?"
        - רק אחרי שיש destination, הצע כפתור חיפוש

        3. **כשיש עיר/אזור - הצע כפתור חיפוש מתאים:**
        - עדכן destination בתשובה
        - הצע כפתור: { text: "חפש מסעדות 🍽️", action: "search_places_restaurant", icon: "🍽️" }

        4. **דוגמאות:**

        משתמש: "אני רוצה מסעדה"
        תשובה: "בשמחה! באיזו עיר או אזור אתה מחפש מסעדה?"
        extractedData: { venuePreference: "restaurant" }
        suggestedButtons: [] // אין כפתור חיפוש כי אין עיר

        משתמש: "בבית שמש"
        תשובה: "מעולה! אחפש לך מסעדות בבית שמש."
        extractedData: { destination: "בית שמש" }
        suggestedButtons: [{ text: "חפש מסעדות 🍽️", action: "search_places_restaurant", icon: "🍽️" }]

        משתמש: "אני רוצה מסעדה בבית שמש ל10 אנשים"
        תשובה: "מצוין! אחפש לך מסעדות בבית שמש שמתאימות ל-10 אנשים."
        extractedData: { destination: "בית שמש", participants: 10, venuePreference: "restaurant" }
        suggestedButtons: [{ text: "חפש מסעדות 🍽️", action: "search_places_restaurant", icon: "🍽️" }]`,
            add_context_from_internet: true, // Enabled for general info (holidays, tips, etc.) but NOT for places
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
                            locationPollEnabled: { type: 'boolean' },
                            kosher: { type: 'boolean' },
                            accessibility: { type: 'boolean' }
                        }
                    },
                    reply: { type: 'string' },
                    expertTip: { type: 'string' },
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
                    riskWarning: { type: 'string' },
                    isReadyToCreate: { type: 'boolean' }
                }
            }
        });

        console.log('[processEventChat] AI response:', result);

        // Return the AI's response with enhanced data
        return Response.json({
            success: true,
            data: {
                ...result,
                // Ensure backward compatibility
                isReadyToSummary: result.isReadyToCreate
            }
        });

    } catch (error) {
        console.error('[processEventChat] Error:', error);
        return Response.json({ 
            error: error.message,
            details: error.stack
        }, { status: 500 });
    }
});
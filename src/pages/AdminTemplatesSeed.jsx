import React, { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2, Sparkles, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  getEventTemplates,
  deleteEventTemplate,
  createEventTemplate,
  getTaskTemplates,
  deleteTaskTemplate,
  createTaskTemplate
} from '@/components/instabackService';

const SEED_DATA = [
  {
    "name": "יום הולדת",
    "title": "יום הולדת",
    "category": "אירוע משפחתי",
    "description": "חגיגת יום הולדת מושלמת",
    "icon": { "displayName": "🎂" },
    "canBePublic": true,
    "default_tasks": [
      { "title": "לבחור תאריך ושעה", "description": "לקבוע מתי החגיגה", "order": 1 },
      { "title": "להזמין אורחים", "description": "לשלוח הזמנות לחברים ומשפחה", "order": 2 },
      { "title": "להזמין עוגה", "description": "לבחור ולהזמין עוגת יום הולדת", "order": 3 },
      { "title": "לקנות קישוטים", "description": "בלונים, שרשראות, כובעים", "order": 4 },
      { "title": "לתכנן פעילויות", "description": "משחקים ופעילויות למסיבה", "order": 5 },
      { "title": "להכין פלייליסט", "description": "מוזיקה לאווירה", "order": 6 },
      { "title": "לקנות מתנה", "description": "לבחור מתנה לחוגג/ת", "order": 7 },
      { "title": "להכין כיבוד", "description": "חטיפים, שתייה ואוכל", "order": 8 }
    ],
    "defaultItinerary": [
      { "title": "קבלת פנים", "offsetMinutes": 0, "duration": 30, "order": 1 },
      { "title": "משחקים ופעילויות", "offsetMinutes": 30, "duration": 60, "order": 2 },
      { "title": "ארוחה/כיבוד", "offsetMinutes": 90, "duration": 45, "order": 3 },
      { "title": "עוגה ושירת יום הולדת", "offsetMinutes": 135, "duration": 20, "order": 4 },
      { "title": "פתיחת מתנות", "offsetMinutes": 155, "duration": 30, "order": 5 },
      { "title": "סיום וחלוקת מתנות לאורחים", "offsetMinutes": 185, "duration": 15, "order": 6 }
    ]
  },
  {
    "name": "חתונה",
    "title": "חתונה",
    "category": "אירוע משפחתי",
    "description": "היום הגדול שלכם",
    "icon": { "displayName": "💒" },
    "canBePublic": false,
    "default_tasks": [
      { "title": "לבחור תאריך", "description": "לקבוע את תאריך החתונה", "order": 1 },
      { "title": "לבחור מקום", "description": "אולם/גן אירועים", "order": 2 },
      { "title": "להזמין צלם ווידאו", "description": "לתעד את הרגעים המיוחדים", "order": 3 },
      { "title": "לבחור קייטרינג", "description": "תפריט ואוכל לאירוע", "order": 4 },
      { "title": "להזמין תקליטן/להקה", "description": "מוזיקה לחתונה", "order": 5 },
      { "title": "לבחור שמלת כלה", "description": "שמלה מושלמת", "order": 6 },
      { "title": "לבחור חליפת חתן", "description": "חליפה אלגנטית", "order": 7 },
      { "title": "להזמין רב/מסדר קידושין", "description": "לטקס החופה", "order": 8 },
      { "title": "לעצב הזמנות", "description": "עיצוב ושליחת הזמנות", "order": 9 },
      { "title": "לארגן הסעות", "description": "הסעות לאורחים", "order": 10 },
      { "title": "להזמין פרחים", "description": "סידורי פרחים וזר כלה", "order": 11 },
      { "title": "לתכנן ירח דבש", "description": "חופשה לאחר החתונה", "order": 12 }
    ],
    "defaultItinerary": [
      { "title": "קבלת פנים", "offsetMinutes": 0, "duration": 60, "order": 1 },
      { "title": "טקס חופה", "offsetMinutes": 60, "duration": 30, "order": 2 },
      { "title": "צילומים", "offsetMinutes": 90, "duration": 45, "order": 3 },
      { "title": "מנה ראשונה", "offsetMinutes": 135, "duration": 45, "order": 4 },
      { "title": "ריקודים ושמחה", "offsetMinutes": 180, "duration": 60, "order": 5 },
      { "title": "מנה עיקרית", "offsetMinutes": 240, "duration": 45, "order": 6 },
      { "title": "ריקודים וחגיגה", "offsetMinutes": 285, "duration": 90, "order": 7 },
      { "title": "קינוח ועוגה", "offsetMinutes": 375, "duration": 30, "order": 8 },
      { "title": "סיום וברכות", "offsetMinutes": 405, "duration": 30, "order": 9 }
    ]
  },
  {
    "name": "אירוסין",
    "title": "אירוסין",
    "category": "אירוע משפחתי",
    "description": "חגיגת האירוסין המושלמת",
    "icon": { "displayName": "💍" },
    "canBePublic": false,
    "default_tasks": [
      { "title": "לבחור מקום", "description": "מסעדה או מקום מיוחד", "order": 1 },
      { "title": "להזמין אורחים", "description": "משפחה וחברים קרובים", "order": 2 },
      { "title": "להזמין צלם", "description": "לתעד את הרגע", "order": 3 },
      { "title": "להכין הפתעות", "description": "פרחים, בלונים, קישוטים", "order": 4 },
      { "title": "להזמין עוגה", "description": "עוגת אירוסין", "order": 5 },
      { "title": "לתאם נאומים", "description": "ברכות מהמשפחה", "order": 6 }
    ],
    "defaultItinerary": [
      { "title": "קבלת פנים", "offsetMinutes": 0, "duration": 30, "order": 1 },
      { "title": "כיבוד קל ושתייה", "offsetMinutes": 30, "duration": 30, "order": 2 },
      { "title": "רגע ההצעה/הכרזה", "offsetMinutes": 60, "duration": 15, "order": 3 },
      { "title": "ברכות ונאומים", "offsetMinutes": 75, "duration": 30, "order": 4 },
      { "title": "ארוחה", "offsetMinutes": 105, "duration": 60, "order": 5 },
      { "title": "עוגה וחגיגה", "offsetMinutes": 165, "duration": 30, "order": 6 }
    ]
  },
  {
    "name": "בר מצווה",
    "title": "בר מצווה",
    "category": "אירוע משפחתי",
    "description": "חגיגת בר המצווה",
    "icon": { "displayName": "✡️" },
    "canBePublic": false,
    "default_tasks": [
      { "title": "לבחור תאריך", "description": "לקבוע תאריך לפי פרשת השבוע", "order": 1 },
      { "title": "לבחור אולם", "description": "מקום לחגיגה", "order": 2 },
      { "title": "להזמין אורחים", "description": "משפחה וחברים", "order": 3 },
      { "title": "לתאם עליה לתורה", "description": "בבית הכנסת", "order": 4 },
      { "title": "להכין נאום", "description": "דבר תורה של הנער", "order": 5 },
      { "title": "להזמין תקליטן", "description": "מוזיקה לחגיגה", "order": 6 },
      { "title": "להזמין צלם", "description": "צילום האירוע", "order": 7 },
      { "title": "לבחור תפריט", "description": "קייטרינג לאירוע", "order": 8 },
      { "title": "להזמין חליפה", "description": "בגדים לנער", "order": 9 }
    ],
    "defaultItinerary": [
      { "title": "תפילת שחרית ועליה לתורה", "offsetMinutes": -180, "duration": 120, "order": 1 },
      { "title": "קידוש בבית הכנסת", "offsetMinutes": -60, "duration": 60, "order": 2 },
      { "title": "קבלת פנים באולם", "offsetMinutes": 0, "duration": 45, "order": 3 },
      { "title": "כניסה לאולם", "offsetMinutes": 45, "duration": 15, "order": 4 },
      { "title": "דבר תורה", "offsetMinutes": 60, "duration": 20, "order": 5 },
      { "title": "ארוחה", "offsetMinutes": 80, "duration": 60, "order": 6 },
      { "title": "ריקודים ושמחה", "offsetMinutes": 140, "duration": 90, "order": 7 },
      { "title": "עוגה וברכות", "offsetMinutes": 230, "duration": 30, "order": 8 }
    ]
  },
  {
    "name": "בת מצווה",
    "title": "בת מצווה",
    "category": "אירוע משפחתי",
    "description": "חגיגת בת המצווה",
    "icon": { "displayName": "✡️" },
    "canBePublic": false,
    "default_tasks": [
      { "title": "לבחור תאריך", "description": "לקבוע תאריך מיוחד", "order": 1 },
      { "title": "לבחור מקום", "description": "אולם או גן אירועים", "order": 2 },
      { "title": "להזמין אורחים", "description": "משפחה וחברות", "order": 3 },
      { "title": "לבחור שמלה", "description": "שמלה מיוחדת לנערה", "order": 4 },
      { "title": "להכין מופע/נאום", "description": "הצגה או דבר תורה", "order": 5 },
      { "title": "להזמין צלם", "description": "צילום האירוע", "order": 6 },
      { "title": "להזמין תקליטן", "description": "מוזיקה לחגיגה", "order": 7 },
      { "title": "לבחור תפריט", "description": "קייטרינג לאירוע", "order": 8 },
      { "title": "לעצב הזמנות", "description": "הזמנות יפות", "order": 9 }
    ],
    "defaultItinerary": [
      { "title": "קבלת פנים", "offsetMinutes": 0, "duration": 45, "order": 1 },
      { "title": "כניסת בת המצווה", "offsetMinutes": 45, "duration": 15, "order": 2 },
      { "title": "מופע/נאום", "offsetMinutes": 60, "duration": 30, "order": 3 },
      { "title": "ארוחה", "offsetMinutes": 90, "duration": 60, "order": 4 },
      { "title": "ריקודים ושמחה", "offsetMinutes": 150, "duration": 90, "order": 5 },
      { "title": "עוגה וברכות", "offsetMinutes": 240, "duration": 30, "order": 6 }
    ]
  },
  {
    "name": "ברית",
    "title": "ברית",
    "category": "אירוע משפחתי",
    "description": "ברית מילה",
    "icon": { "displayName": "👶" },
    "canBePublic": false,
    "default_tasks": [
      { "title": "לקבוע תאריך", "description": "יום השמיני ללידה", "order": 1 },
      { "title": "להזמין מוהל", "description": "למצוא מוהל מוסמך", "order": 2 },
      { "title": "לבחור מקום", "description": "בבית, בית כנסת או אולם", "order": 3 },
      { "title": "להזמין סנדק", "description": "לבחור את הסנדק", "order": 4 },
      { "title": "להזמין אורחים", "description": "משפחה וחברים", "order": 5 },
      { "title": "להכין סעודה", "description": "קייטרינג או בישול", "order": 6 },
      { "title": "להכין בגדים לתינוק", "description": "בגדים לבנים", "order": 7 }
    ],
    "defaultItinerary": [
      { "title": "קבלת פנים", "offsetMinutes": 0, "duration": 20, "order": 1 },
      { "title": "טקס הברית", "offsetMinutes": 20, "duration": 20, "order": 2 },
      { "title": "קריאת השם", "offsetMinutes": 40, "duration": 10, "order": 3 },
      { "title": "ברכות ומזל טוב", "offsetMinutes": 50, "duration": 15, "order": 4 },
      { "title": "סעודת מצווה", "offsetMinutes": 65, "duration": 90, "order": 5 }
    ]
  },
  {
    "name": "זבד הבת",
    "title": "זבד הבת",
    "category": "אירוע משפחתי",
    "description": "חגיגת הולדת הבת",
    "icon": { "displayName": "👶" },
    "canBePublic": false,
    "default_tasks": [
      { "title": "לקבוע תאריך", "description": "לבחור תאריך מיוחד", "order": 1 },
      { "title": "לבחור מקום", "description": "בבית או באולם", "order": 2 },
      { "title": "להזמין רב", "description": "לברכות ולטקס", "order": 3 },
      { "title": "להזמין אורחים", "description": "משפחה וחברים", "order": 4 },
      { "title": "להכין סעודה", "description": "כיבוד או ארוחה", "order": 5 },
      { "title": "להכין קישוטים", "description": "קישוטים בורוד", "order": 6 }
    ],
    "defaultItinerary": [
      { "title": "קבלת פנים", "offsetMinutes": 0, "duration": 20, "order": 1 },
      { "title": "טקס וברכות", "offsetMinutes": 20, "duration": 30, "order": 2 },
      { "title": "קריאת השם", "offsetMinutes": 50, "duration": 10, "order": 3 },
      { "title": "סעודה וחגיגה", "offsetMinutes": 60, "duration": 90, "order": 4 }
    ]
  },
  {
    "name": "מסיבת רווקות",
    "title": "מסיבת רווקות",
    "category": "חברים",
    "description": "לחגוג לפני החתונה",
    "icon": { "displayName": "🥳" },
    "canBePublic": false,
    "default_tasks": [
      { "title": "לתאם תאריך", "description": "למצוא תאריך שמתאים לכולן", "order": 1 },
      { "title": "לבחור מקום", "description": "ספא, מועדון, וילה", "order": 2 },
      { "title": "להזמין את החברות", "description": "לוודא שכולן מגיעות", "order": 3 },
      { "title": "לתכנן הפתעות", "description": "משחקים ופעילויות", "order": 4 },
      { "title": "להזמין אביזרים", "description": "כתרים, אבנטים, קישוטים", "order": 5 },
      { "title": "לתאם הסעות", "description": "איך מגיעות וחוזרות", "order": 6 },
      { "title": "להכין מתנה משותפת", "description": "מתנה מכל החברות", "order": 7 }
    ],
    "defaultItinerary": [
      { "title": "התכנסות", "offsetMinutes": 0, "duration": 30, "order": 1 },
      { "title": "פעילות/ספא", "offsetMinutes": 30, "duration": 120, "order": 2 },
      { "title": "ארוחה", "offsetMinutes": 150, "duration": 60, "order": 3 },
      { "title": "משחקים והפתעות", "offsetMinutes": 210, "duration": 60, "order": 4 },
      { "title": "מסיבה וריקודים", "offsetMinutes": 270, "duration": 120, "order": 5 }
    ]
  },
  {
    "name": "מסיבת רווקים",
    "title": "מסיבת רווקים",
    "category": "חברים",
    "description": "לחגוג לפני החתונה",
    "icon": { "displayName": "🎉" },
    "canBePublic": false,
    "default_tasks": [
      { "title": "לתאם תאריך", "description": "למצוא תאריך שמתאים לכולם", "order": 1 },
      { "title": "לבחור פעילות", "description": "פיינטבול, אסקייפ רום, גו-קארט", "order": 2 },
      { "title": "להזמין את החברים", "description": "לוודא שכולם מגיעים", "order": 3 },
      { "title": "להזמין מקום", "description": "בר, מסעדה או וילה", "order": 4 },
      { "title": "לתאם הסעות", "description": "איך מגיעים וחוזרים", "order": 5 },
      { "title": "להכין הפתעות", "description": "פעילויות מיוחדות", "order": 6 }
    ],
    "defaultItinerary": [
      { "title": "התכנסות", "offsetMinutes": 0, "duration": 30, "order": 1 },
      { "title": "פעילות אקסטרים", "offsetMinutes": 30, "duration": 120, "order": 2 },
      { "title": "ארוחה", "offsetMinutes": 150, "duration": 60, "order": 3 },
      { "title": "בר/מועדון", "offsetMinutes": 210, "duration": 180, "order": 4 }
    ]
  },
  {
    "name": "מסיבה",
    "title": "מסיבה",
    "category": "חברים",
    "description": "מסיבה חופשית",
    "icon": { "displayName": "🎊" },
    "canBePublic": true,
    "default_tasks": [
      { "title": "לקבוע תאריך ומקום", "description": "מתי ואיפה", "order": 1 },
      { "title": "להזמין אורחים", "description": "לשלוח הזמנות", "order": 2 },
      { "title": "להכין פלייליסט", "description": "מוזיקה למסיבה", "order": 3 },
      { "title": "לקנות שתייה", "description": "משקאות לאורחים", "order": 4 },
      { "title": "לקנות חטיפים", "description": "כיבוד למסיבה", "order": 5 },
      { "title": "לקנות קישוטים", "description": "לקשט את המקום", "order": 6 }
    ],
    "defaultItinerary": [
      { "title": "קבלת פנים", "offsetMinutes": 0, "duration": 30, "order": 1 },
      { "title": "מוזיקה וריקודים", "offsetMinutes": 30, "duration": 120, "order": 2 },
      { "title": "כיבוד", "offsetMinutes": 150, "duration": 30, "order": 3 },
      { "title": "המשך חגיגה", "offsetMinutes": 180, "duration": 120, "order": 4 }
    ]
  },
  {
    "name": "טיול",
    "title": "טיול",
    "category": "חוץ",
    "description": "טיול מאורגן",
    "icon": { "displayName": "✈️" },
    "canBePublic": true,
    "default_tasks": [
      { "title": "לבחור יעד", "description": "לאן נוסעים", "order": 1 },
      { "title": "לקבוע תאריכים", "description": "מתי יוצאים וחוזרים", "order": 2 },
      { "title": "להזמין טיסות", "description": "כרטיסי טיסה", "order": 3 },
      { "title": "להזמין לינה", "description": "מלון/צימר/Airbnb", "order": 4 },
      { "title": "לתכנן אטרקציות", "description": "מה עושים בכל יום", "order": 5 },
      { "title": "להזמין רכב", "description": "השכרת רכב אם צריך", "order": 6 },
      { "title": "לארוז", "description": "רשימת ציוד לאריזה", "order": 7 },
      { "title": "לבדוק ביטוח", "description": "ביטוח נסיעות", "order": 8 }
    ],
    "defaultItinerary": [
      { "title": "יציאה מהבית", "offsetMinutes": 0, "duration": 60, "order": 1 },
      { "title": "הגעה ליעד", "offsetMinutes": 60, "duration": 30, "order": 2 },
      { "title": "צ'ק-אין ומנוחה", "offsetMinutes": 90, "duration": 60, "order": 3 },
      { "title": "סיור ראשון", "offsetMinutes": 150, "duration": 180, "order": 4 },
      { "title": "ארוחת ערב", "offsetMinutes": 330, "duration": 90, "order": 5 }
    ]
  },
  {
    "name": "אירוע עבודה",
    "title": "אירוע עבודה",
    "category": "עבודה",
    "description": "אירוע או גיבוש עבודה",
    "icon": { "displayName": "🏢" },
    "canBePublic": false,
    "default_tasks": [
      { "title": "לקבוע תאריך", "description": "לתאם עם כל הצוות", "order": 1 },
      { "title": "לבחור מקום", "description": "אולם, מלון או חיצוני", "order": 2 },
      { "title": "לשלוח הזמנות", "description": "להזמין את העובדים", "order": 3 },
      { "title": "לתכנן פעילויות", "description": "גיבוש, הרצאות, סדנאות", "order": 4 },
      { "title": "להזמין קייטרינג", "description": "אוכל ושתייה", "order": 5 },
      { "title": "להכין מצגת", "description": "אם יש הרצאות", "order": 6 },
      { "title": "לתאם הסעות", "description": "הסעה מרוכזת", "order": 7 }
    ],
    "defaultItinerary": [
      { "title": "התכנסות וקפה", "offsetMinutes": 0, "duration": 30, "order": 1 },
      { "title": "פתיחה ודברי ברכה", "offsetMinutes": 30, "duration": 15, "order": 2 },
      { "title": "פעילות/הרצאה", "offsetMinutes": 45, "duration": 90, "order": 3 },
      { "title": "הפסקה", "offsetMinutes": 135, "duration": 15, "order": 4 },
      { "title": "פעילות גיבוש", "offsetMinutes": 150, "duration": 90, "order": 5 },
      { "title": "ארוחה", "offsetMinutes": 240, "duration": 60, "order": 6 },
      { "title": "סיום", "offsetMinutes": 300, "duration": 30, "order": 7 }
    ]
  },
  {
    "name": "כנס",
    "title": "כנס",
    "category": "עבודה",
    "description": "כנס מקצועי",
    "icon": { "displayName": "🎤" },
    "canBePublic": true,
    "default_tasks": [
      { "title": "לקבוע תאריך ומקום", "description": "מרכז כנסים או מלון", "order": 1 },
      { "title": "לגייס מרצים", "description": "להזמין מרצים", "order": 2 },
      { "title": "לפתוח הרשמה", "description": "טופס הרשמה למשתתפים", "order": 3 },
      { "title": "להכין תוכנית", "description": "לוח זמנים של ההרצאות", "order": 4 },
      { "title": "להזמין ציוד", "description": "מיקרופון, מקרן, מסכים", "order": 5 },
      { "title": "להזמין קייטרינג", "description": "קפה, עוגיות, ארוחה", "order": 6 },
      { "title": "להכין שילוט", "description": "שלטים והכוונה", "order": 7 },
      { "title": "להכין חומרים", "description": "תיקים, חוברות, עטים", "order": 8 }
    ],
    "defaultItinerary": [
      { "title": "הרשמה וקפה", "offsetMinutes": 0, "duration": 30, "order": 1 },
      { "title": "פתיחה", "offsetMinutes": 30, "duration": 15, "order": 2 },
      { "title": "הרצאה ראשונה", "offsetMinutes": 45, "duration": 45, "order": 3 },
      { "title": "הרצאה שנייה", "offsetMinutes": 90, "duration": 45, "order": 4 },
      { "title": "הפסקת קפה", "offsetMinutes": 135, "duration": 20, "order": 5 },
      { "title": "הרצאה שלישית", "offsetMinutes": 155, "duration": 45, "order": 6 },
      { "title": "פאנל שאלות", "offsetMinutes": 200, "duration": 30, "order": 7 },
      { "title": "ארוחה ונטוורקינג", "offsetMinutes": 230, "duration": 60, "order": 8 },
      { "title": "סיום", "offsetMinutes": 290, "duration": 15, "order": 9 }
    ]
  },
  {
    "name": "פגישה",
    "title": "פגישה",
    "category": "עבודה",
    "description": "פגישה עסקית או אישית",
    "icon": { "displayName": "📅" },
    "canBePublic": false,
    "default_tasks": [
      { "title": "לקבוע זמן", "description": "לתאם שעה מתאימה", "order": 1 },
      { "title": "לבחור מקום", "description": "משרד, קפה או זום", "order": 2 },
      { "title": "להכין אג'נדה", "description": "נושאים לדיון", "order": 3 },
      { "title": "לשלוח תזכורת", "description": "תזכורת למשתתפים", "order": 4 }
    ],
    "defaultItinerary": [
      { "title": "פתיחה", "offsetMinutes": 0, "duration": 5, "order": 1 },
      { "title": "דיון", "offsetMinutes": 5, "duration": 45, "order": 2 },
      { "title": "סיכום ומשימות", "offsetMinutes": 50, "duration": 10, "order": 3 }
    ]
  },
  {
    "name": "סדנה",
    "title": "סדנה",
    "category": "עבודה",
    "description": "סדנה או קורס",
    "icon": { "displayName": "🎨" },
    "canBePublic": true,
    "default_tasks": [
      { "title": "לקבוע נושא", "description": "מה הסדנה מלמדת", "order": 1 },
      { "title": "לבחור מנחה", "description": "מי מעביר את הסדנה", "order": 2 },
      { "title": "לקבוע מקום", "description": "סטודיו או חלל מתאים", "order": 3 },
      { "title": "להכין חומרים", "description": "ציוד וחומרי לימוד", "order": 4 },
      { "title": "לפתוח הרשמה", "description": "טופס הרשמה", "order": 5 },
      { "title": "לשלוח פרטים", "description": "מה להביא ואיך להתכונן", "order": 6 }
    ],
    "defaultItinerary": [
      { "title": "קבלת פנים", "offsetMinutes": 0, "duration": 15, "order": 1 },
      { "title": "הסבר תיאורטי", "offsetMinutes": 15, "duration": 30, "order": 2 },
      { "title": "תרגול מעשי", "offsetMinutes": 45, "duration": 60, "order": 3 },
      { "title": "הפסקה", "offsetMinutes": 105, "duration": 15, "order": 4 },
      { "title": "המשך תרגול", "offsetMinutes": 120, "duration": 45, "order": 5 },
      { "title": "סיכום ושאלות", "offsetMinutes": 165, "duration": 15, "order": 6 }
    ]
  },
  {
    "name": "יום נישואין",
    "title": "יום נישואין",
    "category": "אירוע משפחתי",
    "description": "חגיגת יום הנישואין",
    "icon": { "displayName": "💕" },
    "canBePublic": false,
    "default_tasks": [
      { "title": "לבחור מקום", "description": "מסעדה רומנטית או נסיעה", "order": 1 },
      { "title": "להזמין מקום", "description": "הזמנה מראש", "order": 2 },
      { "title": "לקנות מתנה", "description": "מתנה מיוחדת", "order": 3 },
      { "title": "להזמין פרחים", "description": "זר פרחים", "order": 4 },
      { "title": "לתאם בייביסיטר", "description": "אם יש ילדים", "order": 5 }
    ],
    "defaultItinerary": [
      { "title": "הפתעה/מתנה", "offsetMinutes": 0, "duration": 15, "order": 1 },
      { "title": "ארוחה רומנטית", "offsetMinutes": 15, "duration": 120, "order": 2 },
      { "title": "פעילות משותפת", "offsetMinutes": 135, "duration": 60, "order": 3 }
    ]
  },
  {
    "name": "סיום לימודים",
    "title": "סיום לימודים",
    "category": "אירוע משפחתי",
    "description": "חגיגת סיום לימודים",
    "icon": { "displayName": "🎓" },
    "canBePublic": true,
    "default_tasks": [
      { "title": "לאשר השתתפות בטקס", "description": "הרשמה לטקס רשמי", "order": 1 },
      { "title": "להזמין משפחה", "description": "לוודא שכולם מגיעים", "order": 2 },
      { "title": "לתכנן חגיגה", "description": "מסיבה אחרי הטקס", "order": 3 },
      { "title": "להזמין מקום", "description": "מסעדה או בבית", "order": 4 },
      { "title": "לקנות פרחים", "description": "זר לבוגר/ת", "order": 5 },
      { "title": "להכין מתנה", "description": "מתנת סיום", "order": 6 }
    ],
    "defaultItinerary": [
      { "title": "הגעה לטקס", "offsetMinutes": 0, "duration": 30, "order": 1 },
      { "title": "טקס סיום", "offsetMinutes": 30, "duration": 120, "order": 2 },
      { "title": "צילומים", "offsetMinutes": 150, "duration": 30, "order": 3 },
      { "title": "מסיבת סיום", "offsetMinutes": 180, "duration": 120, "order": 4 }
    ]
  },
  {
    "name": "פרישה",
    "title": "פרישה",
    "category": "עבודה",
    "description": "חגיגת פרישה מעבודה",
    "icon": { "displayName": "🎊" },
    "canBePublic": false,
    "default_tasks": [
      { "title": "לקבוע תאריך", "description": "לתאם עם הפורש/ת", "order": 1 },
      { "title": "לבחור מקום", "description": "באולם, מסעדה או משרד", "order": 2 },
      { "title": "להזמין עמיתים", "description": "קולגות ומנהלים", "order": 3 },
      { "title": "להכין מתנה", "description": "מתנה מכל הצוות", "order": 4 },
      { "title": "לתאם נאומים", "description": "דברי פרידה", "order": 5 },
      { "title": "להכין מצגת", "description": "תמונות וזיכרונות", "order": 6 },
      { "title": "להזמין קייטרינג", "description": "כיבוד או ארוחה", "order": 7 }
    ],
    "defaultItinerary": [
      { "title": "קבלת פנים", "offsetMinutes": 0, "duration": 20, "order": 1 },
      { "title": "פתיחה ומצגת", "offsetMinutes": 20, "duration": 20, "order": 2 },
      { "title": "נאומים וזיכרונות", "offsetMinutes": 40, "duration": 40, "order": 3 },
      { "title": "מתן מתנה", "offsetMinutes": 80, "duration": 15, "order": 4 },
      { "title": "כיבוד וחגיגה", "offsetMinutes": 95, "duration": 60, "order": 5 }
    ]
  },
  {
    "name": "חנוכת בית",
    "title": "חנוכת בית",
    "category": "אירוע משפחתי",
    "description": "חנוכת בית חדש",
    "icon": { "displayName": "🏠" },
    "canBePublic": false,
    "default_tasks": [
      { "title": "לקבוע תאריך", "description": "אחרי שהבית מסודר", "order": 1 },
      { "title": "להזמין אורחים", "description": "משפחה וחברים", "order": 2 },
      { "title": "לסדר את הבית", "description": "לנקות ולסדר", "order": 3 },
      { "title": "להכין כיבוד", "description": "אוכל ושתייה", "order": 4 },
      { "title": "להכין סיור", "description": "להציג את הבית", "order": 5 }
    ],
    "defaultItinerary": [
      { "title": "קבלת אורחים", "offsetMinutes": 0, "duration": 30, "order": 1 },
      { "title": "סיור בבית", "offsetMinutes": 30, "duration": 30, "order": 2 },
      { "title": "כיבוד ושיחות", "offsetMinutes": 60, "duration": 90, "order": 3 },
      { "title": "לחיים!", "offsetMinutes": 150, "duration": 30, "order": 4 }
    ]
  },
  {
    "name": "בייבי שאוור",
    "title": "בייבי שאוור",
    "category": "אירוע משפחתי",
    "description": "חגיגה לקראת לידה",
    "icon": { "displayName": "👶💝" },
    "canBePublic": false,
    "default_tasks": [
      { "title": "לקבוע תאריך", "description": "חודש-חודשיים לפני הלידה", "order": 1 },
      { "title": "לבחור מקום", "description": "בבית או בקפה", "order": 2 },
      { "title": "להזמין חברות", "description": "חברות קרובות", "order": 3 },
      { "title": "לתכנן משחקים", "description": "משחקי בייבי שאוער", "order": 4 },
      { "title": "להזמין עוגה", "description": "עוגה מעוצבת", "order": 5 },
      { "title": "לקנות קישוטים", "description": "בלונים וקישוטים", "order": 6 },
      { "title": "לתאם מתנות", "description": "רשימת מתנות", "order": 7 }
    ],
    "defaultItinerary": [
      { "title": "קבלת פנים", "offsetMinutes": 0, "duration": 20, "order": 1 },
      { "title": "משחקים", "offsetMinutes": 20, "duration": 45, "order": 2 },
      { "title": "כיבוד", "offsetMinutes": 65, "duration": 30, "order": 3 },
      { "title": "פתיחת מתנות", "offsetMinutes": 95, "duration": 40, "order": 4 },
      { "title": "עוגה וצילומים", "offsetMinutes": 135, "duration": 25, "order": 5 }
    ]
  },
  {
    "name": "ארוחת שבת",
    "title": "ארוחת שבת",
    "category": "אירוע משפחתי",
    "description": "ארוחת שבת משפחתית",
    "icon": { "displayName": "🕯️" },
    "canBePublic": false,
    "default_tasks": [
      { "title": "לתכנן תפריט", "description": "מה מבשלים", "order": 1 },
      { "title": "לקנות מצרכים", "description": "קניות לשבת", "order": 2 },
      { "title": "להזמין אורחים", "description": "לאשר מי מגיע", "order": 3 },
      { "title": "לבשל", "description": "הכנת האוכל", "order": 4 },
      { "title": "לסדר את השולחן", "description": "ערוך שולחן חגיגי", "order": 5 },
      { "title": "להכין חלות", "description": "חלות לשבת", "order": 6 }
    ],
    "defaultItinerary": [
      { "title": "הדלקת נרות", "offsetMinutes": 0, "duration": 5, "order": 1 },
      { "title": "קידוש", "offsetMinutes": 5, "duration": 5, "order": 2 },
      { "title": "נטילת ידיים וברכה", "offsetMinutes": 10, "duration": 5, "order": 3 },
      { "title": "מנה ראשונה", "offsetMinutes": 15, "duration": 30, "order": 4 },
      { "title": "מנה עיקרית", "offsetMinutes": 45, "duration": 45, "order": 5 },
      { "title": "קינוח ושירים", "offsetMinutes": 90, "duration": 30, "order": 6 },
      { "title": "ברכת המזון", "offsetMinutes": 120, "duration": 10, "order": 7 }
    ]
  },
  {
    "name": "חג",
    "title": "חג",
    "category": "אירוע משפחתי",
    "description": "אירוע חג",
    "icon": { "displayName": "🎊" },
    "canBePublic": false,
    "default_tasks": [
      { "title": "לתכנן תפריט", "description": "מאכלי החג", "order": 1 },
      { "title": "להזמין משפחה", "description": "לתאם מי מגיע", "order": 2 },
      { "title": "לקנות מצרכים", "description": "קניות לחג", "order": 3 },
      { "title": "להכין את הבית", "description": "לקשט לחג", "order": 4 },
      { "title": "להכין פעילויות", "description": "פעילויות לילדים", "order": 5 }
    ],
    "defaultItinerary": [
      { "title": "קבלת אורחים", "offsetMinutes": 0, "duration": 30, "order": 1 },
      { "title": "טקס החג", "offsetMinutes": 30, "duration": 20, "order": 2 },
      { "title": "ארוחת חג", "offsetMinutes": 50, "duration": 90, "order": 3 },
      { "title": "פעילות משפחתית", "offsetMinutes": 140, "duration": 60, "order": 4 },
      { "title": "קינוח", "offsetMinutes": 200, "duration": 30, "order": 5 }
    ]
  },
  {
    "name": "אזכרה",
    "title": "אזכרה",
    "category": "אירוע משפחתי",
    "description": "אזכרה לזכר יקירים",
    "icon": { "displayName": "🕯️" },
    "canBePublic": false,
    "default_tasks": [
      { "title": "לקבוע תאריך", "description": "לפי התאריך העברי", "order": 1 },
      { "title": "להודיע למשפחה", "description": "לתאם עם כולם", "order": 2 },
      { "title": "לתאם עם בית העלמין", "description": "אם יש טקס", "order": 3 },
      { "title": "להזמין רב", "description": "לתפילות ומילים", "order": 4 },
      { "title": "להכין סעודה", "description": "סעודת אזכרה", "order": 5 }
    ],
    "defaultItinerary": [
      { "title": "התכנסות", "offsetMinutes": 0, "duration": 15, "order": 1 },
      { "title": "ביקור בקבר", "offsetMinutes": 15, "duration": 30, "order": 2 },
      { "title": "תפילה ודברי זיכרון", "offsetMinutes": 45, "duration": 20, "order": 3 },
      { "title": "סעודת אזכרה", "offsetMinutes": 65, "duration": 60, "order": 4 }
    ]
  },
  {
    "name": "אירוע ספורט",
    "title": "אירוע ספורט",
    "category": "חוץ",
    "description": "משחק או פעילות ספורטיבית",
    "icon": { "displayName": "⚽" },
    "canBePublic": true,
    "default_tasks": [
      { "title": "לקבוע תאריך ושעה", "description": "למצוא זמן מתאים", "order": 1 },
      { "title": "להזמין מגרש", "description": "לשריין מקום", "order": 2 },
      { "title": "לאסוף שחקנים", "description": "לוודא מספיק משתתפים", "order": 3 },
      { "title": "להביא ציוד", "description": "כדור, קונוסים וכו'", "order": 4 },
      { "title": "להביא מים", "description": "שתייה למשתתפים", "order": 5 }
    ],
    "defaultItinerary": [
      { "title": "התכנסות וחימום", "offsetMinutes": 0, "duration": 15, "order": 1 },
      { "title": "משחק", "offsetMinutes": 15, "duration": 90, "order": 2 },
      { "title": "הפסקה", "offsetMinutes": 105, "duration": 10, "order": 3 },
      { "title": "המשך משחק", "offsetMinutes": 115, "duration": 45, "order": 4 }
    ]
  },
  {
    "name": "הופעה",
    "title": "הופעה",
    "category": "חוץ",
    "description": "הופעה או קונצרט",
    "icon": { "displayName": "🎵" },
    "canBePublic": true,
    "default_tasks": [
      { "title": "לקנות כרטיסים", "description": "להזמין מוקדם", "order": 1 },
      { "title": "לתאם הגעה", "description": "איך מגיעים", "order": 2 },
      { "title": "למצוא חניה", "description": "לבדוק אפשרויות חניה", "order": 3 },
      { "title": "לתאם מפגש", "description": "איפה נפגשים לפני", "order": 4 }
    ],
    "defaultItinerary": [
      { "title": "מפגש לפני", "offsetMinutes": -60, "duration": 30, "order": 1 },
      { "title": "הגעה למקום", "offsetMinutes": -30, "duration": 30, "order": 2 },
      { "title": "הופעה", "offsetMinutes": 0, "duration": 150, "order": 3 },
      { "title": "אחרי ההופעה", "offsetMinutes": 150, "duration": 30, "order": 4 }
    ]
  },
  {
    "name": "פיקניק",
    "title": "פיקניק",
    "category": "חוץ",
    "description": "פיקניק בטבע",
    "icon": { "displayName": "🧺" },
    "canBePublic": true,
    "default_tasks": [
      { "title": "לבחור מקום", "description": "פארק, חוף או יער", "order": 1 },
      { "title": "לתאם תאריך", "description": "לבדוק מזג אוויר", "order": 2 },
      { "title": "להכין אוכל", "description": "כריכים, סלטים, פירות", "order": 3 },
      { "title": "לארוז ציוד", "description": "שמיכה, צלחות, כלים", "order": 4 },
      { "title": "להביא משחקים", "description": "פריזבי, כדור, קלפים", "order": 5 }
    ],
    "defaultItinerary": [
      { "title": "הגעה וסידור", "offsetMinutes": 0, "duration": 20, "order": 1 },
      { "title": "ארוחה", "offsetMinutes": 20, "duration": 60, "order": 2 },
      { "title": "משחקים", "offsetMinutes": 80, "duration": 60, "order": 3 },
      { "title": "מנוחה וקינוח", "offsetMinutes": 140, "duration": 30, "order": 4 },
      { "title": "איסוף ופינוי", "offsetMinutes": 170, "duration": 20, "order": 5 }
    ]
  },
  {
    "name": "על האש",
    "title": "על האש",
    "category": "חוץ",
    "description": "מנגל עם חברים",
    "icon": { "displayName": "🔥" },
    "canBePublic": true,
    "default_tasks": [
      { "title": "לבחור מקום", "description": "פארק, חצר או חוף", "order": 1 },
      { "title": "לקנות בשר", "description": "סטייקים, נקניקיות, המבורגר", "order": 2 },
      { "title": "לקנות ירקות", "description": "סלטים ותוספות", "order": 3 },
      { "title": "להביא פחמים", "description": "פחם, מצית", "order": 4 },
      { "title": "להביא ציוד", "description": "מנגל, מלקחיים, צלחות", "order": 5 },
      { "title": "להביא שתייה", "description": "בירה, מים, שתייה קלה", "order": 6 }
    ],
    "defaultItinerary": [
      { "title": "הגעה והדלקת האש", "offsetMinutes": 0, "duration": 30, "order": 1 },
      { "title": "צלייה ואכילה", "offsetMinutes": 30, "duration": 120, "order": 2 },
      { "title": "שיחות וחברה", "offsetMinutes": 150, "duration": 60, "order": 3 },
      { "title": "קינוח", "offsetMinutes": 210, "duration": 20, "order": 4 },
      { "title": "איסוף וניקוי", "offsetMinutes": 230, "duration": 30, "order": 5 }
    ]
  }
];

export default function AdminTemplatesSeed() {
  const { isAuthenticated } = useAuth();
  const [isWorking, setIsWorking] = useState(false);
  const [log, setLog] = useState([]);

  const addLog = (line) => setLog(prev => [...prev, line]);

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const deleteAll = async () => {
    // Delete TaskTemplates first
    addLog('מוחק TaskTemplate קיימים...');
    const allTasks = await getTaskTemplates().catch(() => []);
    for (const tt of allTasks) {
      try {
        await deleteTaskTemplate(tt.id);
        await sleep(50);
      } catch (e) {
        console.warn('Failed deleting task template', tt.id, e);
      }
    }
    addLog(`נמחקו ${allTasks.length} משימות תבנית.`);

    // Then delete EventTemplates
    addLog('מוחק EventTemplate קיימים...');
    const allEvents = await getEventTemplates().catch(() => []);
    for (const et of allEvents) {
      try {
        await deleteEventTemplate(et.id);
        await sleep(80);
      } catch (e) {
        console.warn('Failed deleting event template', et.id, e);
      }
    }
    addLog(`נמחקו ${allEvents.length} תבניות אירוע.`);
  };

  const seedAll = async () => {
    setIsWorking(true);
    setLog([]);
    try {
      if (!isAuthenticated) {
        toast.error('צריך להיכנס למערכת כדי לבצע פעולה זו');
        setIsWorking(false);
        return;
      }

      toast.info('מתחיל מחיקה מלאה...');
      await deleteAll();
      toast.success('המחיקה הסתיימה, מזריע תבניות...');

      let insertedTemplates = 0;
      let insertedTasks = 0;

      for (let i = 0; i < SEED_DATA.length; i++) {
        const tpl = SEED_DATA[i];
        addLog(`יוצר תבנית: ${tpl.name}`);
        const created = await createEventTemplate({
          title: tpl.title || tpl.name,
          description: tpl.description,
          category: tpl.category,
          iconDisplayName: tpl.icon?.displayName,
          canBePublic: tpl.canBePublic ?? true,
          order: i,
          default_tasks: tpl.default_tasks,
          defaultItinerary: tpl.defaultItinerary
        });

        const templateId = created?.id;
        if (!templateId) {
          addLog(`אזהרה: לא התקבל מזהה לתבנית "${tpl.name}"`);
          continue;
        }
        insertedTemplates++;

        // Create TaskTemplate records for each default task
        if (tpl.default_tasks && tpl.default_tasks.length > 0) {
          for (const task of tpl.default_tasks) {
            try {
              await createTaskTemplate({
                eventTemplateId: templateId,
                templateId: templateId,
                title: task.title,
                description: task.description || '',
                order: task.order || 0,
                days_before: task.due_offset_days || 0,
                priority: task.priority || 'medium'
              });
              insertedTasks++;
              await sleep(50);
            } catch (taskErr) {
              console.warn('Failed to create task template:', taskErr);
            }
          }
          addLog(`  ← נוספו ${tpl.default_tasks.length} משימות לתבנית "${tpl.name}"`);
        }

        await sleep(120);
        }

      addLog(`הוזנו ${insertedTemplates} תבניות ו-${insertedTasks} משימות תבנית.`);
      toast.success('הזריעה הושלמה בהצלחה!');
    } catch (e) {
      console.error(e);
      toast.error('אירעה שגיאה בהזרעה', { description: e?.message });
      addLog(`שגיאה: ${e?.message || 'לא ידועה'}`);
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6" style={{ direction: 'rtl' }}>
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-orange-500" />
              <h1 className="text-xl font-bold">זריעה מחדש של EventTemplate + TaskTemplate (InstaBack)</h1>
            </div>
            <p className="text-gray-600 text-sm">
              הפעולה תמחק את כל התבניות והמשימות הקיימות בטבלאות EventTemplate ו-TaskTemplate ב-InstaBack ותזין מחדש את הרשימה שסיפקת, לפי הסדר.
            </p>

            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={seedAll}
                disabled={isWorking}
                className="gap-2"
              >
                {isWorking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                נקה והזן מחדש
              </Button>
              <Button
                variant="outline"
                onClick={async () => { setIsWorking(true); setLog([]); await deleteAll(); setIsWorking(false); toast.success('נמחקו כל התבניות'); }}
                disabled={isWorking}
              >
                מחיקה בלבד
              </Button>
            </div>

            <div className="bg-gray-100 rounded p-3 max-h-64 overflow-auto text-xs">
              {log.length === 0 ? (
                <div className="text-gray-500">יומן פעולות יוצג כאן…</div>
              ) : (
                log.map((l, idx) => <div key={idx} className="text-gray-700">{l}</div>)
              )}
            </div>

            <div className="flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle2 className="w-4 h-4" />
              הערה: נשמר גם שדה סדר (order) לפי מיקום ברשימה.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
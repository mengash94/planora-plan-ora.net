import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50 px-4 py-8" style={{ direction: 'rtl' }}>
      <div className="max-w-3xl mx-auto">
        <Card className="border-orange-100">
          <CardHeader>
            <CardTitle className="text-2xl">מדיניות פרטיות</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-gray-800 leading-7">
            <section>
              <p>
                ברוכים הבאים ל-Planora. אנו מכבדים את פרטיות המשתמשים שלנו ומתחייבים להגן על המידע האישי שנאסף במסגרת שימושכם בשירות.
                מדיניות זו מסבירה אילו נתונים אנו אוספים, כיצד אנו משתמשים בהם, ואילו זכויות יש לכם.
              </p>
            </section>

            <section>
              <h2 className="font-bold">איזה מידע נאסף</h2>
              <ul className="list-disc pr-5 space-y-1">
                <li>פרטי חשבון: שם, אימייל, תמונת פרופיל (אם קיימת).</li>
                <li>מידע שימוש: פעולות שבוצעו באפליקציה, דפים שנצפו, תאריכים ושעות.</li>
                <li>תוכן אירועים: כותרות ותיאורים של אירועים, משימות, הודעות וצירופי קבצים שנשלחים על ידכם.</li>
                <li>מידע טכני: סוג דפדפן, מערכת הפעלה, כתובת IP (לצרכי אבטחה ותפעול).</li>
              </ul>
            </section>

            <section>
              <h2 className="font-bold">כיצד אנו משתמשים במידע</h2>
              <ul className="list-disc pr-5 space-y-1">
                <li>מתן וגישה לשירות, ניהול חשבון ושיפור חוויית המשתמש.</li>
                <li>שליחת עדכונים תפעוליים, התראות רלוונטיות ותמיכה.</li>
                <li>שיפור ביצועים, אבטחה, ומניעת שימוש לרעה.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-bold">שיתוף מידע</h2>
              <p>
                אנו איננו מוכרים מידע אישי לצדדים שלישיים. ייתכן שנשתף מידע עם ספקי שירות המשמשים אותנו לתפעול המערכת (כגון אחסון, ניתוח נתונים ואבטחה)
                בכפוף להסכמים ולדרישות אבטחה מחמירות, וכן כאשר החוק מחייב אותנו לעשות כן.
              </p>
            </section>

            <section>
              <h2 className="font-bold">אבטחה ושמירת מידע</h2>
              <p>
                אנו משתמשים באמצעי אבטחה מקובלים להגנה על המידע. יחד עם זאת, אף מערכת אינה חסינה לחלוטין.
                נשמור מידע אישי רק כל עוד הוא נדרש לצורך מתן השירות ועמידה בדרישות חוק.
              </p>
            </section>

            <section>
              <h2 className="font-bold">קוקיות וטכנולוגיות דומות</h2>
              <p>
                האפליקציה עשויה להשתמש בעוגיות (Cookies) ובטכנולוגיות דומות לשיפור חוויית המשתמש, ניתוח שימוש ותפקוד.
                ניתן לנהל העדפות דרך הגדרות הדפדפן.
              </p>
            </section>

            <section>
              <h2 className="font-bold">זכויות המשתמש</h2>
              <ul className="list-disc pr-5 space-y-1">
                <li>גישת עיון במידע האישי שלכם ותיקונו.</li>
                <li>מחיקת חשבון ומידע, בכפוף לדרישות חוק ולמחויבויות תפעוליות.</li>
                <li>הגבלת עיבוד וניוד מידע – בהתאם לדין החל.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-bold">עדכונים למדיניות</h2>
              <p>
                מעת לעת נעדכן מסמך זה. נציין את מועד העדכון האחרון ונשתדל להודיע על שינויים מהותיים.
              </p>
            </section>

            <section>
              <h2 className="font-bold">יצירת קשר</h2>
              <p>
                לכל שאלה או בקשה בנושא פרטיות, ניתן לפנות אלינו בדוא"ל:{' '}
                <a href="mailto:planora.net@gmail.com" className="text-orange-600 hover:underline">
                  planora.net@gmail.com
                </a>
              </p>
            </section>

            <p className="text-sm text-gray-500">עודכן לאחרונה: {new Date().toLocaleDateString('he-IL')}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
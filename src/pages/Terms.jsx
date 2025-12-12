import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Terms() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50 px-4 py-8" style={{ direction: 'rtl' }}>
      <div className="max-w-3xl mx-auto">
        <Card className="border-orange-100">
          <CardHeader>
            <CardTitle className="text-2xl">תנאי שימוש</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-gray-800 leading-7">
            <section>
              <p>
                ברוכים הבאים ל-Planora. השימוש בשירות כפוף לתנאים אלה. בשימוש באפליקציה הנכם מאשרים כי קראתם והסכמתם לתנאים.
              </p>
            </section>

            <section>
              <h2 className="font-bold">קבלת התנאים</h2>
              <p>
                שימוש באפליקציה מהווה הסכמה לתנאים אלו ולמדיניות הפרטיות. אם אינכם מסכימים – אנא הימנעו משימוש.
              </p>
            </section>

            <section>
              <h2 className="font-bold">יצירת חשבון ושימוש</h2>
              <ul className="list-disc pr-5 space-y-1">
                <li>יש לספק מידע נכון, מלא ועדכני.</li>
                <li>אחריות לשמירת סודיות פרטי הכניסה היא עליכם.</li>
                <li>השימוש הוא לצרכים חוקיים ובהתאם לכל דין.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-bold">תוכן המשתמש</h2>
              <p>
                אחריות מלאה חלה על התוכן שאתם מעלים. אין להעלות תוכן פוגעני, מפר זכויות, בלתי חוקי או מטעה. אנו רשאים להסיר תוכן הפוגע בתנאים או בדין.
              </p>
            </section>

            <section>
              <h2 className="font-bold">שימוש אסור</h2>
              <ul className="list-disc pr-5 space-y-1">
                <li>ניסיון לעקוף מנגנוני אבטחה או גישה לא מורשית.</li>
                <li>פגיעה בשירות או במשתמשים אחרים.</li>
                <li>שימוש מסחרי לא מורשה או שליחת דואר זבל.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-bold">קניין רוחני</h2>
              <p>
                כל הזכויות באפליקציה, בעיצוב ובתוכן שאינו תוכן משתמש – שמורות לבעלי הזכויות. אין להעתיק, לשכפל או להשתמש ללא רשות.
              </p>
            </section>

            <section>
              <h2 className="font-bold">פרטיות</h2>
              <p>
                השימוש כפוף גם ל<a href="/Privacy" className="text-orange-600 hover:underline">מדיניות הפרטיות</a>. מומלץ לעיין בה.
              </p>
            </section>

            <section>
              <h2 className="font-bold">הפסקת שימוש</h2>
              <p>
                אנו רשאים להשעות או להפסיק גישה לשירות במקרה של הפרת תנאים או שימוש לרעה. תוכלו לבקש מחיקת חשבון בכל עת.
              </p>
            </section>

            <section>
              <h2 className="font-bold">כתב ויתור והגבלת אחריות</h2>
              <p>
                השירות מסופק כמות שהוא (AS IS). איננו מתחייבים לזמינות מלאה או היעדר שגיאות. לא נהיה אחראים לכל נזק עקיף, תוצאתי או מיוחד הנובע מהשימוש.
              </p>
            </section>

            <section>
              <h2 className="font-bold">שינויים בתנאים</h2>
              <p>
                ייתכן ונעדכן תנאים אלו מעת לעת. נציין את מועד העדכון האחרון וננקוט מאמצים סבירים להודיע על שינויים משמעותיים.
              </p>
            </section>

            <section>
              <h2 className="font-bold">יצירת קשר</h2>
              <p>
                לשאלות בנוגע לתנאים אלה:{' '}
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
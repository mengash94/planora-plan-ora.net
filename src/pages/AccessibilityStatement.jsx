import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accessibility, Mail, Phone, ExternalLink } from 'lucide-react';

// ✅ הצהרת נגישות - חובה לפי תקן ישראלי 5568
export default function AccessibilityStatement() {
  const lastUpdated = "דצמבר 2024";
  const organizationName = "Planora";
  const websiteUrl = "https://plan-ora.net";
  const accessibilityCoordinator = {
    name: "צוות Planora",
    email: "planora.net@gmail.com",
    phone: "050-123-4567" // עדכן למספר הנכון
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50 p-6" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-blue-100">
            <div className="flex items-center gap-3">
              <Accessibility className="w-8 h-8 text-blue-600" />
              <div>
                <CardTitle className="text-2xl">הצהרת נגישות</CardTitle>
                <p className="text-sm text-gray-600 mt-1">עודכן לאחרונה: {lastUpdated}</p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-8 p-6">
            {/* מבוא */}
            <section>
              <h2 className="text-xl font-bold mb-4 text-gray-900">מחויבות לנגישות</h2>
              <p className="text-gray-700 leading-relaxed">
                {organizationName} מחויבת להנגשת שירותיה לאנשים עם מוגבלות. 
                השקענו משאבים רבים בהנגשת האתר והאפליקציה שלנו על מנת לאפשר לכל אדם, 
                ללא קשר למוגבלות שיש לו, לעשות שימוש במערכת באופן עצמאי ושוויוני.
              </p>
            </section>

            {/* תקנים */}
            <section>
              <h2 className="text-xl font-bold mb-4 text-gray-900">תקנים ודרישות</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                האתר והאפליקציה הונגשו בהתאם לדרישות החוק:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 mr-4">
                <li>תקן ישראלי (ת"י) 5568 לנגישות תכנים באינטרנט ברמת AA</li>
                <li>תקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות), התשע"ג-2013</li>
                <li>חוק שוויון זכויות לאנשים עם מוגבלות, התשנ"ח-1998</li>
                <li>הנחיות WCAG 2.1 (Web Content Accessibility Guidelines) ברמת AA</li>
              </ul>
            </section>

            {/* תכונות נגישות */}
            <section>
              <h2 className="text-xl font-bold mb-4 text-gray-900">תכונות נגישות באתר</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                ביצענו מגוון התאמות נגישות, כולל:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 mr-4">
                <li>תפריט נגישות ייעודי עם אפשרויות התאמה אישיות</li>
                <li>אפשרות להגדלה והקטנה של הטקסט</li>
                <li>ניווט מלא באמצעות מקלדת בלבד</li>
                <li>תמיכה בקוראי מסך (Screen Readers)</li>
                <li>ניגודיות גבוהה בין טקסט לרקע</li>
                <li>הדגשת אלמנטים בעת קבלת פוקוס</li>
                <li>תיוג נכון של כל האלמנטים באמצעות ARIA</li>
                <li>טקסטים חלופיים לכל התמונות</li>
                <li>מבנה סמנטי תקין של דפי האתר</li>
                <li>אפשרות להפחתת תנועות ואנימציות</li>
              </ul>
            </section>

            {/* סיוע טכנולוגי */}
            <section>
              <h2 className="text-xl font-bold mb-4 text-gray-900">טכנולוגיות מסייעות</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                האתר והאפליקציה נבדקו לתאימות עם:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 mr-4">
                <li>קוראי מסך: NVDA, JAWS, TalkBack, VoiceOver</li>
                <li>דפדפנים: Chrome, Firefox, Safari, Edge (גרסאות עדכניות)</li>
                <li>מערכות הפעלה: Windows, macOS, iOS, Android</li>
                <li>תוכנות הגדלת מסך וזכוכיות מגדלות</li>
              </ul>
            </section>

            {/* מגבלות ידועות */}
            <section>
              <h2 className="text-xl font-bold mb-4 text-gray-900">מגבלות ידועות</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                למרות מאמצינו, ייתכן שחלק מהתכנים או השירותים באתר עדיין אינם נגישים במלואם. 
                אנו עובדים באופן שוטף על שיפור הנגישות. במקרים שבהם ישנה מגבלה ידועה:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 mr-4">
                <li>תמונות שהועלו על ידי משתמשים - לא תמיד קיים טקסט חלופי</li>
                <li>מסמכים PDF חיצוניים - עשויים לא להיות מונגשים במלואם</li>
                <li>תכנים מוטמעים מצדדים שלישיים (Google Maps, YouTube) - תלויים בנגישות של אותם שירותים</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-3">
                אנו פועלים להסרת מגבלות אלו ולשיפור מתמיד של הנגישות.
              </p>
            </section>

            {/* פניות ותלונות */}
            <section className="bg-blue-50 p-6 rounded-lg border border-blue-200">
              <h2 className="text-xl font-bold mb-4 text-gray-900">פניות בנושא נגישות</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                אם נתקלת בבעיית נגישות באתר או באפליקציה, או שיש לך הצעות לשיפור הנגישות, 
                אנו מזמינים אותך ליצור איתנו קשר:
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3 bg-white p-3 rounded-lg">
                  <Mail className="w-5 h-5 text-blue-600" />
                  <div>
                    <div className="font-semibold text-gray-900">דוא"ל</div>
                    <a 
                      href={`mailto:${accessibilityCoordinator.email}`} 
                      className="text-blue-600 hover:underline"
                    >
                      {accessibilityCoordinator.email}
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-white p-3 rounded-lg">
                  <Phone className="w-5 h-5 text-blue-600" />
                  <div>
                    <div className="font-semibold text-gray-900">טלפון</div>
                    <a 
                      href={`tel:${accessibilityCoordinator.phone.replace(/-/g, '')}`}
                      className="text-blue-600 hover:underline"
                    >
                      {accessibilityCoordinator.phone}
                    </a>
                  </div>
                </div>
              </div>

              <p className="text-gray-700 leading-relaxed mt-4">
                <strong>רכז/ת נגישות:</strong> {accessibilityCoordinator.name}
              </p>
              <p className="text-sm text-gray-600 mt-2">
                אנו מתחייבים להשיב לפניות תוך 5 ימי עסקים ולטפל בבעיות נגישות בהקדם האפשרי.
              </p>
            </section>

            {/* תלונה לרשות */}
            <section>
              <h2 className="text-xl font-bold mb-4 text-gray-900">הגשת תלונה לגורם מוסמך</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                אם לא קיבלת מענה מספק לפנייתך או שלא פנית אלינו, תוכל להגיש תלונה לגורם המוסמך:
              </p>
              
              <div className="bg-gray-50 p-4 rounded-lg border">
                <p className="font-semibold text-gray-900 mb-2">נציבות שוויון זכויות לאנשים עם מוגבלות</p>
                <p className="text-gray-700 mb-2">משרד המשפטים</p>
                <div className="space-y-1 text-gray-700">
                  <p>📧 <a href="mailto:sar@justice.gov.il" className="text-blue-600 hover:underline">sar@justice.gov.il</a></p>
                  <p>☎️ 02-6467140</p>
                  <p>📠 02-6738196</p>
                  <p>
                    🌐 <a 
                      href="https://www.gov.il/he/departments/guides/being_with_you" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline inline-flex items-center gap-1"
                    >
                      אתר הנציבות
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </p>
                </div>
              </div>
            </section>

            {/* מידע נוסף */}
            <section>
              <h2 className="text-xl font-bold mb-4 text-gray-900">מידע נוסף</h2>
              <ul className="space-y-2 text-gray-700">
                <li>
                  • <a 
                    href="https://www.isoc.org.il/accessibility" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    מידע על נגישות אתרי אינטרנט
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </li>
                <li>
                  • <a 
                    href="https://www.sii.org.il" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    מכון התקנים הישראלי
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </li>
                <li>
                  • <a 
                    href="https://www.w3.org/WAI/standards-guidelines/wcag/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    WCAG Guidelines
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </li>
              </ul>
            </section>

            {/* תאריך עדכון */}
            <section className="border-t pt-6">
              <p className="text-sm text-gray-600 text-center">
                הצהרת נגישות זו נערכה ביום {lastUpdated} ונבדקת באופן שוטף
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
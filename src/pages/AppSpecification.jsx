
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Target, 
  Users, 
  Lightbulb, 
  Sparkles, 
  TrendingUp, 
  AlertCircle,
  Globe,
  Shield,
  ArrowRight,
  CheckCircle2,
  Star,
  Loader2,
  ChevronRight,
  Download,
  Printer
} from 'lucide-react';
import { createPageUrl } from '@/utils';
import { getCurrentUserFromServer } from '@/components/instabackService';
import { toast } from 'sonner';

export default function AppSpecification() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [isDownloading, setIsDownloading] = useState(false);

  // Check admin status
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user?.id) {
        setIsLoadingUser(false);
        return;
      }

      try {
        const freshUser = await getCurrentUserFromServer();
        const role = freshUser?.role || freshUser?.Role;
        setIsAdmin(role === 'admin');
      } catch (error) {
        console.error('Failed to check admin status:', error);
        setIsAdmin(false);
      } finally {
        setIsLoadingUser(false);
      }
    };

    checkAdmin();
  }, [user?.id]);

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!isAuthLoading && !isLoadingUser) {
      if (!isAuthenticated) {
        navigate(createPageUrl('Auth'));
      } else if (!isAdmin) {
        navigate(createPageUrl('Profile'));
      }
    }
  }, [isAuthLoading, isLoadingUser, isAuthenticated, isAdmin, navigate]);

  const handlePrint = () => {
    toast.info('מכין את האיפיון להדפסה...');
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const handleDownloadHTML = () => {
    setIsDownloading(true);
    toast.info('מכין את האיפיון המלא להורדה...');
    
    setTimeout(() => {
      const htmlContent = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>איפיון מלא - אפליקציית Planora</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.8; 
            padding: 40px 20px;
            background: linear-gradient(135deg, #f9fafb 0%, #fff 50%, #fef3ea 100%);
            color: #1f2937;
        }
        .container { 
            max-width: 1200px; 
            margin: 0 auto; 
            background: white; 
            padding: 60px 40px; 
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 60px;
            padding-bottom: 30px;
            border-bottom: 3px solid #ea580c;
        }
        .header h1 { 
            color: #ea580c; 
            font-size: 42px; 
            margin-bottom: 15px;
            font-weight: 800;
        }
        .header .subtitle {
            color: #6b7280;
            font-size: 18px;
            margin-bottom: 20px;
        }
        .header .date {
            color: #9ca3af;
            font-size: 14px;
        }
        
        .section { 
            margin-bottom: 50px; 
            page-break-inside: avoid;
        }
        .section-header {
            background: linear-gradient(135deg, #ea580c 0%, #ec4899 100%);
            color: white;
            padding: 20px 25px;
            border-radius: 12px;
            margin-bottom: 25px;
            display: flex;
            align-items: center;
            gap: 15px;
        }
        .section-header .icon {
            font-size: 32px;
        }
        .section-header h2 { 
            font-size: 28px;
            font-weight: 700;
        }
        
        .subsection {
            margin-bottom: 30px;
            padding: 25px;
            background: #f9fafb;
            border-radius: 10px;
            border-right: 5px solid #ea580c;
        }
        .subsection h3 { 
            color: #1f2937; 
            font-size: 22px; 
            margin-bottom: 15px;
            font-weight: 700;
        }
        .subsection h4 {
            color: #4b5563;
            font-size: 18px;
            margin-top: 20px;
            margin-bottom: 10px;
            font-weight: 600;
        }
        
        p { 
            color: #4b5563; 
            margin-bottom: 15px; 
            font-size: 16px;
            line-height: 1.8;
        }
        
        ul { 
            margin-right: 25px; 
            margin-bottom: 20px; 
            list-style-type: disc;
        }
        li { 
            color: #4b5563; 
            margin-bottom: 10px; 
            font-size: 15px;
            line-height: 1.7;
        }
        li::marker {
            color: #ea580c;
        }
        
        .highlight { 
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            padding: 25px; 
            border-radius: 10px; 
            margin: 25px 0;
            border-right: 5px solid #f59e0b;
        }
        .highlight strong {
            color: #92400e;
        }
        
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin: 25px 0;
        }
        .grid-item {
            background: white;
            padding: 20px;
            border-radius: 10px;
            border: 2px solid #e5e7eb;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .grid-item h4 {
            color: #ea580c;
            margin-top: 0;
            margin-bottom: 10px;
            font-size: 17px;
        }
        .grid-item p {
            font-size: 14px;
            margin: 0;
        }
        
        .feature-box { 
            background: white; 
            padding: 20px; 
            margin: 15px 0; 
            border-right: 4px solid #ea580c;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .feature-box h4 {
            color: #1f2937;
            margin: 0 0 10px 0;
        }
        .feature-box ul {
            margin-right: 20px;
            list-style-type: disc;
        }
        
        .audience-card {
            background: linear-gradient(135deg, #f3f4f6 0%, #fff 100%);
            padding: 25px;
            border-radius: 12px;
            border: 2px solid #e5e7eb;
            margin-bottom: 20px;
        }
        .audience-card .emoji {
            font-size: 48px;
            margin-bottom: 15px;
        }
        
        .problem-card {
            padding: 20px;
            background: #fef2f2;
            border-radius: 10px;
            border-right: 4px solid #ef4444;
            margin-bottom: 15px;
        }
        
        .tech-stack {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 25px 0;
        }
        .tech-card {
            background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
            padding: 20px;
            border-radius: 10px;
            border: 2px solid #3b82f6;
        }
        .tech-card h4 {
            color: #1e40af;
            margin: 0 0 15px 0;
        }
        .tech-card ul {
            list-style-type: disclosure-closed; /* Using this for chevron effect */
            margin-right: 15px;
        }
        
        .roadmap-phase {
            margin-bottom: 30px;
            padding: 25px;
            background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%);
            border-radius: 12px;
            border-right: 5px solid #8b5cf6;
        }
        .roadmap-phase h4 {
            color: #6d28d9;
            margin: 0 0 15px 0;
            font-size: 20px;
        }
        .roadmap-phase ul {
            list-style-type: square;
        }
        
        @media print {
            body { padding: 20px; background: white; }
            .container { padding: 40px; box-shadow: none; }
            .section { page-break-inside: avoid; }
            h1, h2, h3, h4, p, li { color: black !important; }
            .section-header { background: #ea580c !important; print-color-adjust: exact; }
            .highlight, .problem-card, .tech-card, .audience-card, .roadmap-phase, .subsection { background: #f0f0f0 !important; border-color: #ccc !important; print-color-adjust: exact; }
            ul, ol { list-style-position: inside; }
        }
        
        @media (max-width: 768px) {
            body { padding: 20px 10px; }
            .container { padding: 30px 20px; }
            .header h1 { font-size: 32px; }
            .section-header h2 { font-size: 22px; }
            .grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <h1>🎉 איפיון מלא - אפליקציית Planora</h1>
            <p class="subtitle">מסמך מקיף למחקרי שוק וסקרי היתכנות</p>
            <p class="date">נוצר ב-${new Date().toLocaleDateString('he-IL')}</p>
        </div>

        <!-- Section 1: Overview -->
        <div class="section">
            <div class="section-header">
                <span class="icon">🎯</span>
                <h2>חזון, ייעוד והצעת ערך</h2>
            </div>
            
            <div class="subsection">
                <h3>⭐ חזון</h3>
                <p>להפוך את תכנון האירועים לחוויה חלקה, מהנה, משותפת ויעילה לכל אחד, בכל מקום ובכל זמן.</p>
            </div>

            <div class="subsection">
                <h3>✨ ייעוד</h3>
                <p>לספק פלטפורמה אינטואיטיבית וכוללת המאפשרת למשתמשים לתכנן, לנהל ולשתף אירועים מכל סוג (משפחתיים, חברתיים, עסקיים) בקלות, תוך שימוש בכלים חדשניים כמו AI וניהול משימות חכם.</p>
            </div>

            <div class="highlight">
                <h3>💡 הצעת הערך המרכזית</h3>
                <p><strong>"תכנן, שתף, חגוג – הכל במקום אחד, בקלות ובכיף!"</strong></p>
                <p>Planora מציעה פלטפורמה מרכזית אחת לכל שלבי תכנון האירוע, המשלבת כלים חכמים לשיתוף פעולה, ניהול משימות, קבלת החלטות מהירה וחיסכון בזמן.</p>
            </div>

            <div class="subsection">
                <h3>⚠️ הבעיה שאנחנו פותרים</h3>
                <div class="grid">
                    <div class="problem-card">
                        <h4>חוסר סדר ובלבול</h4>
                        <p>ריבוי משימות, ספקים, משתתפים ותאריכים יוצר כאוס</p>
                    </div>
                    <div class="problem-card">
                        <h4>קושי בתיאום ושיתוף פעולה</h4>
                        <p>פיזור המידע (וואטסאפ, מיילים, שיחות) מקשה על תיאום</p>
                    </div>
                    <div class="problem-card">
                        <h4>בזבוז זמן ומאמץ</h4>
                        <p>חיפוש מידע, שליחת תזכורות, ואיסוף החלטות גוזלים זמן רב</p>
                    </div>
                    <div class="problem-card">
                        <h4>שכחת פרטים</h4>
                        <p>קל לפספס משימות קטנות אך חשובות</p>
                    </div>
                    <div class="problem-card">
                        <h4>חוסר וודאות לגבי החלטות</h4>
                        <p>קושי להגיע להחלטות משותפות בצורה דמוקרטית ומהירה</p>
                    </div>
                    <div class="problem-card">
                        <h4>ניהול תקציב והוצאות</h4>
                        <p>קשה לעקוב אחרי כל ההוצאות ולחלק אותן בצורה הוגנת</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Section 2: Target Audience -->
        <div class="section">
            <div class="section-header">
                <span class="icon">👥</span>
                <h2>קהל יעד מרכזי</h2>
            </div>

            <div class="grid">
                <div class="audience-card">
                    <div class="emoji">👨‍👩‍👧‍👦</div>
                    <h4>מארגני אירועים פרטיים</h4>
                    <p>אנשים פרטיים (משפחות, חברים) המתכננים אירועים כמו ימי הולדת, חתונות, בר/בת מצוות, מסיבות, מפגשים חברתיים, טיולים משותפים.</p>
                </div>
                <div class="audience-card">
                    <div class="emoji">🏢</div>
                    <h4>מארגני אירועים קטנים/בינוניים</h4>
                    <p>עסקים קטנים, ועדי עובדים, ארגונים קהילתיים, מורים או מדריכים המתכננים אירועים בקנה מידה קטן-בינוני.</p>
                </div>
                <div class="audience-card">
                    <div class="emoji">📸</div>
                    <h4>בעלי מקצוע בתחום האירועים</h4>
                    <p>ספקים, מפיקי אירועים, צלמים, קייטרינג שמשתלבים באירועים ומחפשים פלטפורמה לתיאום מול הלקוחות והמשתתפים.</p>
                </div>
                <div class="audience-card">
                    <div class="emoji">⚡</div>
                    <h4>משתמשים מחפשי יעילות</h4>
                    <p>אנשים שמתמודדים עם קושי בתיאום בין מספר אנשים או שפשוט רוצים דרך מסודרת יותר לנהל את המשימות סביב אירוע.</p>
                </div>
            </div>

            <div class="subsection">
                <h3>🎯 פסיכוגרפיה</h3>
                <p>אנשים שאוהבים להיות מאורגנים, מעריכים שיתוף פעולה, פתוחים לטכנולוגיה, מחפשים פתרונות נוחים ויעילים לחיסכון בזמן ובמאמץ.</p>
            </div>
        </div>

        <!-- Section 3: Features -->
        <div class="section">
            <div class="section-header">
                <span class="icon">✨</span>
                <h2>פיצ'רים ופונקציונליות מרכזית</h2>
            </div>

            <div class="feature-box">
                <h4>🎉 יצירת וניהול אירועים</h4>
                <ul>
                    <li><strong>יצירת אירוע חכם עם AI:</strong> שיחה טקסטואלית עם עוזר חכם שמנחה את המשתמש</li>
                    <li><strong>יצירת אירוע מתבנית:</strong> בחירה מתוך תבניות מוכנות מראש (חתונות, ימי הולדת, טיולים)</li>
                    <li><strong>יצירה ידנית:</strong> מילוי פרטים בסיסיים</li>
                    <li><strong>לוח בקרה לאירוע:</strong> סקירה ויזואלית של מצב האירוע</li>
                    <li><strong>עריכת פרטי אירוע:</strong> שינוי פרטים, הוספת תיאור ותמונת קאבר</li>
                </ul>
            </div>

            <div class="feature-box">
                <h4>👥 ניהול משתתפים ותקשורת</h4>
                <ul>
                    <li><strong>הזמנת משתתפים:</strong> קישורי הצטרפות ייחודיים (וואטסאפ, SMS, מייל)</li>
                    <li><strong>ניהול משתתפים:</strong> רשימה, הגדרת תפקידים, הסרה</li>
                    <li><strong>צ'אט ייעודי:</strong> צ'אט קבוצתי לכל המשתתפים עם תמיכה בקבצים</li>
                    <li><strong>הודעות מרוכזות:</strong> שליחת הודעה אחידה לכל המשתתפים</li>
                </ul>
            </div>

            <div class="feature-box">
                <h4>✅ ניהול משימות</h4>
                <ul>
                    <li><strong>יצירת משימות:</strong> כותרת, תיאור, סטטוס, תאריך יעד, שיוך</li>
                    <li><strong>שיוך משימות:</strong> למשתמשים קיימים או ידני</li>
                    <li><strong>עדכון סטטוס:</strong> סימון כבוצעה/בטיפול/פתוחה</li>
                    <li><strong>רשימות ביקורת:</strong> תתי-משימות בתוך משימה גדולה</li>
                    <li><strong>תצוגות מגוונות:</strong> כל המשימות שלי, לפי אירוע, סינון ומיון</li>
                </ul>
            </div>

            <div class="feature-box">
                <h4>🗳️ סקרים והצבעות</h4>
                <ul>
                    <li><strong>סקר תאריכים:</strong> הצעת תאריכים מרובים ובחירת המועדף</li>
                    <li><strong>סקר מיקומים:</strong> הצעת מקומות ובחירה</li>
                    <li><strong>סקר כללי:</strong> לכל נושא אחר</li>
                    <li><strong>סגירת סקר:</strong> בחירת אפשרות זוכה ועדכון אוטומטי של פרטי האירוע</li>
                    <li><strong>התראות:</strong> קבלת התראות על סקרים חדשים</li>
                </ul>
            </div>

            <div class="feature-box">
                <h4>🛠️ כלים נוספים</h4>
                <ul>
                    <li><strong>ניהול ספקים:</strong> פרטי קשר, עלויות, סטטוס</li>
                    <li><strong>לוח זמנים (Itinerary):</strong> תכנית מפורטת של האירוע</li>
                    <li><strong>גלריית תמונות:</strong> שיתוף תמונות בין המשתתפים</li>
                    <li><strong>מסמכים וקבצים:</strong> שמירה מרכזית של מסמכים</li>
                    <li><strong>ניהול הוצאות:</strong> מעקב אחר הוצאות ופיצול חשבונות</li>
                </ul>
            </div>
        </div>

        <!-- Section 4: Technology Stack -->
        <div class="section">
            <div class="section-header">
                <span class="icon">🛡️</span>
                <h2>סטאק טכנולוגי ואינטגרציות</h2>
            </div>

            <div class="tech-stack">
                <div class="tech-card">
                    <h4>⚙️ פלטפורמה</h4>
                    <ul>
                        <li>InstaBack - לוגיקה עסקית</li>
                        <li>אחסון נתונים</li>
                        <li>Edge Functions</li>
                        <li>ניהול קבצים</li>
                    </ul>
                </div>
                <div class="tech-card">
                    <h4>💻 Frontend</h4>
                    <ul>
                        <li>React</li>
                        <li>Shadcn/UI</li>
                        <li>Tailwind CSS</li>
                        <li>Lucide React</li>
                    </ul>
                </div>
                <div class="tech-card">
                    <h4>🔐 Authentication</h4>
                    <ul>
                        <li>InstaBack Auth</li>
                        <li>Google OAuth</li>
                        <li>ניהול הרשאות</li>
                    </ul>
                </div>
                <div class="tech-card">
                    <h4>🤖 AI/LLM</h4>
                    <ul>
                        <li>InstaBack InvokeLLM</li>
                        <li>תכנון חכם</li>
                        <li>יצירת תמונות</li>
                    </ul>
                </div>
                <div class="tech-card">
                    <h4>🔔 התראות</h4>
                    <ul>
                        <li>OneSignal</li>
                        <li>Planora Alert</li>
                        <li>Push Notifications</li>
                    </ul>
                </div>
                <div class="tech-card">
                    <h4>⚡ Performance</h4>
                    <ul>
                        <li>דחיסת תמונות</li>
                        <li>PWA Support</li>
                        <li>Offline Capabilities</li>
                    </ul>
                </div>
            </div>

            <div class="subsection">
                <h3>🌟 יתרונות תחרותיים</h3>
                <ul>
                    <li>תכנון מונחה AI - ייחודיות משמעותית</li>
                    <li>פתרון All-in-One - ריכוז כל הכלים במקום אחד</li>
                    <li>פשטות וקלות שימוש - ממשק נקי ואינטואיטיבי</li>
                    <li>שיתוף פעולה חלק - כלים מובנים לתקשורת</li>
                    <li>התאמה לשוק הישראלי - טקסטים בעברית, RTL</li>
                    <li>Push Notifications מתקדמות</li>
                    <li>מובייל-פירסט / PWA</li>
                </ul>
            </div>
        </div>

        <!-- Section 5: Market Research -->
        <div class="section">
            <div class="section-header">
                <span class="icon">📊</span>
                <h2>נקודות למחקר שוק וסקרים</h2>
            </div>

            <div class="subsection">
                <h3>🇮🇱 השוק הישראלי</h3>
                <div class="grid">
                    <div class="grid-item">
                        <h4>הרגלי תכנון</h4>
                        <p>איך ישראלים מתכננים אירועים היום? (וואטסאפ? אקסל? בעל פה?)</p>
                    </div>
                    <div class="grid-item">
                        <h4>נכונות לשלם</h4>
                        <p>האם יש נכונות לשלם עבור שירות כזה? כמה?</p>
                    </div>
                    <div class="grid-item">
                        <h4>פיצ'רים מבוקשים</h4>
                        <p>אילו פיצ'רים "חייבים להיות" ואילו "נחמד שיהיו"?</p>
                    </div>
                    <div class="grid-item">
                        <h4>מודעות ל-AI</h4>
                        <p>האם ישראלים פתוחים לשימוש ב-AI לתכנון?</p>
                    </div>
                    <div class="grid-item">
                        <h4>תחרות מקומית</h4>
                        <p>מי המתחרים העיקריים ומה היתרונות/חסרונות שלהם?</p>
                    </div>
                    <div class="grid-item">
                        <h4>גודל השוק</h4>
                        <p>כמה אנשים בישראל מארגנים אירועים באופן קבוע?</p>
                    </div>
                </div>
            </div>

            <div class="subsection">
                <h3>🌍 השוק העולמי</h3>
                <div class="grid">
                    <div class="grid-item">
                        <h4>התאמה תרבותית</h4>
                        <p>איך צורת תכנון האירועים משתנה בין תרבויות שונות?</p>
                    </div>
                    <div class="grid-item">
                        <h4>רגולציה</h4>
                        <p>האם יש צורך להתאים לרגולציות פרטיות (GDPR באירופה)?</p>
                    </div>
                    <div class="grid-item">
                        <h4>תמחור</h4>
                        <p>מודלים עסקיים נפוצים באפליקציות דומות בעולם</p>
                    </div>
                    <div class="grid-item">
                        <h4>לוקליזציה</h4>
                        <p>דרישות לוקליזציה (שפות, מטבעות, אזורי זמן)</p>
                    </div>
                    <div class="grid-item">
                        <h4>הבדלים בפיצ'רים</h4>
                        <p>אילו פיצ'רים נדרשים בשווקים ספציפיים?</p>
                    </div>
                    <div class="grid-item">
                        <h4>מתחרים בינלאומיים</h4>
                        <p>מי הם המובילים בשוק ואיך Planora מתבדלת מהם</p>
                    </div>
                </div>
            </div>

            <div class="subsection">
                <h3>📋 שאלות כלליות לסקר</h3>
                <ul>
                    <li>מוכנות לשיתוף פעולה: עד כמה הייתם רוצים לשתף פעולה בתכנון אירועים?</li>
                    <li>חשיבות כל פיצ'ר: דרגו את חשיבות הפיצ'רים השונים</li>
                    <li>חווית משתמש: עד כמה קל ונוח השימוש באפליקציה</li>
                    <li>פוטנציאל להמלצה: האם הייתם ממליצים על האפליקציה?</li>
                    <li>תדירות שימוש: כמה אירועים אתם מארגנים בשנה?</li>
                    <li>עלויות נוכחיות: כמה אתם משקיעים היום בכלים לתכנון אירועים?</li>
                </ul>
            </div>

            <div class="highlight">
                <h3>⚠️ אתגרים וחסרונות פוטנציאליים</h3>
                <ul>
                    <li><strong>תחרות בשוק:</strong> קיימות אפליקציות לניהול משימות ופרויקטים</li>
                    <li><strong>חינוך שוק:</strong> משתמשים צריכים להבין את הערך</li>
                    <li><strong>תלות ב-AI:</strong> אם ה-AI אינו מדויק מספיק</li>
                    <li><strong>פרטיות ואבטחה:</strong> ניהול מידע אישי דורש רמת אבטחה גבוהה</li>
                    <li><strong>מודל עסקי:</strong> כרגע נראה כחינמי. איך לייצר הכנסות?</li>
                    <li><strong>התאמה בינלאומית:</strong> תמיכה בשפות מרובות</li>
                </ul>
            </div>
        </div>

        <!-- Section 6: Future Roadmap -->
        <div class="section">
            <div class="section-header">
                <span class="icon">🚀</span>
                <h2>אבני דרך עתידיות ושיפורים</h2>
            </div>

            <div class="roadmap-phase">
                <h4>📍 שלב 1 - בסיס (0-6 חודשים)</h4>
                <ul>
                    <li>אינטגרציה עם לוחות שנה (Google Calendar, Apple Calendar)</li>
                    <li>ניהול תקציב מתקדם עם גרפים ודוחות</li>
                    <li>פיצול חשבונות אוטומטי (מי חייב למי כמה)</li>
                    <li>שיפור מערכת ההתראות</li>
                </ul>
            </div>

            <div class="roadmap-phase">
                <h4>📍 שלב 2 - צמיחה (6-12 חודשים)</h4>
                <ul>
                    <li>תמיכה בריבוי שפות (אנגלית, ערבית, רוסית)</li>
                    <li>מודל עסקי - גיבוש ברור (Freemium, מנויים, עמלות)</li>
                    <li>שיווק ספקים - פלטפורמה להצגת שירותים</li>
                    <li>אפליקציות מובייל Native (iOS ו-Android)</li>
                </ul>
            </div>

            <div class="roadmap-phase">
                <h4>📍 שלב 3 - חדשנות (12+ חודשים)</h4>
                <ul>
                    <li>AI מתקדם - הצעות פעילות והמלצות חכמות</li>
                    <li>זיהוי אוטומטי של פנים בתמונות</li>
                    <li>ביקורות ודירוגים על ספקים</li>
                    <li>אירועים ציבוריים - פלטפורמה לשיווק אירועים</li>
                    <li>מערכת CRM לבעלי מקצוע</li>
                    <li>אינטגרציות נוספות (Zoom, Slack, Trello)</li>
                </ul>
            </div>

            <div class="highlight">
                <h3>💡 מודלים עסקיים אפשריים</h3>
                <ul>
                    <li><strong>Freemium:</strong> גרסה בסיסית חינמית, פיצ'רים מתקדמים בתשלום</li>
                    <li><strong>מנוי חודשי/שנתי:</strong> גישה מלאה לכל הפיצ'רים</li>
                    <li><strong>תשלום לפי אירוע:</strong> תשלום חד-פעמי לכל אירוע</li>
                    <li><strong>עמלה מספקים:</strong> עמלה על הזמנות דרך הפלטפורמה</li>
                    <li><strong>B2B:</strong> מכירת רישיונות לעסקים וארגונים</li>
                </ul>
            </div>
        </div>

        <!-- Conclusion -->
        <div class="section">
            <div class="section-header">
                <span class="icon">🎯</span>
                <h2>סיכום והמלצות</h2>
            </div>

            <div class="subsection">
                <p><strong>Planora</strong> היא אפליקציה ייחודית המשלבת כלים מתקדמים לתכנון אירועים, עם דגש על שיתוף פעולה, AI וחווית משתמש מעולה.</p>
                
                <p>האפליקציה מתאימה במיוחד לשוק הישראלי הדינמי, בו אירועים משפחתיים וחברתיים הם חלק מרכזי מהתרבות, ומציעה פתרון מקיף לבעיות נפוצות בתכנון אירועים.</p>
                
                <p>מחקר השוק המומלץ צריך להתמקד בהבנת הרגלי התכנון הנוכחיים, נכונות לשלם, והפיצ'רים החשובים ביותר לקהל היעד.</p>
            </div>

            <div class="highlight">
                <h3>🎯 צעדים הבאים</h3>
                <ul>
                    <li>בניית Landing Page ואיסוף רשימת המתנה (Waitlist)</li>
                    <li>ביצוע סקרים באמצעות Google Forms / Typeform</li>
                    <li>ראיונות עומק עם משתמשי פוטנציאל (10-15 אנשים)</li>
                    <li>ניתוח תחרות מעמיק (SWOT Analysis)</li>
                    <li>בניית MVP מצומצם לבדיקת קונספט</li>
                    <li>הגדרת מודל עסקי ראשוני</li>
                </ul>
            </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; margin-top: 60px; padding-top: 30px; border-top: 2px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 14px;">
                מסמך זה נוצר באמצעות Planora ומכיל איפיון מלא של האפליקציה למטרות מחקר שוק
            </p>
            <p style="color: #9ca3af; font-size: 14px; margin-top: 10px;">
                © ${new Date().getFullYear()} Planora - כל הזכויות שמורות
            </p>
        </div>
    </div>
</body>
</html>
      `;

      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Planora-Full-Specification-${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setIsDownloading(false);
      toast.success('הקובץ המלא הורד בהצלחה! 🎉');
    }, 1000);
  };

  if (isAuthLoading || isLoadingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-2" />
          <p className="text-gray-600">טוען...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50 pb-20">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 sm:p-3 bg-gradient-to-br from-orange-500 to-pink-500 rounded-xl">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">איפיון Planora</h1>
                <p className="text-sm sm:text-base text-gray-600">מסמך למחקרי שוק וסקרי היתכנות</p>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handlePrint}
                variant="outline"
                size="sm"
                className="gap-2 flex-1 sm:flex-none print:hidden"
                disabled={isDownloading}
              >
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">הדפס</span>
              </Button>
              <Button
                onClick={handleDownloadHTML}
                className="gap-2 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 flex-1 sm:flex-none print:hidden"
                size="sm"
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="hidden sm:inline">מכין...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">הורד איפיון מלא</span>
                    <span className="sm:hidden">הורד</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        <div id="specification-content">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6" dir="rtl">
            <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 print:hidden">
              <TabsList className="inline-flex w-auto min-w-full sm:grid sm:w-full sm:grid-cols-3 lg:grid-cols-6 gap-1 sm:gap-2 bg-gray-100 p-1">
                <TabsTrigger value="overview" className="whitespace-nowrap text-xs sm:text-sm px-3 sm:px-4">
                  <Target className="w-3 h-3 sm:w-4 sm:h-4 ml-1 sm:ml-2" />
                  סקירה
                </TabsTrigger>
                <TabsTrigger value="audience" className="whitespace-nowrap text-xs sm:text-sm px-3 sm:px-4">
                  <Users className="w-3 h-3 sm:w-4 sm:h-4 ml-1 sm:ml-2" />
                  קהל יעד
                </TabsTrigger>
                <TabsTrigger value="features" className="whitespace-nowrap text-xs sm:text-sm px-3 sm:px-4">
                  <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 ml-1 sm:ml-2" />
                  פיצ'רים
                </TabsTrigger>
                <TabsTrigger value="tech" className="whitespace-nowrap text-xs sm:text-sm px-3 sm:px-4">
                  <Shield className="w-3 h-3 sm:w-4 sm:h-4 ml-1 sm:ml-2" />
                  טכנולוגיה
                </TabsTrigger>
                <TabsTrigger value="market" className="whitespace-nowrap text-xs sm:text-sm px-3 sm:px-4">
                  <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 ml-1 sm:ml-2" />
                  שוק
                </TabsTrigger>
                <TabsTrigger value="roadmap" className="whitespace-nowrap text-xs sm:text-sm px-3 sm:px-4">
                  <Globe className="w-3 h-3 sm:w-4 sm:h-4 ml-1 sm:ml-2" />
                  עתיד
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4 sm:space-y-6">
              <Card className="border-orange-200">
                <CardHeader className="bg-gradient-to-r from-orange-50 to-pink-50 p-4 sm:p-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Target className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
                    חזון וייעוד
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-4 sm:pt-6 p-4 sm:p-6">
                  <div>
                    <h3 className="font-semibold text-base sm:text-lg mb-2 flex items-center gap-2">
                      <Star className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
                      חזון
                    </h3>
                    <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                      להפוך את תכנון האירועים לחוויה חלקה, מהנה, משותפת ויעילה לכל אחד, בכל מקום ובכל זמן.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-base sm:text-lg mb-2 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-pink-500" />
                      ייעוד
                    </h3>
                    <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                      לספק פלטפורמה אינטואיטיבית וכוללת המאפשרת למשתמשים לתכנן, לנהל ולשתף אירועים מכל סוג 
                      (משפחתיים, חברתיים, עסקיים) בקלות, תוך שימוש בכלים חדשניים כמו AI וניהול משימות חכם.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-blue-200">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 sm:p-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                    הבעיה שאנחנו פותרים
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 sm:pt-6 p-4 sm:p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    {[
                      { title: 'חוסר סדר ובלבול', desc: 'ריבוי משימות, ספקים, משתתפים ותאריכים יוצר כאוס' },
                      { title: 'קושי בתיאום ושיתוף פעולה', desc: 'פיזור המידע (וואטסאפ, מיילים, שיחות) מקשה על תיאום' },
                      { title: 'בזבוז זמן ומאמץ', desc: 'חיפוש מידע, שליחת תזכורות, ואיסוף החלטות גוזלים זמן רב' },
                      { title: 'שכחת פרטים', desc: 'קל לפספס משימות קטנות אך חשובות' },
                      { title: 'חוסר וודאות לגבי החלטות', desc: 'קושי להגיע להחלטות משותפות בצורה דמוקרטית ומהירה' },
                      { title: 'ניהול תקציב והוצאות', desc: 'קשה לעקוב אחרי כל ההוצאות ולחלק אותן בצורה הוגנת' }
                    ].map((problem, idx) => (
                      <div key={idx} className="p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <h4 className="font-semibold text-sm sm:text-base text-gray-900 mb-1">{problem.title}</h4>
                        <p className="text-xs sm:text-sm text-gray-600">{problem.desc}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-green-200">
                <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 sm:p-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                    הפתרון - הצעת הערך המרכזית
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 sm:pt-6 p-4 sm:p-6">
                  <div className="text-center mb-4 sm:mb-6">
                    <div className="inline-block px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-full text-base sm:text-lg font-bold mb-3 sm:mb-4">
                      "תכנן, שתף, חגוג – הכל במקום אחד!"
                    </div>
                  </div>
                  <p className="text-sm sm:text-base text-gray-700 leading-relaxed text-center">
                    Planora מציעה פלטפורמה מרכזית אחת לכל שלבי תכנון האירוע, המשלבת כלים חכמים לשיתוף פעולה, 
                    ניהול משימות, קבלת החלטות מהירה וחיסכון בזמן.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Audience Tab */}
            <TabsContent value="audience" className="space-y-4 sm:space-y-6">
              <Card>
                <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 sm:p-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Users className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                    קהל יעד מרכזי
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 sm:pt-6 p-4 sm:p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    {[
                      {
                        title: 'מארגני אירועים פרטיים',
                        icon: '👨‍👩‍👧‍👦',
                        desc: 'אנשים פרטיים (משפחות, חברים) המתכננים אירועים כמו ימי הולדת, חתונות, בר/בת מצוות, מסיבות, מפגשים חברתיים, טיולים משותפים.'
                      },
                      {
                        title: 'מארגני אירועים קטנים/בינוניים',
                        icon: '🏢',
                        desc: 'עסקים קטנים, ועדי עובדים, ארגונים קהילתיים, מורים או מדריכים המתכננים אירועים בקנה מידה קטן-בינוני.'
                      },
                      {
                        title: 'בעלי מקצוע בתחום האירועים',
                        icon: '📸',
                        desc: 'ספקים, מפיקי אירועים, צלמים, קייטרינג שמשתלבים באירועים ומחפשים פלטפורמה לתיאום מול הלקוחות והמשתתפים.'
                      },
                      {
                        title: 'משתמשים מחפשי יעילות',
                        icon: '⚡',
                        desc: 'אנשים שמתמודדים עם קושי בתיאום בין מספר אנשים או שפשוט רוצים דרך מסודרת יותר לנהל את המשימות סביב אירוע.'
                      }
                    ].map((audience, idx) => (
                      <div key={idx} className="relative group">
                        <div className="relative p-4 sm:p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-gray-300 transition-colors">
                          <div className="text-3xl sm:text-4xl mb-2 sm:mb-3">{audience.icon}</div>
                          <h3 className="font-bold text-base sm:text-lg mb-1 sm:mb-2 text-gray-900">{audience.title}</h3>
                          <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">{audience.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 sm:mt-8 p-4 sm:p-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200">
                    <h3 className="font-bold text-base sm:text-lg mb-2 sm:mb-3 flex items-center gap-2">
                      <span>🎯</span>
                      פסיכוגרפיה
                    </h3>
                    <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                      אנשים שאוהבים להיות מאורגנים, מעריכים שיתוף פעולה, פתוחים לטכנולוגיה, 
                      מחפשים פתרונות נוחים ויעילים לחיסכון בזמן ובמאמץ.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Features Tab */}
            <TabsContent value="features" className="space-y-4 sm:space-y-6">
              <Card>
                <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 p-4 sm:p-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
                    פיצ'רים ופונקציונליות מרכזית
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 sm:pt-6 p-4 sm:p-6">
                  <div className="space-y-4 sm:space-y-6">
                    {[
                      {
                        category: 'יצירת וניהול אירועים',
                        icon: '🎉',
                        features: [
                          'יצירת אירוע חכם עם AI - שיחה טקסטואלית עם עוזר חכם',
                          'יצירת אירוע מתבנית - בחירה מתוך תבניות מוכנות מראש',
                          'יצירה ידנית של אירוע',
                          'לוח בקרה לאירוע - סקירה ויזואלית של מצב האירוע',
                          'עריכת פרטי אירוע'
                        ]
                      },
                      {
                        category: 'ניהול משתתפים ותקשורת',
                        icon: '👥',
                        features: [
                          'הזמנת משתתפים - קישורי הצטרפות ייחודיים',
                          'ניהול משתתפים - הגדרת תפקידים והסרת משתתפים',
                          'צ\'אט ייעודי לאירוע - צ\'אט קבוצתי עם תמיכה בקבצים',
                          'הודעות מרוכזות למשתתפים (Broadcast)'
                        ]
                      },
                      {
                        category: 'ניהול משימות',
                        icon: '✅',
                        features: [
                          'יצירת משימות עם שיוך למשתתפים',
                          'עדכון סטטוס משימות',
                          'רשימות ביקורת בתוך משימה (Task Checklist)',
                          'תצוגת "כל המשימות שלי"',
                          'סינון ומיון משימות'
                        ]
                      },
                      {
                        category: 'סקרים והצבעות',
                        icon: '🗳️',
                        features: [
                          'סקר תאריכים - בחירת מועד מועדף',
                          'סקר מיקומים - בחירת מקום',
                          'סקר כללי - לכל נושא',
                          'סגירת סקר ואימוץ החלטה אוטומטית',
                          'התראות על סקרים'
                        ]
                      },
                      {
                        category: 'כלים נוספים',
                        icon: '🛠️',
                        features: [
                          'ניהול ספקים - פרטי קשר, עלויות, סטטוס',
                          'לוח זמנים (Itinerary)',
                          'גלריית תמונות',
                          'מסמכים וקבצים',
                          'ניהול הוצאות'
                        ]
                      }
                    ].map((section, idx) => (
                      <div key={idx} className="border-2 border-gray-200 rounded-xl overflow-hidden">
                        <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-3 sm:p-4 border-b-2 border-gray-200">
                          <h3 className="font-bold text-base sm:text-lg flex items-center gap-2">
                            <span className="text-xl sm:text-2xl">{section.icon}</span>
                            {section.category}
                          </h3>
                        </div>
                        <div className="p-3 sm:p-4 bg-white">
                          <ul className="space-y-2">
                            {section.features.map((feature, fIdx) => (
                              <li key={fIdx} className="flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0 mt-0.5" />
                                <span className="text-xs sm:text-sm text-gray-700">{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tech Tab */}
            <TabsContent value="tech" className="space-y-4 sm:space-y-6">
              <Card>
                <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 sm:p-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                    טכנולוגיות ואינטגרציות
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 sm:pt-6 p-4 sm:p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    {[
                      {
                        title: 'פלטפורמה',
                        items: ['InstaBack - לוגיקה עסקית', 'אחסון נתונים', 'Edge Functions', 'ניהול קבצים']
                      },
                      {
                        title: 'Frontend',
                        items: ['React', 'Shadcn/UI (רכיבי UI)', 'Tailwind CSS (עיצוב)', 'Lucide React (אייקונים)']
                      },
                      {
                        title: 'Authentication',
                        items: ['InstaBack Authentication', 'Google OAuth', 'ניהול הרשאות']
                      },
                      {
                        title: 'AI/LLM',
                        items: ['InstaBack Core InvokeLLM', 'תכנון אירועים חכם', 'GenerateImage - יצירת תמונות']
                      },
                      {
                        title: 'התראות',
                        items: ['OneSignal (דרך InstaBack)', 'Planora Alert', 'Push Notifications']
                      },
                      {
                        title: 'Performance',
                        items: ['דחיסת תמונות בצד הלקוח', 'PWA Support', 'Offline Capabilities']
                      }
                    ].map((tech, idx) => (
                      <div key={idx} className="p-4 sm:p-5 bg-gradient-to-br from-white to-gray-50 rounded-xl border-2 border-gray-200">
                        <h3 className="font-bold text-base sm:text-lg mb-2 sm:mb-3 text-gray-900">{tech.title}</h3>
                        <ul className="space-y-1.5 sm:space-y-2">
                          {tech.items.map((item, iIdx) => (
                            <li key={iIdx} className="flex items-center gap-2 text-gray-700">
                              <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500 flex-shrink-0" />
                              <span className="text-xs sm:text-sm">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 sm:mt-8 p-4 sm:p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                    <h3 className="font-bold text-base sm:text-lg mb-2 sm:mb-3 flex items-center gap-2">
                      <Star className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                      יתרונות תחרותיים
                    </h3>
                    <ul className="space-y-1.5 sm:space-y-2">
                      {[
                        'תכנון מונחה AI - ייחודיות משמעותית',
                        'פתרון All-in-One - ריכוז כל הכלים במקום אחד',
                        'פשטות וקלות שימוש - ממשק נקי ואינטואיטיבי',
                        'שיתוף פעולה חלק - כלים מובנים לתקשורת',
                        'התאמה לשוק הישראלי - טקסטים בעברית',
                        'Push Notifications מתקדמות',
                        'מובייל-פירסט / PWA'
                      ].map((advantage, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
                          <span className="text-xs sm:text-sm text-gray-700">{advantage}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Market Research Tab */}
            <TabsContent value="market" className="space-y-4 sm:space-y-6">
              <Card>
                <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 sm:p-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                    נקודות למחקר שוק וסקרים
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 sm:pt-6 p-4 sm:p-6 space-y-4 sm:space-y-6">
                  {/* Israeli Market */}
                  <div>
                    <h3 className="font-bold text-lg sm:text-xl mb-3 sm:mb-4 flex items-center gap-2">
                      <span className="text-xl sm:text-2xl">🇮🇱</span>
                      השוק הישראלי
                    </h3>
                    <div className="space-y-2 sm:space-y-3">
                      {[
                        { q: 'הרגלי תכנון', a: 'איך ישראלים מתכננים אירועים היום? (וואטסאפ? אקסל? בעל פה?)' },
                        { q: 'נכונות לשלם', a: 'האם יש נכונות לשלם עבור שירות כזה? כמה?' },
                        { q: 'פיצ\'רים מבוקשים', a: 'אילו פיצ\'רים "חייבים להיות" ואילו "נחמד שיהיו"?' },
                        { q: 'מודעות ל-AI', a: 'האם ישראלים פתוחים לשימוש ב-AI לתכנון?' },
                        { q: 'תחרות מקומית', a: 'מי המתחרים העיקריים ומה היתרונות/חסרונות שלהם?' }
                      ].map((item, idx) => (
                        <div key={idx} className="p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <h4 className="font-semibold text-xs sm:text-sm text-blue-900 mb-1">{item.q}</h4>
                          <p className="text-xs sm:text-sm text-blue-700">{item.a}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Global Market */}
                  <div>
                    <h3 className="font-bold text-lg sm:text-xl mb-3 sm:mb-4 flex items-center gap-2">
                      <Globe className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
                      השוק העולמי
                    </h3>
                    <div className="space-y-2 sm:space-y-3">
                      {[
                        { q: 'התאמה תרבותית', a: 'איך צורת תכנון האירועים משתנה בין תרבויות שונות?' },
                        { q: 'רגולציה', a: 'האם יש צורך להתאים לרגולציות פרטיות (GDPR באירופה)?' },
                        { q: 'תמחור', a: 'מודלים עסקיים נפוצים באפליקציות דומות בעולם' },
                        { q: 'לוקליזציה', a: 'דרישות לוקליזציה (שפות, מטבעות, אזורי זמן)' },
                        { q: 'הבדלים בפיצ\'רים', a: 'אילו פיצ\'רים נדרשים בשווקים ספציפיים?' },
                        { q: 'מתחרים בינלאומיים', a: 'מי הם המובילים בשוק ואיך Planora מתבדלת מהם' }
                      ].map((item, idx) => (
                        <div key={idx} className="p-3 sm:p-4 bg-purple-50 rounded-lg border border-purple-200">
                          <h4 className="font-semibold text-xs sm:text-sm text-purple-900 mb-1">{item.q}</h4>
                          <p className="text-xs sm:text-sm text-purple-700">{item.a}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Survey Questions */}
                  <div className="p-4 sm:p-6 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border-2 border-orange-200">
                    <h3 className="font-bold text-base sm:text-lg mb-3 sm:mb-4 flex items-center gap-2">
                      <span className="text-xl">📋</span>
                      שאלות כלליות לסקר
                    </h3>
                    <ul className="space-y-1.5 sm:space-y-2">
                      {[
                        'מוכנות לשיתוף פעולה: עד כמה הייתם רוצים לשתף פעולה בתכנון אירועים?',
                        'חשיבות כל פיצ\'ר: דרגו את חשיבות הפיצ\'רים השונים',
                        'חווית משתמש: עד כמה קל ונוח השימוש באפליקציה',
                        'פוטנציאל להמלצה: האם הייתם ממליצים על האפליקציה?'
                      ].map((q, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                          <span className="text-xs sm:text-sm text-gray-700">{q}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Challenges */}
                  <div className="p-4 sm:p-6 bg-gradient-to-r from-red-50 to-rose-50 rounded-xl border-2 border-red-200">
                    <h3 className="font-bold text-base sm:text-lg mb-3 sm:mb-4 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                      אתגרים וחסרונות פוטנציאליים
                    </h3>
                    <ul className="space-y-1.5 sm:space-y-2">
                      {[
                        'תחרות בשוק: קיימות אפליקציות לניהול משימות ופרויקטים',
                        'חינוך שוק: משתמשים צריכים להבין את הערך',
                        'תלות ב-AI: אם ה-AI אינו מדויק מספיק',
                        'פרטיות ואבטחה: ניהול מידע אישי דורש רמת אבטחה גבוהה',
                        'מודל עסקי: כרגע נראה כחינמי. איך לייצר הכנסות?',
                        'התאמה בינלאומית: תמיכה בשפות מרובות'
                      ].map((challenge, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0 mt-0.5" />
                          <span className="text-xs sm:text-sm text-gray-700">{challenge}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Roadmap Tab */}
            <TabsContent value="roadmap" className="space-y-4 sm:space-y-6">
              <Card>
                <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 p-4 sm:p-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                    אבני דרך עתידיות / שיפורים
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 sm:pt-6 p-4 sm:p-6">
                  <div className="space-y-3 sm:space-y-4">
                    {[
                      {
                        phase: 'שלב 1 - בסיס',
                        items: [
                          'אינטגרציה עם לוחות שנה (Google Calendar)',
                          'ניהול תקציב מתקדם',
                          'פיצול חשבונות אוטומטי'
                        ],
                        color: 'from-green-500 to-emerald-500'
                      },
                      {
                        phase: 'שלב 2 - צמיחה',
                        items: [
                          'תמיכה בריבוי שפות',
                          'מודל עסקי - גיבוש ברור',
                          'שיווק ספקים - פלטפורמה להצגה'
                        ],
                        color: 'from-blue-500 to-indigo-500'
                      },
                      {
                        phase: 'שלב 3 - חדשנות',
                        items: [
                          'AI מתקדם - הצעות פעילות',
                          'זיהוי אוטומטי בתמונות',
                          'ביקורות ודירוגים',
                          'אירועים ציבוריים'
                        ],
                        color: 'from-purple-500 to-pink-500'
                      }
                    ].map((phase, idx) => (
                      <div key={idx} className="relative">
                        <div className={`absolute inset-0 bg-gradient-to-r ${phase.color} opacity-5 rounded-xl`}></div>
                        <div className="relative p-4 sm:p-6 border-2 border-gray-200 rounded-xl">
                          <h3 className={`font-bold text-base sm:text-lg mb-3 sm:mb-4 bg-gradient-to-r ${phase.color} bg-clip-text text-transparent`}>
                            {phase.phase}
                          </h3>
                          <ul className="space-y-1.5 sm:space-y-2">
                            {phase.items.map((item, iIdx) => (
                              <li key={iIdx} className="flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                                <span className="text-xs sm:text-sm text-gray-700">{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 sm:mt-8 p-4 sm:p-6 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border-2 border-yellow-200">
                    <h3 className="font-bold text-base sm:text-lg mb-2 sm:mb-3 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
                      סיכום
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                      האיפיון הזה מספק בסיס חזק למחקר השוק ולסקרים. הוא מפרט את ה"מה" ו"למי" של האפליקציה, 
                      ומצביע על נקודות מפתח שיש לבחון בעת פנייה לקהל פוטנציאלי.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Back to Profile Button */}
        <div className="mt-6 sm:mt-8 text-center print:hidden">
          <Button
            onClick={() => navigate(createPageUrl('Profile'))}
            variant="outline"
            size="lg"
            className="gap-2 w-full sm:w-auto"
          >
            חזרה לפרופיל
          </Button>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #specification-content,
          #specification-content * {
            visibility: visible;
          }
          #specification-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

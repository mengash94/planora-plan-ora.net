import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Loader2, Sparkles, CheckCircle2, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { APP_DOCUMENTATION } from './APP_DOCUMENTATION';

// מיפוי דפים לשאלות מהירות רלוונטיות
const PAGE_QUICK_QUESTIONS = {
  Home: [
    'מה אני רואה בדף הבית?',
    'איך יוצרים אירוע חדש?',
    'איך רואים את המשימות שלי?',
    'איפה רואים הודעות חדשות?'
  ],
  MyEventsList: [
    'איך מסננים אירועים?',
    'איך עוברים לאירוע ספציפי?',
    'מה ההבדל בין סטטוסים?',
    'איך מוחקים אירוע?'
  ],
  EventDetail: [
    'איך מזמינים משתתפים?',
    'איך יוצרים סקר?',
    'איך מוסיפים משימה?',
    'איך שולחים הודעה לכולם?'
  ],
  Tasks: [
    'איך מסמנים משימה כבוצעה?',
    'איך לוקחים משימה על עצמי?',
    'מה אומר "רק שלי"?',
    'איך מוסיפים תאריך יעד?'
  ],
  ChatOverview: [
    'איפה רואים הודעות שלא נקראו?',
    'איך עוברים לצ\'אט של אירוע?',
    'האם אפשר למחוק הודעות?',
    'איך שולחים תמונה בצ\'אט?'
  ],
  Profile: [
    'איך משנים את התמונה שלי?',
    'איך מפעילים התראות?',
    'איך יוצרים קשר עם התמיכה?',
    'איך מתנתקים מהאפליקציה?'
  ],
  CreateEvent: [
    'מה ההבדל בין יצירה עם AI לתבנית?',
    'איך בוחרים תבנית?',
    'מה זה אירוע ציבורי?',
    'איך מגדירים עלות השתתפות?'
  ],
  CreateEventAI: [
    'איך לדבר עם העוזר החכם?',
    'מה כדאי לספר לו?',
    'האם הוא יוצר משימות אוטומטית?',
    'איך משנים את מה שהוא הציע?'
  ],
  default: [
    'איך יוצרים אירוע?',
    'איך מזמינים משתתפים?',
    'איך יוצרים סקר?',
    'איך מוסיפים משימה?'
  ]
};

// מיפוי דפים להודעת פתיחה
const PAGE_GREETINGS = {
  Home: 'שלום! 👋 אתה בדף הבית. כאן תראה את האירועים הקרובים, המשימות הפתוחות וההודעות האחרונות. במה אוכל לעזור?',
  MyEventsList: 'שלום! 📅 אתה ברשימת האירועים שלך. כאן תוכל לראות את כל האירועים שאתה חלק מהם. איך אפשר לעזור?',
  EventDetail: 'שלום! 🎉 אתה בדף פרטי אירוע. כאן תוכל לנהל משימות, סקרים, צ\'אט ועוד. מה תרצה לדעת?',
  Tasks: 'שלום! ✅ אתה בדף המשימות שלך. כאן מרוכזות כל המשימות מכל האירועים. במה אוכל לעזור?',
  ChatOverview: 'שלום! 💬 אתה בדף הצ\'אטים. כאן תראה את כל השיחות מהאירועים שלך. יש לך שאלות?',
  Profile: 'שלום! 👤 אתה בדף הפרופיל. כאן תוכל לעדכן פרטים אישיים והגדרות. איך אפשר לעזור?',
  CreateEvent: 'שלום! ➕ אתה ביצירת אירוע חדש. יש 3 דרכים ליצור: AI, תבנית או ידני. מה מתאים לך?',
  CreateEventAI: 'שלום! 🤖 אתה ביצירה עם AI! פשוט ספר לעוזר על האירוע שלך והוא יעזור לך. יש שאלות?',
  default: 'שלום! 👋 אני העוזר של Planora. אני כאן לעזור לך להבין איך להשתמש באפליקציה. שאל אותי כל שאלה!'
};

// פונקציה לזיהוי הדף הנוכחי
const detectCurrentPage = () => {
  const path = window.location.pathname;
  
  if (path.includes('Home') || path === '/') return 'Home';
  if (path.includes('MyEventsList')) return 'MyEventsList';
  if (path.includes('EventDetail')) return 'EventDetail';
  if (path.includes('Tasks')) return 'Tasks';
  if (path.includes('ChatOverview') || path.includes('EventChat')) return 'ChatOverview';
  if (path.includes('Profile')) return 'Profile';
  if (path.includes('CreateEventAI')) return 'CreateEventAI';
  if (path.includes('CreateEvent') || path.includes('CreateEventManual')) return 'CreateEvent';
  if (path.includes('EditEvent')) return 'EventDetail';
  return 'default';
};

// פונקציה לעיצוב תשובות הבוט
const formatBotMessage = (content) => {
  if (!content) return null;
  
  const lines = content.split('\n');
  
  return lines.map((line, index) => {
    const trimmedLine = line.trim();
    
    if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**')) {
      const title = trimmedLine.replace(/\*\*/g, '');
      return (
        <div key={index} className="font-bold text-gray-900 mt-3 mb-1 first:mt-0">
          {title}
        </div>
      );
    }
    
    if (trimmedLine.includes('**')) {
      const parts = trimmedLine.split(/\*\*(.*?)\*\*/g);
      return (
        <p key={index} className="mb-1">
          {parts.map((part, i) => 
            i % 2 === 1 ? <strong key={i} className="text-gray-900">{part}</strong> : part
          )}
        </p>
      );
    }
    
    const numberedMatch = trimmedLine.match(/^(\d+)\.\s*(.+)/);
    if (numberedMatch) {
      return (
        <div key={index} className="flex gap-2 mb-2 mr-1">
          <span className="flex-shrink-0 w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-bold">
            {numberedMatch[1]}
          </span>
          <span className="flex-1">{numberedMatch[2]}</span>
        </div>
      );
    }
    
    if (trimmedLine.startsWith('-') || trimmedLine.startsWith('•')) {
      const text = trimmedLine.substring(1).trim();
      return (
        <div key={index} className="flex gap-2 mb-1.5 mr-2">
          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
          <span className="flex-1">{text}</span>
        </div>
      );
    }
    
    if (!trimmedLine) {
      return <div key={index} className="h-2" />;
    }
    
    return (
      <p key={index} className="mb-1.5">
        {trimmedLine}
      </p>
    );
  });
};

export default function HelpChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activePage, setActivePage] = useState('default');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  
  // Drag functionality
  const [position, setPosition] = useState(() => {
    const saved = localStorage.getItem('helpBotPosition');
    return saved ? JSON.parse(saved) : { x: 8, y: 144 }; // left-2, bottom-36 default
  });
  const [isDragging, setIsDragging] = useState(false);
  const [hasMoved, setHasMoved] = useState(false);
  const dragRef = useRef(null);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // פתיחת הבוט עם זיהוי דף והודעת פתיחה מותאמת
  const handleOpen = () => {
    if (hasMoved) return; // Don't open if was dragged
    const currentPage = detectCurrentPage();
    setActivePage(currentPage);
    const greeting = PAGE_GREETINGS[currentPage] || PAGE_GREETINGS.default;
    setMessages([{ role: 'bot', content: greeting }]);
    setIsOpen(true);
  };

  // Drag handlers
  const handleDragStart = (e) => {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    dragStartRef.current = {
      x: clientX,
      y: clientY,
      posX: position.x,
      posY: position.y
    };
    setIsDragging(true);
    setHasMoved(false);
  };

  const handleDragMove = (e) => {
    if (!isDragging) return;
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    // Fixed: correct direction - subtract delta for proper drag direction
    const deltaX = clientX - dragStartRef.current.x;
    const deltaY = dragStartRef.current.y - clientY; // Y is from bottom, so keep reversed
    
    // Only consider it a drag if moved more than 5px
    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
      setHasMoved(true);
    }
    
    const newX = Math.max(8, Math.min(window.innerWidth - 60, dragStartRef.current.posX + deltaX));
    const newY = Math.max(100, Math.min(window.innerHeight - 120, dragStartRef.current.posY + deltaY));
    
    setPosition({ x: newX, y: newY });
  };

  const handleDragEnd = () => {
    if (isDragging) {
      if (hasMoved) {
        localStorage.setItem('helpBotPosition', JSON.stringify(position));
      }
      setIsDragging(false);
      // Reset hasMoved after a short delay to allow click
      setTimeout(() => setHasMoved(false), 50);
    }
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDragMove);
      window.addEventListener('touchend', handleDragEnd);
      
      return () => {
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
        window.removeEventListener('touchmove', handleDragMove);
        window.removeEventListener('touchend', handleDragEnd);
      };
    }
  }, [isDragging, position]);

  // שאלות מהירות לפי הדף הנוכחי
  const quickQuestions = PAGE_QUICK_QUESTIONS[activePage] || PAGE_QUICK_QUESTIONS.default;

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `אתה בוט עזרה לאפליקציית Planora - אפליקציה לתכנון וניהול אירועים.
        
תפקידך הוא לעזור למשתמשים להבין איך להשתמש באפליקציה בלבד. ענה בעברית, בצורה ידידותית וברורה.

**חשוב מאוד - הגבלות:**
- אתה יכול לעזור רק בנושאים הקשורים לאפליקציית Planora
- אתה לא יכול ליצור אירועים, משימות, סקרים או כל דבר אחר - רק להסביר איך לעשות זאת
- אתה לא מחליף את הפונקציונליות של האפליקציה, רק מדריך את המשתמש
- אם המשתמש מבקש ממך לעשות משהו (כמו ליצור אירוע, למצוא מקום וכו') - הסבר לו איפה באפליקציה הוא יכול לעשות זאת בעצמו

**טיפול בקלט לא צפוי:**
- אם המשתמש כותב משהו לא ברור או לא קשור לאפליקציה, הגב בנימוס: "אני יכול לעזור לך בשאלות על איך להשתמש באפליקציה. למשל, איך ליצור אירוע, איך להזמין משתתפים, איך ליצור סקר, וכו'. במה תרצה שאעזור?"
- אם המשתמש מנסה לתת לך הוראות ליצירת תוכן (כמו "תמצא לי מסעדה", "תארגן לי אירוע", "מתנס קהילתי") - הגב: "אני לא יכול לעשות את זה בשבילך, אבל אני יכול להסביר לך איך לעשות זאת באפליקציה. רוצה שאסביר?"
- אם המשתמש כותב מילים בודדות או משפטים קצרים שלא ברורים - בקש הבהרה בנימוס

המשתמש נמצא כרגע בדף: ${activePage}

הנה התיעוד המלא של האפליקציה:
${APP_DOCUMENTATION}

---

שאלת/הודעת המשתמש: ${userMessage}

הנחיות לתשובה:
1. ענה בקצרה וברור (מקסימום 4-5 משפטים בדרך כלל)
2. אם ההודעה לא קשורה לאפליקציה או מבקשת ממך לבצע פעולה - הסבר בנימוס שאתה יכול רק להדריך
3. אם אתה לא בטוח מה המשתמש רוצה - שאל שאלה מבהירה
4. השתמש באימוג'ים בצורה מתונה
5. אם השאלה דורשת צעדים, פרט אותם בצורה ממוספרת
6. אל תיכנס ללופ - אם המשתמש חוזר על אותה בקשה שאינך יכול לבצע, הפנה אותו לתמיכה`,
      });

      setMessages(prev => [...prev, { role: 'bot', content: response }]);
    } catch (error) {
      console.error('Error getting bot response:', error);
      setMessages(prev => [...prev, { 
        role: 'bot', 
        content: 'מצטער, נתקלתי בבעיה טכנית. 😅 אנא נסה שוב בעוד רגע, או פנה לתמיכה דרך דף הפרופיל אם הבעיה נמשכת.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* כפתור צף ניתן לגרירה עם אנימציות */}
      {!isOpen && (
        <button
          ref={dragRef}
          onClick={handleOpen}
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
          className={`fixed z-40 group touch-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          style={{ 
            left: `${position.x}px`, 
            bottom: `${position.y}px`,
            transition: isDragging ? 'none' : 'all 0.3s ease-out'
          }}
          aria-label="פתח עזרה - ניתן לגרור"
        >
          {/* הכפתור עצמו - גדול יותר למובייל עם אנימציות */}
          <div className={`relative w-14 h-14 sm:w-12 sm:h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full shadow-lg flex items-center justify-center text-white transition-all duration-300 ${isDragging ? 'scale-110 shadow-xl' : 'hover:scale-110 hover:shadow-xl active:scale-95'}`}>
            <HelpCircle className="w-5 h-5 sm:w-3 sm:h-3" />
            
            {/* פולס אנימציה */}
            <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-30" />
          </div>

          {/* תווית בהובר - מוסתרת במובייל */}
          <div className="hidden sm:block absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md pointer-events-none">
            {isDragging ? 'שחרר' : 'עזרה'}
          </div>
        </button>
      )}

      {/* חלון הצ'אט */}
      {isOpen && (
        <div className="fixed bottom-24 left-4 right-4 sm:left-4 sm:right-auto sm:w-96 z-50 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col max-h-[70vh] overflow-hidden">
          {/* כותרת ירוקה */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-4 flex items-center justify-between rounded-t-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold">עוזר Planora</h3>
                <p className="text-xs text-white/80">כאן לעזור לך 24/7</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* אזור ההודעות */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 min-h-[200px] max-h-[400px]">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${
                    message.role === 'user'
                      ? 'bg-green-500 text-white rounded-br-sm'
                      : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm shadow-sm'
                  }`}
                >
                  {message.role === 'bot' ? (
                    <div className="bot-message-content whitespace-pre-wrap">
                      {formatBotMessage(message.content)}
                    </div>
                  ) : (
                    message.content
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-end">
                <div className="bg-white text-gray-800 border border-gray-200 rounded-2xl rounded-bl-sm p-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-green-500" />
                    <span className="text-sm text-gray-500">חושב...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* שאלות מהירות לפי הדף */}
          {messages.length <= 2 && (
            <div className="p-3 bg-white border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-green-500" />
                שאלות מומלצות לדף זה:
              </p>
              <div className="flex flex-wrap gap-2">
                {quickQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInput(q);
                      setTimeout(handleSend, 100);
                    }}
                    className="text-xs bg-green-50 text-green-700 px-3 py-1.5 rounded-full hover:bg-green-100 transition-colors border border-green-200"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* שדה קלט */}
          <div className="p-3 bg-white border-t border-gray-200">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="שאל אותי משהו..."
                className="flex-1 text-right"
                disabled={isLoading}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                size="icon"
                className="bg-green-500 hover:bg-green-600"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}ft
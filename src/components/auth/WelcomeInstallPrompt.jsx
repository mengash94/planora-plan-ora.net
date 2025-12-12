import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Smartphone, X, Sparkles, Zap, Bell } from 'lucide-react';
import { isMobileDevice } from '@/components/utils/deviceDetection';

export default function WelcomeInstallPrompt({ onDismiss, isNewUser = false }) {
    const [show, setShow] = useState(false);

    useEffect(() => {
        // רק במובייל ורק אם לא מותקן כבר כ-PWA
        const isMobile = isMobileDevice();
        const isStandalone = typeof window !== 'undefined' && (
            (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
            (window.navigator && window.navigator.standalone)
        );

        if (isMobile && !isStandalone) {
            // בדיקה אם הוצג לאחרונה (כדי לא להציק)
            const lastShown = localStorage.getItem('welcome_install_last_shown');
            const now = Date.now();
            const HOUR = 60 * 60 * 1000;
            
            // אם משתמש חדש - תמיד נציג
            // אם משתמש קיים - רק אם עבר יותר משעה מאז ההצגה האחרונה
            if (isNewUser || !lastShown || (now - parseInt(lastShown)) > HOUR) {
                const timer = setTimeout(() => {
                    setShow(true);
                    localStorage.setItem('welcome_install_last_shown', String(now));
                    
                    // נעלם אוטומטית אחרי 5 שניות (במקום 3)
                    const autoHideTimer = setTimeout(() => {
                        handleDismiss();
                    }, 5000);
                    
                    return () => clearTimeout(autoHideTimer);
                }, 1500);
                
                return () => clearTimeout(timer);
            }
        }
    }, [isNewUser]);

    const handleDismiss = () => {
        setShow(false);
        if (onDismiss) onDismiss();
    };

    if (!show) return null;

    return (
        <div className="fixed top-20 left-0 right-0 z-50 px-4 animate-fade-in-up">
            <Card className="mx-auto max-w-md bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-2 border-blue-300 shadow-2xl">
                <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center animate-pulse">
                                <Sparkles className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 text-base">
                                    {isNewUser ? 'ברוך הבא! 🎉' : 'שלום שוב! 👋'}
                                </h3>
                                <p className="text-xs text-gray-600">
                                    {isNewUser ? 'מוכן לחוויה מושלמת?' : 'בואו נשפר את החוויה'}
                                </p>
                            </div>
                        </div>
                        <button onClick={handleDismiss} className="text-gray-400 hover:text-gray-600 transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="space-y-2 mb-3">
                        <div className="bg-white/70 backdrop-blur rounded-lg p-2.5">
                            <div className="flex items-start gap-2">
                                <Zap className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-xs font-semibold text-gray-800">פתיחה מהירה במסך הבית</p>
                                    <p className="text-[10px] text-gray-600">גישה ישירה לאירועים שלך בלחיצה אחת</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/70 backdrop-blur rounded-lg p-2.5">
                            <div className="flex items-start gap-2">
                                <Bell className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-xs font-semibold text-gray-800">התראות בזמן אמת</p>
                                    <p className="text-[10px] text-gray-600">עדכונים מיידיים על הודעות ומשימות חדשות</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/70 backdrop-blur rounded-lg p-2.5">
                            <div className="flex items-start gap-2">
                                <Smartphone className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-xs font-semibold text-gray-800">חוויה כמו אפליקציה</p>
                                    <p className="text-[10px] text-gray-600">ממשק מלא ללא סרגל דפדפן מפריע</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            onClick={handleDismiss}
                            variant="outline"
                            size="sm"
                            className="flex-1 text-xs h-8"
                        >
                            אולי מאוחר יותר
                        </Button>
                        <Button
                            onClick={handleDismiss}
                            size="sm"
                            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs h-8 font-semibold"
                        >
                            הבנתי! 👍
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Smartphone, X, CheckCircle2 } from 'lucide-react';
import { isMobileDevice } from '@/components/utils/deviceDetection';

export default function PostRegistrationPrompt({ onDismiss }) {
    const [show, setShow] = useState(false);

    useEffect(() => {
        // רק במובייל ורק אם לא מותקן כבר כ-PWA
        const isMobile = isMobileDevice();
        const isStandalone = typeof window !== 'undefined' && (
            (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
            (window.navigator && window.navigator.standalone)
        );

        if (isMobile && !isStandalone) {
            // המתן קצת לפני הצגת ההודעה
            const timer = setTimeout(() => {
                setShow(true);
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleDismiss = () => {
        setShow(false);
        if (onDismiss) onDismiss();
    };

    if (!show) return null;

    return (
        <div className="fixed bottom-20 left-0 right-0 z-50 px-4 animate-fade-in-up">
            <Card className="mx-auto max-w-md bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 shadow-xl">
                <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                                <CheckCircle2 className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 text-sm">נרשמת בהצלחה! 🎉</h3>
                                <p className="text-xs text-gray-600">עוד צעד קטן לחוויה מושלמת</p>
                            </div>
                        </div>
                        <button onClick={handleDismiss} className="text-gray-400 hover:text-gray-600">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="bg-white/60 rounded-lg p-3 mb-3">
                        <div className="flex items-start gap-2">
                            <Smartphone className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-xs text-gray-700 leading-relaxed">
                                    <span className="font-semibold">טיפ:</span> התקינו את Planora כאפליקציה במסך הבית לגישה מהירה ולהתראות על עדכונים!
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            onClick={handleDismiss}
                            variant="outline"
                            size="sm"
                            className="flex-1 text-xs"
                        >
                            אולי מאוחר יותר
                        </Button>
                        <Button
                            onClick={handleDismiss}
                            size="sm"
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs"
                        >
                            הבנתי, תודה!
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
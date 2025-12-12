import React, { useState, useEffect } from 'react';
import { X, Download, Share2, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { isNativeCapacitor } from '@/components/onesignalService';

export default function InstallPromptCustomBanner({ deferredPrompt, onPromptUsed }) {
  const [showGuideDialog, setShowGuideDialog] = useState(false);
  const [platform, setPlatform] = useState('unknown');
  const [isDismissed, setIsDismissed] = useState(false);

  // ✅ שימוש בפונקציה האחידה לזיהוי Native
  const isNative = isNativeCapacitor();

  const isStandalone = typeof window !== 'undefined' && (
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    (window.navigator && window.navigator.standalone)
  );

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    
    const ua = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua)) {
      setPlatform('ios');
    } else if (/Android/.test(ua)) {
      setPlatform('android');
    } else {
      setPlatform('desktop');
    }

    // Check if banner was dismissed in this session
    const dismissed = sessionStorage.getItem('installBannerDismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      console.log('[InstallPrompt] Triggering native install prompt');
      try {
        deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        
        if (choiceResult.outcome === 'accepted') {
          console.log('[InstallPrompt] User accepted installation');
          handleDismiss();
        }
      } catch (error) {
        console.error('[InstallPrompt] Error prompting install:', error);
        setShowGuideDialog(true);
      }
    } else {
      console.log('[InstallPrompt] No native prompt, showing manual guide');
      setShowGuideDialog(true);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('installBannerDismissed', 'true');
    if (onPromptUsed) onPromptUsed();
  };

  const getInstallGuide = () => {
    if (platform === 'ios') {
      return {
        title: 'התקנה ב-iOS',
        steps: [
          'לחץ על כפתור השיתוף (למטה במרכז)',
          'גלול למטה ובחר "הוסף למסך הבית"',
          'לחץ על "הוסף" בפינה הימנית העליונה',
          'Planora תופיע במסך הבית שלך!'
        ],
        icon: <Share2 className="w-10 h-10 text-blue-500 mx-auto mb-3" />
      };
    } else if (platform === 'android') {
      return {
        title: 'התקנה באנדרואיד',
        steps: [
          'לחץ על תפריט הדפדפן (שלוש נקודות למעלה)',
          'בחר "התקן אפליקציה" או "הוסף למסך הבית"',
          'אשר את ההתקנה',
          'Planora תופיע במסך הבית שלך!'
        ],
        icon: <MoreVertical className="w-10 h-10 text-green-500 mx-auto mb-3" />
      };
    } else {
      return {
        title: 'התקנה במחשב',
        steps: [
          'לחץ על אייקון ההתקנה בשורת הכתובת',
          'או: לחץ על תפריט הדפדפן ובחר "התקן Planora"',
          'אשר את ההתקנה',
          'Planora תופיע כאפליקציה במחשב!'
        ],
        icon: <Download className="w-10 h-10 text-purple-500 mx-auto mb-3" />
      };
    }
  };

  // ✅ אם אנחנו ב-Native - לא להציג את הבאנר כלל!
  if (isNative) {
    console.log('[InstallPrompt] 🚫 Running in native app, hiding PWA install banner');
    return null;
  }

  // גם לא להציג אם כבר מותקן או dismissed
  if (isStandalone || isDismissed) {
    return null;
  }

  const guide = getInstallGuide();

  return (
    <>
      {/* Compact Install Banner */}
      <div className="fixed bottom-20 left-0 right-0 z-50 px-3 animate-fade-in-up">
        <div className="max-w-lg mx-auto">
          <div className="bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-700 px-3 py-2.5">
            <div className="flex items-center gap-2.5">
              {/* App Icon */}
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-md">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              
              {/* Text */}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold leading-tight">התקן את Planora</h3>
                <p className="text-xs text-slate-300 leading-tight">
                  חוויה מהירה ונוחה יותר
                </p>
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Button
                  onClick={handleInstall}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-1.5 h-auto text-sm rounded-lg shadow-md"
                >
                  התקנה
                </Button>
                
                <button
                  onClick={handleDismiss}
                  className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                  aria-label="סגור"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Install Guide Dialog */}
      <Dialog open={showGuideDialog} onOpenChange={setShowGuideDialog}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl text-center mb-2">{guide.title}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {guide.icon}
            
            <div className="space-y-3">
              {guide.steps.map((step, index) => (
                <div key={index} className="flex gap-2.5 items-start">
                  <div className="w-7 h-7 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {index + 1}
                  </div>
                  <p className="text-gray-700 pt-0.5 leading-relaxed text-sm">{step}</p>
                </div>
              ))}
            </div>

            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-900 text-center leading-relaxed">
                💡 <strong>טיפ:</strong> לאחר ההתקנה, Planora תפעל מהר יותר ותקבל התראות על עדכונים!
              </p>
            </div>

            <Button
              onClick={() => setShowGuideDialog(false)}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5"
            >
              הבנתי, תודה!
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <style jsx>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in-up {
          animation: fade-in-up 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
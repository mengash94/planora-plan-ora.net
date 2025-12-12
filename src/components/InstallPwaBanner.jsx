import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowDownToLine, X, Info, Smartphone, Sparkles, Zap, Star } from 'lucide-react';

export default function InstallPwaBanner({ onInstall, onDismiss, promptAvailable = false }) {
  const [showHelp, setShowHelp] = useState(false);

  const platformHelp = useMemo(() => {
    const ua = (typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent : '';
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const isAndroid = /Android/i.test(ua);
    if (isIOS) {
      return {
        title: '📱 איך מתקינים ב-iPhone/iPad?',
        steps: [
          'לחצו על כפתור השיתוף (📤) בתחתית/עליון המסך',
          'גללו למטה ובחרו "הוסף למסך הבית" (Add to Home Screen)',
          'לחצו "הוסף" ותקבלו את Planora במסך הבית! 🎉'
        ]
      };
    }
    if (isAndroid) {
      return {
        title: '📱 איך מתקינים באנדרואיד?',
        steps: [
          'לחצו על ⋮ (שלוש נקודות) בפינה העליונה של הדפדפן',
          'בחרו "התקן אפליקציה" או "הוסף למסך הבית"',
          'לחצו "התקן" והאפליקציה תותקן! 🎉'
        ]
      };
    }
    return {
      title: '💻 איך להתקין במחשב?',
      steps: [
        'בכרום/אדג׳: חפשו אייקון התקנה (⬇) בסרגל הכתובת',
        'או לחצו על תפריט הדפדפן ובחרו "התקן Planora"',
        'האפליקציה תיפתח בחלון נפרד משלה! 💻'
      ]
    };
  }, []);

  return (
    <div className="fixed bottom-20 sm:bottom-24 left-0 right-0 z-[60] px-3 sm:px-4 animate-fade-in-up">
      <div className="mx-auto max-w-xl">
        {/* Main Banner */}
        <div className="relative bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 text-white rounded-3xl shadow-2xl border-4 border-white/30 p-1 overflow-hidden">
          {/* Animated Background Pattern */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-1/4 w-32 h-32 bg-white rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-0 right-1/4 w-40 h-40 bg-yellow-300 rounded-full blur-3xl animate-pulse delay-1000"></div>
          </div>

          {/* Content Container */}
          <div className="relative bg-gradient-to-br from-orange-600/95 via-pink-600/95 to-purple-700/95 backdrop-blur-sm rounded-2xl p-4 sm:p-6">
            {/* Close Button */}
            <button 
              onClick={onDismiss} 
              className="absolute top-3 left-3 text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/20 transition-all z-10"
              aria-label="סגור"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Icon Badge */}
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-white/30 rounded-full blur-xl animate-pulse"></div>
                <div className="relative bg-white/20 backdrop-blur-sm rounded-2xl p-3 border-2 border-white/40">
                  <Smartphone className="w-10 h-10 text-white drop-shadow-lg animate-bounce" />
                </div>
              </div>
            </div>

            {/* Main Text */}
            <div className="text-center mb-4">
              <h3 className="text-2xl sm:text-3xl font-black mb-2 flex items-center justify-center gap-2 drop-shadow-lg">
                <Sparkles className="w-6 h-6 animate-spin" style={{ animationDuration: '3s' }} />
                <span>קבלו את Planora!</span>
                <Sparkles className="w-6 h-6 animate-spin" style={{ animationDuration: '3s', animationDirection: 'reverse' }} />
              </h3>
              <p className="text-base sm:text-lg text-white/95 font-semibold mb-1">
                {promptAvailable ? 'התקינו עכשיו בלחיצה אחת!' : 'הפכו את Planora לאפליקציה!'}
              </p>
              <p className="text-sm text-white/80">
                חווית שימוש מושלמת במסך הבית שלכם
              </p>
            </div>

            {/* Benefits */}
            <div className="grid grid-cols-3 gap-2 mb-5">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-white/20">
                <Zap className="w-6 h-6 mx-auto mb-1 text-yellow-300" />
                <p className="text-xs font-bold">פתיחה מהירה</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-white/20">
                <Star className="w-6 h-6 mx-auto mb-1 text-yellow-300" />
                <p className="text-xs font-bold">התראות בזמן אמת</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-white/20">
                <Smartphone className="w-6 h-6 mx-auto mb-1 text-yellow-300" />
                <p className="text-xs font-bold">חוויה מלאה</p>
              </div>
            </div>

            {/* CTA Button */}
            <div className="space-y-3">
              <Button
                onClick={promptAvailable ? onInstall : () => setShowHelp(v => !v)}
                className="w-full h-14 sm:h-16 text-lg sm:text-xl font-black bg-white text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-pink-600 hover:scale-105 transition-transform shadow-2xl relative overflow-hidden group"
                style={{
                  background: 'white',
                  color: '#ea580c'
                }}
              >
                {/* Button Shine Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                
                <span className="relative z-10 flex items-center justify-center gap-3">
                  {promptAvailable ? (
                    <>
                      <ArrowDownToLine className="w-6 h-6 animate-bounce" />
                      <span>התקן עכשיו בלחיצה!</span>
                      <Sparkles className="w-5 h-5" />
                    </>
                  ) : (
                    <>
                      <Info className="w-5 h-5" />
                      <span>הראה לי איך להתקין</span>
                      <Info className="w-5 h-5" />
                    </>
                  )}
                </span>
              </Button>

              {/* Small Info Button */}
              {!promptAvailable && (
                <button
                  onClick={() => setShowHelp(v => !v)}
                  className="w-full text-center text-xs text-white/80 hover:text-white underline"
                >
                  {showHelp ? 'הסתר הוראות' : 'איך מתקינים? לחץ כאן'}
                </button>
              )}
            </div>

            {/* Help Section */}
            {!promptAvailable && showHelp && (
              <div className="mt-4 rounded-xl bg-white/15 backdrop-blur-sm border border-white/30 p-4 animate-fade-in">
                <div className="text-sm font-bold mb-3 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  {platformHelp.title}
                </div>
                <ol className="list-decimal mr-5 space-y-2 text-sm text-white/95">
                  {platformHelp.steps.map((s, i) => (
                    <li key={i} className="leading-snug">{s}</li>
                  ))}
                </ol>
                <div className="mt-4 pt-3 border-t border-white/30">
                  <p className="text-xs text-white/80 text-center leading-relaxed">
                    💡 לאחר ההתקנה, Planora תופיע במסך הבית שלך כמו כל אפליקציה אחרת
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Floating Hearts Animation */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="text-4xl animate-float opacity-60">✨</div>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(-50%); }
          50% { transform: translateY(-20px) translateX(-50%); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
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
          animation: fade-in-up 0.5s ease-out;
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        .delay-1000 {
          animation-delay: 1s;
        }
      `}</style>
    </div>
  );
}
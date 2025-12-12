import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function InstallPromptBanner() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);

  // Check if already installed
  const isStandalone = typeof window !== 'undefined' && (
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    (window.navigator && window.navigator.standalone)
  );

  useEffect(() => {
    // Don't show if already installed
    if (isStandalone) {
      console.log('[InstallPromptBanner] Already installed as PWA');
      return;
    }

    // Check if user dismissed before
    const dismissed = localStorage.getItem('install_banner_dismissed');
    if (dismissed) {
      const dismissTime = parseInt(dismissed);
      const daysSinceDismiss = (Date.now() - dismissTime) / (1000 * 60 * 60 * 24);
      
      // Show again after 7 days
      if (daysSinceDismiss < 7) {
        console.log('[InstallPromptBanner] Banner dismissed recently');
        return;
      }
    }

    const handleBeforeInstallPrompt = (e) => {
      console.log('[InstallPromptBanner] beforeinstallprompt event received');
      e.preventDefault(); // Prevent the default browser banner
      setInstallPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [isStandalone]);

  const handleInstall = async () => {
    if (!installPrompt) {
      console.warn('[InstallPromptBanner] No install prompt available');
      return;
    }

    console.log('[InstallPromptBanner] Prompting install...');
    installPrompt.prompt();

    const choiceResult = await installPrompt.userChoice;
    
    if (choiceResult.outcome === 'accepted') {
      console.log('[InstallPromptBanner] User accepted installation');
      setShowBanner(false);
    } else {
      console.log('[InstallPromptBanner] User dismissed installation');
      handleDismiss();
    }
    
    setInstallPrompt(null);
  };

  const handleDismiss = () => {
    console.log('[InstallPromptBanner] Banner dismissed by user');
    localStorage.setItem('install_banner_dismissed', Date.now().toString());
    setShowBanner(false);
  };

  if (!showBanner || isStandalone) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-0 right-0 z-50 px-4 animate-fade-in-up">
      <div className="max-w-2xl mx-auto">
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700 p-4">
          <div className="flex items-center justify-between gap-4">
            {/* App Icon */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              
              {/* Text */}
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold mb-0.5">התקן את Planora</h3>
                <p className="text-sm text-slate-300 leading-tight">
                  הוסף למסך הבית לחוויה מהירה ונוחה יותר.
                </p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                onClick={handleInstall}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-5 py-2.5 h-auto rounded-lg shadow-lg hover:shadow-xl transition-all"
              >
                התקנה
              </Button>
              
              <button
                onClick={handleDismiss}
                className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                aria-label="סגור"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

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
          animation: fade-in-up 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}
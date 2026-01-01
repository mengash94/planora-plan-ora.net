import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Calendar, Smartphone, Apple, Play, Download, Star, Users, CheckCircle } from 'lucide-react';

export default function App() {
  const [deviceType, setDeviceType] = useState('desktop');
  const [isRedirecting, setIsRedirecting] = useState(false);

  const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=net.planora.app";
  const APP_STORE_URL = "https://apps.apple.com/il/app/planora/id6755497184";

  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera || '';
    
    let detectedType = 'desktop';
    let targetUrl = null;

    if (/android/i.test(userAgent)) {
      detectedType = 'android';
      targetUrl = PLAY_STORE_URL;
    } else if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
      detectedType = 'ios';
      targetUrl = APP_STORE_URL;
    }

    setDeviceType(detectedType);

    // Auto-redirect for mobile devices - immediate redirect
    if (targetUrl) {
      setIsRedirecting(true);
      
      // Try native store URL first, then fallback
      if (detectedType === 'android') {
        window.location.href = 'market://details?id=net.planora.app';
        setTimeout(() => {
          window.location.href = PLAY_STORE_URL;
        }, 300);
      } else if (detectedType === 'ios') {
        window.location.href = 'itms-apps://apps.apple.com/il/app/id6755497184';
        setTimeout(() => {
          window.location.href = APP_STORE_URL;
        }, 300);
      }
    }
  }, []);

  // Desktop view - beautiful landing page with store options
  if (deviceType === 'desktop') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-500 via-rose-500 to-pink-500" style={{ direction: 'rtl' }}>
        <div className="min-h-screen flex flex-col items-center justify-center p-6">
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <div className="w-28 h-28 mx-auto bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center mb-6 shadow-2xl border border-white/30">
              <Calendar className="w-14 h-14 text-white" />
            </div>
            <h1 className="text-5xl font-bold text-white mb-3">Planora</h1>
            <p className="text-xl text-white/90">לתכנן הכל יחד עם חברים</p>
          </div>

          {/* Features */}
          <div className="flex flex-wrap justify-center gap-4 mb-10 max-w-2xl">
            {[
              { icon: Users, text: 'תכנון שיתופי' },
              { icon: CheckCircle, text: 'משימות משותפות' },
              { icon: Star, text: 'סקרים והצבעות' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-white">
                <item.icon className="w-4 h-4" />
                <span className="text-sm font-medium">{item.text}</span>
              </div>
            ))}
          </div>

          {/* Download Card */}
          <Card className="max-w-md w-full p-8 text-center shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
            <div className="flex items-center justify-center gap-2 mb-6">
              <Download className="w-5 h-5 text-orange-500" />
              <h2 className="text-xl font-bold text-gray-900">הורד את האפליקציה</h2>
            </div>

            <div className="space-y-3">
              <a 
                href={APP_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 w-full h-14 bg-black text-white rounded-xl hover:bg-gray-800 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Apple className="w-7 h-7" />
                <div className="text-right">
                  <div className="text-[10px] opacity-80">הורד מ-</div>
                  <div className="font-semibold text-lg">App Store</div>
                </div>
              </a>

              <a 
                href={PLAY_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 w-full h-14 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Play className="w-7 h-7" />
                <div className="text-right">
                  <div className="text-[10px] opacity-80">הורד מ-</div>
                  <div className="font-semibold text-lg">Google Play</div>
                </div>
              </a>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                📱 גם לאייפון וגם לאנדרואיד
              </p>
            </div>
          </Card>

          {/* Footer */}
          <p className="text-white/70 text-sm mt-8">
            © 2025 Planora. All rights reserved.
          </p>
        </div>
      </div>
    );
  }

  // Mobile view - redirecting with beautiful UI
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-500 via-rose-500 to-pink-500 flex items-center justify-center p-6" style={{ direction: 'rtl' }}>
      <Card className="max-w-sm w-full p-8 text-center shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
        <div className="w-24 h-24 mx-auto bg-gradient-to-br from-orange-400 to-rose-500 rounded-3xl flex items-center justify-center mb-6 shadow-lg">
          <Smartphone className="w-12 h-12 text-white animate-pulse" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Planora
        </h1>
        <p className="text-gray-600 mb-6">
          {deviceType === 'ios' ? 'מעביר ל-App Store...' : 'מעביר ל-Google Play...'}
        </p>

        <div className="relative w-16 h-16 mx-auto mb-6">
          <div className="absolute inset-0 border-4 border-orange-200 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          לא נפתח אוטומטית?
        </p>

        <Button
          onClick={() => {
            window.location.href = deviceType === 'ios' ? APP_STORE_URL : PLAY_STORE_URL;
          }}
          className="w-full h-12 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 rounded-xl text-base font-semibold shadow-lg"
        >
          {deviceType === 'ios' ? (
            <><Apple className="w-5 h-5 ml-2" /> פתח App Store</>
          ) : (
            <><Play className="w-5 h-5 ml-2" /> פתח Google Play</>
          )}
        </Button>
      </Card>
    </div>
  );
}
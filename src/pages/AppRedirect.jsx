import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Calendar, Smartphone, Apple, Play } from 'lucide-react';

export default function AppRedirect() {
  const [deviceType, setDeviceType] = useState('desktop');
  const [isRedirecting, setIsRedirecting] = useState(false);

  const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=net.planora.app";
  const APP_STORE_URL = "https://apps.apple.com/il/app/planora-%D7%90%D7%99%D7%A8%D7%95%D7%A2%D7%99%D7%9D/id6755497184";

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

    // Auto-redirect for mobile devices
    if (targetUrl) {
      setIsRedirecting(true);
      
      // Try native store URL first, then fallback
      if (detectedType === 'android') {
        window.location.href = 'market://details?id=net.planora.app';
        setTimeout(() => {
          window.location.href = PLAY_STORE_URL;
        }, 500);
      } else if (detectedType === 'ios') {
        window.location.href = 'itms-apps://apps.apple.com/il/app/id6755497184';
        setTimeout(() => {
          window.location.href = APP_STORE_URL;
        }, 500);
      }
    }
  }, []);

  // Desktop view - show both store options
  if (deviceType === 'desktop') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-pink-50 flex items-center justify-center p-6" style={{ direction: 'rtl' }}>
        <Card className="max-w-lg w-full p-8 text-center shadow-2xl border-0">
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-orange-400 to-rose-500 rounded-3xl flex items-center justify-center mb-6 shadow-lg">
            <Calendar className="w-12 h-12 text-white" />
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Planora
          </h1>
          <p className="text-gray-600 mb-8 text-lg">
            הורד את האפליקציה לתכנון אירועים עם חברים
          </p>

          <div className="space-y-4">
            <a 
              href={APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 w-full h-14 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors"
            >
              <Apple className="w-6 h-6" />
              <div className="text-right">
                <div className="text-xs opacity-80">הורד מ-</div>
                <div className="font-semibold">App Store</div>
              </div>
            </a>

            <a 
              href={PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 w-full h-14 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
            >
              <Play className="w-6 h-6" />
              <div className="text-right">
                <div className="text-xs opacity-80">הורד מ-</div>
                <div className="font-semibold">Google Play</div>
              </div>
            </a>
          </div>

          <p className="text-sm text-gray-500 mt-6">
            סרוק את קוד ה-QR מהמכשיר הנייד שלך
          </p>
        </Card>
      </div>
    );
  }

  // Mobile view - redirecting message
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-pink-50 flex items-center justify-center p-6" style={{ direction: 'rtl' }}>
      <Card className="max-w-md w-full p-8 text-center shadow-2xl border-0">
        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-orange-400 to-rose-500 rounded-2xl flex items-center justify-center mb-6 animate-pulse">
          <Smartphone className="w-10 h-10 text-white" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          מעביר אותך לחנות...
        </h1>
        <p className="text-gray-600 mb-6">
          {deviceType === 'ios' ? 'פותח את App Store...' : 'פותח את Google Play...'}
        </p>

        <div className="w-12 h-12 mx-auto border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-6"></div>

        <p className="text-sm text-gray-500 mb-4">
          לא עובד? לחץ על הכפתור:
        </p>

        <Button
          onClick={() => {
            window.location.href = deviceType === 'ios' ? APP_STORE_URL : PLAY_STORE_URL;
          }}
          className="w-full h-12 bg-orange-500 hover:bg-orange-600 rounded-xl"
        >
          פתח חנות האפליקציות
        </Button>
      </Card>
    </div>
  );
}
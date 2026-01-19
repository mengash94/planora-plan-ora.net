import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Smartphone, Download, Star, Zap, Bell, Users, MessageCircle, Calendar } from 'lucide-react';

// App Store URLs - עדכן את אלה לקישורים האמיתיים שלך
const APP_STORE_URL = 'https://apps.apple.com/app/planora/id123456789'; // TODO: עדכן
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.planora.app'; // TODO: עדכן

export const getAppStoreUrl = () => {
  if (typeof navigator === 'undefined') return PLAY_STORE_URL;
  
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) {
    return APP_STORE_URL;
  }
  return PLAY_STORE_URL;
};

export const getPlatform = () => {
  if (typeof navigator === 'undefined') return 'android';
  
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) {
    return 'ios';
  }
  return 'android';
};

export const isMobileDevice = () => {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
};

export const redirectToAppStore = () => {
  const url = getAppStoreUrl();
  window.location.href = url;
};

export default function MobileAppRedirect() {
  const [platform, setPlatform] = useState('android');

  useEffect(() => {
    setPlatform(getPlatform());
  }, []);

  const features = [
    { icon: Bell, text: 'התראות בזמן אמת' },
    { icon: Users, text: 'ניהול משתתפים' },
    { icon: MessageCircle, text: 'צ\'אט קבוצתי' },
    { icon: Calendar, text: 'ניהול אירועים' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-500 via-rose-500 to-purple-600 flex items-center justify-center p-4" style={{ direction: 'rtl' }}>
      <div className="w-full max-w-md text-center text-white">
        {/* Logo */}
        <div className="mb-8">
          <div className="w-24 h-24 bg-white rounded-3xl shadow-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-14 h-14 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold mb-2">Planora</h1>
          <p className="text-white/80 text-lg">תכנון אירועים חכם וקל</p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          {features.map((feature, index) => (
            <div key={index} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 flex flex-col items-center gap-2">
              <feature.icon className="w-6 h-6" />
              <span className="text-sm font-medium">{feature.text}</span>
            </div>
          ))}
        </div>

        {/* Download Button */}
        <Button
          onClick={redirectToAppStore}
          className="w-full bg-white text-orange-600 hover:bg-gray-100 h-16 text-xl font-bold shadow-xl rounded-2xl"
        >
          <Download className="w-6 h-6 ml-3" />
          {platform === 'ios' ? 'הורד מ-App Store' : 'הורד מ-Google Play'}
        </Button>

        {/* Rating */}
        <div className="flex items-center justify-center gap-1 mt-6">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
          ))}
          <span className="text-white/80 text-sm mr-2">4.8 (1,000+ הורדות)</span>
        </div>

        {/* Benefits */}
        <div className="mt-8 text-white/70 text-sm space-y-1">
          <p>✓ חינמי לחלוטין</p>
          <p>✓ ללא פרסומות</p>
          <p>✓ מאובטח ופרטי</p>
        </div>
      </div>
    </div>
  );
}
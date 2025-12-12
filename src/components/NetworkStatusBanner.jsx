import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { isOnline } from './utils/networkHelpers';

export default function NetworkStatusBanner() {
  const [online, setOnline] = useState(true);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Initial check
    setOnline(isOnline());

    const handleOnline = () => {
      console.log('🌐 Network: ONLINE');
      setOnline(true);
      setShowBanner(true);
      
      // Hide "back online" banner after 3 seconds
      setTimeout(() => {
        setShowBanner(false);
      }, 3000);
    };

    const handleOffline = () => {
      console.log('🌐 Network: OFFLINE');
      setOnline(false);
      setShowBanner(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showBanner) return null;

  return (
    <div 
      className={`fixed top-0 left-0 right-0 z-[100] ${
        online 
          ? 'bg-green-500' 
          : 'bg-red-500'
      } text-white py-2 px-4 shadow-lg animate-in slide-in-from-top`}
      style={{ direction: 'rtl' }}
    >
      <div className="max-w-6xl mx-auto flex items-center justify-center gap-2">
        {online ? (
          <>
            <Wifi className="w-5 h-5" />
            <span className="font-semibold">חזרת להיות מחובר לאינטרנט</span>
          </>
        ) : (
          <>
            <WifiOff className="w-5 h-5" />
            <span className="font-semibold">אין חיבור לאינטרנט - חלק מהתכונות עשויות שלא לעבוד</span>
          </>
        )}
      </div>
    </div>
  );
}
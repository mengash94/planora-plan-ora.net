import { useEffect, useState } from 'react';
import { registerToPlanoraAlert } from '@/components/planoraAlertService';
import { isMobileDevice } from '@/components/utils/deviceDetection';

export default function AutoPushRegistration({ user, hasAnyDevices }) {
    const [hasTriedAutoRegister, setHasTriedAutoRegister] = useState(false);

    useEffect(() => {
        // רק במובייל, רק אם אין למשתמש התקנים רשומים
        const isMobile = isMobileDevice();
        
        // בדיקה אם כבר מותקן כ-PWA
        const isStandalone = typeof window !== 'undefined' && (
            (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
            (window.navigator && window.navigator.standalone)
        );
        
        const sessionKey = 'auto_push_register_attempted';
        const hasAttempted = sessionStorage.getItem(sessionKey);
        
        if (hasAttempted || hasTriedAutoRegister || !user?.id || hasAnyDevices || !isMobile || isStandalone) {
            return;
        }

        // בדיקה אם זו כניסה לאחרונה
        const lastLoginTime = sessionStorage.getItem('last_login_time');
        const now = Date.now();
        const isRecentLogin = lastLoginTime && (now - parseInt(lastLoginTime)) < 5000;

        if (isRecentLogin) {
            console.log('[AutoPushRegistration] 🚀 Auto-redirecting to push registration...');
            
            sessionStorage.setItem(sessionKey, 'true');
            setHasTriedAutoRegister(true);

            // המתנה קצרה - רק חצי שנייה
            setTimeout(() => {
                registerToPlanoraAlert(user.id);
            }, 500);
        }
    }, [user?.id, hasAnyDevices, hasTriedAutoRegister]);

    return null;
}
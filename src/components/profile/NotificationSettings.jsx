
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, BellOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { 
  checkOneSignalDeviceStatus, 
  registerToPlanoraAlert,
  deleteDeviceFromOneSignal
} from '@/components/instabackService';
import { isMobileDevice } from '@/components/utils/deviceDetection';

export default function NotificationSettings({ user }) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isUnregistering, setIsUnregistering] = useState(false);
  const [pushStatus, setPushStatus] = useState({
    hasDevices: false,
    isRegistered: false,
    deviceCount: 0
  });

  useEffect(() => {
    checkPushStatus();
  }, [user?.id]);

  const checkPushStatus = async () => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      const status = await checkOneSignalDeviceStatus();
      
      console.log('🔔 [NotificationSettings] Push status:', status);
      
      setPushStatus({
        hasDevices: status.hasDevices || false,
        isRegistered: status.hasDevices || false,
        deviceCount: status.deviceCount || 0
      });
    } catch (error) {
      console.error('Failed to check push status:', error);
      setPushStatus({
        hasDevices: false,
        isRegistered: false,
        deviceCount: 0
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = () => {
    if (!user?.id) return;
    
    console.log('🔔 [NotificationSettings] Redirecting to registration...');
    registerToPlanoraAlert(user.id, window.location.href);
  };

  const handleUnregister = async () => {
    if (!user?.id) {
      toast({
        title: 'שגיאה',
        description: 'לא ניתן לבטל הרשמה ללא זיהוי משתמש',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsUnregistering(true);
      
      console.log('🔕 [NotificationSettings] Calling delete_user_fromm_onesignal with userId:', user.id);
      
      // קריאה לפונקציית המחיקה עם userId בלבד
      await deleteDeviceFromOneSignal(user.id);
      
      console.log('✅ [NotificationSettings] Device deleted successfully');
      
      toast({
        title: 'בוטל בהצלחה! 🔕',
        description: 'הביטול יתעדכן בדקות הקרובות. עד אז עדיין תוכל לקבל התראות.',
        duration: 5000
      });
      
      // רענון הסטטוס
      await checkPushStatus();
      
    } catch (error) {
      console.error('❌ [NotificationSettings] Failed to unregister:', error);
      
      toast({
        title: 'שגיאה בביטול ההרשמה',
        description: error.message || 'אירעה שגיאה בביטול ההרשמה להתראות',
        variant: 'destructive'
      });
    } finally {
      setIsUnregistering(false);
    }
  };

  const isMobile = isMobileDevice();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          הגדרות התראות
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                {pushStatus.isRegistered ? (
                  <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-orange-500 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 mb-1">
                    {pushStatus.isRegistered ? 'התראות פעילות ✅' : 'התראות לא פעילות'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {pushStatus.isRegistered 
                      ? `רשום ${pushStatus.deviceCount} מכשיר${pushStatus.deviceCount > 1 ? 'ים' : ''} להתראות`
                      : 'לא רשומים מכשירים להתראות Push'
                    }
                  </p>
                </div>
              </div>
            </div>

            {!isMobile && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  💡 <strong>טיפ:</strong> התראות Push עובדות בצורה הטובה ביותר במכשירים ניידים
                </p>
              </div>
            )}

            <div className="space-y-3">
              {pushStatus.isRegistered ? (
                <Button
                  onClick={handleUnregister}
                  disabled={isUnregistering}
                  variant="destructive"
                  className="w-full"
                >
                  {isUnregistering ? (
                    <>
                      <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                      מבטל הרשמה...
                    </>
                  ) : (
                    <>
                      <BellOff className="w-4 h-4 ml-2" />
                      בטל הרשמה להתראות
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleRegister}
                  className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600"
                >
                  <Bell className="w-4 h-4 ml-2" />
                  הרשם להתראות Push
                </Button>
              )}

              <Button
                onClick={checkPushStatus}
                variant="outline"
                size="sm"
                className="w-full"
              >
                רענן סטטוס
              </Button>
            </div>

            <div className="pt-4 border-t">
              <h4 className="font-semibold text-sm mb-2">מה תקבלו בהתראות?</h4>
              <ul className="text-sm text-gray-600 space-y-1 mr-4">
                <li>• הודעות חדשות בצ'אטים</li>
                <li>• משימות שהוקצו אליכם</li>
                <li>• עדכונים על אירועים</li>
                <li>• הזמנות לאירועים חדשים</li>
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

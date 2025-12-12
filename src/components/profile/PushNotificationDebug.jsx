
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertCircle, Loader2, Bell } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

export default function PushNotificationDebug() {
  const { user } = useAuth();
  const [status, setStatus] = useState({
    isNative: false,
    hasPlugin: false,
    permission: null,
    token: null,
    loading: false,
    error: null,
    logs: []
  });

  const addLog = (message, type = 'info') => {
    setStatus(prev => ({
      ...prev,
      logs: [...prev.logs, { message, type, time: new Date().toLocaleTimeString() }]
    }));
  };

  // בדיקה ראשונית
  useEffect(() => {
    checkInitialStatus();
  }, []);

  const checkInitialStatus = () => {
    addLog('🔍 בודק סביבת הרצה...', 'info');
    
    const isNative = typeof window !== 'undefined' && 
                     window.Capacitor?.isNativePlatform?.();
    const hasPlugin = typeof window !== 'undefined' && 
                      !!window.Capacitor?.Plugins?.PushNotifications;
    
    addLog(`סביבה: ${isNative ? 'Capacitor Native ✅' : 'Web Browser ❌'}`, isNative ? 'success' : 'warning');
    addLog(`Plugin זמין: ${hasPlugin ? 'כן ✅' : 'לא ❌'}`, hasPlugin ? 'success' : 'error');
    
    setStatus(prev => ({
      ...prev,
      isNative,
      hasPlugin
    }));
  };

  const checkPermissions = async () => {
    setStatus(prev => ({ ...prev, loading: true, error: null }));
    addLog('🔑 בודק הרשאות...', 'info');

    try {
      if (!window.Capacitor?.Plugins?.PushNotifications) {
        throw new Error('Plugin לא זמין');
      }

      const { PushNotifications } = window.Capacitor.Plugins;
      const perm = await PushNotifications.checkPermissions();
      
      addLog(`סטטוס הרשאה: ${perm.receive}`, 'success');
      
      setStatus(prev => ({
        ...prev,
        permission: perm.receive,
        loading: false
      }));
    } catch (error) {
      addLog(`❌ שגיאה: ${error.message}`, 'error');
      setStatus(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }));
    }
  };

  const requestPermissions = async () => {
    setStatus(prev => ({ ...prev, loading: true, error: null }));
    addLog('📲 מבקש הרשאות...', 'info');

    try {
      if (!window.Capacitor?.Plugins?.PushNotifications) {
        throw new Error('Plugin לא זמין');
      }

      const { PushNotifications } = window.Capacitor.Plugins;
      const perm = await PushNotifications.requestPermissions();
      
      addLog(`הרשאה התקבלה: ${perm.receive}`, perm.receive === 'granted' ? 'success' : 'warning');
      
      setStatus(prev => ({
        ...prev,
        permission: perm.receive,
        loading: false
      }));
    } catch (error) {
      addLog(`❌ שגיאה: ${error.message}`, 'error');
      setStatus(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }));
    }
  };

  const registerForPush = async () => {
    setStatus(prev => ({ ...prev, loading: true, error: null, token: null }));
    addLog('🎯 רושם להתראות Push...', 'info');

    try {
      if (!window.Capacitor?.Plugins?.PushNotifications) {
        throw new Error('Plugin לא זמין');
      }

      const { PushNotifications } = window.Capacitor.Plugins;

      const tokenPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout'));
        }, 10000);

        const subOk = PushNotifications.addListener('registration', (token) => {
          clearTimeout(timeout);
          addLog(`✅ Token: ${token.value.substring(0, 20)}...`, 'success');
          subOk.remove();
          subErr?.remove();
          resolve(token.value);
        });

        const subErr = PushNotifications.addListener('registrationError', (err) => {
          clearTimeout(timeout);
          addLog(`❌ Error: ${err.error || err}`, 'error');
          subOk.remove();
          subErr.remove();
          reject(new Error(err.error || 'Registration error'));
        });
      });

      addLog('📡 Calling register()...', 'info');
      await PushNotifications.register();

      const token = await tokenPromise;
      
      setStatus(prev => ({ ...prev, token, loading: false }));

      if (user?.id && token) {
        addLog('💾 Saving to InstaBack...', 'info');
        const { registerFcmToken } = await import('@/components/instabackService');
        await registerFcmToken({ userId: user.id, token });
        addLog('✅ Saved successfully!', 'success');
      }

    } catch (error) {
      addLog(`❌ Error: ${error.message}`, 'error');
      setStatus(prev => ({ ...prev, loading: false, error: error.message }));
    }
  };

  const getStatusIcon = (value) => {
    if (value === null) return <AlertCircle className="w-4 h-4 text-gray-400" />;
    if (value === true || value === 'granted') return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    return <XCircle className="w-4 h-4 text-red-500" />;
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          בדיקת התראות Push
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* סטטוס */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium">סביבת Capacitor</span>
            <div className="flex items-center gap-2">
              {getStatusIcon(status.isNative)}
              <Badge variant={status.isNative ? "default" : "secondary"}>
                {status.isNative ? 'Native' : 'Web'}
              </Badge>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium">Plugin זמין</span>
            <div className="flex items-center gap-2">
              {getStatusIcon(status.hasPlugin)}
              <Badge variant={status.hasPlugin ? "default" : "destructive"}>
                {status.hasPlugin ? 'כן' : 'לא'}
              </Badge>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium">הרשאה</span>
            <div className="flex items-center gap-2">
              {getStatusIcon(status.permission === 'granted')}
              <Badge variant={status.permission === 'granted' ? "default" : "secondary"}>
                {status.permission || 'לא נבדק'}
              </Badge>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium">Token</span>
            <div className="flex items-center gap-2">
              {getStatusIcon(!!status.token)}
              <Badge variant={status.token ? "default" : "secondary"}>
                {status.token ? 'קיים' : 'אין'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Token מלא */}
        {status.token && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-xs font-medium text-green-800 mb-1">FCM Token:</p>
            <p className="text-xs font-mono text-green-700 break-all">{status.token}</p>
          </div>
        )}

        {/* שגיאה */}
        {status.error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm font-medium text-red-800">{status.error}</p>
          </div>
        )}

        {/* כפתורים */}
        <div className="flex gap-2 flex-wrap">
          <Button 
            onClick={checkPermissions} 
            disabled={!status.hasPlugin || status.loading}
            variant="outline"
            size="sm"
          >
            {status.loading && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
            בדוק הרשאות
          </Button>

          <Button 
            onClick={requestPermissions} 
            disabled={!status.hasPlugin || status.loading}
            variant="outline"
            size="sm"
          >
            {status.loading && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
            בקש הרשאות
          </Button>

          <Button 
            onClick={registerForPush} 
            disabled={!status.hasPlugin || status.loading || status.permission !== 'granted'}
            size="sm"
          >
            {status.loading && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
            רשום להתראות
          </Button>

          <Button 
            onClick={() => setStatus(prev => ({ ...prev, logs: [] }))} 
            variant="ghost"
            size="sm"
          >
            נקה לוגים
          </Button>
        </div>

        {/* לוגים */}
        <div className="border rounded-lg p-3 bg-gray-900 text-gray-100 max-h-64 overflow-y-auto">
          <p className="text-xs font-bold mb-2 text-gray-400">--- LOGS ---</p>
          {status.logs.length === 0 ? (
            <p className="text-xs text-gray-500">אין לוגים</p>
          ) : (
            <div className="space-y-1">
              {status.logs.map((log, idx) => (
                <div key={idx} className="text-xs flex gap-2">
                  <span className="text-gray-500">[{log.time}]</span>
                  <span className={
                    log.type === 'error' ? 'text-red-400' :
                    log.type === 'success' ? 'text-green-400' :
                    log.type === 'warning' ? 'text-yellow-400' :
                    'text-gray-300'
                  }>
                    {log.message}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}


import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import AppLogo from '@/components/common/AppLogo';
import { createPageUrl } from '@/utils';

export default function ResetPasswordPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // This page is deprecated. Redirect users to the ForgotPassword page after a short delay.
    const timer = setTimeout(() => {
      navigate(createPageUrl('ForgotPassword'), { replace: true });
    }, 5000); // Redirect after 5 seconds

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-rose-50 flex items-center justify-center p-4" style={{ direction: 'rtl' }}>
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="flex justify-center">
          <AppLogo size="lg" />
        </div>

        {/* Card */}
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold text-gray-900">
              דף איפוס סיסמה הועבר
            </CardTitle>
            <CardDescription className="text-gray-600">
              הדף הזה אינו בשימוש עוד.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Alert variant="warning">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>שימו לב!</AlertTitle>
              <AlertDescription>
                <p className="mb-2">
                  דף איפוס הסיסמה הישן הוסר.
                </p>
                <p className="mb-2">
                  כל תהליך איפוס הסיסמה וההזנה הראשונית של סיסמה חדשה (כמו אחרי הזמנה חדשה) מתבצע כעת בדף "שכחתי סיסמה".
                </p>
                <p>
                  אתה מועבר אוטומטית לדף המעודכן...
                </p>
              </AlertDescription>
            </Alert>
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => navigate(createPageUrl('ForgotPassword'), { replace: true })}
                className="text-sm text-orange-600 hover:text-orange-700 hover:underline"
              >
                לחץ כאן אם אינך מועבר אוטומטית
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-sm text-gray-600">
          צריך עזרה? צור קשר עם התמיכה
        </p>
      </div>
    </div>
  );
}

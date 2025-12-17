import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/components/AuthProvider';
import AppLogo from '@/components/common/AppLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import InstaGoogleLogin from "@/components/auth/InstaGoogleLogin";
import InstaAppleLogin from "@/components/auth/InstaAppleLogin";

export default function AuthPage() {
  const navigate = useNavigate();
  const { login, register, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '', firstName: '', lastName: '' });

  // ✅ Redirect authenticated users - פעם אחת בלבד!
  useEffect(() => {
    if (isAuthenticated) {
      let pendingId = null;
      try { 
        pendingId = localStorage.getItem('pendingEventJoin'); 
      } catch (e) {
        console.error("Failed to read from localStorage:", e);
      }
      
      if (pendingId) {
        navigate(createPageUrl(`JoinEvent?id=${pendingId}`), { replace: true });
      } else {
        navigate(createPageUrl('Home'), { replace: true });
      }
    }
  }, [isAuthenticated, navigate]);

  const handleLoginSuccess = async (loggedInUser) => {
    console.log('[Auth] Login successful:', loggedInUser);

    // ✅ הסרת כל הקריאות המיותרות ל-OneSignal מכאן
    // OneSignal מטופל כבר ב-AuthProvider אחרי login/register
    
    toast({ title: 'התחברת בהצלחה! 🎉' });

    // Navigate
    let pendingId = null;
    try {
      pendingId = localStorage.getItem('pendingEventJoin');
    } catch (e) {
      console.error("Failed to read from localStorage:", e);
    }

    if (pendingId) {
      navigate(createPageUrl(`JoinEvent?id=${pendingId}`), { replace: true });
    } else {
      navigate(createPageUrl('Home'), { replace: true });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!login || !register) return;

    if (!isLogin) {
      if (!form.password || !form.confirmPassword) {
        toast({ title: 'סיסמא נדרשת', description: 'נא למלא סיסמא ואימות סיסמא', variant: 'destructive' });
        return;
      }
      if (form.password !== form.confirmPassword) {
        toast({ title: 'אי התאמה בסיסמאות', description: 'הסיסמא ואימות הסיסמא אינן תואמות', variant: 'destructive' });
        return;
      }
    }

    setIsLoading(true);
    let loggedInUser = null;

    try {
      if (isLogin) {
        loggedInUser = await login(form.email, form.password);
      } else {
        await register({
          email: form.email,
          password: form.password,
          firstName: form.firstName,
          lastName: form.lastName,
        });
        loggedInUser = await login(form.email, form.password);
      }

      if (loggedInUser) {
        await handleLoginSuccess(loggedInUser);
      } else {
        toast({ title: isLogin ? 'התחברת בהצלחה! 🎉' : 'נרשמת והתחברת בהצלחה! 🎉' });
        let pendingId = null;
        try { pendingId = localStorage.getItem('pendingEventJoin'); } catch (e) {
          console.error("Failed to read from localStorage:", e);
        }
        if (pendingId) {
          navigate(createPageUrl(`JoinEvent?id=${pendingId}`), { replace: true });
        } else {
          navigate(createPageUrl('Home'), { replace: true });
        }
      }
    } catch (err) {
      toast({ title: 'שגיאה', description: err.message || 'אירעה שגיאה', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-rose-50 flex items-center justify-center p-4" style={{ direction: 'rtl' }}>
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <AppLogo size={120} />
        </div>

        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-4">
            <h1 className="text-2xl font-bold text-gray-900">ברוך הבא ל-Planora</h1>
            <p className="text-sm text-gray-500 mt-1">התחבר או הירשם כדי להתחיל</p>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Social Logins */}
            <div className="space-y-3">
              <InstaGoogleLogin />
              <InstaAppleLogin />
            </div>

            {/* Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">או</span>
              </div>
            </div>

            {/* Form - מתחת ל-Google */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="firstName">שם פרטי</Label>
                    <Input id="firstName" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="lastName">שם משפחה</Label>
                    <Input id="lastName" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="email">מייל</Label>
                <Input id="email" type="email" dir="ltr" className="text-left"
                       value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>

              <div>
                <Label htmlFor="password">סיסמא</Label>
                <Input id="password" type="password" dir="ltr" className="text-left"
                       value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
              </div>

              {!isLogin && (
                <div>
                  <Label htmlFor="confirmPassword">אימות סיסמא</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    dir="ltr"
                    className="text-left"
                    value={form.confirmPassword}
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                    required={!isLogin}
                  />
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    {isLogin ? 'מתחבר...' : 'נרשם...'}
                  </>
                ) : (
                  <>
                    <ArrowRight className="ml-2 h-4 w-4" />
                    {isLogin ? 'התחבר' : 'הירשם'}
                  </>
                )}
              </Button>

              {/* קישור לשכחת סיסמה */}
              {isLogin && (
                <div className="text-center">
                  <Link
                    to={createPageUrl('ForgotPassword')}
                    className="text-sm text-orange-600 hover:text-orange-700 hover:underline"
                  >
                    שכחת סיסמה?
                  </Link>
                </div>
              )}
            </form>

            <div className="text-center mt-4">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                {isLogin ? (
                  <>
                    עדיין אין לך חשבון?{' '}
                    <span className="text-orange-600 font-semibold hover:underline">
                      הירשם כאן
                    </span>
                  </>
                ) : (
                  <>
                    כבר יש לך חשבון?{' '}
                    <span className="text-orange-600 font-semibold hover:underline">
                      התחבר כאן
                    </span>
                  </>
                )}
              </button>
            </div>
          </CardContent>

          <CardFooter className="text-center text-xs text-gray-500 flex flex-col gap-1">
            <span>
              בהתחברות, הנך מאשר/ת את{' '}
              <Link to={createPageUrl('Terms')} className="text-orange-600 hover:underline">תנאי השימוש</Link>
              {' '}ו-{' '}
              <Link to={createPageUrl('Privacy')} className="text-orange-600 hover:underline">מדיניות הפרטיות</Link>.
            </span>
            <span>
              לשאלות:{' '}
              <a href="mailto:planora.net@gmail.com" className="text-orange-600 hover:underline">
                planora.net@gmail.com
              </a>
            </span>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
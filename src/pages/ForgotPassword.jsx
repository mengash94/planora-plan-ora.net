
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Mail, Loader2, CheckCircle2, Lock } from 'lucide-react';
import { requestPasswordReset, resetPassword } from '@/components/instabackService';
import AppLogo from '@/components/common/AppLogo';
import { createPageUrl } from '@/utils';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  
  // Step 1: Request code
  const [email, setEmail] = useState('');
  const [isLoadingRequest, setIsLoadingRequest] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  
  // ✅ שמירת resetToken שמתקבל מהשרת
  const [resetToken, setResetToken] = useState('');
  
  // Step 2: Reset with code
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoadingReset, setIsLoadingReset] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  // Step 1: Request verification code
  const handleRequestCode = async (e) => {
    e.preventDefault();
    setRequestError('');

    if (!email.trim()) {
      setRequestError('נא להזין כתובת אימייל');
      return;
    }

    if (!email.includes('@')) {
      setRequestError('נא להזין כתובת אימייל תקינה');
      return;
    }

    setIsLoadingRequest(true);

    try {
      // ✅ קבלת resetToken מהשרת
      const result = await requestPasswordReset(email);
      
      console.log('[ForgotPassword] raw result:', result);

// ננסה לקחת גם מ-result וגם מ-result.data למקרה של Axios
const serverToken =
  result?.resetToken ||
  result?.token ||
  result?.data?.resetToken ||
  result?.data?.token;

console.log('[ForgotPassword] Got resetToken?', !!serverToken);

if (serverToken) {
  setResetToken(serverToken);
} else {
  setRequestError('לא התקבל reset token מהשרת');
}
      setCodeSent(true);
    } catch (err) {
      console.error('Error requesting password reset:', err);
      setRequestError(err.message || 'שגיאה בשליחת קוד אימות');
    } finally {
      setIsLoadingRequest(false);
    }
  };

  // Step 2: Reset password with code
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetError('');

    // וידוא שהקוד לא ריק
    const trimmedCode = verificationCode.trim();
    
    console.log('[ForgotPassword] Reset attempt:', {
      email,
      verificationCode: trimmedCode,
      hasCode: !!trimmedCode,
      codeLength: trimmedCode.length,
      hasResetToken: !!resetToken
    });

    if (!trimmedCode) {
      setResetError('נא להזין את קוד האימות');
      return;
    }

    if (!newPassword.trim()) {
      setResetError('נא להזין סיסמה חדשה');
      return;
    }

    if (newPassword.length < 6) {
      setResetError('הסיסמה חייבת להכיל לפחות 6 תווים');
      return;
    }

    if (newPassword !== confirmPassword) {
      setResetError('הסיסמאות אינן תואמות');
      return;
    }

    // ✅ וידוא שיש לנו resetToken
    if (!resetToken) {
      setResetError('שגיאה: חסר מזהה איפוס. נסה לבקש קוד חדש.');
      return;
    }

    setIsLoadingReset(true);

    try {
      // ✅ שליחת הבקשה עם resetToken
      console.log('[ForgotPassword] Calling resetPassword with resetToken');
      
      await resetPassword(email, trimmedCode, newPassword, resetToken);
      
      console.log('[ForgotPassword] Password reset successful!');
      setResetSuccess(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate(createPageUrl('Auth'));
      }, 3000);
    } catch (err) {
      console.error('[ForgotPassword] Reset error:', err);
      setResetError(err.message || 'שגיאה באיפוס הסיסמה. אולי הקוד שגוי או פג תוקף?');
    } finally {
      setIsLoadingReset(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-rose-50 flex items-center justify-center p-4" style={{ direction: 'rtl' }}>
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="flex justify-center">
          <AppLogo size={120} />
        </div>

        {/* Card */}
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold text-gray-900">
              {!codeSent ? 'שכחת סיסמה?' : 'איפוס סיסמה'}
            </CardTitle>
            <CardDescription className="text-gray-600">
              {!codeSent 
                ? 'נשלח לך קוד אימות למייל' 
                : 'הזן את הקוד שקיבלת במייל'
              }
            </CardDescription>
          </CardHeader>

          <CardContent>
            {resetSuccess ? (
              // Success state
              <div className="space-y-4">
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <p className="font-semibold mb-1">הסיסמה שונתה בהצלחה!</p>
                    <p className="text-sm">
                      מעביר אותך לדף ההתחברות...
                    </p>
                  </AlertDescription>
                </Alert>

                <Button
                  onClick={() => navigate(createPageUrl('Auth'))}
                  className="w-full bg-orange-500 hover:bg-orange-600"
                >
                  המשך להתחברות
                </Button>
              </div>
            ) : !codeSent ? (
              // Step 1: Request code
              <form onSubmit={handleRequestCode} className="space-y-4">
                {requestError && (
                  <Alert variant="destructive">
                    <AlertDescription>{requestError}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    כתובת אימייל
                  </label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoadingRequest}
                      className="pr-10"
                      dir="ltr"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoadingRequest}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                >
                  {isLoadingRequest ? (
                    <>
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      שולח...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="ml-2 h-4 w-4" />
                      שלח קוד אימות
                    </>
                  )}
                </Button>

                <div className="text-center">
                  <Link
                    to={createPageUrl('Auth')}
                    className="text-sm text-orange-600 hover:text-orange-700 hover:underline"
                  >
                    חזרה להתחברות
                  </Link>
                </div>
              </form>
            ) : (
              // Step 2: Reset with code
              <div className="space-y-4">
                <Alert className="bg-blue-50 border-blue-200">
                  <Mail className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    <p className="text-sm">
                      שלחנו קוד אימות לכתובת <strong>{email}</strong>
                    </p>
                    <p className="text-sm mt-1">
                      בדוק את תיבת המייל שלך (כולל תיקיית ספאם)
                    </p>
                  </AlertDescription>
                </Alert>

                <form onSubmit={handleResetPassword} className="space-y-4">
                  {resetError && (
                    <Alert variant="destructive">
                      <AlertDescription>{resetError}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      קוד אימות
                    </label>
                    <Input
                      type="text"
                      placeholder="הזן את הקוד שקיבלת במייל"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      disabled={isLoadingReset}
                      className="text-center text-lg tracking-widest"
                      maxLength={6}
                      autoComplete="off"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      סיסמה חדשה
                    </label>
                    <div className="relative">
                      <Lock className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
                      <Input
                        type="password"
                        placeholder="לפחות 6 תווים"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        disabled={isLoadingReset}
                        className="pr-10"
                        autoComplete="new-password"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      אימות סיסמה
                    </label>
                    <div className="relative">
                      <Lock className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
                      <Input
                        type="password"
                        placeholder="הזן את הסיסמה שוב"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={isLoadingReset}
                        className="pr-10"
                        autoComplete="new-password"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoadingReset}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    {isLoadingReset ? (
                      <>
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                        מאפס סיסמה...
                      </>
                    ) : (
                      <>
                        <Lock className="ml-2 h-4 w-4" />
                        אפס סיסמה
                      </>
                    )}
                  </Button>

                  <div className="flex justify-between text-sm">
                    <button
                      type="button"
                      onClick={() => {
                        setCodeSent(false);
                        setVerificationCode('');
                        setNewPassword('');
                        setConfirmPassword('');
                        setResetError('');
                        setResetToken(''); // Clear reset token if going back
                      }}
                      className="text-orange-600 hover:text-orange-700 hover:underline"
                    >
                      לא קיבלתי קוד
                    </button>
                    <Link
                      to={createPageUrl('Auth')}
                      className="text-gray-600 hover:text-gray-800 hover:underline"
                    >
                      חזרה להתחברות
                    </Link>
                  </div>
                </form>
              </div>
            )}
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

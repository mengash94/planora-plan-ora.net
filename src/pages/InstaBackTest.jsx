
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

// The API Base URL for your new backend - Corrected to remove '/api' suffix
const API_BASE_URL = 'https://instaback.ai/project/f78de3ce-0cab-4ccb-8442-0c5749792fe8';

export default function InstaBackTestPage() {
  const { toast } = useToast();

  // State for login credentials
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // State for registration
  const [registerFirstName, setRegisterFirstName] = useState('');
  const [registerLastName, setRegisterLastName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');

  // State for API interaction
  const [accessToken, setAccessToken] = useState(localStorage.getItem('instaback_token') || null);
  const [currentUser, setCurrentUser] = useState(null);
  const [apiResponse, setApiResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // State for creating a new event
  const [newEventTitle, setNewEventTitle] = useState('');

  const handleLogin = async () => {
    setIsLoading(true);
    setApiResponse(null);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'accept': 'application/json' // Added accept header as per Swagger
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.headers.get('content-type')?.includes('html')) {
          throw new Error('השרת החזיר HTML במקום JSON. ייתכן שכתובת ה-API שגויה.');
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `שגיאה ${response.status}`);
      }

      // Updated to look for "token" instead of "accessToken"
      if (data.token) {
        setAccessToken(data.token);
        localStorage.setItem('instaback_token', data.token); // Persist for easier testing
        // The user object might be nested, e.g., in data.user
        const user = data.user || data; 
        setCurrentUser(user);
        toast({ title: "התחברות הצליחה!", description: "טוקן התקבל ונשמר." });
        setApiResponse({ success: true, token: data.token, user });
      } else {
        throw new Error("token לא נמצא בתגובה");
      }
    } catch (error) {
      console.error('Login failed:', error);
      toast({ title: "שגיאה בהתחברות", description: error.message, variant: 'destructive' });
      setApiResponse({ success: false, error: error.message });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRegister = async () => {
    setIsLoading(true);
    setApiResponse(null);
    try {
        // THE FIX: Using the correct /auth/register endpoint
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'accept': 'application/json'
            },
            body: JSON.stringify({
                firstName: registerFirstName,
                lastName: registerLastName,
                email: registerEmail,
                password: registerPassword,
                username: registerEmail // Using email as username for simplicity
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            // More detailed error from InstaBack
            const errorDetail = data.issues?.[0]?.message || data.message || `שגיאה ${response.status}`;
            throw new Error(errorDetail);
        }

        toast({ title: "ההרשמה הצליחה!", description: "כעת ניתן להתחבר עם המשתמש החדש." });
        setApiResponse(data);
        // Clear registration form
        setRegisterFirstName('');
        setRegisterLastName('');
        setRegisterEmail('');
        setRegisterPassword('');

    } catch (error) {
        console.error('Registration failed:', error);
        toast({ title: "שגיאה בהרשמה", description: error.message, variant: 'destructive' });
        setApiResponse({ success: false, error: error.message });
    } finally {
        setIsLoading(false);
    }
  };

  const handleLogout = () => {
      setAccessToken(null);
      setCurrentUser(null);
      localStorage.removeItem('instaback_token');
      toast({ title: "התנתקת בהצלחה" });
  };

  const performApiCall = async (endpoint, method, body = null, params = null) => {
    if (!accessToken) {
      toast({ title: "שגיאה", description: "נדרש להתחבר תחילה (אין טוקן)", variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    setApiResponse(null);
    try {
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'accept': 'application/json'
        },
      };
      if (body) {
        options.body = JSON.stringify(body);
      }

      // **THE FIX**: Add support for URL query parameters
      let fullUrl = `${API_BASE_URL}/api${endpoint}`;
      if (params) {
        const queryParams = new URLSearchParams(params).toString();
        fullUrl += `?${queryParams}`;
      }
      
      const response = await fetch(fullUrl, options);

      if (response.headers.get('content-type')?.includes('html')) {
          throw new Error(`השרת החזיר HTML במקום JSON. ודא שהנתיב ${endpoint} נכון. (נסיון לכתובת: ${fullUrl})`);
      }
      
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `שגיאה ${response.status}`);
      }
      
      setApiResponse(data);
      toast({ title: "הקריאה הצליחה!", description: `${method} ${endpoint}` });

      // UI Improvement: Clear newEventTitle after successful creation
      if (method === 'POST' && endpoint === '/Event') {
        setNewEventTitle('');
      }

    } catch (error) {
      console.error(`API call to ${endpoint} failed:`, error);
      toast({ title: `שגיאה בקריאה ל-${endpoint}`, description: error.message, variant: 'destructive' });
      setApiResponse({ success: false, error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8" style={{ direction: 'rtl' }}>
      <header>
        <h1 className="text-3xl font-bold">דף בדיקת חיבור ל-InstaBack.ai</h1>
        <p className="text-gray-600 mt-2">
          דף זה משמש לבדיקת קריאות API מול ה-Backend החדש.
        </p>
      </header>

      {!accessToken ? (
        <div className="grid md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>1. התחברות</CardTitle>
                <CardDescription>התחבר עם משתמש קיים</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="email">אימייל</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="test@example.com" />
                </div>
                <div>
                  <Label htmlFor="password">סיסמה</Label>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button onClick={handleLogin} disabled={isLoading} className="w-full">
                  {isLoading && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                  התחבר
                </Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>2. הרשמה</CardTitle>
                <CardDescription>צור משתמש חדש במערכת</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className='flex gap-2'>
                    <div className='flex-grow'>
                      <Label htmlFor="registerFirstName">שם פרטי</Label>
                      <Input id="registerFirstName" value={registerFirstName} onChange={(e) => setRegisterFirstName(e.target.value)} />
                    </div>
                    <div className='flex-grow'>
                      <Label htmlFor="registerLastName">שם משפחה</Label>
                      <Input id="registerLastName" value={registerLastName} onChange={(e) => setRegisterLastName(e.target.value)} />
                    </div>
                </div>
                <div>
                  <Label htmlFor="registerEmail">אימייל</Label>
                  <Input id="registerEmail" type="email" value={registerEmail} onChange={(e) => setRegisterEmail(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="registerPassword">סיסמה</Label>
                  <Input id="registerPassword" type="password" value={registerPassword} onChange={(e) => setRegisterPassword(e.target.value)} />
                </div>
                <Button onClick={handleRegister} disabled={isLoading} className="w-full" variant="secondary">
                  {isLoading && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                  הירשם
                </Button>
              </CardContent>
            </Card>
        </div>
      ) : (
        <Card>
            <CardHeader>
                <CardTitle>מחובר בהצלחה!</CardTitle>
                <CardDescription>
                    אתה מחובר כ- {currentUser?.email || 'משתמש'}. כעת ניתן לבצע קריאות API.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Button onClick={handleLogout} variant="outline" className="w-full">
                  התנתק
                </Button>
            </CardContent>
        </Card>
      )}

      {accessToken && (
        <Card>
          <CardHeader>
            <CardTitle>3. בדיקת קריאות API (Events)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => performApiCall('/Event', 'GET', null, { ownerId: currentUser?.id })} disabled={isLoading || !currentUser?.id} variant="outline" className="w-full">
              {isLoading && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
              קבל את האירועים שלי (GET /Event?ownerId=...)
            </Button>
            <div className="flex gap-2 items-end">
              <div className="flex-grow">
                <Label htmlFor="newEventTitle">שם אירוע חדש</Label>
                <Input id="newEventTitle" value={newEventTitle} onChange={(e) => setNewEventTitle(e.target.value)} placeholder="לדוגמה: יום הולדת ליוסי" />
              </div>
              <Button onClick={() => performApiCall('/Event', 'POST', { title: newEventTitle, ownerId: currentUser?.id })} disabled={isLoading || !newEventTitle || !currentUser?.id}>
                {isLoading && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                צור אירוע (POST /Event)
              </Button>
            </div>
            {!currentUser?.id && <p className="text-xs text-red-500">לא זוהה מזהה משתמש (ownerId) לאחר ההתחברות. לא ניתן לבצע פעולות.</p>}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>4. תשובת ה-API</CardTitle>
        </CardHeader>
        <CardContent className="bg-gray-900 text-white rounded-lg p-4" style={{ direction: 'ltr', textAlign: 'left' }}>
          <pre className="text-sm whitespace-pre-wrap">
            {apiResponse ? JSON.stringify(apiResponse, null, 2) : 'כאן תוצג התשובה מהשרת...'}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}

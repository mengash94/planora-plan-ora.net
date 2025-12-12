import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Settings, LogOut, Trash2, Shield, AlertTriangle, Moon, Sun } from 'lucide-react';
import { instabackLogout } from '@/components/instabackService';
import { useNavigate } from 'react-router-dom';
import { isNativeCapacitor } from '@/components/onesignalService';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from 'sonner';

export default function AppSettings({ user, onDeleteAccount }) {
    const navigate = useNavigate();
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const isNative = isNativeCapacitor();
    const [isDarkMode, setIsDarkMode] = useState(() => {
        if (typeof window === 'undefined') return false;
        return document.documentElement.classList.contains('dark');
    });

    React.useEffect(() => {
        if (typeof window === 'undefined') return;
        
        const checkDarkMode = () => {
            setIsDarkMode(document.documentElement.classList.contains('dark'));
        };
        
        const observer = new MutationObserver(checkDarkMode);
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class']
        });
        
        return () => observer.disconnect();
    }, []);

    const toggleDarkMode = () => {
        if (!isNative && typeof window !== 'undefined' && window.toggleDarkMode) {
            window.toggleDarkMode();
        }
    };

    const handleLogout = () => {
        instabackLogout();
        toast.success('התנתקת בהצלחה');
        navigate('/');
        window.location.reload();
    };

    const handleDeleteAccount = async () => {
        if (deleteConfirmText !== 'מחק') {
            toast.error('נא להקליד "מחק" לאישור');
            return;
        }

        try {
            await onDeleteAccount();
            setShowDeleteDialog(false);
        } catch (error) {
            console.error('Failed to delete account:', error);
        }
    };

    return (
        <div className="space-y-6">
            {!isNative && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            {isDarkMode ? <Moon className="w-6 h-6 text-orange-500" /> : <Sun className="w-6 h-6 text-orange-500" />}
                            מצב תצוגה
                        </CardTitle>
                        <CardDescription>בחר בין מצב בהיר לכהה</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div>
                                <p className="font-medium text-gray-900 dark:text-gray-100">מצב כהה</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {isDarkMode ? 'מצב כהה פעיל' : 'מצב בהיר פעיל'}
                                </p>
                            </div>
                            <Button
                                onClick={toggleDarkMode}
                                variant="outline"
                                className="flex items-center gap-2"
                            >
                                {isDarkMode ? (
                                    <>
                                        <Sun className="w-4 h-4" />
                                        מצב בהיר
                                    </>
                                ) : (
                                    <>
                                        <Moon className="w-4 h-4" />
                                        מצב כהה
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
            
            {isNative && (
                <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                    <CardContent className="py-4">
                        <div className="flex items-start gap-3">
                            <Moon className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                            <div>
                                <p className="font-medium text-blue-900 dark:text-blue-100">מצב תצוגה נקבע אוטומטית</p>
                                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                                    באפליקציה נייטיבית, מצב התצוגה מסתנכרן עם הגדרות המכשיר שלך
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
            
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Settings className="w-6 h-6 text-orange-500" />
                        הגדרות כלליות
                    </CardTitle>
                    <CardDescription>נהל את החשבון והגדרות האפליקציה שלך</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                                <Shield className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="font-medium text-gray-900 dark:text-gray-100">חשבון מאומת</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">שפת האפליקציה</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">עברית</p>
                        </div>
                        <Button variant="outline" size="sm" disabled>
                            ברירת מחדל
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <LogOut className="w-6 h-6 text-gray-600" />
                        התנתקות
                    </CardTitle>
                    <CardDescription>התנתק מהחשבון שלך</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button
                        onClick={handleLogout}
                        variant="outline"
                        className="w-full"
                    >
                        <LogOut className="w-4 h-4 ml-2" />
                        התנתק
                    </Button>
                </CardContent>
            </Card>

            <Card className="border-red-200">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-600">
                        <AlertTriangle className="w-6 h-6" />
                        אזור מסוכן
                    </CardTitle>
                    <CardDescription>פעולות בלתי הפיכות - היזהר!</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-800 mb-3">
                            <strong>מחיקת חשבון:</strong> פעולה זו תמחק לצמיתות את כל הנתונים שלך:
                        </p>
                        <ul className="mr-4 text-sm text-red-700 list-disc space-y-1">
                            <li>פרטי החשבון האישי שלך</li>
                            <li>כל האירועים שיצרת</li>
                            <li>המשימות והצ'אטים שלך</li>
                            <li>כל הנתונים הקשורים אליך</li>
                        </ul>
                    </div>

                    <Button
                        onClick={() => setShowDeleteDialog(true)}
                        variant="destructive"
                        className="w-full"
                    >
                        <Trash2 className="w-4 h-4 ml-2" />
                        מחק את החשבון שלי
                    </Button>
                </CardContent>
            </Card>

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-red-600">האם אתה בטוח?</AlertDialogTitle>
                        <AlertDialogDescription className="space-y-4">
                            <p>פעולה זו תמחק לצמיתות את החשבון שלך וכל הנתונים הקשורים אליו.</p>
                            <p className="font-semibold">זוהי פעולה בלתי הפיכה!</p>
                            <div className="mt-4">
                                <label className="block text-sm font-medium mb-2">
                                    הקלד "מחק" לאישור:
                                </label>
                                <input
                                    type="text"
                                    value={deleteConfirmText}
                                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    placeholder="מחק"
                                />
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => {
                            setDeleteConfirmText('');
                            setShowDeleteDialog(false);
                        }}>
                            ביטול
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteAccount}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={deleteConfirmText !== 'מחק'}
                        >
                            מחק את החשבון
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
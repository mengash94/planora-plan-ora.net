import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '@/entities/User';
import { Announcement } from '@/entities/Announcement';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Edit, Trash2, ArrowRight } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function AdminAnnouncementsPage() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [announcements, setAnnouncements] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingAnnouncement, setEditingAnnouncement] = useState(null);

    useEffect(() => {
        const checkUserAndLoadData = async () => {
            try {
                const currentUser = await User.me();
                if (currentUser.role !== 'admin') {
                    navigate(createPageUrl('Home'));
                    return;
                }
                setUser(currentUser);
                await fetchAnnouncements();
            } catch (e) {
                navigate(createPageUrl('Home'));
            }
            setIsLoading(false);
        };
        checkUserAndLoadData();
    }, [navigate]);

    const fetchAnnouncements = async () => {
        const data = await Announcement.list('-created_date');
        setAnnouncements(data);
    };

    const handleEdit = (announcement) => {
        setEditingAnnouncement(announcement);
        setIsDialogOpen(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('האם אתה בטוח שברצונך למחוק הכרזה זו?')) {
            await Announcement.delete(id);
            await fetchAnnouncements();
        }
    };
    
    const handleOpenDialog = (announcement = null) => {
        setEditingAnnouncement(announcement);
        setIsDialogOpen(true);
    };

    const handleSubmit = async (formData) => {
        if (editingAnnouncement) {
            await Announcement.update(editingAnnouncement.id, formData);
        } else {
            await Announcement.create(formData);
        }
        await fetchAnnouncements();
        setIsDialogOpen(false);
        setEditingAnnouncement(null);
    };

    const createWelcomeMessage = async () => {
        try {
            const result = await Announcement.create({
                title: "🎉 ברוכים הבאים ל-PlanOra!",
                content: `## 👋 שלום וברוך הבא!

אנחנו שמחים שהצטרפת לקהילת PlanOra - האפליקציה הטובה ביותר לתכנון אירועים!

---

## 🏠 **מסך הבית**
המקום המרכזי שלך! כאן תראה:
- את האירועים האחרונים שלך
- כפתור ליצירת אירוע חדש
- כפתור שיתוף (ירוק) להזמנת חברים

---

## ✨ **יצירת אירוע**
שתי אפשרויות נהדרות:
- **תבניות מוכנות**: יום הולדת, חתונה, טיולים ועוד
- **יצירה חכמה עם AI**: רק תכתוב מה אתה רוצה והAI יכין הכל!

---

## 📅 **האירועים שלי**
כל האירועים שלך במקום אחד:
- אירועים שיצרת (סמל בעלים)
- אירועים שהוזמנת אליהם
- אפשרות סינון לפי סוג

---

## 🎯 **פרטי אירוע**
עמוד מלא של כלים לכל אירוע:

### 📝 **משימות**
- רשימת דברים לעשות
- ניתן להקצות לאנשים ולסמן כבוצע

### 💬 **צ'אט**
- דברו עם כל המשתתפים באירוע
- שתפו תמונות ורעיונות

### 📊 **הצבעות על תאריכים**
- תנו לכולם להצביע על התאריך הכי נוח
- נוח לתיאום עם הרבה אנשים

### 🗓️ **לוח זמנים**
- תכננו את סדר היום של האירוע
- הוסיפו שעות ומיקומים

### 📸 **גלריה**
- העלו תמונות מהאירוע
- כל המשתתפים יכולים לראות ולהוסיף

### 👥 **משתתפים**
- הזמינו חברים בוואטסאפ או SMS
- ראו מי כבר הצטרף

### 🔗 **קישורים שימושיים**
- שמרו מקומות, מסעדות או כל קישור חשוב
- הכל מאורגן במקום אחד

### 👨‍💼 **אנשי מקצוע**
- שמרו פרטי ספקים: צלמים, קייטרינג וכו'
- כולל מחירים וסטטוס

---

## ✅ **המשימות שלי**
כל המשימות שלך מכל האירועים:
- מחולק לפי אירועים
- סימון משימות שבוצעו

---

## 💬 **צ'אטים**
רשימת כל הצ'אטים שלך:
- סימון של הודעות חדשות
- מעבר מהיר לכל שיחה

---

## 👤 **פרופיל**
הגדרות אישיות:
- עדכון פרטים אישיים
- תמונת פרופיל
- יציאה מהמערכת

---

## 🚀 **איך מתחילים?**

1. **לחצו על הכפתור הכתום "צור אירוע חדש"**
2. **בחרו תבנית או השתמשו ב-AI**
3. **מלאו פרטי אירוע ולחצו "יצירת אירוע"**
4. **הזמינו חברים דרך לשונית "משתתפים"**
5. **התחילו לתכנן יחד!**

---

## 💡 **טיפים שימושיים**
- **השתמשו בתבניות** - הן חוסכות זמן רב
- **הזמינו חברים מוקדם** - ככה כולם יכולים לעזור בתכנון
- **השתמשו בצ'אט** - זה הכי טוב לתיאומים מהירים
- **העלו תמונות** - זה הופך את החוויה למיוחדת

---

**יש שאלות? אנחנו כאן בשבילכם! 💚**

**תתחילו לתכנן ותגלו כמה קל וכיפי זה!** 🎉`,
                type: "guide",
                target_audience: "new_users", 
                new_user_days_threshold: 7,
                dismissible_type: "confirm_button",
                start_date: new Date().toISOString(),
                end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
            });
            
            console.log('Created welcome announcement:', result);
            await fetchAnnouncements();
            alert('הודעת ברוכים הבאים נוצרה בהצלחה!');
        } catch (error) {
            console.error('Failed to create welcome message:', error);
            alert('שגיאה ביצירת הודעת הברוכים הבאים: ' + (error.message || error));
        }
    };

    if (isLoading) {
        return <div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;
    }

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl('Profile'))}>
                        <ArrowRight className="w-5 h-5" />
                    </Button>
                    <h1 className="text-3xl font-bold">ניהול הכרזות</h1>
                </div>
            </div>

            <div className="mb-6">
                <div className="flex gap-2">
                    <Button onClick={() => handleOpenDialog()}>
                        <Plus className="w-4 h-4 ml-2" />
                        הכרזה חדשה
                    </Button>
                    <Button variant="outline" onClick={createWelcomeMessage}>
                        ✨ הוסף הודעת ברוכים הבאים
                    </Button>
                </div>
            </div>

            <Card>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>כותרת</TableHead>
                                <TableHead>סוג</TableHead>
                                <TableHead>קהל יעד</TableHead>
                                <TableHead>סטטוס</TableHead>
                                <TableHead>תאריך התחלה</TableHead>
                                <TableHead>תאריך סיום</TableHead>
                                <TableHead>פעולות</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {announcements.map(ann => (
                                <TableRow key={ann.id}>
                                    <TableCell className="font-medium">{ann.title}</TableCell>
                                    <TableCell>{ann.type}</TableCell>
                                    <TableCell>{ann.target_audience}</TableCell>
                                    <TableCell>{new Date(ann.end_date) < new Date() ? 'לא פעיל' : 'פעיל'}</TableCell>
                                    <TableCell>{new Date(ann.start_date).toLocaleDateString('he-IL')}</TableCell>
                                    <TableCell>{new Date(ann.end_date).toLocaleDateString('he-IL')}</TableCell>
                                    <TableCell className="space-x-2">
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(ann)}><Edit className="w-4 h-4" /></Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(ann.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <AnnouncementFormDialog 
                isOpen={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                announcement={editingAnnouncement}
                onSubmit={handleSubmit}
            />
        </div>
    );
}

function AnnouncementFormDialog({ isOpen, onOpenChange, announcement, onSubmit }) {
    const [formData, setFormData] = useState({});

    useEffect(() => {
        if (announcement) {
            setFormData({
                title: announcement.title || '',
                content: announcement.content || '',
                type: announcement.type || 'info',
                start_date: announcement.start_date ? announcement.start_date.split('T')[0] : '',
                end_date: announcement.end_date ? announcement.end_date.split('T')[0] : '',
                target_audience: announcement.target_audience || 'all',
                new_user_days_threshold: announcement.new_user_days_threshold || 3,
                dismissible_type: announcement.dismissible_type || 'x_button',
            });
        } else {
            setFormData({
                title: '',
                content: '',
                type: 'info',
                start_date: new Date().toISOString().split('T')[0],
                end_date: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString().split('T')[0],
                target_audience: 'all',
                new_user_days_threshold: 3,
                dismissible_type: 'x_button',
            });
        }
    }, [announcement, isOpen]);

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));
    };
    
    const handleSelectChange = (id, value) => {
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();
        const dataToSubmit = {
            ...formData,
            start_date: new Date(formData.start_date).toISOString(),
            end_date: new Date(formData.end_date).toISOString(),
            new_user_days_threshold: Number(formData.new_user_days_threshold) || 3,
        };
        onSubmit(dataToSubmit);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{announcement ? 'עריכת הכרזה' : 'הכרזה חדשה'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleFormSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="title">כותרת</Label>
                        <Input id="title" value={formData.title} onChange={handleChange} required />
                    </div>
                    <div>
                        <Label htmlFor="content">תוכן (Markdown)</Label>
                        <Textarea id="content" value={formData.content} onChange={handleChange} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="type">סוג</Label>
                            <Select onValueChange={(v) => handleSelectChange('type', v)} value={formData.type}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="info">מידע (כחול)</SelectItem>
                                    <SelectItem value="success">הצלחה (ירוק)</SelectItem>
                                    <SelectItem value="warning">אזהרה (צהוב)</SelectItem>
                                    <SelectItem value="guide">הדרכה (סגול)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="target_audience">קהל יעד</Label>
                            <Select onValueChange={(v) => handleSelectChange('target_audience', v)} value={formData.target_audience}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">כולם</SelectItem>
                                    <SelectItem value="new_users">משתמשים חדשים</SelectItem>
                                    <SelectItem value="veteran_users">משתמשים ותיקים</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    {formData.target_audience !== 'all' && (
                         <div>
                            <Label htmlFor="new_user_days_threshold">סף ימים להגדרת משתמש (חדש/ותיק)</Label>
                            <Input id="new_user_days_threshold" type="number" value={formData.new_user_days_threshold} onChange={handleChange} />
                        </div>
                    )}
                     <div>
                        <Label htmlFor="dismissible_type">אופן סגירה</Label>
                        <Select onValueChange={(v) => handleSelectChange('dismissible_type', v)} value={formData.dismissible_type}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="x_button">כפתור X</SelectItem>
                                <SelectItem value="confirm_button">כפתור "הבנתי"</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="start_date">תאריך התחלה</Label>
                            <Input id="start_date" type="date" value={formData.start_date} onChange={handleChange} required />
                        </div>
                        <div>
                            <Label htmlFor="end_date">תאריך סיום</Label>
                            <Input id="end_date" type="date" value={formData.end_date} onChange={handleChange} required />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <Button type="submit">{announcement ? 'שמור שינויים' : 'צור הכרזה'}</Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
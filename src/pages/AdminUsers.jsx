import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { 
    listUsers, 
    listAllEventMembers, 
    adminDeleteUserWithReassign,
    createNotificationAndSendPush,
    getUserById 
} from '@/components/instabackService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowRight, Users, Crown, Calendar, MessageSquare, Trash2, Send, BarChart3, AlertTriangle, Bell, Search, Mail } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatIsraelDate } from '@/components/utils/dateHelpers';

export default function AdminUsersPage() {
    const navigate = useNavigate();
    const { user: currentUser, isAuthenticated } = useAuth();
    const [users, setUsers] = useState([]);
    const [eventMembers, setEventMembers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
    const [messageData, setMessageData] = useState({ title: '', content: '', type: 'info' });
    const [isSending, setIsSending] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [bulkMessageOpen, setBulkMessageOpen] = useState(false);
    const [bulkMessage, setBulkMessage] = useState({ title: '', content: '' });
    const [isSendingBulk, setIsSendingBulk] = useState(false);

    useEffect(() => {
        const checkAndLoad = async () => {
            if (!isAuthenticated || !currentUser?.id) {
                navigate(createPageUrl('Home'));
                return;
            }

            try {
                const me = await getUserById(currentUser.id);
                
                // Check roles field (can be string or array)
                const rolesField = me?.roles || me?.role || me?.Role || '';
                let isAdminUser = false;
                
                if (Array.isArray(rolesField)) {
                  isAdminUser = rolesField.some(r => ['admin', 'superadmin', 'owner'].includes(String(r).toLowerCase()));
                } else {
                  const role = String(rolesField).toLowerCase();
                  isAdminUser = role === 'admin' || role === 'superadmin' || role === 'owner';
                }
                
                setIsAdmin(isAdminUser);

                if (!isAdminUser) {
                    setIsLoading(false);
                    return;
                }

                await loadUsers();
            } catch (e) {
                console.error('Error checking admin:', e);
                navigate(createPageUrl('Home'));
            }
            setIsLoading(false);
        };
        checkAndLoad();
    }, [isAuthenticated, currentUser?.id, navigate]);

    const loadUsers = async () => {
        try {
            const [allUsers, allMemberships] = await Promise.all([
                listUsers().catch(() => []),
                listAllEventMembers().catch(() => [])
            ]);

            setUsers(Array.isArray(allUsers) ? allUsers : []);
            setEventMembers(Array.isArray(allMemberships) ? allMemberships : []);
        } catch (error) {
            console.error('Failed to load users:', error);
            toast.error('שגיאה בטעינת משתמשים');
        }
    };

    // חישוב אירועים לכל משתמש
    const eventsByUser = useMemo(() => {
        const map = {};
        (eventMembers || []).forEach(m => {
            const uid = m.userId || m.UserId || m.user_id;
            if (!uid) return;
            map[uid] = (map[uid] || 0) + 1;
        });
        return map;
    }, [eventMembers]);

    // סינון משתמשים
    const filteredUsers = useMemo(() => {
        let result = users;

        // סינון לפי תפקיד
        if (roleFilter === 'admin') {
            result = result.filter(u => {
                const role = (u.role || '').toString().toLowerCase();
                return role === 'admin' || role === 'superadmin' || role === 'owner';
            });
        } else if (roleFilter === 'user') {
            result = result.filter(u => {
                const role = (u.role || '').toString().toLowerCase();
                return role !== 'admin' && role !== 'superadmin' && role !== 'owner';
            });
        }

        // חיפוש
        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase();
            result = result.filter(u => {
                const name = (u.name || u.fullName || `${u.firstName || ''} ${u.lastName || ''}`).toLowerCase();
                const email = (u.email || '').toLowerCase();
                return name.includes(q) || email.includes(q);
            });
        }

        return result;
    }, [users, roleFilter, searchQuery]);

    const openDeleteDialog = (userToDel) => {
        if (userToDel.id === currentUser.id) {
            toast.error('לא ניתן למחוק את חשבון המנהל הנוכחי שלך');
            return;
        }
        setUserToDelete(userToDel);
        setIsDeleteDialogOpen(true);
    };

    const handleDeleteUser = async () => {
        if (!userToDelete) return;

        setIsDeleting(true);
        try {
            const result = await adminDeleteUserWithReassign(userToDelete.id, null);

            toast.success(`המשתמש נמחק! ${result.events_reassigned || 0} אירועים הועברו, ${result.events_cancelled || 0} בוטלו`);

            setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
            setUserToDelete(null);
            setIsDeleteDialogOpen(false);

        } catch (error) {
            console.error('Failed to delete user:', error);
            toast.error(error.message || 'שגיאה במחיקת המשתמש');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSendMessage = async () => {
        if (!selectedUser || !messageData.title.trim() || !messageData.content.trim()) {
            toast.error('יש למלא כותרת ותוכן להודעה');
            return;
        }

        setIsSending(true);
        try {
            await createNotificationAndSendPush({
                userId: selectedUser.id,
                type: 'admin_message',
                title: `📩 ${messageData.title}`,
                message: messageData.content,
                priority: 'high'
            });

            setIsMessageDialogOpen(false);
            setMessageData({ title: '', content: '', type: 'info' });
            setSelectedUser(null);
            toast.success(`ההודעה נשלחה ל-${selectedUser.name || selectedUser.email}`);
        } catch (error) {
            console.error('Failed to send message:', error);
            toast.error('שגיאה בשליחת ההודעה');
        }
        setIsSending(false);
    };

    // שליחת הודעה המונית
    const handleSendBulkMessage = async () => {
        if (!bulkMessage.title.trim() || !bulkMessage.content.trim()) {
            toast.error('יש למלא כותרת ותוכן');
            return;
        }

        setIsSendingBulk(true);
        try {
            let successCount = 0;
            let failCount = 0;

            for (const usr of filteredUsers) {
                try {
                    await createNotificationAndSendPush({
                        userId: usr.id,
                        type: 'system_announcement',
                        title: `📢 ${bulkMessage.title}`,
                        message: bulkMessage.content,
                        priority: 'high'
                    });
                    successCount++;
                } catch (err) {
                    console.warn(`Failed to send to ${usr.id}:`, err);
                    failCount++;
                }
            }

            toast.success(`נשלחו ${successCount} הודעות! (${failCount} נכשלו)`);
            setBulkMessageOpen(false);
            setBulkMessage({ title: '', content: '' });
        } catch (error) {
            toast.error('שגיאה בשליחת ההודעות');
        } finally {
            setIsSendingBulk(false);
        }
    };

    const openMessageDialog = (userToMessage) => {
        setSelectedUser(userToMessage);
        setMessageData({ title: '', content: '', type: 'info' });
        setIsMessageDialogOpen(true);
    };

    const getRoleBadge = (role) => {
        const r = (role || '').toString().toLowerCase();
        if (r === 'admin' || r === 'superadmin' || r === 'owner') {
            return <Badge className="bg-purple-100 text-purple-800"><Crown className="w-3 h-3 ml-1" />מנהל</Badge>;
        }
        return <Badge className="bg-blue-100 text-blue-800"><Users className="w-3 h-3 ml-1" />משתמש</Badge>;
    };

    if (isLoading) {
        return <div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;
    }

    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-gray-50 p-6" style={{ direction: 'rtl' }}>
                <Card className="max-w-xl mx-auto">
                    <CardContent className="p-6 text-center">
                        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <h2 className="text-xl font-bold mb-2">אין הרשאה</h2>
                        <p className="text-gray-600 mb-4">אין לך הרשאות לצפות בעמוד זה</p>
                        <Button onClick={() => navigate(createPageUrl('Home'))}>חזרה לדף הבית</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const totalUsers = users.length;
    const adminUsers = users.filter(u => {
        const role = (u.role || '').toString().toLowerCase();
        return role === 'admin' || role === 'superadmin' || role === 'owner';
    }).length;
    const activeUsers = users.filter(u => eventsByUser[u.id] > 0).length;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50 p-3 sm:p-6 pb-20" style={{ direction: 'rtl' }}>
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl('AdminDashboard'))}>
                            <ArrowRight className="w-5 h-5" />
                        </Button>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">ניהול משתמשים</h1>
                            <p className="text-xs sm:text-sm text-gray-500">צפייה, עריכה ושליחת הודעות</p>
                        </div>
                    </div>
                    <div className="flex gap-2 mr-auto sm:mr-0">
                        <Button variant="outline" size="sm" className="text-xs sm:text-sm" onClick={() => navigate(createPageUrl('AdminSystemMessages'))}>
                            <Bell className="w-4 h-4 sm:ml-2" />
                            <span className="hidden sm:inline">הודעות מערכת</span>
                        </Button>
                        <Button size="sm" className="text-xs sm:text-sm" onClick={() => setBulkMessageOpen(true)}>
                            <Mail className="w-4 h-4 sm:ml-2" />
                            <span className="hidden sm:inline">שלח הודעה המונית</span>
                        </Button>
                    </div>
                </div>

            {/* סטטיסטיקות כלליות */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Users className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{totalUsers}</p>
                                <p className="text-xs text-gray-500">סה"כ משתמשים</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                <Crown className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{adminUsers}</p>
                                <p className="text-xs text-gray-500">מנהלים</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                <BarChart3 className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{activeUsers}</p>
                                <p className="text-xs text-gray-500">משתמשים פעילים</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                                <Calendar className="w-5 h-5 text-orange-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{eventMembers.length}</p>
                                <p className="text-xs text-gray-500">סה"כ חברויות</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* סינון וחיפוש */}
            <Card className="mb-4 sm:mb-6">
                <CardContent className="p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1 relative">
                            <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                            <Input
                                placeholder="חיפוש לפי שם או אימייל..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pr-10 text-sm"
                            />
                        </div>
                        <Select value={roleFilter} onValueChange={setRoleFilter}>
                            <SelectTrigger className="w-full sm:w-36">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">כל התפקידים</SelectItem>
                                <SelectItem value="admin">מנהלים</SelectItem>
                                <SelectItem value="user">משתמשים</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* רשימת משתמשים - תצוגת כרטיסים למובייל, טבלה לדסקטופ */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between">
                        <span>רשימת משתמשים ({filteredUsers.length})</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {filteredUsers.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            לא נמצאו משתמשים
                        </div>
                    ) : (
                        <>
                            {/* תצוגת כרטיסים למובייל */}
                            <div className="md:hidden divide-y">
                                {filteredUsers.map(usr => {
                                    const name = usr.name || usr.fullName || `${usr.firstName || ''} ${usr.lastName || ''}`.trim() || 'משתמש';
                                    const eventsCount = eventsByUser[usr.id] || 0;
                                    const isCurrentUser = usr.id === currentUser.id;

                                    return (
                                        <div key={usr.id} className="p-4 hover:bg-gray-50">
                                            <div className="flex items-start gap-3">
                                                <img
                                                    src={usr.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=f97316&color=fff&size=48`}
                                                    alt={name}
                                                    className="w-12 h-12 rounded-full flex-shrink-0"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-medium text-gray-900 truncate">{name}</span>
                                                        {isCurrentUser && (
                                                            <Badge variant="outline" className="text-xs">זה אתה</Badge>
                                                        )}
                                                    </div>
                                                    <div className="text-sm text-gray-500 truncate">{usr.email}</div>
                                                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                        {getRoleBadge(usr.role)}
                                                        <Badge variant={eventsCount > 0 ? "default" : "outline"} className="font-mono text-xs">
                                                            <Calendar className="w-3 h-3 ml-1" />
                                                            {eventsCount} אירועים
                                                        </Badge>
                                                    </div>
                                                    <div className="text-xs text-gray-400 mt-1">
                                                        הצטרף: {formatIsraelDate(usr.created_date || usr.createdAt || usr.created_at)}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => openMessageDialog(usr)}
                                                        className="text-blue-600 hover:text-blue-800 h-8 w-8"
                                                    >
                                                        <MessageSquare className="w-4 h-4" />
                                                    </Button>
                                                    {!isCurrentUser && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => openDeleteDialog(usr)}
                                                            className="text-red-500 hover:text-red-700 h-8 w-8"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* תצוגת טבלה לדסקטופ */}
                            <div className="hidden md:block overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-gray-50">
                                            <TableHead className="text-right">משתמש</TableHead>
                                            <TableHead className="text-right">תפקיד</TableHead>
                                            <TableHead className="text-right">אירועים</TableHead>
                                            <TableHead className="text-right">הצטרף</TableHead>
                                            <TableHead className="text-right">פעולות</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredUsers.map(usr => {
                                            const name = usr.name || usr.fullName || `${usr.firstName || ''} ${usr.lastName || ''}`.trim() || 'משתמש';
                                            const eventsCount = eventsByUser[usr.id] || 0;
                                            const isCurrentUser = usr.id === currentUser.id;

                                            return (
                                                <TableRow key={usr.id} className="hover:bg-gray-50">
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <img
                                                                src={usr.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=f97316&color=fff&size=40`}
                                                                alt={name}
                                                                className="w-10 h-10 rounded-full"
                                                            />
                                                            <div>
                                                                <div className="font-medium text-gray-900">{name}</div>
                                                                <div className="text-sm text-gray-500">{usr.email}</div>
                                                                {isCurrentUser && (
                                                                    <Badge variant="outline" className="text-xs mt-1">זה אתה</Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{getRoleBadge(usr.role)}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={eventsCount > 0 ? "default" : "outline"} className="font-mono">
                                                            {eventsCount}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-sm text-gray-500">
                                                        {formatIsraelDate(usr.created_date || usr.createdAt || usr.created_at)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => openMessageDialog(usr)}
                                                                className="text-blue-600 hover:text-blue-800"
                                                                title="שלח הודעה"
                                                            >
                                                                <MessageSquare className="w-4 h-4" />
                                                            </Button>
                                                            {!isCurrentUser && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => openDeleteDialog(usr)}
                                                                    className="text-red-500 hover:text-red-700"
                                                                    title="מחק משתמש"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* דיאלוג שליחת הודעה */}
            <Dialog open={isMessageDialogOpen} onOpenChange={setIsMessageDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>שלח הודעה אישית</DialogTitle>
                        <p className="text-sm text-gray-500">
                            שליחה ל: {selectedUser?.name || selectedUser?.full_name}
                        </p>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="messageTitle">כותרת</Label>
                            <Input
                                id="messageTitle"
                                value={messageData.title}
                                onChange={(e) => setMessageData({...messageData, title: e.target.value})}
                                placeholder="כותרת ההודעה"
                            />
                        </div>
                        <div>
                            <Label htmlFor="messageType">סוג הודעה</Label>
                            <Select value={messageData.type} onValueChange={(v) => setMessageData({...messageData, type: v})}>
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
                            <Label htmlFor="messageContent">תוכן (Markdown)</Label>
                            <Textarea
                                id="messageContent"
                                value={messageData.content}
                                onChange={(e) => setMessageData({...messageData, content: e.target.value})}
                                placeholder="תוכן ההודעה..."
                                className="h-32"
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setIsMessageDialogOpen(false)}>
                                ביטול
                            </Button>
                            <Button onClick={handleSendMessage} disabled={isSending}>
                                {isSending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Send className="w-4 h-4 ml-2" />}
                                שלח
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* דיאלוג אישור מחיקה */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>האם אתה בטוח שברצונך למחוק את {userToDelete?.name || userToDelete?.full_name || 'המשתמש'}?</DialogTitle>
                        <DialogDescription>
                            <Alert variant="destructive" className="mt-4">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>פעולה בלתי הפיכה!</AlertTitle>
                                <AlertDescription>
                                    מחיקת משתמש זו תגרום למחיקה סופית של המשתמש וכל הנתונים המשויכים אליו.
                                    <br />
                                    אירועים שבבעלות המשתמש יבוטלו או יועברו למנהל אחר.
                                </AlertDescription>
                            </Alert>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsDeleteDialogOpen(false);
                                setUserToDelete(null);
                            }}
                            disabled={isDeleting}
                        >
                            ביטול
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteUser}
                            disabled={isDeleting}
                        >
                            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Trash2 className="w-4 h-4 ml-2" />}
                            מחק
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* דיאלוג הודעה המונית */}
            <Dialog open={bulkMessageOpen} onOpenChange={setBulkMessageOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Mail className="w-5 h-5 text-blue-500" />
                            שליחת הודעה המונית
                        </DialogTitle>
                        <DialogDescription>
                            ההודעה תישלח ל-{filteredUsers.length} משתמשים (לפי הסינון הנוכחי)
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div>
                            <Label>כותרת</Label>
                            <Input
                                value={bulkMessage.title}
                                onChange={(e) => setBulkMessage({ ...bulkMessage, title: e.target.value })}
                                placeholder="כותרת ההודעה"
                            />
                        </div>

                        <div>
                            <Label>תוכן</Label>
                            <Textarea
                                value={bulkMessage.content}
                                onChange={(e) => setBulkMessage({ ...bulkMessage, content: e.target.value })}
                                placeholder="תוכן ההודעה..."
                                rows={5}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setBulkMessageOpen(false)}>
                            ביטול
                        </Button>
                        <Button 
                            onClick={handleSendBulkMessage} 
                            disabled={isSendingBulk || !bulkMessage.title.trim() || !bulkMessage.content.trim()}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {isSendingBulk ? (
                                <>
                                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                                    שולח...
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4 ml-2" />
                                    שלח לכולם
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            </div>
        </div>
    );
}

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/components/AuthProvider';
import { 
  getUserById, 
  listUsers,
  createNotificationsAndSendPushBulk,
  listSystemMessages,
  createSystemMessage,
  updateSystemMessage,
  deleteSystemMessage
} from '@/components/instabackService';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Loader2, ArrowRight, Plus, Edit, Trash2, Send, 
  Megaphone, AlertTriangle, Wrench, Sparkles, Info, 
  Users, Eye, CheckCircle,
  Mail, MessageSquare, Settings, RefreshCcw
} from 'lucide-react';
import { toast } from 'sonner';

const MESSAGE_TYPES = {
  maintenance: { label: 'תחזוקה', icon: Wrench, color: 'bg-yellow-100 text-yellow-800', bgColor: 'bg-yellow-50 border-yellow-200' },
  new_feature: { label: 'פיצ\'ר חדש', icon: Sparkles, color: 'bg-purple-100 text-purple-800', bgColor: 'bg-purple-50 border-purple-200' },
  update: { label: 'עדכון', icon: RefreshCcw, color: 'bg-blue-100 text-blue-800', bgColor: 'bg-blue-50 border-blue-200' },
  announcement: { label: 'הכרזה', icon: Megaphone, color: 'bg-orange-100 text-orange-800', bgColor: 'bg-orange-50 border-orange-200' },
  warning: { label: 'אזהרה', icon: AlertTriangle, color: 'bg-red-100 text-red-800', bgColor: 'bg-red-50 border-red-200' },
  info: { label: 'מידע', icon: Info, color: 'bg-gray-100 text-gray-800', bgColor: 'bg-gray-50 border-gray-200' }
};

const AUDIENCE_LABELS = {
  all: 'כל המשתמשים',
  new_users: 'משתמשים חדשים',
  active_users: 'משתמשים פעילים',
  inactive_users: 'משתמשים לא פעילים',
  admins: 'מנהלים בלבד',
  specific_users: 'משתמשים ספציפיים'
};

export default function AdminSystemMessagesPage() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('messages');
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [sendNowDialogOpen, setSendNowDialogOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [quickMessageDialogOpen, setQuickMessageDialogOpen] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'info',
    priority: 'normal',
    targetAudience: 'all',
    specificUserIds: [],
    displayMode: 'banner',
    dismissible: true,
    requireConfirm: false,
    startDate: '',
    endDate: '',
    sendPush: false,
    isActive: true
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Quick message state
  const [quickMessage, setQuickMessage] = useState({ title: '', content: '' });

  // Check admin and load data
  useEffect(() => {
    const checkAndLoad = async () => {
      if (!isAuthenticated || !user?.id) {
        navigate(createPageUrl('Home'));
        return;
      }

      try {
        const me = await getUserById(user.id);
        
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
          setLoading(false);
          return;
        }

        // Load messages and users in parallel
        const [messagesData, usersData] = await Promise.all([
          listSystemMessages().catch(() => []),
          listUsers().catch(() => [])
        ]);

        const msgs = Array.isArray(messagesData) ? messagesData : (messagesData?.items || []);
        const usrs = Array.isArray(usersData) ? usersData : (usersData?.items || []);

        setMessages(msgs);
        setUsers(usrs);
      } catch (error) {
        console.error('Error loading admin data:', error);
        toast.error('שגיאה בטעינת הנתונים');
      } finally {
        setLoading(false);
      }
    };

    checkAndLoad();
  }, [isAuthenticated, user?.id, navigate]);

  // Reset form
  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      type: 'info',
      priority: 'normal',
      targetAudience: 'all',
      specificUserIds: [],
      displayMode: 'banner',
      dismissible: true,
      requireConfirm: false,
      startDate: new Date().toISOString().slice(0, 16),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      sendPush: false,
      isActive: true
    });
    setEditingMessage(null);
  };

  // Open edit dialog
  const handleEdit = (message) => {
    setFormData({
      title: message.title || '',
      content: message.content || '',
      type: message.type || 'info',
      priority: message.priority || 'normal',
      targetAudience: message.targetAudience || 'all',
      specificUserIds: message.specificUserIds || [],
      displayMode: message.displayMode || 'banner',
      dismissible: message.dismissible !== false,
      requireConfirm: message.requireConfirm || false,
      startDate: message.startDate ? new Date(message.startDate).toISOString().slice(0, 16) : '',
      endDate: message.endDate ? new Date(message.endDate).toISOString().slice(0, 16) : '',
      sendPush: message.sendPush || false,
      isActive: message.isActive !== false
    });
    setEditingMessage(message);
    setCreateDialogOpen(true);
  };

  // Save message
  const handleSave = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('יש לממלא כותרת ותוכן');
      return;
    }

    setIsSaving(true);
    try {
      const data = {
        ...formData,
        startDate: formData.startDate ? new Date(formData.startDate).toISOString() : new Date().toISOString(),
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
        viewCount: editingMessage?.viewCount || 0,
        dismissedBy: editingMessage?.dismissedBy || [],
        confirmedBy: editingMessage?.confirmedBy || []
      };

      if (editingMessage) {
        await updateSystemMessage(editingMessage.id, data);
        toast.success('ההודעה עודכנה בהצלחה');
      } else {
        await createSystemMessage(data);
        toast.success('ההודעה נוצרה בהצלחה');
      }

      // Reload messages
      const updatedMessages = await listSystemMessages();
      setMessages(Array.isArray(updatedMessages) ? updatedMessages : (updatedMessages?.items || []));
      
      setCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving message:', error);
      toast.error('שגיאה בשמירת ההודעה');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete message
  const handleDelete = async (messageId) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק הודעה זו?')) return;

    try {
      await deleteSystemMessage(messageId);
      setMessages(prev => prev.filter(m => m.id !== messageId));
      toast.success('ההודעה נמחקה');
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('שגיאה במחיקת ההודעה');
    }
  };

  // Send push notifications
  const handleSendPushNow = async (message) => {
    setIsSending(true);
    try {
      let targetUsers = [];
      
      if (message.targetAudience === 'all') {
        targetUsers = users;
      } else if (message.targetAudience === 'specific_users') {
        targetUsers = users.filter(u => (message.specificUserIds || []).includes(u.id));
      } else if (message.targetAudience === 'admins') {
        targetUsers = users.filter(u => {
          const role = (u.role || '').toString().toLowerCase();
          return role === 'admin' || role === 'superadmin' || role === 'owner';
        });
      } else if (message.targetAudience === 'new_users') {
        // משתמשים שנרשמו ב-7 ימים אחרונים
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        targetUsers = users.filter(u => {
          const createdDate = new Date(u.created_date || u.createdAt || u.created_at);
          return createdDate > sevenDaysAgo;
        });
      } else if (message.targetAudience === 'active_users') {
        // משתמשים פעילים - נשלח לכולם בינתיים
        targetUsers = users;
      } else if (message.targetAudience === 'inactive_users') {
        // משתמשים לא פעילים - נשלח לכולם בינתיים
        targetUsers = users;
      }

      if (targetUsers.length === 0) {
        toast.info('לא נמצאו משתמשים לשליחה');
        setIsSending(false);
        return;
      }

      const userIds = targetUsers.map(u => String(u.id));
      
      await createNotificationsAndSendPushBulk({
        userIds,
        type: 'system_announcement',
        title: message.title,
        message: message.content.substring(0, 200),
        priority: message.priority || 'normal'
      });

      toast.success(`ההודעה נשלחה ל-${userIds.length} משתמשים!`);
    } catch (error) {
      console.error('Error sending push notifications:', error);
      toast.error('שגיאה בשליחת ההודעות');
    } finally {
      setIsSending(false);
    }
  };

  // Quick message to selected users
  const handleSendQuickMessage = async () => {
    if (!quickMessage.title.trim() || !quickMessage.content.trim()) {
      toast.error('יש למלא כותרת ותוכן');
      return;
    }

    if (selectedUsers.length === 0) {
      toast.error('יש לבחור לפחות משתמש אחד');
      return;
    }

    setIsSending(true);
    try {
      await createNotificationsAndSendPushBulk({
        userIds: selectedUsers.map(id => String(id)),
        type: 'system_announcement',
        title: `📢 ${quickMessage.title}`,
        message: quickMessage.content,
        priority: 'high'
      });

      toast.success(`ההודעה נשלחה ל-${selectedUsers.length} משתמשים!`);
      setQuickMessageDialogOpen(false);
      setQuickMessage({ title: '', content: '' });
      setSelectedUsers([]);
    } catch (error) {
      console.error('Error sending quick messages:', error);
      toast.error('שגיאה בשליחת ההודעות');
    } finally {
      setIsSending(false);
    }
  };

  // Toggle user selection
  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // Select all users
  const selectAllUsers = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(u => u.id));
    }
  };

  // Statistics
  const stats = useMemo(() => {
    const activeMessages = messages.filter(m => m.isActive && (!m.endDate || new Date(m.endDate) > new Date()));
    const totalViews = messages.reduce((sum, m) => sum + (m.viewCount || 0), 0);
    const totalConfirms = messages.reduce((sum, m) => sum + (m.confirmedBy?.length || 0), 0);
    
    return {
      total: messages.length,
      active: activeMessages.length,
      totalViews,
      totalConfirms
    };
  }, [messages]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50 pb-20" style={{ direction: 'rtl' }}>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl('AdminDashboard'))}>
              <ArrowRight className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">ניהול הודעות מערכת</h1>
              <p className="text-sm text-gray-500 mt-1">שליחת הודעות, עדכונים והכרזות למשתמשים</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setQuickMessageDialogOpen(true)}>
              <Mail className="w-4 h-4 ml-2" />
              הודעה מהירה
            </Button>
            <Button onClick={() => { resetForm(); setCreateDialogOpen(true); }}>
              <Plus className="w-4 h-4 ml-2" />
              הודעה חדשה
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-gray-500">סה"כ הודעות</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.active}</p>
                  <p className="text-xs text-gray-500">הודעות פעילות</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Eye className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalViews}</p>
                  <p className="text-xs text-gray-500">סה"כ צפיות</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{users.length}</p>
                  <p className="text-xs text-gray-500">משתמשים</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="messages">
              <Megaphone className="w-4 h-4 ml-2" />
              הודעות מערכת
            </TabsTrigger>
            <TabsTrigger value="users">
              <Users className="w-4 h-4 ml-2" />
              בחירת משתמשים
            </TabsTrigger>
            <TabsTrigger value="templates">
              <Settings className="w-4 h-4 ml-2" />
              תבניות מהירות
            </TabsTrigger>
          </TabsList>

          {/* Messages Tab */}
          <TabsContent value="messages" className="space-y-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="text-right">הודעה</TableHead>
                      <TableHead className="text-right">סוג</TableHead>
                      <TableHead className="text-right">קהל יעד</TableHead>
                      <TableHead className="text-right">סטטוס</TableHead>
                      <TableHead className="text-right">צפיות</TableHead>
                      <TableHead className="text-right">פעולות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {messages.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                          <Megaphone className="w-12 h-12 mx-auto mb-4 opacity-30" />
                          <p>אין הודעות עדיין</p>
                          <Button 
                            variant="outline" 
                            className="mt-4"
                            onClick={() => { resetForm(); setCreateDialogOpen(true); }}
                          >
                            <Plus className="w-4 h-4 ml-2" />
                            צור הודעה ראשונה
                          </Button>
                        </TableCell>
                      </TableRow>
                    ) : (
                      messages.map(message => {
                        const typeConfig = MESSAGE_TYPES[message.type] || MESSAGE_TYPES.info;
                        const TypeIcon = typeConfig.icon;
                        const isExpired = message.endDate && new Date(message.endDate) < new Date();
                        const isActive = message.isActive && !isExpired;

                        return (
                          <TableRow key={message.id} className={!isActive ? 'opacity-50' : ''}>
                            <TableCell>
                              <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-lg ${typeConfig.color}`}>
                                  <TypeIcon className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">{message.title}</p>
                                  <p className="text-sm text-gray-500 line-clamp-1">{message.content}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={typeConfig.color}>{typeConfig.label}</Badge>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-gray-600">
                                {AUDIENCE_LABELS[message.targetAudience] || message.targetAudience}
                              </span>
                            </TableCell>
                            <TableCell>
                              {isActive ? (
                                <Badge className="bg-green-100 text-green-800">פעיל</Badge>
                              ) : isExpired ? (
                                <Badge className="bg-gray-100 text-gray-600">פג תוקף</Badge>
                              ) : (
                                <Badge className="bg-yellow-100 text-yellow-800">מושהה</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm text-gray-600">
                                <Eye className="w-4 h-4" />
                                {message.viewCount || 0}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleSendPushNow(message)}
                                  disabled={isSending}
                                  title="שלח push עכשיו"
                                >
                                  <Send className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(message)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(message.id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">בחר משתמשים לשליחת הודעה</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={selectAllUsers}>
                      {selectedUsers.length === users.length ? 'בטל הכל' : 'בחר הכל'}
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={() => setQuickMessageDialogOpen(true)}
                      disabled={selectedUsers.length === 0}
                    >
                      <Send className="w-4 h-4 ml-2" />
                      שלח ל-{selectedUsers.length} משתמשים
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {users.map(u => {
                    const isSelected = selectedUsers.includes(u.id);
                    const role = (u.role || '').toString().toLowerCase();
                    const isAdminUser = role === 'admin' || role === 'superadmin' || role === 'owner';
                    
                    return (
                      <div 
                        key={u.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          isSelected ? 'bg-orange-50 border-orange-300' : 'bg-white hover:bg-gray-50 border-gray-200'
                        }`}
                        onClick={() => toggleUserSelection(u.id)}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox checked={isSelected} />
                          <img 
                            src={u.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || u.email)}&background=f97316&color=fff&size=40`}
                            alt={u.name}
                            className="w-10 h-10 rounded-full"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{u.name || 'משתמש'}</p>
                            <p className="text-xs text-gray-500 truncate">{u.email}</p>
                          </div>
                          {isAdminUser && (
                            <Badge className="bg-purple-100 text-purple-800 text-xs">מנהל</Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Maintenance Template */}
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => {
                setFormData({
                  ...formData,
                  title: '🔧 תחזוקה מתוכננת',
                  content: 'שלום רב,\n\nאנו מודיעים על תחזוקה מתוכננת במערכת.\n\n**מתי:** [תאריך ושעה]\n**משך משוער:** [זמן]\n\nבמהלך התחזוקה, ייתכן שחלק מהשירותים לא יהיו זמינים.\n\nתודה על הסבלנות!',
                  type: 'maintenance',
                  priority: 'high',
                  sendPush: true
                });
                setCreateDialogOpen(true);
              }}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-3 bg-yellow-100 rounded-lg">
                      <Wrench className="w-6 h-6 text-yellow-600" />
                    </div>
                    <h3 className="font-semibold">הודעת תחזוקה</h3>
                  </div>
                  <p className="text-sm text-gray-600">תבנית להודעה על תחזוקה מתוכננת במערכת</p>
                </CardContent>
              </Card>

              {/* New Feature Template */}
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => {
                setFormData({
                  ...formData,
                  title: '✨ פיצ\'ר חדש!',
                  content: 'שלום רב,\n\nאנחנו שמחים להכריז על פיצ\'ר חדש באפליקציה!\n\n**מה חדש:**\n- [תיאור הפיצ\'ר]\n\n**איך להשתמש:**\n1. [צעד 1]\n2. [צעד 2]\n\nנשמח לשמוע מה אתם חושבים! 🎉',
                  type: 'new_feature',
                  priority: 'normal',
                  sendPush: true
                });
                setCreateDialogOpen(true);
              }}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <Sparkles className="w-6 h-6 text-purple-600" />
                    </div>
                    <h3 className="font-semibold">פיצ'ר חדש</h3>
                  </div>
                  <p className="text-sm text-gray-600">תבנית להכרזה על תכונה חדשה באפליקציה</p>
                </CardContent>
              </Card>

              {/* Update Template */}
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => {
                setFormData({
                  ...formData,
                  title: '🔄 עדכון גרסה',
                  content: 'שלום רב,\n\nשוחררה גרסה חדשה של האפליקציה!\n\n**מה חדש בגרסה:**\n- [שיפור 1]\n- [שיפור 2]\n- [תיקון באג]\n\nמומלץ לרענן את העמוד כדי לקבל את העדכונים.',
                  type: 'update',
                  priority: 'normal',
                  sendPush: false
                });
                setCreateDialogOpen(true);
              }}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <RefreshCcw className="w-6 h-6 text-blue-600" />
                    </div>
                    <h3 className="font-semibold">עדכון גרסה</h3>
                  </div>
                  <p className="text-sm text-gray-600">תבנית להודעה על עדכון גרסה</p>
                </CardContent>
              </Card>

              {/* Warning Template */}
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => {
                setFormData({
                  ...formData,
                  title: '⚠️ התראה חשובה',
                  content: 'שלום רב,\n\n**שימו לב:**\n\n[תיאור ההתראה]\n\n**מה צריך לעשות:**\n1. [פעולה נדרשת]\n\nלשאלות נוספות, אנא צרו קשר.',
                  type: 'warning',
                  priority: 'urgent',
                  sendPush: true
                });
                setCreateDialogOpen(true);
              }}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-3 bg-red-100 rounded-lg">
                      <AlertTriangle className="w-6 h-6 text-red-600" />
                    </div>
                    <h3 className="font-semibold">התראה חשובה</h3>
                  </div>
                  <p className="text-sm text-gray-600">תבנית להתראה דחופה למשתמשים</p>
                </CardContent>
              </Card>

              {/* General Announcement Template */}
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => {
                setFormData({
                  ...formData,
                  title: '📢 הכרזה',
                  content: 'שלום רב,\n\n[תוכן ההכרזה]\n\nתודה,\nצוות PlanOra',
                  type: 'announcement',
                  priority: 'normal',
                  sendPush: false
                });
                setCreateDialogOpen(true);
              }}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-3 bg-orange-100 rounded-lg">
                      <Megaphone className="w-6 h-6 text-orange-600" />
                    </div>
                    <h3 className="font-semibold">הכרזה כללית</h3>
                  </div>
                  <p className="text-sm text-gray-600">תבנית להכרזה כללית למשתמשים</p>
                </CardContent>
              </Card>

              {/* Welcome Message Template */}
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => {
                setFormData({
                  ...formData,
                  title: '👋 ברוכים הבאים!',
                  content: 'שלום וברוך הבא לאפליקציה!\n\nאנחנו שמחים שהצטרפת.\n\n**טיפים להתחלה:**\n1. צור אירוע ראשון\n2. הזמן חברים\n3. התחל לתכנן!\n\nבהצלחה! 🎉',
                  type: 'info',
                  priority: 'normal',
                  targetAudience: 'new_users',
                  sendPush: true
                });
                setCreateDialogOpen(true);
              }}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-3 bg-green-100 rounded-lg">
                      <Users className="w-6 h-6 text-green-600" />
                    </div>
                    <h3 className="font-semibold">ברוכים הבאים</h3>
                  </div>
                  <p className="text-sm text-gray-600">תבנית למשתמשים חדשים</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Create/Edit Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-orange-500" />
                {editingMessage ? 'עריכת הודעה' : 'הודעה חדשה'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>כותרת</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="כותרת ההודעה"
                  />
                </div>

                <div className="col-span-2">
                  <Label>תוכן (Markdown)</Label>
                  <Textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="תוכן ההודעה..."
                    rows={6}
                  />
                </div>

                <div>
                  <Label>סוג הודעה</Label>
                  <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(MESSAGE_TYPES).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <config.icon className="w-4 h-4" />
                            {config.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>עדיפות</Label>
                  <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">נמוכה</SelectItem>
                      <SelectItem value="normal">רגילה</SelectItem>
                      <SelectItem value="high">גבוהה</SelectItem>
                      <SelectItem value="urgent">דחופה</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>קהל יעד</Label>
                  <Select value={formData.targetAudience} onValueChange={(v) => setFormData({ ...formData, targetAudience: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(AUDIENCE_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.targetAudience === 'specific_users' && (
                  <div className="col-span-2 border rounded-md p-3 max-h-48 overflow-y-auto">
                    <Label className="mb-2 block">בחר משתמשים:</Label>
                    <div className="space-y-2">
                      {users.map(u => (
                        <div key={u.id} className="flex items-center gap-2">
                          <Checkbox 
                            id={`user-${u.id}`}
                            checked={(formData.specificUserIds || []).includes(u.id)}
                            onCheckedChange={(checked) => {
                              const currentIds = formData.specificUserIds || [];
                              if (checked) {
                                setFormData({ ...formData, specificUserIds: [...currentIds, u.id] });
                              } else {
                                setFormData({ ...formData, specificUserIds: currentIds.filter(id => id !== u.id) });
                              }
                            }}
                          />
                          <Label htmlFor={`user-${u.id}`} className="text-sm cursor-pointer">
                            {u.name || u.email}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* This block was duplicated in the original code, removing the duplicate. */}
                {/* {formData.targetAudience === 'specific_users' && (
                  <div className="col-span-2 border rounded-md p-3 max-h-48 overflow-y-auto">
                    <Label className="mb-2 block">בחר משתמשים:</Label>
                    <div className="space-y-2">
                      {users.map(u => (
                        <div key={u.id} className="flex items-center gap-2">
                          <Checkbox 
                            id={`user-${u.id}`}
                            checked={(formData.specificUserIds || []).includes(u.id)}
                            onCheckedChange={(checked) => {
                              const currentIds = formData.specificUserIds || [];
                              if (checked) {
                                setFormData({ ...formData, specificUserIds: [...currentIds, u.id] });
                              } else {
                                setFormData({ ...formData, specificUserIds: currentIds.filter(id => id !== u.id) });
                              }
                            }}
                          />
                          <Label htmlFor={`user-${u.id}`} className="text-sm cursor-pointer">
                            {u.name || u.email}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )} */}

                <div>
                  <Label>אופן הצגה</Label>
                  <Select value={formData.displayMode} onValueChange={(v) => setFormData({ ...formData, displayMode: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="banner">באנר</SelectItem>
                      <SelectItem value="popup">חלון קופץ</SelectItem>
                      <SelectItem value="notification">התראה בלבד</SelectItem>
                      <SelectItem value="all">הכל</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>תאריך התחלה</Label>
                  <Input
                    type="datetime-local"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>

                <div>
                  <Label>תאריך סיום</Label>
                  <Input
                    type="datetime-local"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>

                <div className="col-span-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>ניתן לסגירה</Label>
                    <Switch
                      checked={formData.dismissible}
                      onCheckedChange={(v) => setFormData({ ...formData, dismissible: v })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>דורש אישור קריאה</Label>
                    <Switch
                      checked={formData.requireConfirm}
                      onCheckedChange={(v) => setFormData({ ...formData, requireConfirm: v })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>שלח Push Notification</Label>
                    <Switch
                      checked={formData.sendPush}
                      onCheckedChange={(v) => setFormData({ ...formData, sendPush: v })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>הודעה פעילה</Label>
                    <Switch
                      checked={formData.isActive}
                      onCheckedChange={(v) => setFormData({ ...formData, isActive: v })}
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                ביטול
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    שומר...
                  </>
                ) : (
                  <>
                    {editingMessage ? 'עדכן' : 'צור'} הודעה
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Quick Message Dialog */}
        <Dialog open={quickMessageDialogOpen} onOpenChange={setQuickMessageDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-500" />
                שליחת הודעה מהירה
              </DialogTitle>
              <DialogDescription>
                ההודעה תישלח ל-{selectedUsers.length} משתמשים נבחרים
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label>כותרת</Label>
                <Input
                  value={quickMessage.title}
                  onChange={(e) => setQuickMessage({ ...quickMessage, title: e.target.value })}
                  placeholder="כותרת ההודעה"
                />
              </div>

              <div>
                <Label>תוכן</Label>
                <Textarea
                  value={quickMessage.content}
                  onChange={(e) => setQuickMessage({ ...quickMessage, content: e.target.value })}
                  placeholder="תוכן ההודעה..."
                  rows={5}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setQuickMessageDialogOpen(false)}>
                ביטול
              </Button>
              <Button onClick={handleSendQuickMessage} disabled={isSending}>
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    שולח...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 ml-2" />
                    שלח הודעה
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

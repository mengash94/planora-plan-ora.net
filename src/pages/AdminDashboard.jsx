import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/components/AuthProvider';
import { listUsers, listAllEventMembers, updateUser, getUserById, deleteUser, createNotificationAndSendPush } from '@/components/instabackService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, ArrowRight, Users, Crown, Calendar, Search, ShieldCheck, Activity, TrendingUp, Trash2, AlertTriangle, Download, Mail, BarChart3, Clock, Zap, PieChart, LineChart, MessageSquare, Settings, ClipboardCheck, Save, Plus, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import AppLogo from '@/components/common/AppLogo';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatIsraelDateTime, formatIsraelDate } from '@/components/utils/dateHelpers';
import { Textarea } from '@/components/ui/textarea';
import ManageFeedback from '@/components/profile/ManageFeedback';
import EventTypeClassification from '@/components/admin/EventTypeClassification';

export default function AdminDashboard() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [eventMembers, setEventMembers] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [activityFilter, setActivityFilter] = useState('all'); // all, active, inactive
  const [dateFilter, setDateFilter] = useState('all'); // all, today, week, month
  const [savingRoleFor, setSavingRoleFor] = useState(null);
  const [isAdminServer, setIsAdminServer] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, user: null });
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [bulkMessageDialog, setBulkMessageDialog] = useState({ open: false, selectedUsers: [] });
  const [bulkMessage, setBulkMessage] = useState({ title: '', message: '' });
  const [isSendingBulk, setIsSendingBulk] = useState(false);
  
  // RSVP Categories Settings
  const [rsvpCategories, setRsvpCategories] = useState([
    'חתונה', 'אירוסין', 'ברית מילה', 'בת מצווה', 'בר מצווה', 'חינה', 'שבת חתן', 'בריתה', 
    'יום הולדת', 'אירוע משפחתי', 'birthday', 'party'
  ]);
  const [newCategory, setNewCategory] = useState('');
  const [isSavingCategories, setIsSavingCategories] = useState(false);

  const isAdminLocal = useMemo(() => {
    const role = (user?.role || '').toString().toLowerCase();
    const roles = user?.roles;
    const rolesArr = Array.isArray(roles)
      ? roles.map(r => String(r).toLowerCase())
      : typeof roles === 'string'
        ? roles.split(',').map(s => s.trim().toLowerCase())
        : [];
    return rolesArr.includes('admin') || role === 'admin' || role === 'superadmin' || role === 'owner' || user?.is_admin === true || user?.isAdmin === true;
  }, [user]);

  const isAdmin = isAdminServer ?? isAdminLocal;

  useEffect(() => {
    const verifyRole = async () => {
      if (!user?.id) {
        setIsAdminServer(false);
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
        
        setIsAdminServer(isAdminUser);
      } catch (error) {
        console.error("Failed to verify user role from server:", error);
        setIsAdminServer(null);
      }
    };
    verifyRole();
  }, [user?.id]);

  // Load saved RSVP categories from localStorage
  useEffect(() => {
    const savedCategories = localStorage.getItem('rsvp_categories');
    if (savedCategories) {
      try {
        setRsvpCategories(JSON.parse(savedCategories));
      } catch (e) {
        console.warn('Failed to parse saved RSVP categories');
      }
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!isAuthenticated || !user) {
        navigate(createPageUrl('Home'));
        return;
      }
      if (isAdminServer === null && user?.id) {
        setLoading(true);
        return;
      }
      if (!isAdmin) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        
        // Load users and memberships
        const [allUsers, allMembers] = await Promise.all([
          listUsers().catch(() => []),
          listAllEventMembers().catch(() => []),
        ]);
        
        setUsers(Array.isArray(allUsers) ? allUsers : []);
        setEventMembers(Array.isArray(allMembers) ? allMembers : []);

        // Extract unique event IDs and load event details
        const uniqueEventIds = [...new Set(allMembers.map(m => m.eventId || m.EventId).filter(Boolean))];
        
        // Load events from InstaBack
        const instabackToken = typeof window !== 'undefined' ? localStorage.getItem('instaback_token') : null;
        if (instabackToken && uniqueEventIds.length > 0) {
          const eventPromises = uniqueEventIds.map(async (eventId) => {
            try {
              const response = await fetch(`https://instaback.ai/project/f78de3ce-0cab-4ccb-8442-0c5749792fe8/api/Event/${eventId}`, {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${instabackToken}`,
                  'accept': 'application/json'
                }
              });
              if (response.ok) {
                return await response.json();
              }
              return null;
            } catch (error) {
              console.error(`Failed to load event ${eventId}:`, error);
              return null;
            }
          });
          
          const loadedEvents = await Promise.all(eventPromises);
          setEvents(loadedEvents.filter(e => e !== null));
        }

      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAuthenticated, user, isAdmin, isAdminServer, navigate]);

  // Calculate comprehensive statistics
  const stats = useMemo(() => {
    const totalUsers = users.length;
    const admins = users.filter(u => {
      const role = (u.role || '').toString().toLowerCase();
      const roles = u?.roles;
      const rolesArr = Array.isArray(roles)
        ? roles.map(r => String(r).toLowerCase())
        : typeof roles === 'string'
          ? roles.split(',').map(s => s.trim().toLowerCase())
          : [];
      return rolesArr.includes('admin') || role === 'admin' || role === 'superadmin' || role === 'owner';
    }).length;

    const uniqueEventIds = new Set(
      (eventMembers || []).map(m => m.eventId || m.EventId).filter(Boolean)
    );
    const totalEvents = uniqueEventIds.size;
    const membershipsCount = eventMembers.length;
    const avgEventsPerUser = totalUsers > 0 ? (membershipsCount / totalUsers).toFixed(1) : 0;

    // Active users (users with at least one event)
    const usersWithEvents = new Set(
      eventMembers.map(m => m.userId || m.UserId).filter(Boolean)
    );
    const activeUsers = usersWithEvents.size;
    const activeRate = totalUsers > 0 ? ((activeUsers / totalUsers) * 100).toFixed(0) : 0;

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentUsers = users.filter(u => {
      const created = new Date(u.created_date || u.createdAt || u.created_at || 0);
      return created > sevenDaysAgo;
    }).length;

    const recentEvents = events.filter(e => {
      const created = new Date(e.created_date || e.createdAt || e.created_at || 0);
      return created > sevenDaysAgo;
    }).length;

    // Growth metrics (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const usersLast30Days = users.filter(u => {
      const created = new Date(u.created_date || u.createdAt || u.created_at || 0);
      return created > thirtyDaysAgo;
    }).length;

    const eventsLast30Days = events.filter(e => {
      const created = new Date(e.created_date || e.createdAt || e.created_at || 0);
      return created > thirtyDaysAgo;
    }).length;

    // Calculate user retention (users who created more than one event)
    const userEventCounts = {};
    eventMembers.forEach(m => {
      const uid = m.userId || m.UserId;
      if (!uid) return;
      userEventCounts[uid] = (userEventCounts[uid] || 0) + 1;
    });
    const retainedUsers = Object.values(userEventCounts).filter(count => count > 1).length;
    const retentionRate = activeUsers > 0 ? ((retainedUsers / activeUsers) * 100).toFixed(0) : 0;

    return {
      totalUsers,
      admins,
      totalEvents,
      totalMemberships: membershipsCount,
      avgEventsPerUser,
      activeUsers,
      activeRate,
      recentUsers,
      recentEvents,
      usersLast30Days,
      eventsLast30Days,
      retentionRate
    };
  }, [users, events, eventMembers]);

  // Calculate events per user
  const eventsByUser = useMemo(() => {
    const map = {};
    (eventMembers || []).forEach(m => {
      const uid = m.userId || m.UserId;
      const eid = m.eventId || m.EventId;
      if (!uid || !eid) return;
      if (!map[uid]) map[uid] = new Set();
      map[uid].add(eid);
    });
    const out = {};
    Object.keys(map).forEach(uid => {
      out[uid] = map[uid].size;
    });
    return out;
  }, [eventMembers]);

  // User growth by month
  const userGrowthByMonth = useMemo(() => {
    const monthCounts = {};
    users.forEach(u => {
      const date = new Date(u.created_date || u.createdAt || u.created_at || Date.now());
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
    });
    return Object.entries(monthCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6); // Last 6 months
  }, [users]);

  // Event growth by month
  const eventGrowthByMonth = useMemo(() => {
    const monthCounts = {};
    events.forEach(e => {
      const date = new Date(e.created_date || e.createdAt || e.created_at || Date.now());
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
    });
    return Object.entries(monthCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6); // Last 6 months
  }, [events]);

  // Top users by activity
  const topUsers = useMemo(() => {
    return Object.entries(eventsByUser)
      .map(([userId, eventCount]) => {
        const userObj = users.find(u => u.id === userId);
        return { user: userObj, eventCount };
      })
      .filter(item => item.user)
      .sort((a, b) => b.eventCount - a.eventCount)
      .slice(0, 10);
  }, [eventsByUser, users]);

  // Recent activity log
  const recentActivity = useMemo(() => {
    const activities = [];
    
    // Add user registrations
    users.forEach(u => {
      const date = new Date(u.created_date || u.createdAt || u.created_at);
      if (!isNaN(date.getTime())) {
        activities.push({
          type: 'user_join',
          user: u,
          date,
          description: `${u.name || u.email} הצטרף למערכת`
        });
      }
    });

    // Add event creations
    events.forEach(e => {
      const date = new Date(e.created_date || e.createdAt || e.created_at);
      const owner = users.find(u => u.id === (e.ownerId || e.owner_id));
      if (!isNaN(date.getTime())) {
        activities.push({
          type: 'event_create',
          event: e,
          user: owner,
          date,
          description: `${owner?.name || 'משתמש'} יצר את האירוע "${e.title || e.name}"`
        });
      }
    });

    return activities
      .sort((a, b) => b.date - a.date)
      .slice(0, 20);
  }, [users, events]);

  // Filter and search users
  const filteredUsers = useMemo(() => {
    let result = users;

    // Role filter
    if (roleFilter === 'admin') {
      result = result.filter(u => {
        const role = (u.role || '').toString().toLowerCase();
        const roles = u?.roles;
        const rolesArr = Array.isArray(roles)
          ? roles.map(r => String(r).toLowerCase())
          : typeof roles === 'string'
            ? roles.split(',').map(s => s.trim().toLowerCase())
            : [];
        return rolesArr.includes('admin') || role === 'admin' || role === 'superadmin' || role === 'owner';
      });
    } else if (roleFilter === 'user') {
      result = result.filter(u => {
        const role = (u.role || '').toString().toLowerCase();
        const roles = u?.roles;
        const rolesArr = Array.isArray(roles)
          ? roles.map(r => String(r).toLowerCase())
          : typeof roles === 'string'
            ? roles.split(',').map(s => s.trim().toLowerCase())
            : [];
        return !(rolesArr.includes('admin') || role === 'admin' || role === 'superadmin' || role === 'owner');
      });
    }

    // Activity filter
    if (activityFilter === 'active') {
      result = result.filter(u => eventsByUser[u.id] > 0);
    } else if (activityFilter === 'inactive') {
      result = result.filter(u => !eventsByUser[u.id] || eventsByUser[u.id] === 0);
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      let cutoffDate;
      
      if (dateFilter === 'today') {
        cutoffDate = new Date(now.setHours(0, 0, 0, 0));
      } else if (dateFilter === 'week') {
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (dateFilter === 'month') {
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      if (cutoffDate) {
        result = result.filter(u => {
          const userDate = new Date(u.created_date || u.createdAt || u.created_at || 0);
          return userDate >= cutoffDate;
        });
      }
    }

    // Search filter
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(u => {
        const name = (u.name || u.fullName || `${u.firstName || ''} ${u.lastName || ''}`).toLowerCase();
        const email = (u.email || '').toLowerCase();
        return name.includes(q) || email.includes(q);
      });
    }

    return result;
  }, [users, search, roleFilter, activityFilter, dateFilter, eventsByUser]);

  const handleRoleChange = async (u, newRole) => {
    setSavingRoleFor(u.id);
    try {
      const updateData = {};
      if (Array.isArray(u.roles)) {
        const currentRoles = new Set(u.roles.map(r => String(r).toLowerCase()));
        if (newRole === 'admin') {
          currentRoles.add('admin');
        } else {
          currentRoles.delete('admin');
        }
        updateData.roles = Array.from(currentRoles);
      } else {
        updateData.role = newRole;
      }
      
      await updateUser(u.id, updateData);
      setUsers(prev => prev.map(x => {
        if (x.id === u.id) {
          if (Array.isArray(x.roles)) {
            const updatedRoles = new Set(x.roles.map(r => String(r).toLowerCase()));
            if (newRole === 'admin') {
              updatedRoles.add('admin');
            } else {
              updatedRoles.delete('admin');
            }
            return { ...x, roles: Array.from(updatedRoles) };
          } else {
            return { ...x, role: newRole };
          }
        }
        return x;
      }));
      toast.success('תפקיד המשתמש עודכן');
    } catch (error) {
      toast.error('שגיאה בעדכון תפקיד');
    } finally {
      setSavingRoleFor(null);
    }
  };

  const handleDeleteUser = async () => {
    const userToDelete = deleteDialog.user;
    if (!userToDelete) return;

    setIsDeleting(true);
    try {
      await deleteUser(userToDelete.id);
      setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
      toast.success('המשתמש נמחק בהצלחה');
      setDeleteDialog({ open: false, user: null });
    } catch (error) {
      toast.error('שגיאה במחיקת משתמש');
    } finally {
      setIsDeleting(false);
    }
  };

  const getUserRole = (u) => {
    const role = (u.role || '').toString().toLowerCase();
    const roles = u?.roles;
    const rolesArr = Array.isArray(roles)
      ? roles.map(r => String(r).toLowerCase())
      : typeof roles === 'string'
        ? roles.split(',').map(s => s.trim().toLowerCase())
        : [];
    
    if (rolesArr.includes('admin') || role === 'admin' || role === 'superadmin' || role === 'owner') {
      return 'admin';
    }
    return 'user';
  };

  const handleExportUsers = () => {
    const csvData = [
      ['שם', 'אימייל', 'תפקיד', 'אירועים', 'תאריך הצטרפות'],
      ...filteredUsers.map(u => [
        u.name || u.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'משתמש',
        u.email || '',
        getUserRole(u) === 'admin' ? 'מנהל' : 'משתמש',
        eventsByUser[u.id] || 0,
        formatIsraelDate(u.created_date || u.createdAt || u.created_at)
      ])
    ];

    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('הקובץ יוצא בהצלחה');
  };

  const handleBulkMessage = async () => {
    if (!bulkMessage.title.trim() || !bulkMessage.message.trim()) {
      toast.error('נא למלא כותרת והודעה');
      return;
    }

    if (bulkMessageDialog.selectedUsers.length === 0) {
      toast.error('נא לבחור לפחות משתמש אחד');
      return;
    }

    setIsSendingBulk(true);

    try {
      const promises = bulkMessageDialog.selectedUsers.map(userId => 
        createNotificationAndSendPush({
          userId,
          type: 'system_announcement',
          title: `📢 ${bulkMessage.title}`,
          message: bulkMessage.message,
          priority: 'high'
        }).catch(err => {
          console.warn(`Failed to send to user ${userId}:`, err);
          return null;
        })
      );

      const results = await Promise.all(promises);
      const successCount = results.filter(r => r !== null).length;

      toast.success(`ההודעה נשלחה ל-${successCount} משתמשים!`);
      setBulkMessageDialog({ open: false, selectedUsers: [] });
      setBulkMessage({ title: '', message: '' });
    } catch (error) {
      toast.error('שגיאה בשליחת ההודעות');
    } finally {
      setIsSendingBulk(false);
    }
  };

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
        <div className="max-w-xl mx-auto">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-purple-600" />
                <h1 className="text-xl font-bold">נדרש הרשאות מנהל</h1>
              </div>
              <p className="text-gray-600 text-sm">
                אינך מזוהה כמנהל. לא ניתן לגשת לדף ניהול המשתמשים ללא הרשאה מתאימה.
              </p>
              <div className="flex gap-2">
                <Button onClick={() => navigate(createPageUrl('Profile'))} variant="outline">חזרה לפרופיל</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50 pb-20" style={{ direction: 'rtl' }}>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl('Profile'))}>
              <ArrowRight className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-3xl font-bold text-gray-900">לוח ניהול</h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">ניהול, מעקב וניתוח</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => navigate(createPageUrl('AdminUsers'))} className="text-xs sm:text-sm">
              <Users className="w-4 h-4 ml-1 sm:ml-2" />
              <span className="hidden sm:inline">ניהול </span>משתמשים
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate(createPageUrl('AdminAnalytics'))} className="text-xs sm:text-sm">
              <BarChart3 className="w-4 h-4 ml-1 sm:ml-2" />
              <span className="hidden sm:inline">ניתוח </span>נתונים
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate(createPageUrl('AdminSystemMessages'))} className="text-xs sm:text-sm">
              <Mail className="w-4 h-4 ml-1 sm:ml-2" />
              <span className="hidden sm:inline">הודעות </span>מערכת
            </Button>
            <div className="hidden sm:block">
              <AppLogo size={40} showText />
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-4">
          <Card className="border-t-4 border-t-blue-500">
            <CardContent className="p-2 sm:p-4">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 mb-1" />
              <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
              <p className="text-[10px] sm:text-xs text-gray-500">משתמשים</p>
            </CardContent>
          </Card>

          <Card className="border-t-4 border-t-purple-500">
            <CardContent className="p-2 sm:p-4">
              <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 mb-1" />
              <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.admins}</p>
              <p className="text-[10px] sm:text-xs text-gray-500">מנהלים</p>
            </CardContent>
          </Card>

          <Card className="border-t-4 border-t-orange-500">
            <CardContent className="p-2 sm:p-4">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 mb-1" />
              <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.totalEvents}</p>
              <p className="text-[10px] sm:text-xs text-gray-500">אירועים</p>
            </CardContent>
          </Card>

          <Card className="border-t-4 border-t-green-500">
            <CardContent className="p-2 sm:p-4">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 mb-1" />
              <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.activeRate}%</p>
              <p className="text-[10px] sm:text-xs text-gray-500">פעילים</p>
            </CardContent>
          </Card>

          <Card className="border-t-4 border-t-pink-500">
            <CardContent className="p-2 sm:p-4">
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-pink-600 mb-1" />
              <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.recentUsers}</p>
              <p className="text-[10px] sm:text-xs text-gray-500">חדשים</p>
            </CardContent>
          </Card>

          <Card className="border-t-4 border-t-cyan-500">
            <CardContent className="p-2 sm:p-4">
              <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-600 mb-1" />
              <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.retentionRate}%</p>
              <p className="text-[10px] sm:text-xs text-gray-500">Retention</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex flex-wrap h-auto gap-1 p-1 sm:grid sm:w-full sm:grid-cols-7">
            <TabsTrigger value="overview" className="text-xs sm:text-sm px-2 py-1.5">
              <PieChart className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
              <span className="hidden sm:inline">סקירה</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="text-xs sm:text-sm px-2 py-1.5">
              <Users className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
              <span className="hidden sm:inline">משתמשים</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs sm:text-sm px-2 py-1.5">
              <LineChart className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
              <span className="hidden sm:inline">אנליטיקס</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="text-xs sm:text-sm px-2 py-1.5">
              <Activity className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
              <span className="hidden sm:inline">פעילות</span>
            </TabsTrigger>
            <TabsTrigger value="events" className="text-xs sm:text-sm px-2 py-1.5">
              <Calendar className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
              <span className="hidden sm:inline">אירועים</span>
            </TabsTrigger>
            <TabsTrigger value="feedback" className="text-xs sm:text-sm px-2 py-1.5">
              <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
              <span className="hidden sm:inline">משובים</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-xs sm:text-sm px-2 py-1.5">
              <Settings className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
              <span className="hidden sm:inline">הגדרות</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Growth Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                    צמיחת משתמשים (6 חודשים אחרונים)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {userGrowthByMonth.map(([month, count]) => (
                      <div key={month} className="flex items-center gap-3">
                        <span className="text-sm font-medium w-20">{month}</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
                          <div 
                            className="bg-blue-500 h-full flex items-center justify-end pr-2"
                            style={{ width: `${Math.min((count / Math.max(...userGrowthByMonth.map(([, c]) => c))) * 100, 100)}%` }}
                          >
                            <span className="text-xs text-white font-semibold">{count}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Event Growth Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-orange-600" />
                    צמיחת אירועים (6 חודשים אחרונים)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {eventGrowthByMonth.map(([month, count]) => (
                      <div key={month} className="flex items-center gap-3">
                        <span className="text-sm font-medium w-20">{month}</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
                          <div 
                            className="bg-orange-500 h-full flex items-center justify-end pr-2"
                            style={{ width: `${Math.min((count / Math.max(...eventGrowthByMonth.map(([, c]) => c))) * 100, 100)}%` }}
                          >
                            <span className="text-xs text-white font-semibold">{count}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Top Active Users */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Crown className="w-5 h-5 text-yellow-600" />
                    המשתמשים המובילים (לפי מספר אירועים)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {topUsers.slice(0, 10).map(({ user, eventCount }, index) => (
                      <div key={user.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <span className="text-lg font-bold text-gray-400 w-6">{index + 1}</span>
                        <img 
                          src={user.avatar_url || user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || user.email)}&background=f97316&color=fff&size=64`}
                          alt={user.name}
                          className="w-10 h-10 rounded-full"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{user.name || user.email}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                        <Badge className="bg-orange-100 text-orange-800 font-mono">
                          {eventCount} אירועים
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4 mb-4">
                  <div className="flex-1 relative">
                    <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    <Input
                      placeholder="חיפוש לפי שם או אימייל..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pr-10"
                    />
                  </div>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-full md:w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">כל התפקידים</SelectItem>
                      <SelectItem value="admin">מנהלים</SelectItem>
                      <SelectItem value="user">משתמשים</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={activityFilter} onValueChange={setActivityFilter}>
                    <SelectTrigger className="w-full md:w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">כל הפעילויות</SelectItem>
                      <SelectItem value="active">פעילים</SelectItem>
                      <SelectItem value="inactive">לא פעילים</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger className="w-full md:w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">כל התקופות</SelectItem>
                      <SelectItem value="today">היום</SelectItem>
                      <SelectItem value="week">שבוע אחרון</SelectItem>
                      <SelectItem value="month">חודש אחרון</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleExportUsers}>
                    <Download className="w-4 h-4 ml-2" />
                    ייצוא לCSV
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setBulkMessageDialog({ open: true, selectedUsers: filteredUsers.map(u => u.id) })}
                  >
                    <Mail className="w-4 h-4 ml-2" />
                    שלח הודעה המונית
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="text-right font-semibold">משתמש</TableHead>
                        <TableHead className="text-right font-semibold">אימייל</TableHead>
                        <TableHead className="text-right font-semibold">תפקיד</TableHead>
                        <TableHead className="text-right font-semibold">אירועים</TableHead>
                        <TableHead className="text-right font-semibold">הצטרפות</TableHead>
                        <TableHead className="text-right font-semibold">פעולות</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                            לא נמצאו משתמשים
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredUsers.map(u => {
                          const name = u.name || u.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'משתמש';
                          const avatar = u.avatar_url || u.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=f97316&color=fff&size=64`;
                          const email = u.email || '';
                          const currentRole = getUserRole(u);
                          const eventsCount = eventsByUser[u.id] || 0;
                          const isCurrentUser = u.id === user.id;

                          return (
                            <TableRow key={u.id} className="hover:bg-gray-50">
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <img src={avatar} alt={name} className="w-10 h-10 rounded-full" />
                                  <div>
                                    <div className="font-medium text-gray-900">{name}</div>
                                    {isCurrentUser && (
                                      <Badge variant="outline" className="text-xs mt-1">זה אתה</Badge>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-gray-600">{email}</TableCell>
                              <TableCell>
                                {savingRoleFor === u.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Select
                                    value={currentRole}
                                    onValueChange={(val) => handleRoleChange(u, val)}
                                    disabled={isCurrentUser}
                                  >
                                    <SelectTrigger className="w-32">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="user">משתמש</SelectItem>
                                      <SelectItem value="admin">מנהל</SelectItem>
                                    </SelectContent>
                                  </Select>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant={eventsCount > 0 ? "default" : "outline"} className="font-mono">
                                  {eventsCount}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-gray-500">
                                {formatIsraelDate(u.created_date || u.createdAt || u.created_at)}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setDeleteDialog({ open: true, user: u })}
                                    disabled={isCurrentUser}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-gray-500">משתמשים חדשים (30 יום)</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-gray-900">{stats.usersLast30Days}</p>
                  <p className="text-sm text-gray-500 mt-2">
                    {stats.totalUsers > 0 ? `${((stats.usersLast30Days / stats.totalUsers) * 100).toFixed(1)}%` : '0%'} מכלל המשתמשים
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-gray-500">אירועים חדשים (30 יום)</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-gray-900">{stats.eventsLast30Days}</p>
                  <p className="text-sm text-gray-500 mt-2">
                    {stats.totalEvents > 0 ? `${((stats.eventsLast30Days / stats.totalEvents) * 100).toFixed(1)}%` : '0%'} מכלל האירועים
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-gray-500">ממוצע אירועים למשתמש</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-gray-900">{stats.avgEventsPerUser}</p>
                  <p className="text-sm text-gray-500 mt-2">
                    engagement metric
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-gray-500">Retention Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-gray-900">{stats.retentionRate}%</p>
                  <p className="text-sm text-gray-500 mt-2">
                    משתמשים עם 2+ אירועים
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-gray-500">משתמשים פעילים</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-gray-900">{stats.activeUsers}</p>
                  <p className="text-sm text-gray-500 mt-2">
                    {stats.activeRate}% מכלל המשתמשים
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-gray-500">סה"כ חברויות באירועים</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalMemberships}</p>
                  <p className="text-sm text-gray-500 mt-2">
                    memberships across all events
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  פעילות אחרונה במערכת
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentActivity.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">אין פעילות להצגה</p>
                  ) : (
                    recentActivity.map((activity, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          activity.type === 'user_join' ? 'bg-blue-500' : 'bg-orange-500'
                        }`} />
                        <div className="flex-1">
                          <p className="text-sm text-gray-900">{activity.description}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatIsraelDateTime(activity.date)}
                          </p>
                        </div>
                        {activity.type === 'user_join' && (
                          <Badge className="bg-blue-100 text-blue-800 text-xs">
                            משתמש חדש
                          </Badge>
                        )}
                        {activity.type === 'event_create' && (
                          <Badge className="bg-orange-100 text-orange-800 text-xs">
                            אירוע חדש
                          </Badge>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-orange-600" />
                  כל האירועים במערכת
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {events.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">אין אירועים להצגה</p>
                  ) : (
                    events.map(event => {
                      const owner = users.find(u => u.id === (event.ownerId || event.owner_id));
                      const memberCount = eventMembers.filter(m => (m.eventId || m.EventId) === event.id).length;
                      
                      return (
                        <div key={event.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          {event.coverImageUrl || event.cover_image_url ? (
                            <img 
                              src={event.coverImageUrl || event.cover_image_url} 
                              alt={event.title}
                              className="w-16 h-16 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center">
                              <Calendar className="w-8 h-8 text-white" />
                            </div>
                          )}
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{event.title || event.name}</p>
                            <p className="text-sm text-gray-500">
                              יוצר: {owner?.name || owner?.email || 'לא ידוע'} • {memberCount} משתתפים
                            </p>
                            <p className="text-xs text-gray-400">
                              נוצר: {formatIsraelDate(event.created_date || event.createdAt || event.created_at)}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(createPageUrl(`EventDetail?id=${event.id}`))}
                          >
                            צפה באירוע
                          </Button>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Feedback Tab */}
          <TabsContent value="feedback" className="space-y-6">
            <ManageFeedback user={user} />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            {/* Event Type Classification */}
            <EventTypeClassification />

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-green-600" />
                  קטגוריות לאישורי הגעה (RSVP)
                </CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  הגדר אילו קטגוריות של אירועים יכללו את הטאב של אישורי הגעה
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Current Categories */}
                <div className="flex flex-wrap gap-2">
                  {rsvpCategories.map((category, index) => (
                    <Badge 
                      key={index} 
                      className="bg-green-100 text-green-800 px-3 py-1.5 flex items-center gap-2"
                    >
                      {category}
                      <button
                        onClick={() => {
                          setRsvpCategories(prev => prev.filter((_, i) => i !== index));
                        }}
                        className="hover:bg-green-200 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>

                {/* Add New Category */}
                <div className="flex gap-2">
                  <Input
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="הוסף קטגוריה חדשה..."
                    className="flex-1"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && newCategory.trim()) {
                        if (!rsvpCategories.includes(newCategory.trim())) {
                          setRsvpCategories(prev => [...prev, newCategory.trim()]);
                        }
                        setNewCategory('');
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (newCategory.trim() && !rsvpCategories.includes(newCategory.trim())) {
                        setRsvpCategories(prev => [...prev, newCategory.trim()]);
                        setNewCategory('');
                      }
                    }}
                    disabled={!newCategory.trim()}
                  >
                    <Plus className="w-4 h-4 ml-1" />
                    הוסף
                  </Button>
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-4 border-t">
                  <Button
                    onClick={async () => {
                      setIsSavingCategories(true);
                      try {
                        // Save to localStorage for now - in production this would be saved to backend
                        localStorage.setItem('rsvp_categories', JSON.stringify(rsvpCategories));
                        toast.success('הקטגוריות נשמרו בהצלחה!');
                      } catch (error) {
                        toast.error('שגיאה בשמירת הקטגוריות');
                      } finally {
                        setIsSavingCategories(false);
                      }
                    }}
                    disabled={isSavingCategories}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isSavingCategories ? (
                      <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 ml-2" />
                    )}
                    שמור שינויים
                  </Button>
                </div>

                {/* Info Box */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                  <p className="text-sm text-blue-800">
                    <strong>💡 טיפ:</strong> כשאירוע שייך לאחת מהקטגוריות הללו, המארגנים יראו טאב "אישורי הגעה" 
                    שמאפשר לשלוח שאלון RSVP למוזמנים.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, user: deleteDialog.user })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                מחיקת משתמש
              </DialogTitle>
              <DialogDescription>
                האם אתה בטוח שברצונך למחוק את המשתמש{' '}
                <strong>{deleteDialog.user?.name || deleteDialog.user?.email}</strong>?
                <br />
                <span className="text-red-600 font-medium">פעולה זו אינה הפיכה!</span>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteDialog({ open: false, user: null })}
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
                מחק משתמש
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Message Dialog */}
        <Dialog open={bulkMessageDialog.open} onOpenChange={(open) => setBulkMessageDialog({ ...bulkMessageDialog, open })}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-500" />
                שלח הודעה המונית
              </DialogTitle>
              <DialogDescription>
                ההודעה תישלח ל-{bulkMessageDialog.selectedUsers.length} משתמשים
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  כותרת
                </label>
                <Input
                  value={bulkMessage.title}
                  onChange={(e) => setBulkMessage({ ...bulkMessage, title: e.target.value })}
                  placeholder="לדוגמה: עדכון חשוב"
                  disabled={isSendingBulk}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  הודעה
                </label>
                <Textarea
                  value={bulkMessage.message}
                  onChange={(e) => setBulkMessage({ ...bulkMessage, message: e.target.value })}
                  placeholder="כתוב את ההודעה כאן..."
                  rows={5}
                  disabled={isSendingBulk}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setBulkMessageDialog({ open: false, selectedUsers: [] })}
                disabled={isSendingBulk}
              >
                ביטול
              </Button>
              <Button
                onClick={handleBulkMessage}
                disabled={isSendingBulk || !bulkMessage.title.trim() || !bulkMessage.message.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSendingBulk ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    שולח...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 ml-2" />
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
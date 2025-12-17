import React, { useState, useEffect } from 'react';
import { getEventRSVPs, deleteEventRSVP, updateEvent } from '@/components/instabackService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, Check, X, HelpCircle, Trash2, Loader2, 
  Copy, Share2, UserPlus, BarChart3, RefreshCw,
  Phone, MessageSquare, Download, FileSpreadsheet, FileText, Bell, BellOff
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';

export default function RSVPTab({ eventId, event, isManager }) {
  const [rsvps, setRsvps] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [notifyOnRsvp, setNotifyOnRsvp] = useState(event?.notifyOnRsvp !== false);
  const [isUpdatingNotify, setIsUpdatingNotify] = useState(false);

  const loadRSVPs = async () => {
    if (!eventId) return;
    
    setIsLoading(true);
    try {
      const rsvpList = await getEventRSVPs(eventId);
      const rsvpArray = Array.isArray(rsvpList) ? rsvpList : [];
      setRsvps(rsvpArray);
      
      // Calculate stats locally
      const calculatedStats = {
        total: rsvpArray.length,
        attending: 0,
        notAttending: 0,
        maybe: 0,
        totalGuests: 0
      };
      
      rsvpArray.forEach(rsvp => {
        if (rsvp.attendance === 'yes') {
          calculatedStats.attending++;
          calculatedStats.totalGuests += (rsvp.guestCount || 1);
        } else if (rsvp.attendance === 'no') {
          calculatedStats.notAttending++;
        } else if (rsvp.attendance === 'maybe') {
          calculatedStats.maybe++;
        }
      });
      
      setStats(calculatedStats);
    } catch (error) {
      console.error('Failed to load RSVPs:', error);
      // Don't show error toast if table doesn't exist yet (404)
      if (!error?.message?.includes('404')) {
        toast.error('שגיאה בטעינת התשובות');
      }
      // Set empty state
      setRsvps([]);
      setStats({ total: 0, attending: 0, notAttending: 0, maybe: 0, totalGuests: 0 });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRSVPs();
  }, [eventId]);

  const handleDeleteRSVP = async (rsvpId) => {
    if (!window.confirm('האם למחוק את התשובה?')) return;
    
    try {
      await deleteEventRSVP(rsvpId);
      toast.success('התשובה נמחקה');
      loadRSVPs();
    } catch (error) {
      console.error('Failed to delete RSVP:', error);
      toast.error('שגיאה במחיקת התשובה');
    }
  };

  const getRSVPLink = () => {
    return `https://register.plan-ora.net${createPageUrl(`EventRSVP?id=${eventId}`)}`;
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getRSVPLink());
      setCopiedLink(true);
      toast.success('הקישור הועתק!');
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      toast.error('שגיאה בהעתקת הקישור');
    }
  };

  const handleShareWhatsApp = () => {
    const ownerName = event?.ownerName || event?.owner_name || '';
    const ownerText = ownerName ? `\n👤 מזמין: ${ownerName}` : '';
    const message = `🎉 הוזמנת לאירוע "${event?.title || 'אירוע'}"!${ownerText}\n\n📋 לחץ/י על הקישור כדי לאשר הגעה:\n${getRSVPLink()}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleToggleNotify = async (checked) => {
    setIsUpdatingNotify(true);
    try {
      await updateEvent(eventId, { notifyOnRsvp: checked });
      setNotifyOnRsvp(checked);
      toast.success(checked ? 'התראות אישור הגעה הופעלו' : 'התראות אישור הגעה כובו');
    } catch (error) {
      console.error('Failed to update notification setting:', error);
      toast.error('שגיאה בעדכון ההגדרה');
    } finally {
      setIsUpdatingNotify(false);
    }
  };

  const getAttendanceIcon = (attendance) => {
    switch (attendance) {
      case 'yes': return <Check className="w-4 h-4 text-green-600" />;
      case 'no': return <X className="w-4 h-4 text-red-600" />;
      case 'maybe': return <HelpCircle className="w-4 h-4 text-yellow-600" />;
      default: return null;
    }
  };

  const getAttendanceBadge = (attendance) => {
    switch (attendance) {
      case 'yes': return <Badge className="bg-green-100 text-green-700">מגיע/ה</Badge>;
      case 'no': return <Badge className="bg-red-100 text-red-700">לא מגיע/ה</Badge>;
      case 'maybe': return <Badge className="bg-yellow-100 text-yellow-700">אולי</Badge>;
      default: return null;
    }
  };

  const getAttendanceText = (attendance) => {
    switch (attendance) {
      case 'yes': return 'מגיע/ה';
      case 'no': return 'לא מגיע/ה';
      case 'maybe': return 'אולי';
      default: return '';
    }
  };

  const exportToCSV = () => {
    if (rsvps.length === 0) {
      toast.error('אין נתונים לייצוא');
      return;
    }

    const headers = ['שם', 'סטטוס', 'כמות אורחים', 'טלפון', 'הערות', 'תאריך'];
    const rows = rsvps.map(rsvp => [
      rsvp.name || '',
      getAttendanceText(rsvp.attendance),
      rsvp.attendance === 'yes' ? (rsvp.guestCount || 1) : 0,
      rsvp.phone || '',
      rsvp.notes || '',
      rsvp.submittedAt ? new Date(rsvp.submittedAt).toLocaleDateString('he-IL') : ''
    ]);

    // Add BOM for Hebrew support in Excel
    const BOM = '\uFEFF';
    const csvContent = BOM + [headers.join(','), ...rows.map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    )].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `אישורי_הגעה_${event?.title || 'אירוע'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('הקובץ הורד בהצלחה');
  };

  const exportToJSON = () => {
    if (rsvps.length === 0) {
      toast.error('אין נתונים לייצוא');
      return;
    }

    const exportData = rsvps.map(rsvp => ({
      שם: rsvp.name || '',
      סטטוס: getAttendanceText(rsvp.attendance),
      כמות_אורחים: rsvp.attendance === 'yes' ? (rsvp.guestCount || 1) : 0,
      טלפון: rsvp.phone || '',
      הערות: rsvp.notes || '',
      תאריך: rsvp.submittedAt || ''
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `אישורי_הגעה_${event?.title || 'אירוע'}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('הקובץ הורד בהצלחה');
  };

  const copyAsText = async () => {
    if (rsvps.length === 0) {
      toast.error('אין נתונים להעתקה');
      return;
    }

    let text = `📋 אישורי הגעה - ${event?.title || 'אירוע'}\n`;
    text += `סה"כ תשובות: ${stats?.total || 0}\n`;
    text += `מגיעים: ${stats?.attending || 0} (${stats?.totalGuests || 0} אורחים)\n`;
    text += `לא מגיעים: ${stats?.notAttending || 0}\n`;
    text += `אולי: ${stats?.maybe || 0}\n\n`;
    
    text += `--- רשימה מלאה ---\n`;
    rsvps.forEach(rsvp => {
      const status = rsvp.attendance === 'yes' ? '✅' : rsvp.attendance === 'no' ? '❌' : '❓';
      text += `${status} ${rsvp.name}`;
      if (rsvp.attendance === 'yes' && rsvp.guestCount > 1) {
        text += ` (+${rsvp.guestCount - 1})`;
      }
      if (rsvp.phone) {
        text += ` | ${rsvp.phone}`;
      }
      text += '\n';
    });

    try {
      await navigator.clipboard.writeText(text);
      toast.success('הטקסט הועתק!');
    } catch (err) {
      toast.error('שגיאה בהעתקה');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Card */}
      {stats && (
        <Card className="bg-gradient-to-r from-orange-50 to-rose-50 border-orange-200">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="w-5 h-5 text-orange-600" />
              סיכום תשובות
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                <div className="text-xs text-gray-600">סה"כ תשובות</div>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-green-600">{stats.attending}</div>
                <div className="text-xs text-green-700">מגיעים</div>
              </div>
              <div className="bg-red-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-red-600">{stats.notAttending}</div>
                <div className="text-xs text-red-700">לא מגיעים</div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-yellow-600">{stats.maybe}</div>
                <div className="text-xs text-yellow-700">אולי</div>
              </div>
            </div>
            {stats.totalGuests > 0 && (
              <div className="mt-3 text-center">
                <span className="text-sm text-gray-600">
                  סה"כ אורחים מגיעים: <strong className="text-green-600">{stats.totalGuests}</strong>
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Share Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Share2 className="w-5 h-5 text-blue-600" />
            שתף שאלון הגעה
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            שלח את הקישור לאנשים שרוצים לאשר הגעה בלי להירשם לאפליקציה
          </p>
          <div className="flex gap-2">
            <Button
              onClick={handleCopyLink}
              variant="outline"
              className="flex-1"
            >
              {copiedLink ? (
                <>
                  <Check className="w-4 h-4 ml-2 text-green-600" />
                  הועתק!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 ml-2" />
                  העתק קישור
                </>
              )}
            </Button>
            <Button
              onClick={handleShareWhatsApp}
              className="flex-1 bg-green-500 hover:bg-green-600"
            >
              <MessageSquare className="w-4 h-4 ml-2" />
              שתף בוואטסאפ
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings - Only for managers */}
      {isManager && (
        <Card className="bg-gradient-to-r from-orange-50 to-rose-50 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {notifyOnRsvp ? (
                <Bell className="w-5 h-5 text-orange-500 flex-shrink-0" />
              ) : (
                <BellOff className="w-5 h-5 text-gray-400 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">התראות אישור הגעה</p>
                <p className="text-sm text-gray-500">קבל התראה כשמישהו מגיב לשאלון</p>
              </div>
              <Switch
                checked={notifyOnRsvp}
                onCheckedChange={handleToggleNotify}
                disabled={isUpdatingNotify}
                className="w-11 h-6 flex-shrink-0 overflow-hidden data-[state=checked]:bg-orange-500 data-[state=checked]:[&>span]:!translate-x-4 [&>span]:h-5 [&>span]:w-5"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* RSVP List */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="w-5 h-5 text-purple-600" />
              רשימת תשובות ({rsvps.length})
            </CardTitle>
            <div className="flex items-center gap-1">
              {isManager && rsvps.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 ml-1" />
                      ייצוא
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={exportToCSV}>
                      <FileSpreadsheet className="w-4 h-4 ml-2" />
                      הורד כ-Excel (CSV)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={exportToJSON}>
                      <FileText className="w-4 h-4 ml-2" />
                      הורד כ-JSON
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={copyAsText}>
                      <Copy className="w-4 h-4 ml-2" />
                      העתק כטקסט
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <Button variant="ghost" size="sm" onClick={loadRSVPs}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {rsvps.length === 0 ? (
            <div className="text-center py-8">
              <UserPlus className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">עדיין לא התקבלו תשובות</p>
              <p className="text-sm text-gray-400 mt-1">שתף את הקישור כדי לקבל אישורי הגעה</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rsvps.map((rsvp) => (
                <div 
                  key={rsvp.id} 
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      rsvp.attendance === 'yes' ? 'bg-green-100' :
                      rsvp.attendance === 'no' ? 'bg-red-100' : 'bg-yellow-100'
                    }`}>
                      {getAttendanceIcon(rsvp.attendance)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{rsvp.name}</span>
                        {getAttendanceBadge(rsvp.attendance)}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        {rsvp.attendance === 'yes' && rsvp.guestCount > 1 && (
                          <span>{rsvp.guestCount} אנשים</span>
                        )}
                        {rsvp.phone && (
                          <a 
                            href={`tel:${rsvp.phone}`}
                            className="flex items-center gap-1 text-blue-600 hover:underline"
                          >
                            <Phone className="w-3 h-3" />
                            {rsvp.phone}
                          </a>
                        )}
                      </div>
                      {rsvp.notes && (
                        <p className="text-xs text-gray-500 mt-1">"{rsvp.notes}"</p>
                      )}
                    </div>
                  </div>
                  
                  {isManager && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteRSVP(rsvp.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
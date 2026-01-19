import React, { useState, useEffect } from 'react';
import { getEventRSVPs, deleteEventRSVP, updateEvent } from '@/components/instabackService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Users, Check, X, HelpCircle, Trash2, Loader2, 
  Copy, Share2, UserPlus, BarChart3, RefreshCw,
  Phone, MessageSquare, Download, FileSpreadsheet, Bell, BellOff, Link as LinkIcon,
  ChevronDown, ChevronUp, Search, Filter
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';
import InviteLinksManager from './InviteLinksManager';
import { openWhatsApp } from '@/components/utils/shareHelper';

export default function RSVPTab({ eventId, event, isManager }) {
  const [rsvps, setRsvps] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [notifyOnRsvp, setNotifyOnRsvp] = useState(event?.notifyOnRsvp !== false);
  const [isUpdatingNotify, setIsUpdatingNotify] = useState(false);
  
  // Collapsible states
  const [isLinksOpen, setIsLinksOpen] = useState(false);
  const [isRsvpListOpen, setIsRsvpListOpen] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

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
          // Ensure guestCount is treated as a number
          const count = parseInt(rsvp.guestCount, 10);
          calculatedStats.totalGuests += (!isNaN(count) && count > 0 ? count : 1);
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
    return `https://plan-ora.net${createPageUrl(`EventRSVP?id=${eventId}`)}`;
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

  const handleShareWhatsApp = async () => {
    const ownerName = event?.ownerName || event?.owner_name || '';
    const ownerText = ownerName ? `\n👤 מזמין: ${ownerName}` : '';
    const message = `🎉 הוזמנת לאירוע "${event?.title || 'אירוע'}"!${ownerText}\n\n📋 לחץ/י על הקישור כדי לאשר הגעה:\n${getRSVPLink()}`;
    await openWhatsApp(message);
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
      case 'yes': return <Badge className="bg-green-100 text-green-700 text-[10px]">מגיע/ה</Badge>;
      case 'no': return <Badge className="bg-red-100 text-red-700 text-[10px]">לא מגיע/ה</Badge>;
      case 'maybe': return <Badge className="bg-yellow-100 text-yellow-700 text-[10px]">אולי</Badge>;
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

  const copyAsText = async () => {
    if (rsvps.length === 0) {
      toast.error('אין נתונים להעתקה');
      return;
    }

    let text = `📋 אישורי הגעה - ${event?.title || 'אירוע'}\n`;
    text += `סה"כ תשובות: ${stats?.total || 0}\n`;
    text += `✅ מגיעים: ${stats?.totalGuests || 0} (${stats?.attending || 0} תשובות)\n`;
    text += `❌ לא מגיעים: ${stats?.notAttending || 0}\n`;
    text += `❓ אולי: ${stats?.maybe || 0}\n\n`;
    
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

  // Filter RSVPs
  const filteredRsvps = rsvps.filter(rsvp => {
    const matchesSearch = !searchQuery || 
      rsvp.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rsvp.phone?.includes(searchQuery);
    
    const matchesFilter = filterStatus === 'all' || rsvp.attendance === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Card - Always visible */}
      {stats && (
        <Card className="bg-gradient-to-r from-orange-50 to-rose-50 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-5 h-5 text-orange-600" />
              <span className="font-semibold text-gray-900">סיכום תשובות</span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-green-50 rounded-lg p-2.5">
                <div className="text-xl font-bold text-green-600">{stats.totalGuests || stats.attending}</div>
                <div className="text-[10px] text-green-700">מגיעים</div>
                {stats.attending > 0 && stats.totalGuests !== stats.attending && (
                  <div className="text-[9px] text-green-600 mt-0.5">({stats.attending} תשובות)</div>
                )}
              </div>
              <div className="bg-red-50 rounded-lg p-2.5">
                <div className="text-xl font-bold text-red-600">{stats.notAttending}</div>
                <div className="text-[10px] text-red-700">לא מגיעים</div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-2.5">
                <div className="text-xl font-bold text-yellow-600">{stats.maybe}</div>
                <div className="text-[10px] text-yellow-700">אולי</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Share Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Share2 className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-gray-900">שתף שאלון הגעה</span>
          </div>
          <p className="text-xs text-gray-600 mb-3">
            שלח את הקישור לאנשים שרוצים לאשר הגעה בלי להירשם לאפליקציה
          </p>
          <div className="flex gap-2">
            <Button
              onClick={handleCopyLink}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 ml-1.5 text-green-600" />
                  הועתק!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 ml-1.5" />
                  העתק קישור
                </>
              )}
            </Button>
            <Button
              onClick={handleShareWhatsApp}
              size="sm"
              className="flex-1 bg-green-500 hover:bg-green-600"
            >
              <MessageSquare className="w-3.5 h-3.5 ml-1.5" />
              שתף בוואטסאפ
            </Button>
          </div>
        </CardContent>
      </Card>



      {/* Invite Links - Collapsible - Only for managers */}
      {isManager && (
        <Collapsible open={isLinksOpen} onOpenChange={setIsLinksOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-2 cursor-pointer hover:bg-gray-50 transition-colors">
                <CardTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-purple-600" />
                    קישורי הזמנה עם הגבלות
                  </div>
                  {isLinksOpen ? (
                    <ChevronUp className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  )}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <p className="text-xs text-gray-600 mb-3">
                  צור קישורי הזמנה עם הגבלת מספר אורחים לכל קישור
                </p>
                <InviteLinksManager eventId={eventId} eventTitle={event?.title} />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Notification Settings - Only for managers */}
      {isManager && (
        <Card className="bg-gradient-to-r from-orange-50 to-rose-50 border-orange-200">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              {notifyOnRsvp ? (
                <Bell className="w-4 h-4 text-orange-500 flex-shrink-0" />
              ) : (
                <BellOff className="w-4 h-4 text-gray-400 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">התראות אישור הגעה</p>
                <p className="text-xs text-gray-500">קבל התראה כשמישהו מגיב לשאלון</p>
              </div>
              <Switch
                checked={notifyOnRsvp}
                onCheckedChange={handleToggleNotify}
                disabled={isUpdatingNotify}
                className="w-10 h-5 flex-shrink-0 overflow-hidden data-[state=checked]:bg-orange-500 data-[state=checked]:[&>span]:!translate-x-4 [&>span]:h-4 [&>span]:w-4"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* RSVP List - Collapsible */}
      <Collapsible open={isRsvpListOpen} onOpenChange={setIsRsvpListOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-2 cursor-pointer hover:bg-gray-50 transition-colors">
              <CardTitle className="flex items-center justify-between text-base">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-600" />
                  רשימת תשובות ({rsvps.length})
                </div>
                <div className="flex items-center gap-2">
                  {isManager && rsvps.length > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="outline" size="sm" className="h-7 px-2">
                          <Download className="w-3.5 h-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={exportToCSV}>
                          <FileSpreadsheet className="w-4 h-4 ml-2" />
                          הורד כ-Excel (CSV)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={copyAsText}>
                          <Copy className="w-4 h-4 ml-2" />
                          העתק כטקסט
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={(e) => { e.stopPropagation(); loadRSVPs(); }}
                    className="h-7 w-7 p-0"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </Button>
                  {isRsvpListOpen ? (
                    <ChevronUp className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  )}
                </div>
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              {rsvps.length === 0 ? (
                <div className="text-center py-6">
                  <UserPlus className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">עדיין לא התקבלו תשובות</p>
                  <p className="text-xs text-gray-400 mt-1">שתף את הקישור כדי לקבל אישורי הגעה</p>
                </div>
              ) : (
                <>
                  {/* Filters */}
                  <div className="flex gap-2 mb-3">
                    <div className="relative flex-1">
                      <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <Input
                        placeholder="חיפוש לפי שם או טלפון..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-8 pr-8 text-sm"
                      />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 px-2">
                          <Filter className="w-3.5 h-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setFilterStatus('all')}>
                          הכל ({rsvps.length})
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setFilterStatus('yes')}>
                          <Check className="w-3.5 h-3.5 ml-2 text-green-600" />
                          מגיעים ({rsvps.filter(r => r.attendance === 'yes').length})
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setFilterStatus('no')}>
                          <X className="w-3.5 h-3.5 ml-2 text-red-600" />
                          לא מגיעים ({rsvps.filter(r => r.attendance === 'no').length})
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setFilterStatus('maybe')}>
                          <HelpCircle className="w-3.5 h-3.5 ml-2 text-yellow-600" />
                          אולי ({rsvps.filter(r => r.attendance === 'maybe').length})
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Filter indicator */}
                  {filterStatus !== 'all' && (
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary" className="text-xs">
                        {filterStatus === 'yes' && 'מציג רק מגיעים'}
                        {filterStatus === 'no' && 'מציג רק לא מגיעים'}
                        {filterStatus === 'maybe' && 'מציג רק אולי'}
                      </Badge>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setFilterStatus('all')}
                        className="h-5 px-1 text-xs"
                      >
                        נקה
                      </Button>
                    </div>
                  )}

                  {/* RSVP List */}
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {filteredRsvps.length === 0 ? (
                      <p className="text-center text-gray-500 text-sm py-4">
                        לא נמצאו תוצאות
                      </p>
                    ) : (
                      filteredRsvps.map((rsvp) => (
                        <div 
                          key={rsvp.id} 
                          className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center gap-2.5 flex-1 min-w-0">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                              rsvp.attendance === 'yes' ? 'bg-green-100' :
                              rsvp.attendance === 'no' ? 'bg-red-100' : 'bg-yellow-100'
                            }`}>
                              {getAttendanceIcon(rsvp.attendance)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-medium text-gray-900 text-sm truncate">{rsvp.name}</span>
                                {getAttendanceBadge(rsvp.attendance)}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                {rsvp.attendance === 'yes' && rsvp.guestCount > 1 && (
                                  <span className="text-green-600 font-medium">{rsvp.guestCount} אנשים</span>
                                )}
                                {rsvp.phone && (
                                  <a 
                                    href={`tel:${rsvp.phone}`}
                                    className="flex items-center gap-0.5 text-blue-600 hover:underline"
                                  >
                                    <Phone className="w-3 h-3" />
                                    {rsvp.phone}
                                  </a>
                                )}
                              </div>
                              {rsvp.notes && (
                                <p className="text-[10px] text-gray-500 mt-0.5 truncate">"{rsvp.notes}"</p>
                              )}
                            </div>
                          </div>
                          
                          {isManager && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteRSVP(rsvp.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0 flex-shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                  
                  {/* Results count */}
                  <p className="text-xs text-gray-400 text-center mt-2">
                    מציג {filteredRsvps.length} מתוך {rsvps.length} תשובות
                  </p>
                </>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>


    </div>
  );
}
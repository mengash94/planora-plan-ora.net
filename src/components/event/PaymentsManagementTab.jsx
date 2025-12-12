import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Wallet, Users, Check, Clock, RefreshCw, Search, Filter, DollarSign, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { updateEventMember } from '@/components/instabackService';
import { formatIsraelDate } from '@/components/utils/dateHelpers';

const PAYMENT_STATUS_CONFIG = {
  pending: { label: 'ממתין לתשלום', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  paid: { label: 'שולם', color: 'bg-green-100 text-green-800', icon: Check },
  refunded: { label: 'הוחזר', color: 'bg-blue-100 text-blue-800', icon: RefreshCw }
};

export default function PaymentsManagementTab({ 
  eventId, 
  members = [], 
  memberships = [],
  currentUser, 
  isManager, 
  participationCost = 0,
  hidePaymentsFromMembers = false,
  isReadOnly = false 
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [memberPayments, setMemberPayments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isUpdating, setIsUpdating] = useState(null);

  // Load member payment statuses
  const loadPaymentData = useCallback(async () => {
    if (!eventId) return;
    setIsLoading(true);
    
    try {
      // Combine members with their membership payment data
      const paymentsData = members.map(member => {
        const membership = memberships.find(m => 
          (m.user_id === member.id || m.userId === member.id)
        );
        
        return {
          id: member.id,
          name: member.name || member.full_name || member.email || 'משתמש',
          email: member.email || '',
          membershipId: membership?.id,
          paymentStatus: membership?.paymentStatus || membership?.payment_status || 'pending',
          paymentDate: membership?.paymentDate || membership?.payment_date || null,
          paymentNote: membership?.paymentNote || membership?.payment_note || '',
          role: membership?.role || 'member'
        };
      });
      
      setMemberPayments(paymentsData);
    } catch (error) {
      console.error('[PaymentsManagement] Failed to load payment data:', error);
      toast.error('שגיאה בטעינת נתוני התשלומים');
    } finally {
      setIsLoading(false);
    }
  }, [eventId, members, memberships]);

  useEffect(() => {
    loadPaymentData();
  }, [loadPaymentData]);

  // Update payment status
  const handleUpdatePaymentStatus = async (membershipId, memberId, newStatus, note = '') => {
    if (!membershipId || isUpdating) return;
    
    setIsUpdating(memberId);
    
    try {
      const updateData = {
        paymentStatus: newStatus,
        payment_status: newStatus
      };
      
      if (newStatus === 'paid') {
        updateData.paymentDate = new Date().toISOString();
        updateData.payment_date = new Date().toISOString();
      }
      
      if (note) {
        updateData.paymentNote = note;
        updateData.payment_note = note;
      }
      
      await updateEventMember(membershipId, updateData);
      
      // Update local state
      setMemberPayments(prev => prev.map(mp => 
        mp.id === memberId 
          ? { ...mp, paymentStatus: newStatus, paymentDate: newStatus === 'paid' ? new Date().toISOString() : mp.paymentDate, paymentNote: note || mp.paymentNote }
          : mp
      ));
      
      toast.success('סטטוס התשלום עודכן');
    } catch (error) {
      console.error('[PaymentsManagement] Failed to update payment:', error);
      toast.error('שגיאה בעדכון סטטוס התשלום');
    } finally {
      setIsUpdating(null);
    }
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const total = memberPayments.length;
    const paid = memberPayments.filter(m => m.paymentStatus === 'paid').length;
    const pending = memberPayments.filter(m => m.paymentStatus === 'pending').length;
    const refunded = memberPayments.filter(m => m.paymentStatus === 'refunded').length;
    
    const totalExpected = total * participationCost;
    const totalCollected = paid * participationCost;
    const totalPending = pending * participationCost;
    
    return { total, paid, pending, refunded, totalExpected, totalCollected, totalPending };
  }, [memberPayments, participationCost]);

  // Filter members
  const filteredMembers = useMemo(() => {
    let filtered = [...memberPayments];
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(m => 
        m.name?.toLowerCase().includes(query) || 
        m.email?.toLowerCase().includes(query)
      );
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(m => m.paymentStatus === statusFilter);
    }
    
    // Sort: organizers first, then by name
    filtered.sort((a, b) => {
      if (a.role === 'organizer' && b.role !== 'organizer') return -1;
      if (b.role === 'organizer' && a.role !== 'organizer') return 1;
      return (a.name || '').localeCompare(b.name || '');
    });
    
    return filtered;
  }, [memberPayments, searchQuery, statusFilter]);

  // Check if current user can see this tab
  const canView = isManager || !hidePaymentsFromMembers;
  
  if (!canView) {
    return (
      <Card className="border border-gray-200">
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">טאב התשלומים מוסתר ממשתתפים רגילים</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Cost Info Card */}
      {participationCost > 0 && (
        <Card className="bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">עלות השתתפות באירוע</p>
                <p className="text-3xl font-bold">₪{participationCost.toLocaleString()}</p>
              </div>
              <DollarSign className="w-12 h-12 text-green-200" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-0 bg-gray-50">
          <CardContent className="p-3 text-center">
            <Users className="w-5 h-5 text-gray-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-600">סה"כ משתתפים</p>
          </CardContent>
        </Card>
        
        <Card className="border-0 bg-green-50">
          <CardContent className="p-3 text-center">
            <Check className="w-5 h-5 text-green-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-green-600">{stats.paid}</p>
            <p className="text-xs text-gray-600">שילמו</p>
          </CardContent>
        </Card>
        
        <Card className="border-0 bg-yellow-50">
          <CardContent className="p-3 text-center">
            <Clock className="w-5 h-5 text-yellow-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            <p className="text-xs text-gray-600">ממתינים</p>
          </CardContent>
        </Card>
        
        <Card className="border-0 bg-blue-50">
          <CardContent className="p-3 text-center">
            <Wallet className="w-5 h-5 text-blue-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-blue-600">₪{stats.totalCollected.toLocaleString()}</p>
            <p className="text-xs text-gray-600">נגבה</p>
          </CardContent>
        </Card>
      </div>

      {/* Collection Progress */}
      {participationCost > 0 && stats.totalExpected > 0 && (
        <Card className="border border-gray-200">
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">התקדמות גביה</span>
              <span className="text-sm text-gray-600">
                ₪{stats.totalCollected.toLocaleString()} / ₪{stats.totalExpected.toLocaleString()}
              </span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
                style={{ width: `${Math.min((stats.totalCollected / stats.totalExpected) * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {((stats.totalCollected / stats.totalExpected) * 100).toFixed(0)}% מהתשלומים נגבו
            </p>
          </CardContent>
        </Card>
      )}

      {/* Members List */}
      <Card className="border border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            <span>רשימת משתתפים ותשלומים</span>
          </CardTitle>
          
          {/* Filters */}
          <div className="flex flex-wrap gap-2 mt-3">
            <div className="relative flex-1 min-w-[150px]">
              <Search className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
              <Input
                placeholder="חפש משתתף..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-9 h-9 text-sm"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32 h-9">
                <Filter className="w-3 h-3 ml-1" />
                <SelectValue placeholder="סטטוס" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">הכל</SelectItem>
                <SelectItem value="pending">ממתין</SelectItem>
                <SelectItem value="paid">שולם</SelectItem>
                <SelectItem value="refunded">הוחזר</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          {filteredMembers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p>לא נמצאו משתתפים</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredMembers.map((member) => {
                const statusConfig = PAYMENT_STATUS_CONFIG[member.paymentStatus] || PAYMENT_STATUS_CONFIG.pending;
                const StatusIcon = statusConfig.icon;
                const isOrganizer = member.role === 'organizer';
                
                return (
                  <div 
                    key={member.id}
                    className={`p-3 rounded-lg border ${isOrganizer ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 truncate">{member.name}</p>
                          {isOrganizer && (
                            <span className="px-1.5 py-0.5 text-[10px] bg-orange-200 text-orange-800 rounded">מארגן</span>
                          )}
                        </div>
                        {member.email && (
                          <p className="text-xs text-gray-500 truncate">{member.email}</p>
                        )}
                        {member.paymentDate && member.paymentStatus === 'paid' && (
                          <p className="text-xs text-green-600 mt-1">
                            שולם ב-{formatIsraelDate(member.paymentDate)}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {/* Status Badge */}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${statusConfig.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusConfig.label}
                        </span>
                        
                        {/* Quick Actions for Manager */}
                        {isManager && !isReadOnly && !isOrganizer && (
                          <Select
                            value={member.paymentStatus}
                            onValueChange={(value) => handleUpdatePaymentStatus(member.membershipId, member.id, value)}
                            disabled={isUpdating === member.id}
                          >
                            <SelectTrigger className="w-24 h-8 text-xs">
                              {isUpdating === member.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <SelectValue />
                              )}
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">ממתין</SelectItem>
                              <SelectItem value="paid">שולם</SelectItem>
                              <SelectItem value="refunded">הוחזר</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>
                    
                    {member.paymentNote && (
                      <p className="text-xs text-gray-600 mt-2 bg-white p-2 rounded">
                        📝 {member.paymentNote}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
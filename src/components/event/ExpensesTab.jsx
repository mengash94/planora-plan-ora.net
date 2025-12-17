import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Wallet, TrendingDown, PieChart, Filter, ArrowUpDown } from 'lucide-react';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import ExpenseForm from './ExpenseForm';
import ExpenseItem from './ExpenseItem';
import { createEventExpense, listEventExpenses, deleteEventExpense, updateEventExpense } from '@/components/instabackService';
import { toast } from 'sonner';

const CATEGORY_LABELS = {
  food: 'אוכל',
  drinks: 'משקאות',
  venue: 'מקום',
  decorations: 'קישוטים',
  entertainment: 'בידור',
  services: 'שירותים',
  transportation: 'הסעות',
  gifts: 'מתנות',
  other: 'אחר'
};

const CATEGORY_COLORS = {
  food: '#f97316',
  drinks: '#3b82f6',
  venue: '#8b5cf6',
  decorations: '#ec4899',
  entertainment: '#10b981',
  services: '#f59e0b',
  transportation: '#6366f1',
  gifts: '#14b8a6',
  other: '#6b7280'
};

export default function ExpensesTab({ eventId, members = [], currentUser, isManager, isReadOnly = false }) {
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('date');

  const membersById = useMemo(() => {
    const map = new Map();
    (members || []).forEach(u => {
      if (!u) return;
      const id = String(u.id || u.Id || '');
      if (id) {
        map.set(id, {
          id,
          name:
            (u.firstName || u.first_name)
              ? `${u.firstName || u.first_name} ${u.lastName || u.last_name || ''}`.trim()
              : (u.name || u.displayName || u.display_name || u.fullName || u.full_name || u.username || u.email || `משתתף ${id.slice(0,6)}`),
          email: u.email || '',
          phone: u.phone || ''
        });
      }
    });
    return map;
  }, [members]);

  const loadExpenses = useCallback(async () => {
    if (!eventId) return;
    setIsLoading(true);
    try {
      const res = await listEventExpenses(eventId);
      const expensesList = Array.isArray(res) ? res : (Array.isArray(res?.items) ? res.items : []);
      console.log('[ExpensesTab] Loaded expenses:', expensesList);
      setExpenses(expensesList);
    } catch (e) {
      console.error('[ExpensesTab] Failed to load expenses:', e);
      toast.error('שגיאה בטעינת התשלומים');
      setExpenses([]);
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  const handleUpdateExpense = async (expenseId, updates) => {
    try {
      await updateEventExpense(expenseId, updates);
      toast.success('ההוצאה עודכנה');
      await loadExpenses();
    } catch (e) {
      console.error('[ExpensesTab] Failed to update expense:', e);
      toast.error('שגיאה בעדכון ההוצאה');
    }
  };

  const handleCreate = async (payload) => {
    try {
      const newExpense = await createEventExpense(payload);
      console.log('[ExpensesTab] Created expense:', newExpense);
      toast.success('ההוצאה נוספה');
      await loadExpenses(); // Reload all expenses
    } catch (e) {
      console.error('[ExpensesTab] Failed to create expense:', e);
      toast.error('שגיאה בהוספת ההוצאה', { description: e?.message });
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteEventExpense(id);
      toast.success('ההוצאה נמחקה');
      setExpenses(prev => prev.filter(x => x.id !== id));
    } catch (e) {
      console.error('[ExpensesTab] Failed to delete expense:', e);
      toast.error('שגיאה במחיקה', { description: e?.message });
    }
  };

  const total = useMemo(() => {
    return expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  }, [expenses]);

  const categoryData = useMemo(() => {
    const grouped = {};
    expenses.forEach(exp => {
      const cat = exp.category || 'other';
      if (!grouped[cat]) grouped[cat] = 0;
      grouped[cat] += Number(exp.amount || 0);
    });
    return Object.entries(grouped).map(([key, value]) => ({
      name: CATEGORY_LABELS[key] || key,
      value,
      color: CATEGORY_COLORS[key] || '#6b7280'
    }));
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    let filtered = [...expenses];
    
    if (filterCategory !== 'all') {
      filtered = filtered.filter(e => e.category === filterCategory);
    }
    if (filterStatus !== 'all') {
      filtered = filtered.filter(e => e.status === filterStatus);
    }
    
    if (sortBy === 'date') {
      filtered.sort((a, b) => new Date(b.paymentDate || b.created_date) - new Date(a.paymentDate || a.created_date));
    } else if (sortBy === 'amount') {
      filtered.sort((a, b) => Number(b.amount) - Number(a.amount));
    } else if (sortBy === 'category') {
      filtered.sort((a, b) => (a.category || '').localeCompare(b.category || ''));
    }
    
    return filtered;
  }, [expenses, filterCategory, filterStatus, sortBy]);

  return (
    <div className="space-y-4">
      {/* Budget Overview Card */}
      <Card className="border border-gray-200 dark:border-gray-700 dark:bg-gray-800 overflow-hidden">
        <div className="bg-gradient-to-r from-orange-500 to-pink-500 p-4 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              <span className="font-bold text-lg">סיכום הוצאות</span>
            </div>
          </div>
          <div className="text-3xl font-bold">₪{total.toLocaleString()}</div>
        </div>
        
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <TrendingDown className="w-5 h-5 text-orange-600 mx-auto mb-1" />
            <p className="text-xs text-gray-600 dark:text-gray-400">סה״כ הוצאות</p>
            <p className="font-bold text-orange-600">₪{total.toLocaleString()}</p>
          </div>
          <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <Wallet className="w-5 h-5 text-blue-600 mx-auto mb-1" />
            <p className="text-xs text-gray-600 dark:text-gray-400">מספר הוצאות</p>
            <p className="font-bold text-blue-600">{expenses.length}</p>
          </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Chart */}
      {categoryData.length > 0 && (
        <Card className="border border-gray-200 dark:border-gray-700 dark:bg-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg dark:text-white flex items-center gap-2">
              <PieChart className="w-5 h-5 text-orange-500" />
              התפלגות לפי קטגוריה
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `₪${value.toLocaleString()}`} />
                  <Legend />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Expense Form */}
      {!isReadOnly && (
        <Card className="border border-gray-200 dark:border-gray-700 dark:bg-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg dark:text-white">הוסף הוצאה</CardTitle>
          </CardHeader>
          <CardContent>
            <ExpenseForm
              eventId={eventId}
              members={members}
              currentUser={currentUser}
              onCreated={handleCreate}
            />
          </CardContent>
        </Card>
      )}

      {/* Expenses List */}
      <Card className="border border-gray-200 dark:border-gray-700 dark:bg-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg dark:text-white flex items-center justify-between">
            <span>רשימת הוצאות</span>
            <span className="text-sm font-normal text-gray-600 dark:text-gray-400">
              {filteredExpenses.length} הוצאות
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Filters */}
          <div className="flex flex-wrap gap-2 pb-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-1">
              <Filter className="w-4 h-4 text-gray-500" />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-28 h-8 text-xs">
                <SelectValue placeholder="קטגוריה" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הקטגוריות</SelectItem>
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-24 h-8 text-xs">
                <SelectValue placeholder="סטטוס" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הסטטוסים</SelectItem>
                <SelectItem value="pending">ממתין</SelectItem>
                <SelectItem value="paid">שולם</SelectItem>
                <SelectItem value="reimbursed">קוזז</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-24 h-8 text-xs">
                <ArrowUpDown className="w-3 h-3 ml-1" />
                <SelectValue placeholder="מיון" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">תאריך</SelectItem>
                <SelectItem value="amount">סכום</SelectItem>
                <SelectItem value="category">קטגוריה</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300 bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
            <span className="font-medium">סה״כ הוצאות:</span>
            <span className="font-bold text-lg text-orange-600 dark:text-orange-400">₪{total.toFixed(2)}</span>
          </div>
          
          <Separator className="dark:bg-gray-700" />
          
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              <p className="text-lg mb-2">📝</p>
              <p>לא נרשמו הוצאות עדיין</p>
              <p className="text-sm mt-1">השתמש בטופס למעלה כדי להוסיף הוצאה ראשונה</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredExpenses.map((exp, index) => (
                <div key={exp.id || index}>
                  <ExpenseItem
                    expense={exp}
                    membersById={membersById}
                    currentUserId={currentUser?.id}
                    canManage={!!isManager && !isReadOnly}
                    onDelete={handleDelete}
                    onUpdate={handleUpdateExpense}
                    totalMembers={members.length}
                  />
                  {index < filteredExpenses.length - 1 && <Separator className="my-2" />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Wallet, Plus, Pencil, Trash2, Loader2, PieChart,
  Building2, UtensilsCrossed, Music, Camera, Sparkles,
  Car, Shirt, Mail, Gift, MoreHorizontal, TrendingUp, TrendingDown, Phone
} from 'lucide-react';
import { toast } from 'sonner';

// API functions - these will call InstaBack
const API_BASE_URL = 'https://instaback.ai/project/f78de3ce-0cab-4ccb-8442-0c5749792fe8/api';

const getToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('instaback_token');
  }
  return null;
};

const listEventBudgets = async (eventId) => {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/EventBudget?eventId=${encodeURIComponent(eventId)}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      'accept': 'application/json'
    }
  });
  if (!response.ok) throw new Error('Failed to load budgets');
  return response.json();
};

const createEventBudget = async (data) => {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/EventBudget`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      'accept': 'application/json'
    },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Failed to create budget');
  return response.json();
};

const updateEventBudget = async (id, data) => {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/EventBudget/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      'accept': 'application/json'
    },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Failed to update budget');
  return response.json();
};

const deleteEventBudget = async (id) => {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/EventBudget/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      'accept': 'application/json'
    }
  });
  if (!response.ok) throw new Error('Failed to delete budget');
  return { success: true };
};

const CATEGORIES = [
  { value: 'venue', label: 'מקום/אולם', icon: Building2, color: 'bg-blue-500' },
  { value: 'catering', label: 'קייטרינג/אוכל', icon: UtensilsCrossed, color: 'bg-orange-500' },
  { value: 'music', label: 'מוזיקה/DJ', icon: Music, color: 'bg-purple-500' },
  { value: 'photography', label: 'צילום/וידאו', icon: Camera, color: 'bg-pink-500' },
  { value: 'decoration', label: 'עיצוב/קישוט', icon: Sparkles, color: 'bg-yellow-500' },
  { value: 'transportation', label: 'הסעות', icon: Car, color: 'bg-green-500' },
  { value: 'attire', label: 'לבוש', icon: Shirt, color: 'bg-indigo-500' },
  { value: 'invitations', label: 'הזמנות', icon: Mail, color: 'bg-teal-500' },
  { value: 'gifts', label: 'מתנות', icon: Gift, color: 'bg-red-500' },
  { value: 'other', label: 'אחר', icon: MoreHorizontal, color: 'bg-gray-500' },
];

const getCategoryInfo = (categoryValue) => {
  return CATEGORIES.find(c => c.value === categoryValue) || CATEGORIES[CATEGORIES.length - 1];
};

export default function BudgetTab({ eventId, isManager = false }) {
  const [budgets, setBudgets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    category: '',
    categoryName: '',
    plannedAmount: '',
    actualAmount: '',
    paidAmount: '',
    notes: '',
    vendorName: '',
    vendorPhone: ''
  });

  const loadBudgets = async () => {
    if (!eventId) return;
    setIsLoading(true);
    try {
      const data = await listEventBudgets(eventId);
      setBudgets(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load budgets:', error);
      setBudgets([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBudgets();
  }, [eventId]);

  const resetForm = () => {
    setFormData({
      category: '',
      categoryName: '',
      plannedAmount: '',
      actualAmount: '',
      paidAmount: '',
      notes: '',
      vendorName: '',
      vendorPhone: ''
    });
    setEditingBudget(null);
  };

  const handleOpenDialog = (budget = null) => {
    if (budget) {
      setEditingBudget(budget);
      setFormData({
        category: budget.category || '',
        categoryName: budget.categoryName || '',
        plannedAmount: budget.plannedAmount?.toString() || '',
        actualAmount: budget.actualAmount?.toString() || '',
        paidAmount: budget.paidAmount?.toString() || '',
        notes: budget.notes || '',
        vendorName: budget.vendorName || '',
        vendorPhone: budget.vendorPhone || ''
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.category) {
      toast.error('נא לבחור קטגוריה');
      return;
    }
    if (!formData.plannedAmount || Number(formData.plannedAmount) <= 0) {
      toast.error('נא להזין סכום מתוכנן');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        eventId,
        category: formData.category,
        categoryName: formData.category === 'other' ? formData.categoryName : '',
        plannedAmount: Number(formData.plannedAmount),
        actualAmount: Number(formData.actualAmount) || 0,
        paidAmount: Number(formData.paidAmount) || 0,
        notes: formData.notes,
        vendorName: formData.vendorName,
        vendorPhone: formData.vendorPhone
      };

      if (editingBudget) {
        await updateEventBudget(editingBudget.id, payload);
        toast.success('הקטגוריה עודכנה');
      } else {
        await createEventBudget(payload);
        toast.success('הקטגוריה נוספה');
      }
      
      setIsDialogOpen(false);
      resetForm();
      loadBudgets();
    } catch (error) {
      console.error('Failed to save budget:', error);
      toast.error('שגיאה בשמירה');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (budgetId) => {
    if (!window.confirm('האם למחוק את הקטגוריה?')) return;
    
    try {
      await deleteEventBudget(budgetId);
      toast.success('הקטגוריה נמחקה');
      loadBudgets();
    } catch (error) {
      console.error('Failed to delete budget:', error);
      toast.error('שגיאה במחיקה');
    }
  };

  // Calculate totals
  const totals = budgets.reduce((acc, b) => ({
    planned: acc.planned + (Number(b.plannedAmount) || 0),
    actual: acc.actual + (Number(b.actualAmount) || 0),
    paid: acc.paid + (Number(b.paidAmount) || 0)
  }), { planned: 0, actual: 0, paid: 0 });

  const overBudget = totals.actual > totals.planned;
  const budgetProgress = totals.planned > 0 ? Math.min((totals.actual / totals.planned) * 100, 100) : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <PieChart className="w-5 h-5 text-green-600" />
            סיכום תקציב
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">מתוכנן</p>
              <p className="text-xl font-bold text-gray-900">₪{totals.planned.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">בפועל</p>
              <p className={`text-xl font-bold ${overBudget ? 'text-red-600' : 'text-green-600'}`}>
                ₪{totals.actual.toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">שולם</p>
              <p className="text-xl font-bold text-blue-600">₪{totals.paid.toLocaleString()}</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>ניצול תקציב</span>
              <span className={overBudget ? 'text-red-600' : 'text-green-600'}>
                {budgetProgress.toFixed(0)}%
              </span>
            </div>
            <Progress 
              value={budgetProgress} 
              className={`h-2 ${overBudget ? '[&>div]:bg-red-500' : '[&>div]:bg-green-500'}`}
            />
          </div>

          {overBudget && (
            <div className="mt-3 flex items-center gap-2 text-red-600 text-sm">
              <TrendingUp className="w-4 h-4" />
              <span>חריגה מהתקציב: ₪{(totals.actual - totals.planned).toLocaleString()}</span>
            </div>
          )}
          {!overBudget && totals.planned > 0 && (
            <div className="mt-3 flex items-center gap-2 text-green-600 text-sm">
              <TrendingDown className="w-4 h-4" />
              <span>נותר: ₪{(totals.planned - totals.actual).toLocaleString()}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Button */}
      {isManager && (
        <Button 
          onClick={() => handleOpenDialog()} 
          className="w-full bg-orange-500 hover:bg-orange-600"
        >
          <Plus className="w-4 h-4 ml-2" />
          הוסף קטגוריה לתקציב
        </Button>
      )}

      {/* Budget Items */}
      {budgets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">עדיין לא הוגדרו קטגוריות תקציב</p>
            {isManager && (
              <p className="text-sm text-gray-400 mt-1">לחץ על "הוסף קטגוריה" כדי להתחיל</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {budgets.map((budget) => {
            const categoryInfo = getCategoryInfo(budget.category);
            const CategoryIcon = categoryInfo.icon;
            const itemProgress = budget.plannedAmount > 0 
              ? Math.min((budget.actualAmount / budget.plannedAmount) * 100, 100) 
              : 0;
            const itemOverBudget = (budget.actualAmount || 0) > (budget.plannedAmount || 0);

            return (
              <Card key={budget.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full ${categoryInfo.color} flex items-center justify-center flex-shrink-0`}>
                      <CategoryIcon className="w-5 h-5 text-white" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold text-gray-900">
                          {budget.category === 'other' && budget.categoryName 
                            ? budget.categoryName 
                            : categoryInfo.label}
                        </h4>
                        {isManager && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDialog(budget)}
                              className="h-8 w-8 p-0"
                            >
                              <Pencil className="w-4 h-4 text-gray-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(budget.id)}
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>

                      {budget.vendorName && (
                        <p className="text-sm text-gray-600 mb-1">
                          {budget.vendorName}
                          {budget.vendorPhone && (
                            <a href={`tel:${budget.vendorPhone}`} className="text-blue-600 mr-2">
                              <Phone className="w-3 h-3 inline mr-1" />
                              {budget.vendorPhone}
                            </a>
                          )}
                        </p>
                      )}

                      <div className="grid grid-cols-3 gap-2 text-sm mb-2">
                        <div>
                          <span className="text-gray-500">מתוכנן: </span>
                          <span className="font-medium">₪{(budget.plannedAmount || 0).toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">בפועל: </span>
                          <span className={`font-medium ${itemOverBudget ? 'text-red-600' : ''}`}>
                            ₪{(budget.actualAmount || 0).toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">שולם: </span>
                          <span className="font-medium text-blue-600">₪{(budget.paidAmount || 0).toLocaleString()}</span>
                        </div>
                      </div>

                      <Progress 
                        value={itemProgress} 
                        className={`h-1.5 ${itemOverBudget ? '[&>div]:bg-red-500' : '[&>div]:bg-green-500'}`}
                      />

                      {budget.notes && (
                        <p className="text-xs text-gray-500 mt-2">{budget.notes}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingBudget ? 'עריכת קטגוריה' : 'הוספת קטגוריה לתקציב'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>קטגוריה *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="בחר קטגוריה" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      <div className="flex items-center gap-2">
                        <cat.icon className="w-4 h-4" />
                        {cat.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.category === 'other' && (
              <div>
                <Label>שם הקטגוריה</Label>
                <Input
                  value={formData.categoryName}
                  onChange={(e) => setFormData({ ...formData, categoryName: e.target.value })}
                  placeholder="הזן שם קטגוריה"
                  className="mt-1"
                />
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>מתוכנן *</Label>
                <Input
                  type="number"
                  value={formData.plannedAmount}
                  onChange={(e) => setFormData({ ...formData, plannedAmount: e.target.value })}
                  placeholder="₪"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>בפועל</Label>
                <Input
                  type="number"
                  value={formData.actualAmount}
                  onChange={(e) => setFormData({ ...formData, actualAmount: e.target.value })}
                  placeholder="₪"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>שולם</Label>
                <Input
                  type="number"
                  value={formData.paidAmount}
                  onChange={(e) => setFormData({ ...formData, paidAmount: e.target.value })}
                  placeholder="₪"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label>שם ספק</Label>
              <Input
                value={formData.vendorName}
                onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
                placeholder="שם הספק"
                className="mt-1"
              />
            </div>

            <div>
              <Label>טלפון ספק</Label>
              <Input
                value={formData.vendorPhone}
                onChange={(e) => setFormData({ ...formData, vendorPhone: e.target.value })}
                placeholder="050-0000000"
                type="tel"
                className="mt-1"
              />
            </div>

            <div>
              <Label>הערות</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="הערות נוספות"
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              ביטול
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingBudget ? 'עדכן' : 'הוסף')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
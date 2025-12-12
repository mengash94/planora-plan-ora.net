import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, User, Users as UsersIcon, Receipt, CreditCard } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function ExpenseItem({ expense, membersById, currentUserId, canManage, onDelete, totalMembers }) {
  // Normalize field names
  const userId = expense.userId || expense.user_id || expense._uid;
  const paidForUserId = expense.paidForUserId || expense.paid_for_user_id;
  const isGeneral = expense.isGeneral ?? expense.is_general ?? true;
  const amount = Number(expense.amount || 0);
  const description = expense.description || '';

  // Get payer info
  const payer = membersById?.get(String(userId)) || { 
    name: 'משתמש לא ידוע', 
    email: '',
    phone: ''
  };

  // Get beneficiary info
  let beneficiaryText = 'כללי - לכולם';
  if (!isGeneral && paidForUserId) {
    const beneficiary = membersById?.get(String(paidForUserId)) || { 
      name: 'משתמש לא ידוע' 
    };
    beneficiaryText = beneficiary.name;
  }

  // Calculate split amount
  const splitAmount = isGeneral && totalMembers > 0 
    ? (amount / totalMembers).toFixed(2) 
    : amount.toFixed(2);

  // Handle Bit payment
  const handleBitPayment = () => {
    // Check if current user is trying to pay themselves
    if (String(userId) === String(currentUserId)) {
      toast.error('לא ניתן לשלם לעצמך', {
        description: 'זו ההוצאה שאתה שילמת'
      });
      return;
    }

    // Get payer's phone number
    const payerPhone = payer.phone;
    
    if (!payerPhone) {
      toast.error('אין מספר טלפון למשלם', {
        description: 'לא ניתן לפתוח את ביט ללא מספר טלפון'
      });
      return;
    }

    // Clean phone number (remove spaces, dashes, etc.)
    const cleanPhone = payerPhone.replace(/[^\d+]/g, '');
    
    // Add Israel country code if needed
    let phoneWithCountryCode = cleanPhone;
    if (cleanPhone.startsWith('0')) {
      phoneWithCountryCode = '972' + cleanPhone.substring(1);
    } else if (!cleanPhone.startsWith('+') && !cleanPhone.startsWith('972')) {
      phoneWithCountryCode = '972' + cleanPhone;
    }

    // Calculate amount to pay (if general expense, split amount, otherwise full amount)
    const amountToPay = isGeneral && totalMembers > 0 ? splitAmount : amount.toFixed(2);

    // Build Bit payment URL
    const bitUrl = `https://bit.ly/pay?phone=${phoneWithCountryCode}&amount=${amountToPay}`;
    
    console.log('[ExpenseItem] Opening Bit payment:', { 
      payerPhone, 
      cleanPhone, 
      phoneWithCountryCode, 
      amountToPay,
      bitUrl 
    });

    // Try to open Bit app
    try {
      // First try the app deep link
      const appUrl = `bit://pay?phone=${phoneWithCountryCode}&amount=${amountToPay}`;
      window.location.href = appUrl;
      
      // Fallback to web URL after a short delay if app doesn't open
      setTimeout(() => {
        window.open(bitUrl, '_blank');
      }, 1500);
      
      toast.success('פותח את אפליקציית ביט...', {
        description: `תשלום של ₪${amountToPay} ל-${payer.name}`
      });
    } catch (error) {
      console.error('[ExpenseItem] Failed to open Bit:', error);
      // Fallback to web URL
      window.open(bitUrl, '_blank');
      toast.info('נפתח בדפדפן', {
        description: 'אם יש לך את אפליקציית ביט, היא תיפתח אוטומטית'
      });
    }
  };

  return (
    <Card className="bg-white border border-gray-100 hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Right side - Details */}
          <div className="flex-1">
            {/* Payer */}
            <div className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4 text-orange-600" />
              <span className="font-semibold text-gray-900">{payer.name}</span>
              <span className="text-sm text-gray-500">שילם</span>
              {payer.phone && (
                <span className="text-xs text-gray-400">({payer.phone})</span>
              )}
            </div>

            {/* Description if exists */}
            {description && (
              <p className="text-sm text-gray-700 mb-2">{description}</p>
            )}

            {/* Beneficiary */}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              {isGeneral ? (
                <>
                  <UsersIcon className="w-4 h-4" />
                  <span>כללי - לכולם</span>
                </>
              ) : (
                <>
                  <User className="w-4 h-4" />
                  <span>עבור: {beneficiaryText}</span>
                </>
              )}
            </div>

            {/* Split info for general expenses */}
            {isGeneral && totalMembers > 0 && (
              <div className="text-xs text-gray-500 mt-1">
                ₪{splitAmount} לאדם ({totalMembers} משתתפים)
              </div>
            )}

            {/* Receipt badge */}
            {expense.receiptUrl && (
              <Badge variant="outline" className="mt-2">
                <Receipt className="w-3 h-3 ml-1" />
                יש קבלה
              </Badge>
            )}
          </div>

          {/* Left side - Amount and Actions */}
          <div className="flex flex-col items-end gap-2">
            <div className="text-xl font-bold text-orange-600">
              ₪{amount.toFixed(2)}
            </div>

            <div className="flex items-center gap-1">
              {/* Bit Payment Button - ALWAYS SHOW */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleBitPayment}
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                title="שלם דרך ביט"
              >
                <CreditCard className="w-4 h-4 ml-1" />
                <span className="text-xs font-semibold">ביט</span>
              </Button>

              {/* Delete button for managers or expense creator */}
              {(canManage || String(userId) === String(currentUserId)) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(expense.id)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
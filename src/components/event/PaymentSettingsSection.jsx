import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CreditCard, Phone, Building2, Check } from 'lucide-react';

const PAYMENT_METHODS = [
  { id: 'bit', label: 'ביט', icon: '💳', description: 'תשלום באפליקציית ביט' },
  { id: 'paybox', label: 'פייבוקס', icon: '📱', description: 'תשלום באפליקציית פייבוקס' },
  { id: 'bank_transfer', label: 'העברה בנקאית', icon: '🏦', description: 'העברה ישירה לחשבון בנק' }
];

export default function PaymentSettingsSection({ formData, setFormData }) {
  // Support multiple payment methods as array
  const selectedMethods = formData.paymentMethods || (formData.paymentMethod ? [formData.paymentMethod] : []);

  const togglePaymentMethod = (methodId) => {
    setFormData(prev => {
      const currentMethods = prev.paymentMethods || (prev.paymentMethod ? [prev.paymentMethod] : []);
      let newMethods;
      
      if (currentMethods.includes(methodId)) {
        // Remove method
        newMethods = currentMethods.filter(m => m !== methodId);
      } else {
        // Add method
        newMethods = [...currentMethods, methodId];
      }
      
      return {
        ...prev,
        paymentMethods: newMethods,
        paymentMethod: newMethods[0] || '', // Keep backward compatibility
      };
    });
  };

  const handleBankDetailsChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      bankDetails: {
        ...(prev.bankDetails || {}),
        [field]: value
      }
    }));
  };

  const isBitSelected = selectedMethods.includes('bit');
  const isPayboxSelected = selectedMethods.includes('paybox');
  const isBankSelected = selectedMethods.includes('bank_transfer');

  return (
    <div className="p-4 border-2 border-purple-200 rounded-lg bg-purple-50">
      <Label className="flex items-center gap-2 text-purple-800 mb-2">
        <CreditCard className="w-4 h-4" />
        אמצעי תשלום
      </Label>
      <p className="text-xs text-purple-700 mb-3">
        בחר אמצעי תשלום אחד או יותר (ניתן לבחור כמה)
      </p>

      {/* Payment Method Selection - Multiple */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
        {PAYMENT_METHODS.map(method => {
          const isSelected = selectedMethods.includes(method.id);
          return (
            <button
              key={method.id}
              type="button"
              onClick={() => togglePaymentMethod(method.id)}
              className={`p-3 rounded-lg border-2 text-right transition-all relative ${
                isSelected
                  ? 'border-purple-500 bg-purple-100'
                  : 'border-gray-200 bg-white hover:border-purple-300'
              }`}
            >
              {isSelected && (
                <div className="absolute top-2 left-2 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-xl">{method.icon}</span>
                <div>
                  <p className="font-medium text-gray-900 text-sm">{method.label}</p>
                  <p className="text-xs text-gray-500">{method.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Bit/Paybox Phone Number */}
      {(isBitSelected || isPayboxSelected) && (
        <div className="mt-4 p-3 bg-white rounded-lg border border-purple-200">
          <Label htmlFor="paymentPhone" className="flex items-center gap-2 text-purple-800 mb-2">
            <Phone className="w-4 h-4" />
            מספר טלפון {isBitSelected && isPayboxSelected ? 'לביט/פייבוקס' : isBitSelected ? 'לביט' : 'לפייבוקס'}
          </Label>
          <Input
            id="paymentPhone"
            type="tel"
            value={formData.paymentPhone || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, paymentPhone: e.target.value }))}
            placeholder="050-1234567"
            className="text-left"
            dir="ltr"
          />
          <p className="text-xs text-gray-500 mt-1">המספר שאליו יישלחו התשלומים</p>
        </div>
      )}

      {/* Bank Details */}
      {isBankSelected && (
        <div className="mt-4 p-3 bg-white rounded-lg border border-purple-200 space-y-3">
          <Label className="flex items-center gap-2 text-purple-800">
            <Building2 className="w-4 h-4" />
            פרטי חשבון בנק
          </Label>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="bankName" className="text-xs text-gray-600">שם הבנק</Label>
              <Input
                id="bankName"
                value={formData.bankDetails?.bankName || ''}
                onChange={(e) => handleBankDetailsChange('bankName', e.target.value)}
                placeholder="לאומי, הפועלים..."
              />
            </div>
            <div>
              <Label htmlFor="branchNumber" className="text-xs text-gray-600">מספר סניף</Label>
              <Input
                id="branchNumber"
                value={formData.bankDetails?.branchNumber || ''}
                onChange={(e) => handleBankDetailsChange('branchNumber', e.target.value)}
                placeholder="123"
                dir="ltr"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="accountNumber" className="text-xs text-gray-600">מספר חשבון</Label>
            <Input
              id="accountNumber"
              value={formData.bankDetails?.accountNumber || ''}
              onChange={(e) => handleBankDetailsChange('accountNumber', e.target.value)}
              placeholder="1234567"
              dir="ltr"
            />
          </div>
          
          <div>
            <Label htmlFor="accountHolder" className="text-xs text-gray-600">שם בעל החשבון</Label>
            <Input
              id="accountHolder"
              value={formData.bankDetails?.accountHolder || ''}
              onChange={(e) => handleBankDetailsChange('accountHolder', e.target.value)}
              placeholder="ישראל ישראלי"
            />
          </div>
        </div>
      )}
    </div>
  );
}
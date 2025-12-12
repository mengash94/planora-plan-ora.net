import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CreditCard, ExternalLink, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function PaymentButton({ event, className = '' }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [copied, setCopied] = useState(null);

  const participationCost = event?.participationCost || event?.participation_cost;
  const paymentMethod = event?.paymentMethod || event?.payment_method;
  const paymentPhone = event?.paymentPhone || event?.payment_phone;
  const bankDetails = event?.bankDetails || event?.bank_details;

  if (!participationCost || participationCost <= 0) {
    return null;
  }

  const handleBitPayment = () => {
    if (!paymentPhone) {
      toast.error('מספר טלפון לביט לא הוגדר');
      return;
    }
    
    // Clean phone number
    const cleanPhone = paymentPhone.replace(/[-\s]/g, '');
    
    // Bit deep link - opens Bit app
    const bitUrl = `https://www.bitpay.co.il/app/send?phone=${cleanPhone}&amount=${participationCost}`;
    
    window.open(bitUrl, '_blank');
    toast.success('מעבר לאפליקציית ביט');
  };

  const handlePayboxPayment = () => {
    if (!paymentPhone) {
      toast.error('מספר טלפון לפייבוקס לא הוגדר');
      return;
    }
    
    // Clean phone number
    const cleanPhone = paymentPhone.replace(/[-\s]/g, '');
    
    // Paybox deep link
    const payboxUrl = `https://payboxapp.page.link/?link=https://payboxapp.com/send?phone=${cleanPhone}&amount=${participationCost}&apn=com.payboxapp&isi=1151181127&ibi=com.payboxapp`;
    
    window.open(payboxUrl, '_blank');
    toast.success('מעבר לאפליקציית פייבוקס');
  };

  const copyToClipboard = async (text, field) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(field);
      toast.success('הועתק!');
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      toast.error('שגיאה בהעתקה');
    }
  };

  const renderPaymentContent = () => {
    if (paymentMethod === 'bit') {
      return (
        <div className="space-y-4">
          <div className="text-center p-4 bg-blue-50 rounded-xl">
            <p className="text-2xl mb-2">💳</p>
            <p className="text-lg font-bold text-blue-800">תשלום בביט</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">₪{participationCost}</p>
          </div>
          
          {paymentPhone && (
            <div className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">מספר טלפון</p>
                <p className="font-mono font-bold">{paymentPhone}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(paymentPhone, 'phone')}
              >
                {copied === 'phone' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          )}
          
          <Button
            onClick={handleBitPayment}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg"
          >
            <ExternalLink className="w-5 h-5 ml-2" />
            פתח את ביט ושלם
          </Button>
        </div>
      );
    }

    if (paymentMethod === 'paybox') {
      return (
        <div className="space-y-4">
          <div className="text-center p-4 bg-green-50 rounded-xl">
            <p className="text-2xl mb-2">📱</p>
            <p className="text-lg font-bold text-green-800">תשלום בפייבוקס</p>
            <p className="text-3xl font-bold text-green-600 mt-2">₪{participationCost}</p>
          </div>
          
          {paymentPhone && (
            <div className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">מספר טלפון</p>
                <p className="font-mono font-bold">{paymentPhone}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(paymentPhone, 'phone')}
              >
                {copied === 'phone' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          )}
          
          <Button
            onClick={handlePayboxPayment}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-lg"
          >
            <ExternalLink className="w-5 h-5 ml-2" />
            פתח את פייבוקס ושלם
          </Button>
        </div>
      );
    }

    if (paymentMethod === 'bank_transfer' && bankDetails) {
      return (
        <div className="space-y-4">
          <div className="text-center p-4 bg-purple-50 rounded-xl">
            <p className="text-2xl mb-2">🏦</p>
            <p className="text-lg font-bold text-purple-800">העברה בנקאית</p>
            <p className="text-3xl font-bold text-purple-600 mt-2">₪{participationCost}</p>
          </div>
          
          <div className="space-y-2">
            {bankDetails.bankName && (
              <div className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">שם הבנק</p>
                  <p className="font-bold">{bankDetails.bankName}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(bankDetails.bankName, 'bankName')}
                >
                  {copied === 'bankName' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            )}
            
            {bankDetails.branchNumber && (
              <div className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">מספר סניף</p>
                  <p className="font-mono font-bold">{bankDetails.branchNumber}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(bankDetails.branchNumber, 'branch')}
                >
                  {copied === 'branch' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            )}
            
            {bankDetails.accountNumber && (
              <div className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">מספר חשבון</p>
                  <p className="font-mono font-bold">{bankDetails.accountNumber}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(bankDetails.accountNumber, 'account')}
                >
                  {copied === 'account' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            )}
            
            {bankDetails.accountHolder && (
              <div className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">שם בעל החשבון</p>
                  <p className="font-bold">{bankDetails.accountHolder}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(bankDetails.accountHolder, 'holder')}
                >
                  {copied === 'holder' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            )}
          </div>
          
          <p className="text-xs text-gray-500 text-center">
            העתק את הפרטים ובצע העברה מאפליקציית הבנק שלך
          </p>
        </div>
      );
    }

    // No payment method configured - show all options
    return (
      <div className="space-y-4">
        <div className="text-center p-4 bg-orange-50 rounded-xl">
          <p className="text-2xl mb-2">💰</p>
          <p className="text-lg font-bold text-orange-800">עלות השתתפות</p>
          <p className="text-3xl font-bold text-orange-600 mt-2">₪{participationCost}</p>
        </div>
        
        <p className="text-sm text-gray-600 text-center">
          צור קשר עם מארגן האירוע לפרטי תשלום
        </p>
      </div>
    );
  };

  return (
    <>
      <Button
        onClick={() => setIsDialogOpen(true)}
        className={`bg-green-500 hover:bg-green-600 text-white ${className}`}
      >
        <CreditCard className="w-4 h-4 ml-2" />
        שלם ₪{participationCost}
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-green-500" />
              תשלום עבור האירוע
            </DialogTitle>
          </DialogHeader>
          
          {renderPaymentContent()}
        </DialogContent>
      </Dialog>
    </>
  );
}
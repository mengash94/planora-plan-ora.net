import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { UploadFile } from '@/integrations/Core';
import { Loader2, Paperclip } from 'lucide-react';

export default function ExpenseForm({ eventId, members = [], currentUser, onCreated }) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [scope, setScope] = useState('all'); // 'all' | 'specific'
  const [targetUserId, setTargetUserId] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUpload = async (file) => {
    if (!file) return;
    setIsUploading(true);
    try {
      const { file_url } = await UploadFile({ file });
      setReceiptUrl(file_url);
    } finally {
      setIsUploading(false);
    }
  };

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser?.id) return;
    if (!amount || isNaN(Number(amount))) return;

    setIsSubmitting(true);
    try {
      await onCreated({
        eventId,
        userId: currentUser.id,
        description: description.trim(),
        amount: Number(amount),
        isGeneral: scope === 'all',
        paidForUserId: scope === 'specific' ? targetUserId || null : null,
        receiptUrl: receiptUrl || null
      });
      // reset
      setDescription('');
      setAmount('');
      setScope('all');
      setTargetUserId('');
      setReceiptUrl('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
        <div className="sm:col-span-2">
          <Label className="text-sm">סכום (₪)</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
          />
        </div>
        <div className="sm:col-span-4">
          <Label className="text-sm">תיאור</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="למשל: קניית שתייה"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <Label className="text-sm">עבור</Label>
          <Select value={scope} onValueChange={setScope}>
            <SelectTrigger>
              <SelectValue placeholder="כללי או ספציפי" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל המשתתפים</SelectItem>
              <SelectItem value="specific">משתתף ספציפי</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className={`${scope === 'specific' ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
          <Label className="text-sm">בחר משתתף</Label>
          <Select value={targetUserId} onValueChange={setTargetUserId}>
            <SelectTrigger>
              <SelectValue placeholder="בחר משתתף" />
            </SelectTrigger>
            <SelectContent>
              {members.map((m) => (
                <SelectItem key={m.id || m.Id} value={String(m.id || m.Id)}>
                  {m.name || m.displayName || m.fullName || m.full_name || m.email || `משתתף ${(m.id || m.Id || '').toString().slice(0, 6)}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end">
          <label className="w-full">
            <span className="block text-sm mb-1">קבלה (אופציונלי)</span>
            <div className="flex items-center gap-2">
              <input type="file" className="hidden" id="expense-receipt" onChange={onFileChange} />
              <Button type="button" variant="outline" asChild disabled={isUploading}>
                <label htmlFor="expense-receipt" className="flex items-center gap-2 cursor-pointer">
                  {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                  העלה קובץ
                </label>
              </Button>
              {receiptUrl && <span className="text-xs text-green-600 truncate max-w-[160px]">קבלה הועלתה</span>}
            </div>
          </label>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          הוספת הוצאה
        </Button>
      </div>
    </form>
  );
}
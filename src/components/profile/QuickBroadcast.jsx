import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Zap, Loader2, ArrowRight, Users, Send } from 'lucide-react';
import { toast } from 'sonner';
import { listUsers, createNotificationsAndSendPushBulk } from '@/components/instabackService';

export default function QuickBroadcast({ onBack, currentUser }) {
  const [users, setUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState({
    title: '',
    content: ''
  });

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const data = await listUsers();
        const usersList = Array.isArray(data) ? data : (data?.items || []);
        setUsers(usersList);
      } catch (error) {
        console.error('Failed to load users:', error);
        toast.error('שגיאה בטעינת רשימת המשתמשים');
      } finally {
        setIsLoadingUsers(false);
      }
    };
    loadUsers();
  }, []);

  const handleSend = async () => {
    if (!message.title.trim() || !message.content.trim()) {
      toast.error('נא למלא כותרת ותוכן ההודעה');
      return;
    }

    const recipientIds = users
      .filter(u => u.id !== currentUser?.id)
      .map(u => String(u.id));

    if (recipientIds.length === 0) {
      toast.info('אין משתמשים אחרים במערכת');
      return;
    }

    if (!confirm(`האם לשלוח את ההודעה ל-${recipientIds.length} משתמשים?`)) {
      return;
    }

    setIsSending(true);
    try {
      await createNotificationsAndSendPushBulk({
        userIds: recipientIds,
        type: 'system_announcement',
        title: `📢 ${message.title}`,
        message: message.content,
        priority: 'high'
      });

      toast.success(`ההודעה נשלחה בהצלחה ל-${recipientIds.length} משתמשים! 🎉`);
      setMessage({ title: '', content: '' });
      
      if (onBack) {
        setTimeout(() => onBack(), 1500);
      }
    } catch (error) {
      console.error('Failed to send broadcast:', error);
      toast.error('שגיאה בשליחת ההודעה');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowRight className="w-5 h-5" />
          </Button>
        )}
        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
          <Zap className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">שליחה מהירה</h2>
          <p className="text-sm text-gray-500">שלח התראת Push לכל המשתמשים</p>
        </div>
      </div>

      <Card className="bg-blue-50 border border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm font-semibold text-blue-900">
                {isLoadingUsers ? 'טוען...' : `${users.filter(u => u.id !== currentUser?.id).length} נמענים`}
              </p>
              <p className="text-xs text-blue-700">ההודעה תישלח לכל המשתמשים הרשומים</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">תוכן ההודעה</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>כותרת *</Label>
            <Input
              value={message.title}
              onChange={(e) => setMessage({ ...message, title: e.target.value })}
              placeholder="לדוגמה: עדכון חשוב"
              maxLength={50}
              disabled={isSending}
            />
            <p className="text-xs text-gray-500">{message.title.length}/50 תווים</p>
          </div>

          <div className="space-y-2">
            <Label>תוכן ההודעה *</Label>
            <Textarea
              value={message.content}
              onChange={(e) => setMessage({ ...message, content: e.target.value })}
              placeholder="כתוב את תוכן ההודעה המלא כאן..."
              rows={6}
              maxLength={300}
              disabled={isSending}
            />
            <p className="text-xs text-gray-500">{message.content.length}/300 תווים</p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>⚠️ שים לב:</strong> ההודעה תישלח כהתראת Push ותופיע גם במרכז ההתראות של המשתמשים.
              וודא שהתוכן ברור ומובן.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            {onBack && (
              <Button variant="outline" onClick={onBack} disabled={isSending}>
                ביטול
              </Button>
            )}
            <Button
              onClick={handleSend}
              disabled={isSending || !message.title.trim() || !message.content.trim() || isLoadingUsers}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  שולח...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 ml-2" />
                  שלח לכולם
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
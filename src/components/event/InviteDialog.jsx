import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, MessageCircle, Mail, Users, Link as LinkIcon, Check, MessageSquare, Phone, Trash2, Share2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/components/AuthProvider';

export default function InviteDialog({ isOpen, onOpenChange, event, onCopyLink, onShareWhatsApp }) {
  const { user: currentUser } = useAuth();
  const [copied, setCopied] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [newContact, setNewContact] = useState({ first_name: '', phone: '' });

  if (!event) return null;

  // 1. שיפור חילוץ שם המזמין
  const inviterName = currentUser?.name || 
                     currentUser?.full_name || 
                     [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(' ') || 
                     currentUser?.email?.split('@')[0] || 
                     'חבר/ה';

  const generateInviteLink = () => {
    if (!event?.id) return '';
    const baseUrl = 'https://register.plan-ora.net';
    return `${baseUrl}/JoinEvent?id=${encodeURIComponent(event.id.toString().trim())}`;
  };

  const inviteLink = generateInviteLink();

  // 2. פונקציית עזר לפתיחת קישורים חיצוניים במובייל (פותר את בעיית הוואטסאפ)
  const openExternalLink = async (url) => {
    if (typeof window !== 'undefined' && window.Capacitor?.Plugins?.Browser) {
      try {
        await window.Capacitor.Plugins.Browser.open({ url, windowName: '_system' });
        return true;
      } catch (err) {
        console.error('Capacitor Browser failed', err);
      }
    }
    window.open(url, '_blank');
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      if (onCopyLink) onCopyLink();
    } catch (err) {
      // Fallback fallback
      const textArea = document.createElement('textarea');
      textArea.value = inviteLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // 3. שיתוף וואטסאפ כללי - משופר למובייל
  const handleWhatsAppShare = async () => {
    const message = `🎉 היי!\n\n${inviterName} מזמין/ה אותך לאירוע "${event.title}"!\n\nלחץ/י על הקישור כדי לראות את הפרטים ולהצטרף:\n${inviteLink}`;
    
    // אופציה א': שיתוף נייטיב (Share Sheet) - הכי מומלץ למובייל
    if (window.Capacitor?.Plugins?.Share) {
      try {
        await window.Capacitor.Plugins.Share.share({
          title: `הזמנה לאירוע: ${event.title}`,
          text: message,
          url: inviteLink,
          dialogTitle: 'שתף הזמנה',
        });
        if (onShareWhatsApp) onShareWhatsApp();
        return;
      } catch (err) {
        console.warn('Native share failed, falling back to URL');
      }
    }

    // אופציה ב': פתיחת וואטסאפ ישירות
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    await openExternalLink(whatsappUrl);
    if (onShareWhatsApp) onShareWhatsApp();
  };

  // 4. שליחת הזמנה לאיש קשר ספציפי
  const sendWhatsAppInvitation = async (contact) => {
    const message = `🎉 היי ${contact.first_name}!\n\n${inviterName} מזמין/ה אותך לאירוע "${event.title}"!\n\nלחץ/י על הקישור להצטרפות:\n${inviteLink}`;
    
    // ניקוי מספר טלפון והחלפת 0 בהתחלה ל-972 (ישראל)
    let cleanPhone = contact.phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '972' + cleanPhone.substring(1);
    }

    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    await openExternalLink(whatsappUrl);
  };

  const sendSMSInvitation = (contact) => {
    const message = `היי ${contact.first_name}! ${inviterName} מזמין/ה אותך לאירוע "${event.title}". הצטרף/י בקישור: ${inviteLink}`;
    let cleanPhone = contact.phone.replace(/\D/g, '');
    window.location.href = `sms:${cleanPhone}?body=${encodeURIComponent(message)}`;
  };

  const handleEmailShare = () => {
    const subject = `הזמנה לאירוע: ${event.title}`;
    const body = `היי!\n\n${inviterName} מזמין/ה אותך להצטרף לאירוע "${event.title}".\n\nלחצו על הקישור כדי לראות את הפרטים ולהצטרף:\n${inviteLink}`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  const handleAddContact = () => {
    if (newContact.phone) {
      setContacts([...contacts, { id: Date.now(), ...newContact }]);
      setNewContact({ first_name: '', phone: '' });
    } else {
      alert("נא להזין מספר טלפון");
    }
  };

  const renderContactItem = (contact) => (
    <div key={contact.id} className="flex items-center justify-between p-3 border-b last:border-b-0">
      <div className="text-right">
        <p className="font-medium text-gray-800">{contact.first_name || "ללא שם"}</p>
        <p className="text-sm text-gray-500">{contact.phone}</p>
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => sendWhatsAppInvitation(contact)}
          className="text-green-600 border-green-200 hover:bg-green-50"
        >
          <MessageSquare className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => sendSMSInvitation(contact)}
          className="text-blue-600 border-blue-200 hover:bg-blue-50"
        >
          <Phone className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setContacts(contacts.filter(c => c.id !== contact.id))}
          className="text-red-500"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md mx-auto rounded-t-xl sm:rounded-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 justify-center text-xl">
            <Users className="w-6 h-6 text-green-500" />
            הזמנת משתתפים
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 text-right" dir="rtl">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <h3 className="font-bold text-slate-900">{event.title}</h3>
            {event.location && <p className="text-sm text-slate-500">{event.location}</p>}
            <p className="text-xs text-slate-400 mt-2">מזמין: {inviterName}</p>
          </div>

          <Tabs defaultValue="quick" className="w-full">
            <TabsList className="grid grid-cols-3 w-full bg-slate-100 p-1">
              <TabsTrigger value="quick">שיתוף מהיר</TabsTrigger>
              <TabsTrigger value="link">קישור</TabsTrigger>
              <TabsTrigger value="contacts">מוזמנים</TabsTrigger>
            </TabsList>

            <TabsContent value="quick" className="space-y-3 mt-6">
              <Button
                onClick={handleWhatsAppShare}
                className="w-full bg-green-500 hover:bg-green-600 text-white h-14 text-lg font-semibold shadow-md"
              >
                <Share2 className="w-5 h-5 ml-2" />
                שלח הזמנה בוואטסאפ
              </Button>

              <Button
                onClick={handleEmailShare}
                variant="outline"
                className="w-full h-12 border-slate-200"
              >
                <Mail className="w-5 h-5 ml-2 text-slate-500" />
                שיתוף במייל
              </Button>
            </TabsContent>

            <TabsContent value="link" className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">קישור להעתקה:</Label>
                <div className="flex gap-2">
                  <Input value={inviteLink} readOnly className="bg-slate-50 text-left dir-ltr" />
                  <Button
                    onClick={handleCopyLink}
                    variant={copied ? "default" : "outline"}
                    className={copied ? "bg-green-500" : ""}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="contacts" className="space-y-4 mt-6">
              <div className="grid gap-3 p-4 border rounded-xl bg-slate-50/50">
                <Label className="font-semibold">הוספת מוזמן חדש</Label>
                <Input
                  placeholder="שם המוזמן"
                  value={newContact.first_name}
                  onChange={(e) => setNewContact({ ...newContact, first_name: e.target.value })}
                />
                <Input
                  placeholder="מספר טלפון (לדוגמה: 050...)"
                  type="tel"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                />
                <Button onClick={handleAddContact} className="w-full">הוסף לרשימה</Button>
              </div>

              <div className="max-h-[250px] overflow-y-auto border rounded-xl divide-y">
                {contacts.length > 0 ? (
                  contacts.map(renderContactItem)
                ) : (
                  <div className="p-8 text-center text-slate-400 text-sm">
                    רשימת המוזמנים שלך ריקה
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
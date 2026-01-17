import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, MessageCircle, Mail, Users, Link as LinkIcon, Check, MessageSquare, Phone, Trash2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/components/AuthProvider';
import { openWhatsApp, openSMS, openEmail } from '@/components/utils/shareHelper';
import InviteLinksManager from './InviteLinksManager';

export default function InviteDialog({ isOpen, onOpenChange, event, onCopyLink, onShareWhatsApp }) {
  const { user: currentUser } = useAuth();
  const [copied, setCopied] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [newContact, setNewContact] = useState({ first_name: '', phone: '' });

  if (!event) return null;

  // Get the name of the person sending the invitation (current user)
  const getInviterName = () => {
    if (!currentUser) return 'חבר/ה';
    
    return currentUser.name || 
           currentUser.full_name || 
           `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() ||
           currentUser.email?.split('@')[0] ||
           'חבר/ה';
  };

  const inviterName = getInviterName();

  // Function to generate the invite link
  const generateInviteLink = () => {
    if (!event?.id) return '';
    const baseUrl = 'https://register.plan-ora.net';
    const eventId = encodeURIComponent(event.id.toString().trim());
    return `${baseUrl}/JoinEvent?id=${eventId}`;
  };



  const handleCopyLink = async () => {
    const inviteLink = generateInviteLink();
    if (!inviteLink) return;

    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      if (onCopyLink) onCopyLink();
    } catch (err) {
      console.error('Failed to copy link:', err);
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

  const handleWhatsAppShare = async () => {
    const inviteLink = generateInviteLink();
    if (!inviteLink) return;

    const message = `היי!\n\n${inviterName} מזמין/ה אותך לאירוע "${event.title}"!\n\nלחץ/י על הקישור כדי לראות את הפרטים ולהצטרף:\n${inviteLink}`;
    
    await openWhatsApp(message);
    if (onShareWhatsApp) onShareWhatsApp();
  };

  const sendWhatsAppInvitation = async (contact) => {
    const inviteLink = generateInviteLink();
    if (!inviteLink) return;

    const message = `היי ${contact.first_name}!\n\n${inviterName} מזמין/ה אותך לאירוע "${event.title}"!\n\nלחץ/י על הקישור להצטרפות:\n${inviteLink}`;
    const cleanedPhoneNumber = contact.phone ? contact.phone.replace(/[^\d]/g, '') : '';
    
    await openWhatsApp(message, cleanedPhoneNumber);
  };

  const sendSMSInvitation = async (contact) => {
    const inviteLink = generateInviteLink();
    if (!inviteLink) return;

    const message = `היי ${contact.first_name}! ${inviterName} מזמין/ה אותך לאירוע "${event.title}" ב-Planora! הצטרף/י בקישור: ${inviteLink}`;
    const cleanedPhoneNumber = contact.phone ? contact.phone.replace(/[^\d]/g, '') : '';
    
    await openSMS(cleanedPhoneNumber, message);
  };

  const handleEmailShare = async () => {
    const inviteLink = generateInviteLink();
    if (!inviteLink) return;

    const subject = `הזמנה לאירוע: ${event.title}`;
    const body = `היי!\n\n${inviterName} מזמין/ה אותך להצטרף לאירוע "${event.title}".\n\nלחצו על הקישור כדי לראות את הפרטים ולהצטרף:\n${inviteLink}\n\nמחכים לכם!`;
    
    await openEmail({ subject, body });
  };

  const handleAddContact = () => {
    if (newContact.phone) {
      setContacts([...contacts, { id: Date.now(), ...newContact }]);
      setNewContact({ first_name: '', phone: '' });
    } else {
      alert("נא להזין מספר טלפון לאיש הקשר");
    }
  };

  const deleteContact = (id) => {
    setContacts(contacts.filter(contact => contact.id !== id));
  };

  const renderContactItem = (contact) => (
    <div key={contact.id} className="flex items-center justify-between p-3 border-b last:border-b-0">
      <div>
        <p className="font-medium text-gray-800">{contact.first_name || "ללא שם"}</p>
        <p className="text-sm text-gray-500">{contact.phone}</p>
      </div>
      <div className="flex gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => sendWhatsAppInvitation(contact)}
          className="text-green-600 border-green-200 hover:bg-green-50"
          title="שלח הזמנה בוואטסאפ"
        >
          <MessageSquare className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => sendSMSInvitation(contact)}
          className="text-blue-600 border-blue-200 hover:bg-blue-50"
          title="שלח SMS"
        >
          <Phone className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => deleteContact(contact.id)}
          className="text-red-500 hover:text-red-700 hover:bg-red-50"
          title="מחק איש קשר"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md mx-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-green-500" />
            הזמן חברים לאירוע
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Event Info */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-1">{event.title}</h3>
            {event.location && (
              <p className="text-sm text-gray-600">{event.location}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">אתה מזמין/ה בתור: {inviterName}</p>
          </div>

          {/* Share Options */}
          <Tabs defaultValue="quick" className="w-full">
            <TabsList className="grid grid-cols-4 w-full text-xs">
              <TabsTrigger value="quick">מהיר</TabsTrigger>
              <TabsTrigger value="link">קישור</TabsTrigger>
              <TabsTrigger value="contacts">אנשי קשר</TabsTrigger>
              <TabsTrigger value="limits">הגבלות</TabsTrigger>
            </TabsList>

            <TabsContent value="quick" className="space-y-3 mt-4">
              <Button
                onClick={handleWhatsAppShare}
                className="w-full bg-green-500 hover:bg-green-600 text-white h-12"
              >
                <MessageCircle className="w-5 h-5 ml-2" />
                שתף בוואטסאפ
              </Button>

              <Button
                onClick={handleEmailShare}
                variant="outline"
                className="w-full h-12"
              >
                <Mail className="w-5 h-5 ml-2" />
                שתף באימייל
              </Button>
            </TabsContent>

            <TabsContent value="link" className="space-y-4 mt-4">
              <div>
                <Label htmlFor="invite-link" className="text-sm font-medium text-gray-700">
                  קישור הזמנה
                </Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="invite-link"
                    value={generateInviteLink()}
                    readOnly
                    className="flex-1 bg-gray-50"
                  />
                  <Button
                    onClick={handleCopyLink}
                    variant="outline"
                    className={`px-3 ${copied ? 'bg-green-50 border-green-200' : ''}`}
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                {copied && (
                  <p className="text-xs text-green-600 mt-1">הקישור הועתק!</p>
                )}
              </div>

              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="flex items-start gap-2">
                  <LinkIcon className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-blue-700">
                    <p className="font-medium mb-1">איך זה עובד?</p>
                    <p>שלחו את הקישור לחברים ומשפחה. כשהם יכנסו, הם יוכלו להצטרף לאירוע ולראות את כל הפרטים.</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="contacts" className="space-y-4 mt-4">
              <div className="space-y-2 p-3 border rounded-md">
                <Label htmlFor="new-contact-name" className="text-sm font-medium text-gray-700">הוסף איש קשר חדש</Label>
                <Input
                  id="new-contact-name"
                  placeholder="שם (אופציונלי)"
                  value={newContact.first_name}
                  onChange={(e) => setNewContact({ ...newContact, first_name: e.target.value })}
                />
                <Input
                  id="new-contact-phone"
                  placeholder="מספר טלפון (לדוגמה: 972501234567)"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                  type="tel"
                />
                <Button onClick={handleAddContact} className="w-full mt-2">הוסף איש קשר</Button>
              </div>

              {contacts.length > 0 && (
                <div className="border rounded-md divide-y max-h-60 overflow-y-auto bg-white">
                  {contacts.map(renderContactItem)}
                </div>
              )}
              {contacts.length === 0 && (
                <p className="text-center text-sm text-gray-500 p-4">
                  הוסף אנשי קשר כדי לשלוח הזמנות ישירות בוואטסאפ/SMS.
                </p>
              )}
            </TabsContent>

            <TabsContent value="limits" className="mt-4">
              <InviteLinksManager eventId={event?.id} eventTitle={event?.title} />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
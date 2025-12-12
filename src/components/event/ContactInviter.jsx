
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus, Phone, Mail, MessageSquare, Trash2, Send, CheckCircle2, Clock, XCircle, AlertTriangle } from 'lucide-react';
import { Contact } from '@/entities/Contact';
import { addContact } from '@/functions/addContact';
import { deleteContact } from '@/functions/deleteContact';

export default function ContactInviter({ isOpen, onOpenChange, eventId, eventTitle, onContactAdded }) {
  const [contacts, setContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newContact, setNewContact] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    invitation_method: 'whatsapp',
    notes: ''
  });

  const loadContacts = useCallback(async () => {
    if (!eventId) return;
    
    setIsLoading(true);
    try {
      const eventContacts = await Contact.filter({ event_id: eventId }, '-created_date');
      setContacts(eventContacts);
    } catch (error) {
      console.error('Failed to load contacts:', error);
    }
    setIsLoading(false);
  }, [eventId]);

  useEffect(() => {
    if (isOpen && eventId) {
      loadContacts();
    }
  }, [isOpen, eventId, loadContacts]);

  const getStatusInfo = (status) => {
    switch (status) {
      case 'pending':
        return {
          icon: <Clock className="w-4 h-4" />,
          label: 'ממתין לשליחה',
          bgColor: 'bg-gray-100 text-gray-700',
          canUpdate: true
        };
      case 'sent':
        return {
          icon: <Send className="w-4 h-4" />,
          label: 'נשלח',
          bgColor: 'bg-blue-100 text-blue-700',
          canUpdate: true
        };
      case 'delivered':
        return {
          icon: <CheckCircle2 className="w-4 h-4" />,
          label: 'הגיע ליעד',
          bgColor: 'bg-green-100 text-green-700',
          canUpdate: false
        };
      case 'failed':
        return {
          icon: <XCircle className="w-4 h-4" />,
          label: 'שליחה נכשלה',
          bgColor: 'bg-red-100 text-red-700',
          canUpdate: true
        };
      default:
        return {
          icon: <Clock className="w-4 h-4" />,
          label: 'לא ידוע',
          bgColor: 'bg-gray-100 text-gray-500',
          canUpdate: true
        };
    }
  };

  const handleAddContact = async (e) => {
    e.preventDefault();
    if (!newContact.first_name || !newContact.last_name) return;

    setIsSubmitting(true);
    try {
      await addContact({
        ...newContact,
        event_id: eventId
      });
      
      setNewContact({
        first_name: '',
        last_name: '',
        phone: '',
        email: '',
        invitation_method: 'whatsapp',
        notes: ''
      });
      
      await loadContacts();
      onContactAdded?.();
    } catch (error) {
      console.error('Failed to add contact:', error);
      alert('שגיאה בהוספת איש קשר');
    }
    setIsSubmitting(false);
  };

  const handleDeleteContact = async (contactId, status) => {
    if (status === 'delivered') {
      alert('לא ניתן למחוק איש קשר שההזמנה שלו כבר הגיעה ליעד');
      return;
    }

    if (window.confirm('האם אתה בטוח שברצונך למחוק איש קשר זה?')) {
      try {
        await deleteContact({ contactId });
        await loadContacts();
        onContactAdded?.();
      } catch (error) {
        console.error('Failed to delete contact:', error);
        alert('שגיאה במחיקת איש הקשר');
      }
    }
  };

  const generateInviteMessage = () => {
    return `🎉 הוזמנת ל${eventTitle}!\n\nהצטרף אלינו לאירוע מיוחד. פרטים נוספים יגיעו בקרוב.\n\nמחכים לך! 💫`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-2xl">הזמנת אנשים לאירוע</DialogTitle>
          <p className="text-gray-600">הוסף אנשי קשר ושלח להם הזמנות לאירוע</p>
        </DialogHeader>

        <Tabs defaultValue="add" className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="add">הוספת איש קשר</TabsTrigger>
            <TabsTrigger value="list">רשימת אנשי קשר ({contacts.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="add" className="mt-6 space-y-6">
            <form onSubmit={handleAddContact} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">שם פרטי *</Label>
                  <Input
                    id="first_name"
                    value={newContact.first_name}
                    onChange={(e) => setNewContact({...newContact, first_name: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">שם משפחה *</Label>
                  <Input
                    id="last_name"
                    value={newContact.last_name}
                    onChange={(e) => setNewContact({...newContact, last_name: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">טלפון</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={newContact.phone}
                    onChange={(e) => setNewContact({...newContact, phone: e.target.value})}
                    placeholder="050-1234567"
                  />
                </div>
                <div>
                  <Label htmlFor="email">אימייל</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newContact.email}
                    onChange={(e) => setNewContact({...newContact, email: e.target.value})}
                    placeholder="example@gmail.com"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="invitation_method">אופן ההזמנה</Label>
                <Select value={newContact.invitation_method} onValueChange={(value) => setNewContact({...newContact, invitation_method: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-green-600" />
                        וואטסאפ
                      </div>
                    </SelectItem>
                    <SelectItem value="sms">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-blue-600" />
                        SMS
                      </div>
                    </SelectItem>
                    <SelectItem value="email">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-red-600" />
                        אימייל
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="notes">הערות (אופציונלי)</Label>
                <Textarea
                  id="notes"
                  value={newContact.notes}
                  onChange={(e) => setNewContact({...newContact, notes: e.target.value})}
                  placeholder="הערות נוספות על איש הקשר..."
                  rows={3}
                />
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">תצוגה מקדימה של ההזמנה:</h4>
                <p className="text-sm text-blue-800 whitespace-pre-line bg-white p-3 rounded border">
                  {generateInviteMessage()}
                </p>
              </div>

              <Button type="submit" disabled={isSubmitting || !newContact.first_name || !newContact.last_name} className="w-full">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Plus className="w-4 h-4 ml-2" />}
                הוסף איש קשר
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="list" className="mt-6">
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                </div>
              ) : contacts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p>עדיין לא הוספת אנשי קשר</p>
                </div>
              ) : (
                contacts.map((contact) => {
                  const statusInfo = getStatusInfo(contact.invitation_status);
                  return (
                    <Card key={contact.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h4 className="font-semibold text-lg">
                              {contact.first_name} {contact.last_name}
                            </h4>
                            <div className="space-y-1 mt-2 text-sm text-gray-600">
                              {contact.phone && (
                                <div className="flex items-center gap-2">
                                  <Phone className="w-4 h-4" />
                                  {contact.phone}
                                </div>
                              )}
                              {contact.email && (
                                <div className="flex items-center gap-2">
                                  <Mail className="w-4 h-4" />
                                  {contact.email}
                                </div>
                              )}
                              {contact.notes && (
                                <p className="text-gray-500 mt-2">{contact.notes}</p>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-3">
                            <Badge className={`${statusInfo.bgColor} flex items-center gap-1`}>
                              {statusInfo.icon}
                              {statusInfo.label}
                            </Badge>

                            <div className="flex gap-2">
                              {contact.invitation_method === 'whatsapp' && contact.phone && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={!statusInfo.canUpdate}
                                  onClick={() => {
                                    if (!statusInfo.canUpdate) return;
                                    const message = generateInviteMessage();
                                    const phoneNumber = contact.phone.replace(/\D/g, '');
                                    const whatsappUrl = `https://wa.me/972${phoneNumber.startsWith('0') ? phoneNumber.slice(1) : phoneNumber}?text=${encodeURIComponent(message)}`;
                                    window.open(whatsappUrl, '_blank');
                                  }}
                                  className="text-green-600 hover:text-green-700"
                                >
                                  <MessageSquare className="w-4 h-4" />
                                </Button>
                              )}

                              {statusInfo.canUpdate ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteContact(contact.id, contact.invitation_status)}
                                  className="text-red-500 hover:text-red-600"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              ) : (
                                <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                                  <AlertTriangle className="w-3 h-3" />
                                  לא ניתן לעדכן
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

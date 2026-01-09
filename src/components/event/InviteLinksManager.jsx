import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Copy, Check, Trash2, Plus, Link as LinkIcon, Users, 
  Loader2, Infinity, Settings
} from 'lucide-react';
import {
  createInviteLink,
  getInviteLinksByEvent,
  deleteInviteLink
} from '@/components/instabackService.js';
import { toast } from 'sonner';

export default function InviteLinksManager({ eventId, eventTitle }) {
  const [links, setLinks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newMaxGuests, setNewMaxGuests] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    if (eventId) {
      loadLinks();
    }
  }, [eventId]);

  const loadLinks = async () => {
    setIsLoading(true);
    try {
      const fetchedLinks = await getInviteLinksByEvent(eventId);
      setLinks(fetchedLinks || []);
    } catch (error) {
      console.error('Error loading invite links:', error);
      toast.error('שגיאה בטעינת הקישורים');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateLink = async () => {
    setIsCreating(true);
    try {
      const maxGuests = newMaxGuests === '' ? null : parseInt(newMaxGuests, 10);
      
      const newLink = await createInviteLink({
        eventId,
        maxGuests: maxGuests
      });

      setLinks([...links, newLink]);
      setNewMaxGuests('');
      toast.success('קישור חדש נוצר בהצלחה!');
    } catch (error) {
      console.error('Error creating invite link:', error);
      toast.error('שגיאה ביצירת קישור');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteLink = async (linkId) => {
    try {
      await deleteInviteLink(linkId);
      setLinks(links.filter(l => l.id !== linkId));
      toast.success('הקישור נמחק');
    } catch (error) {
      console.error('Error deleting invite link:', error);
      toast.error('שגיאה במחיקת קישור');
    }
  };

  const generateFullUrl = (code) => {
    return `https://register.plan-ora.net/JoinEvent?code=${code}`;
  };

  const handleCopyLink = async (link) => {
    const url = generateFullUrl(link.code);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(link.id);
      setTimeout(() => setCopiedId(null), 2000);
      toast.success('הקישור הועתק!');
    } catch (err) {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedId(link.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* הסבר */}
      <div className="bg-blue-50 p-3 rounded-lg">
        <div className="flex items-start gap-2">
          <Settings className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-blue-700">
            <p className="font-medium mb-1">קישורי הזמנה עם הגבלת אורחים</p>
            <p>צרו קישורים שונים עם מספר אורחים מקסימלי שונה לכל קישור. כך תוכלו לשלוט מי יכול להביא אורחים ומי לא.</p>
          </div>
        </div>
      </div>

      {/* יצירת קישור חדש */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <Label className="text-sm font-medium">יצירת קישור הזמנה חדש</Label>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                type="number"
                min="1"
                placeholder="מקסימום אורחים (השאר ריק לבלתי מוגבל)"
                value={newMaxGuests}
                onChange={(e) => setNewMaxGuests(e.target.value)}
              />
            </div>
            <Button
              onClick={handleCreateLink}
              disabled={isCreating}
              className="bg-green-500 hover:bg-green-600"
            >
              {isCreating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4 ml-1" />
                  צור קישור
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            השאירו ריק למספר אורחים בלתי מוגבל
          </p>
        </CardContent>
      </Card>

      {/* רשימת קישורים */}
      {links.length > 0 ? (
        <div className="space-y-2">
          <Label className="text-sm font-medium">קישורים קיימים</Label>
          {links.map((link) => (
            <Card key={link.id} className="bg-gray-50">
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <LinkIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-mono text-gray-600 truncate">
                        {link.code}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Users className="w-3 h-3" />
                      {link.maxGuests ? (
                        <span>עד {link.maxGuests} אורחים</span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Infinity className="w-3 h-3" />
                          ללא הגבלה
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyLink(link)}
                      className={copiedId === link.id ? 'bg-green-50 border-green-200' : ''}
                    >
                      {copiedId === link.id ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteLink(link.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-gray-500 text-sm">
          <LinkIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p>אין קישורים עם הגבלות עדיין</p>
          <p className="text-xs">צרו קישור חדש למעלה</p>
        </div>
      )}
    </div>
  );
}
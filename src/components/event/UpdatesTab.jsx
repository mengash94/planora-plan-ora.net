import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Plus, Megaphone, Pin, MoreVertical, Trash2, Edit, Loader2, AlertTriangle, Info, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { formatIsraelDate } from '@/components/utils/dateHelpers';
import { base44 } from '@/api/base44Client';

const priorityConfig = {
  low: { label: 'נמוכה', color: 'bg-gray-100 text-gray-700', icon: null },
  normal: { label: 'רגילה', color: 'bg-blue-100 text-blue-700', icon: Info },
  high: { label: 'גבוהה', color: 'bg-orange-100 text-orange-700', icon: Bell },
  urgent: { label: 'דחוף', color: 'bg-red-100 text-red-700', icon: AlertTriangle }
};

function UpdateCard({ update, canManage, onEdit, onDelete, onTogglePin }) {
  const priority = priorityConfig[update.priority] || priorityConfig.normal;
  const PriorityIcon = priority.icon;

  return (
    <Card className={`${update.isPinned ? 'ring-2 ring-orange-300 bg-orange-50/30' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {update.isPinned && (
                <Badge variant="outline" className="text-orange-600 border-orange-300">
                  <Pin className="w-3 h-3 ml-1" />
                  מוצמד
                </Badge>
              )}
              {update.priority !== 'normal' && (
                <Badge className={priority.color}>
                  {PriorityIcon && <PriorityIcon className="w-3 h-3 ml-1" />}
                  {priority.label}
                </Badge>
              )}
            </div>
            
            <h3 className="font-semibold text-gray-900 mb-1">{update.title}</h3>
            <p className="text-gray-700 text-sm whitespace-pre-wrap">{update.content}</p>
            
            <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
              <span>{update.authorName || 'מנהל'}</span>
              <span>•</span>
              <span>{formatIsraelDate(update.created_date || update.createdAt)}</span>
            </div>
          </div>

          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onTogglePin(update)}>
                  <Pin className="w-4 h-4 ml-2" />
                  {update.isPinned ? 'בטל הצמדה' : 'הצמד'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(update)}>
                  <Edit className="w-4 h-4 ml-2" />
                  ערוך
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(update)} className="text-red-600">
                  <Trash2 className="w-4 h-4 ml-2" />
                  מחק
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function UpdatesTab({ eventId, currentUser, canManage = false }) {
  const [updates, setUpdates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUpdate, setEditingUpdate] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'normal'
  });

  useEffect(() => {
    loadUpdates();
  }, [eventId]);

  const loadUpdates = async () => {
    try {
      setIsLoading(true);
      const data = await base44.entities.EventUpdate.filter({ eventId }, '-created_date');
      // Sort: pinned first, then by date
      const sorted = [...(data || [])].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.created_date || b.createdAt) - new Date(a.created_date || a.createdAt);
      });
      setUpdates(sorted);
    } catch (error) {
      console.error('Failed to load updates:', error);
      toast.error('שגיאה בטעינת העדכונים');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingUpdate(null);
    setFormData({ title: '', content: '', priority: 'normal' });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (update) => {
    setEditingUpdate(update);
    setFormData({
      title: update.title,
      content: update.content,
      priority: update.priority || 'normal'
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('נא למלא כותרת ותוכן');
      return;
    }

    setIsSaving(true);
    try {
      if (editingUpdate) {
        await base44.entities.EventUpdate.update(editingUpdate.id, {
          title: formData.title.trim(),
          content: formData.content.trim(),
          priority: formData.priority
        });
        toast.success('העדכון נשמר');
      } else {
        await base44.entities.EventUpdate.create({
          eventId,
          title: formData.title.trim(),
          content: formData.content.trim(),
          priority: formData.priority,
          authorId: currentUser?.id,
          authorName: currentUser?.name || currentUser?.firstName || currentUser?.email,
          isPinned: false
        });
        toast.success('העדכון פורסם');
      }
      setIsDialogOpen(false);
      loadUpdates();
    } catch (error) {
      console.error('Failed to save update:', error);
      toast.error('שגיאה בשמירת העדכון');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (update) => {
    if (!confirm(`למחוק את העדכון "${update.title}"?`)) return;
    
    try {
      await base44.entities.EventUpdate.delete(update.id);
      toast.success('העדכון נמחק');
      loadUpdates();
    } catch (error) {
      console.error('Failed to delete update:', error);
      toast.error('שגיאה במחיקת העדכון');
    }
  };

  const handleTogglePin = async (update) => {
    try {
      await base44.entities.EventUpdate.update(update.id, {
        isPinned: !update.isPinned
      });
      toast.success(update.isPinned ? 'ההצמדה בוטלה' : 'העדכון הוצמד');
      loadUpdates();
    } catch (error) {
      console.error('Failed to toggle pin:', error);
      toast.error('שגיאה בעדכון');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <Button onClick={handleOpenCreate} className="w-full bg-black hover:bg-gray-800 text-white">
          <Plus className="w-4 h-4 ml-2" />
          פרסם עדכון חדש
        </Button>
      )}

      {updates.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Megaphone className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg mb-2">אין עדכונים עדיין</p>
          {canManage && (
            <p className="text-gray-400 text-sm">פרסם עדכון ראשון כדי ליידע את המשתתפים</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {updates.map((update) => (
            <UpdateCard
              key={update.id}
              update={update}
              canManage={canManage}
              onEdit={handleOpenEdit}
              onDelete={handleDelete}
              onTogglePin={handleTogglePin}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-orange-500" />
              {editingUpdate ? 'ערוך עדכון' : 'פרסם עדכון חדש'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">כותרת</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="כותרת העדכון"
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">תוכן</label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="כתוב כאן את העדכון..."
                className="min-h-[120px]"
                maxLength={1000}
              />
              <p className="text-xs text-gray-500 text-left">{formData.content.length}/1000</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">עדיפות</label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">נמוכה</SelectItem>
                  <SelectItem value="normal">רגילה</SelectItem>
                  <SelectItem value="high">גבוהה</SelectItem>
                  <SelectItem value="urgent">דחוף</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>
              ביטול
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="bg-orange-500 hover:bg-orange-600">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
              {editingUpdate ? 'שמור' : 'פרסם'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { createEventLink, updateEventLink, deleteEventLink } from '@/components/instabackService';
import { Plus, ExternalLink, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function LinksTab({ eventId, initialLinks, isManager }) {
  const [linksState, setLinksState] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const [isDeleting, setIsDeleting] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    description: '',
    category: 'other'
  });

  useEffect(() => {
    const links = initialLinks || [];
    setLinksState(Array.isArray(links) ? links : []);
  }, [initialLinks]);

  const resetForm = () => {
    setFormData({
      title: '',
      url: '',
      description: '',
      category: 'other'
    });
    setEditingLink(null);
  };

  const openDialog = (link = null) => {
    if (link) {
      setEditingLink(link);
      setFormData({
        title: link.title || '',
        url: link.url || '',
        description: link.description || '',
        category: link.category || 'other'
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.url.trim()) {
      toast.error('אנא מלא כותרת וקישור');
      return;
    }

    let url = formData.url.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    const linkData = {
      eventId: eventId,
      title: formData.title.trim(),
      url: url,
      description: formData.description.trim(),
      category: formData.category
    };

    try {
      if (editingLink) {
        // עדכון אופטימיסטי מיידי
        const optimisticUpdate = { ...editingLink, ...linkData };
        setLinksState(prev => prev.map(l => l.id === editingLink.id ? optimisticUpdate : l));
        
        const updatedLink = await updateEventLink(editingLink.id, linkData);
        
        // עדכון עם הנתונים האמיתיים מהשרת
        setLinksState(prev => prev.map(l => l.id === editingLink.id ? updatedLink : l));
        toast.success('הקישור עודכן בהצלחה! ✨');
      } else {
        // יצירת ID זמני לעדכון אופטימיסטי
        const tempId = `temp_${Date.now()}`;
        const optimisticLink = { ...linkData, id: tempId };
        
        // הוספה אופטימיסטית מיידית
        setLinksState(prev => [...prev, optimisticLink]);
        
        const newLink = await createEventLink(linkData);
        
        // החלף את הקישור הזמני באמיתי
        setLinksState(prev => prev.map(l => l.id === tempId ? newLink : l));
        toast.success('הקישור נוסף בהצלחה! 🔗');
      }
      
      closeDialog();
    } catch (error) {
      console.error('Error saving link:', error);
      toast.error('שגיאה בשמירת הקישור');
      
      // rollback אופטימיסטי
      if (editingLink) {
        setLinksState(prev => prev.map(l => l.id === editingLink.id ? editingLink : l));
      } else {
        setLinksState(prev => prev.filter(l => !l.id.toString().startsWith('temp_')));
      }
    }
  };

  const handleDelete = async (link) => {
    if (!window.confirm(`האם למחוק את הקישור "${link.title}"?`)) return;
    
    setIsDeleting(link.id);
    
    // הסרה אופטימיסטית מיידית
    const originalLinks = linksState;
    setLinksState(prev => prev.filter(l => l.id !== link.id));
    
    try {
      await deleteEventLink(link.id);
      toast.success('הקישור נמחק בהצלחה! 🗑️');
    } catch (error) {
      console.error('Error deleting link:', error);
      toast.error('שגיאה במחיקת הקישור');
      
      // rollback - החזר את הקישור
      setLinksState(originalLinks);
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold dark:text-white">קישורים שימושיים</h2>
        {isManager && (
          <Button onClick={() => openDialog()}>
            <Plus className="w-4 h-4 ml-2" />
            הוסף קישור
          </Button>
        )}
      </div>

      {!linksState || linksState.length === 0 ? (
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="py-12 text-center">
            <ExternalLink className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">עדיין לא נוספו קישורים</p>
            {isManager && (
              <Button variant="outline" onClick={() => openDialog()}>
                הוסף קישור ראשון
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {linksState.map((link) => (
            <Card key={link.id} className={`dark:bg-gray-800 dark:border-gray-700 ${isDeleting === link.id ? 'opacity-50' : ''}`}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold mb-1 dark:text-white">{link.title}</h3>
                    {link.description && (
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">{link.description}</p>
                    )}
                    <a 
                      href={link.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm truncate block"
                    >
                      {link.url}
                    </a>
                    <span className="inline-block mt-2 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded">
                      {link.category === 'venue' && 'מקום'}
                      {link.category === 'restaurant' && 'מסעדה'}
                      {link.category === 'accommodation' && 'לינה'}
                      {link.category === 'transportation' && 'תחבורה'}
                      {link.category === 'activity' && 'פעילות'}
                      {link.category === 'other' && 'אחר'}
                    </span>
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(link.url, '_blank')}
                      disabled={isDeleting === link.id}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                    {isManager && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDialog(link)}
                          disabled={isDeleting === link.id}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(link)}
                          className="text-red-500 hover:text-red-700"
                          disabled={isDeleting === link.id}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog unchanged */}
      {isManager && (
        <Dialog open={isDialogOpen} onOpenChange={closeDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingLink ? 'עריכת קישור' : 'הוספת קישור'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">כותרת</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({...prev, title: e.target.value}))}
                  placeholder="שם המקום או השירות"
                  required
                />
              </div>

              <div>
                <Label htmlFor="url">קישור</Label>
                <Input
                  id="url"
                  value={formData.url}
                  onChange={(e) => setFormData(prev => ({...prev, url: e.target.value}))}
                  placeholder="https://example.com"
                  required
                />
              </div>

              <div>
                <Label htmlFor="category">קטגוריה</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData(prev => ({...prev, category: value}))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="venue">מקום האירוע</SelectItem>
                    <SelectItem value="restaurant">מסעדה</SelectItem>
                    <SelectItem value="accommodation">לינה</SelectItem>
                    <SelectItem value="transportation">תחבורה</SelectItem>
                    <SelectItem value="activity">פעילות</SelectItem>
                    <SelectItem value="other">אחר</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description">תיאור (אופציונלי)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({...prev, description: e.target.value}))}
                  placeholder="פרטים נוספים על הקישור"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={closeDialog}>
                  ביטול
                </Button>
                <Button type="submit">
                  {editingLink ? 'עדכן' : 'הוסף'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { getEventTemplates, createEventTemplate, updateEventTemplate, deleteEventTemplate } from '@/components/instabackService';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, Pencil, Trash2, Image as ImageIcon, List, Sparkles } from 'lucide-react';
import TemplateFormDialog from '@/components/templates/TemplateFormDialog';
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';

export default function AdminTemplatesManage() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getEventTemplates();
      setTemplates(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to load templates:', e);
      toast.error('שגיאה בטעינת תבניות', { description: e.message });
      setTemplates([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate(createPageUrl('Home'));
      return;
    }
    load();
  }, [isAuthenticated, navigate, load]);

  const handleCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const handleEdit = (tpl) => {
    setEditing(tpl);
    setDialogOpen(true);
  };

  const handleDelete = async (tpl) => {
    if (!window.confirm(`למחוק את התבנית "${tpl.title}"?`)) return;
    try {
      await deleteEventTemplate(tpl.id);
      toast.success('התבנית נמחקה');
      load();
    } catch (e) {
      toast.error('שגיאה במחיקה', { description: e.message });
    }
  };

  const handleSubmit = async (form) => {
    try {
      if (editing) {
        await updateEventTemplate(editing.id, form);
        toast.success('התבנית עודכנה');
      } else {
        await createEventTemplate(form);
        toast.success('התבנית נוצרה');
      }
      setDialogOpen(false);
      setEditing(null);
      load();
    } catch (e) {
      toast.error('שמירה נכשלה', { description: e.message });
    }
  };

  const filtered = templates.filter(t => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (t.title || '').toLowerCase().includes(q) || (t.category || '').toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6" style={{ direction: 'rtl' }}>
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">ניהול תבניות אירוע</h1>
            <p className="text-sm text-gray-600">יצירה, עדכון ומחיקה של תבניות ב-InstaBack</p>
          </div>
          <div className="flex gap-2">
            <Input placeholder="חיפוש תבניות..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-48" />
            <Button onClick={() => navigate(createPageUrl('AdminTemplatesSeed'))} variant="outline" className="gap-2 border-pink-500 text-pink-700">
              <Sparkles className="w-4 h-4" /> זריעה מחדש
            </Button>
            <Button onClick={handleCreate} className="bg-orange-500 hover:bg-orange-600">
              <Plus className="w-4 h-4 ml-1" /> תבנית חדשה
            </Button>
          </div>
        </header>

        <Card>
          <CardContent className="p-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-gray-500">
                <Loader2 className="w-5 h-5 animate-spin mr-2" /> טוען תבניות...
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                לא נמצאו תבניות. לחצו "תבנית חדשה" כדי להתחיל.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((tpl) => (
                  <div key={tpl.id || tpl.title} className="border rounded-lg p-3 bg-white flex flex-col">
                    <div className="aspect-video bg-gray-100 rounded mb-3 overflow-hidden flex items-center justify-center">
                      {tpl.cover_image_url || tpl.coverImageUrl ? (
                        <img
                          src={tpl.cover_image_url || tpl.coverImageUrl}
                          alt={tpl.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-gray-400 flex items-center gap-2"><ImageIcon className="w-5 h-5" /> ללא תמונה</div>
                      )}
                    </div>
                    <h3 className="font-bold">{tpl.title}</h3>
                    <p className="text-sm text-gray-600 line-clamp-2">{tpl.description}</p>
                    <div className="mt-2 text-xs text-gray-500">{tpl.category || 'ללא קטגוריה'}</div>
                    <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                      <List className="w-4 h-4" />
                      {Array.isArray(tpl.default_tasks) ? tpl.default_tasks.length :
                       Array.isArray(tpl.defaultTasks) ? tpl.defaultTasks.length : 0} משימות ברירת מחדל
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={() => handleEdit(tpl)}>
                        <Pencil className="w-4 h-4 ml-1" /> עריכה
                      </Button>
                      <Button variant="destructive" className="flex-1" onClick={() => handleDelete(tpl)}>
                        <Trash2 className="w-4 h-4 ml-1" /> מחיקה
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <TemplateFormDialog
        isOpen={dialogOpen}
        onOpenChange={setDialogOpen}
        initialData={editing}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

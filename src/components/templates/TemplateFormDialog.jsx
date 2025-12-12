import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Save } from 'lucide-react';

export default function TemplateFormDialog({ isOpen, onOpenChange, initialData, onSubmit }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    coverImageUrl: '',
    default_tasks: []
  });

  useEffect(() => {
    if (isOpen) {
      setForm({
        title: initialData?.title || '',
        description: initialData?.description || '',
        category: initialData?.category || '',
        coverImageUrl: initialData?.cover_image_url || initialData?.coverImageUrl || '',
        default_tasks: Array.isArray(initialData?.default_tasks) ? initialData.default_tasks
                        : Array.isArray(initialData?.defaultTasks) ? initialData.defaultTasks : []
      });
    }
  }, [isOpen, initialData]);

  const updateField = (id, value) => setForm(prev => ({ ...prev, [id]: value }));

  const addTask = () => {
    setForm(prev => ({
      ...prev,
      default_tasks: [...prev.default_tasks, { title: '', description: '' }]
    }));
  };

  const updateTask = (index, key, value) => {
    const tasks = [...form.default_tasks];
    tasks[index] = { ...tasks[index], [key]: value };
    setForm(prev => ({ ...prev, default_tasks: tasks }));
  };

  const removeTask = (index) => {
    const tasks = [...form.default_tasks];
    tasks.splice(index, 1);
    setForm(prev => ({ ...prev, default_tasks: tasks }));
  };

  const handleSubmit = (e) => {
    e?.preventDefault?.();
    onSubmit?.(form);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" style={{ direction: 'rtl' }}>
        <DialogHeader>
          <DialogTitle>{initialData ? 'עריכת תבנית' : 'תבנית חדשה'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">שם התבנית</Label>
            <Input id="title" value={form.title} onChange={(e) => updateField('title', e.target.value)} required />
          </div>

          <div>
            <Label htmlFor="description">תיאור</Label>
            <Textarea id="description" value={form.description} onChange={(e) => updateField('description', e.target.value)} />
          </div>

          <div>
            <Label htmlFor="category">קטגוריה</Label>
            <Input id="category" value={form.category} onChange={(e) => updateField('category', e.target.value)} placeholder="למשל: אירוע משפחתי / חוץ / עבודה" />
          </div>

          <div>
            <Label htmlFor="coverImageUrl">תמונת שער (URL)</Label>
            <Input id="coverImageUrl" value={form.coverImageUrl} onChange={(e) => updateField('coverImageUrl', e.target.value)} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>משימות ברירת מחדל</Label>
              <Button type="button" variant="outline" size="sm" onClick={addTask}>
                <Plus className="w-4 h-4 ml-1" /> הוסף משימה
              </Button>
            </div>
            <div className="space-y-3">
              {form.default_tasks.map((t, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-2 border rounded-md p-3 bg-gray-50">
                  <Input
                    placeholder="כותרת משימה"
                    value={t.title || ''}
                    onChange={(e) => updateTask(idx, 'title', e.target.value)}
                  />
                  <Input
                    placeholder="תיאור"
                    value={t.description || ''}
                    onChange={(e) => updateTask(idx, 'description', e.target.value)}
                  />
                  <div className="flex justify-end">
                    <Button type="button" variant="destructive" size="icon" onClick={() => removeTask(idx)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {form.default_tasks.length === 0 && (
                <div className="text-sm text-gray-500">אין משימות — לחצו "הוסף משימה" כדי להתחיל.</div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" className="bg-orange-500 hover:bg-orange-600">
              <Save className="w-4 h-4 ml-1" /> שמירה
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
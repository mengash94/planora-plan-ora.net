
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export default function TaskCreateDialog({ isOpen, onOpenChange, onSubmit }) {
    const [formData, setFormData] = useState({ 
        title: '', 
        description: '',
        dueDate: '' // Add due date field
    });
    
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.title.trim()) return;
        
        // וודא שיש תיאור - אם לא, השתמש בכותרת
        // Include due date in submission
        const taskToSubmit = {
            title: formData.title.trim(),
            description: formData.description.trim() || formData.title.trim(),
            dueDate: formData.dueDate || null
        };
        
        onSubmit(taskToSubmit);
        setFormData({ title: '', description: '', dueDate: '' });
        onOpenChange(false);
    };

    const handleCancel = () => {
        setFormData({ title: '', description: '', dueDate: '' });
        onOpenChange(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>הוספת משימה חדשה</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="py-4 space-y-4">
                    <div>
                        <Label htmlFor="task-title" className="mb-2 block">שם המשימה *</Label>
                        <Input 
                            id="task-title" 
                            value={formData.title} 
                            onChange={(e) => setFormData({...formData, title: e.target.value})} 
                            placeholder="לדוגמה: לקנות בלונים" 
                            autoFocus
                            required
                        />
                    </div>
                    <div>
                        <Label htmlFor="task-description" className="mb-2 block">פירוט המשימה (אופציונלי)</Label>
                        <Textarea 
                            id="task-description" 
                            value={formData.description} 
                            onChange={(e) => setFormData({...formData, description: e.target.value})} 
                            placeholder="פירוט נוסף על המשימה - מה צריך לקנות, כמה, איפה..."
                            rows={3}
                        />
                    </div>
                    <div>
                        <Label htmlFor="task-due-date" className="mb-2 block">תאריך יעד (אופציונלי)</Label>
                        <Input 
                            id="task-due-date"
                            type="datetime-local"
                            value={formData.dueDate} 
                            onChange={(e) => setFormData({...formData, dueDate: e.target.value})} 
                            min={new Date().toISOString().slice(0, 16)} // Prevent selecting past dates/times
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" type="button" onClick={handleCancel}>ביטול</Button>
                        <Button type="submit" disabled={!formData.title.trim()}>הוסף משימה</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

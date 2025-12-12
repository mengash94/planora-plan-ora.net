import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { createProfessional, updateProfessional, deleteProfessional } from '@/components/instabackService';
import { Plus, Phone, Mail, Globe, Edit, Trash2, DollarSign, User } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/components/AuthProvider';

export default function ProfessionalsTab({ eventId, initialProfessionals = [], isManager }) {
  const { user: currentUser } = useAuth();
  const [professionalsState, setProfessionalsState] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProfessional, setEditingProfessional] = useState(null);
  const [isDeleting, setIsDeleting] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    profession: '',
    phone: '',
    email: '',
    website: '',
    notes: '',
    cost: '',
    status: 'pending'
  });

  useEffect(() => {
    setProfessionalsState(Array.isArray(initialProfessionals) ? initialProfessionals : []);
  }, [initialProfessionals]);

  const handleOpenDialog = (professional = null) => {
    if (professional) {
      setEditingProfessional(professional);
      setFormData({
        name: professional.name || '',
        profession: professional.profession || '',
        phone: professional.phone || '',
        email: professional.email || '',
        website: professional.website || '',
        notes: professional.notes || '',
        cost: professional.cost?.toString() || '',
        status: professional.status || 'pending'
      });
    } else {
      setEditingProfessional(null);
      setFormData({
        name: '',
        profession: '',
        phone: '',
        email: '',
        website: '',
        notes: '',
        cost: '',
        status: 'pending'
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.profession.trim()) {
      toast.error('אנא מלא שם ומקצוע');
      return;
    }

    const professionalData = {
      eventId: eventId,
      _uid: currentUser?.id, // Changed: Use _uid instead of createdBy
      name: formData.name.trim(),
      profession: formData.profession.trim(),
      phone: formData.phone.trim() || null,
      email: formData.email.trim() || null,
      website: formData.website.trim() || null,
      notes: formData.notes.trim() || null,
      cost: formData.cost ? parseFloat(formData.cost) : null,
      status: formData.status
    };

    try {
      if (editingProfessional) {
        // עדכון אופטימיסטי מיידי
        const optimisticUpdate = { ...editingProfessional, ...professionalData };
        setProfessionalsState(prev => prev.map(p => p.id === editingProfessional.id ? optimisticUpdate : p));
        
        const updated = await updateProfessional(editingProfessional.id, professionalData);
        
        // עדכון עם נתונים אמיתיים מהשרת
        setProfessionalsState(prev => prev.map(p => p.id === editingProfessional.id ? updated : p));
        toast.success('איש המקצוע עודכן בהצלחה! ✨');
      } else {
        // יצירת ID זמני
        const tempId = `temp_${Date.now()}`;
        const optimisticProfessional = { 
          ...professionalData, 
          id: tempId,
          _uid: currentUser?.id, // Changed: Use _uid for optimistic update
          createdAt: new Date().toISOString()
        };
        
        // הוספה אופטימיסטית מיידית
        setProfessionalsState(prev => [...prev, optimisticProfessional]);
        
        const newProfessional = await createProfessional({
          ...professionalData,
          _uid: currentUser?.id, // Changed: Pass _uid to the backend
        });
        
        // החלף את הזמני באמיתי
        setProfessionalsState(prev => prev.map(p => p.id === tempId ? newProfessional : p));
        toast.success('איש המקצוע נוסף בהצלחה! 👥');
      }
      
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Failed to save professional:', error);
      toast.error('שגיאה בשמירת איש המקצוע');
      
      // rollback
      if (editingProfessional) {
        setProfessionalsState(prev => prev.map(p => p.id === editingProfessional.id ? editingProfessional : p));
      } else {
        setProfessionalsState(prev => prev.filter(p => !p.id.toString().startsWith('temp_')));
      }
    }
  };

  const handleDelete = async (professional) => {
    if (!window.confirm(`האם אתה בטוח שברצונך למחוק את ${professional.name}?`)) return;
    
    setIsDeleting(professional.id);
    
    // הסרה אופטימיסטית מיידית
    const originalProfessionals = professionalsState;
    setProfessionalsState(prev => prev.filter(p => p.id !== professional.id));
    
    try {
      await deleteProfessional(professional.id);
      toast.success('איש המקצוע נמחק בהצלחה! 🗑️');
    } catch (error) {
      console.error('Failed to delete professional:', error);
      toast.error('שגיאה במחיקת איש המקצוע');
      
      // rollback
      setProfessionalsState(originalProfessionals);
    } finally {
      setIsDeleting(null);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: { variant: 'outline', text: 'בהמתנה', color: 'text-yellow-600 border-yellow-300' },
      confirmed: { variant: 'default', text: 'מאושר', color: 'bg-green-100 text-green-800 border-green-300' },
      cancelled: { variant: 'destructive', text: 'בוטל', color: 'bg-red-100 text-red-800 border-red-300' }
    };
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant} className={config.color}>{config.text}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold dark:text-white">אנשי מקצוע</h2>
        {isManager && (
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="w-4 h-4 ml-2" />
            הוסף איש מקצוע
          </Button>
        )}
      </div>

      {professionalsState.length === 0 ? (
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="py-12 text-center">
            <User className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">עדיין לא נוספו אנשי מקצוע לאירוע זה</p>
            {isManager && (
              <Button variant="outline" onClick={() => handleOpenDialog()}>
                הוסף איש מקצוע ראשון
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {professionalsState.map((professional) => (
            <Card key={professional.id} className={`relative dark:bg-gray-800 dark:border-gray-700 ${isDeleting === professional.id ? 'opacity-50' : ''}`}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg dark:text-white">{professional.name}</CardTitle>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{professional.profession}</p>
                  </div>
                  {isManager && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(professional)}
                        disabled={isDeleting === professional.id}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(professional)}
                        className="text-red-500 hover:text-red-700"
                        disabled={isDeleting === professional.id}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
                {getStatusBadge(professional.status)}
              </CardHeader>
              <CardContent className="space-y-3">
                {professional.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <a href={`tel:${professional.phone}`} className="text-blue-600 hover:underline">
                      {professional.phone}
                    </a>
                  </div>
                )}
                {professional.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <a href={`mailto:${professional.email}`} className="text-blue-600 hover:underline">
                      {professional.email}
                    </a>
                  </div>
                )}
                {professional.website && (
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-gray-400" />
                    <a href={professional.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      אתר אינטרנט
                    </a>
                  </div>
                )}
                {professional.cost && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">₪{professional.cost.toLocaleString()}</span>
                  </div>
                )}
                {professional.notes && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                    {professional.notes}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {isManager && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingProfessional ? 'עריכת איש מקצוע' : 'הוספת איש מקצוע חדש'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">שם מלא</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="שם איש המקצוע"
                  required
                />
              </div>
              <div>
                <Label htmlFor="profession">מקצוע</Label>
                <Input
                  id="profession"
                  value={formData.profession}
                  onChange={(e) => setFormData({...formData, profession: e.target.value})}
                  placeholder="למשל: צלם, קייטרינג, DJ"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">טלפון</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="05X-XXXXXXX"
                  />
                </div>
                <div>
                  <Label htmlFor="cost">עלות (₪)</Label>
                  <Input
                    id="cost"
                    type="number"
                    value={formData.cost}
                    onChange={(e) => setFormData({...formData, cost: e.target.value})}
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="email">אימייל</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <Label htmlFor="website">אתר אינטרנט (אופציונלי)</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({...formData, website: e.target.value})}
                  placeholder="https://example.com"
                />
              </div>
              <div>
                <Label htmlFor="status">סטטוס</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({...formData, status: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">בהמתנה</SelectItem>
                    <SelectItem value="confirmed">מאושר</SelectItem>
                    <SelectItem value="cancelled">בוטל</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="notes">הערות</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="הערות נוספות..."
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  ביטול
                </Button>
                <Button type="submit">
                  {editingProfessional ? 'עדכן' : 'הוסף'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
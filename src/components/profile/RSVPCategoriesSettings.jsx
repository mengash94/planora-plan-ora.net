import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ClipboardCheck, Plus, X, Save, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export default function RSVPCategoriesSettings({ onBack }) {
  const [rsvpCategories, setRsvpCategories] = useState([
    'חתונה', 'אירוסין', 'ברית מילה', 'בת מצווה', 'בר מצווה', 'חינה', 'שבת חתן', 'בריתה',
    'יום הולדת', 'אירוע משפחתי', 'birthday', 'party'
  ]);
  const [newCategory, setNewCategory] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Load saved categories from localStorage
  useEffect(() => {
    const savedCategories = localStorage.getItem('rsvp_categories');
    if (savedCategories) {
      try {
        setRsvpCategories(JSON.parse(savedCategories));
      } catch (e) {
        console.warn('Failed to parse saved RSVP categories');
      }
    }
  }, []);

  const handleAddCategory = () => {
    const trimmed = newCategory.trim();
    if (!trimmed) {
      toast.error('נא להזין שם קטגוריה');
      return;
    }
    if (rsvpCategories.includes(trimmed)) {
      toast.error('קטגוריה זו כבר קיימת');
      return;
    }
    setRsvpCategories(prev => [...prev, trimmed]);
    setNewCategory('');
    toast.success('הקטגוריה נוספה');
  };

  const handleRemoveCategory = (index) => {
    setRsvpCategories(prev => prev.filter((_, i) => i !== index));
    toast.success('הקטגוריה הוסרה');
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      localStorage.setItem('rsvp_categories', JSON.stringify(rsvpCategories));
      toast.success('הקטגוריות נשמרו בהצלחה!');
      if (onBack) {
        setTimeout(() => onBack(), 500);
      }
    } catch (error) {
      toast.error('שגיאה בשמירת הקטגוריות');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowRight className="w-5 h-5" />
          </Button>
        )}
        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
          <ClipboardCheck className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">קטגוריות RSVP</h2>
          <p className="text-sm text-gray-500">הגדר אילו סוגי אירועים יכללו טאב אישורי הגעה</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">קטגוריות פעילות</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Categories */}
          <div className="flex flex-wrap gap-2">
            {rsvpCategories.length === 0 ? (
              <p className="text-gray-500 text-sm py-4">אין קטגוריות עדיין</p>
            ) : (
              rsvpCategories.map((category, index) => (
                <Badge
                  key={index}
                  className="bg-green-100 text-green-800 px-3 py-1.5 flex items-center gap-2 text-sm"
                >
                  {category}
                  <button
                    onClick={() => handleRemoveCategory(index)}
                    className="hover:bg-green-200 rounded-full p-0.5 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))
            )}
          </div>

          {/* Add New Category */}
          <div className="space-y-2 pt-4 border-t">
            <Label>הוסף קטגוריה חדשה</Label>
            <div className="flex gap-2">
              <Input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="לדוגמה: טקס הענקת פרסים"
                className="flex-1"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddCategory();
                  }
                }}
              />
              <Button
                variant="outline"
                onClick={handleAddCategory}
                disabled={!newCategory.trim()}
              >
                <Plus className="w-4 h-4 ml-1" />
                הוסף
              </Button>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
            <p className="text-sm text-blue-800">
              <strong>💡 איך זה עובד:</strong> כשמארגן יוצר אירוע בקטגוריה מהרשימה,
              הוא יראה טאב "אישורי הגעה" שמאפשר לשלוח שאלון RSVP למוזמנים ולעקוב אחרי תשובות.
            </p>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  שומר...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 ml-2" />
                  שמור שינויים
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
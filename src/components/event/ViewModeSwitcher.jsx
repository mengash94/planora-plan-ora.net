import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Layout, LayoutGrid, Sidebar, Rows, GalleryVertical, CheckCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';

const viewOptions = [
  {
    id: 'tabs',
    title: 'טאבים מרכזיים',
    description: 'תצוגה פשוטה ומינימלית, מתאימה במיוחד למובייל.',
    icon: LayoutGrid,
  },
  {
    id: 'sidebar',
    title: 'תפריט צד',
    description: 'כל האפשרויות זמינות ברשימה נוחה בצד המסך.',
    icon: Sidebar,
  },
  {
    id: 'carousel',
    title: 'קרוסלה',
    description: 'ניווט בהחלקה אופקית, אידיאלי למובייל.',
    icon: Rows,
  },
  {
    id: 'dashboard',
    title: 'דשבורד',
    description: 'תצוגת מבט-על עם כרטיסים לכל אזור.',
    icon: GalleryVertical,
  },
];

export default function ViewModeSwitcher({ currentMode, onModeChange }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (modeId) => {
    onModeChange(modeId);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button 
          className="text-white hover:bg-white/20 rounded-full h-10 w-10 flex items-center justify-center transition-colors" 
          title="שינוי תצוגה"
        >
          <Layout className="w-6 h-6" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl" style={{ direction: 'rtl' }}>
        <DialogHeader>
          <DialogTitle>בחר סגנון תצוגה</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          {viewOptions.map((option) => (
            <Card
              key={option.id}
              onClick={() => handleSelect(option.id)}
              className={`p-4 cursor-pointer hover:border-orange-500 transition-all relative ${
                currentMode === option.id ? 'border-2 border-orange-500 bg-orange-50' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                <option.icon className="w-8 h-8 text-orange-600 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-lg">{option.title}</h3>
                  <p className="text-sm text-gray-600">{option.description}</p>
                </div>
              </div>
              {currentMode === option.id && (
                <div className="absolute top-2 left-2 bg-green-500 text-white rounded-full p-1">
                  <CheckCircle className="w-4 h-4" />
                </div>
              )}
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
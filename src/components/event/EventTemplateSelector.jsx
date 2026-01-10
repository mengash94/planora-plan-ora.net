import React, { useState, useEffect } from 'react';
import { getInvitationTemplates, createInvitationTemplate, updateEvent } from '@/components/instabackService';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Check, Palette, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { formatIsraelDate, formatIsraelTime } from '@/components/utils/dateHelpers';

export default function EventTemplateSelector({ eventId, currentTemplateId, onUpdate, isReadOnly }) {
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedId, setSelectedId] = useState(currentTemplateId);

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    setSelectedId(currentTemplateId);
  }, [currentTemplateId]);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const data = await getInvitationTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load templates:', error);
      toast.error('שגיאה בטעינת התבניות');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = async (templateId) => {
    if (isReadOnly) return;
    
    setSelectedId(templateId);
    setIsSaving(true);
    try {
      await updateEvent(eventId, { invitationTemplateId: templateId });
      toast.success('עיצוב ההזמנה עודכן בהצלחה! 🎨');
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Failed to update event template:', error);
      toast.error('שגיאה בעדכון העיצוב');
      // Revert selection on error
      setSelectedId(currentTemplateId);
    } finally {
      setIsSaving(false);
    }
  };

  const seedTemplates = async () => {
    setIsLoading(true);
    try {
      const seeds = [
        {
          name: 'חתונה מלכותית',
          description: 'עיצוב מפואר בזהב ושמנת',
          previewImageUrl: 'https://images.unsplash.com/photo-1519225421980-715cb0202128?q=80&w=600&auto=format&fit=crop',
          category: 'wedding',
          isActive: true,
          templateData: {
            greeting: '✨ נשמח לראותכם ביום המאושר בחיינו ✨',
            closing: 'באהבה וברכה',
            textColor: '#3E2723',
            accentColor: '#D4AF37',
            fontFamily: 'serif',
            overlayColor: 'rgba(255, 250, 240, 0.92)'
          }
        },
        {
          name: 'חתונה רומנטית',
          description: 'גווני פודרה עדינים ורומנטיים',
          previewImageUrl: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?q=80&w=600&auto=format&fit=crop',
          category: 'wedding',
          isActive: true,
          templateData: {
            greeting: '💕 מוזמנים לחגוג איתנו את אהבתנו 💕',
            closing: 'בשמחה ובאושר',
            textColor: '#881337',
            accentColor: '#FB7185',
            fontFamily: 'serif',
            overlayColor: 'rgba(255, 242, 245, 0.90)'
          }
        },
        {
          name: 'חתונה בוהו',
          description: 'עיצוב טבעי וחופשי עם פרחים',
          previewImageUrl: 'https://images.unsplash.com/photo-1523438097201-512ae7d59c44?q=80&w=600&auto=format&fit=crop',
          category: 'wedding',
          isActive: true,
          templateData: {
            greeting: '🌿 הצטרפו אלינו לחגיגה 🌿',
            closing: 'בשמחה ובאהבה',
            textColor: '#14532D',
            accentColor: '#84CC16',
            fontFamily: 'sans-serif',
            overlayColor: 'rgba(247, 254, 231, 0.88)'
          }
        },
        {
          name: 'ברית מילה',
          description: 'עיצוב עדין בכחול ולבן',
          previewImageUrl: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?q=80&w=600&auto=format&fit=crop',
          category: 'brit',
          isActive: true,
          templateData: {
            greeting: '🍼 בשעה טובה ומוצלחת 🍼',
            closing: 'נשמח לחגוג ביחד',
            textColor: '#1E3A8A',
            accentColor: '#60A5FA',
            fontFamily: 'sans-serif',
            overlayColor: 'rgba(239, 246, 255, 0.90)'
          }
        },
        {
          name: 'בריתה',
          description: 'עיצוב מתוק בוורוד עדין',
          previewImageUrl: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?q=80&w=600&auto=format&fit=crop',
          category: 'brit',
          isActive: true,
          templateData: {
            greeting: '🌸 ברוכים הבאים לברית 🌸',
            closing: 'באהבה ושמחה',
            textColor: '#831843',
            accentColor: '#F9A8D4',
            fontFamily: 'serif',
            overlayColor: 'rgba(253, 242, 248, 0.90)'
          }
        },
        {
          name: 'אירוסין מודרניים',
          description: 'עיצוב עכשווי ואלגנטי',
          previewImageUrl: 'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?q=80&w=600&auto=format&fit=crop',
          category: 'wedding',
          isActive: true,
          templateData: {
            greeting: '💍 אנחנו מתחתנים! 💍',
            closing: 'נתראה בחגיגה',
            textColor: '#1F2937',
            accentColor: '#EC4899',
            fontFamily: 'sans-serif',
            overlayColor: 'rgba(255, 255, 255, 0.92)'
          }
        },
        {
          name: 'בר/בת מצווה',
          description: 'עיצוב צעיר ומשמח',
          previewImageUrl: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?q=80&w=600&auto=format&fit=crop',
          category: 'bar_mitzvah',
          isActive: true,
          templateData: {
            greeting: '🎉 מוזמנים לחגוג איתנו 🎉',
            closing: 'יהיה מגניב!',
            textColor: '#1E40AF',
            accentColor: '#FBBF24',
            fontFamily: 'sans-serif',
            overlayColor: 'rgba(254, 249, 195, 0.88)'
          }
        },
        {
          name: 'יום הולדת אלגנטי',
          description: 'עיצוב יוקרתי וצבעוני',
          previewImageUrl: 'https://images.unsplash.com/photo-1464347744102-11db6282f854?q=80&w=600&auto=format&fit=crop',
          category: 'birthday',
          isActive: true,
          templateData: {
            greeting: '🎂 בואו לחגוג יום הולדת 🎂',
            closing: 'בשמחה ובכיף',
            textColor: '#7C2D12',
            accentColor: '#FB923C',
            fontFamily: 'sans-serif',
            overlayColor: 'rgba(255, 247, 237, 0.90)'
          }
        },
        {
          name: 'חינה מזרחית',
          description: 'עיצוב עשיר בצבעים חמים',
          previewImageUrl: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?q=80&w=600&auto=format&fit=crop',
          category: 'wedding',
          isActive: true,
          templateData: {
            greeting: '✨ חינה מלכות ✨',
            closing: 'בשמחה וברכה',
            textColor: '#713F12',
            accentColor: '#F59E0B',
            fontFamily: 'serif',
            overlayColor: 'rgba(254, 243, 199, 0.88)'
          }
        },
        {
          name: 'מסיבת גן',
          description: 'עיצוב טבעי ופרחוני',
          previewImageUrl: 'https://images.unsplash.com/photo-1478146896981-b80fe463b330?q=80&w=600&auto=format&fit=crop',
          category: 'general',
          isActive: true,
          templateData: {
            greeting: '🌺 בואו לחגוג בגן 🌺',
            closing: 'נתראה שם!',
            textColor: '#064E3B',
            accentColor: '#10B981',
            fontFamily: 'sans-serif',
            overlayColor: 'rgba(236, 253, 245, 0.90)'
          }
        },
        {
          name: 'ערב חגיגי',
          description: 'עיצוב אלגנטי לאירוע ערב',
          previewImageUrl: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=600&auto=format&fit=crop',
          category: 'general',
          isActive: true,
          templateData: {
            greeting: '🌙 הצטרפו אלינו לערב מיוחד 🌙',
            closing: 'בציפייה לראותכם',
            textColor: '#1E1B4B',
            accentColor: '#818CF8',
            fontFamily: 'serif',
            overlayColor: 'rgba(238, 242, 255, 0.90)'
          }
        },
        {
          name: 'חתונה בחוף',
          description: 'עיצוב קליל בגווני ים ושמיים',
          previewImageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=600&auto=format&fit=crop',
          category: 'wedding',
          isActive: true,
          templateData: {
            greeting: '🌊 חתונה על חוף הים 🌊',
            closing: 'בציפייה לקסם הרגע',
            textColor: '#0C4A6E',
            accentColor: '#38BDF8',
            fontFamily: 'sans-serif',
            overlayColor: 'rgba(240, 249, 255, 0.88)'
          }
        }
      ];

      for (const template of seeds) {
        await createInvitationTemplate(template);
      }
      
      await loadTemplates();
      toast.success('תבניות עיצוב נוצרו בהצלחה!');
    } catch (error) {
      console.error('Failed to seed templates:', error);
      toast.error('שגיאה ביצירת תבניות');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="text-center p-8 bg-gray-50 rounded-xl">
        <Palette className="w-12 h-12 mx-auto text-gray-400 mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">אין תבניות עיצוב זמינות</h3>
        <p className="text-gray-500 mb-4">לחץ על הכפתור למטה כדי ליצור תבניות ברירת מחדל</p>
        <Button onClick={seedTemplates} disabled={isReadOnly} className="bg-orange-500 hover:bg-orange-600">
          <Sparkles className="w-4 h-4 ml-2" />
          צור תבניות עיצוב
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">בחר עיצוב להזמנה</h2>
        {isSaving && <Loader2 className="w-5 h-5 animate-spin text-orange-500" />}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {templates.map((template) => {
          const isSelected = selectedId === template.id;
          return (
            <div 
              key={template.id}
              onClick={() => handleSelect(template.id)}
              className={`group cursor-pointer relative rounded-xl overflow-hidden border-2 transition-all duration-300 ${
                isSelected 
                  ? 'border-orange-500 ring-2 ring-orange-200 ring-offset-2' 
                  : 'border-transparent hover:border-gray-300'
              }`}
            >
              {/* Preview Image */}
              <div className="aspect-[4/5] relative bg-gray-100">
                <img 
                  src={template.previewImageUrl || template.preview_image_url} 
                  alt={template.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                
                {/* Overlay Preview */}
                <div 
                  className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center transition-opacity duration-300"
                  style={{ 
                    backgroundColor: template.templateData?.overlayColor || 'rgba(255,255,255,0.85)',
                    color: template.templateData?.textColor || '#000'
                  }}
                >
                  <p className="text-xs font-medium mb-2 opacity-80" style={{ fontFamily: template.templateData?.fontFamily }}>
                    {template.templateData?.greeting || 'הזמנה לאירוע'}
                  </p>
                  <h3 className="text-lg font-bold mb-2 leading-tight">כותרת האירוע</h3>
                  <div className="text-[10px] opacity-75 font-medium space-y-1">
                    <p>{formatIsraelDate(new Date())}</p>
                    <p>מיקום האירוע</p>
                  </div>
                </div>

                {/* Selected Indicator */}
                {isSelected && (
                  <div className="absolute top-2 right-2 bg-orange-500 text-white p-1.5 rounded-full shadow-lg z-10">
                    <Check className="w-4 h-4" />
                  </div>
                )}
              </div>

              {/* Info Footer */}
              <div className="p-3 bg-white border-t border-gray-100">
                <h3 className="font-semibold text-gray-900 text-sm">{template.name}</h3>
                <p className="text-xs text-gray-500 line-clamp-1">{template.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
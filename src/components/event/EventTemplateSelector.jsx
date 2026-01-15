import React, { useState, useEffect } from 'react';
import { getEventTemplates } from '@/components/instabackService';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Calendar, Sparkles, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

export default function EventTemplateSelector({ onTemplateSelected }) {
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const data = await getEventTemplates();
      console.log('[EventTemplateSelector] Loaded event templates:', data);
      setTemplates(data || []);
    } catch (error) {
      console.error('Failed to load event templates:', error);
      toast.error('שגיאה בטעינת תבניות אירועים');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (template) => {
    console.log('[EventTemplateSelector] Template selected:', template);
    
    // Pass template data to parent for event creation
    if (onTemplateSelected) {
      onTemplateSelected({
        type: 'template',
        templateId: template.id,
        title: template.title,
        name: template.title,
        description: template.description || '',
        category: template.category || '',
        coverImageUrl: template.cover_image_url || template.coverImageUrl || '',
        defaultTasks: template.default_tasks || template.defaultTasks || [],
        defaultItinerary: template.default_itinerary || template.defaultItinerary || [],
        canBePublic: template.can_be_public ?? template.canBePublic ?? true,
        eventType: 'social'
      });
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
        <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">אין תבניות אירועים זמינות</h3>
        <p className="text-gray-500 mb-4">צור תבניות בניהול התבניות</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">בחר תבנית אירוע</h2>
        <div className="text-sm text-gray-500">{templates.length} תבניות זמינות</div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {templates.map((template) => (
          <Card 
            key={template.id}
            className="group cursor-pointer hover:shadow-xl transition-all duration-300 border-2 hover:border-purple-500"
            onClick={() => handleSelect(template)}
          >
            <CardContent className="p-0">
              {/* Template Image */}
              <div className="aspect-video relative bg-gradient-to-br from-purple-50 to-pink-50 overflow-hidden">
                {(template.cover_image_url || template.coverImageUrl) ? (
                  <img 
                    src={template.cover_image_url || template.coverImageUrl} 
                    alt={template.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <ImageIcon className="w-12 h-12 text-purple-300" />
                  </div>
                )}
                
                {/* Category Badge */}
                {template.category && (
                  <div className="absolute top-2 right-2 bg-purple-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                    {template.category}
                  </div>
                )}
              </div>

              {/* Template Info */}
              <div className="p-4">
                <h3 className="font-bold text-gray-900 mb-1 group-hover:text-purple-600 transition-colors">
                  {template.title}
                </h3>
                <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                  {template.description || 'תבנית אירוע'}
                </p>

                {/* Tasks Count */}
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Sparkles className="w-4 h-4" />
                  {Array.isArray(template.default_tasks) 
                    ? `${template.default_tasks.length} משימות` 
                    : Array.isArray(template.defaultTasks)
                    ? `${template.defaultTasks.length} משימות`
                    : '0 משימות'
                  }
                </div>

                {/* Select Button */}
                <Button 
                  className="w-full mt-3 bg-purple-500 hover:bg-purple-600"
                  size="sm"
                >
                  בחר תבנית זו
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
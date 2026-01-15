import React, { useState, useEffect } from 'react';
import { getEventTemplates } from '@/components/instabackService';
import { Card } from '@/components/ui/card';
import { Loader2, Sparkles } from 'lucide-react';
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
      console.log('[EventTemplateSelector] Loaded templates:', data);
      setTemplates(data || []);
    } catch (error) {
      console.error('Failed to load templates:', error);
      toast.error('שגיאה בטעינת תבניות');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (template) => {
    console.log('[EventTemplateSelector] Selected template:', template);
    
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
        canBePublic: template.can_be_public ?? template.canBePublic ?? true
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="text-center py-12">
        <Sparkles className="w-12 h-12 mx-auto text-gray-400 mb-3" />
        <p className="text-gray-600">אין תבניות זמינות כרגע</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {templates.map((template) => (
        <Card
          key={template.id}
          onClick={() => handleSelect(template)}
          className="cursor-pointer hover:shadow-lg transition-shadow duration-200 overflow-hidden group"
        >
          {/* Image */}
          <div className="aspect-video bg-gradient-to-br from-purple-100 to-pink-100 relative overflow-hidden">
            {(template.cover_image_url || template.coverImageUrl) ? (
              <img
                src={template.cover_image_url || template.coverImageUrl}
                alt={template.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Sparkles className="w-10 h-10 text-purple-300" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-3">
            <h3 className="font-bold text-gray-900 mb-1 text-sm">
              {template.title}
            </h3>
            {template.description && (
              <p className="text-xs text-gray-600 line-clamp-2">
                {template.description}
              </p>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
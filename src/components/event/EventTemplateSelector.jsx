import React, { useState, useEffect } from 'react';
import { getEventTemplates } from '@/components/instabackService';
import { Button } from '@/components/ui/button';
import { Loader2, Calendar, Music, Users, Briefcase, PartyPopper } from 'lucide-react';
import { toast } from 'sonner';

const categoryColors = {
  'party': { bg: 'bg-gradient-to-br from-orange-400 to-orange-500', text: 'text-white', button: 'bg-orange-600 hover:bg-orange-700' },
  'birthday': { bg: 'bg-gradient-to-br from-pink-400 to-pink-500', text: 'text-white', button: 'bg-pink-600 hover:bg-pink-700' },
  'wedding': { bg: 'bg-gradient-to-br from-purple-400 to-purple-500', text: 'text-white', button: 'bg-purple-600 hover:bg-purple-700' },
  'business': { bg: 'bg-gradient-to-br from-blue-400 to-blue-500', text: 'text-white', button: 'bg-blue-600 hover:bg-blue-700' },
  'sport': { bg: 'bg-gradient-to-br from-green-400 to-green-500', text: 'text-white', button: 'bg-green-600 hover:bg-green-700' },
  'music': { bg: 'bg-gradient-to-br from-indigo-400 to-indigo-500', text: 'text-white', button: 'bg-indigo-600 hover:bg-indigo-700' },
  'food': { bg: 'bg-gradient-to-br from-yellow-400 to-yellow-500', text: 'text-white', button: 'bg-yellow-600 hover:bg-yellow-700' },
  'travel': { bg: 'bg-gradient-to-br from-teal-400 to-teal-500', text: 'text-white', button: 'bg-teal-600 hover:bg-teal-700' },
  'default': { bg: 'bg-gradient-to-br from-gray-400 to-gray-500', text: 'text-white', button: 'bg-gray-600 hover:bg-gray-700' }
};

const categoryIcons = {
  'party': PartyPopper,
  'birthday': PartyPopper,
  'wedding': Users,
  'business': Briefcase,
  'music': Music,
  'default': Calendar
};

export default function EventTemplateSelector({ onTemplateSelected }) {
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('כללי');

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

  const categories = ['כללי', 'מן', 'גברים', 'מוזיקה/אומנות'];

  const filteredTemplates = selectedCategory === 'כללי' 
    ? templates 
    : templates.filter(t => {
        // Filter logic based on category - adjust as needed
        return true;
      });

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
        <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-3" />
        <p className="text-gray-600">אין תבניות זמינות כרגע</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        {categories.map(cat => (
          <Button
            key={cat}
            variant={selectedCategory === cat ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(cat)}
            className={selectedCategory === cat ? 'bg-orange-500 hover:bg-orange-600' : ''}
          >
            {cat}
          </Button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="space-y-4">
        {filteredTemplates.map((template) => {
          const colorScheme = categoryColors[template.category] || categoryColors.default;
          const Icon = categoryIcons[template.category] || categoryIcons.default;
          
          return (
            <div
              key={template.id}
              className={`${colorScheme.bg} ${colorScheme.text} rounded-2xl p-6 shadow-lg transition-transform hover:scale-[1.02]`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{template.title}</h3>
                    <p className="text-sm opacity-90 mt-1">
                      {template.description || 'תבנית אירוע'}
                    </p>
                  </div>
                </div>
                <div className="text-xs opacity-75">
                  {Array.isArray(template.default_tasks) 
                    ? `${template.default_tasks.length} משימות` 
                    : Array.isArray(template.defaultTasks)
                    ? `${template.defaultTasks.length} משימות`
                    : '0 משימות'
                  }
                </div>
              </div>

              <Button
                onClick={() => handleSelect(template)}
                className={`w-full ${colorScheme.button} text-white font-medium`}
                size="lg"
              >
                בחר תבנית זו
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
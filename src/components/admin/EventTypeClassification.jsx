import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, Search, Sparkles, Users, Plus, X, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

// InstaBack API helpers for EventTypeConfig
const INSTABACK_BASE = 'https://instaback.io/project/f78de3ce-0cab-4ccb-8442-0c5749792fe8/api';

const getAuthToken = () => {
  return typeof window !== 'undefined' ? localStorage.getItem('instaback_token') : null;
};

const getEventTypeConfig = async () => {
  const token = getAuthToken();
  if (!token) return null;
  
  try {
    const response = await fetch(`${INSTABACK_BASE}/EventTypeConfig`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'accept': 'application/json'
      }
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    // Return the first config record (should only be one)
    return Array.isArray(data) ? data[0] : data;
  } catch (error) {
    console.error('Failed to get EventTypeConfig:', error);
    return null;
  }
};

const saveEventTypeConfig = async (config) => {
  const token = getAuthToken();
  if (!token) throw new Error('No auth token');
  
  const payload = {
    configKey: 'category_classifications',
    productionCategories: config.productionCategories,
    socialCategories: config.socialCategories,
    isActive: true
  };
  
  // If we have an ID, update; otherwise create
  if (config.id) {
    const response = await fetch(`${INSTABACK_BASE}/EventTypeConfig/${config.id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) throw new Error('Failed to update config');
    return await response.json();
  } else {
    const response = await fetch(`${INSTABACK_BASE}/EventTypeConfig`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) throw new Error('Failed to create config');
    return await response.json();
  }
};

// Default category classifications
const DEFAULT_CLASSIFICATIONS = {
  production: [
    'חתונה', 'אירוסין', 'ברית מילה', 'בת מצווה', 'בר מצווה', 
    'חינה', 'שבת חתן', 'בריתה', 'כנס', 'הרצאה', 'סדנה',
    'אירוע חברה', 'גיבוש', 'השקה'
  ],
  social: [
    'סרט', 'ארוחה', 'יציאה', 'מסיבה', 'יום הולדת', 'פיצה',
    'אימון', 'טיול', 'פיקניק', 'משחקים', 'בילוי', 'מפגש',
    'שתייה', 'ברביקיו', 'חוף', 'הופעה', 'ספורט'
  ]
};

export default function EventTypeClassification() {
  const [classifications, setClassifications] = useState(DEFAULT_CLASSIFICATIONS);
  const [newProductionCategory, setNewProductionCategory] = useState('');
  const [newSocialCategory, setNewSocialCategory] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [configId, setConfigId] = useState(null);

  // Load from InstaBack on mount
  useEffect(() => {
    const loadConfig = async () => {
      setIsLoading(true);
      try {
        const config = await getEventTypeConfig();
        if (config) {
          setConfigId(config.id);
          setClassifications({
            production: config.productionCategories || DEFAULT_CLASSIFICATIONS.production,
            social: config.socialCategories || DEFAULT_CLASSIFICATIONS.social
          });
          // Also update localStorage for quick access in other components
          localStorage.setItem('event_type_classifications', JSON.stringify({
            production: config.productionCategories || DEFAULT_CLASSIFICATIONS.production,
            social: config.socialCategories || DEFAULT_CLASSIFICATIONS.social
          }));
        }
      } catch (error) {
        console.warn('Failed to load event type config from server, using localStorage');
        // Fallback to localStorage
        const saved = localStorage.getItem('event_type_classifications');
        if (saved) {
          try {
            setClassifications(JSON.parse(saved));
          } catch (e) {
            console.warn('Failed to parse saved classifications');
          }
        }
      } finally {
        setIsLoading(false);
      }
    };
    loadConfig();
  }, []);

  const handleAddCategory = (type, value) => {
    if (!value.trim()) return;
    
    const trimmedValue = value.trim();
    
    // Check if already exists in either category
    if (classifications.production.includes(trimmedValue) || 
        classifications.social.includes(trimmedValue)) {
      toast.error('קטגוריה זו כבר קיימת');
      return;
    }

    setClassifications(prev => ({
      ...prev,
      [type]: [...prev[type], trimmedValue]
    }));

    if (type === 'production') {
      setNewProductionCategory('');
    } else {
      setNewSocialCategory('');
    }
  };

  const handleRemoveCategory = (type, category) => {
    setClassifications(prev => ({
      ...prev,
      [type]: prev[type].filter(c => c !== category)
    }));
  };

  const handleMoveCategory = (category, fromType, toType) => {
    setClassifications(prev => ({
      ...prev,
      [fromType]: prev[fromType].filter(c => c !== category),
      [toType]: [...prev[toType], category]
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save to InstaBack
      const result = await saveEventTypeConfig({
        id: configId,
        productionCategories: classifications.production,
        socialCategories: classifications.social
      });
      
      if (result?.id) {
        setConfigId(result.id);
      }
      
      // Also update localStorage for quick access
      localStorage.setItem('event_type_classifications', JSON.stringify(classifications));
      toast.success('סיווג הקטגוריות נשמר בהצלחה!');
    } catch (error) {
      console.error('Failed to save to server:', error);
      // Fallback - save to localStorage only
      localStorage.setItem('event_type_classifications', JSON.stringify(classifications));
      toast.warning('נשמר מקומית בלבד - בעיה בשמירה לשרת');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToDefaults = () => {
    setClassifications(DEFAULT_CLASSIFICATIONS);
    toast.info('הוחזרו הגדרות ברירת מחדל');
  };

  // Filter categories based on search
  const filteredProduction = useMemo(() => {
    if (!searchTerm) return classifications.production;
    return classifications.production.filter(c => 
      c.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [classifications.production, searchTerm]);

  const filteredSocial = useMemo(() => {
    if (!searchTerm) return classifications.social;
    return classifications.social.filter(c => 
      c.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [classifications.social, searchTerm]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
          <span className="mr-2 text-gray-600">טוען הגדרות...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-orange-600" />
          סיווג קטגוריות אירועים
          {configId && (
            <Badge variant="outline" className="text-xs text-green-600 border-green-300">
              מסונכרן עם השרת
            </Badge>
          )}
        </CardTitle>
        <p className="text-sm text-gray-500 mt-1">
          קבע אילו קטגוריות שייכות לאירועי הפקה ואילו למפגשים חברתיים. 
          הממשק והטאבים ישתנו בהתאם.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="חפש קטגוריה..."
            className="pr-10"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Production Events */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              <h3 className="font-semibold text-gray-900">אירועי הפקה</h3>
              <Badge variant="outline" className="text-xs">
                {classifications.production.length}
              </Badge>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              חתונות, כנסים, אירועים עסקיים - כולל תקציב, ספקים, אישורי הגעה
            </p>
            
            <div className="flex flex-wrap gap-2 min-h-[100px] p-3 bg-orange-50 rounded-lg border border-orange-200">
              {filteredProduction.map((category) => (
                <Badge 
                  key={category} 
                  className="bg-orange-100 text-orange-800 px-3 py-1.5 flex items-center gap-2 hover:bg-orange-200 transition-colors"
                >
                  {category}
                  <button
                    onClick={() => handleMoveCategory(category, 'production', 'social')}
                    className="hover:bg-orange-300 rounded p-0.5"
                    title="העבר לחברתי"
                  >
                    <Users className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleRemoveCategory('production', category)}
                    className="hover:bg-red-200 rounded p-0.5"
                    title="מחק"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
              {filteredProduction.length === 0 && (
                <p className="text-sm text-gray-400 w-full text-center py-4">
                  {searchTerm ? 'לא נמצאו תוצאות' : 'אין קטגוריות'}
                </p>
              )}
            </div>

            {/* Add new */}
            <div className="flex gap-2">
              <Input
                value={newProductionCategory}
                onChange={(e) => setNewProductionCategory(e.target.value)}
                placeholder="הוסף קטגוריית הפקה..."
                className="flex-1"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddCategory('production', newProductionCategory);
                  }
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddCategory('production', newProductionCategory)}
                disabled={!newProductionCategory.trim()}
                className="border-orange-300 text-orange-700 hover:bg-orange-50"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Social Events */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <h3 className="font-semibold text-gray-900">מפגשים חברתיים</h3>
              <Badge variant="outline" className="text-xs">
                {classifications.social.length}
              </Badge>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              יציאות, ארוחות, בילויים - כולל סקרים, צ'אט מהיר, משימות קלילות
            </p>
            
            <div className="flex flex-wrap gap-2 min-h-[100px] p-3 bg-blue-50 rounded-lg border border-blue-200">
              {filteredSocial.map((category) => (
                <Badge 
                  key={category} 
                  className="bg-blue-100 text-blue-800 px-3 py-1.5 flex items-center gap-2 hover:bg-blue-200 transition-colors"
                >
                  {category}
                  <button
                    onClick={() => handleMoveCategory(category, 'social', 'production')}
                    className="hover:bg-blue-300 rounded p-0.5"
                    title="העבר להפקה"
                  >
                    <Sparkles className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleRemoveCategory('social', category)}
                    className="hover:bg-red-200 rounded p-0.5"
                    title="מחק"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
              {filteredSocial.length === 0 && (
                <p className="text-sm text-gray-400 w-full text-center py-4">
                  {searchTerm ? 'לא נמצאו תוצאות' : 'אין קטגוריות'}
                </p>
              )}
            </div>

            {/* Add new */}
            <div className="flex gap-2">
              <Input
                value={newSocialCategory}
                onChange={(e) => setNewSocialCategory(e.target.value)}
                placeholder="הוסף קטגוריה חברתית..."
                className="flex-1"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddCategory('social', newSocialCategory);
                  }
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddCategory('social', newSocialCategory)}
                disabled={!newSocialCategory.trim()}
                className="border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleResetToDefaults}
            className="text-gray-600"
          >
            אפס לברירת מחדל
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-orange-500 hover:bg-orange-600"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 ml-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 ml-2" />
            )}
            שמור שינויים
          </Button>
        </div>

        {/* Info Box */}
        <div className="bg-gradient-to-r from-orange-50 to-blue-50 border border-orange-200 rounded-lg p-4">
          <p className="text-sm text-gray-700">
            <strong>💡 איך זה עובד:</strong>
          </p>
          <ul className="text-sm text-gray-600 mt-2 space-y-1 list-disc list-inside">
            <li><strong className="text-orange-600">אירועי הפקה:</strong> מציגים טאבים של תקציב, ספקים, אישורי הגעה מפורטים</li>
            <li><strong className="text-blue-600">מפגשים חברתיים:</strong> מציגים סקרים, צ'אט מהיר, משימות קלילות</li>
            <li>כשמשתמש יוצר אירוע, הקטגוריה שהוא בוחר תקבע את סוג האירוע</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

// Export helper function to get event type by category (sync - uses localStorage cache)
export function getEventTypeByCategory(category) {
  if (!category) return 'social';
  
  try {
    const saved = localStorage.getItem('event_type_classifications');
    if (saved) {
      const classifications = JSON.parse(saved);
      if (classifications.production?.includes(category)) return 'production';
      if (classifications.social?.includes(category)) return 'social';
    }
  } catch (e) {
    console.warn('Failed to get event type by category');
  }
  
  // Default classifications
  const defaultProduction = [
    'חתונה', 'אירוסין', 'ברית מילה', 'בת מצווה', 'בר מצווה', 
    'חינה', 'שבת חתן', 'בריתה', 'כנס', 'הרצאה', 'סדנה',
    'אירוע חברה', 'גיבוש', 'השקה'
  ];
  
  if (defaultProduction.includes(category)) return 'production';
  return 'social';
}

// Async version that fetches from server if needed
export async function getEventTypeByCategoryAsync(category) {
  if (!category) return 'social';
  
  // First try localStorage (fast)
  const localResult = getEventTypeByCategory(category);
  
  // If we have local data, use it
  const saved = localStorage.getItem('event_type_classifications');
  if (saved) {
    return localResult;
  }
  
  // Otherwise fetch from server
  try {
    const { getEventTypeConfig } = await import('@/components/instabackService');
    const config = await getEventTypeConfig();
    if (config) {
      // Cache it
      localStorage.setItem('event_type_classifications', JSON.stringify({
        production: config.productionCategories || [],
        social: config.socialCategories || []
      }));
      
      if (config.productionCategories?.includes(category)) return 'production';
      if (config.socialCategories?.includes(category)) return 'social';
    }
  } catch (e) {
    console.warn('Failed to fetch event type config from server');
  }
  
  return localResult;
}
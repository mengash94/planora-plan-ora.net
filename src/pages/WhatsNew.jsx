import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listAppVersions } from '@/components/instabackService';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowRight, 
  Sparkles, 
  Bug, 
  TrendingUp,
  Package,
  Calendar,
  Rocket
} from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

export default function WhatsNewPage() {
  const navigate = useNavigate();
  const [versions, setVersions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadVersions();
  }, []);

  const loadVersions = async () => {
    try {
      const data = await listAppVersions();
      // סינון רק גרסאות מפורסמות ומיון לפי תאריך
      const published = (data || [])
        .filter(v => v.is_published)
        .sort((a, b) => 
          new Date(b.release_date || b.created_date) - new Date(a.release_date || a.created_date)
        );
      setVersions(published);
    } catch (error) {
      console.error('Failed to load versions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getFeatureIcon = (type) => {
    switch (type) {
      case 'feature': return <Sparkles className="w-4 h-4 text-purple-500" />;
      case 'improvement': return <TrendingUp className="w-4 h-4 text-blue-500" />;
      case 'bugfix': return <Bug className="w-4 h-4 text-red-500" />;
      default: return <Sparkles className="w-4 h-4 text-gray-500" />;
    }
  };

  const getFeatureBadgeColor = (type) => {
    switch (type) {
      case 'feature': return 'bg-purple-100 text-purple-700';
      case 'improvement': return 'bg-blue-100 text-blue-700';
      case 'bugfix': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getFeatureLabel = (type) => {
    switch (type) {
      case 'feature': return 'חדש';
      case 'improvement': return 'שיפור';
      case 'bugfix': return 'תיקון';
      default: return type;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4" style={{ direction: 'rtl' }}>
        <div className="max-w-2xl mx-auto space-y-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50" style={{ direction: 'rtl' }}>
      {/* Header */}
      <header className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <button 
            onClick={() => navigate(-1)} 
            className="hover:bg-white/20 rounded-full p-2 mb-4 inline-flex"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <div className="text-center">
            <div className="w-16 h-16 bg-white/20 rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <Rocket className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold mb-2">מה חדש ב-Planora?</h1>
            <p className="text-purple-100">גלה את הפיצ'רים והשיפורים האחרונים</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto p-4 -mt-4">
        {versions.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">אין עדכונים עדיין</h3>
              <p className="text-gray-500">בקרוב יהיו כאן חדשות מרגשות!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {versions.map((version, vIndex) => (
              <Card 
                key={version.id} 
                className={`overflow-hidden ${vIndex === 0 ? 'border-2 border-purple-200 shadow-lg' : ''}`}
              >
                {vIndex === 0 && (
                  <div className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-center py-1 text-xs font-medium">
                    ✨ הגרסה האחרונה
                  </div>
                )}
                <CardContent className="p-4">
                  <div className="flex items-start gap-3 mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${vIndex === 0 ? 'bg-purple-100' : 'bg-gray-100'}`}>
                      <Package className={`w-6 h-6 ${vIndex === 0 ? 'text-purple-600' : 'text-gray-500'}`} />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-lg font-bold text-gray-900">
                        גרסה {version.version}
                      </h2>
                      <p className="text-gray-600">{version.title}</p>
                      {version.release_date && (
                        <p className="text-gray-400 text-xs flex items-center gap-1 mt-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(version.release_date), 'dd בMMMM yyyy', { locale: he })}
                        </p>
                      )}
                    </div>
                  </div>

                  {version.features && version.features.length > 0 && (
                    <div className="space-y-2">
                      {version.features.map((feature, index) => (
                        <div 
                          key={index} 
                          className="flex items-start gap-3 bg-gray-50 rounded-lg p-3"
                        >
                          <div className="mt-0.5">
                            {getFeatureIcon(feature.type)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-900">{feature.title}</span>
                              <Badge className={`text-[10px] ${getFeatureBadgeColor(feature.type)}`}>
                                {getFeatureLabel(feature.type)}
                              </Badge>
                            </div>
                            {feature.description && (
                              <p className="text-gray-500 text-sm">{feature.description}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {version.notes && (
                    <div className="mt-4 bg-yellow-50 border border-yellow-100 rounded-lg p-3">
                      <p className="text-yellow-800 text-sm">{version.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-8 text-gray-400 text-sm">
          <p>תודה שאתם משתמשים ב-Planora! 💜</p>
          <p className="mt-1">יש לכם רעיונות? שלחו לנו פידבק</p>
        </div>
      </main>
    </div>
  );
}
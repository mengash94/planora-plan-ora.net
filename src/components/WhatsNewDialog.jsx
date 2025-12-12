import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, TrendingUp, Bug, X, CheckCircle } from 'lucide-react';
import { formatIsraelDate } from '@/components/utils/dateHelpers';

export default function WhatsNewDialog({ versions, isOpen, onClose, onMarkSeen }) {
  if (!versions || versions.length === 0) return null;

  const handleClose = () => {
    // Mark all shown versions as seen
    const versionNumbers = versions.map(v => v.version);
    if (onMarkSeen) {
      onMarkSeen(versionNumbers);
    }
    onClose();
  };

  const getFeatureIcon = (type) => {
    switch (type) {
      case 'feature': return <Sparkles className="w-4 h-4 text-purple-500" />;
      case 'improvement': return <TrendingUp className="w-4 h-4 text-blue-500" />;
      case 'bugfix': return <Bug className="w-4 h-4 text-red-500" />;
      default: return <Sparkles className="w-4 h-4 text-gray-500" />;
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

  const getFeatureBadgeColor = (type) => {
    switch (type) {
      case 'feature': return 'bg-purple-100 text-purple-800';
      case 'improvement': return 'bg-blue-100 text-blue-800';
      case 'bugfix': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              מה חדש?
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {versions.map((version, vIndex) => (
            <div key={version.id || vIndex} className="border-b last:border-b-0 pb-6 last:pb-0">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    גרסה {version.version}
                  </h3>
                  <p className="text-gray-600">{version.title}</p>
                  {(version.release_date || version.releaseDate) && (
                    <p className="text-sm text-gray-400 mt-1">
                      {formatIsraelDate(version.release_date || version.releaseDate)}
                    </p>
                  )}
                </div>
              </div>

              {version.features && version.features.length > 0 && (
                <div className="space-y-2">
                  {version.features.map((feature, fIndex) => (
                    <div
                      key={fIndex}
                      className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      {getFeatureIcon(feature.type)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-gray-900">{feature.title}</p>
                          <Badge className={`text-xs ${getFeatureBadgeColor(feature.type)}`}>
                            {getFeatureLabel(feature.type)}
                          </Badge>
                        </div>
                        {feature.description && (
                          <p className="text-sm text-gray-600">{feature.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {version.notes && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">{version.notes}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button onClick={handleClose} className="bg-purple-600 hover:bg-purple-700">
            <CheckCircle className="w-4 h-4 ml-2" />
            סגור והמשך
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
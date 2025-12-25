import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/components/AuthProvider';
import { 
  listAppVersions, 
  createAppVersion, 
  updateAppVersion, 
  deleteAppVersion,
  createNotificationsAndSendPushBulk,
  listUsers
} from '@/components/instabackService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ArrowRight, 
  Plus, 
  Edit, 
  Trash2, 
  Send, 
  Sparkles, 
  Bug, 
  TrendingUp,
  Loader2,
  Package,
  Calendar,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

export default function AdminVersionsPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [versions, setVersions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVersion, setEditingVersion] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingNotification, setIsSendingNotification] = useState(false);

  const [formData, setFormData] = useState({
    version: '',
    title: '',
    release_date: new Date().toISOString().split('T')[0],
    features: [],
    notes: '',
    is_published: false
  });

  const [newFeature, setNewFeature] = useState({
    title: '',
    description: '',
    type: 'feature'
  });

  const [isQuickPublishing, setIsQuickPublishing] = useState(false);

  // פרסום מהיר של גרסה חדשה עם הפרטים שהוגדרו מראש
  const handleQuickPublish = async () => {
    setIsQuickPublishing(true);
    try {
      const newVersion = {
        version: '1.1',
        title: 'רענון אוטומטי בעדכון גרסה',
        release_date: new Date().toISOString().split('T')[0],
        releaseDate: new Date().toISOString(),
        features: [
          {
            title: 'בדיקת גרסה אוטומטית',
            description: 'האפליקציה בודקת אם יש גרסה חדשה כשחוזרים מהרקע ומרעננת אוטומטית',
            type: 'feature'
          },
          {
            title: 'שמירת גרסה מקומית',
            description: 'שמירה של הגרסה הנוכחית ב-localStorage להשוואה',
            type: 'improvement'
          }
        ],
        notes: 'עדכון זה מוודא שמשתמשים תמיד יקבלו את הגרסה העדכנית ביותר של האפליקציה',
        is_published: true,
        isPublished: true,
        showPopup: true,
        show_popup: true,
        notificationSent: false,
        notification_sent: false
      };

      await createAppVersion(newVersion);
      toast.success('גרסה 1.1 פורסמה בהצלחה!');
      loadVersions();
    } catch (error) {
      console.error('Failed to quick publish:', error);
      toast.error('שגיאה בפרסום הגרסה');
    } finally {
      setIsQuickPublishing(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate(createPageUrl('Home'));
      return;
    }
    if (user?.role !== 'admin') {
      navigate(createPageUrl('Home'));
      return;
    }
    loadVersions();
  }, [isAuthenticated, user]);

  const loadVersions = async () => {
    try {
      const data = await listAppVersions();
      // מיון לפי תאריך שחרור (החדש ביותר קודם)
      const sorted = (data || []).sort((a, b) => 
        new Date(b.release_date || b.created_date) - new Date(a.release_date || a.created_date)
      );
      setVersions(sorted);
    } catch (error) {
      console.error('Failed to load versions:', error);
      toast.error('שגיאה בטעינת הגרסאות');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (version = null) => {
    if (version) {
      setEditingVersion(version);
      setFormData({
        version: version.version || '',
        title: version.title || '',
        release_date: version.release_date || new Date().toISOString().split('T')[0],
        features: version.features || [],
        notes: version.notes || '',
        is_published: version.is_published || false
      });
    } else {
      setEditingVersion(null);
      setFormData({
        version: '',
        title: '',
        release_date: new Date().toISOString().split('T')[0],
        features: [],
        notes: '',
        is_published: false
      });
    }
    setIsDialogOpen(true);
  };

  const handleAddFeature = () => {
    if (!newFeature.title.trim()) return;
    
    setFormData(prev => ({
      ...prev,
      features: [...prev.features, { ...newFeature }]
    }));
    setNewFeature({ title: '', description: '', type: 'feature' });
  };

  const handleRemoveFeature = (index) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    if (!formData.version.trim() || !formData.title.trim()) {
      toast.error('נא למלא מספר גרסה וכותרת');
      return;
    }

    setIsSaving(true);
    try {
      if (editingVersion) {
        await updateAppVersion(editingVersion.id, formData);
        toast.success('הגרסה עודכנה בהצלחה');
      } else {
        await createAppVersion(formData);
        toast.success('הגרסה נוצרה בהצלחה');
      }
      setIsDialogOpen(false);
      loadVersions();
    } catch (error) {
      console.error('Failed to save version:', error);
      toast.error('שגיאה בשמירת הגרסה');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (versionId) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק גרסה זו?')) return;

    try {
      await deleteAppVersion(versionId);
      toast.success('הגרסה נמחקה');
      loadVersions();
    } catch (error) {
      console.error('Failed to delete version:', error);
      toast.error('שגיאה במחיקת הגרסה');
    }
  };

  const handleSendNotification = async (version) => {
    if (!confirm(`האם לשלוח עדכון לכל המשתמשים על גרסה ${version.version}?`)) return;

    setIsSendingNotification(true);
    try {
      // קבלת כל המשתמשים
      const users = await listUsers();
      const userIds = users.map(u => u.id).filter(id => id !== user?.id);

      if (userIds.length === 0) {
        toast.info('אין משתמשים לשלוח אליהם');
        return;
      }

      // יצירת תוכן ההתראה
      const featuresText = (version.features || [])
        .slice(0, 3)
        .map(f => `• ${f.title}`)
        .join('\n');

      const message = `${version.title}\n${featuresText}${version.features?.length > 3 ? '\n• ועוד...' : ''}`;

      await createNotificationsAndSendPushBulk({
        userIds,
        type: 'update',
        title: `🎉 גרסה חדשה: ${version.version}`,
        message,
        actionUrl: createPageUrl('WhatsNew'),
        priority: 'normal'
      });

      // עדכון שההתראה נשלחה
      await updateAppVersion(version.id, { notification_sent: true });
      
      toast.success(`ההתראה נשלחה ל-${userIds.length} משתמשים!`);
      loadVersions();
    } catch (error) {
      console.error('Failed to send notification:', error);
      toast.error('שגיאה בשליחת ההתראה');
    } finally {
      setIsSendingNotification(false);
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

  const getFeatureLabel = (type) => {
    switch (type) {
      case 'feature': return 'פיצ\'ר חדש';
      case 'improvement': return 'שיפור';
      case 'bugfix': return 'תיקון באג';
      default: return type;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ direction: 'rtl' }}>
      {/* Header */}
      <header className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(createPageUrl('AdminDashboard'))} className="hover:bg-white/20 rounded-full p-2">
                <ArrowRight className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <Package className="w-6 h-6" />
                  ניהול גרסאות
                </h1>
                <p className="text-purple-100 text-sm">תיעוד פיצ'רים ושליחת עדכונים</p>
              </div>
            </div>
            <Button 
              onClick={() => handleOpenDialog()} 
              className="bg-white text-purple-600 hover:bg-purple-50"
            >
              <Plus className="w-4 h-4 ml-1" />
              גרסה חדשה
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto p-4 space-y-4">
        {versions.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">אין גרסאות עדיין</h3>
              <p className="text-gray-500 mb-4">התחל לתעד את הפיצ'רים והשיפורים באפליקציה</p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 ml-1" />
                צור גרסה ראשונה
              </Button>
            </CardContent>
          </Card>
        ) : (
          versions.map((version) => (
            <Card key={version.id} className={`${!version.is_published ? 'border-dashed border-2 border-gray-300' : ''}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                      <Package className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        גרסה {version.version}
                        {!version.is_published && (
                          <Badge variant="outline" className="text-xs">טיוטה</Badge>
                        )}
                        {version.notification_sent && (
                          <Badge className="bg-green-100 text-green-700 text-xs">
                            <CheckCircle className="w-3 h-3 ml-1" />
                            נשלח
                          </Badge>
                        )}
                      </CardTitle>
                      <p className="text-gray-600 text-sm">{version.title}</p>
                      {version.release_date && (
                        <p className="text-gray-400 text-xs flex items-center gap-1 mt-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(version.release_date), 'dd/MM/yyyy', { locale: he })}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {version.is_published && !version.notification_sent && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSendNotification(version)}
                        disabled={isSendingNotification}
                        className="text-blue-600 border-blue-200"
                      >
                        {isSendingNotification ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Send className="w-4 h-4 ml-1" />
                            שלח עדכון
                          </>
                        )}
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => handleOpenDialog(version)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(version.id)} className="text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {version.features && version.features.length > 0 && (
                  <div className="space-y-2">
                    {version.features.map((feature, index) => (
                      <div key={index} className="flex items-start gap-2 bg-gray-50 rounded-lg p-2">
                        {getFeatureIcon(feature.type)}
                        <div className="flex-1">
                          <p className="font-medium text-sm">{feature.title}</p>
                          {feature.description && (
                            <p className="text-gray-500 text-xs">{feature.description}</p>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {getFeatureLabel(feature.type)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
                {version.notes && (
                  <p className="text-gray-500 text-sm mt-3 bg-yellow-50 p-2 rounded">{version.notes}</p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </main>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingVersion ? 'עריכת גרסה' : 'גרסה חדשה'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>מספר גרסה *</Label>
                <Input
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  placeholder="1.0.0"
                />
              </div>
              <div className="space-y-2">
                <Label>תאריך שחרור</Label>
                <Input
                  type="date"
                  value={formData.release_date}
                  onChange={(e) => setFormData({ ...formData, release_date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>כותרת *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="שיפורים ופיצ'רים חדשים"
              />
            </div>

            {/* Features */}
            <div className="space-y-2">
              <Label>פיצ'רים ושיפורים</Label>
              
              {formData.features.length > 0 && (
                <div className="space-y-2 mb-3">
                  {formData.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 bg-gray-50 rounded p-2">
                      {getFeatureIcon(feature.type)}
                      <span className="flex-1 text-sm">{feature.title}</span>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => handleRemoveFeature(index)}
                        className="text-red-500 h-6 w-6 p-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="border rounded-lg p-3 space-y-2 bg-gray-50">
                <div className="flex gap-2">
                  <Input
                    value={newFeature.title}
                    onChange={(e) => setNewFeature({ ...newFeature, title: e.target.value })}
                    placeholder="כותרת הפיצ'ר"
                    className="flex-1"
                  />
                  <Select
                    value={newFeature.type}
                    onValueChange={(value) => setNewFeature({ ...newFeature, type: value })}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="feature">פיצ'ר</SelectItem>
                      <SelectItem value="improvement">שיפור</SelectItem>
                      <SelectItem value="bugfix">תיקון</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  value={newFeature.description}
                  onChange={(e) => setNewFeature({ ...newFeature, description: e.target.value })}
                  placeholder="תיאור (אופציונלי)"
                />
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleAddFeature}
                  disabled={!newFeature.title.trim()}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 ml-1" />
                  הוסף
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>הערות נוספות</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="הערות או מידע נוסף..."
                rows={2}
              />
            </div>

            <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
              <div>
                <Label>פרסום הגרסה</Label>
                <p className="text-xs text-gray-500">גרסאות מפורסמות יופיעו בדף "מה חדש"</p>
              </div>
              <Switch
                checked={formData.is_published}
                onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              ביטול
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                editingVersion ? 'עדכן' : 'צור גרסה'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
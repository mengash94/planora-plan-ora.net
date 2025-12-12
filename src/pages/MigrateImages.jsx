import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, AlertCircle, Download, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { uploadFileToInstaback, updateEvent } from '@/components/instabackService';

export default function MigrateImagesPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState([]);
  const [stats, setStats] = useState({ total: 0, success: 0, failed: 0, skipped: 0 });

  // Helper function to download file from URL
  const downloadFileFromUrl = async (url, fileName) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      return new File([blob], fileName, { type: blob.type });
    } catch (error) {
      throw new Error(`Failed to download: ${error.message}`);
    }
  };

  // Helper function to extract filename from URL
  const extractFileName = (url) => {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const fileName = pathname.split('/').pop();
      return fileName || 'unknown-file';
    } catch {
      return `file-${Date.now()}`;
    }
  };

  // Check if URL is from Base44
  const isBase44Url = (url) => {
    return url && (url.includes('base44.com') || url.includes('base44.io') || url.includes('base44') || !url.includes('instaback.ai'));
  };

  const addResult = (type, item, status, message, newUrl = null) => {
    setResults(prev => [...prev, { type, item, status, message, newUrl, timestamp: Date.now() }]);
  };

  const migrateImages = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    setProgress(0);
    setResults([]);
    setStats({ total: 0, success: 0, failed: 0, skipped: 0 });

    try {
      toast.info('מתחיל העברת תמונות...');
      
      // Step 1: Get all entities with image URLs
      const [events, mediaItems, messages, documents] = await Promise.all([
        fetch('/api/entities/Event').then(r => r.json()).catch(() => []),
        fetch('/api/entities/MediaItem').then(r => r.json()).catch(() => []),
        fetch('/api/entities/Message').then(r => r.json()).catch(() => []),
        fetch('/api/entities/EventDocument').then(r => r.json()).catch(() => [])
      ]);

      // Collect all items that need migration
      const itemsToMigrate = [];

      // Event cover images
      events.forEach(event => {
        if (event.coverImageUrl && isBase44Url(event.coverImageUrl)) {
          itemsToMigrate.push({
            type: 'event_cover',
            id: event.id,
            url: event.coverImageUrl,
            eventId: event.id,
            subfolder: 'event-covers'
          });
        }
      });

      // Media items (gallery images)
      mediaItems.forEach(item => {
        if (item.fileUri && isBase44Url(item.fileUri)) {
          itemsToMigrate.push({
            type: 'media_item',
            id: item.id,
            url: item.fileUri,
            eventId: item.eventId,
            subfolder: 'gallery',
            fileName: item.fileName
          });
        }
      });

      // Chat files
      messages.forEach(message => {
        if (message.fileUrl && isBase44Url(message.fileUrl)) {
          itemsToMigrate.push({
            type: 'chat_file',
            id: message.id,
            url: message.fileUrl,
            eventId: message.eventId,
            subfolder: 'chat'
          });
        }
      });

      // Documents
      documents.forEach(doc => {
        if (doc.fileUrl && isBase44Url(doc.fileUrl)) {
          itemsToMigrate.push({
            type: 'document',
            id: doc.id,
            url: doc.fileUrl,
            eventId: doc.eventId,
            subfolder: 'documents',
            fileName: doc.fileName
          });
        }
      });

      setStats(prev => ({ ...prev, total: itemsToMigrate.length }));

      if (itemsToMigrate.length === 0) {
        toast.success('לא נמצאו תמונות להעברה!');
        setIsRunning(false);
        return;
      }

      toast.info(`נמצאו ${itemsToMigrate.length} קבצים להעברה`);

      // Step 2: Migrate each item
      for (let i = 0; i < itemsToMigrate.length; i++) {
        const item = itemsToMigrate[i];
        setProgress((i / itemsToMigrate.length) * 100);

        try {
          // Download file from Base44
          const fileName = item.fileName || extractFileName(item.url);
          const file = await downloadFileFromUrl(item.url, fileName);
          
          // Upload to InstaBack
          const uploadResult = await uploadFileToInstaback(file, item.eventId, item.subfolder);
          
          if (!uploadResult.file_url) {
            throw new Error('No file URL returned from upload');
          }

          // Update database record
          switch (item.type) {
            case 'event_cover':
              await updateEvent(item.id, { coverImageUrl: uploadResult.file_url });
              break;
            case 'media_item':
              // Note: You may need to implement updateMediaItem in instabackService
              await fetch(`/api/entities/MediaItem/${item.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileUri: uploadResult.file_url })
              });
              break;
            case 'chat_file':
              await fetch(`/api/entities/Message/${item.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileUrl: uploadResult.file_url })
              });
              break;
            case 'document':
              // Note: You may need to implement updateEventDocument in instabackService
              await fetch(`/api/entities/EventDocument/${item.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileUrl: uploadResult.file_url })
              });
              break;
          }

          addResult(item.type, item, 'success', 'הועבר בהצלחה', uploadResult.file_url);
          setStats(prev => ({ ...prev, success: prev.success + 1 }));

        } catch (error) {
          console.error(`Migration failed for ${item.type} ${item.id}:`, error);
          addResult(item.type, item, 'failed', error.message);
          setStats(prev => ({ ...prev, failed: prev.failed + 1 }));
        }

        // Small delay to prevent overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      setProgress(100);
      toast.success(`העברה הושלמה! ${stats.success} הצליחו, ${stats.failed} נכשלו`);

    } catch (error) {
      console.error('Migration failed:', error);
      toast.error('שגיאה בתהליך ההעברה');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl" style={{ direction: 'rtl' }}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-6 h-6" />
            העברת תמונות מ-Base44 ל-InstaBack
          </CardTitle>
          <p className="text-sm text-gray-600">
            כלי זה יעביר את כל התמונות הקיימות מ-Base44 לשרת InstaBack שלך
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Control Panel */}
          <div className="flex items-center justify-between">
            <Button 
              onClick={migrateImages} 
              disabled={isRunning}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isRunning ? (
                <>
                  <Upload className="w-4 h-4 mr-2 animate-pulse" />
                  מעביר תמונות...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  התחל העברה
                </>
              )}
            </Button>
            
            {isRunning && (
              <div className="flex items-center gap-4">
                <Progress value={progress} className="w-32" />
                <span className="text-sm">{Math.round(progress)}%</span>
              </div>
            )}
          </div>

          {/* Stats */}
          {stats.total > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-sm text-gray-600">סה"כ</div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">{stats.success}</div>
                <div className="text-sm text-gray-600">הצליחו</div>
              </div>
              <div className="bg-red-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
                <div className="text-sm text-gray-600">נכשלו</div>
              </div>
              <div className="bg-yellow-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-yellow-600">{stats.skipped}</div>
                <div className="text-sm text-gray-600">דילגו</div>
              </div>
            </div>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              <h3 className="font-semibold">תוצאות:</h3>
              {results.slice(-20).reverse().map((result, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  {result.status === 'success' ? (
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  ) : result.status === 'failed' ? (
                    <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className="font-medium">{result.type} - {result.item.id}</div>
                    <div className="text-sm text-gray-600">{result.message}</div>
                    {result.newUrl && (
                      <div className="text-xs text-blue-600 break-all">{result.newUrl}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
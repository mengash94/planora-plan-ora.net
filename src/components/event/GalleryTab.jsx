import React, { useState, useEffect } from 'react';
import { Loader2, Upload, Trash2, X, Image as ImageIcon, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
    listMediaItems, 
    createMediaItem, 
    deleteMediaItem,
    uploadFileToInstaback,
    deleteFileFromInstaback,
    resolveInstabackFileUrl
} from '@/components/instabackService';
import { compressImage } from '@/components/utils/imageCompressor';

export default function GalleryTab({ eventId, currentUser, initialMediaItems = [], isManager, isReadOnly = false, onDataRefresh }) {
    const [mediaItems, setMediaItems] = useState(initialMediaItems);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, item: null });
    const { toast } = useToast();

    // ✅ FIX: טעינה מחדש בכל פעם שהטאב נטען
    useEffect(() => {
        loadMediaItems();
    }, [eventId]); // רק eventId בdependency, לא initialMediaItems

    const loadMediaItems = async () => {
        setIsLoading(true);
        try {
            console.log('[GalleryTab] Loading media items for event:', eventId);
            const items = await listMediaItems(eventId);
            console.log('[GalleryTab] Loaded media items:', items);
            setMediaItems(items || []);
            if (onDataRefresh) {
                onDataRefresh();
            }
        } catch (error) {
            console.error('[GalleryTab] Failed to load media items:', error);
            toast({
                title: 'שגיאה בטעינת התמונות',
                description: error.message,
                variant: 'destructive'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleImageUpload = async (event) => {
        const files = Array.from(event.target.files || []);
        if (files.length === 0) return;

        if (!currentUser || !currentUser.id) {
            console.error('[GalleryTab] currentUser is missing or invalid:', currentUser);
            toast({
                title: 'שגיאה',
                description: 'לא ניתן לזהות את המשתמש הנוכחי. אנא התחבר מחדש.',
                variant: 'destructive'
            });
            if (event.target) {
                event.target.value = '';
            }
            return;
        }

        console.log('[GalleryTab] Starting upload for', files.length, 'files');
        console.log('[GalleryTab] Current user:', currentUser);
        setIsUploading(true);

        try {
            const uploadPromises = files.map(async (file) => {
                console.log('[GalleryTab] Processing file:', file.name);
                
                const compressedFile = await compressImage(file, {
                    maxWidth: 1920,
                    maxHeight: 1920,
                    quality: 0.85
                });

                console.log('[GalleryTab] Uploading to InstaBack:', compressedFile.name);
                const uploadResult = await uploadFileToInstaback(compressedFile, eventId, 'gallery');
                
                console.log('[GalleryTab] Upload result:', uploadResult);

                if (!uploadResult.file_url) {
                    throw new Error('No file URL returned from upload');
                }

                const mediaData = {
                    eventId: eventId,
                    uploaderId: currentUser.id,
                    fileUrl: uploadResult.file_url,
                    fileName: compressedFile.name,
                    fileType: compressedFile.type,
                    fileSize: compressedFile.size
                };

                console.log('[GalleryTab] Creating MediaItem with data:', mediaData);
                const mediaItem = await createMediaItem(mediaData);
                console.log('[GalleryTab] MediaItem created:', mediaItem);
                
                return mediaItem;
            });

            const newItems = await Promise.all(uploadPromises);
            setMediaItems(prev => [...newItems, ...prev]);

            toast({
                title: files.length === 1 ? 'התמונה הועלתה בהצלחה! 📸' : `${files.length} תמונות הועלו בהצלחה! 📸`,
                description: 'התמונות נוספו לגלריית האירוע',
                duration: 3000
            });

            if (onDataRefresh) {
                onDataRefresh();
            }

            if (event.target) {
                event.target.value = '';
            }
        } catch (error) {
            console.error('[GalleryTab] Upload failed:', error);
            toast({
                title: 'שגיאה בהעלאת התמונות',
                description: error.message,
                variant: 'destructive',
                duration: 5000
            });
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteImage = async (item) => {
        setDeleteDialog({ isOpen: true, item });
    };

    const confirmDelete = async () => {
        const item = deleteDialog.item;
        if (!item) return;

        try {
            console.log('[GalleryTab] Deleting media item:', item.id);
            
            if (item.fileUrl) {
                await deleteFileFromInstaback(item.fileUrl);
            }

            await deleteMediaItem(item.id);

            setMediaItems(prev => prev.filter(m => m.id !== item.id));

            toast({
                title: 'התמונה נמחקה בהצלחה',
                description: 'התמונה הוסרה מהגלריה'
            });

            if (onDataRefresh) {
                onDataRefresh();
            }
        } catch (error) {
            console.error('[GalleryTab] Delete failed:', error);
            toast({
                title: 'שגיאה במחיקת התמונה',
                description: error.message,
                variant: 'destructive'
            });
        } finally {
            setDeleteDialog({ isOpen: false, item: null });
        }
    };

    const canDelete = (item) => {
        if (!currentUser) return false;
        return currentUser.id === item.uploaderId || isManager;
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Upload Section */}
            {!isReadOnly && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">העלאת תמונות</h3>
                        <label htmlFor="gallery-upload" className="cursor-pointer">
                            <Button 
                                disabled={isUploading || isReadOnly}
                                className="bg-orange-500 hover:bg-orange-600"
                                asChild
                            >
                                <span>
                                    {isUploading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                                            מעלה...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-4 h-4 ml-2" />
                                            העלאת תמונות
                                        </>
                                    )}
                                </span>
                            </Button>
                            <input
                                id="gallery-upload"
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleImageUpload}
                                className="hidden"
                                disabled={isUploading || isReadOnly}
                            />
                        </label>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        ניתן להעלות מספר תמונות בו-זמנית. התמונות יידחסו אוטומטית לביצועים מיטביים.
                    </p>
                </div>
            )}

            {/* Gallery Grid */}
            {mediaItems.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                    <ImageIcon className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
                    <p className="text-gray-600 dark:text-gray-300 mb-2">אין תמונות בגלריה</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">העלה תמונות ראשונות כדי להתחיל</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                    {mediaItems.map((item) => {
                        const imageUrl = resolveInstabackFileUrl(item.fileUrl);
                        
                        return (
                            <div
                                key={item.id}
                                className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                                onClick={() => setSelectedImage(item)}
                            >
                                {imageUrl ? (
                                    <img
                                        src={imageUrl}
                                        alt={item.fileName || 'תמונה'}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            console.error('[GalleryTab] Failed to load image:', imageUrl);
                                            e.target.style.display = 'none';
                                            e.target.parentElement.innerHTML += '<div class="absolute inset-0 flex items-center justify-center bg-gray-200"><svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg></div>';
                                        }}
                                    />
                                ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-200">
                                        <ImageIcon className="w-12 h-12 text-gray-400 mb-2" />
                                        <p className="text-xs text-gray-500 text-center px-2">תמונה לא זמינה</p>
                                    </div>
                                )}

                                {/* Delete Button */}
                                {!isReadOnly && canDelete(item) && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteImage(item);
                                        }}
                                        className="absolute top-2 left-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Image Preview Dialog */}
            {selectedImage && (
                <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
                    <DialogContent className="max-w-4xl p-0">
                        <div className="relative">
                            <button
                                onClick={() => setSelectedImage(null)}
                                className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <img
                                src={resolveInstabackFileUrl(selectedImage.fileUrl)}
                                alt={selectedImage.fileName || 'תמונה'}
                                className="w-full h-auto max-h-[80vh] object-contain"
                            />

                            <div className="p-4 bg-white dark:bg-gray-800 border-t dark:border-gray-700">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white">{selectedImage.fileName}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {selectedImage.fileSize ? `${(selectedImage.fileSize / 1024).toFixed(0)} KB` : ''}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <a
                                            href={resolveInstabackFileUrl(selectedImage.fileUrl)}
                                            download={selectedImage.fileName}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <Button variant="outline" size="sm">
                                                <Download className="w-4 h-4 ml-2" />
                                                הורדה
                                            </Button>
                                        </a>
                                        {!isReadOnly && canDelete(selectedImage) && (
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedImage(null);
                                                    handleDeleteImage(selectedImage);
                                                }}
                                            >
                                                <Trash2 className="w-4 h-4 ml-2" />
                                                מחיקה
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialog.isOpen} onOpenChange={(open) => !open && setDeleteDialog({ isOpen: false, item: null })}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-gray-900">מחיקת תמונה</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-gray-700 mb-4">האם אתה בטוח שברצונך למחוק תמונה זו?</p>
                        {deleteDialog.item?.fileName && (
                            <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded">
                                📷 {deleteDialog.item.fileName}
                            </p>
                        )}
                        <p className="text-sm text-red-600 mt-3">⚠️ פעולה זו אינה ניתנת לביטול</p>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button 
                            variant="outline" 
                            onClick={() => setDeleteDialog({ isOpen: false, item: null })}
                        >
                            ביטול
                        </Button>
                        <Button 
                            variant="destructive" 
                            onClick={confirmDelete}
                            className="bg-red-500 hover:bg-red-600"
                        >
                            <Trash2 className="w-4 h-4 ml-2" />
                            מחק תמונה
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
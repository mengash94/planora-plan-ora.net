import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Upload, FileText, Download, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { 
    listEventDocuments, 
    createEventDocument, 
    deleteEventDocument,
    uploadFileToInstaback,
    deleteFileFromInstaback,
    resolveInstabackFileUrl
} from '@/components/instabackService';

export default function DocumentsTab({ eventId, currentUser, initialDocuments = [], isManager, isReadOnly = false, onDataRefresh }) {
    const [documents, setDocuments] = useState(initialDocuments);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, doc: null });
    const [titleDialog, setTitleDialog] = useState({
        isOpen: false,
        file: null,
        originalFileName: '',
        fileName: '',
        description: ''
    });
    const { toast } = useToast();
    const hasLoadedRef = useRef(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (!hasLoadedRef.current) {
            hasLoadedRef.current = true;
            
            if (initialDocuments && initialDocuments.length > 0) {
                console.log('[DocumentsTab] Using initial documents:', initialDocuments.length, 'items');
                setDocuments(initialDocuments);
            } else {
                console.log('[DocumentsTab] No initial documents, loading from server');
                loadDocuments();
            }
        }
    }, [eventId]);

    const loadDocuments = async () => {
        setIsLoading(true);
        try {
            console.log('[DocumentsTab] Loading documents for event:', eventId);
            const docs = await listEventDocuments(eventId);
            console.log('[DocumentsTab] Loaded documents:', docs.length, 'items');
            
            setDocuments(docs || []);
            if (onDataRefresh) {
                onDataRefresh();
            }
        } catch (error) {
            console.error('[DocumentsTab] Failed to load documents:', error);
            toast({
                title: 'שגיאה בטעינת המסמכים',
                description: error.message,
                variant: 'destructive'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileSelect = (event) => {
        const selectedFile = event.target.files?.[0];
        if (!selectedFile) return;

        if (!currentUser || !currentUser.id) {
            console.error('[DocumentsTab] currentUser is missing or invalid:', currentUser);
            toast({
                title: 'שגיאה',
                description: 'לא ניתן לזהות את המשתמש הנוכחי. אנא התחבר מחדש.',
                variant: 'destructive'
            });
            return;
        }

        // פתח דיאלוג לבקשת כותרת ותיאור
        const defaultTitle = selectedFile.name.replace(/\.[^/.]+$/, ''); // שם הקובץ ללא סיומת
        setTitleDialog({
            isOpen: true,
            file: selectedFile,
            originalFileName: selectedFile.name,
            fileName: defaultTitle,
            description: ''
        });
        
        // נקה את ה-input
        if (event.target) {
            event.target.value = '';
        }
    };

    const handleUploadWithTitle = async () => {
        if (!titleDialog.file) return;
        
        const fileName = titleDialog.fileName.trim();
        if (!fileName) {
            toast({
                title: 'שגיאה',
                description: 'יש להזין כותרת למסמך',
                variant: 'destructive'
            });
            return;
        }

        setIsUploading(true);
        const selectedFile = titleDialog.file;
        const description = titleDialog.description.trim();

        try {
            console.log('[DocumentsTab] Uploading to InstaBack...');
            const uploadResult = await uploadFileToInstaback(selectedFile, eventId, 'documents');
            
            console.log('[DocumentsTab] Upload result:', uploadResult);

            if (!uploadResult.file_url) {
                throw new Error('No file URL returned from upload');
            }

            const documentData = {
                eventId: eventId,
                uploaderId: currentUser.id,
                fileName: fileName, // הכותרת שהמשתמש הזין
                description: description || '', // תיאור אופציונלי
                fileUrl: uploadResult.file_url,
                fileType: selectedFile.type,
                fileSize: selectedFile.size
            };

            console.log('[DocumentsTab] Creating EventDocument with data:', documentData);
            const document = await createEventDocument(documentData);
            console.log('[DocumentsTab] EventDocument created:', document);

            setDocuments(prev => [document, ...prev]);
            setTitleDialog({ isOpen: false, file: null, originalFileName: '', fileName: '', description: '' });

            toast({
                title: 'הקובץ הועלה בהצלחה! 📄',
                description: `${fileName} נוסף למסמכי האירוע`
            });

            if (onDataRefresh) {
                onDataRefresh();
            }
        } catch (error) {
            console.error('[DocumentsTab] Upload failed:', error);
            toast({
                title: 'שגיאה בהעלאת הקובץ',
                description: error.message,
                variant: 'destructive'
            });
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteDocument = (doc) => {
        setDeleteDialog({ isOpen: true, doc });
    };

    const confirmDelete = async () => {
        if (!deleteDialog.doc) return;

        try {
            console.log('[DocumentsTab] Deleting document:', deleteDialog.doc.id);
            
            if (deleteDialog.doc.fileUrl) {
                await deleteFileFromInstaback(deleteDialog.doc.fileUrl);
            }

            await deleteEventDocument(deleteDialog.doc.id);

            setDocuments(prev => prev.filter(d => d.id !== deleteDialog.doc.id));
            setDeleteDialog({ isOpen: false, doc: null });

            toast({
                title: 'המסמך נמחק בהצלחה',
                duration: 3000
            });

            if (onDataRefresh) {
                onDataRefresh();
            }
        } catch (error) {
            console.error('[DocumentsTab] Failed to delete document:', error);
            toast({
                title: 'שגיאה במחיקת המסמך',
                description: error.message,
                variant: 'destructive'
            });
        }
    };

    const handleViewDocument = (doc) => {
        console.log('[DocumentsTab] Viewing document:', doc.fileName);
        
        const fileUrl = resolveInstabackFileUrl(doc.fileUrl);
        
        if (!fileUrl) {
            console.error('[DocumentsTab] Cannot view - fileUrl is missing or invalid');
            toast({
                title: 'לא ניתן לצפות במסמך',
                description: 'קישור המסמך לא תקין או חסר. אנא העלה את המסמך מחדש.',
                variant: 'destructive'
            });
            return;
        }

        window.open(fileUrl, '_blank');
    };

    const handleDownloadDocument = (doc) => {
        console.log('[DocumentsTab] Downloading document:', doc.fileName);
        
        const fileUrl = resolveInstabackFileUrl(doc.fileUrl);
        
        if (!fileUrl) {
            console.error('[DocumentsTab] Cannot download - fileUrl is missing or invalid');
            toast({
                title: 'לא ניתן להוריד את המסמך',
                description: 'קישור המסמך לא תקין או חסר. אנא העלה את המסמך מחדש.',
                variant: 'destructive'
            });
            return;
        }

        window.open(fileUrl, '_blank');
    };

    const canDelete = (doc) => {
        if (isManager) return true;
        return doc.uploaderId === currentUser?.id;
    };

    const getFileIcon = (fileType) => {
        if (!fileType) return '📄';
        
        if (fileType.includes('pdf')) return '📕';
        if (fileType.includes('word') || fileType.includes('document')) return '📘';
        if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📗';
        if (fileType.includes('powerpoint') || fileType.includes('presentation')) return '📙';
        if (fileType.includes('image')) return '🖼️';
        if (fileType.includes('video')) return '🎥';
        if (fileType.includes('audio')) return '🎵';
        if (fileType.includes('zip') || fileType.includes('rar')) return '📦';
        
        return '📄';
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {!isReadOnly && (
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold dark:text-white">מסמכי האירוע</h3>
                    <div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            onChange={handleFileSelect}
                            className="hidden"
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.zip,.rar"
                        />
                        <Button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="bg-orange-500 hover:bg-orange-600"
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                                    מעלה...
                                </>
                            ) : (
                                <>
                                    <Upload className="w-4 h-4 ml-2" />
                                    העלה מסמך
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            )}

            {documents.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-gray-600" />
                    <p>אין מסמכים באירוע זה</p>
                    {!isReadOnly && <p className="text-sm mt-1">העלה מסמך ראשון</p>}
                </div>
            ) : (
                <div className="grid gap-4">
                    {documents.map((doc) => (
                        <Card key={doc.id} className="hover:shadow-md transition-shadow dark:bg-gray-800 dark:border-gray-700">
                            <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                    {/* File Icon */}
                                    <div className="text-3xl flex-shrink-0 mt-1">
                                        {getFileIcon(doc.fileType)}
                                    </div>
                                    
                                    {/* File Info */}
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-gray-900 dark:text-white truncate" title={doc.fileName}>
                                            {doc.fileName}
                                        </h4>
                                        {doc.description && (
                                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mt-1" title={doc.description}>
                                                {doc.description}
                                            </p>
                                        )}
                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                            {doc.fileSize ? `${(doc.fileSize / 1024).toFixed(0)} KB` : ''}
                                        </p>
                                    </div>
                                    
                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        {/* Desktop Buttons */}
                                        <div className="hidden sm:flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleViewDocument(doc)}
                                            >
                                                <Eye className="w-4 h-4 ml-2" />
                                                צפייה
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleDownloadDocument(doc)}
                                            >
                                                <Download className="w-4 h-4 ml-2" />
                                                הורדה
                                            </Button>
                                            {canDelete(doc) && (
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => handleDeleteDocument(doc)}
                                                >
                                                    <Trash2 className="w-4 h-4 ml-2" />
                                                    מחיקה
                                                </Button>
                                            )}
                                        </div>
                                        
                                        {/* Mobile Icon Buttons */}
                                        <div className="flex sm:hidden items-center gap-1">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-9 w-9"
                                                onClick={() => handleViewDocument(doc)}
                                            >
                                                <Eye className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-9 w-9"
                                                onClick={() => handleDownloadDocument(doc)}
                                            >
                                                <Download className="w-4 h-4" />
                                            </Button>
                                            {canDelete(doc) && (
                                                <Button
                                                    variant="destructive"
                                                    size="icon"
                                                    className="h-9 w-9"
                                                    onClick={() => handleDeleteDocument(doc)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Title & Description Input Dialog */}
            <Dialog open={titleDialog.isOpen} onOpenChange={(open) => !open && setTitleDialog({ isOpen: false, file: null, originalFileName: '', fileName: '', description: '' })}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>הוספת מסמך חדש</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                קובץ נבחר
                            </label>
                            <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded border">
                                {titleDialog.originalFileName}
                            </p>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                כותרת המסמך <span className="text-red-500">*</span>
                            </label>
                            <Input
                                value={titleDialog.fileName}
                                onChange={(e) => setTitleDialog(prev => ({ ...prev, fileName: e.target.value }))}
                                placeholder="הזן כותרת למסמך"
                                className="w-full"
                                maxLength={200}
                                disabled={isUploading}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                שדה חובה - הכותרת תוצג לכל משתתפי האירוע
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                תיאור (אופציונלי)
                            </label>
                            <Textarea
                                value={titleDialog.description}
                                onChange={(e) => setTitleDialog(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="הוסף תיאור למסמך..."
                                className="w-full h-20 resize-none"
                                maxLength={500}
                                disabled={isUploading}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                תיאור קצר שיעזור למשתתפים להבין על מה המסמך
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button 
                            variant="outline" 
                            onClick={() => setTitleDialog({ isOpen: false, file: null, originalFileName: '', fileName: '', description: '' })}
                            disabled={isUploading}
                        >
                            ביטול
                        </Button>
                        <Button 
                            onClick={handleUploadWithTitle}
                            disabled={isUploading || !titleDialog.fileName.trim()}
                            className="bg-orange-500 hover:bg-orange-600"
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                                    מעלה...
                                </>
                            ) : (
                                <>
                                    <Upload className="w-4 h-4 ml-2" />
                                    העלה מסמך
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialog.isOpen} onOpenChange={(open) => !open && setDeleteDialog({ isOpen: false, doc: null })}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>מחיקת מסמך</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p>האם אתה בטוח שברצונך למחוק את המסמך:</p>
                        <p className="font-semibold mt-2">{deleteDialog.doc?.fileName}</p>
                        <p className="text-sm text-gray-500 mt-2">פעולה זו אינה ניתנת לביטול</p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialog({ isOpen: false, doc: null })}>
                            ביטול
                        </Button>
                        <Button variant="destructive" onClick={confirmDelete}>
                            <Trash2 className="w-4 h-4 ml-2" />
                            מחק מסמך
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
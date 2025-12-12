import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Loader2, Trash2, Send, Bell } from 'lucide-react';
import { listFeedbacks, updateFeedback, deleteFeedback, createNotificationAndSendPush } from '@/components/instabackService';
import { formatIsraelDateTime } from '@/components/utils/dateHelpers';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';

export default function ManageFeedback({ user }) {
    const [feedbacks, setFeedbacks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterType, setFilterType] = useState('all');
    const [selectedFeedback, setSelectedFeedback] = useState(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [replyDialogOpen, setReplyDialogOpen] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [isSendingReply, setIsSendingReply] = useState(false);

    useEffect(() => {
        loadFeedbacks();
    }, [filterStatus, filterType]);

    const loadFeedbacks = async () => {
        setIsLoading(true);
        try {
            const filters = {};
            if (filterStatus !== 'all') filters.status = filterStatus;
            if (filterType !== 'all') filters.feedbackType = filterType;

            const data = await listFeedbacks(filters);
            setFeedbacks(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to load feedbacks:', error);
            toast.error('שגיאה בטעינת המשובים');
            setFeedbacks([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateStatus = async (feedbackId, newStatus, sendNotification = false) => {
        setIsUpdating(true);
        try {
            const feedback = feedbacks.find(f => f.id === feedbackId);
            await updateFeedback(feedbackId, { status: newStatus });
            
            // שליחת התראה למשתמש על שינוי הסטטוס
            if (sendNotification && feedback?.userId) {
                const statusLabels = {
                    'in_progress': 'בטיפול',
                    'resolved': 'טופל',
                    'archived': 'הועבר לארכיון'
                };
                
                try {
                    await createNotificationAndSendPush({
                        userId: feedback.userId,
                        type: 'feedback_update',
                        title: `📝 עדכון למשוב שלך`,
                        message: `המשוב "${feedback.title}" עודכן לסטטוס: ${statusLabels[newStatus] || newStatus}`,
                        priority: 'normal',
                        relatedId: feedbackId
                    });
                    toast.success('הסטטוס עודכן והתראה נשלחה למשתמש');
                } catch (notifError) {
                    console.warn('Failed to send notification:', notifError);
                    toast.success('הסטטוס עודכן (ההתראה לא נשלחה)');
                }
            } else {
                toast.success('הסטטוס עודכן בהצלחה');
            }
            
            if (selectedFeedback && selectedFeedback.id === feedbackId) {
                setSelectedFeedback(prev => ({ ...prev, status: newStatus }));
            }
            loadFeedbacks();
        } catch (error) {
            console.error('Failed to update feedback:', error);
            toast.error('שגיאה בעדכון הסטטוס');
        } finally {
            setIsUpdating(false);
        }
    };

    // שליחת תגובה למשוב
    const handleSendReply = async () => {
        if (!selectedFeedback || !replyText.trim()) {
            toast.error('יש לכתוב תגובה');
            return;
        }

        setIsSendingReply(true);
        try {
            // עדכון המשוב עם התגובה
            await updateFeedback(selectedFeedback.id, { 
                adminResponse: replyText,
                responseDate: new Date().toISOString(),
                status: 'resolved'
            });

            // שליחת התראה למשתמש
            if (selectedFeedback.userId) {
                await createNotificationAndSendPush({
                    userId: selectedFeedback.userId,
                    type: 'feedback_response',
                    title: `💬 קיבלת תגובה למשוב`,
                    message: `קיבלת תגובה מצוות PlanOra למשוב "${selectedFeedback.title}": ${replyText.substring(0, 100)}${replyText.length > 100 ? '...' : ''}`,
                    priority: 'high',
                    relatedId: selectedFeedback.id
                });
            }

            toast.success('התגובה נשלחה בהצלחה!');
            setReplyDialogOpen(false);
            setReplyText('');
            setSelectedFeedback(null);
            loadFeedbacks();
        } catch (error) {
            console.error('Failed to send reply:', error);
            toast.error('שגיאה בשליחת התגובה');
        } finally {
            setIsSendingReply(false);
        }
    };

    const handleDelete = async (feedbackId) => {
        if (!confirm('האם אתה בטוח שברצונך למחוק משוב זה?')) return;

        try {
            await deleteFeedback(feedbackId);
            toast.success('המשוב נמחק בהצלחה');
            loadFeedbacks();
            setSelectedFeedback(null);
        } catch (error) {
            console.error('Failed to delete feedback:', error);
            toast.error('שגיאה במחיקת המשוב');
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            new: { color: 'bg-blue-100 text-blue-800', label: 'חדש' },
            in_progress: { color: 'bg-yellow-100 text-yellow-800', label: 'בטיפול' },
            resolved: { color: 'bg-green-100 text-green-800', label: 'טופל' },
            archived: { color: 'bg-gray-100 text-gray-800', label: 'בארכיון' }
        };
        const badge = badges[status] || badges.new;
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                {badge.label}
            </span>
        );
    };

    const getTypeBadge = (type) => {
        const labels = {
            'general': 'כללי',
            'suggestion': 'הצעה',
            'bug_report': 'באג',
            'question': 'שאלה'
        };
        return <Badge variant="outline">{labels[type] || type}</Badge>;
    };

    const filteredFeedbacks = feedbacks;

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="w-6 h-6 text-purple-500" />
                        ניהול משובים
                    </CardTitle>
                    <CardDescription>
                        {feedbacks.length} משובים במערכת
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Filters */}
                    <div className="flex gap-3 mb-6">
                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                            <SelectTrigger className="w-40">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">כל הסטטוסים</SelectItem>
                                <SelectItem value="new">חדש</SelectItem>
                                <SelectItem value="in_progress">בטיפול</SelectItem>
                                <SelectItem value="resolved">טופל</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={filterType} onValueChange={setFilterType}>
                            <SelectTrigger className="w-40">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">כל הסוגים</SelectItem>
                                <SelectItem value="general">כללי</SelectItem>
                                <SelectItem value="suggestion">הצעה</SelectItem>
                                <SelectItem value="bug_report">באג</SelectItem>
                                <SelectItem value="question">שאלה</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Feedbacks List */}
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                        </div>
                    ) : filteredFeedbacks.length === 0 ? (
                        <div className="text-center py-12">
                            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">אין משובים להצגה</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredFeedbacks.map(feedback => (
                                <div
                                    key={feedback.id}
                                    className="p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                                    onClick={() => setSelectedFeedback(feedback)}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1">
                                            <h4 className="font-semibold text-gray-900">{feedback.title}</h4>
                                            <p className="text-sm text-gray-600">
                                                מאת: {feedback.userName || feedback.userEmail}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            {getTypeBadge(feedback.feedbackType)}
                                            {getStatusBadge(feedback.status)}
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-700 line-clamp-2 mb-2">
                                        {feedback.message}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        {formatIsraelDateTime(feedback.created_date || feedback.createdAt)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Reply Dialog */}
            <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Send className="w-5 h-5 text-blue-500" />
                            שליחת תגובה למשוב
                        </DialogTitle>
                        <DialogDescription>
                            התגובה תישלח למשתמש {selectedFeedback?.userName || selectedFeedback?.userEmail} כהתראה
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div>
                            <Label>משוב מקורי:</Label>
                            <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded mt-1">
                                {selectedFeedback?.title}
                            </p>
                        </div>
                        <div>
                            <Label>התגובה שלך:</Label>
                            <Textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="כתוב את התגובה שלך כאן..."
                                rows={5}
                                className="mt-1"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setReplyDialogOpen(false)}>
                            ביטול
                        </Button>
                        <Button 
                            onClick={handleSendReply} 
                            disabled={isSendingReply || !replyText.trim()}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {isSendingReply ? (
                                <>
                                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                                    שולח...
                                </>
                            ) : (
                                <>
                                    <Bell className="w-4 h-4 ml-2" />
                                    שלח תגובה והתראה
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Feedback Details Dialog */}
            <Dialog open={!!selectedFeedback && !replyDialogOpen} onOpenChange={() => setSelectedFeedback(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center justify-between">
                            <span>{selectedFeedback?.title}</span>
                            <div className="flex gap-2">
                                {selectedFeedback && getTypeBadge(selectedFeedback.feedbackType)}
                                {selectedFeedback && getStatusBadge(selectedFeedback.status)}
                            </div>
                        </DialogTitle>
                        <DialogDescription>
                            מאת: {selectedFeedback?.userName || selectedFeedback?.userEmail} • {' '}
                            {selectedFeedback && formatIsraelDateTime(selectedFeedback.created_date || selectedFeedback.createdAt)}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedFeedback && (
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-semibold mb-2">תוכן המשוב:</h4>
                                <p className="text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                                    {selectedFeedback.message}
                                </p>
                            </div>

                            {selectedFeedback.adminResponse && (
                                <div>
                                    <h4 className="font-semibold mb-2">תגובה קודמת:</h4>
                                    <p className="text-gray-700 whitespace-pre-wrap bg-green-50 p-3 rounded-lg border border-green-200">
                                        {selectedFeedback.adminResponse}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        נשלח ב: {formatIsraelDateTime(selectedFeedback.responseDate)}
                                    </p>
                                </div>
                            )}

                            <div className="flex items-center gap-3">
                                <div className="flex-1">
                                    <h4 className="font-semibold mb-2">עדכן סטטוס:</h4>
                                    <Select
                                        value={selectedFeedback.status}
                                        onValueChange={(value) => handleUpdateStatus(selectedFeedback.id, value, true)}
                                        disabled={isUpdating}
                                    >
                                        <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder="בחר סטטוס" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="new">חדש</SelectItem>
                                            <SelectItem value="in_progress">בטיפול</SelectItem>
                                            <SelectItem value="resolved">טופל</SelectItem>
                                            <SelectItem value="archived">בארכיון</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t">
                                <Button
                                    variant="outline"
                                    onClick={() => setSelectedFeedback(null)}
                                >
                                    סגור
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={() => handleDelete(selectedFeedback.id)}
                                >
                                    <Trash2 className="w-4 h-4 ml-2" />
                                    מחק
                                </Button>
                                <Button
                                    onClick={() => setReplyDialogOpen(true)}
                                    className="bg-blue-600 hover:bg-blue-700"
                                >
                                    <Send className="w-4 h-4 ml-2" />
                                    שלח תגובה
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
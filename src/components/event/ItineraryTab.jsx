import React, { useState, useEffect } from 'react';
import { 
    createItineraryItem, 
    updateItineraryItem, 
    deleteItineraryItem, 
    listItineraryItems,
    getEventMembers
} from '@/components/instabackService';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, Clock, MapPin, Loader2, Edit2, User, Calendar } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

import { motion, AnimatePresence } from 'framer-motion';

import { format } from 'date-fns';
import { he } from 'date-fns/locale';

import MobileDateTimePicker from '@/components/ui/MobileDateTimePicker';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';


// Main Tab Component
export default function ItineraryTab({ eventId, initialItems, isManager, isReadOnly = false, currentUser, onClose }) {
    const [items, setItems] = useState(initialItems || []);
    const [isLoading, setIsLoading] = useState(!initialItems);
    const [editingItem, setEditingItem] = useState(null);
    const [itemToDelete, setItemToDelete] = useState(null);

    // New states for inline add form
    const [showAddForm, setShowAddForm] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [newItem, setNewItem] = useState({
        title: '',
        location: '',
        date: null,
        endDate: null,
        assigneeId: null
    });
    const [members, setMembers] = useState([]);
    const [isUpdating, setIsUpdating] = useState(null); // New state for tracking update status

    const loadItems = async () => {
        setIsLoading(true);
        try {
            const fetched = await listItineraryItems(eventId);
            if (Array.isArray(fetched)) {
                // Sort by date
                const sorted = [...fetched].sort((a, b) => {
                    const dateA = new Date(a.date || a.startTime || '2000-01-01');
                    const dateB = new Date(b.date || b.startTime || '2000-01-01');
                    return dateA.getTime() - dateB.getTime();
                });
                setItems(sorted);
            }
        } catch (error) {
            console.error("Failed to fetch itinerary items:", error);
            toast.error('שגיאה בטעינת פריטי לו"ז');
        } finally {
            setIsLoading(false);
        }
    };

    const loadMembers = async () => {
        try {
            const fetchedMembers = await getEventMembers(eventId);
            setMembers(fetchedMembers || []);
        } catch (error) {
            console.error("Failed to fetch event members:", error);
            // Kept existing sonner-compatible toast.error, assuming outline meant to use sonner API
            toast.error("שגיאה בטעינת משתתפים"); 
        }
    };

    useEffect(() => {
        if (initialItems && Array.isArray(initialItems)) {
            const sorted = [...initialItems].sort((a, b) => {
                const dateA = new Date(a.date || a.startTime || '2000-01-01');
                const dateB = new Date(b.date || b.startTime || '2000-01-01');
                return dateA.getTime() - dateB.getTime();
            });
            setItems(sorted);
            setIsLoading(false);
        } else {
            loadItems();
        }
        
        if (isManager) { // Only load members if the user is a manager (to show assignee option)
            loadMembers();
        }
    }, [eventId, isManager, initialItems]);

    const handleDelete = async () => {
        if (!itemToDelete) return;
        if (isReadOnly) {
            toast.error('אין לך הרשאה לבצע פעולה זו.');
            setItemToDelete(null);
            return;
        }

        const idToDelete = itemToDelete.id;
        // Optimistic removal
        const originalItems = items;
        setItems(prev => prev.filter(i => i.id !== idToDelete));
        setItemToDelete(null); // Clear the item from dialog state

        try {
            await deleteItineraryItem(idToDelete);

            toast.success('הפריט נמחק בהצלחה! 🗑️', {
                description: 'הפריט הוסר מלוח הזמנים',
                duration: 3000,
            });

            await loadItems(); // Reload items after deletion
        } catch (e) {
            console.error("Failed to delete item", e);

            toast.error('שגיאה במחיקת הפריט', {
                description: 'אנא נסה שוב',
                duration: 4000,
            });

            // rollback
            setItems(originalItems);
        }
    };

    // New helper functions for formatting
    const formatIsraelDate = (date) => format(date, 'dd/MM/yyyy', { locale: he });
    const formatIsraelTime = (date) => format(date, 'HH:mm', { locale: he });

    const formatItemDateTime = (item) => {
        const date = item.date || item.startTime;
        const endDate = item.endDate || item.endTime;
        
        if (!date) return 'לא מצויין תאריך';
        
        try {
          const startDate = new Date(date);
          if (isNaN(startDate.getTime())) return 'לא מצויין תאריך';
          
          const dateStr = formatIsraelDate(startDate);
          const timeStr = formatIsraelTime(startDate);
          
          // בדיקה משופרת לתאריך סיום - וודא שהוא קיים ותקין
          if (endDate && new Date(endDate).getTime()) {
            const end = new Date(endDate);
            const endTimeStr = formatIsraelTime(end);
            return `${dateStr} | ${timeStr} - ${endTimeStr}`;
          }
          
          // אם אין תאריך סיום או שהוא לא תקין, מציג רק תאריך התחלה
          return `${dateStr} | ${timeStr}`;
        } catch (e) {
          console.error('Error formatting date:', e);
          return 'לא מצויין תאריך';
        }
      };

    const handleAddItem = async () => {
        if (!newItem.title?.trim()) {
            toast.error('נא להזין כותרת לפריט');
            return;
        }

        if (!newItem.date) {
            toast.error('נא לבחור תאריך התחלה');
            return;
        }

        setIsAdding(true);
        try {
            await createItineraryItem({
                eventId,
                title: newItem.title.trim(),
                location: newItem.location ? newItem.location.trim() : '',
                date: newItem.date, // ISO string from MobileDateTimePicker
                endDate: newItem.endDate || null, // ISO string or null
                order: items.length,
                assigneeId: newItem.assigneeId || null
            });

            toast.success('פריט נוסף בהצלחה');

            // Reset form
            setNewItem({
                title: '',
                location: '',
                date: null,
                endDate: null,
                assigneeId: null
            });
            setShowAddForm(false);

            // Reload items from server
            await loadItems();
        } catch (error) {
            console.error('Failed to add itinerary item:', error);
            toast.error('שגיאה בהוספת הפריט');
        } finally {
            setIsAdding(false);
        }
    };

    const handleUpdateItem = async (itemId, updates) => {
        setIsUpdating(itemId);
        try {
            // updates.date and updates.endDate are already ISO strings from the MobileDateTimePicker change handler.
            // No need for instanceof Date checks or toISOString conversions.
            // Default end time logic is also removed as per outline.
            await updateItineraryItem(itemId, {
                title: updates.title,
                location: updates.location,
                date: updates.date, // ISO string
                endDate: updates.endDate || null, // ISO string or null
                assigneeId: updates.assigneeId
            });
            toast.success('הפריט עודכן בהצלחה');
            
            // Reload items from server
            await loadItems();
        } catch (error) {
            console.error('Failed to update itinerary item:', error);
            toast.error('שגיאה בעדכון הפריט');
        } finally {
            setIsUpdating(null);
            setEditingItem(null); // Close the inline edit form
        }
    };


    return (
        <div className="space-y-4 pb-20" dir="rtl">
            {!isReadOnly && (
                <div className="space-y-3">
                    {!showAddForm ? (
                        <Button
                            onClick={() => setShowAddForm(true)}
                            className="w-full bg-orange-500 hover:bg-orange-600"
                            disabled={isAdding}
                        >
                            <Plus className="w-5 h-5 ml-2" />
                            הוסף פריט ללו״ז
                        </Button>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <Card className="mb-4 dark:bg-gray-800 dark:border-gray-700">
                                <CardContent className="pt-6 space-y-4">
                                    <div>
                                        <Label className="dark:text-gray-300">כותרת הפעילות *</Label>
                                        <Input
                                            value={newItem.title}
                                            onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                                            placeholder="למשל: ארוחת בוקר, טיול מודרך..."
                                        />
                                    </div>

                                    <div>
                                        <Label>מיקום</Label>
                                        <Input
                                            value={newItem.location}
                                            onChange={(e) => setNewItem({ ...newItem, location: e.target.value })}
                                            placeholder="היכן תתקיים הפעילות?"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 gap-4">
                                        <MobileDateTimePicker
                                            label="תאריך ושעת התחלה"
                                            value={newItem.date} // `newItem.date` is an ISO string
                                            onChange={(isoString) => setNewItem({ ...newItem, date: isoString })} // `onChange` returns ISO string
                                            required
                                        />

                                        <MobileDateTimePicker
                                            label="תאריך ושעת סיום (אופציונלי)"
                                            value={newItem.endDate} // `newItem.endDate` is an ISO string
                                            onChange={(isoString) => setNewItem({ ...newItem, endDate: isoString })} // `onChange` returns ISO string
                                        />
                                    </div>

                                    {isManager && members.length > 0 && (
                                        <div>
                                            <Label>אחראי</Label>
                                            <Select
                                                value={newItem.assigneeId || ''}
                                                onValueChange={(val) => setNewItem({ ...newItem, assigneeId: val || null })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="בחר אחראי (אופציונלי)" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value={null}>ללא אחראי</SelectItem>
                                                    {members.map((member) => (
                                                        <SelectItem key={member.id} value={member.userId || member.user_id}>
                                                            {member.name || member.full_name || member.email}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}

                                    <div className="flex gap-2 pt-2">
                                        <Button
                                            onClick={handleAddItem}
                                            disabled={isAdding || !newItem.title || !newItem.date}
                                            className="flex-1 bg-orange-500 hover:bg-orange-600"
                                        >
                                            {isAdding ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                                                    מוסיף...
                                                </>
                                            ) : (
                                                <>
                                                    <Plus className="w-4 h-4 ml-2" />
                                                    הוסף פריט
                                                </>
                                            )}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setShowAddForm(false);
                                                setNewItem({
                                                    title: '',
                                                    location: '',
                                                    date: null,
                                                    endDate: null,
                                                    assigneeId: null
                                                });
                                            }}
                                            disabled={isAdding}
                                        >
                                            ביטול
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}
                </div>
            )}

            {isLoading ? (
                <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-orange-500" />
                    <p className="text-gray-600 dark:text-gray-400 mt-2">טוען פריטים...</p>
                </div>
            ) : items.length === 0 ? (
                <Card className="dark:bg-gray-800 dark:border-gray-700">
                    <CardContent className="py-8 text-center text-gray-500 dark:text-gray-400">
                        <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                        <p>עדיין לא נוספו פריטים ללו״ז</p>
                    </CardContent>
                </Card>
            ) : (
                <AnimatePresence>
                    <div className="space-y-3">
                        {items.map((item, index) => (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-0 shadow-md hover:shadow-lg transition-shadow">
                                    <CardContent className="p-4">
                                        {editingItem?.id === item.id ? (
                                            // Edit Mode
                                            <div className="space-y-4">
                                                <div>
                                                    <Label className="dark:text-gray-300">כותרת</Label>
                                                    <Input
                                                        value={editingItem.title}
                                                        onChange={(e) =>
                                                            setEditingItem({ ...editingItem, title: e.target.value })
                                                        }
                                                    />
                                                </div>

                                                <div>
                                                    <Label>מיקום</Label>
                                                    <Input
                                                        value={editingItem.location || ''}
                                                        onChange={(e) =>
                                                            setEditingItem({ ...editingItem, location: e.target.value })
                                                        }
                                                    />
                                                </div>

                                                <div className="grid grid-cols-1 gap-4">
                                                    <MobileDateTimePicker
                                                        label="תאריך ושעת התחלה"
                                                        value={editingItem.date} // `editingItem.date` is an ISO string
                                                        onChange={(isoString) => setEditingItem({ ...editingItem, date: isoString })} // `onChange` returns ISO string
                                                        required
                                                    />

                                                    <MobileDateTimePicker
                                                        label="תאריך ושעת סיום (אופציונלי)"
                                                        value={editingItem.endDate} // `editingItem.endDate` is an ISO string
                                                        onChange={(isoString) => setEditingItem({ ...editingItem, endDate: isoString })} // `onChange` returns ISO string
                                                    />
                                                </div>

                                                {isManager && members.length > 0 && (
                                                    <div>
                                                        <Label>אחראי</Label>
                                                        <Select
                                                            value={editingItem.assigneeId || ''}
                                                            onValueChange={(val) =>
                                                                setEditingItem({ ...editingItem, assigneeId: val || null })
                                                            }
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="בחר אחראי" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value={null}>ללא אחראי</SelectItem>
                                                                {members.map((member) => (
                                                                    <SelectItem key={member.id} value={member.userId || member.user_id}>
                                                                        {member.name || member.full_name || member.email}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                )}

                                                <div className="flex gap-2">
                                                    <Button
                                                        onClick={() => handleUpdateItem(item.id, {
                                                            title: editingItem.title,
                                                            location: editingItem.location,
                                                            date: editingItem.date, // Already ISO string
                                                            endDate: editingItem.endDate, // Already ISO string
                                                            assigneeId: editingItem.assigneeId
                                                        })}
                                                        disabled={isUpdating === item.id || !editingItem.title || !editingItem.date}
                                                        className="flex-1 bg-orange-500 hover:bg-orange-600"
                                                    >
                                                        {isUpdating === item.id ? (
                                                            <>
                                                                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                                                                שומר...
                                                            </>
                                                        ) : (
                                                            'שמור'
                                                        )}
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => setEditingItem(null)}
                                                        disabled={isUpdating === item.id}
                                                    >
                                                        ביטול
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            // Display Mode
                                            <div className="space-y-3">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <Clock className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                                            <span className="text-sm font-semibold text-blue-600">
                                                                {formatItemDateTime(item)}
                                                            </span>
                                                        </div>

                                                        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{item.title}</h3>

                                                        {item.location && (
                                                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                                                <MapPin className="w-4 h-4 flex-shrink-0" />
                                                                <span>{item.location}</span>
                                                            </div>
                                                        )}
                                                        {item.assigneeId && (
                                                            <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 text-sm mt-1">
                                                                <User className="w-4 h-4" />
                                                                <span>
                                                                    {members.find(m => (m.userId || m.user_id) === item.assigneeId)?.name || 'אחראי'}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {!isReadOnly && (
                                                        <div className="flex items-center gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => {
                                                                    // When starting to edit, map backend's date/endDate to local 'date'/'endDate' for consistency
                                                                    setEditingItem({
                                                                        ...item,
                                                                        date: item.date, // Use item.date directly
                                                                        endDate: item.endDate // Use item.endDate directly
                                                                    });
                                                                }}
                                                                disabled={isUpdating === item.id}
                                                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => setItemToDelete(item)}
                                                                disabled={isUpdating === item.id}
                                                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </AnimatePresence>
            )}

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
                <DialogContent className="max-w-md mx-4">
                    <DialogHeader>
                        <DialogTitle className="text-center text-red-700">מחיקת פריט</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 text-center">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trash2 className="w-8 h-8 text-red-600" />
                        </div>
                        <p className="text-gray-700 mb-3">
                            האם אתה בטוח שברצונך למחוק את הפריט:
                        </p>
                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg mb-4">
                            <p className="font-semibold text-gray-900 dark:text-white">
                                {itemToDelete?.title}
                            </p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg text-sm text-gray-600 dark:text-gray-400 flex items-center justify-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{itemToDelete && formatItemDateTime(itemToDelete)}</span>
                        </div>
                    </div>
                    <DialogFooter className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setItemToDelete(null)}
                            className="flex-1"
                        >
                            ביטול
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            className="flex-1"
                        >
                            מחק פריט
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
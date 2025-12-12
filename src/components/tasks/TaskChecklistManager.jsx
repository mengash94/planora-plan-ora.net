
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit2, Check, X, ListChecks, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import {
  getTaskLists,
  createTaskList,
  updateTaskList,
  deleteTaskList,
  getTaskListItems,
  createTaskListItem,
  updateTaskListItem,
  deleteTaskListItem
} from '@/components/instabackService';
import { toast } from 'sonner'; // Assuming sonner is used for toasts

export default function TaskChecklistManager({ taskId, isReadOnly = false }) {
  const [lists, setLists] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedLists, setExpandedLists] = useState(new Set());
  const [showNewListDialog, setShowNewListDialog] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');
  const [editingListId, setEditingListId] = useState(null);
  const [editingListTitle, setEditingListTitle] = useState('');
  const [newItemTexts, setNewItemTexts] = useState({}); // State to manage new item input text for each list
  const [savingStates, setSavingStates] = useState({}); // State to manage loading/saving state for individual checklist items
  const [itemToDelete, setItemToDelete] = useState({ listId: null, itemId: null });

  useEffect(() => {
    if (taskId) loadLists();
  }, [taskId]);

  const loadLists = async () => {
    setIsLoading(true);
    try {
      const fetchedLists = await getTaskLists(taskId);

      // עבור כל רשימה – קבל את הפריטים
      const listsWithItems = await Promise.all(
        fetchedLists.map(async (list) => {
          const items = await getTaskListItems(list.id);
          return { ...list, items: items.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0)) };
        })
      );

      setLists(listsWithItems.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0)));

      if (listsWithItems.length && expandedLists.size === 0) {
        setExpandedLists(new Set(listsWithItems.map(l => l.id)));
      }
    } catch (error) {
      console.error('Failed to load checklists:', error);
      setLists([]);
      toast.error('שגיאה בטעינת רשימות הביצוע');
    } finally {
      setIsLoading(false);
    }
  };

  const createListHandler = async () => {
    if (!newListTitle.trim()) {
      toast.warning('יש להזין שם לרשימה.');
      return;
    }
    try {
      const newList = await createTaskList({ taskId, title: newListTitle.trim(), orderIndex: lists.length });
      setLists([...lists, { ...newList, items: [] }]);
      setExpandedLists(new Set([...expandedLists, newList.id]));
      setNewListTitle('');
      setShowNewListDialog(false);
      toast.success('רשימה חדשה נוצרה בהצלחה');
    } catch (error) {
      console.error('Failed to create list:', error);
      toast.error('שגיאה ביצירת הרשימה');
    }
  };

  const updateListHandler = async (listId) => {
    if (!editingListTitle.trim()) {
      toast.warning('יש להזין שם לרשימה.');
      return;
    }
    try {
      await updateTaskList(listId, { title: editingListTitle.trim() });
      setLists(lists.map(l => l.id === listId ? { ...l, title: editingListTitle.trim() } : l));
      setEditingListId(null);
      setEditingListTitle('');
      toast.success('שם הרשימה עודכן בהצלחה');
    } catch (error) {
      console.error('Failed to update list:', error);
      toast.error('שגיאה בעדכון שם הרשימה');
    }
  };

  const deleteListHandler = async (listId) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את הרשימה? כל הפריטים שבה יימחקו.')) return;
    try {
      const list = lists.find(l => l.id === listId);
      if (list?.items?.length) {
        await Promise.all(list.items.map(i => deleteTaskListItem(i.id)));
      }
      await deleteTaskList(listId);
      setLists(lists.filter(l => l.id !== listId));
      toast.success('הרשימה נמחקה בהצלחה');
    } catch (error) {
      console.error('Failed to delete list:', error);
      toast.error('שגיאה במחיקת הרשימה');
    }
  };

  const toggleExpand = (listId) => {
    const newExpanded = new Set(expandedLists);
    if (newExpanded.has(listId)) newExpanded.delete(listId);
    else newExpanded.add(listId);
    setExpandedLists(newExpanded);
  };

  const getProgress = (list) => {
    if (!list.items || !list.items.length) return { done: 0, total: 0, percentage: 0 };
    const done = list.items.filter(i => i.isDone || i.is_done).length;
    const total = list.items.length;
    return { done, total, percentage: Math.round((done / total) * 100) };
  };

  // Item related functions (moved from TaskListItems component)
  const handleNewItemTextChange = (listId, value) => {
    setNewItemTexts(prev => ({ ...prev, [listId]: value }));
  };

  const addItem = async (listId) => {
    const text = newItemTexts[listId]?.trim();
    if (!text) {
      toast.warning('יש להזין תיאור לפריט.');
      return;
    }
    try {
      const targetList = lists.find(l => l.id === listId);
      if (!targetList) return;

      const newItem = await createTaskListItem({ listId, text, orderIndex: targetList.items.length });
      setLists(prev => prev.map(l => l.id === listId ? { ...l, items: [...l.items, newItem] } : l));
      setNewItemTexts(prev => ({ ...prev, [listId]: '' })); // Clear input for this list
      toast.success('פריט נוסף בהצלחה');
    } catch (error) {
      console.error('Failed to add item:', error);
      toast.error('שגיאה בהוספת הפריט');
    }
  };

  const toggleItemDone = async (listId, itemId, currentIsDone) => {
    setSavingStates(prev => ({ ...prev, [itemId]: true }));
    try {
      const updated = await updateTaskListItem(itemId, { isDone: !currentIsDone });
      setLists(prev => prev.map(l => l.id === listId ? { ...l, items: l.items.map(i => i.id === itemId ? updated : i) } : l));
      toast.success(`פריט סומן כ${!currentIsDone ? 'בוצע' : 'לא בוצע'}`);
    } catch (error) {
      console.error('Failed to toggle item:', error);
      toast.error('שגיאה בשינוי מצב הפריט');
    } finally {
      setSavingStates(prev => ({ ...prev, [itemId]: false }));
    }
  };

  const deleteItem = async (listId, itemId) => {
    try {
      await deleteTaskListItem(itemId);
      
      setLists(lists.map(list => 
        list.id === listId
          ? { ...list, items: list.items.filter(i => i.id !== itemId) }
          : list
      ));
      
      setItemToDelete({ listId: null, itemId: null });
      toast.success('הפריט נמחק בהצלחה');
    } catch (error) {
      console.error('Failed to delete item:', error);
      toast.error('שגיאה במחיקת הפריט');
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
        טוען רשימות...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListChecks className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">רשימות ביצוע</h3>
          {lists.length > 0 && <Badge variant="outline" className="font-mono">{lists.length}</Badge>}
        </div>
        {!isReadOnly && (
          <Button size="sm" onClick={() => setShowNewListDialog(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 ml-1" /> רשימה חדשה
          </Button>
        )}
      </div>

      <AnimatePresence>
        {lists.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-8">
            <ListChecks className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">אין רשימות ביצוע למשימה זו</p>
            {!isReadOnly && <p className="text-gray-400 text-xs mt-1">צור רשימה חדשה כדי להתחיל</p>}
          </motion.div>
        ) : (
          <div className="space-y-3">
            {lists.map(list => {
              const progress = getProgress(list);
              const isExpanded = expandedLists.has(list.id);

              return (
                <motion.div key={list.id} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <Card className="bg-white/70 backdrop-blur-sm">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {editingListId === list.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={editingListTitle}
                                onChange={e => setEditingListTitle(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') updateListHandler(list.id);
                                  if (e.key === 'Escape') { setEditingListId(null); setEditingListTitle(''); }
                                }}
                                className="text-sm"
                                autoFocus
                              />
                              <Button size="sm" onClick={() => updateListHandler(list.id)}><Check className="w-4 h-4" /></Button>
                              <Button size="sm" variant="ghost" onClick={() => { setEditingListId(null); setEditingListTitle(''); }}><X className="w-4 h-4" /></Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="sm" onClick={() => toggleExpand(list.id)} className="p-0 h-auto hover:bg-transparent">
                                {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                              </Button>
                              <CardTitle className="text-base">{list.title}</CardTitle>
                              {!isReadOnly && (
                                <Button variant="ghost" size="sm" onClick={() => { setEditingListId(list.id); setEditingListTitle(list.title); }} className="p-1 h-auto text-gray-400 hover:text-gray-600">
                                  <Edit2 className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          )}
                          <div className="flex items-center gap-3 mt-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                              <motion.div className="bg-blue-500 h-full" initial={{ width: 0 }} animate={{ width: `${progress.percentage}%` }} transition={{ duration: 0.5 }} />
                            </div>
                            <Badge variant="outline" className="font-mono text-xs">{progress.done}/{progress.total}</Badge>
                          </div>
                        </div>
                        {!isReadOnly && (
                          <Button variant="ghost" size="sm" onClick={() => deleteListHandler(list.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                          <CardContent className="pt-0 space-y-2">
                            <AnimatePresence>
                              {list.items.map((item, idx) => (
                                <motion.div
                                  key={item.id}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: 20 }}
                                  transition={{ delay: idx * 0.05 }}
                                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors group"
                                >
                                  <Checkbox
                                    checked={item.isDone || item.is_done || false}
                                    onCheckedChange={() => toggleItemDone(list.id, item.id, item.isDone || item.is_done)}
                                    disabled={isReadOnly || savingStates[item.id]}
                                    className="flex-shrink-0"
                                  />
                                  
                                  <span className={`flex-1 text-sm ${
                                    (item.isDone || item.is_done) ? 'line-through text-gray-400' : 'text-gray-900'
                                  }`}>
                                    {item.text}
                                  </span>

                                  {!isReadOnly && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setItemToDelete({ listId: list.id, itemId: item.id })}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  )}
                                </motion.div>
                              ))}
                            </AnimatePresence>

                            {!isReadOnly && (
                              <div className="flex gap-2 mt-1 pt-2 border-t">
                                <Input
                                  value={newItemTexts[list.id] || ''}
                                  onChange={e => handleNewItemTextChange(list.id, e.target.value)}
                                  placeholder="פריט חדש"
                                  onKeyDown={e => { if (e.key === 'Enter') addItem(list.id); }}
                                />
                                <Button size="sm" onClick={() => addItem(list.id)}>
                                  <Plus className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>

      {/* --- Dialog for New List --- */}
      <Dialog open={showNewListDialog} onOpenChange={setShowNewListDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>צור רשימה חדשה</DialogTitle>
          </DialogHeader>
          <Input
            value={newListTitle}
            onChange={e => setNewListTitle(e.target.value)}
            placeholder="שם הרשימה"
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter') createListHandler(); }}
          />
          <DialogFooter className="mt-2">
            <Button onClick={createListHandler}>צור</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!itemToDelete.itemId} onOpenChange={() => setItemToDelete({ listId: null, itemId: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת פריט</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך למחוק את הפריט? פעולה זו לא ניתנת לביטול.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteItem(itemToDelete.listId, itemToDelete.itemId)}
              className="bg-red-600 hover:bg-red-700"
            >
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

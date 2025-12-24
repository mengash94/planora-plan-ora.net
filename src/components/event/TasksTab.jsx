import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from "@/components/ui/checkbox";
import { User, Plus, UserPlus, Eye, EyeOff, Trash2, MoreVertical, Loader2, ListChecks, UserMinus } from 'lucide-react';
import {
  updateTask,
  deleteTask as deleteTaskService,
  updateTaskStatusWithNotifications,
  updateTaskAssigneeWithNotifications,
  assignTaskToSelfWithNotifications,
  unassignTaskFromSelfWithNotifications,
  toggleTaskVisibility
} from '@/components/instabackService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import TaskChecklistManager from '../tasks/TaskChecklistManager';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

function TaskDetailsDialog({ task, isOpen, onOpenChange, onUpdate, members, isManager, currentUserId }) {
  if (!task) return null;

  const membersMap = new Map();
  members.forEach((member) => {
    if (member && member.id) {
      membersMap.set(member.id, member);
    }
  });

  const assigneeId = task.assigneeId || task.assignee_id;
  const assignee = assigneeId ? membersMap.get(assigneeId) : null;
  const assigneeNameManual = task.assignee_name || task.assigneeName;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">פרטי המשימה</DialogTitle>
        </DialogHeader>

        <div className="p-4 space-y-4">
          <h3 className={`text-2xl font-bold ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
            {task.title}
          </h3>
          {task.description && (
            <p className="text-gray-700">{task.description}</p>
          )}

          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>סטטוס: <span className={`font-semibold ${task.status === 'done' ? 'text-green-600' : 'text-yellow-600'}`}>
              {task.status === 'done' ? 'הושלמה' : 'פתוחה'}
            </span></span>

            {assigneeNameManual ? (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>משויך ל: {assigneeNameManual}</span>
                <span className="inline-block text-[10px] bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded-full mr-1">ידני</span>
              </div>
            ) : assignee ? (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <img
                  src={assignee.avatarUrl || assignee.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent((assignee.firstName || assignee.name || 'U').charAt(0))}&background=orange&color=fff`}
                  alt={assignee.firstName || assignee.name || 'User'}
                  className="w-6 h-6 rounded-full"
                />
                <span>משויך ל: {assignee.firstName || assignee.name}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>לא משויך</span>
              </div>
            )}
          </div>
        </div>

        <div className="border-t pt-4 mt-4">
          <TaskChecklistManager
            taskId={task.id}
            isReadOnly={!isManager && (task.assigneeId !== currentUserId && !task.assignee_name && !task.assigneeName)}
          />
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>סגור</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TaskAssignmentDialog({
  isOpen,
  onOpenChange,
  members,
  currentAssigneeId,
  currentAssigneeName,
  onAssign,
  isLoading
}) {
  const [selectedMemberId, setSelectedMemberId] = useState(currentAssigneeId || '');
  const [manualAssigneeName, setManualAssigneeName] = useState(currentAssigneeName || '');
  const [assignmentType, setAssignmentType] = useState(
    currentAssigneeName ? 'manual' : (currentAssigneeId ? 'member' : 'none')
  );

  useEffect(() => {
    setSelectedMemberId(currentAssigneeId || '');
    setManualAssigneeName(currentAssigneeName || '');
    setAssignmentType(
      currentAssigneeName ? 'manual' : (currentAssigneeId ? 'member' : 'none')
    );
  }, [currentAssigneeId, currentAssigneeName, isOpen]);

  const handleAssignConfirm = () => {
    if (assignmentType === 'member') {
      onAssign({ type: 'member', userId: selectedMemberId });
    } else if (assignmentType === 'manual' && manualAssigneeName.trim()) {
      onAssign({ type: 'manual', name: manualAssigneeName.trim() });
    } else if (assignmentType === 'none') {
      onAssign({ type: 'none' });
    } else {
      toast.error('אנא בחר משתמש או הזן שם ידני.');
    }
  };

  const handleClearAssignment = () => {
    setAssignmentType('none');
    setSelectedMemberId('');
    setManualAssigneeName('');
  };

  const currentAssigneeDisplay = currentAssigneeName
    ? currentAssigneeName
    : currentAssigneeId
      ? members.find(m => m.id === currentAssigneeId)?.firstName || members.find(m => m.id === currentAssigneeId)?.name || 'משתמש'
      : 'לא משויך';

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>שיוך משימה</DialogTitle>
          <DialogDescription>
            שייך את המשימה למשתמש קיים או הזן שם ידני.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <p className="text-sm text-gray-500">משויך כרגע ל: <strong>{currentAssigneeDisplay}</strong></p>

          <div className="flex items-center space-x-2">
            <input
              type="radio"
              id="assign_member"
              name="assignment_type"
              value="member"
              checked={assignmentType === 'member'}
              onChange={() => setAssignmentType('member')}
              className="form-radio"
            />
            <Label htmlFor="assign_member" className="text-base font-normal">
              שייך למשתמש רשום
            </Label>
          </div>

          {assignmentType === 'member' && (
            <Select
              onValueChange={setSelectedMemberId}
              value={selectedMemberId}
              dir="rtl"
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="בחר משתמש" />
              </SelectTrigger>
              <SelectContent dir="rtl">
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.firstName || member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="flex items-center space-x-2 mt-2">
            <input
              type="radio"
              id="assign_manual"
              name="assignment_type"
              value="manual"
              checked={assignmentType === 'manual'}
              onChange={() => setAssignmentType('manual')}
              className="form-radio"
            />
            <Label htmlFor="assign_manual" className="text-base font-normal">
              הזן שם ידני
            </Label>
          </div>

          {assignmentType === 'manual' && (
            <Input
              id="manual_assignee"
              placeholder="שם המבצע"
              value={manualAssigneeName}
              onChange={(e) => setManualAssigneeName(e.target.value)}
              className="w-full"
            />
          )}

          <div className="flex items-center space-x-2 mt-2">
            <input
              type="radio"
              id="assign_none"
              name="assignment_type"
              value="none"
              checked={assignmentType === 'none'}
              onChange={() => handleClearAssignment()}
              className="form-radio"
            />
            <Label htmlFor="assign_none" className="text-base font-normal">
              בטל שיוך
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            ביטול
          </Button>
          <Button onClick={handleAssignConfirm} disabled={isLoading}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : "שמור שינויים"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


export default function TasksTab({
  initialTasks = [],
  members = [],
  currentUser,
  onAddTask,
  onTaskUpdate,
  canManage = false,
  isManager = false,
  highlightTaskId = null,
  isReadOnly = false
}) {
  const hasManage = Boolean(canManage || isManager) && !isReadOnly;
  const [tasks, setTasks] = useState(initialTasks || []);
  const [expandedTask, setExpandedTask] = useState(null);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedTaskForDetails, setSelectedTaskForDetails] = useState(null);
  const [assignmentDialog, setAssignmentDialog] = useState({
    open: false,
    task: null
  });
  const [isAssigning, setIsAssigning] = useState(false);
  const [isUnassigning, setIsUnassigning] = useState(false);
  const [showHiddenTasks, setShowHiddenTasks] = useState(false);
  const [togglingVisibility, setTogglingVisibility] = useState(null);

  useEffect(() => {
    if (!highlightTaskId) return;
    setExpandedTask(highlightTaskId);
    const el = document.getElementById(`task-${highlightTaskId}`);
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightTaskId, tasks]);

  useEffect(() => {
    console.log('TasksTab - Received initial tasks:', initialTasks);
    setTasks(Array.isArray(initialTasks) ? initialTasks : []);
    setSelectedTaskForDetails(prevSelectedTask => {
      if (prevSelectedTask) {
        const updatedTask = initialTasks.find(t => t.id === prevSelectedTask.id);
        if (updatedTask) {
          return updatedTask;
        } else {
          return null;
        }
      }
      return prevSelectedTask;
    });
    setAssignmentDialog(prev => {
      if (prev.task) {
        const updatedTask = initialTasks.find(t => t.id === prev.task.id);
        if (updatedTask) {
          return { ...prev, task: updatedTask };
        } else {
          return { open: false, task: null };
        }
      }
      return prev;
    });

  }, [initialTasks]);

  const membersList = Array.isArray(members) ? members : [];
  const membersMap = new Map();
  membersList.forEach((member) => {
    if (member && member.id) {
      membersMap.set(member.id, member);
    }
  });

  const getTaskAssigneeDisplay = (task) => {
    if (task.assignee_name || task.assigneeName) {
      return { name: task.assignee_name || task.assigneeName, isManual: true, member: null };
    }
    const assigneeId = task.assigneeId || task.assignee_id;
    if (assigneeId) {
      const member = membersMap.get(assigneeId);
      return { name: member?.firstName || member?.name || 'משתמש לא ידוע', isManual: false, member: member };
    }
    return { name: 'לא משויך', isManual: false, member: null };
  };

  console.log('TasksTab - Current state:', {
    tasksCount: tasks.length,
    membersCount: membersList.length,
    currentUserId: currentUser?.id,
    hasManage,
    tasks: tasks
  });

  const handleStatusChange = async (taskToUpdate, isChecked) => {
    const originalStatus = taskToUpdate.status;
    const newStatus = isChecked ? 'done' : 'todo';

    setTasks(prev => prev.map(t =>
      t.id === taskToUpdate.id ? { ...t, status: newStatus } : t
    ));
    setSelectedTaskForDetails(prevSelectedTask =>
      prevSelectedTask?.id === taskToUpdate.id ? { ...prevSelectedTask, status: newStatus } : prevSelectedTask
    );

    try {
      await updateTaskStatusWithNotifications(taskToUpdate.id, newStatus);

      toast.success(
        newStatus === 'done' ? '✅ משימה הושלמה!' :
          '📋 המשימה חזרה לתור',
        { duration: 2000 }
      );

      // Don't trigger full refresh - optimistic update is enough
    } catch (error) {
      console.error("Failed to update task status:", error);
      setTasks(prev => prev.map(t =>
        t.id === taskToUpdate.id ? { ...t, status: originalStatus } : t
      ));
      setSelectedTaskForDetails(prevSelectedTask =>
        prevSelectedTask?.id === taskToUpdate.id ? { ...prevSelectedTask, status: originalStatus } : prevSelectedTask
      );

      toast.error('שגיאה בעדכון סטטוס המשימה', {
        description: error.message,
        duration: 4000
      });
    }
  };

  const handleSelfAssign = async (taskId) => {
    if (!currentUser?.id) return;

    setTasks((prev) => prev.map((t) =>
      t.id === taskId ? { ...t, assigneeId: currentUser.id, assignee_id: currentUser.id, assignee_name: null, assigneeName: null } : t
    ));
    setSelectedTaskForDetails(prevSelectedTask =>
      prevSelectedTask?.id === taskId ? { ...prevSelectedTask, assigneeId: currentUser.id, assignee_id: currentUser.id, assignee_name: null, assigneeName: null } : prevSelectedTask
    );

    try {
      await assignTaskToSelfWithNotifications(taskId);
      window.dispatchEvent(new CustomEvent('notification:update'));
      toast.success('המשימה שויכה אליך');
      // Don't trigger full refresh - optimistic update is enough
    } catch (error) {
      console.error("Failed to assign task:", error);
      setTasks((prev) => prev.map((t) =>
        t.id === taskId ? { ...t, assigneeId: null, assignee_id: null, assignee_name: null, assigneeName: null } : t
      ));
      setSelectedTaskForDetails(prevSelectedTask =>
        prevSelectedTask?.id === taskId ? { ...prevSelectedTask, assigneeId: null, assignee_id: null, assignee_name: null, assigneeName: null } : prevSelectedTask
      );
      toast.error('שגיאה בשיוך המשימה');
    }
  };

  // NEW: Handle unassigning task from self
  const handleSelfUnassign = async (task) => {
    if (!currentUser?.id) return;

    const taskId = task.id;
    const originalAssigneeId = task.assigneeId || task.assignee_id;
    
    setIsUnassigning(true);

    // Optimistic update
    setTasks((prev) => prev.map((t) =>
      t.id === taskId ? { ...t, assigneeId: null, assignee_id: null } : t
    ));
    setSelectedTaskForDetails(prevSelectedTask =>
      prevSelectedTask?.id === taskId ? { ...prevSelectedTask, assigneeId: null, assignee_id: null } : prevSelectedTask
    );

    try {
      await unassignTaskFromSelfWithNotifications(taskId);
      window.dispatchEvent(new CustomEvent('notification:update'));
      toast.success('ביטלת את השיוך שלך מהמשימה');
      // Don't trigger full refresh - optimistic update is enough
    } catch (error) {
      console.error("Failed to unassign task:", error);
      // Rollback
      setTasks((prev) => prev.map((t) =>
        t.id === taskId ? { ...t, assigneeId: originalAssigneeId, assignee_id: originalAssigneeId } : t
      ));
      setSelectedTaskForDetails(prevSelectedTask =>
        prevSelectedTask?.id === taskId ? { ...prevSelectedTask, assigneeId: originalAssigneeId, assignee_id: originalAssigneeId } : prevSelectedTask
      );
      toast.error('שגיאה בביטול השיוך');
    } finally {
      setIsUnassigning(false);
    }
  };

  const handleAssignTask = async (assignment) => {
    if (!assignmentDialog.task) return;

    if (!currentUser?.id) {
      toast.error('אנא התחבר כדי לשייך משימות');
      setAssignmentDialog({ open: false, task: null });
      return;
    }

    setIsAssigning(true);
    const taskId = assignmentDialog.task.id;
    const originalAssigneeId = assignmentDialog.task.assigneeId || assignmentDialog.task.assignee_id;
    const originalAssignee_id = assignmentDialog.task.assignee_id || assignmentDialog.task.assigneeId;
    const originalAssigneeName = assignmentDialog.task.assignee_name;
    const originalAssigneeNameAlt = assignmentDialog.task.assigneeName;

    const updates = {};
    let successMessage = '';
    let apiCallPromise;

    if (assignment.type === 'manual') {
      updates.assigneeId = null;
      updates.assignee_id = null;
      updates.assigneeName = assignment.name;
      updates.assignee_name = assignment.name;
      successMessage = `המשימה שויכה ל-${assignment.name}`;
      apiCallPromise = updateTask(taskId, {
        assigneeId: null,
        assignee_id: null,
        assigneeName: assignment.name,
        assignee_name: assignment.name,
      });
    } else if (assignment.type === 'member') {
      updates.assigneeId = assignment.userId || null;
      updates.assignee_id = assignment.userId || null;
      updates.assigneeName = null;
      updates.assignee_name = null;

      if (assignment.userId) {
        const assignedMember = membersMap.get(assignment.userId);
        const targetName = assignedMember?.firstName || assignedMember?.name || 'המשתמש';
        successMessage = `המשימה שויכה ל-${targetName}`;

        const isSelfAssignment = String(assignment.userId) === String(currentUser.id);
        if (isSelfAssignment) {
          apiCallPromise = assignTaskToSelfWithNotifications(taskId);
        } else {
          apiCallPromise = updateTaskAssigneeWithNotifications(taskId, assignment.userId);
        }
      } else {
        successMessage = 'השיוך בוטל';
        apiCallPromise = updateTask(taskId, {
          assigneeId: null,
          assignee_id: null,
          assigneeName: null,
          assignee_name: null,
        });
      }
    } else if (assignment.type === 'none') {
      updates.assigneeId = null;
      updates.assignee_id = null;
      updates.assigneeName = null;
      updates.assignee_name = null;
      successMessage = 'השיוך בוטל';
      apiCallPromise = updateTask(taskId, {
        assigneeId: null,
        assignee_id: null,
        assigneeName: null,
        assignee_name: null,
      });
    }

    setTasks((prev) => prev.map((t) =>
      t.id === taskId ? { ...t, ...updates } : t
    ));
    setSelectedTaskForDetails(prevSelectedTask =>
      prevSelectedTask?.id === taskId ? { ...prevSelectedTask, ...updates } : prevSelectedTask
    );

    try {
      await apiCallPromise;

      toast.success(successMessage);
      setAssignmentDialog({ open: false, task: null });

      // Don't trigger full refresh - optimistic update is enough

    } catch (error) {
      console.error("Failed to assign task:", error);
      setTasks((prev) => prev.map((t) =>
        t.id === taskId ? {
          ...t,
          assigneeId: originalAssigneeId,
          assignee_id: originalAssignee_id,
          assignee_name: originalAssigneeName,
          assigneeName: originalAssigneeNameAlt
        } : t
      ));
      setSelectedTaskForDetails(prevSelectedTask =>
        prevSelectedTask?.id === taskId ? {
          ...prevSelectedTask,
          assigneeId: originalAssigneeId,
          assignee_id: originalAssignee_id,
          assignee_name: originalAssigneeName,
          assigneeName: originalAssigneeNameAlt
        } : prevSelectedTask
      );
      toast.error('שגיאה בשיוך המשימה', {
        description: error.message || 'אנא נסה שוב מאוחר יותר'
      });
    } finally {
      setIsAssigning(false);
    }
  };


  const handleDeleteTask = async () => {
    if (!taskToDelete) return;

    setIsDeleting(true);
    const originalTasks = [...tasks];

    setTasks((prev) => prev.filter((t) => t.id !== taskToDelete.id));
    if (selectedTaskForDetails?.id === taskToDelete.id) {
      setSelectedTaskForDetails(null);
    }


    try {
      await deleteTaskService(taskToDelete.id);
      toast.success('המשימה נמחקה');
      setTaskToDelete(null);
      if (onTaskUpdate) {
        await onTaskUpdate();
      }
    } catch (error) {
      console.error("Failed to delete task:", error);
      setTasks(originalTasks);
      toast.error('שגיאה במחיקת המשימה');
    } finally {
      setIsDeleting(false);
    }
  };

  // Toggle task visibility (hide/show)
  const handleToggleVisibility = async (task) => {
    const taskId = task.id;
    const newHiddenState = !task.isHidden;
    
    setTogglingVisibility(taskId);
    
    // Optimistic update
    setTasks((prev) => prev.map((t) =>
      t.id === taskId ? { ...t, isHidden: newHiddenState } : t
    ));

    try {
      await toggleTaskVisibility(taskId, newHiddenState);
      toast.success(newHiddenState ? 'המשימה הוסתרה מהמשתמשים' : 'המשימה מוצגת לכולם');
      // Don't trigger full refresh - optimistic update is enough
    } catch (error) {
      console.error("Failed to toggle task visibility:", error);
      // Rollback
      setTasks((prev) => prev.map((t) =>
        t.id === taskId ? { ...t, isHidden: !newHiddenState } : t
      ));
      toast.error('שגיאה בעדכון נראות המשימה');
    } finally {
      setTogglingVisibility(null);
    }
  };

  // Filter tasks based on visibility and user role
  const visibleTasks = tasks.filter(task => {
    // Managers always see all tasks (hidden toggle controls display)
    if (hasManage) {
      return showHiddenTasks ? true : !task.isHidden;
    }
    // Non-managers never see hidden tasks
    return !task.isHidden;
  });

  const hiddenTasksCount = tasks.filter(t => t.isHidden).length;

  if (!Array.isArray(tasks)) {
    return <div className="text-red-500 p-4">שגיאה: נתוני משימות לא תקינים</div>;
  }

  if (tasks.length === 0) {
    return (
      <div className="space-y-4">
        {!isReadOnly && (
          <Button
            onClick={onAddTask}
            data-coachmark="add-task"
            className="w-full bg-black hover:bg-gray-800 text-white">

            <Plus className="w-4 h-4 ml-2" /> הוסף משימה חדשה
          </Button>
        )}

        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
          <p className="text-lg mb-2">עדיין לא נוספו משימות</p>
          <p className="text-sm">{isReadOnly ? 'האירוע הסתיים' : 'הוסף את המשימה הראשונה כדי להתחיל'}</p>
        </div>
      </div>);

  }

  return (
    <div className="space-y-4 pb-4">
      {isReadOnly && (
        <div className="bg-gray-100 border border-gray-300 rounded-lg p-3 text-center text-sm text-gray-600">
          📜 האירוע הסתיים - לא ניתן לבצע שינויים
        </div>
      )}
      
      {!isReadOnly && (
        <Button
          onClick={onAddTask}
          className="w-full bg-black hover:bg-gray-800 text-white">

          <Plus className="w-4 h-4 ml-2" /> הוסף משימה חדשה
        </Button>
      )}

      {/* Show hidden tasks toggle - only for managers */}
      {hasManage && hiddenTasksCount > 0 && (
        <div className="flex items-center justify-between bg-gray-100 rounded-lg p-2">
          <span className="text-sm text-gray-600">
            {hiddenTasksCount} משימות מוסתרות
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHiddenTasks(!showHiddenTasks)}
            className="text-gray-600 hover:text-gray-800"
          >
            {showHiddenTasks ? (
              <>
                <EyeOff className="w-4 h-4 ml-1" />
                הסתר
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 ml-1" />
                הצג
              </>
            )}
          </Button>
        </div>
      )}

      <div className="space-y-1">
        {visibleTasks.map((task) => {
          const { name: displayAssigneeName, isManual: isManualAssignment, member: assignedMemberObject } = getTaskAssigneeDisplay(task);
          const taskAssigneeId = task.assigneeId || task.assignee_id;
          const isMyTask = (taskAssigneeId === currentUser?.id && !task.assignee_name && !task.assigneeName) || (isManualAssignment && displayAssigneeName === currentUser?.name);
          const isExpanded = expandedTask === task.id;
          const canDelete = hasManage || isMyTask;
          const isHighlighted = highlightTaskId && String(highlightTaskId) === String(task.id);

          return (
            <div id={`task-${task.id}`} key={task.id} className={`bg-white rounded-lg border shadow-sm p-3 ${isMyTask ? 'ring-2 ring-orange-200 bg-orange-50/30' : ''} ${isHighlighted ? 'ring-2 ring-purple-300 bg-purple-50/40' : ''} ${task.isHidden ? 'opacity-60 border-dashed border-gray-300' : ''}`}>
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={task.status === 'done'}
                  onCheckedChange={(isChecked) => handleStatusChange(task, isChecked)}
                  disabled={isReadOnly} />


                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => setSelectedTaskForDetails(task)}>

                  <div className={`font-medium ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                    {task.title}
                    {isMyTask &&
                      <span className="inline-block text-xs bg-orange-500 text-white px-2 py-1 rounded-full mr-2">שלי</span>
                    }
                    {isHighlighted &&
                      <span className="inline-block text-[10px] bg-purple-600 text-white px-2 py-0.5 rounded-full mr-2">נפתח</span>
                    }
                  </div>
                  {task.description && isExpanded &&
                    <p className="text-sm text-gray-500 mt-1">{task.description}</p>
                  }
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTaskForDetails(task);
                  }}
                  title="צפה ברשימת משנה"
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                >
                  <ListChecks className="w-4 h-4" />
                </Button>

                <div className="flex items-center gap-2">
                  {displayAssigneeName !== 'לא משויך' ? (
                    <>
                      <Badge variant="outline" className="flex items-center gap-1 text-sm">
                        {isManualAssignment ? (
                          <User className="w-4 h-4 text-gray-500" />
                        ) : (
                          <img
                            src={assignedMemberObject?.avatarUrl || assignedMemberObject?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent((assignedMemberObject?.firstName || assignedMemberObject?.name || 'U').charAt(0))}&background=orange&color=fff`}
                            alt={displayAssigneeName}
                            className="w-4 h-4 rounded-full" />
                        )}
                        <span>{displayAssigneeName}</span>
                        {isManualAssignment && (
                          <span className="inline-block text-[10px] text-orange-600 px-0.5 rounded-full mr-1"> (ידני)</span>
                        )}
                      </Badge>
                      {/* Show unassign button for the user's own task */}
                      {isMyTask && !isManualAssignment && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); handleSelfUnassign(task); }}
                          title="בטל שיוך מעצמי"
                          className="p-1 h-auto text-red-500 hover:text-red-600 hover:bg-red-50"
                          disabled={isUnassigning}
                        >
                          {isUnassigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserMinus className="w-4 h-4" />}
                        </Button>
                      )}
                      {hasManage && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); setAssignmentDialog({ open: true, task: task }); }}
                          title="שייך מחדש / בטל שיוך"
                          className="p-1 h-auto"
                        >
                          <UserPlus className="w-4 h-4" />
                        </Button>
                      )}
                    </>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); hasManage ? setAssignmentDialog({ open: true, task: task }) : handleSelfAssign(task.id); }}
                    >
                      <UserPlus className="w-4 h-4 ml-1" />
                      {hasManage ? 'שייך' : 'קח'}
                    </Button>
                  )}

                  {canDelete &&
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {/* Hide/Show option - only for managers */}
                        {hasManage && (
                          <DropdownMenuItem
                            onClick={() => handleToggleVisibility(task)}
                            disabled={togglingVisibility === task.id}
                            className="text-gray-700"
                          >
                            {togglingVisibility === task.id ? (
                              <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                            ) : task.isHidden ? (
                              <Eye className="w-4 h-4 ml-2" />
                            ) : (
                              <EyeOff className="w-4 h-4 ml-2" />
                            )}
                            {task.isHidden ? 'הצג למשתמשים' : 'הסתר מהמשתמשים'}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => setTaskToDelete(task)}
                          className="text-red-600">

                          <Trash2 className="w-4 h-4 ml-2" />
                          מחק משימה
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  }
                </div>
              </div>
            </div>);

        })}
      </div>

      {/* Delete Dialog */}
      <Dialog open={!!taskToDelete} onOpenChange={(open) => !open && setTaskToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>מחיקת משימה</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>האם אתה בטוח שברצונך למחוק את המשימה: <strong>{taskToDelete?.title}</strong>?</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskToDelete(null)} disabled={isDeleting}>
              ביטול
            </Button>
            <Button variant="destructive" onClick={handleDeleteTask} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "מחק"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Assignment Dialog */}
      <TaskAssignmentDialog
        isOpen={assignmentDialog.open}
        onOpenChange={(open) => {
          if (!open) setAssignmentDialog({ open: false, task: null });
        }}
        members={membersList}
        currentAssigneeId={assignmentDialog.task?.assigneeId || assignmentDialog.task?.assignee_id}
        currentAssigneeName={assignmentDialog.task?.assignee_name || assignmentDialog.task?.assigneeName}
        onAssign={handleAssignTask}
        isLoading={isAssigning}
      />

      {/* TaskDetailsDialog */}
      <TaskDetailsDialog
        task={selectedTaskForDetails}
        isOpen={!!selectedTaskForDetails}
        onOpenChange={setSelectedTaskForDetails}
        onUpdate={onTaskUpdate}
        members={membersList}
        isManager={isManager}
        currentUserId={currentUser?.id}
      />
    </div>);

}
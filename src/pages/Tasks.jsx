import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { updateTask, getMyEvents, listTasks } from '@/components/instabackService';
import { Skeleton } from "@/components/ui/skeleton";
import PageGuide from '../components/ui/PageGuide';
import { toast } from 'sonner';

// New imports
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar"; // Aliased to avoid conflict with CalendarIcon
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, Search as SearchIcon, Filter as FilterIcon } from "lucide-react"; // Aliased to avoid conflict with CalendarPicker
import { format } from "date-fns";
import { he } from 'date-fns/locale'; // For Hebrew locale in date formatting if needed, though 'format' is usually numeric
import { useFirstVisit } from '../components/ui/useFirstVisit';
// New imports from outline
// Assuming this utility exists

export default function TasksPage() {
  const { user, isAuthenticated } = useAuth();
  const [groupedTasks, setGroupedTasks] = useState({});
  const [allTasks, setAllTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // New state variables for filtering and sorting
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all | open | done
  const [onlyMine, setOnlyMine] = useState(false);
  const [sortBy, setSortBy] = useState("default"); // default | due

  // Check if first visit
  const isFirstVisit = useFirstVisit('tasks', user?.id);

  useEffect(() => {
    const loadTasks = async () => {
      if (!isAuthenticated || !user?.id) {
        setIsLoading(false);
        setGroupedTasks({});
        setAllTasks([]);
        return;
      }

      setIsLoading(true);
      try {
        const events = await getMyEvents(user.id);
        const eventsArray = Array.isArray(events) ? events : [];

        const tasksPerEvent = await Promise.all(
          eventsArray.map(async (ev) => {
            try {
              const tasks = await listTasks(ev.id);
              const tasksArr = Array.isArray(tasks) ? tasks : (Array.isArray(tasks?.items) ? tasks.items : []);
              return { event: ev, tasks: tasksArr };
            } catch (error) {
              console.error(`Failed to load tasks for event ${ev.id}:`, error);
              return { event: ev, tasks: [] };
            }
          })
        );

        const relevant = [];
        const grouped = {};

        tasksPerEvent.forEach(({ event, tasks }) => {
          const filtered = (tasks || []).filter((t) => {
            const assigneeId = t.assigneeId || t.assignee_id;
            // Only show tasks assigned to current user or unassigned tasks
            return !assigneeId || assigneeId === user.id;
          });

          if (filtered.length > 0) {
            grouped[event.id] = {
              eventTitle: event.title || event.name || 'אירוע',
              tasks: filtered
            };
          }
          relevant.push(...filtered);
        });

        setAllTasks(relevant);
        setGroupedTasks(grouped);
      } catch (error) {
        console.error("Failed to load tasks", error);
        toast.error('שגיאה בטעינת המשימות', {
          description: 'נסה לרענן את הדף'
        });
        setGroupedTasks({});
        setAllTasks([]);
      }
      setIsLoading(false);
    };
    
    loadTasks();
  }, [user, isAuthenticated]);

  // Helper function for optimistic UI updates and rollback
  const patchTaskLocal = (taskId, patch, originals) => {
    // If originals are provided, it means we are rolling back to previous state
    if (originals?.all && originals?.grouped) {
      setAllTasks(originals.all);
      setGroupedTasks(originals.grouped);
      return;
    }
    // Optimistic update: apply patch to the specific task
    setAllTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...patch } : t));
    setGroupedTasks(prev => {
      const copy = { ...prev };
      Object.keys(copy).forEach(eventId => {
        if (copy[eventId]) {
          copy[eventId] = {
            ...copy[eventId],
            tasks: copy[eventId].tasks.map(t => t.id === taskId ? { ...t, ...patch } : t)
          };
        }
      });
      return copy;
    });
  };

  const toggleTask = async (taskId) => {
    const task = allTasks.find(t => t.id === taskId);
    if (!task) return;
    
    const newStatus = task.status === 'todo' ? 'done' : 'todo';
    
    // Optimistic update
    const originals = { all: allTasks, grouped: groupedTasks };
    patchTaskLocal(taskId, { status: newStatus });
    
    try {
      await updateTask(taskId, { status: newStatus });
      toast.success('סטטוס המשימה עודכן בהצלחה');
    } catch (error) {
      console.error("Failed to toggle task", error);
      // Rollback on error
      patchTaskLocal(taskId, null, originals); 
      toast.error('שגיאה בעדכון המשימה');
    }
  };

  const assignToMe = async (taskId) => {
    const task = allTasks.find(t => t.id === taskId);
    if (!task || !user?.id) return; // Ensure task and user are available
    
    // Optimistic update
    const originals = { all: allTasks, grouped: groupedTasks };
    patchTaskLocal(taskId, { assigneeId: user.id });

    try {
      await updateTask(taskId, { assigneeId: user.id });
      toast.success('המשימה שויכה אליך');
    } catch (e) {
      console.error("Assign to me failed", e);
      // Rollback on error
      patchTaskLocal(taskId, null, originals);
      toast.error('שגיאה בשיוך המשימה');
    }
  };

  const setDueDate = async (taskId, date) => {
    // Convert date to ISO string or null if date is not provided
    const iso = date ? new Date(date).toISOString() : null;
    
    // Optimistic update
    const originals = { all: allTasks, grouped: groupedTasks };
    patchTaskLocal(taskId, { dueDate: iso });

    try {
      // Send update to the backend; note: dueDate might need to be added to instabackService's task model
      await updateTask(taskId, { dueDate: iso });
      toast.success('תאריך היעד עודכן');
    } catch (e) {
      console.error("Failed to set due date", e);
      // Rollback on error
      patchTaskLocal(taskId, null, originals);
      toast.error('עדכון תאריך יעד נכשל. אם זה חוזר – צריך לוודא שתאריך יעד נתמך בשרת.');
    }
  };

  // Filter logic
  const taskMatchesFilters = (t) => {
    const assigneeId = t.assigneeId || t.assignee_id; // Normalize assigneeId field name
    
    // Status filter
    const statusOk =
      statusFilter === "all" ||
      (statusFilter === "open" && t.status !== "done") ||
      (statusFilter === "done" && t.status === "done");
    
    // "Only mine" filter
    const onlyMineOk = !onlyMine || assigneeId === user?.id;
    
    // Search query filter
    const q = query.trim().toLowerCase();
    const queryOk = !q || (t.title?.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q));
    
    return statusOk && onlyMineOk && queryOk;
  };

  // Sort logic
  const sortTasks = (arr) => {
    if (sortBy === "due") {
      // Sort by due date, earliest first. Tasks without due date go last.
      return [...arr].sort((a, b) => {
        const da = a.dueDate || a.due_date ? new Date(a.dueDate || a.due_date).getTime() : Infinity;
        const db = b.dueDate || b.due_date ? new Date(b.dueDate || b.due_date).getTime() : Infinity;
        return da - db;
      });
    }
    // Default sort: open tasks first, then by last update/creation time (most recent first)
    return [...arr].sort((a, b) => {
      const ao = a.status !== "done";
      const bo = b.status !== "done";
      if (ao !== bo) return ao ? -1 : 1; // Open tasks first
      
      // Then by most recent update/creation date
      const ad = new Date(a.updatedAt || a.updated_date || a.createdAt || a.created_date || 0).getTime();
      const bd = new Date(b.updatedAt || b.updated_date || b.createdAt || b.created_date || 0).getTime();
      return bd - ad; // Descending order (most recent first)
    });
  };

  // New function for relative due date display, as per outline
  const getDueLabel = (dueDate) => {
    if (!dueDate) return null;
    
    const due = new Date(dueDate);
    const now = new Date();
    
    // Calculate difference in Israel timezone
    // toLocaleString converts Date to a string in the specified timezone
    // then new Date() parses it back, effectively creating a Date object
    // whose *local* time components correspond to the time in 'Asia/Jerusalem'.
    const israelDue = new Date(due.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' }));
    const israelNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' }));
    
    // Reset time components to 00:00:00 for accurate day difference calculation
    israelDue.setHours(0, 0, 0, 0);
    israelNow.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((israelDue.getTime() - israelNow.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { text: `באיחור של ${Math.abs(diffDays)} ימים`, color: 'text-red-600 bg-red-50' };
    if (diffDays === 0) return { text: 'מסתיים היום', color: 'text-orange-600 bg-orange-50' };
    if (diffDays === 1) return { text: 'מסתיים מחר', color: 'text-yellow-600 bg-yellow-50' };
    return { text: `${diffDays} ימים`, color: 'text-blue-600 bg-blue-50' };
  };
  
  if (isLoading) {
    return (
        <div className="p-6 bg-white dark:bg-black min-h-screen">
            <Skeleton className="h-9 w-48 mb-6" />
            <div className="space-y-6">
                <div className="space-y-4 p-4 border rounded-lg bg-white dark:bg-gray-800">
                    <Skeleton className="h-8 w-1/3" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                </div>
            </div>
        </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50 dark:from-black dark:via-black dark:to-gray-900 p-6" style={{ direction: 'rtl' }}>
      <PageGuide
        title="כל המשימות שלי ✅"
        content="מרכז בקרה לכל המשימות שלך מכל האירועים. רק המשימות שמשויכות אליך או כלליות מופיעות כאן."
        tips={[
          "המשימות מקובצות לפי אירוע לנוחותך",
          "רק משימות שמשויכות אליך או כלליות מופיעות",
          "לחץ על תיבת הסימון כדי לסמן משימה כהושלמה",
          "עבור לעמוד האירוע כדי להוסיף משימות חדשות"
        ]}
        autoOpenOnFirstVisit={isFirstVisit}
      />

      {/* Toolbar for search, filter, sort */}
      <div className="mb-4 bg-white/80 dark:bg-gray-800/80 border dark:border-gray-700 rounded-xl p-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
          <div className="relative flex-1">
            <SearchIcon className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="חיפוש משימות..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pr-9 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div className="flex gap-3 items-center flex-wrap justify-center md:justify-start">
            <div className="flex items-center gap-2">
              <FilterIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32 dark:bg-gray-700 dark:border-gray-600">
                  <SelectValue placeholder="סטטוס" />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                  <SelectItem value="all">הכל</SelectItem>
                  <SelectItem value="open">פתוחות</SelectItem>
                  <SelectItem value="done">הושלמו</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-36 dark:bg-gray-700 dark:border-gray-600">
                <SelectValue placeholder="סידור" />
              </SelectTrigger>
              <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                <SelectItem value="default">ברירת מחדל</SelectItem>
                <SelectItem value="due">לפי תאריך יעד</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Checkbox id="only-mine" checked={onlyMine} onCheckedChange={(v) => setOnlyMine(Boolean(v))} />
              <label htmlFor="only-mine" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">רק משימות שלי</label>
            </div>
          </div>
        </div>
      </div>

      {Object.keys(groupedTasks).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groupedTasks).map(([eventId, { eventTitle, tasks: eventTasks }]) => {
            // Filter and sort tasks based on user selections
            const visible = sortTasks((eventTasks || []).filter(taskMatchesFilters));
            if (visible.length === 0) return null; // Don't render card if no visible tasks in this group

            return (
              <Card key={eventId}>
                <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between">
                  <CardTitle className="mb-2 md:mb-0">
                    <Link to={createPageUrl(`EventDetail?id=${eventId}`)} className="hover:underline text-orange-600 hover:text-orange-800">
                      {eventTitle}
                    </Link>
                  </CardTitle>
                  <Link to={createPageUrl(`EventDetail?id=${eventId}`)} className="text-sm text-orange-600 hover:underline">
                    מעבר לאירוע
                  </Link>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {visible.map(task => {
                      const assigneeId = task.assigneeId || task.assignee_id;
                      const isMyTask = assigneeId === user?.id;
                      const due = task.dueDate || task.due_date || null;
                      
                      // For displaying the exact due date in the Popover Trigger
                      const displayDueDate = due ? format(new Date(due), "d.M.yyyy", { locale: he }) : null;
                      // For displaying the relative due date info as a badge
                      const relativeDueInfo = getDueLabel(due);

                      return (
                        <div key={task.id} className="flex flex-col md:flex-row md:items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border dark:border-gray-600 gap-3">
                        <div className="flex items-center gap-3 flex-1">
                        <Checkbox
                        id={`task-${task.id}`}
                        checked={task.status === 'done'}
                        onCheckedChange={() => toggleTask(task.id)}
                        className="ml-3"
                        />
                        <label
                        htmlFor={`task-${task.id}`}
                        className={`flex-1 cursor-pointer ${task.status === 'done' ? 'line-through text-gray-400 dark:text-gray-500' : 'dark:text-white'}`}
                        >
                        {task.title}
                        </label>
                        </div>

                          <div className="flex items-center gap-2 md:justify-end flex-wrap">
                            {/* Relative due date badge, if available */}
                            {relativeDueInfo && (
                              <Badge className={`${relativeDueInfo.color}`}>{relativeDueInfo.text}</Badge>
                            )}

                            {/* Due date picker */}
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-2">
                                  <CalendarIcon className="w-4 h-4" />
                                  {displayDueDate ? `יעד: ${displayDueDate}` : "קבע יעד"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="end">
                                <CalendarPicker
                                  mode="single"
                                  selected={due ? new Date(due) : undefined}
                                  onSelect={(date) => {
                                      setDueDate(task.id, date);
                                  }}
                                  initialFocus
                                  locale={he} // Set calendar locale to Hebrew
                                />
                                {due && ( // Only show "Remove due date" button if a date is set
                                    <div className="flex justify-end p-2 border-t">
                                      <Button variant="ghost" size="sm" onClick={() => setDueDate(task.id, null)}>
                                        הסר יעד
                                      </Button>
                                    </div>
                                  )}
                              </PopoverContent>
                            </Popover>

                            {/* Assignee badges and assign button */}
                            {isMyTask && (
                              <Badge className="bg-orange-500 text-white">שלי</Badge>
                            )}
                            {!assigneeId && user?.id && ( // Only show "Assign to me" button if not assigned and user is logged in
                              <Button variant="outline" size="sm" onClick={() => assignToMe(task.id)}>
                                קח משימה
                              </Button>
                            )}

                            {/* Quick event link per task */}
                            <Link to={createPageUrl(`EventDetail?id=${eventId}`)} className="text-xs text-gray-600 hover:underline">
                              לאירוע
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : ( // Existing "no tasks" message
        <div className="text-center py-16">
          <CheckCircle2 className="mx-auto w-16 h-16 text-gray-300 dark:text-gray-600" />
          <p className="mt-4 text-gray-500 dark:text-gray-400">מעולה! אין לך משימות פתוחות באף אירוע.</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">צור אירוע חדש והוסף משימות כדי לראות אותן כאן.</p>
          <Link to={createPageUrl('CreateEvent')} className="mt-4 inline-block">
            <Button className="bg-orange-500 hover:bg-orange-600">צור אירוע חדש</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
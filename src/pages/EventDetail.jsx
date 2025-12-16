import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/components/AuthProvider';
import {
  getEventDetails,
  getEventMembers,
  listTasks,
  getUserById,
  deleteEvent as deleteEventService,
  updateTask,
  updateTaskWithNotifications,
  createTask as createTaskService,
  getPolls,
  listItineraryItems,
  listProfessionals,
  listEventLinks,
  listMediaItems,
  listEventDocuments,
  getUnreadMessagesCount,
  getEventOverview,
  checkEventMembership,
  updateEvent,
  getEventInitialData,
  getEventFullDetails,
  createNotificationAndSendPush,
  createNotificationsAndSendPushBulk,
  leaveEvent,
  getRecurringEventRule
} from
'@/components/instabackService';
// PageGuide removed - using SideHelpTab instead
import { toast } from 'sonner';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Loader2,
  ArrowRight,
  MapPin,
  Edit,
  Trash2,
  Settings,
  Clock,
  Bell,
  UserPlus,
  Share2,
  X,
  Plus,
  Calendar,
  Users,
  CheckSquare,
  MessageSquare,
  BarChart3,
  Briefcase,
  Link as LinkIcon,
  Image,
  FileText,
  Wallet,
  LogOut,
  ChevronDown,
  Megaphone,
  ClipboardCheck,
  Repeat
} from
'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator
} from
'@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

// Tab Imports
import TasksTab from '../components/event/TasksTab';
import ChatTab from '../components/event/ChatTab';
import ProfessionalsTab from '../components/event/ProfessionalsTab';
import LinksTab from '../components/event/LinksTab';
import ItineraryTab from '../components/event/ItineraryTab';
import GalleryTab from '../components/event/GalleryTab';
import PollsTab from '../components/event/PollsTab';
import DocumentsTab from '../components/event/DocumentsTab';
import ParticipantsTab from '../components/event/ParticipantsTab';
import ExpensesTab from '../components/event/ExpensesTab';
import PaymentsManagementTab from '../components/event/PaymentsManagementTab';
import BudgetTab from '../components/event/BudgetTab';
import UpdatesTab from '../components/event/UpdatesTab';
import RSVPTab from '../components/event/RSVPTab';

// Dialogs
import TaskAssignmentDialog from '../components/event/TaskAssignmentDialog';
import TaskCreateDialog from '../components/event/TaskCreateDialog';
import InviteDialog from '../components/event/InviteDialog';

import EventOnboardingGuide from "@/components/event/EventOnboardingGuide";
import AddToCalendarDialog from "@/components/event/AddToCalendarDialog";
import PaymentButton from "@/components/event/PaymentButton";

// View Mode Components
import ViewModeSwitcher from '../components/event/ViewModeSwitcher';
import EventSidebarNav from '../components/event/EventSidebarNav';
import EventCarouselNav from '../components/event/EventCarouselNav';
import EventDashboard from '../components/event/EventDashboard';

// Date formatting helpers
import { formatIsraelDate, formatIsraelTime, isSameDay } from '@/components/utils/dateHelpers';
import { generateICSFile, downloadICSFile, generateGoogleCalendarUrl } from '@/components/utils/calendarHelpers';
import RecurrenceDisplay, { calculateRecurrenceEndDate } from '@/components/event/RecurrenceDisplay';

// useFirstVisit removed - using SideHelpTab instead


export default function EventDetailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get('id')?.trim();

  const { user, isAuthenticated } = useAuth();

  const [activeTab, setActiveTab] = useState('updates');
  const [tabViewMode, setTabViewMode] = useState('tabs');
  const [highlightTaskId, setHighlightTaskId] = useState(null);
  const [highlightPollId, setHighlightPollId] = useState(null);

  const [event, setEvent] = useState(null);
  const [members, setMembers] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [itineraryItems, setItineraryItems] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [links, setLinks] = useState([]);
  const [mediaItems, setMediaItems] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [polls, setPolls] = useState([]);
  const [isOwner, setIsOwner] = useState(false);
  const [isManager, setIsManager] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [canManage, setCanManage] = useState(false);

  const [isLoadingData, setIsLoadingData] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [isDeleting, setIsDeleting] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [assignTaskData, setAssignTaskData] = useState(null);
  const [isCreateTaskDialogOpen, setIsCreateTaskDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const [showBroadcastDialog, setShowBroadcastDialog] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState({ title: '', message: '' });
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);

  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isCalendarDialogOpen, setIsCalendarDialogOpen] = useState(false);
  const [recurringRule, setRecurringRule] = useState(null);

  // ALL CALLBACKS AND HOOKS MUST BE BEFORE ANY RETURN STATEMENTS
  // Define loadEventData FIRST before any callback that uses it
  const loadEventData = useCallback(async () => {
    if (!eventId) return;

    console.log('[EventDetail] === STARTING loadEventData ===');
    console.log('[EventDetail] eventId:', eventId);
    console.log('[EventDetail] user:', user);

    setIsLoadingData(true);
    setLoadError(null);

    try {
      const fullData = await getEventFullDetails(eventId, user?.id);
      console.log('[EventDetail] fullData from server:', fullData);

      if (!fullData?.event) {
        throw new Error('לא נמצא אירוע');
      }

      const eventData = fullData.event;
      const membersData = fullData.members || [];
      const membershipsData = fullData.memberships || [];
      const tasksData = fullData.tasks || [];
      const itineraryItemsData = fullData.itineraryItems || [];
      const professionalsData = fullData.professionals || [];
      const linksData = fullData.links || [];
      const mediaItemsData = fullData.mediaItems || [];
      const documentsData = fullData.documents || [];
      const pollsData = fullData.polls || [];

      // **FIX: Determine user roles from membership directly**
      const userMembership = membershipsData.find(m =>
          (m.userId === user?.id || m.user_id === user?.id)
      );

      console.log('[EventDetail] User membership:', userMembership);

      const memberRole = userMembership?.role?.toLowerCase();

      console.log('[EventDetail] Member role:', memberRole);

      // ✅ CRITICAL FIX: 'organizer' = full management rights (same as owner)
      const isOwnerComputed = memberRole === 'owner' || memberRole === 'organizer' || fullData.isOwner === true;
      const isManagerComputed = memberRole === 'manager' || memberRole === 'manger' || fullData.isManager === true;
      const isMemberComputed = !!userMembership || fullData.isMember === true;

      // 🎯 KEY FIX: If you're an organizer, you can manage EVERYTHING
      const canManageComputed = isOwnerComputed || isManagerComputed;

      console.log('[EventDetail] ✅ Computed permissions:', {
          isOwner: isOwnerComputed,
          isManager: isManagerComputed,
          isMember: isMemberComputed,
          canManage: canManageComputed,
          memberRole,
          userMembershipFound: !!userMembership
      });

      setEvent(eventData);
      setMembers(membersData);
      setMemberships(membershipsData);
      setTasks(tasksData);
      setItineraryItems(itineraryItemsData);
      setProfessionals(professionalsData);
      setLinks(linksData);
      setMediaItems(mediaItemsData);
      setDocuments(documentsData);
      setPolls(pollsData);
      setIsOwner(isOwnerComputed);
      setIsManager(isManagerComputed);
      setIsMember(isMemberComputed);
      setCanManage(canManageComputed);

      setUnreadCount(fullData.unreadMessagesCount || 0);

      // Load recurring rule if event is recurring
      if (eventData.is_recurring || eventData.isRecurring) {
        try {
          const rule = await getRecurringEventRule(eventId);
          setRecurringRule(rule);
          console.log('[EventDetail] ✅ Recurring rule loaded:', rule);
        } catch (ruleError) {
          console.warn('[EventDetail] Failed to load recurring rule:', ruleError);
        }
      }

      console.log('[EventDetail] ✅ Data loaded successfully');
    } catch (error) {
      console.error('[EventDetail] ❌ Error loading event data:', error);
      setLoadError(error.message || 'שגיאה בטעינת נתוני האירוע');
    } finally {
      setIsLoadingData(false);
    }
  }, [eventId, navigate, user?.id]);

  // NOW define the callbacks that use loadEventData
  const handleOpenAssignDialog = useCallback((task) => {
    setAssignTaskData({ task, isOpen: true });
  }, []);

  const handleDeleteEvent = useCallback(async () => {
    if (!event || !canManage) return; // Changed from eventData?.event || !eventData.canManage

    setIsDeleting(true);
    try {
      await deleteEventService(event.id); // Changed from eventData.event.id
      toast.success('האירוע נמחק בהצלחה! 🗑️');
      navigate(createPageUrl('Home'));
    } catch (error) {
      console.error('Failed to delete event:', error);
      toast.error('שגיאה במחיקת האירורוע', { description: error.message });
      setIsDeleting(false);
    } finally {
      setIsDeleteDialogOpen(false); // Close dialog regardless of success/failure
    }
  }, [event, canManage, navigate]); // Changed dependencies

  const handleAssignTask = useCallback(async (taskId, memberId) => {
    setAssignTaskData(null); // Close the assignment dialog

    if (!event) return; // Changed from !eventData

    // Store original tasks for potential rollback on error
    const originalTasks = [...(tasks || [])]; // Changed from eventData.tasks

    // Optimistic UI update: update the task assignee in the local state immediately
    setTasks((prevTasks) => { // Changed from setEventData
      const updatedTasks = (prevTasks || []).map((task) => // Ensure it's an array
        task.id === taskId ? { ...task, assigneeId: memberId, assignee_id: memberId } : task
      );
      return updatedTasks; // Return the updated tasks directly
    });

    try {
      // Use the edge function that creates notifications
      await updateTaskWithNotifications(taskId, { assigneeId: memberId });
      toast.success("המשימה שויכה בהצלחה 🎯", {
        description: "המשתמש קיבל התראה על השיוך"
      });
      // Refresh data
      await loadEventData();
    } catch (error) {
      console.error('Failed to assign task:', error);
      toast.error("שגיאה בשיוך המשימה", { description: error.message });
      // On error, rollback the optimistic update
      setTasks(originalTasks); // Changed from setEventData
    }
  }, [event, tasks, loadEventData]); // Changed dependencies

  const handleCreateTask = useCallback(async (taskData) => {
    try {
      // וודא שיש תיאור
      const taskPayload = {
        ...taskData,
        eventId: eventId,
        status: 'todo',
        description: taskData.description || taskData.title || 'משימה חדשה'
      };

      await createTaskService(taskPayload);
      // Reload event data to reflect new tasks
      await loadEventData();
      toast.success("משימה חדשה נוצרה");
      setIsCreateTaskDialogOpen(false); // Close the dialog
    } catch (error) {
      console.error('Failed to create task:', error); // Ensure error is logged
      toast.error('שגיאה ביצירת המשימה', { description: error.message });
    }
  }, [eventId, loadEventData]);

  const handleShare = useCallback(async () => {// Renamed from handleShareEvent
    if (!event) return; // Changed from eventData?.event
    // ✅ עדכון: השתמש ב-register.plan-ora.net במקום window.location.origin
    const joinUrl = `https://register.plan-ora.net${createPageUrl(`JoinEvent?id=${event.id}`)}`; // Changed from eventData.event.id
    try {
      await navigator.clipboard.writeText(joinUrl);
      toast.success('קישור ההזמנה הועתק! 🔗');
    } catch (err) {
      toast.error('שגיאה בהעתקת הקישור');
    }
  }, [event]); // Changed dependencies

  // NEW: refresh media items list for Gallery tab
  const refreshMediaItems = useCallback(async () => {
    if (!eventId) return;
    const items = await listMediaItems(eventId).catch(() => []);
    setMediaItems(items || []); // Changed from setEventData
  }, [eventId]);

  // NEW: refresh documents list for Documents tab
  const refreshDocuments = useCallback(async () => {
    if (!eventId) return;
    const docs = await listEventDocuments(eventId).catch(() => []);
    setDocuments(docs || []); // Changed from setEventData
  }, [eventId]);

  // NEW: refresh polls list for Polls tab
  const refreshPolls = useCallback(async () => {
    if (!eventId) return;
    try {
      const normalizedPolls = await getPolls(eventId);
      setPolls(normalizedPolls); // Changed from setEventData
    } catch (err) {
      console.error("Failed to load polls:", err);
      toast.error('שגיאה בטעינת הסקרים', { description: err.message });
    }
  }, [eventId]);

  // NEW: Patch event fields locally (without full reload) after poll finalization
  const handleEventPatched = useCallback((patch) => {
    if (!patch) return;
    setEvent((prev) => { // Changed from setEventData
      if (!prev) return prev; // Check prev directly
      // Merge patch; support both camelCase and snake_case keys
      const mergedEvent = { ...prev, ...patch }; // Changed prev.event to prev
      if (patch.event_date && !patch.eventDate) {
        mergedEvent.eventDate = patch.event_date;
      }
      if (patch.location && !mergedEvent.location) {
        mergedEvent.location = patch.location;
      }
      // Ensure specific flags are updated
      if (patch.hasOwnProperty('has_active_date_poll') || patch.hasOwnProperty('hasActiveDatePoll')) {
        mergedEvent.hasActiveDatePoll = patch.has_active_date_poll || patch.hasActiveDatePoll;
        mergedEvent.has_active_date_poll = patch.has_active_date_poll || patch.hasActiveDatePoll;
      }
      if (patch.hasOwnProperty('has_active_location_poll') || patch.hasOwnProperty('hasActiveLocationPoll')) {
        mergedEvent.hasActiveLocationPoll = patch.has_active_location_poll || patch.hasActiveLocationPoll;
        mergedEvent.has_active_location_poll = patch.has_active_location_poll || patch.hasActiveLocationPoll;
      }

      return mergedEvent; // Return the updated event directly
    });
  }, []);

  // NEW: locally patch a poll in parent state to mark it inactive immediately
  const handlePollPatched = useCallback((pollPatch) => {
    if (!pollPatch?.id) return;
    setPolls((prevPolls) => { // Changed from setEventData, operating on polls directly
      if (!prevPolls) return prevPolls;
      const patched = (prevPolls || []).map((p) =>
        String(p.id) === String(pollPatch.id) ?
          { ...p, isActive: false, is_active: false, final_result: pollPatch.final_result, finalResult: pollPatch.finalResult } :
          p
      );
      return patched; // Return the updated polls array
    });
  }, []);

  // NEW: Function to refresh only event header fields from server
  const refreshEventHeaderFields = useCallback(async () => {
    if (!eventId) return;
    try {
      const fresh = await getEventDetails(eventId).catch(() => null);
      if (fresh) {
        setEvent((prev) => prev ? { // Changed from setEventData, operating on event directly
          ...prev,
          // Refresh only the header fields we care about
          eventDate: fresh.eventDate || fresh.event_date,
          event_date: fresh.event_date || fresh.eventDate,
          endDate: fresh.endDate || fresh.end_date, // Added endDate refresh
          end_date: fresh.end_date || fresh.endDate, // Added end_date refresh
          location: fresh.location,
          hasActiveDatePoll: fresh.hasActiveDatePoll || fresh.has_active_date_poll,
          has_active_date_poll: fresh.has_active_date_poll || fresh.hasActiveDatePoll,
          hasActiveLocationPoll: fresh.hasActiveLocationPoll || fresh.has_active_location_poll,
          has_active_location_poll: fresh.has_active_location_poll || fresh.hasActiveLocationPoll,
          datePollEnabled: fresh.datePollEnabled,
          locationPollEnabled: fresh.locationPollEnabled
        } : prev);
      }
    } catch (error) {
      console.warn('Failed to refresh event header fields:', error);
    }
  }, [eventId]);

  const handleViewModeChange = (newMode) => {
    setTabViewMode(newMode);
    localStorage.setItem(`eventViewMode:${eventId}`, newMode);
  };

  // Helper to get active polls by type
  const getActivePollByType = useCallback((type) => {
    // Access polls state directly
    const activePolls = polls || [];
    // Robust check for poll type and status
    return activePolls.find((p) => {
      const pollType = p.type?.name || p.type; // Handles if type is {name: "date"} or just "date"
      const pollIsActive = p.isActive === true || p.is_active === true;
      return pollType === type && pollIsActive;
    });
  }, [polls]); // Dependency is now `polls` state

  // Handler to navigate to a specific poll
  const handleNavigateToPoll = useCallback((pollId) => {
    setActiveTab('polls');
    setHighlightPollId(pollId);
    // Scroll to polls tab after a brief delay to ensure rendering
    setTimeout(() => {
      const pollElement = document.getElementById(`poll-${pollId}`);
      if (pollElement) {
        pollElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }, []);

  // NEW: handleSendBroadcast function (not a hook, but defined here for hoisting)
  const handleSendBroadcast = async () => {
    if (!broadcastMessage.title.trim() || !broadcastMessage.message.trim()) {
      toast.error('נא למלא כותרת והודעה');
      return;
    }

    setIsSendingBroadcast(true);

    try {
      const allMembers = members || []; // Changed from eventData?.members
      // Get all event members except current user
      const recipients = allMembers.filter((m) => String(m.id) !== String(user?.id)); // Changed from currentUser.id

      if (recipients.length === 0) {
        toast.info('אין משתתפים אחרים באירוע לשלוח אליהם הודעה.');
        setShowBroadcastDialog(false);
        setBroadcastMessage({ title: '', message: '' });
        return;
      }

      // Send bulk notification
      const userIds = recipients.map(m => String(m.id));
      await createNotificationsAndSendPushBulk({
        userIds: userIds,
        type: 'event_announcement',
        title: `📢 ${broadcastMessage.title}`,
        message: broadcastMessage.message,
        eventId: eventId,
        actionUrl: `https://register.plan-ora.net${createPageUrl(`EventDetail?id=${eventId}&tab=chat`)}`,
        priority: 'high'
      });

      toast.success(`ההודעה נשלחה ל-${recipients.length} משתתפים! 📢`);
      setShowBroadcastDialog(false);
      setBroadcastMessage({ title: '', message: '' });

    } catch (error) {
      console.error('Failed to send broadcast:', error);
      toast.error('שגיאה בשליחת ההודעה', { description: error.message });
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  // NEW: Handler for adding event to calendar - now opens dialog
  const handleAddToCalendar = useCallback(() => {
    if (!event) return;
    setIsCalendarDialogOpen(true);
  }, [event]);

  // NEW: Handler for leaving event
  const handleLeaveEvent = useCallback(async () => {
    if (!event || isOwner) { // Changed from eventData?.event || eventData.isOwner
      toast.error('מארגן האירוע לא יכול לעזוב את האירוע');
      return;
    }

    const confirmed = window.confirm(
      `האם אתה בטוח שברצונך לעזוב את האירוע "${event.title}"?\n\nפעולה זו תסיר אותך מרשימת המשתתפים.` // Changed from eventData.event.title
    );

    if (!confirmed) return;

    try {
      await leaveEvent(event.id); // Changed from eventData.event.id
      toast.success('עזבת את האירוע בהצלחה', {
        description: 'מועבר לרשימת האירועים שלך...'
      });

      // Redirect to events list after a short delay
      setTimeout(() => {
        navigate(createPageUrl('MyEventsList'));
      }, 1500);
    } catch (error) {
      console.error('Failed to leave event:', error);
      toast.error('שגיאה ביציאה מהאירוע', {
        description: error?.message || 'אנא נסה שוב מאוחר יותר'
      });
    }
  }, [event, isOwner, navigate]); // Changed dependencies

  // NEW: Handler for status change
  const handleStatusChange = useCallback(async (newStatus) => {
    if (!event || !canManage) return;

    setIsUpdatingStatus(true);
    try {
      await updateEvent(event.id, {
        ...event,
        status: newStatus
      });

      // Update local state
      setEvent(prev => ({ ...prev, status: newStatus }));

      toast.success('סטטוס האירוע עודכן בהצלחה!');
      setIsStatusDialogOpen(false);
    } catch (error) {
      console.error('Failed to update event status:', error);
      toast.error('שגיאה בעדכון סטטוס האירוע', { description: error.message });
    } finally {
      setIsUpdatingStatus(false);
    }
  }, [event, canManage]);

  const renderTabContent = useCallback(() => {
    if (!event) return null; // Changed from !eventData
    const isCompleted = event?.status === 'completed'; // event is now a direct state
    const isReadOnly = isCompleted; // Future: can add more read-only conditions

    switch (activeTab) {
      case 'tasks':
        return <TasksTab
          eventId={eventId}
          initialTasks={tasks || []} // Changed from eventData.tasks
          members={members || []} // Changed from eventData.members
          currentUser={user} // Changed from currentUser
          onAddTask={() => setIsCreateTaskDialogOpen(true)}
          onAssignTask={handleOpenAssignDialog}
          isManager={canManage} // Changed from eventData.canManage
          canManage={canManage && !isReadOnly} // Changed from eventData.canManage
          onTaskUpdate={loadEventData}
          highlightTaskId={highlightTaskId}
          isReadOnly={isReadOnly} />;

      case 'chat':
        return <ChatTab
          eventId={eventId}
          members={members || []} // Changed from eventData.members
          memberships={memberships || []} // Changed from eventData.memberships
          currentUser={user} // Changed from currentUser
          isReadOnly={isReadOnly} />;

      case 'itinerary':
        return <ItineraryTab
          initialItems={itineraryItems || []} // Changed from eventData.itineraryItems
          eventId={eventId}
          isManager={canManage && !isReadOnly} // Changed from eventData.canManage
          isReadOnly={isReadOnly} />;

      case 'professionals':
        return <ProfessionalsTab
          eventId={eventId}
          initialProfessionals={professionals || []} // Changed from eventData.professionals
          isManager={canManage && !isReadOnly} // Changed from eventData.canManage
          isReadOnly={isReadOnly} />;

      case 'links':
        return <LinksTab
          eventId={eventId}
          initialLinks={links || []} // Changed from eventData.links
          isManager={canManage && !isReadOnly} // Changed from eventData.canManage
          isReadOnly={isReadOnly} />;

      case 'gallery':
        return <GalleryTab
          event={event}
          currentUser={user} // Changed from currentUser
          eventId={eventId}
          initialMediaItems={mediaItems || []} // Changed from eventData.mediaItems
          isManager={canManage} // Changed from eventData.canManage
          onDataRefresh={refreshMediaItems}
          isReadOnly={false} // Gallery remains active for memories
        />;
      // PollsTab is now rendered directly in the tabViewMode blocks to pass highlightPollId
      case 'documents':
        return <DocumentsTab
          eventId={eventId}
          currentUser={user} // Changed from currentUser
          initialDocuments={documents || []} // Changed from eventData.documents
          isManager={canManage && !isReadOnly} // Changed from eventData.canManage
          onDataRefresh={refreshDocuments}
          isReadOnly={isReadOnly} />;

      case 'participants':
        return <ParticipantsTab
          members={members || []} // Changed from eventData.members
          memberships={memberships || []} // Changed from eventData.memberships
          eventId={eventId}
          canManage={canManage && !isReadOnly} // Changed from eventData.canManage
          isReadOnly={isReadOnly} />;

      case 'budget':
        return <BudgetTab
          eventId={eventId}
          isManager={canManage && !isReadOnly} />;

      case 'payments':
        // Check if this is a public event with participation cost
        const hasParticipationCost = event?.participationCost || event?.participation_cost;
        const isPublicEvent = event?.privacy === 'public';
        
        if (isPublicEvent && hasParticipationCost) {
          return <PaymentsManagementTab
            eventId={eventId}
            members={members || []}
            memberships={memberships || []}
            currentUser={user}
            isManager={canManage}
            participationCost={Number(event?.participationCost || event?.participation_cost || 0)}
            hidePaymentsFromMembers={event?.hidePaymentsFromMembers || event?.hide_payments_from_members || false}
            isReadOnly={isReadOnly} />;
        }
        
        return <ExpensesTab
          eventId={eventId}
          members={members || []}
          currentUser={user}
          isManager={canManage && !isReadOnly}
          isReadOnly={isReadOnly} />;

      case 'updates':
        return <UpdatesTab
          eventId={eventId}
          currentUser={user}
          canManage={canManage && !isReadOnly} />;

      case 'rsvp':
        // Get owner name for RSVP invitations
        const ownerId = event.ownerId || event.owner_id;
        const ownerMember = members?.find(m => m.id === ownerId);
        const ownerName = ownerMember?.name || ownerMember?.full_name || event.owner_name || 'מארגן האירוע';
        
        return <RSVPTab
          eventId={eventId}
          event={{ ...event, ownerName }}
          isManager={canManage} />;

      default:
        return <Card><CardContent className="p-6 text-center text-gray-500">הצגת תוכן עבור '{activeTab}' תיושם בקרוב.</CardContent></Card>;
    }
  }, [
    activeTab,
    event, // Changed from eventData
    members, // Changed from eventData.members
    memberships, // Changed from eventData.memberships
    tasks, // Changed from eventData.tasks
    itineraryItems, // Changed from eventData.itineraryItems
    professionals, // Changed from eventData.professionals
    links, // Changed from eventData.links
    mediaItems, // Changed from eventData.mediaItems
    documents, // Changed from eventData.documents
    polls, // Added polls to dependencies
    canManage, // Changed from eventData.canManage
    eventId,
    user, // Changed from currentUser
    handleOpenAssignDialog,
    loadEventData,
    refreshMediaItems,
    refreshDocuments,
    highlightTaskId]
  );

  const handleInviteClick = useCallback(() => {// Handler for invite
    setIsInviteDialogOpen(true);
  }, []);

  // PageGuide removed - using SideHelpTab instead
  const shouldShowDashboardGuide = false;

  // EFFECTS
  useEffect(() => {
    // Load saved view mode
    const savedMode = localStorage.getItem(`eventViewMode:${eventId}`);
    if (savedMode && ['tabs', 'sidebar', 'carousel', 'dashboard'].includes(savedMode)) {
      setTabViewMode(savedMode);
    }

    loadEventData();
    const isNew = searchParams.get("new") === "true";
    if (isNew && eventId) {
      const key = `eventOnboardingSeen:${eventId}`;
      const seen = localStorage.getItem(key) === "1";
      if (!seen) setShowOnboarding(true);
    }

    // NEW: sync tab and taskId from URL
    const tab = searchParams.get('tab');
    const taskId = searchParams.get('taskId');
    const pollId = searchParams.get('pollId');
    const validTabs = new Set(['tasks', 'chat', 'polls', 'itinerary', 'professionals', 'links', 'gallery', 'documents', 'participants', 'payments']);
    if (tab && validTabs.has(tab)) {
      setActiveTab(tab);
    }
    if (taskId) setHighlightTaskId(taskId);
    if (pollId) setHighlightPollId(pollId);

  }, [eventId, loadEventData, searchParams, user?.id]); // Added user?.id as dependency for loadEventData

  // Listen to clear events for unread messages
  useEffect(() => {
    const onChatRead = (e) => {
      if (e?.detail?.eventId === eventId) setUnreadCount(0); // Changed from setEventUnreadCount
    };
    window.addEventListener('chat:read', onChatRead);
    return () => {
      window.removeEventListener('chat:read', onChatRead);
    };
  }, [eventId]);

  // When switching to chat tab, clear local indicator right away
  useEffect(() => {
    if (activeTab === 'chat' && unreadCount > 0) { // Changed from eventUnreadCount
      setUnreadCount(0); // Changed from setEventUnreadCount
    }
  }, [activeTab, unreadCount]); // Changed from eventUnreadCount

  // NOW WE CAN HAVE EARLY RETURNS - ALL HOOKS ARE ABOVE
  if (isLoadingData) { // Changed from isLoading
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black pb-20" style={{ direction: 'rtl' }}>
        <header className="relative">
          <div className="h-48 sm:h-64 overflow-hidden bg-gray-200">
            <Skeleton className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
          <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-6 py-6">
            <Skeleton className="h-7 w-3/4 mb-2 bg-white/20" />
            <Skeleton className="h-5 w-1/2 bg-white/20" />
          </div>
        </header>
        <main className="p-6">
          <Card><Skeleton className="h-40 w-full" /></Card>
        </main>
      </div>);
  }

  // Render 404 Not Found page if event was not found
  if (loadError) { // Changed from notFound
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center p-6" style={{ direction: 'rtl' }}>
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-6 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-orange-100 flex items-center justify-center mb-4">
            <Calendar className="w-8 h-8 text-orange-500" />
          </div>
          <h2 className="text-xl font-bold mb-2 dark:text-white">{loadError === 'לא נמצא אירוע' ? 'האירוע לא נמצא' : 'שגיאה בטעינת האירוע'}</h2> {/* Updated message based on loadError content */}
          <p className="text-gray-600 dark:text-gray-400 mb-6">{loadError === 'לא נמצא אירוע' ? 'ייתכן שהאירוע הוסר או שהקישור שגוי.' : loadError}</p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => navigate(createPageUrl('Home'))}>חזרה לבית</Button>
            <Link to={createPageUrl('MyEventsList')} className="bg-orange-500 hover:bg-orange-600 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none h-10 py-2 px-4">האירועים שלי</Link>
          </div>
        </div>
      </div>);

  }

  // If not loading and not loadError, but event is still null, something unexpected happened.
  if (!event) { // Changed from !eventData?.event
    return null;
  }

  // event, canManage, isOwner are now directly available as states
  const isCompleted = event?.status === 'completed';
  const isReadOnly = isCompleted;
  const userRole = canManage ? 'organizer' : 'participant'; // Derived role

  const activeDatePoll = getActivePollByType('date');
  const activeLocationPoll = getActivePollByType('location');

  // Check if payments tab should be visible
  const hasParticipationCost = event?.participationCost || event?.participation_cost;
  const isPublicEvent = event?.privacy === 'public';
  const hidePaymentsFromMembers = event?.hidePaymentsFromMembers || event?.hide_payments_from_members;
  const showPaymentsTab = !isPublicEvent || !hasParticipationCost || !hidePaymentsFromMembers || canManage;

  // Get visible tabs for public events (managers always see all)
  const eventVisibleTabs = event?.visibleTabs || event?.visible_tabs || null;
  const allTabIds = ['updates', 'tasks', 'chat', 'polls', 'itinerary', 'professionals', 'links', 'gallery', 'documents', 'participants', 'payments'];
  
  // Specific categories for RSVP tab visibility (family/celebration events)
  // Load from localStorage if available, otherwise use defaults
  const getRsvpCategories = () => {
    const saved = localStorage.getItem('rsvp_categories');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn('Failed to parse saved RSVP categories');
      }
    }
    return [
      'חתונה', 'אירוסין', 'ברית מילה', 'בת מצווה', 'בר מצווה', 'חינה', 'שבת חתן', 'בריתה', 
      'יום הולדת', 'אירוע משפחתי', 'birthday', 'party'
    ];
  };
  const rsvpCategories = getRsvpCategories();

  // Filter function to check if tab should be visible
  const isTabVisible = (tabId) => {
    // RSVP tab - only for specific event categories (managers always see it)
    if (tabId === 'rsvp') {
      if (canManage) return rsvpCategories.includes(event?.category);
      return rsvpCategories.includes(event?.category);
    }
    
    // Managers always see all other tabs
    if (canManage) return true;
    // For private events or if no visibility settings, show all
    if (!isPublicEvent || !eventVisibleTabs || !Array.isArray(eventVisibleTabs)) return true;
    // Check if tab is in visible list
    return eventVisibleTabs.includes(tabId);
  };

  const allTabs = [
    { id: 'updates', label: 'עדכונים', icon: Megaphone },
    { id: 'rsvp', label: 'אישורי הגעה', icon: ClipboardCheck },
    { id: 'tasks', label: 'משימות', icon: CheckSquare },
    { id: 'chat', label: 'צ\'אט', icon: MessageSquare },
    { id: 'polls', label: 'סקרים', icon: BarChart3 },
    { id: 'itinerary', label: 'לו"ז', icon: Calendar },
    { id: 'professionals', label: 'ספקים', icon: Briefcase },
    { id: 'links', label: 'קישורים', icon: LinkIcon },
    { id: 'gallery', label: 'גלריה', icon: Image },
    { id: 'documents', label: 'מסמכים', icon: FileText },
    { id: 'participants', label: 'משתתפים', icon: Users },
    { id: 'budget', label: 'תקציב', icon: Wallet },
    { id: 'payments', label: 'תשלומים', icon: Wallet }
  ];

  // Filter tabs based on visibility settings and payment tab logic
  const tabItems = allTabs.filter(tab => {
    // Special handling for payments tab
    if (tab.id === 'payments') {
      return showPaymentsTab && isTabVisible('payments');
    }
    return isTabVisible(tab.id);
  });


  const unreadCounts = {
    chat: unreadCount, // Changed from eventUnreadCount
  };

  const mainContent = <main className="flex-1 min-w-0">{renderTabContent()}</main>;

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50 dark:from-black dark:via-black dark:to-gray-900"
      style={{ direction: 'rtl' }}
    >
      <div className="w-full">
        {isDeleting && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
            <div className="bg-white p-6 rounded-lg flex items-center gap-4">
              <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
              <span className="text-lg font-medium">מוחק אירוע...</span>
            </div>
          </div>
        )}

        {event && (
          <div className="relative">
            {/* Header – תמונה כרקע + גרדיאנט כמו בדף "האירועים שלי" */}
            <div
            className="h-44 sm:h-48 bg-cover bg-center relative bg-gradient-to-br from-orange-400 via-rose-400 to-pink-500"
              style={event.coverImageUrl ? { backgroundImage: `url(${event.coverImageUrl})` } : undefined}
            >
              {/* כיסוי מעל התמונה – רק אם יש תמונה */}
              {event.coverImageUrl && (
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/60" />
              )}

              {/* שורת הכפתורים העליונה */}
<div className="absolute top-0 left-0 right-0 px-3 pt-[calc(1.5rem+env(safe-area-inset-top))] flex items-center justify-between z-40">
  {/* חזור לרשימת האירועים */}
  <button
    onClick={() => navigate(createPageUrl('MyEventsList'))}
    className="flex flex-col items-center gap-0.5"
  >
    <div className="text-white hover:bg-white/20 rounded-full h-10 w-10 flex items-center justify-center transition-colors">
      <ArrowRight className="w-6 h-6" />
    </div>
    <span className="text-white text-[9px] font-medium drop-shadow">חזרה</span>
  </button>

  <div className="flex items-center gap-1.5">
    {/* כפתור הוסף ליומן */}
    <button
      onClick={handleAddToCalendar}
      className="flex flex-col items-center gap-0.5"
      title="הוסף ליומן"
    >
      <div className="text-white hover:bg-white/20 rounded-full h-10 w-10 flex items-center justify-center transition-colors">
        <Calendar className="w-6 h-6 text-sky-300" />
      </div>
      <span className="text-white text-[9px] font-medium drop-shadow">יומן</span>
    </button>

    {/* תג סטטוס – לחיץ רק למנהלים */}
    <div className="flex flex-col items-center gap-0.5">
      <button
        onClick={() => canManage && setIsStatusDialogOpen(true)}
        disabled={!canManage}
        className={`bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center gap-1 h-10 ${
          canManage ? 'hover:bg-white/30 transition-all cursor-pointer' : 'cursor-default'
        }`}
        title={canManage ? 'לחץ לשינוי סטטוס' : ''}
      >
        <span className="text-white text-xs font-medium">
          {event.status === 'active' && 'פעיל'}
          {event.status === 'draft' && 'טיוטה'}
          {event.status === 'completed' && 'הסתיים'}
          {event.status === 'cancelled' && 'בוטל'}
        </span>
        {canManage && <ChevronDown className="w-3 h-3 text-white/80" />}
      </button>
      <span className="text-white text-[9px] font-medium drop-shadow">סטטוס</span>
    </div>

    <div className="flex flex-col items-center gap-0.5">
      <ViewModeSwitcher currentMode={tabViewMode} onModeChange={handleViewModeChange} />
      <span className="text-white text-[9px] font-medium drop-shadow">תצוגה</span>
    </div>

    {/* תפריט הגדרות – מנהל רואה הכול, משתתף רק "עזוב אירוע" */}
  <DropdownMenu>
  <DropdownMenuTrigger asChild>
    <button
      className="flex flex-col items-center gap-0.5"
      title="הגדרות"
    >
      <div className="text-white hover:bg-white/20 rounded-full h-10 w-10 flex items-center justify-center transition-colors">
        <Settings className="w-6 h-6" />
      </div>
      <span className="text-white text-[9px] font-medium drop-shadow">הגדרות</span>
    </button>
  </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-48">
        {canManage ? (
          <>
            <DropdownMenuItem
              onClick={() => navigate(createPageUrl(`EditEvent?id=${eventId}`))}
            >
              <Settings className="w-4 h-4 ml-2" />
              ערוך אירוע
            </DropdownMenuItem>

            <DropdownMenuItem onClick={handleInviteClick}>
              <UserPlus className="w-4 h-4 ml-2 text-green-600" />
              הזמן משתתפים
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={handleShare}>
              <Share2 className="w-4 h-4 ml-2" />
              שתף אירוע
            </DropdownMenuItem>

            {!isOwner && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLeaveEvent}
                  className="text-orange-600"
                >
                  <LogOut className="w-4 h-4 ml-2" />
                  עזוב אירוע
                </DropdownMenuItem>
              </>
            )}

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => setIsDeleteDialogOpen(true)}
              className="text-red-600"
            >
              <Trash2 className="w-4 h-4 ml-2" />
              מחק אירוע
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => setShowBroadcastDialog(true)}>
              <Bell className="w-4 h-4 ml-2" />
              שלח הודעה לכולם
            </DropdownMenuItem>
          </>
        ) : (
          !isOwner && (
            <DropdownMenuItem
              onClick={handleLeaveEvent}
              className="text-orange-600"
            >
              <LogOut className="w-4 h-4 ml-2" />
              עזוב אירוע
            </DropdownMenuItem>
          )
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</div>

           {/* כותרת + תיאור + כרטיס משתתפים בתחתית ההדר */}
            <div className="absolute bottom-3 left-4 right-4 z-10">
              <div className="flex flex-row items-end justify-between gap-3">
                {/* צד ימין: כותרת + תיאור */}
                <div className="flex-1 min-w-0 flex flex-col gap-1 pb-0.5">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white drop-shadow-lg leading-tight line-clamp-1">
                    {event.title || event.name || 'טוען...'}
                  </h1>
                  {event.description && (
                    <p className="text-white/95 text-xs sm:text-sm drop-shadow-md leading-snug line-clamp-2 overflow-hidden max-w-[90%]">
                      {event.description}
                    </p>
                  )}
                </div>

                {/* צד שמאל: כרטיס משתתפים בגודל רגיל */}
                <button
                  type="button"
                  onClick={handleInviteClick}
                  data-coachmark="invite"
                  className="bg-white/95 backdrop-blur-sm rounded-xl px-3 py-2 shadow-lg flex-shrink-0 active:scale-95 transition-transform mb-1"
                >
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Users className="w-5 h-5 text-orange-600" />
                      <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full flex items-center justify-center">
                        <Plus className="w-2.5 h-2.5 text-white" />
                      </div>
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-[10px] sm:text-xs text-gray-600 leading-none font-medium">משתתפים</span>
                      <span className="text-sm sm:text-base font-bold text-gray-900 leading-none mt-0.5">
                        {members?.length || 0}
                      </span>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            </div>

            {/* Event Details Card - remove participants count from here */}
            <div className="px-3 -mt-3 mb-3 relative z-20">
              <Card className="bg-white dark:bg-gray-800 shadow-lg border-0">
                <CardContent className="p-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                    {/* Date and Time - or Poll Link */}
                    <div className="flex items-start gap-2">
                      <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-4 h-4 text-orange-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">תאריך</p>
                        {activeDatePoll ? (
                          <button
                            onClick={() => handleNavigateToPoll(activeDatePoll.id)}
                            className="text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                          >
                            ראה סקר 📊
                          </button>
                        ) : event.eventDate || event.event_date ? (
                          <>
                            <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
                              {formatIsraelDate(event.eventDate || event.event_date)}
                            </p>
                            <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">
                              {formatIsraelTime(event.eventDate || event.event_date)}
                            </p>
                            {((event.endDate || event.end_date) &&
                              !isSameDay(
                                new Date(event.eventDate || event.event_date),
                                new Date(event.endDate || event.end_date),
                              )) && (
                              <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mt-1">
                                עד: {formatIsraelDate(event.endDate || event.end_date)}{' '}
                                {formatIsraelTime(event.endDate || event.end_date)}
                              </p>
                            )}
                            {(event.is_recurring || event.isRecurring) && recurringRule && (
                            <>
                            <RecurrenceDisplay rule={recurringRule} className="mt-1.5" />
                            {(() => {
                            const recEndDate = calculateRecurrenceEndDate(recurringRule, event.eventDate || event.event_date);
                            if (recEndDate && recurringRule.recurrence_end_type !== 'NEVER') {
                              return (
                                <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mt-1">
                                  עד: {formatIsraelDate(recEndDate)}
                                </p>
                              );
                            }
                            return null;
                            })()}
                            </>
                            )}
                          </>
                        ) : (
                          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">לא נקבע</p>
                        )}
                      </div>
                    </div>

                    {/* Location - or Poll Link */}
                    <div className="flex items-start gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">מיקום</p>
                        {activeLocationPoll ? (
                          <button
                            onClick={() => handleNavigateToPoll(activeLocationPoll.id)}
                            className="text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                          >
                            ראה סקר 📊
                          </button>
                        ) : event.location ? (
                          <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {event.location}
                          </p>
                        ) : (
                          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">לא צוין</p>
                        )}
                      </div>
                    </div>

                    {/* Participation Cost - only for public events with cost */}
                    {hasParticipationCost && (
                      <div className="flex items-start gap-2 col-span-full sm:col-span-1">
                        <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                          <Wallet className="w-4 h-4 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">עלות השתתפות</p>
                          <p className="text-xs sm:text-sm font-bold text-green-600">
                            ₪{Number(event.participationCost || event.participation_cost).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {/* Payment Button - show for all members when there's participation cost */}
                    {hasParticipationCost && !canManage && (
                      <div className="col-span-full mt-2">
                        <PaymentButton event={event} className="w-full" />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Conditional Tab Navigation and Content */}
            {tabViewMode === 'tabs' && (
              <div className="p-4 sm:p-6 pt-2">

                {/* Tabs Navigation */}
                <div className="mt-0">
                  <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-1.5 sm:gap-2">
                    {tabItems.map((tab) => {
                      const isActive = activeTab === tab.id;
                      
                      // Define colors per tab
                      const tabColors = {
                        updates: { icon: 'text-purple-500', active: 'text-purple-600', bg: 'bg-purple-50' },
                        tasks: { icon: 'text-green-500', active: 'text-green-600', bg: 'bg-green-50' },
                        chat: { icon: 'text-blue-500', active: 'text-blue-600', bg: 'bg-blue-50' },
                        polls: { icon: 'text-indigo-500', active: 'text-indigo-600', bg: 'bg-indigo-50' },
                        itinerary: { icon: 'text-orange-500', active: 'text-orange-600', bg: 'bg-orange-50' },
                        professionals: { icon: 'text-amber-500', active: 'text-amber-600', bg: 'bg-amber-50' },
                        links: { icon: 'text-cyan-500', active: 'text-cyan-600', bg: 'bg-cyan-50' },
                        gallery: { icon: 'text-pink-500', active: 'text-pink-600', bg: 'bg-pink-50' },
                        documents: { icon: 'text-slate-500', active: 'text-slate-600', bg: 'bg-slate-50' },
                        participants: { icon: 'text-teal-500', active: 'text-teal-600', bg: 'bg-teal-50' },
                        payments: { icon: 'text-emerald-500', active: 'text-emerald-600', bg: 'bg-emerald-50' }
                      };
                      
                      const colors = tabColors[tab.id] || { icon: 'text-gray-500', active: 'text-orange-600', bg: 'bg-gray-50' };
                      
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          data-coachmark={
                            tab.id === 'tasks'
                              ? 'tab-tasks'
                              : tab.id === 'chat'
                              ? 'tab-chat'
                              : tab.id === 'polls'
                              ? 'tab-polls'
                              : undefined
                          }
                          className={`flex flex-col items-center justify-center py-2 sm:py-3 rounded-lg transition-all relative group ${
                            isActive ? colors.bg : 'hover:bg-gray-50'
                          }`}
                        >
                          <tab.icon
                            className={`w-4 h-4 sm:w-5 sm:h-5 mb-1 transition-colors ${
                              isActive ? colors.active : colors.icon
                            }`}
                          />
                          {tab.id === 'chat' && unreadCounts.chat > 0 && (
                            <span className="absolute top-0.5 right-1/4 w-2 h-2 bg-red-500 rounded-full border border-white" />
                          )}
                          <span
                            className={`text-[10px] sm:text-xs text-center transition-colors leading-tight ${
                              isActive ? `${colors.active} font-bold` : 'text-gray-600'
                            }`}
                          >
                            {tab.label}
                          </span>
                          {isActive && (
                            <div className={`absolute bottom-0 h-0.5 w-6 sm:w-8 rounded-full ${colors.active.replace('text-', 'bg-')}`} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-6">
                  {activeTab === 'polls' ? (
                    <PollsTab
                      eventId={eventId}
                      initialPolls={polls || []}
                      members={members || []}
                      currentUser={user}
                      isManager={canManage && !isReadOnly}
                      onPollUpdate={refreshPolls}
                      highlightPollId={highlightPollId}
                      isReadOnly={isReadOnly}
                      onEventPatched={handleEventPatched}
                      onRequestEventRefresh={refreshEventHeaderFields}
                      onPatchPollLocally={handlePollPatched}
                    />
                  ) : (
                    mainContent
                  )}
                </div>
              </div>
            )}

            {tabViewMode === 'sidebar' && (
              <div className="grid grid-cols-[auto_1fr] gap-0 min-h-screen">
                <div className="bg-white border-l border-gray-200">
                  <EventSidebarNav
                    tabItems={tabItems}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    unreadCounts={unreadCounts}
                  />
                </div>
                <div className="p-4 sm:p-6 bg-gray-50">
                  {activeTab === 'polls' ? (
                    <PollsTab
                      eventId={eventId}
                      initialPolls={polls || []}
                      members={members || []}
                      currentUser={user}
                      isManager={canManage && !isReadOnly}
                      onPollUpdate={refreshPolls}
                      highlightPollId={highlightPollId}
                      isReadOnly={isReadOnly}
                      onEventPatched={handleEventPatched}
                      onRequestEventRefresh={refreshEventHeaderFields}
                      onPatchPollLocally={handlePollPatched}
                    />
                  ) : (
                    mainContent
                  )}
                </div>
              </div>
            )}

            {tabViewMode === 'carousel' && (
              <div className="p-4 sm:p-6">
                <div className="space-y-4">
                  <EventCarouselNav
                    tabItems={tabItems}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    unreadCounts={unreadCounts}
                  />
                  {activeTab === 'polls' ? (
                    <PollsTab
                      eventId={eventId}
                      initialPolls={polls || []}
                      members={members || []}
                      currentUser={user}
                      isManager={canManage && !isReadOnly}
                      onPollUpdate={refreshPolls}
                      highlightPollId={highlightPollId}
                      isReadOnly={isReadOnly}
                      onEventPatched={handleEventPatched}
                      onRequestEventRefresh={refreshEventHeaderFields}
                      onPatchPollLocally={handlePollPatched}
                    />
                  ) : (
                    mainContent
                  )}
                </div>
              </div>
            )}

            {tabViewMode === 'dashboard' && event && (
              <div className="p-4 sm:p-6">
                <EventDashboard
                  eventData={{
                    event,
                    members,
                    memberships,
                    tasks,
                    itineraryItems,
                    professionals,
                    links,
                    mediaItems,
                    documents,
                    polls,
                    isOwner,
                    isManager,
                    isMember,
                    canManage,
                    myMembership:
                      memberships.find(
                        (m) => m.user_id === user?.id || m.userId === user?.id,
                      ) || null,
                  }}
                  eventId={eventId}
                  canManage={canManage}
                  userId={user?.id}
                  onNavigateToTab={(tabId) => {
                    setActiveTab(tabId);
                    setTabViewMode('tabs');
                  }}
                />
              </div>
            )}



            {/* Dialogs and Onboarding */}
            <TaskCreateDialog
              isOpen={isCreateTaskDialogOpen}
              onOpenChange={setIsCreateTaskDialogOpen}
              onSubmit={handleCreateTask}
            />
            <InviteDialog
              isOpen={isInviteDialogOpen}
              onOpenChange={setIsInviteDialogOpen}
              event={event}
              onCopyLink={handleShare}
              onShareWhatsApp={() => {}}
            />
            <TaskAssignmentDialog
              isOpen={!!assignTaskData}
              onOpenChange={() => setAssignTaskData(null)}
              task={assignTaskData?.task}
              members={members || []}
              onAssign={handleAssignTask}
            />

            {isDeleteDialogOpen && (
              <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>אישור מחיקה</DialogTitle>
                  </DialogHeader>
                  <div className="py-4">
                    האם אתה בטוח שברצונך למחוק אירוע זה? פעולה זו בלתי הפיכה.
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                      ביטול
                    </Button>
                    <Button variant="destructive" onClick={handleDeleteEvent}>
                      מחק
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {showOnboarding && eventId && (
              <EventOnboardingGuide
                eventId={eventId}
                onClose={() => setShowOnboarding(false)}
              />
            )}

            {/* Broadcast Message Dialog */}
            <Dialog open={showBroadcastDialog} onOpenChange={setShowBroadcastDialog}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-orange-500" />
                    שלח הודעה לכל המשתתפים
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                    <p className="text-blue-800">
                      📢 ההודעה תישלח כהתראה לכל{' '}
                      {members?.filter((m) => String(m.id) !== String(user?.id)).length || 0} המשתתפים
                      באירוע
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="broadcast-title"
                      className="text-sm font-medium text-gray-700"
                    >
                      כותרת ההודעה
                    </label>
                    <Input
                      id="broadcast-title"
                      value={broadcastMessage.title}
                      onChange={(e) =>
                        setBroadcastMessage({
                          ...broadcastMessage,
                          title: e.target.value,
                        })
                      }
                      placeholder="לדוגמה: שינוי בתאריך האירוע"
                      maxLength={50}
                    />
                    <p className="text-xs text-gray-500">
                      {broadcastMessage.title.length}/50
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="broadcast-message"
                      className="text-sm font-medium text-gray-700"
                    >
                      תוכן ההודעה
                    </label>
                    <textarea
                      id="broadcast-message"
                      value={broadcastMessage.message}
                      onChange={(e) =>
                        setBroadcastMessage({
                          ...broadcastMessage,
                          message: e.target.value,
                        })
                      }
                      placeholder="כתוב כאן את ההודעה המלאה..."
                      className="w-full min-h-[120px] p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      maxLength={300}
                    />
                    <p className="text-xs text-gray-500">
                      {broadcastMessage.message.length}/300
                    </p>
                  </div>

                  <div className="flex gap-2 justify-end pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowBroadcastDialog(false);
                        setBroadcastMessage({ title: '', message: '' });
                      }}
                      disabled={isSendingBroadcast}
                    >
                      ביטול
                    </Button>
                    <Button
                      onClick={handleSendBroadcast}
                      disabled={
                        isSendingBroadcast ||
                        !broadcastMessage.title.trim() ||
                        !broadcastMessage.message.trim()
                      }
                      className="bg-orange-500 hover:bg-orange-600"
                    >
                      {isSendingBroadcast ? (
                        <>
                          <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                          שולח...
                        </>
                      ) : (
                        <>
                          <Bell className="w-4 h-4 ml-2" />
                          שלח לכולם
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Add to Calendar Dialog */}
            <AddToCalendarDialog
              isOpen={isCalendarDialogOpen}
              onOpenChange={setIsCalendarDialogOpen}
              event={event}
              hasActiveDatePoll={!!activeDatePoll}
              onNavigateToPoll={activeDatePoll ? () => {
                setIsCalendarDialogOpen(false);
                handleNavigateToPoll(activeDatePoll.id);
              } : undefined}
            />

            {/* Status Change Dialog */}
            <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold">שינוי סטטוס האירוע</DialogTitle>
                </DialogHeader>

                <div className="space-y-3 py-4">
                  <p className="text-sm text-gray-600 mb-4">
                    בחר את הסטטוס החדש לאירוע:
                  </p>

                  <button
                    onClick={() => handleStatusChange('active')}
                    disabled={isUpdatingStatus || event.status === 'active'}
                    className={`w-full p-4 border-2 rounded-lg text-right transition-all ${
                      event.status === 'active'
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-green-500 hover:bg-green-50'
                    } ${isUpdatingStatus ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-green-700">פעיל</p>
                        <p className="text-xs text-gray-600">האירוע פעיל ומתוכנן</p>
                      </div>
                      {event.status === 'active' && (
                        <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                          <CheckSquare className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                  </button>

                  <button
                    onClick={() => handleStatusChange('draft')}
                    disabled={isUpdatingStatus || event.status === 'draft'}
                    className={`w-full p-4 border-2 rounded-lg text-right transition-all ${
                      event.status === 'draft'
                        ? 'border-gray-500 bg-gray-50'
                        : 'border-gray-200 hover:border-gray-500 hover:bg-gray-50'
                    } ${isUpdatingStatus ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-700">טיוטה</p>
                        <p className="text-xs text-gray-600">האירוע בתכנון</p>
                      </div>
                      {event.status === 'draft' && (
                        <div className="w-5 h-5 bg-gray-500 rounded-full flex items-center justify-center">
                          <CheckSquare className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                  </button>

                  <button
                    onClick={() => handleStatusChange('completed')}
                    disabled={isUpdatingStatus || event.status === 'completed'}
                    className={`w-full p-4 border-2 rounded-lg text-right transition-all ${
                      event.status === 'completed'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-500 hover:bg-blue-50'
                    } ${isUpdatingStatus ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-blue-700">הסתיים</p>
                        <p className="text-xs text-gray-600">האירוע הסתיים</p>
                      </div>
                      {event.status === 'completed' && (
                        <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                          <CheckSquare className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                  </button>

                  <button
                    onClick={() => handleStatusChange('cancelled')}
                    disabled={isUpdatingStatus || event.status === 'cancelled'}
                    className={`w-full p-4 border-2 rounded-lg text-right transition-all ${
                      event.status === 'cancelled'
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-200 hover:border-red-500 hover:bg-red-50'
                    } ${isUpdatingStatus ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-red-700">בוטל</p>
                        <p className="text-xs text-gray-600">האירוע בוטל</p>
                      </div>
                      {event.status === 'cancelled' && (
                        <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                          <CheckSquare className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                  </button>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsStatusDialogOpen(false)}
                    disabled={isUpdatingStatus}
                  >
                    ביטול
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
    </div>
  );
}
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, BarChart3, Loader2 } from 'lucide-react';
import CreatePollDialog from './CreatePollDialog';
import PollVoteCard from './PollVoteCard';
import { getPolls, finalizePoll } from '@/components/instabackService';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatPollOptionLines } from '@/components/utils/dateHelpers';

export default function PollsTab({ eventId, initialPolls, members, isManager, onPollUpdate, currentUser, highlightPollId, isReadOnly, onEventPatched, onRequestEventRefresh, onPatchPollLocally }) {
  const [isCreatePollOpen, setIsCreatePollOpen] = useState(false);
  const [polls, setPolls] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [banner, setBanner] = useState(null);
  const highlightRef = useRef(null);

  const [isConfirmFinalizePollOpen, setIsConfirmFinalizePollOpen] = useState(false);
  const [pollToFinalizeData, setPollToFinalizeData] = useState(null);

  // ✅ סינון ראשוני של הסקרים שהתקבלו מהורה
  useEffect(() => {
    const filtered = (initialPolls || []).filter(p => {
      const pollEventId = p.eventId || p.event_id || p.EventId;
      return String(pollEventId) === String(eventId);
    });
    setPolls(filtered);
  }, [initialPolls, eventId]);

  // ✅ ריענון הסקרים מהשרת, כולל סינון לפי האירוע
  const refreshPolls = async () => {
    console.log('[PollsTab] Refreshing polls for event:', eventId);
    setIsLoading(true);
    try {
      const freshPolls = await getPolls(eventId);
      console.log('[PollsTab] Received polls from server:', freshPolls);
      
      const filtered = (freshPolls || []).filter(p => {
        const pollEventId = p.eventId || p.event_id || p.EventId;
        const matches = String(pollEventId) === String(eventId);
        console.log('[PollsTab] Poll:', p.id, 'EventId:', pollEventId, 'Matches:', matches);
        return matches;
      });
      
      console.log('[PollsTab] Filtered polls:', filtered);
      setPolls(filtered);
    } catch (error) {
      console.error('[PollsTab] Failed to refresh polls:', error);
      toast.error("שגיאה ברענון הסקרים", { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  // Handler to open the confirmation dialog before finalizing
  const handleOpenFinalizeConfirmation = (poll, optionId) => {
      const selectedOption = poll.options?.find(opt => String(opt.id) === String(optionId));
      let optionText = 'אפשרות לא ידועה';

      if (selectedOption) {
        if ((poll.type || '').toLowerCase() === 'date') {
          const raw = selectedOption.date || selectedOption.start_date || selectedOption.startDate;
          const { dateLine, timeLine } = formatPollOptionLines(raw);
          optionText = dateLine && timeLine ? `${dateLine} · ${timeLine}` : (selectedOption.text || 'תאריך');
        } else {
          optionText = selectedOption.text || selectedOption.location || 'אפשרות';
        }
      }

      setPollToFinalizeData({ poll, optionId, optionText });
      setIsConfirmFinalizePollOpen(true);
  };

  const handleFinalizePoll = async () => {
    if (!pollToFinalizeData || !pollToFinalizeData.poll || !pollToFinalizeData.optionId) {
        toast.error("שגיאה", { description: "נתוני סקר חסרים לסגירה." });
        setIsConfirmFinalizePollOpen(false);
        return;
    }

    const { poll, optionId } = pollToFinalizeData;

    // בדיקה קריטית לפני שליחת הבקשה
    if (!currentUser?.id) {
        toast.error('שגיאה באימות', {
            description: 'אנא התחבר מחדש ונסה שוב',
            duration: 3000,
        });
        setIsConfirmFinalizePollOpen(false);
        return;
    }

    setIsFinalizing(true);
    try {
      const res = await finalizePoll({ poll, optionId, currentUserId: currentUser.id });

      // Apply event patch immediately (updates header date/location without full reload)
      if (res?.eventPatch && typeof onEventPatched === 'function') {
        onEventPatched(res.eventPatch);
      }

      // Optimistically update this poll locally in tab
      if (res?.localPollPatch) {
        setPolls(prev => (prev || []).map(p => {
          if (String(p.id) !== String(res.localPollPatch.id)) return p;
          return {
            ...p,
            isActive: false,
            is_active: false,
            final_result: res.localPollPatch.final_result,
            finalResult: res.localPollPatch.finalResult
          };
        }));
        // Also patch parent state immediately to affect header "ראה סקר"
        if (typeof onPatchPollLocally === 'function') {
          onPatchPollLocally(res.localPollPatch);
        }
      }

      // Show success message - ONLY ONE MESSAGE HERE
      const pollTypeHeb = poll.type === 'date' ? 'תאריך' : poll.type === 'location' ? 'מיקום' : 'סקר';
      toast.success('הסקר נסגר בהצלחה! ✨', {
        description: `${pollTypeHeb} האירוע עודכן והוגדר כסופי`,
        duration: 4000,
      });

      // Refresh from server to ensure header shows updated values
      setTimeout(async () => {
        if (typeof onPollUpdate === 'function') {
          await onPollUpdate(); // refresh parent polls from server
        }
        if (typeof onRequestEventRefresh === 'function') {
          await onRequestEventRefresh(); // refresh event flags/date/location from server
        }
      }, 500); // Small delay to ensure server has processed the changes

    } catch (error) {
      console.error('Failed to finalize poll:', error);
      toast.error('שגיאה בסגירת הסקר', {
        description: error?.message || 'אנא נסה שוב או צור קשר עם התמיכה',
        duration: 5000,
      });
    } finally {
      setIsFinalizing(false);
      setIsConfirmFinalizePollOpen(false);
      setPollToFinalizeData(null);
    }
  };

  // Smooth scroll to highlighted poll
  useEffect(() => {
    if (highlightPollId && polls.length > 0) {
      const el = document.getElementById(`poll-${highlightPollId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-orange-400', 'rounded-lg', 'transition-all', 'duration-500');
        setTimeout(() => {
          el.classList.remove('ring-2', 'ring-orange-400');
        }, 2500);
      }
    }
  }, [highlightPollId, polls]);

  // NEW: after creating a poll, refresh locally AND notify parent so event header shows updated flags
  const handlePollCreated = async () => {
    console.log('[PollsTab] handlePollCreated called');
    
    // First close any open dialogs
    setIsCreatePollOpen(false);
    
    // Wait a bit for server to process
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Then refresh polls
    await refreshPolls();
    
    if (typeof onPollUpdate === 'function') {
      console.log('[PollsTab] Calling onPollUpdate');
      await onPollUpdate(); // updates EventDetail.eventData.polls
    }
    
    // Also refresh event header fields in case poll flags need updating
    if (typeof onRequestEventRefresh === 'function') {
      console.log('[PollsTab] Calling onRequestEventRefresh');
      await onRequestEventRefresh();
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold dark:text-white">הצבעות וסקרים</h2>
        {isManager && !isReadOnly && (
          <Button onClick={() => setIsCreatePollOpen(true)} data-coachmark="add-poll">
            <Plus className="w-4 h-4 ml-2" />
            צור סקר חדש
          </Button>
        )}
      </div>

      {banner && (
        <div className={`w-full rounded-lg border px-4 py-3 text-sm ${banner.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'}`}>
          {banner.text}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>
      ) : polls.length === 0 ? (
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="py-12 text-center">
            <BarChart3 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">עדיין אין סקרים באירוע זה</p>
            {isManager && !isReadOnly && (
              <Button variant="outline" onClick={() => setIsCreatePollOpen(true)}>
                צור את הסקר הראשון
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {polls.map((poll) => (
            <div key={poll.id} id={`poll-${poll.id}`} ref={poll.id === highlightPollId ? highlightRef : null}>
              <PollVoteCard
                poll={poll}
                members={members}
                isManager={isManager && !isReadOnly}
                onPollUpdate={refreshPolls} // Voting triggers a local refresh
                onFinalizePoll={handleOpenFinalizeConfirmation} // Open confirmation dialog
                isFinalizing={isFinalizing}
                isReadOnly={isReadOnly}
              />
            </div>
          ))}
        </div>
      )}

      {isManager && (
        <CreatePollDialog
          isOpen={isCreatePollOpen}
          onOpenChange={setIsCreatePollOpen}
          eventId={eventId}
          onPollCreated={handlePollCreated} // CHANGED: notify parent after creation
          currentUserId={currentUser?.id}
        />
      )}

      {/* Finalize Poll Confirmation Dialog */}
      <Dialog open={isConfirmFinalizePollOpen} onOpenChange={setIsConfirmFinalizePollOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>האם אתה בטוח שברצונך לסגור את הסקר?</DialogTitle>
            <DialogDescription>
              סגירת הסקר תגדיר את התוצאה שנבחרה כסופית עבור האירוע. פעולה זו הינה בלתי הפיכה.
              <br/><br/>
              <strong>האפשרות הנבחרת:</strong> {pollToFinalizeData?.optionText}
              <br/><br/>
              האם אתה בטוח שברצונך להמשיך?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmFinalizePollOpen(false)} disabled={isFinalizing}>
              ביטול
            </Button>
            <Button onClick={handleFinalizePoll} disabled={isFinalizing || !pollToFinalizeData}>
              {isFinalizing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isFinalizing ? 'סוגר סקר...' : 'כן, סגור את הסקר'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
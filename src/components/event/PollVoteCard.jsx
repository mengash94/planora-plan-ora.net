
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, 
  MapPin, 
  ThumbsUp, // Still used for voter list
  ThumbsDown, // Still used for voter list
  Award, 
  Calendar, 
  Loader2, 
  Trash2, 
  Minus, // Still used for voter list
  Users,
  Check, // New icon for 'yes' vote button
  X, // New icon for 'no' vote button
  HelpCircle // New icon for 'maybe' vote button
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { motion } from 'framer-motion';

import { voteInPoll as voteInPollService, deletePoll as deletePollService } from '@/components/instabackService';
import { useAuth } from '@/components/AuthProvider';
import { formatIsraelDate, formatIsraelTime } from '@/components/utils/dateHelpers';

// Helper function to format date/time lines for poll options
const formatPollOptionLines = (dateString) => {
  if (!dateString) return { dateLine: '', timeLine: '' };
  const date = new Date(dateString);
  return {
    dateLine: formatIsraelDate(date),
    timeLine: formatIsraelTime(date),
  };
};

export default function PollVoteCard({ poll, members = [], onPollUpdate, isManager, onFinalizePoll, isFinalizing, isReadOnly }) {
  const { user } = useAuth();
  const [currentVotingOptionId, setCurrentVotingOptionId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Helper function to normalize poll votes into a consistent array format
  const normalizeVotes = (votes) => {
    if (!votes) return [];
    if (Array.isArray(votes)) return votes;
    
    // If votes is an object like { optionId: { userId: voteType } }
    if (typeof votes === 'object') {
      const result = [];
      Object.entries(votes).forEach(([optionId, userVotes]) => {
        if (userVotes && typeof userVotes === 'object') {
          Object.entries(userVotes).forEach(([userId, voteType]) => {
            result.push({
              option_id: optionId,
              user_id: userId,
              vote_type: voteType
            });
          });
        }
      });
      return result;
    }
    
    return [];
  };

  const votesArray = useMemo(() => normalizeVotes(poll.votes), [poll.votes]);

  // Create a map for quick member lookup
  const membersMap = useMemo(() => new Map(members.map(m => [String(m.id), m])), [members]);

  // Helper to get vote counts for a specific option
  const getVoteCounts = (optionId) => {
    const optionVotes = votesArray.filter(v => String(v.option_id) === String(optionId));
    return {
      yes: optionVotes.filter(v => v.vote_type === 'yes').length,
      maybe: optionVotes.filter(v => v.vote_type === 'maybe').length,
      no: optionVotes.filter(v => v.vote_type === 'no').length
    };
  };

  // Helper to get the current user's vote for a specific option
  const getUserVote = (optionId) => {
    if (!user?.id) return null;
    const vote = votesArray.find(v => 
      String(v.option_id) === String(optionId) && 
      String(v.user_id) === String(user.id)
    );
    return vote?.vote_type || null;
  };

  const handleVote = async (optionId, voteType) => {
    if (isReadOnly) {
      toast.error('אין לך הרשאה לבצע פעולה זו.');
      return;
    }
    if (!user?.id) {
        toast.error('יש להתחבר כדי להצביע.');
        return;
    }

    setCurrentVotingOptionId(optionId);

    try {
      await voteInPollService({
        poll,
        optionId,
        voteType,
        currentUserId: user.id
      });
      
      if (onPollUpdate) {
        await onPollUpdate();
      }
      toast.success('ההצבעה נשמרה בהצלחה!');
    } catch (error) {
      console.error('Failed to vote:', error);
      toast.error('שגיאה בהצבעה', { description: error?.message || "" });
    } finally {
      setCurrentVotingOptionId(null);
    }
  };

  const handleFinalize = (optionId) => {
    if (isReadOnly) {
      toast.error('אין לך הרשאה לבצע פעולה זו.');
      return;
    }
    if (onFinalizePoll) {
      onFinalizePoll(poll, optionId);
    }
  };

  const getOptionWinner = () => {
    if (!poll.options || poll.options.length === 0) return null;
    
    let maxYesVotes = -1;
    let winningOption = null;

    poll.options.forEach(option => {
      const counts = getVoteCounts(option.id);
      if (counts.yes > maxYesVotes) {
        maxYesVotes = counts.yes;
        winningOption = option;
      }
    });

    return winningOption;
  };

  const winningOption = getOptionWinner();
  const isClosed = poll.isActive === false || poll.is_active === false;

  // Get final result info if poll is closed
  const finalResult = poll.final_result || poll.finalResult;
  const decidedOption = finalResult?.option_id 
    ? poll.options?.find(o => String(o.id) === String(finalResult.option_id))
    : null;

  const formatError = (e) => {
    if (!e) return 'Unknown error';
    if (typeof e === 'string') return e;
    const nested =
      e?.response?.data?.error ||
      e?.response?.data?.message ||
      e?.response?.data?.details ||
      e?.error ||
      e?.details;
    const msg = e?.message && e.message !== '[object Object]' ? e.message : null;
    return (typeof nested === 'string' && nested) || msg || JSON.stringify(nested || e);
  };

  const handleDeletePoll = async () => {
    setIsDeleting(true);
    try {
      await deletePollService(poll.id);
      toast.success("הסקר נמחק בהצלחה");
      onPollUpdate && onPollUpdate();
    } catch (e) {
      toast.error("מחיקת הסקר נכשלה", { description: formatError(e) });
    } finally {
      setIsDeleting(false);
    }
  };

  const PollIcon = poll.type === 'date' ? Calendar : MapPin;
  const isActive = poll.isActive === true || poll.is_active === true;

  return (
    <>
      <Card className="bg-white rounded-xl border-0 shadow-md overflow-hidden">
        <CardHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <PollIcon className="w-6 h-6 text-gray-500" />
              <span className="block truncate">{poll.title}</span>
            </CardTitle>
            <Badge variant="outline">
              {poll.type === 'location' ? 'סקר מיקום' : poll.type === 'date' ? 'סקר תאריך' : 'סקר'}
            </Badge>
          </div>
          {isClosed && (
            <Badge className="mt-2 bg-gray-200 text-gray-800 border border-gray-300">
              <CheckCircle className="w-3 h-3 mr-1" /> הסקר סגור
            </Badge>
          )}
        </CardHeader>

        <CardContent className="p-3 sm:p-4 bg-gray-50/50">
          <div className="space-y-3">
            {(poll.options || []).map((option) => {
              const optionId = String(option.id);
              const userVote = getUserVote(optionId); // 'yes', 'maybe', 'no', or null
              const counts = getVoteCounts(optionId);
              const optionTotalVotes = counts.yes + counts.maybe + counts.no; // Total votes for THIS option
              const allPollTotalVotes = votesArray.length; // Total votes across ALL options in the poll

              const percentage = allPollTotalVotes > 0 ? Math.round((optionTotalVotes / allPollTotalVotes) * 100) : 0;
              const hasUserVotedOnThisOption = userVote !== null; // User has voted 'yes', 'maybe', or 'no' on this option

              let primaryTitle = '';
              let currentOptionIconComponent = null; // Changed from currentOptionIcon to avoid name conflict with PollIcon
              let additionalDetailsJsx = null;

              if (poll.type === 'date') {
                const rawStartDate = option.date || option.start_date || option.startDate;
                const rawEndDate = option.end_date || option.endDate;
                
                const { dateLine: startDateLine, timeLine: startTimeLine } = formatPollOptionLines(rawStartDate);

                let showEndDate = false;
                let endDateString = ''; // This will hold the combined end time and date string
                
                if (rawEndDate) {
                    const startDateObj = rawStartDate ? new Date(rawStartDate) : null;
                    const endDateObj = new Date(rawEndDate);
                    
                    // Determine if the end date is distinct from the start date/time
                    // Check both date and time for distinction
                    const areDatesDifferent = !startDateObj || 
                                              startDateObj.toISOString() !== endDateObj.toISOString();

                    if (areDatesDifferent) {
                        const endFormatted = formatPollOptionLines(rawEndDate);
                        endDateString = `${endFormatted.timeLine ? `${endFormatted.timeLine} ` : ''}${endFormatted.dateLine}`;
                        showEndDate = !!endDateString.trim(); // Show if the string is not empty after trim
                    }
                }
                
                currentOptionIconComponent = <Calendar className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />;
                primaryTitle = `${startTimeLine ? `${startTimeLine} ` : ''}${startDateLine}`; // Combine time and date on one line
                
                additionalDetailsJsx = (
                    <>
                        {showEndDate && (
                            <div className="mt-1 flex items-center gap-1 text-sm text-gray-600">
                                <span className="text-gray-500">עד:</span>
                                <span className="font-semibold text-gray-900">{endDateString}</span>
                            </div>
                        )}
                    </>
                );
              } else if (poll.type === 'location') {
                currentOptionIconComponent = <MapPin className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />;
                primaryTitle = option.location;
                additionalDetailsJsx = (
                    <>
                        {option.text && option.text !== option.location && (
                          <div className="text-sm text-gray-600">{option.text}</div>
                        )}
                        {option.description && (
                          <p className="text-sm text-gray-600">{option.description}</p>
                        )}
                    </>
                );
              } else { // Generic poll type
                primaryTitle = option.text;
                additionalDetailsJsx = (
                    <>
                        {option.description && (
                          <div className="text-sm text-gray-600">{option.description}</div>
                        )}
                    </>
                );
              }

              const isOptionDecided = decidedOption && String(decidedOption.id) === optionId;
              const showWinningBadge = isClosed && !decidedOption && winningOption && String(winningOption.id) === optionId && counts.yes > 0;

              return (
                <motion.div
                  key={optionId}
                  className="relative"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                >
                  {/* Progress Bar Background */}
                  <div 
                    className="absolute inset-0 bg-orange-100 rounded-lg transition-all duration-300" 
                    style={{ width: `${percentage}%` }} 
                  />

                  {/* Option Content */}
                  <div className={`relative p-4 border rounded-lg transition-colors 
                    ${isOptionDecided ? 'border-green-600 bg-green-50' : 'border-gray-200 hover:border-blue-300'}
                  `}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      {/* Left Side - Option Details & Voters */}
                      <div className="flex-1 min-w-0">
                        {/* Main Title Line */}
                        <div className="flex items-center gap-2 mb-1">
                            {currentOptionIconComponent && <span className="flex-shrink-0">{currentOptionIconComponent}</span>}
                            <h4 className="font-medium text-gray-900 block truncate">
                                {primaryTitle}
                            </h4>
                            {isOptionDecided && (
                                <Badge className="bg-green-500 text-white"><Award className="w-3 h-3 mr-1" /> נבחר</Badge>
                            )}
                            {showWinningBadge && (
                                <Badge variant="outline" className="bg-yellow-200 text-yellow-800"><Award className="w-3 h-3 mr-1" /> מוביל</Badge>
                            )}
                        </div>
                        {additionalDetailsJsx} {/* Render additional details below the title */}
                        
                        {/* Vote Count and HasVoted Badge */}
                        <div className="flex items-center gap-2 mt-2">
                          <Users className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {optionTotalVotes} {optionTotalVotes === 1 ? 'הצבעה' : 'הצבעות'} ({percentage}%)
                          </span>
                          {hasUserVotedOnThisOption && (
                            <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                              הצבעת
                            </Badge>
                          )}
                        </div>

                        {/* Voters List (flat list with avatars) */}
                        {!isClosed && optionTotalVotes > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {votesArray
                              .filter(v => String(v.option_id) === String(option.id) && membersMap.has(String(v.user_id)))
                              .map((vote) => {
                                const voter = membersMap.get(String(vote.user_id));
                                const voterName = voter?.name || voter?.full_name || voter?.display_name || voter?.first_name || voter?.email || 'משתמש';
                                return (
                                  <div
                                    key={`${vote.user_id}-${vote.vote_type}`} 
                                    className="flex items-center gap-1 bg-gray-100 rounded-full px-2 py-1"
                                    title={`${voterName} הצביע ${vote.vote_type === 'yes' ? 'כן' : vote.vote_type === 'maybe' ? 'אולי' : 'לא'}`}
                                  >
                                    <img
                                      src={voter?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(voterName.charAt(0))}&background=007bff&color=fff`}
                                      alt={voterName}
                                      className="w-5 h-5 rounded-full"
                                    />
                                    <span className="text-xs text-gray-700">{voterName}</span>
                                    {vote.vote_type === 'yes' && <ThumbsUp className="w-3 h-3 text-green-600 ml-0.5" />}
                                    {vote.vote_type === 'maybe' && <Minus className="w-3 h-3 text-yellow-600 ml-0.5" />}
                                    {vote.vote_type === 'no' && <ThumbsDown className="w-3 h-3 text-red-600 ml-0.5" />}
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>

                      {/* Right Side - Action Buttons */}
                      <div className="flex flex-col gap-2 flex-shrink-0 w-full sm:w-auto sm:ml-auto">
                        {!isReadOnly && isActive && user && (
                          <div className="flex flex-row items-center justify-end gap-2 w-full"> 
                            {/* Vote Yes Button */}
                            <Button
                              size="sm"
                              variant={userVote === 'yes' ? 'default' : 'outline'}
                              className={`${userVote === 'yes' ? 'bg-green-600 hover:bg-green-700 text-white' : 'text-green-600 border-green-300 hover:bg-green-50'} flex-grow`}
                              onClick={() => handleVote(optionId, 'yes')}
                              disabled={currentVotingOptionId === optionId || isClosed || isFinalizing}
                              title="הצבע בעד"
                            >
                              {currentVotingOptionId === optionId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                              <span className="hidden sm:inline ml-1">כן ({counts.yes})</span>
                            </Button>

                            {/* Vote Maybe Button */}
                            <Button
                              size="sm"
                              variant={userVote === 'maybe' ? 'default' : 'outline'}
                              className={`${userVote === 'maybe' ? 'bg-yellow-600 hover:bg-yellow-700 text-white' : 'text-yellow-600 border-yellow-300 hover:bg-yellow-50'} flex-grow`}
                              onClick={() => handleVote(optionId, 'maybe')}
                              disabled={currentVotingOptionId === optionId || isClosed || isFinalizing}
                              title="הצבע אולי"
                            >
                              {currentVotingOptionId === optionId ? <Loader2 className="w-4 h-4 animate-spin" /> : <HelpCircle className="w-4 h-4" />}
                              <span className="hidden sm:inline ml-1">אולי ({counts.maybe})</span>
                            </Button>

                            {/* Vote No Button */}
                            <Button
                              size="sm"
                              variant={userVote === 'no' ? 'default' : 'outline'}
                              className={`${userVote === 'no' ? 'bg-red-600 hover:bg-red-700 text-white' : 'text-red-600 border-red-300 hover:bg-red-50'} flex-grow`}
                              onClick={() => handleVote(optionId, 'no')}
                              disabled={currentVotingOptionId === optionId || isClosed || isFinalizing}
                              title="הצבע נגד"
                            >
                              {currentVotingOptionId === optionId ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                              <span className="hidden sm:inline ml-1">לא ({counts.no})</span>
                            </Button>
                          </div>
                        )}

                        {/* Finalize Button (Manager Only) - Conditional logic updated to include !finalResult */}
                        {isManager && isActive && !isClosed && !finalResult && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="bg-blue-500 text-white hover:bg-blue-600 w-full sm:w-auto"
                            onClick={() => handleFinalize(optionId)}
                            disabled={isFinalizing || currentVotingOptionId !== null || isReadOnly}
                            title="קבע כבחירה סופית"
                          >
                            {isFinalizing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Award className="w-4 h-4 mr-1" />}
                            <span className="hidden sm:inline">קבע כבחירה</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {isManager && (
        <div className="mt-4 flex justify-end">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isDeleting || isReadOnly}
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                מחיקת סקר
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>למחוק את הסקר הזה?</AlertDialogTitle>
                <AlertDialogDescription>
                  פעולה זו תמחק לצמיתות את הסקר וכל ההצבעות שלו. לא ניתן לבטל פעולה זו.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>ביטול</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeletePoll}
                  disabled={isDeleting}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  מחיקה סופית
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </>
  );
}

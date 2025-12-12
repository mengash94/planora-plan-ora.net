
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ThumbsUp, ThumbsDown, HelpCircle } from 'lucide-react';

export default function PollDetailsDialog({ isOpen, onOpenChange, poll, members }) {
  if (!poll) return null;

  // Helper function to get user's display name, preserving existing complex logic
  const getUserDisplayName = (member, userIdFallback) => {
    if (member) {
      // Use consistent naming logic
      return ((member.firstName || member.first_name)
        ? `${member.firstName || member.first_name} ${member.lastName || member.last_name || ''}`.trim()
        : (member.name || member.displayName || member.display_name || member.fullName || member.full_name || member.username || member.email || `משתתף ${String(userIdFallback).slice(0,6)}`));
    }
    // Fallback if member not found in the provided members array
    return `משתתף ${String(userIdFallback).slice(0,6)}`;
  };

  // Normalize votes to array format, handling both array and object structures
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

  const votesArray = normalizeVotes(poll.votes);

  // Function to get vote counts for a specific option
  const getVoteCounts = (optionId) => {
    const optionVotes = votesArray.filter(v => String(v.option_id) === String(optionId));
    return {
      yes: optionVotes.filter(v => v.vote_type === 'yes').length,
      maybe: optionVotes.filter(v => v.vote_type === 'maybe').length,
      no: optionVotes.filter(v => v.vote_type === 'no').length
    };
  };

  // Function to get details (id and name) of voters for a specific option and vote type
  const getVoterDetails = (optionId, voteType) => {
    const votes = votesArray.filter(v => 
      String(v.option_id) === String(optionId) && 
      v.vote_type === voteType
    );
    
    return votes.map(v => {
      const member = members.find(m => String(m.id) === String(v.user_id));
      return {
        id: v.user_id,
        name: getUserDisplayName(member, v.user_id)
      };
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>פירוט הצבעות: {poll.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
          {(poll.options || []).map(option => {
            const voteCounts = getVoteCounts(option.id);
            const yesVoters = getVoterDetails(option.id, 'yes');
            const noVoters = getVoterDetails(option.id, 'no');
            const maybeVoters = getVoterDetails(option.id, 'maybe');

            return (
              <div key={option.id} className="p-3 bg-gray-50 rounded-lg">
                <h4 className="font-bold mb-3">{option.text || (option.date && new Date(option.date).toLocaleDateString('he-IL'))}</h4>
                
                <div className="space-y-2">
                  <div className="flex items-start">
                    <ThumbsUp className="w-4 h-4 text-green-500 mt-1 ml-2" />
                    <div className="flex-1">
                      <p className="font-semibold text-sm">בעד ({voteCounts.yes})</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {yesVoters.map(u => (
                          <span key={u.id} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                            {u.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <ThumbsDown className="w-4 h-4 text-red-500 mt-1 ml-2" />
                    <div className="flex-1">
                      <p className="font-semibold text-sm">נגד ({voteCounts.no})</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {noVoters.map(u => (
                          <span key={u.id} className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                            {u.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <HelpCircle className="w-4 h-4 text-yellow-500 mt-1 ml-2" />
                    <div className="flex-1">
                      <p className="font-semibold text-sm">אולי ({voteCounts.maybe})</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {maybeVoters.map(u => (
                          <span key={u.id} className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                            {u.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

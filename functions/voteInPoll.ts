import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

function isRateLimitError(err) {
  const msg = ((err && err.message) || (err && err.toString && err.toString()) || '').toLowerCase();
  return msg.includes('rate') || msg.includes('429') || msg.includes('too many');
}

function rateLimitResponse() {
  return Response.json(
    {
      error: 'Rate limit exceeded',
      message: 'Server is busy. Please try again in a few minutes.',
      fallback_available: true,
      timestamp: Date.now()
    },
    {
      status: 429,
      headers: {
        'Retry-After': '600',
        'Cache-Control': 'no-store'
      }
    }
  );
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Auth
    let user = null;
    try {
      user = await base44.auth.me();
      if (!user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } catch (e) {
      if (isRateLimitError(e)) return rateLimitResponse();
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (req.method !== 'POST') {
      return Response.json({ error: 'Method Not Allowed' }, { status: 405 });
    }

    let payload = {};
    try {
      payload = await req.json();
    } catch {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const pollId = payload && payload.pollId;
    const optionId = payload && payload.optionId;
    const voteType = payload && payload.voteType;

    if (!pollId || !optionId || !voteType) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const vt = String(voteType);
    if (!['yes', 'no', 'maybe'].includes(vt)) {
      return Response.json({ error: 'Invalid voteType' }, { status: 400 });
    }

    // Load poll
    let poll = null;
    try {
      poll = await base44.asServiceRole.entities.Poll.get(pollId);
    } catch (e) {
      if (isRateLimitError(e)) return rateLimitResponse();
      return Response.json({ error: 'Poll not found' }, { status: 404 });
    }
    if (!poll) {
      return Response.json({ error: 'Poll not found' }, { status: 404 });
    }

    // Update votes (toggle logic)
    const existingVotes = Array.isArray(poll.votes) ? poll.votes : [];

    const optionVotesByUser = existingVotes.filter(
      (v) => v && v.user_id === user.id && v.option_id === optionId
    );

    const isSameVote = optionVotesByUser.some((v) => v && v.vote_type === vt);

    // Remove all user's votes for this option
    let updatedVotes = existingVotes.filter(
      (v) => !(v && v.user_id === user.id && v.option_id === optionId)
    );

    if (!isSameVote) {
      // If multiple votes not allowed, remove all votes by user across the poll
      if (!poll.allow_multiple) {
        updatedVotes = updatedVotes.filter((v) => v && v.user_id !== user.id);
      }

      updatedVotes.push({
        user_id: user.id,
        user_name: user.name || user.full_name || 'משתמש',
        option_id: optionId,
        vote_type: vt,
        timestamp: new Date().toISOString()
      });
    }

    // Persist
    try {
      await base44.asServiceRole.entities.Poll.update(pollId, { votes: updatedVotes });
    } catch (e) {
      if (isRateLimitError(e)) return rateLimitResponse();
      return Response.json({ error: 'Failed to update poll' }, { status: 500 });
    }

    return Response.json(
      {
        success: true,
        pollId,
        optionId,
        userVote: isSameVote ? null : vt
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache'
        }
      }
    );
  } catch (error) {
    if (isRateLimitError(error)) return rateLimitResponse();
    return Response.json({ error: 'Internal server error', details: (error && error.message) || String(error) }, { status: 500 });
  }
});
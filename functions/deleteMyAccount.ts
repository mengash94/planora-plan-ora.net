import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await base44.asServiceRole.entities.User.delete(user.id);

    return Response.json({ success: true, message: "Account deleted successfully." });
  } catch (error) {
    console.error('deleteMyAccount function error:', error);
    return Response.json({ 
      error: 'Internal server error', 
      details: error?.message || 'Unknown error' 
    }, { status: 500 });
  }
});
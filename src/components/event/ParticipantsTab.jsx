import React, { useMemo, useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Trash2, UserCog } from 'lucide-react';
import { toast } from 'sonner';
import { getUserById, removeEventMember, setEventMemberRole } from '@/components/instabackService';

export default function ParticipantsTab({ members = [], memberships = [], eventId, canManage = false, isReadOnly = false }) {
  // local enrichment cache for users missing from members
  const [extraUsers, setExtraUsers] = useState({});
  const [loadingIds, setLoadingIds] = useState({});
  // local UI state for optimistic updates
  const [removedUserIds, setRemovedUserIds] = useState([]); // array for React state; use Set in memo
  const [roleOverrides, setRoleOverrides] = useState({}); // { [userId]: 'member'|'manager'|'organizer'|'owner' }

  const removedSet = useMemo(() => new Set(removedUserIds), [removedUserIds]);

  // Build role map from memberships
  const roleMap = useMemo(() => {
    const map = new Map();
    (memberships || []).forEach(m => {
      const uid = m?.userId || m?.UserId || m?.user_id;
      const role = m?.role || m?.Role || 'member';
      if (uid) map.set(String(uid), role);
    });
    return map;
  }, [memberships]);

  // Quick membership map to get membershipId by userId
  const membershipByUserId = useMemo(() => {
    const map = new Map();
    (memberships || []).forEach(m => {
      const uid = m?.userId || m?.UserId || m?.user_id;
      if (uid) map.set(String(uid), m);
    });
    return map;
  }, [memberships]);

  // byId for provided members
  const byId = useMemo(() => {
    const map = new Map();
    (members || []).forEach(u => {
      if (!u) return;
      const id = String(u.id || u.Id || '');
      if (id) map.set(id, u);
    });
    return map;
  }, [members]);

  // fetch details for any membership users missing from "members"
  useEffect(() => {
    const ids = Array.from(new Set((memberships || []).map(m => String(m.userId || m.UserId || m.user_id)).filter(Boolean)));
    const missing = ids.filter(id => !byId.has(id) && !extraUsers[id] && !loadingIds[id]);

    if (missing.length === 0) return;

    const toFetch = missing.slice(0, 30); // safety cap to prevent too many concurrent fetches
    toFetch.forEach(id => setLoadingIds(prev => ({ ...prev, [id]: true })));

    Promise.all(toFetch.map(async (id) => {
      try {
        const u = await getUserById(id).catch(() => null);
        if (u) {
          setExtraUsers(prev => ({ ...prev, [id]: u }));
        } else {
          // Stub to avoid refetch loop and provide basic fallback info if fetch fails
          setExtraUsers(prev => ({
            ...prev,
            [id]: {
              id: id,
              name: `משתתף ${id.slice(0,6)}`,
              email: '',
              avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent('משתתף')}&background=cccccc`
            }
          }));
        }
      } finally {
        setLoadingIds(prev => {
          const n = { ...prev };
          delete n[id];
          return n;
        });
      }
    }));
  }, [memberships, byId, extraUsers, loadingIds]); // loadingIds is included to ensure correct re-evaluation when fetches complete.

  // Build unified list
  const displayMembers = useMemo(() => {
    const ids = Array.from(new Set((memberships || []).map(m => String(m.userId || m.UserId || m.user_id)).filter(Boolean)));
    return ids
      .filter(uid => !removedSet.has(uid)) // Filter out optimistically removed users
      .map(uid => {
        const u = byId.get(uid) || extraUsers[uid]; // Prioritize initial members, then fetched extra users
        
        const baseName = u
          ? ((u.firstName || u.first_name)
              ? `${u.firstName || u.first_name} ${u.lastName || u.last_name || ''}`.trim()
              : (u.name || u.displayName || u.display_name || u.fullName || u.full_name || u.username || u.email || `משתתף ${uid.slice(0,6)}`))
          : `משתתף ${uid.slice(0,6)}`;

        return {
          id: uid,
          name: baseName,
          email: u?.email || '',
          avatar: u?.avatarUrl || u?.avatar_url || u?.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(baseName)}&background=random`
        };
      });
  }, [memberships, byId, extraUsers, removedSet]);

  const currentRoleForUser = (uid) => {
    if (roleOverrides[uid]) return roleOverrides[uid];
    return roleMap.get(String(uid)) || 'member';
  };

  const handleRemove = async (uid) => {
    if (!eventId) {
      toast.error('שגיאה', { description: 'Event ID חסר' });
      return;
    }
    // Optimistic update
    setRemovedUserIds(prev => prev.includes(uid) ? prev : [...prev, uid]);
    try {
      await removeEventMember(eventId, uid);
      toast.success('המשתמש הוסר מהאירוע');
    } catch (e) {
      // Rollback on error
      setRemovedUserIds(prev => prev.filter(id => id !== uid));
      toast.error('לא ניתן להסיר משתמש', { description: e?.message || 'בדוק הרשאות' });
    }
  };

  const handleChangeRole = async (uid, newRole) => {
    const membership = membershipByUserId.get(String(uid));
    if (!membership?.id) {
      toast.error('לא נמצאה חברות עבור המשתמש');
      return;
    }
    const previousRole = currentRoleForUser(uid); // Store previous role for potential rollback
    
    // FIXED: Convert UI role names to server role names
    let serverRole = newRole;
    if (newRole === 'manager') {
      serverRole = 'manger'; // Server expects 'manger' (typo in server)
    } else if (newRole === 'owner') {
      serverRole = 'organizer'; // Convert owner to organizer
    }
    
    // Optimistic update
    setRoleOverrides(prev => ({ ...prev, [uid]: newRole }));
    try {
      await setEventMemberRole(membership.id, serverRole);
      toast.success('תפקיד המשתמש עודכן');
    } catch (e) {
      // Rollback on error
      setRoleOverrides(prev => ({ ...prev, [uid]: previousRole }));
      toast.error('עדכון התפקיד נכשל', { description: e?.message || '' });
    }
  };

  if (!Array.isArray(displayMembers) || displayMembers.length === 0) {
    return (
      <div className="text-center py-10 text-gray-500">
        אין משתתפים להצגה כרגע.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {displayMembers.map((u) => {
        const role = currentRoleForUser(String(u.id));
        const isOrganizerLike = role === 'organizer' || role === 'owner';
        const canShowActions = !!canManage && !isReadOnly;

        return (
          <Card key={u.id} className="border border-gray-200 dark:border-gray-700 dark:bg-gray-800">
            <CardContent className="p-3 flex items-center gap-3">
              <img src={u.avatar} alt={u.name} className="w-10 h-10 rounded-full object-cover" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 dark:text-white truncate">{u.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{u.email}</div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant={
                  role === 'organizer' || role === 'owner' ? 'default' :
                  role === 'manager' ? 'secondary' : 'outline'
                }>
                  {role === 'organizer' || role === 'owner' ? 'מנהל אירוע' :
                   role === 'manager' ? 'מנהל' : 'משתתף'}
                </Badge>

                {canShowActions && (
                  <>
                    {/* Role changer (member/manager) - disabled for organizer/owner */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-1 text-xs" title="שינוי תפקיד" disabled={isOrganizerLike}>
                          <UserCog className="w-4 h-4" />
                          <span className="hidden sm:inline">תפקיד</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleChangeRole(u.id, 'member')}>
                          הפוך לחבר
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleChangeRole(u.id, 'manager')}>
                          הפוך למנהל
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Remove member - not allowed for organizer/owner */}
                    <Button
                      variant="destructive"
                      size="icon"
                      title={isOrganizerLike ? 'לא ניתן להסיר מארגן' : 'הסר מהאירוע'}
                      disabled={isOrganizerLike}
                      onClick={() => handleRemove(u.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
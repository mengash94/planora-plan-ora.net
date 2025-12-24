import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    getMessages,
    createMessage,
    getUserById, // Kept this as it's used in the component, despite outline suggesting removal
    uploadFileToInstaback // Added this as per outline
} from '@/components/instabackService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Send, Paperclip, Users } from 'lucide-react';
import { toast } from 'sonner';
import ErrorBoundary from '../common/ErrorBoundary';
import { getRelativeTime } from '@/components/utils/dateHelpers'; // Changed import for date helpers

const isMobile = typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

// New ChatMessage component to encapsulate message rendering logic
function ChatMessage({ message, isOwn, userDetails }) {
  const isOptimistic = message._isOptimistic;

  return (
    <div
      className={`flex items-end gap-2 ${isOwn ? 'justify-end' : 'justify-start'} ${isOptimistic ? 'opacity-60' : ''}`}
    >
      {!isOwn && <img src={userDetails.avatar} alt={userDetails.name} className="w-8 h-8 rounded-full" />}
      <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl transition-all ${
        isOwn
          ? 'bg-orange-500 text-white rounded-br-none'
          : 'bg-white border shadow-sm rounded-bl-none'
      }`}>
        {!isOwn && (
          <p className="text-xs font-semibold mb-1 text-orange-600">
            {userDetails.name}
          </p>
        )}
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
        {message.fileUrl && (
          <div className="mt-2">
            {String(message.fileUrl).match(/\.(jpg|jpeg|png|gif|webp|heic)$/i) ? (
              <img
                src={message.fileUrl}
                alt="Shared file"
                className="max-w-full h-auto rounded-lg cursor-pointer"
                onClick={() => window.open(message.fileUrl, '_blank')}
                loading="lazy"
              />
            ) : (
              <a
                href={message.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-2 p-2 rounded-lg ${isOwn ? 'bg-orange-600 hover:bg-orange-700' : 'bg-gray-100 hover:bg-gray-200'}`}
              >
                <Paperclip className="w-4 h-4" />
                <span className="text-xs underline">פתח קובץ מצורף</span>
              </a>
            )}
          </div>
        )}
        <p className={`text-xs mt-1 opacity-70 ${isOwn ? 'text-orange-100' : 'text-gray-400'}`}>
          {getRelativeTime(message.createdAt)} {/* Changed to use getRelativeTime */}
          {isOptimistic && <span className="ml-1">⏳</span>}
        </p>
      </div>
      {isOwn && <img src={userDetails.avatar} alt="אני" className="w-8 h-8 rounded-full" />}
    </div>
  );
}


export default function ChatTab({ eventId, members = [], memberships = [], currentUser, isReadOnly = false }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  // Removed `useAuth` as `currentUser` is now passed as a prop
  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);
  // Removed `pollIntervalRef`, `lastMessageCountRef`, `errorToastShownRef`
  const [extraUsers, setExtraUsers] = useState({}); // Cache for users not in members prop
  const fetchingRef = useRef(new Set()); // Prevent duplicate fetches for same id

  // Improved members map: index by both id/Id
  const membersMap = useMemo(() => {
    const map = new Map();
    (members || []).forEach(m => {
      if (!m) return;
      if (m.id) map.set(String(m.id), m);
      if (m.Id) map.set(String(m.Id), m);
    });
    return map;
  }, [members]);

  // myMembershipId is no longer used after the mark-as-read logic change, so it's removed.
  // const myMembershipId = useMemo(() => {
  //   if (!currentUser || !Array.isArray(memberships)) return null;
  //   const membership = memberships.find(m => (m.userId || m.UserId || m.user_id) === currentUser.id);
  //   return membership?.id || null;
  // }, [currentUser, memberships]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = useCallback(async () => {
    if (!eventId) return;
    try {
      const fetchedMessages = await getMessages(eventId);

      // Normalize fields so we always have userId/createdAt/fileUrl consistently
      const normalized = (fetchedMessages || []).map(msg => {
        const userId = msg.userId ?? msg.UserId ?? msg.user_id ?? msg.userID;
        const createdAt = msg.createdAt ?? msg.created_at ?? msg.CreatedAt ?? msg.timestamp;
        const fileUrl = msg.fileUrl ?? msg.file_url ?? msg.file;
        return {
          ...msg,
          userId,
          createdAt,
          fileUrl
        };
      });

      const sorted = normalized.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      setMessages(sorted);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      toast.error('שגיאה בטעינת ההודעות');
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  // This effect now solely handles message fetching and polling,
  // without directly marking chats as read.
  useEffect(() => {
    setIsLoading(true);
    fetchMessages(); // Initial fetch

    const interval = setInterval(fetchMessages, 15000); // Refresh every 15 seconds

    const onFocus = () => { fetchMessages(); };
    const onVisibility = () => { if (!document.hidden) { fetchMessages(); } };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [eventId, fetchMessages]);

  // Mark chat as read when component mounts and when new messages are loaded
  useEffect(() => {
    const markAsRead = async () => {
      if (!eventId || !currentUser?.id) return;
      
      try {
        const instabackToken = localStorage.getItem('instaback_token');
        if (!instabackToken) {
          console.warn('No InstaBack token available');
          return;
        }

        // Call InstaBack edge function directly with eventId AND userId
        const response = await fetch('https://instaback.ai/project/f78de3ce-0cab-4ccb-8442-0c5749792fe8/api/edge-function/markchatasread', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${instabackToken}`,
            'accept': 'application/json'
          },
          body: JSON.stringify({
            params: {
              eventId: eventId,
              userId: currentUser.id
            }
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.warn('Failed to mark chat as read:', errorText);
          return; // Don't break the UI
        }

        const result = await response.json();
        console.log('📖 Chat marked as read:', result);
        
        // Dispatch event for layout to update unread count immediately
        window.dispatchEvent(new CustomEvent('chat:read', { 
          detail: { eventId } 
        }));
        
      } catch (error) {
        console.warn('Failed to mark chat as read:', error);
        // Don't show error to user - this is a background operation
      }
    };

    // Mark as read when component loads and when messages change
    if (messages.length > 0) {
      // Use setTimeout to avoid too many rapid calls
      const timeoutId = setTimeout(markAsRead, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [eventId, currentUser?.id, messages.length]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch unknown authors after messages load and cache them
  useEffect(() => {
    const unknownUserIds = new Set();
    (messages || []).forEach(msg => {
      const uid = msg?.userId ? String(msg.userId) : null;
      if (!uid) return;
      if (membersMap.has(uid)) return; // Already known from event members
      if (extraUsers[uid]) return; // Already fetched and cached
      if (fetchingRef.current.has(uid)) return; // Already being fetched
      unknownUserIds.add(uid);
    });

    if (unknownUserIds.size === 0) return;

    const loadMissing = async () => {
      for (const uid of unknownUserIds) {
        try {
          fetchingRef.current.add(uid);
          const u = await getUserById(uid).catch(() => null);
          if (u && (u.id || u.Id)) {
            setExtraUsers(prev => ({ ...prev, [String(u.id || u.Id)]: u }));
          } else {
            // keep a stub so we don't refetch endlessly
            setExtraUsers(prev => ({ ...prev, [uid]: { id: uid } })); // Store minimal object to mark as processed
          }
        } catch (e) {
          console.warn(`Failed to fetch user ${uid}:`, e);
          setExtraUsers(prev => ({ ...prev, [uid]: { id: uid } })); // Store stub on error too
        } finally {
          fetchingRef.current.delete(uid);
        }
      }
    };
    loadMissing();
  }, [messages, membersMap, extraUsers]);

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!newMessage.trim() || isSending || !currentUser || isReadOnly) return;

    const optimisticMessage = {
      id: `temp-${Date.now()}`,
      content: newMessage.trim(),
      createdAt: new Date().toISOString(), // Stored as ISO string (UTC)
      userId: currentUser.id,
      _isOptimistic: true
    };

    setMessages(prev => [...prev, optimisticMessage]);
    const messageContent = newMessage.trim();
    setNewMessage('');
    setIsSending(true);

    try {
      // Call InstaBack createmessagewithnotifications directly with correct path and format
      const instabackToken = localStorage.getItem('instaback_token');
      if (!instabackToken) {
        throw new Error('InstaBack token not found. Cannot send message.');
      }
      const response = await fetch('https://instaback.ai/project/f78de3ce-0cab-4ccb-8442-0c5749792fe8/api/edge-function/createmessagewithnotifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${instabackToken}`,
          'accept': 'application/json'
        },
        body: JSON.stringify({
          params: {
            eventId,
            content: messageContent,
            // fileUrl: null
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('Message created with notifications:', result);

      await fetchMessages();
      
      // Trigger notification center to update count
      window.dispatchEvent(new CustomEvent('notification:update'));
      
      toast.success("ההודעה נשלחה! 💬");
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error("שגיאה בשליחת ההודעה");
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
      setNewMessage(messageContent);
    } finally {
      setIsSending(false);
      if (!isMobile) {
        messageInputRef.current?.focus();
      }
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !currentUser || isReadOnly) return;

    // Validate file object
    if (!(file instanceof File)) {
      toast.error("קובץ לא תקין");
      return;
    }

    // Check file size (limit to 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("הקובץ גדול מדי (מקסימום 10MB)");
      return;
    }

    setIsSending(true);
    toast.info("מעלה קובץ...");
    
    try {
      console.log('[ChatTab] Uploading file:', { name: file.name, size: file.size, type: file.type });
      
      // Use InstaBack upload
      const uploadResult = await uploadFileToInstaback(file, eventId, 'chat');
      
      if (!uploadResult.file_url) {
        throw new Error('No file URL returned from upload');
      }
      
      await createMessage({
        eventId,
        userId: currentUser.id,
        content: `שיתף קובץ: ${file.name}`,
        fileUrl: uploadResult.file_url,
      });
      
      await fetchMessages();
      toast.success("הקובץ הועלה בהצלחה! 📎");
    } catch (error) {
      console.error("[ChatTab] Failed to upload file:", error);
      toast.error(`שגיאה בהעלאת הקובץ: ${error.message || 'שגיאה לא ידועה'}`);
    } finally {
      setIsSending(false);
      try { 
        event.target.value = ''; 
      } catch (e) {
        console.warn('Could not clear file input:', e);
      }
    }
  };

  // Resolve user details reliably (supports snake_case too)
  const getUserDetails = (uidRaw) => {
    const uid = String(uidRaw || '');
    if (uid && uid === String(currentUser?.id || '')) {
      const myName =
        (currentUser.firstName || currentUser.first_name)
          ? `${currentUser.firstName || currentUser.first_name} ${currentUser.lastName || currentUser.last_name || ''}`.trim()
          : (currentUser.name || currentUser.fullName || currentUser.full_name || currentUser.username || currentUser.email || 'אני');
      return {
        name: myName || 'אני',
        avatar:
          currentUser.avatarUrl || currentUser.avatar_url || currentUser.image_url ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(myName || 'אני')}&background=random`
      };
    }

    const member = membersMap.get(uid) || extraUsers[uid];
    if (member) {
      const name =
        (member.firstName || member.first_name)
          ? `${member.firstName || member.first_name} ${member.lastName || member.last_name || ''}`.trim()
          : (member.name || member.displayName || member.display_name || member.fullName || member.full_name || member.username || member.email || `משתמש ${uid.slice(0, 6)}`);
      return {
        name,
        avatar: member.avatarUrl || member.avatar_url || member.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
      };
    }

    // Fallback: show partial UID to distinguish users if details missing and not found in extraUsers
    const fallback = `משתמש ${uid.slice(0, 6)}`;
    return {
      name: fallback,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent('משתמש')}&background=cccccc`
    };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-[65vh] bg-white rounded-lg border">
        {/* Chat Header */}
        <div className="p-3 border-b bg-gray-50 flex items-center gap-2">
          <Users className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-800">צ'אט אירוע</h3>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-full">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <div className="text-4xl mb-2">💬</div>
              <p className="font-medium">התחל שיחה עם המשתתפים</p>
              <p className="text-sm">כתוב הודעה ראשונה למטה!</p>
            </div>
          ) : (
            messages.map((message) => {
              const isMyMessage = String(message.userId) === String(currentUser?.id || '');
              const userDetails = getUserDetails(message.userId);

              return (
                <ChatMessage
                  key={message.id}
                  message={message}
                  isOwn={isMyMessage}
                  userDetails={userDetails}
                />
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {isReadOnly ? (
          <div className="border-t bg-gray-100 p-3 text-center">
            <p className="text-sm text-gray-500">📜 האירוע הסתיים - לא ניתן לשלוח הודעות</p>
          </div>
        ) : (
          <div className="border-t bg-white p-3">
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <input
                type="file"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload-chat"
                disabled={isSending}
              />
              <label htmlFor="file-upload-chat">
                <Button type="button" variant="ghost" size="icon" asChild disabled={isSending} className="text-gray-500 hover:text-orange-500">
                  <span><Paperclip className="h-5 w-5" /></span>
                </Button>
              </label>

              <Input
                ref={messageInputRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="כתוב הודעה..."
                disabled={isSending}
                className="flex-1 text-right border-gray-200 focus:border-orange-300 focus:ring-orange-200"
                autoFocus={!isMobile}
              />

              <Button
                type="submit"
                disabled={!newMessage.trim() || isSending}
                className="bg-orange-500 hover:bg-orange-600 transition-colors rounded-full w-10 h-10 p-0"
              >
                {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </Button>
            </form>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
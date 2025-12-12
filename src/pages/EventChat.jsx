
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/components/AuthProvider';
import { getEventDetails, getUserById, getEventMembers } from '@/components/instabackService';
import ChatTab from '../components/event/ChatTab';
import { Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ErrorBoundary from "@/components/common/ErrorBoundary";

export default function EventChatPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const eventId = searchParams.get('id')?.trim();

    const [eventData, setEventData] = useState(null);
    const { user: currentUser, isAuthenticated } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Dispatch chat:read on mount to reset unread badge for this event in the bottom bar
    useEffect(() => {
      const params = new URLSearchParams(window.location.search);
      const currentEventId = params.get('id') || params.get('eventId'); // Use a different variable name to avoid shadowing
      if (currentEventId) {
        window.dispatchEvent(new CustomEvent('chat:read', { detail: { eventId: currentEventId } }));
      }
    }, []); // Empty dependency array means this runs once on mount

    const loadData = useCallback(async () => {
        if (!eventId || !isAuthenticated) {
            if(!isAuthenticated) navigate(createPageUrl('Home'));
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);

            const event = await getEventDetails(eventId); // can return null on 404
            if (!event || !event.id) {
                setError('האירוע לא נמצא או הוסר.');
                setIsLoading(false);
                return;
            }

            const memberships = await getEventMembers(eventId);
            
            // Get full user details for members
            const memberUserIds = memberships?.map(m => (m.userId || m.UserId)).filter(Boolean) || [];
            const userDetails = await Promise.all(
                memberUserIds.map(id => getUserById(id).catch(() => null))
            );
            
            const membersWithDetails = userDetails.filter(Boolean);

            setEventData({
                event: event,
                members: membersWithDetails,
                memberships: memberships || []
            });

        } catch (e) {
            console.error('Error loading event chat data:', e);
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    }, [eventId, navigate, isAuthenticated]);

    useEffect(() => {
        loadData();
    }, [loadData]);


    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen">
                <Loader2 className="w-12 h-12 text-orange-500 animate-spin mb-4" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 text-center text-red-500">
                <p>שגיאה בטעינת הצ'אט: {error}</p>
                <Button onClick={() => navigate(createPageUrl('ChatOverview'))}>חזרה</Button>
            </div>
        );
    }
    
    if (!eventData) {
        // This case should ideally be caught by the error state now, but as a fallback
        return <div className="p-4 text-center">לא נמצאו נתונים עבור צ'אט זה.</div>;
    }

    return (
        <div className="flex flex-col h-screen" dir="rtl">
            <header className="flex items-center p-4 border-b bg-white shadow-sm">
                <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl('ChatOverview'))}>
                    <ArrowRight className="w-5 h-5" />
                </Button>
                <h1 className="text-lg font-bold mx-auto">{eventData.event.title}</h1>
                <div className="w-10"></div>
            </header>
            <main className="flex-1 overflow-y-auto">
                <ErrorBoundary>
                    <ChatTab
                        eventId={eventId}
                        members={eventData.members}
                        memberships={eventData.memberships}
                        currentUser={currentUser}
                    />
                </ErrorBoundary>
            </main>
        </div>
    );
}

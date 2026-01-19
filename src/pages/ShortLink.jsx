import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Loader2 } from 'lucide-react';
import { getInviteLinkByCode } from '@/components/instabackService';

export default function ShortLink() {
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const handleRedirect = async () => {
            // Get the code from URL - format: /ShortLink?code=abc123
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');

            if (!code) {
                setError('קוד לא תקין');
                return;
            }

            try {
                // Get the InviteLink by code from Instaback
                const inviteLink = await getInviteLinkByCode(code);

                if (!inviteLink || !inviteLink.eventid) {
                    setError('הקישור לא נמצא או פג תוקף');
                    return;
                }

                // Redirect to the event RSVP page with the invite code
                navigate(createPageUrl('EventRSVP') + `?eventId=${inviteLink.eventid}&inviteCode=${code}`);
            } catch (err) {
                console.error('Error fetching invite link:', err);
                setError('שגיאה בטעינת הקישור');
            }
        };

        handleRedirect();
    }, [navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-pink-50">
            <div className="text-center p-8">
                {error ? (
                    <div className="text-red-500">
                        <p className="text-xl font-bold mb-2">😕 אופס</p>
                        <p>{error}</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
                        <p className="text-gray-600">מעביר אותך לאירוע...</p>
                    </div>
                )}
            </div>
        </div>
    );
}
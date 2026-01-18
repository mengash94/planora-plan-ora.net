import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, Sparkles, ChevronDown, PartyPopper, Info, ChevronRight, MapPin, Star, Lightbulb, AlertTriangle } from 'lucide-react';
import { processEventChat } from '@/functions/processEventChat';
import { generateEventPlan } from '@/functions/generateEventPlan';
import { 
    createEvent, 
    createEventMember, 
    createPoll, 
    createTask, 
    createItineraryItem,
    createRecurringEventRule,
    googleSearchPlaces
} from '@/components/instabackService';
import { toast } from 'sonner';
import DateRangePicker from '@/components/ui/DateRangePicker';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import PlaceDetailsDialog, { translatePlaceTypes } from './PlaceDetailsDialog';
import EventSummaryDialog from './EventSummaryDialog';

export default function SmartEventChat({ onEventCreated, currentUser }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [eventData, setEventData] = useState({});
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showPlaceSearch, setShowPlaceSearch] = useState(false);
    const [searchedPlaces, setSearchedPlaces] = useState([]);
    const [allPlaces, setAllPlaces] = useState([]); // All fetched places
    const [visiblePlacesCount, setVisiblePlacesCount] = useState(6);
    const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
    const [showScrollToBottom, setShowScrollToBottom] = useState(false);
    const [selectedPlaceForDetails, setSelectedPlaceForDetails] = useState(null);
    const [showPlaceDetails, setShowPlaceDetails] = useState(false);
    const [selectedPlacesForPoll, setSelectedPlacesForPoll] = useState([]);
    const [showLocationPollMode, setShowLocationPollMode] = useState(false);
    const [showEventSummary, setShowEventSummary] = useState(false);
    
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const inputRef = useRef(null);
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    // Visual Viewport API for mobile keyboard handling
    useLayoutEffect(() => {
        if (typeof window === 'undefined' || !window.visualViewport) return;
        
        const handleResize = () => {
            const currentHeight = window.visualViewport.height;
            const windowHeight = window.innerHeight;
            const newKeyboardHeight = windowHeight - currentHeight;
            
            if (newKeyboardHeight > 100) {
                setKeyboardHeight(newKeyboardHeight);
                // Scroll to bottom when keyboard opens
                setTimeout(() => scrollToBottom(true), 100);
            } else {
                setKeyboardHeight(0);
            }
        };
        
        window.visualViewport.addEventListener('resize', handleResize);
        return () => window.visualViewport.removeEventListener('resize', handleResize);
    }, []);

    // Welcome message - Expert persona with comprehensive event types
    useEffect(() => {
        addBotMessage(
            'שלום! 👋 אני פלנורה, מפיקת האירועים האישית שלך.\n\n🎯 ספר לי על האירוע שאתה מתכנן - אני מומחית בכל סוגי האירועים!',
            [
                { text: 'חתונה/אירוסין 💍', action: 'suggest_wedding', icon: '💍' },
                { text: 'יום הולדת 🎂', action: 'suggest_birthday', icon: '🎂' },
                { text: 'בר/בת מצווה 📜', action: 'suggest_barmitzvah', icon: '📜' },
                { text: 'טיול/נופש ✈️', action: 'suggest_trip', icon: '✈️' },
                { text: 'אירוע חברה 🏢', action: 'suggest_work', icon: '🏢' },
                { text: 'מסיבה/מפגש 🎉', action: 'suggest_party', icon: '🎉' },
                { text: 'ספורט/פעילות 🏃', action: 'suggest_sport', icon: '🏃' },
                { text: 'אחר 📝', action: 'suggest_other', icon: '📝' }
            ]
        );
    }, []);

    const scrollToBottom = (force = false) => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleUserScroll = () => {
        if (!messagesContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
        const atBottom = scrollHeight - scrollTop - clientHeight < 100;
        setShowScrollToBottom(!atBottom);
    };

    const addBotMessage = (text, actions = [], extras = {}) => {
        setMessages(prev => [...prev, { 
            type: 'bot', 
            text, 
            actions, 
            timestamp: new Date(),
            expertTip: extras.expertTip || null,
            riskWarning: extras.riskWarning || null
        }]);
    };

    const addUserMessage = (text) => {
        setMessages(prev => [...prev, { 
            type: 'user', 
            text, 
            timestamp: new Date() 
        }]);
    };

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;
        const userInput = input.trim();
        setInput('');
        await sendMessage(userInput);
    };

    const sendMessage = async (text) => {
        // Check if user wants to generate plan
        const planKeywords = ['צור תוכנית', 'תוכנית', 'create plan', 'generate plan', 'plan'];
        const wantsToGeneratePlan = planKeywords.some(kw => text.toLowerCase().includes(kw.toLowerCase()));

        if (wantsToGeneratePlan && eventData.title) {
            addUserMessage(text);
            await generateAndCreateEvent();
            return;
        }

        addUserMessage(text);
        setIsLoading(true);

        try {
            const { data } = await processEventChat({
                userMessage: text,
                eventData: eventData
            });

            console.log('[SmartEventChat] AI Response:', data);

            let aiResponse = null;
            if (data.data) {
                aiResponse = data.data;
            } else if (data.extractedData !== undefined) {
                aiResponse = data;
            }

            if (aiResponse) {
                // Update eventData with extracted data
                let updatedEventData = eventData;
                if (aiResponse.extractedData && Object.keys(aiResponse.extractedData).length > 0) {
                    updatedEventData = { ...eventData, ...aiResponse.extractedData };
                    setEventData(updatedEventData);
                }

                // Check if any suggested button is a search action and we have a destination
                const searchButton = (aiResponse.suggestedButtons || []).find(btn => 
                    btn.action && btn.action.startsWith('search_places_')
                );

                if (searchButton && updatedEventData.destination) {
                    // Auto-trigger the search
                    addBotMessage(aiResponse.reply, [], {
                        expertTip: aiResponse.expertTip,
                        riskWarning: aiResponse.riskWarning
                    });

                    // Execute the search automatically
                    setTimeout(() => {
                        handleAction(searchButton.action);
                    }, 500);
                } else {
                    addBotMessage(aiResponse.reply, aiResponse.suggestedButtons || [], {
                        expertTip: aiResponse.expertTip,
                        riskWarning: aiResponse.riskWarning
                    });
                }
            }

        } catch (error) {
            console.error('[SmartEventChat] Error:', error);
            addBotMessage('אופס, משהו השתבש 😕 אבל אני כאן! נסה שוב.', []);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAction = async (action) => {
        // Handle quick suggestions - comprehensive event types
        const quickSuggestions = {
            'suggest_birthday': 'יום הולדת',
            'suggest_wedding': 'חתונה',
            'suggest_engagement': 'אירוסין',
            'suggest_party': 'מסיבה',
            'suggest_trip': 'טיול',
            'suggest_work': 'אירוע עבודה',
            'suggest_other': 'אירוע אחר',
            'suggest_barmitzvah': 'בר מצווה',
            'suggest_batmitzvah': 'בת מצווה',
            'suggest_brit': 'ברית',
            'suggest_anniversary': 'יום נישואין',
            'suggest_graduation': 'סיום לימודים',
            'suggest_bachelor': 'מסיבת רווקים',
            'suggest_bachelorette': 'מסיבת רווקות',
            'suggest_conference': 'כנס',
            'suggest_workshop': 'סדנה',
            'suggest_teambuilding': 'יום גיבוש',
            'suggest_picnic': 'פיקניק',
            'suggest_bbq': 'על האש',
            'suggest_sport': 'אירוע ספורטיבי',
            'suggest_concert': 'הופעה',
            'suggest_meeting': 'פגישה',
            'suggest_vacation': 'חופשה',
            'suggest_camping': 'קמפינג'
        };
        
        if (quickSuggestions[action]) {
            await sendMessage(quickSuggestions[action]);
            return;
        }

        setIsLoading(true);
        try {

            // Handle date selection
            if (action === 'select_date') {
                setShowDatePicker(true);
                setIsLoading(false);
                return;
            }

            // Handle date poll
            if (action === 'create_date_poll') {
                setEventData(prev => ({ ...prev, datePollEnabled: true }));
                addBotMessage('מעולה! אצור סקר תאריכים בשבילך 📊', []);
                
                // Continue with AI to get next step
                const { data } = await processEventChat({
                    userMessage: 'אני רוצה סקר תאריכים',
                    eventData: { ...eventData, datePollEnabled: true }
                });
                
                if (data.extractedData) {
                    setEventData(prev => ({ ...prev, ...data.extractedData }));
                }
                addBotMessage(data.reply, data.suggestedButtons || []);
                setIsLoading(false);
                return;
            }

            // Handle place search actions - comprehensive venue types
            if (action.startsWith('search_places_') || action.startsWith('search_') || action.includes('hotel') || action.includes('מלון')) {
                let venueType = 'restaurant'; // Default
                
                if (action.startsWith('search_places_')) {
                    venueType = action.replace('search_places_', '');
                } else if (action.startsWith('search_')) {
                    venueType = action.replace('search_', '').replace('s', '');
                } else if (action.includes('hotel') || action.includes('מלון')) {
                    venueType = 'hotel';
                }
                
                // Comprehensive venue type mapping
                const venueMap = {
                    // Accommodation
                    'hotel': 'hotel',
                    'hotels': 'hotel',
                    'מלון': 'hotel',
                    'מלונות': 'hotel',
                    'לינה': 'hotel',
                    'צימר': 'צימר',
                    'zimmer': 'צימר',
                    
                    // Event venues
                    'hall': 'אולם אירועים',
                    'venue': 'אולם אירועים',
                    'אולם': 'אולם אירועים',
                    'garden': 'גן אירועים',
                    'גן': 'גן אירועים',
                    'conference': 'מרכז כנסים',
                    'כנסים': 'מרכז כנסים',
                    
                    // Food & Drink
                    'restaurant': 'מסעדה',
                    'מסעדה': 'מסעדה',
                    'cafe': 'בית קפה',
                    'קפה': 'בית קפה',
                    'bar': 'בר',
                    'בר': 'בר',
                    'pub': 'פאב',
                    'club': 'מועדון',
                    'מועדון': 'מועדון',
                    
                    // Activities
                    'activity': 'אטרקציה',
                    'אטרקציה': 'אטרקציה',
                    'פעילות': 'אטרקציה',
                    'escape': 'חדר בריחה',
                    'bowling': 'באולינג',
                    'karting': 'קארטינג',
                    
                    // Nature & Outdoor
                    'park': 'פארק',
                    'פארק': 'פארק',
                    'beach': 'חוף',
                    'חוף': 'חוף',
                    'camping': 'קמפינג',
                    'קמפינג': 'קמפינג',
                    
                    // Wellness
                    'spa': 'ספא',
                    'ספא': 'ספא',
                    
                    // Sports
                    'gym': 'חדר כושר',
                    'pool': 'בריכה',
                    'court': 'מגרש',
                    'field': 'מגרש'
                };
                
                const searchTerm = venueMap[venueType] || venueType;
                
                // Update eventData with venue preference
                const updatedEventData = { ...eventData, venuePreference: searchTerm };
                setEventData(updatedEventData);
                
                // Get destination from the UPDATED eventData (in case AI just extracted it)
                const destination = updatedEventData.destination || updatedEventData.location;
                
                if (destination) {
                    // Use Google Places API via instabackService
                    await searchPlaces(searchTerm, destination);
                } else {
                    // Ask for location based on venue type
                    const locationPrompts = {
                        'hotel': 'באיזו עיר/מדינה אתה מחפש מלון? 🏨',
                        'מסעדה': 'באיזו עיר אתה מחפש מסעדה? 🍽️',
                        'אולם אירועים': 'באיזור איזו עיר אתה מחפש אולם? 🏛️',
                        'ספא': 'באיזור איזו עיר אתה מחפש ספא? 💆'
                    };
                    addBotMessage(locationPrompts[searchTerm] || 'באיזו עיר אתה מחפש? 📍', []);
                }
                
                setIsLoading(false);
                return;
            }

            // Handle manual location
            if (action === 'manual_location') {
                addBotMessage('בסדר! כתוב את שם המקום 📝', []);
                setIsLoading(false);
                return;
            }

            // Handle generate plan - check multiple variations
            if (action === 'generate_plan' || action === 'צור תוכנית' || action.includes('plan') || action.includes('תוכנית')) {
                // Show summary dialog before creating
                setShowEventSummary(true);
                setIsLoading(false);
                return;
            }

            // Default: send action as user message
            await sendMessage(action);

        } catch (error) {
            console.error('[SmartEventChat] Action error:', error);
            addBotMessage('אופס, משהו השתבש 😕 נסה שוב!', []);
            setIsLoading(false);
        }
    };

    const searchPlaces = async (venueType, city) => {
        setIsSearchingPlaces(true);
        addBotMessage('מחפש מקומות מומלצים... 🔍', []);

        try {
            const query = `${venueType} ${city}`;
            const places = await googleSearchPlaces(query);

            if (!places || places.length === 0) {
                addBotMessage('לא מצאתי מקומות 😕 נסה לכתוב מקום ידנית?', [
                    { text: 'כתוב מקום ✏️', action: 'manual_location', icon: '✏️' }
                ]);
                setIsSearchingPlaces(false);
                return;
            }

            setAllPlaces(places);
            setSearchedPlaces(places.slice(0, 6));
            setVisiblePlacesCount(6);
            setShowPlaceSearch(true);
            setSelectedPlacesForPoll([]);
            setShowLocationPollMode(false);
            addBotMessage(`מצאתי ${places.length} מקומות! 📍\n\n💡 טיפ: לחץ על "פרטים נוספים" לראות תמונות ומידע נוסף.\n🗳️ רוצה לתת למשתתפים לבחור? סמן כמה מקומות וצור סקר!`, []);

        } catch (error) {
            console.error('[SmartEventChat] Place search error:', error);
            addBotMessage('שגיאה בחיפוש 😕 נסה שוב או כתוב מקום ידנית.', [
                { text: 'כתוב מקום ✏️', action: 'manual_location', icon: '✏️' }
            ]);
        } finally {
            setIsSearchingPlaces(false);
        }
    };

    const handleShowMorePlaces = () => {
        const newCount = visiblePlacesCount + 6;
        setVisiblePlacesCount(newCount);
        setSearchedPlaces(allPlaces.slice(0, newCount));
    };

    const togglePlaceForPoll = (place) => {
        setSelectedPlacesForPoll(prev => {
            const isSelected = prev.some(p => p.place_id === place.place_id);
            if (isSelected) {
                return prev.filter(p => p.place_id !== place.place_id);
            } else {
                return [...prev, place];
            }
        });
    };

    const handleCreateLocationPoll = () => {
        if (selectedPlacesForPoll.length < 2) {
            toast.error('יש לבחור לפחות 2 מקומות לסקר');
            return;
        }
        
        setEventData(prev => ({
            ...prev,
            locationPollEnabled: true,
            locationPollOptions: selectedPlacesForPoll
        }));
        
        setShowPlaceSearch(false);
        setShowLocationPollMode(false);
        addBotMessage(`מעולה! 🗳️ יצרתי סקר עם ${selectedPlacesForPoll.length} מקומות:\n${selectedPlacesForPoll.map(p => `• ${p.name}`).join('\n')}\n\nהמשתתפים יוכלו להצביע על המקום המועדף!`, [
            { text: 'המשך ליצירת האירוע 🎉', action: 'generate_plan', icon: '🎉' }
        ]);
    };

    const handlePlaceSelect = async (place) => {
        setShowPlaceSearch(false);
        setSearchedPlaces([]);
        
        const newLocation = place.address ? `${place.name}, ${place.address}` : place.name;
        const updatedEventData = { ...eventData, location: newLocation };
        setEventData(updatedEventData);
        
        // Continue conversation with AI
        await sendMessage(`בחרתי את המקום: ${place.name}`);
    };

    const handleDateSelected = async (startDate, endDate) => {
        setShowDatePicker(false);

        const updatedData = {
            ...eventData,
            eventDate: startDate,
            endDate: endDate,
            datePollEnabled: false
        };

        setEventData(updatedData);

        // Format dates for display
        const startDateStr = startDate ? new Date(startDate).toLocaleDateString('he-IL') : '';
        const endDateStr = endDate ? new Date(endDate).toLocaleDateString('he-IL') : '';

        // Build message with date range if applicable
        let dateMessage = `התאריך: ${startDateStr}`;
        if (endDate && endDateStr !== startDateStr) {
            dateMessage = `התאריכים: ${startDateStr} עד ${endDateStr}`;
        }

        // Continue with AI
        await sendMessage(dateMessage);
    };

    const generateAndCreateEvent = async () => {
        setIsLoading(true);
        addBotMessage('מייצר תוכנית אירוע מלאה... ✨', []);

        try {
            // Auto-generate title if missing
            if (!eventData.title) {
                const autoTitle = eventData.eventType 
                    ? `${eventData.eventType}${eventData.destination ? ` ב${eventData.destination}` : ''}`
                    : 'אירוע חדש';
                setEventData(prev => ({ ...prev, title: autoTitle }));
                eventData.title = autoTitle;
            }

            // Step 1: Generate the event plan (itinerary + tasks)
            addBotMessage('בונה לו"ז ומשימות מותאמים אישית... 📋', []);
            
            let generatedPlan = null;
            try {
                const planResponse = await generateEventPlan({ eventData });
                if (planResponse?.data?.data) {
                    generatedPlan = planResponse.data.data;
                } else if (planResponse?.data) {
                    generatedPlan = planResponse.data;
                }
                console.log('[SmartEventChat] Generated plan:', generatedPlan);
            } catch (planError) {
                console.warn('[SmartEventChat] Plan generation failed, continuing without:', planError);
            }

            // Step 2: Create the event
            addBotMessage('יוצר את האירוע... 🎯', []);
            
            const event = await createEvent({
                title: eventData.title,
                description: eventData.description || generatedPlan?.summary || '',
                location: eventData.location || eventData.destination || '',
                event_date: eventData.eventDate || null,
                end_date: eventData.endDate || null,
                owner_id: currentUser.id,
                privacy: eventData.privacy || 'private',
                category: eventData.category || eventData.eventType || null,
                datePollEnabled: eventData.datePollEnabled || false,
                locationPollEnabled: eventData.locationPollEnabled || false,
                is_recurring: eventData.isRecurring || false
            });

            if (!event || !event.id) {
                throw new Error('יצירת האירוע נכשלה');
            }

            console.log('[SmartEventChat] Event created:', event.id);

            // Step 3: Add user as organizer
            await createEventMember({
                eventId: event.id,
                userId: currentUser.id,
                role: 'organizer'
            });

            // Step 4: Create tasks from generated plan
            if (generatedPlan?.tasks && generatedPlan.tasks.length > 0) {
                addBotMessage(`מוסיף ${generatedPlan.tasks.length} משימות מקצועיות... ✅`, []);

                for (const task of generatedPlan.tasks) {
                    try {
                        // Build description with vendor tip if available
                        let fullDescription = task.description || '';
                        if (task.vendorTip) {
                            fullDescription += `\n\n💡 טיפ: ${task.vendorTip}`;
                        }
                        if (task.estimatedCost) {
                            fullDescription += `\n💰 הערכת עלות: ${task.estimatedCost}`;
                        }

                        await createTask({
                            event_id: event.id,
                            eventId: event.id,
                            title: task.title,
                            description: fullDescription,
                            category: task.category || 'other',
                            priority: task.priority || 'medium',
                            status: 'todo',
                            due_date: task.dueDate || null,
                            dueDate: task.dueDate || null
                        });
                    } catch (taskError) {
                        console.warn('[SmartEventChat] Failed to create task:', task.title, taskError);
                    }
                }
            }

            // Step 5: Create itinerary items from generated plan
            if (generatedPlan?.itinerary && generatedPlan.itinerary.length > 0) {
                addBotMessage(`מוסיף ${generatedPlan.itinerary.length} פריטים ללו"ז... 📅`, []);
                
                for (const item of generatedPlan.itinerary) {
                    try {
                        await createItineraryItem({
                            eventId: event.id,
                            title: item.title,
                            location: item.location || '',
                            date: item.date || eventData.eventDate || null,
                            endDate: item.endDate || null,
                            order: item.order || 0
                        });
                    } catch (itineraryError) {
                        console.warn('[SmartEventChat] Failed to create itinerary item:', item.title, itineraryError);
                    }
                }
            }

            // Step 6: Create recurring rule if needed
            if (eventData.isRecurring && eventData.recurrenceRule) {
                await createRecurringEventRule({
                    event_id: event.id,
                    ...eventData.recurrenceRule
                });
            }

            // Success message with summary - Expert style
            let successMessage = 'האירוע נוצר בהצלחה! 🎉';
            if (generatedPlan) {
                const taskCount = generatedPlan.tasks?.length || 0;
                const itineraryCount = generatedPlan.itinerary?.length || 0;
                successMessage = `🎉 מזל טוב! יצרתי לך אירוע מקצועי!\n\n`;

                if (generatedPlan.summary) {
                    successMessage += `📋 ${generatedPlan.summary}\n\n`;
                }

                if (taskCount > 0) successMessage += `✅ ${taskCount} משימות מתוזמנות\n`;
                if (itineraryCount > 0) successMessage += `📅 ${itineraryCount} פריטים בלו"ז\n`;

                // Budget estimate if available
                if (generatedPlan.budgetEstimate?.medium) {
                    successMessage += `\n💰 הערכת תקציב: ${generatedPlan.budgetEstimate.medium}`;
                }

                // Risk alerts
                if (generatedPlan.riskAlerts?.length > 0) {
                    successMessage += `\n\n⚠️ לשים לב:\n`;
                    generatedPlan.riskAlerts.forEach(alert => {
                        successMessage += `• ${alert}\n`;
                    });
                }

                // Top suggestion
                if (generatedPlan.suggestions?.length > 0) {
                    successMessage += `\n💡 טיפ ראשון: ${generatedPlan.suggestions[0]}`;
                }
            }
            
            addBotMessage(successMessage, []);
            
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            onEventCreated(event);

        } catch (error) {
            console.error('[SmartEventChat] Error creating event:', error);
            toast.error('שגיאה ביצירת האירוע', { description: error.message });
            addBotMessage(`שגיאה: ${error.message} 😕 בוא ננסה שוב?`, [
                { text: 'נסה שוב 🔄', action: 'generate_plan', icon: '🔄' }
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-full w-full flex flex-col bg-gradient-to-br from-orange-50 via-white to-pink-50">
            {/* Messages Container */}
            <div 
                ref={messagesContainerRef}
                onScroll={handleUserScroll}
                className="flex-1 overflow-y-auto p-4 space-y-4"
                style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
            >
                {messages.map((msg, idx) => (
                    <div 
                        key={idx} 
                        className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-200`}
                    >
                        <div className={`max-w-[85%] sm:max-w-[70%] rounded-3xl px-4 py-3 shadow-md ${
                            msg.type === 'user'
                                ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white'
                                : 'bg-white text-gray-800 border border-orange-100'
                        }`}>
                            <p className="whitespace-pre-wrap text-sm leading-relaxed font-medium">
                                {msg.text}
                            </p>

                            {/* Expert Tip */}
                            {msg.expertTip && (
                                <div className="mt-3 p-3 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl border border-amber-200">
                                    <div className="flex items-start gap-2">
                                        <Lightbulb className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-bold text-amber-800 mb-1">💡 טיפ של מומחה</p>
                                            <p className="text-xs text-amber-700">{msg.expertTip}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Risk Warning */}
                            {msg.riskWarning && (
                                <div className="mt-3 p-3 bg-gradient-to-r from-red-50 to-orange-50 rounded-xl border border-red-200">
                                    <div className="flex items-start gap-2">
                                        <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-bold text-red-800 mb-1">⚠️ שימי לב</p>
                                            <p className="text-xs text-red-700">{msg.riskWarning}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {msg.actions && msg.actions.length > 0 && (
                                <div className="grid grid-cols-2 gap-2 mt-3">
                                    {msg.actions.map((action, actionIdx) => (
                                        <Button
                                            key={actionIdx}
                                            onClick={() => handleAction(action.action)}
                                            className="bg-white hover:bg-orange-50 text-gray-800 border border-orange-200 hover:border-orange-400 rounded-2xl h-auto py-3 px-3 flex flex-col items-center gap-1.5 transition-all shadow-sm hover:shadow-md"
                                            disabled={isLoading}
                                        >
                                            <span className="text-xl">{action.icon}</span>
                                            <span className="text-xs font-semibold leading-tight text-center">
                                                {action.text}
                                            </span>
                                        </Button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {/* Place Search Results */}
                {showPlaceSearch && searchedPlaces.length > 0 && (
                    <div className="space-y-3 animate-in fade-in">
                        {/* Poll Mode Toggle */}
                        <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="pollMode"
                                        checked={showLocationPollMode}
                                        onCheckedChange={(checked) => {
                                            setShowLocationPollMode(checked);
                                            if (!checked) setSelectedPlacesForPoll([]);
                                        }}
                                    />
                                    <label htmlFor="pollMode" className="text-sm font-medium text-blue-800 cursor-pointer">
                                        🗳️ מצב סקר מקומות
                                    </label>
                                </div>
                                {showLocationPollMode && selectedPlacesForPoll.length > 0 && (
                                    <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full">
                                        נבחרו {selectedPlacesForPoll.length}
                                    </span>
                                )}
                            </div>
                            {showLocationPollMode && (
                                <p className="text-xs text-blue-600 mt-2">
                                    סמן את המקומות שתרצה להוסיף לסקר (מינימום 2). המשתתפים יוכלו להצביע על המקום המועדף עליהם.
                                </p>
                            )}
                        </div>

                        {/* Places List */}
                        {searchedPlaces.map((place, idx) => {
                            const isSelectedForPoll = selectedPlacesForPoll.some(p => p.place_id === place.place_id);
                            const translatedTypes = translatePlaceTypes(place.types);
                            
                            return (
                                <Card 
                                    key={place.place_id || idx}
                                    className={`p-4 transition-all border-2 ${
                                        isSelectedForPoll 
                                            ? 'border-blue-400 bg-blue-50' 
                                            : 'hover:border-orange-400'
                                    }`}
                                >
                                    <div className="flex items-start gap-3">
                                        {/* Checkbox for poll mode */}
                                        {showLocationPollMode && (
                                            <Checkbox
                                                checked={isSelectedForPoll}
                                                onCheckedChange={() => togglePlaceForPoll(place)}
                                                className="mt-2"
                                            />
                                        )}
                                        
                                        {place.photo_url && (
                                            <img 
                                                src={place.photo_url} 
                                                alt={place.name}
                                                className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                                            />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-gray-900 truncate">{place.name}</p>
                                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">{place.address}</p>
                                            <div className="flex items-center gap-3 mt-2 flex-wrap">
                                                {place.rating && (
                                                    <div className="flex items-center gap-1">
                                                        <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                                                        <span className="text-sm font-semibold">{place.rating}</span>
                                                        {place.user_ratings_total && (
                                                            <span className="text-xs text-gray-500">({place.user_ratings_total})</span>
                                                        )}
                                                    </div>
                                                )}
                                                {place.price_level && (
                                                    <span className="text-sm text-green-600">
                                                        {'₪'.repeat(place.price_level)}
                                                    </span>
                                                )}
                                                {place.opening_hours?.open_now !== undefined && (
                                                    <span className={`text-xs px-2 py-0.5 rounded-full ${place.opening_hours.open_now ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                        {place.opening_hours.open_now ? 'פתוח' : 'סגור'}
                                                    </span>
                                                )}
                                            </div>
                                            {translatedTypes.length > 0 && (
                                                <p className="text-xs text-gray-500 mt-1 truncate">
                                                    {translatedTypes.slice(0, 3).join(' • ')}
                                                </p>
                                            )}
                                            
                                            {/* Action Buttons */}
                                            <div className="flex gap-2 mt-3">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedPlaceForDetails(place);
                                                        setShowPlaceDetails(true);
                                                    }}
                                                    className="text-xs"
                                                >
                                                    <Info className="w-3 h-3 ml-1" />
                                                    פרטים נוספים
                                                </Button>
                                                {!showLocationPollMode && (
                                                    <Button
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handlePlaceSelect(place);
                                                        }}
                                                        className="text-xs bg-orange-500 hover:bg-orange-600"
                                                    >
                                                        <MapPin className="w-3 h-3 ml-1" />
                                                        בחר מקום
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}

                        {/* Show More Button */}
                        {allPlaces.length > visiblePlacesCount && (
                            <Button
                                variant="outline"
                                onClick={handleShowMorePlaces}
                                className="w-full border-orange-300 text-orange-600 hover:bg-orange-50"
                            >
                                הצג עוד מקומות
                                <ChevronRight className="w-4 h-4 mr-2 rotate-90" />
                            </Button>
                        )}

                        {/* Create Poll Button */}
                        {showLocationPollMode && selectedPlacesForPoll.length >= 2 && (
                            <Button
                                onClick={handleCreateLocationPoll}
                                className="w-full bg-blue-500 hover:bg-blue-600"
                            >
                                🗳️ צור סקר עם {selectedPlacesForPoll.length} מקומות
                            </Button>
                        )}
                    </div>
                )}

                {/* Loading indicator */}
                {isLoading && (
                    <div className="flex justify-start animate-in fade-in">
                        <div className="bg-white rounded-3xl px-5 py-4 shadow-md border border-orange-100">
                            <div className="flex items-center gap-3">
                                <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
                                <span className="text-sm text-gray-700">פלנורה חושבת...</span>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Scroll to bottom button */}
            {showScrollToBottom && (
                <div className="absolute left-1/2 transform -translate-x-1/2 bottom-20 z-10">
                    <Button
                        onClick={() => scrollToBottom(true)}
                        className="bg-orange-500 hover:bg-orange-600 text-white rounded-full shadow-lg px-4 py-2"
                        size="sm"
                    >
                        <ChevronDown className="w-4 h-4" />
                    </Button>
                </div>
            )}

            {/* Input Area - with keyboard handling */}
            <div 
                className="flex-shrink-0 p-3 bg-white/95 backdrop-blur-sm border-t border-orange-100 transition-all duration-200"
                style={{ paddingBottom: keyboardHeight > 0 ? '12px' : '12px' }}
            >
                {/* Event Progress Indicator */}
                {Object.keys(eventData).length > 0 && (
                    <div className="flex items-center gap-2 mb-2 px-1">
                        <div className="flex gap-1">
                            <Badge variant={eventData.eventType ? "default" : "outline"} className="text-xs">
                                {eventData.eventType ? `📍 ${eventData.eventType}` : 'סוג אירוע'}
                            </Badge>
                            <Badge variant={eventData.eventDate || eventData.datePollEnabled ? "default" : "outline"} className="text-xs">
                                {eventData.eventDate ? '📅 יש תאריך' : eventData.datePollEnabled ? '🗳️ סקר' : 'תאריך'}
                            </Badge>
                            <Badge variant={eventData.location || eventData.destination ? "default" : "outline"} className="text-xs">
                                {eventData.location ? '📍 יש מקום' : eventData.destination ? `🏙️ ${eventData.destination}` : 'מיקום'}
                            </Badge>
                        </div>
                    </div>
                )}
                
                <div className="flex gap-2 max-w-3xl mx-auto">
                    <Input
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                        placeholder="ספר לי על האירוע שלך... (אפשר להגיד הכל במשפט אחד!)"
                        disabled={isLoading}
                        className="flex-1 text-sm py-5 px-4 rounded-2xl border-2 border-orange-200 focus:border-orange-400 shadow-sm"
                        autoComplete="off"
                    />
                    <Button
                        onClick={handleSend}
                        disabled={isLoading || !input.trim()}
                        className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 rounded-2xl px-5 py-5 shadow-md"
                    >
                        <Send className="w-5 h-5" />
                    </Button>
                </div>
            </div>

            {/* Date Picker Dialog */}
            <Dialog open={showDatePicker} onOpenChange={setShowDatePicker}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>בחר תאריך לאירוע</DialogTitle>
                    </DialogHeader>
                    <DateRangePicker
                        startDate={eventData.eventDate}
                        endDate={eventData.endDate}
                        onStartDateChange={(date) => setEventData(prev => ({ ...prev, eventDate: date }))}
                        onEndDateChange={(date) => setEventData(prev => ({ ...prev, endDate: date }))}
                        showTime={true}
                        allowRange={true}
                    />
                    <div className="flex gap-2 pt-3">
                        <Button
                            onClick={() => handleDateSelected(eventData.eventDate, eventData.endDate)}
                            className="flex-1 bg-orange-500 hover:bg-orange-600 py-5"
                            disabled={!eventData.eventDate}
                        >
                            אישור
                        </Button>
                        <Button
                            onClick={() => setShowDatePicker(false)}
                            variant="outline"
                            className="py-5"
                        >
                            ביטול
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Place Details Dialog */}
            <PlaceDetailsDialog
                place={selectedPlaceForDetails}
                open={showPlaceDetails}
                onOpenChange={setShowPlaceDetails}
                onSelect={handlePlaceSelect}
            />

            {/* Event Summary Dialog */}
            <EventSummaryDialog
                open={showEventSummary}
                onOpenChange={setShowEventSummary}
                eventData={eventData}
                onEventDataChange={setEventData}
                onConfirm={async () => {
                    setShowEventSummary(false);
                    await generateAndCreateEvent();
                }}
                isLoading={isLoading}
            />
        </div>
    );
}
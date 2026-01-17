import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Loader2, Send, Sparkles, ChevronDown, PartyPopper } from 'lucide-react';
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

export default function SmartEventChat({ onEventCreated, currentUser }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [eventData, setEventData] = useState({});
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showPlaceSearch, setShowPlaceSearch] = useState(false);
    const [searchedPlaces, setSearchedPlaces] = useState([]);
    const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
    const [showScrollToBottom, setShowScrollToBottom] = useState(false);
    
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const inputRef = useRef(null);

    // Welcome message
    useEffect(() => {
        addBotMessage(
            'שלום! 👋 אני פלנורה, העוזרת החכמה שלך לתכנון אירועים.\n\nספר לי על האירוע שלך - אני כאן כדי לעזור!',
            [
                { text: 'יום הולדת 🎂', action: 'suggest_birthday', icon: '🎂' },
                { text: 'חתונה 💍', action: 'suggest_wedding', icon: '💍' },
                { text: 'מסיבה 🎉', action: 'suggest_party', icon: '🎉' },
                { text: 'טיול ✈️', action: 'suggest_trip', icon: '✈️' },
                { text: 'אירוע עבודה 🏢', action: 'suggest_work', icon: '🏢' },
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

    const addBotMessage = (text, actions = []) => {
        setMessages(prev => [...prev, { 
            type: 'bot', 
            text, 
            actions, 
            timestamp: new Date() 
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

            if (data.data) {
                // Response wrapped in data.data
                const aiResponse = data.data;
                if (aiResponse.extractedData && Object.keys(aiResponse.extractedData).length > 0) {
                    setEventData(prev => ({ ...prev, ...aiResponse.extractedData }));
                }
                addBotMessage(aiResponse.reply, aiResponse.suggestedButtons || []);
            } else if (data.extractedData !== undefined) {
                // Direct response
                if (data.extractedData && Object.keys(data.extractedData).length > 0) {
                    setEventData(prev => ({ ...prev, ...data.extractedData }));
                }
                addBotMessage(data.reply, data.suggestedButtons || []);
            }

        } catch (error) {
            console.error('[SmartEventChat] Error:', error);
            addBotMessage('אופס, משהו השתבש 😕 אבל אני כאן! נסה שוב.', []);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAction = async (action) => {
        // Handle quick suggestions
        if (action === 'suggest_birthday') {
            await sendMessage('יום הולדת');
            return;
        }
        if (action === 'suggest_wedding') {
            await sendMessage('חתונה');
            return;
        }
        if (action === 'suggest_party') {
            await sendMessage('מסיבה');
            return;
        }
        if (action === 'suggest_trip') {
            await sendMessage('טיול');
            return;
        }
        if (action === 'suggest_work') {
            await sendMessage('אירוע עבודה');
            return;
        }
        if (action === 'suggest_other') {
            await sendMessage('אירוע אחר');
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

            // Handle place search actions
            if (action.startsWith('search_places_')) {
                const venueType = action.replace('search_places_', '');
                const venueMap = {
                    'restaurant': 'מסעדה',
                    'hall': 'אולם אירועים',
                    'cafe': 'בית קפה',
                    'club': 'מועדון',
                    'garden': 'גן אירועים',
                    'hotel': 'מלון'
                };
                
                const venueHebrew = venueMap[venueType] || venueType;
                setEventData(prev => ({ ...prev, venuePreference: venueHebrew }));
                
                if (eventData.destination) {
                    await searchPlaces(venueHebrew, eventData.destination);
                } else {
                    addBotMessage('באיזו עיר אתה מחפש?', []);
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
                await generateAndCreateEvent();
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

            setSearchedPlaces(places.slice(0, 10));
            setShowPlaceSearch(true);
            addBotMessage(`מצאתי ${places.length} מקומות! 📍 בחר מקום או המשך הלאה.`, []);

        } catch (error) {
            console.error('[SmartEventChat] Place search error:', error);
            addBotMessage('שגיאה בחיפוש 😕 נסה שוב או כתוב מקום ידנית.', [
                { text: 'כתוב מקום ✏️', action: 'manual_location', icon: '✏️' }
            ]);
        } finally {
            setIsSearchingPlaces(false);
        }
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

        const dateStr = startDate ? new Date(startDate).toLocaleDateString('he-IL') : '';
        
        // Continue with AI
        await sendMessage(`התאריך: ${dateStr}`);
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
                addBotMessage(`מוסיף ${generatedPlan.tasks.length} משימות... ✅`, []);
                
                for (const task of generatedPlan.tasks) {
                    try {
                        await createTask({
                            event_id: event.id,
                            eventId: event.id,
                            title: task.title,
                            description: task.description || '',
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

            // Success message with summary
            let successMessage = 'האירוע נוצר בהצלחה! 🎉';
            if (generatedPlan) {
                const taskCount = generatedPlan.tasks?.length || 0;
                const itineraryCount = generatedPlan.itinerary?.length || 0;
                successMessage = `האירוע נוצר בהצלחה! 🎉\n\n`;
                if (taskCount > 0) successMessage += `✅ ${taskCount} משימות\n`;
                if (itineraryCount > 0) successMessage += `📅 ${itineraryCount} פריטים בלו"ז\n`;
                if (generatedPlan.suggestions?.length > 0) {
                    successMessage += `\n💡 טיפ: ${generatedPlan.suggestions[0]}`;
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
                        {searchedPlaces.map((place, idx) => (
                            <Card 
                                key={idx}
                                onClick={() => handlePlaceSelect(place)}
                                className="p-4 cursor-pointer hover:shadow-lg transition-all border-2 hover:border-orange-400"
                            >
                                <div className="flex items-start gap-3">
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
                                                    <span className="text-amber-500">⭐</span>
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
                                        {place.types && place.types.length > 0 && (
                                            <p className="text-xs text-gray-500 mt-1 truncate">
                                                {place.types.slice(0, 3).join(' • ')}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        ))}
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

            {/* Input Area */}
            <div className="flex-shrink-0 p-3 bg-white/95 backdrop-blur-sm border-t border-orange-100">
                <div className="flex gap-2 max-w-3xl mx-auto">
                    <Input
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                        placeholder="ספר לי על האירוע שלך..."
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
        </div>
    );
}
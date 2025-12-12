import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Send, MapPin, Star, ExternalLink, Check, X, Globe, Phone, Calendar, Users, FileText, Edit, TrendingUp, CheckCircle2, Sparkles, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import {
    createEvent,
    googleSearchPlaces,
    getPlaceDetails,
    createPoll,
    createTask,
    createEventMember,
    createItineraryItem,
    createRecurringEventRule
} from '@/components/instabackService';
import { base44 } from '@/api/base44Client';
import DateRangePicker from '@/components/ui/DateRangePicker';

const STEPS = [
    { id: 'welcome', label: 'התחלה', emoji: '👋' },
    { id: 'event_type', label: 'סוג אירוע', emoji: '🎯' },
    { id: 'event_name', label: 'שם', emoji: '✏️' },
    { id: 'participants', label: 'משתתפים', emoji: '👥' },
    { id: 'for_whom', label: 'יעד', emoji: '🎯' },
    { id: 'location', label: 'מיקום', emoji: '📍' },
    { id: 'date', label: 'תאריך', emoji: '📅' },
    { id: 'summary', label: 'סיכום', emoji: '✅' }
];

export default function EventCreationChat({ onEventCreated, currentUser }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [currentStep, setCurrentStep] = useState('welcome');
    const [eventData, setEventData] = useState({
        title: '',
        description: '',
        location: '',
        eventType: '',
        participants: null,
        destination: '',
        forWhom: '',
        budget: null,
        style: '',
        eventDate: null,
        endDate: null,
        datePollEnabled: false,
        locationPollEnabled: false,
        dateOptions: [],
        professionals: [],
        venuePreference: '',
        privacy: 'private',
        isRecurring: false,
        recurrenceRule: null
    });
    const [searchedPlaces, setSearchedPlaces] = useState([]);
    const [selectedPlacesForPoll, setSelectedPlacesForPoll] = useState([]);
    const [selectedPlace, setSelectedPlace] = useState(null);
    const [showPlaceDetails, setShowPlaceDetails] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [finalEventData, setFinalEventData] = useState(null);
    const [generatedPlan, setGeneratedPlan] = useState(null);
    const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
    const messagesContainerRef = useRef(null);
    const messagesEndRef = useRef(null); // Added messagesEndRef
    
    const [isCreatingEvent, setIsCreatingEvent] = useState(false);
    const [creationProgress, setCreationProgress] = useState('');

    const [canShowSummaryAgain, setCanShowSummaryAgain] = useState(false);
    const [visiblePlacesCount, setVisiblePlacesCount] = useState(6);
    const [allPlacesVisible, setAllPlacesVisible] = useState(false);
    const inputRef = useRef(null);
    
    // ✅ UX/UI Improvements: Keyboard handling & smart scrolling
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const [isUserScrolling, setIsUserScrolling] = useState(false);
    const [showScrollToBottom, setShowScrollToBottom] = useState(false);
    const userScrollTimeoutRef = useRef(null);

    // 🆕 הגדרת אירועים שלא צריכים לשאול "למי האירוע"
    const SKIP_FOR_WHOM_EVENTS = [
        'חתונה', 'אירוסין', 'בר מצווה', 'בת מצווה', 'ברית', 'בריתה', 
        'הצעת נישואין', 'יום נישואין', 'שבע ברכות', 'חינה', 'שבת חתן',
        'אירוע עבודה', 'כנס', 'פגישה', 'סדנה'
    ];

    // 🆕 הגדרת תכונות ברירת מחדל לפי סוג אירוע (מבוסס על מחקר אירועים בישראל)
    const EVENT_TYPE_DEFAULTS = {
        'חתונה': {
            skipForWhom: true,
            defaultForWhom: 'לעצמי',
            typicalParticipants: { min: 150, max: 500 },
            typicalVenues: ['אולם אירועים', 'גן אירועים', 'מלון', 'יקב'],
            requiredFields: ['title', 'location', 'eventDate', 'participants'],
            suggestedTasks: ['הזמנת אולם', 'צלם ווידאו', 'קייטרינג', 'DJ/תזמורת', 'פרחים', 'הזמנות', 'שמלה/חליפה', 'רב/מסדר קידושין'],
            privacy: 'private'
        },
        'אירוסין': {
            skipForWhom: true,
            defaultForWhom: 'לעצמי',
            typicalParticipants: { min: 50, max: 200 },
            typicalVenues: ['מסעדה', 'גן אירועים', 'בית קפה', 'יקב'],
            requiredFields: ['title', 'location', 'eventDate', 'participants'],
            suggestedTasks: ['הזמנת מקום', 'קייטרינג', 'עיצוב', 'הזמנות'],
            privacy: 'private'
        },
        'בר מצווה': {
            skipForWhom: true,
            defaultForWhom: 'לבן/בת שלי',
            typicalParticipants: { min: 100, max: 300 },
            typicalVenues: ['אולם אירועים', 'גן אירועים', 'מסעדה', 'בית כנסת'],
            requiredFields: ['title', 'location', 'eventDate', 'participants'],
            suggestedTasks: ['הזמנת אולם', 'DJ/להקה', 'צלם', 'קייטרינג', 'עליה לתורה', 'הזמנות', 'דבר תורה'],
            privacy: 'private'
        },
        'בת מצווה': {
            skipForWhom: true,
            defaultForWhom: 'לבת שלי',
            typicalParticipants: { min: 100, max: 300 },
            typicalVenues: ['אולם אירועים', 'גן אירועים', 'מסעדה'],
            requiredFields: ['title', 'location', 'eventDate', 'participants'],
            suggestedTasks: ['הזמנת אולם', 'DJ/להקה', 'צלם', 'קייטרינג', 'הזמנות', 'שמלה'],
            privacy: 'private'
        },
        'ברית': {
            skipForWhom: true,
            defaultForWhom: 'לבן שלי',
            typicalParticipants: { min: 30, max: 100 },
            typicalVenues: ['בבית', 'בית כנסת', 'אולם אירועים', 'מסעדה'],
            requiredFields: ['title', 'location', 'eventDate', 'participants'],
            suggestedTasks: ['מוהל', 'סנדק', 'קייטרינג/כיבוד', 'הזמנות', 'צילום'],
            privacy: 'private'
        },
        'יום הולדת': {
            skipForWhom: false,
            defaultForWhom: null,
            typicalParticipants: { min: 10, max: 100 },
            typicalVenues: ['בבית', 'מסעדה', 'פארק שעשועים', 'בית קפה'],
            requiredFields: ['title', 'location', 'eventDate', 'participants'],
            suggestedTasks: ['הזמנת מקום', 'עוגה', 'קישוטים', 'הזמנות', 'הפעלה'],
            privacy: 'private'
        },
        'מסיבת רווקות': {
            skipForWhom: false,
            defaultForWhom: 'לחברה',
            typicalParticipants: { min: 8, max: 30 },
            typicalVenues: ['ספא', 'וילה', 'מועדון', 'מסעדה'],
            requiredFields: ['title', 'location', 'eventDate', 'participants'],
            suggestedTasks: ['הזמנת מקום', 'הפעלות', 'קישוטים', 'אוכל'],
            privacy: 'private'
        },
        'טיול': {
            skipForWhom: false,
            defaultForWhom: null,
            typicalParticipants: { min: 2, max: 30 },
            typicalVenues: ['מלון', 'צימר', 'קמפינג', 'Airbnb'],
            requiredFields: ['title', 'destination', 'eventDate'],
            suggestedTasks: ['הזמנת לינה', 'טיסות', 'ביטוח', 'תכנון מסלול'],
            privacy: 'private'
        },
        'אירוע עבודה': {
            skipForWhom: true,
            defaultForWhom: 'לצוות',
            typicalParticipants: { min: 10, max: 200 },
            typicalVenues: ['מלון', 'מרכז כנסים', 'מסעדה'],
            requiredFields: ['title', 'location', 'eventDate', 'participants'],
            suggestedTasks: ['הזמנת מקום', 'קייטרינג', 'ציוד טכני', 'הזמנות'],
            privacy: 'private'
        },
        'כנס': {
            skipForWhom: true,
            defaultForWhom: 'מקצועי',
            typicalParticipants: { min: 50, max: 500 },
            typicalVenues: ['מרכז כנסים', 'מלון', 'אולם'],
            requiredFields: ['title', 'location', 'eventDate', 'participants'],
            suggestedTasks: ['הזמנת מקום', 'רישום משתתפים', 'מרצים', 'ציוד טכני', 'קייטרינג', 'חומרי הדרכה'],
            privacy: 'public'
        },
        'פגישה': {
            skipForWhom: true,
            defaultForWhom: 'צוות',
            typicalParticipants: { min: 2, max: 20 },
            typicalVenues: ['משרד', 'בית קפה', 'זום'],
            requiredFields: ['title', 'eventDate', 'participants'],
            suggestedTasks: ['הכנת אג\'נדה', 'שליחת הזמנה', 'הכנת מצגת'],
            privacy: 'private'
        },
        'סדנה': {
            skipForWhom: true,
            defaultForWhom: 'משתתפים',
            typicalParticipants: { min: 5, max: 30 },
            typicalVenues: ['סטודיו', 'מסעדה', 'אונליין'],
            requiredFields: ['title', 'location', 'eventDate', 'participants'],
            suggestedTasks: ['הזמנת מקום', 'חומרי סדנה', 'רשימת ציוד', 'הזמנות'],
            privacy: 'private'
        },
        'מסיבה': {
            skipForWhom: false,
            defaultForWhom: null,
            typicalParticipants: { min: 15, max: 100 },
            typicalVenues: ['מועדון', 'בר', 'בבית'],
            requiredFields: ['title', 'location', 'eventDate', 'participants'],
            suggestedTasks: ['הזמנת מקום', 'DJ', 'קישוטים', 'משקאות', 'הזמנות'],
            privacy: 'private'
        }
    };

    // שאלות מותאמות לפי סוג אירוע
    const getEventTypeQuestions = (eventType) => {
        // נרמול סוג האירוע
        const normalizedType = (eventType || '').toLowerCase().trim();
        
        const questions = {
            'יום הולדת': {
                namePrompt: 'מעולה! יום הולדת! 🎂\n\nמה השם? (למשל: "יום הולדת 30 לדני")',
                forWhomOptions: [
                    { text: 'לעצמי', action: 'for_self', icon: '👤' },
                    { text: 'לילד/ה', action: 'for_child', icon: '👶' },
                    { text: 'לבן/בת זוג', action: 'for_partner', icon: '💑' },
                    { text: 'לחבר/ה', action: 'for_friend', icon: '👫' },
                    { text: 'להורה', action: 'for_parent', icon: '👨‍👩‍👧' }
                ],
                venueOptions: [
                    { text: 'מסעדה', action: 'venue_restaurant', icon: '🍽️' },
                    { text: 'בית קפה', action: 'venue_cafe', icon: '☕' },
                    { text: 'אולם אירועים', action: 'venue_hall', icon: '🏛️' },
                    { text: 'פארק שעשועים', action: 'venue_amusement', icon: '🎡' },
                    { text: 'בבית', action: 'venue_home', icon: '🏠' },
                    { text: 'המלץ לי!', action: 'venue_recommend', icon: '💡' }
                ]
            },
            'חתונה': {
                namePrompt: 'מזל טוב! 💍\n\nמה שמות בני הזוג? (למשל: "חתונת דני ומיכל")',
                skipForWhom: true,
                venueOptions: [
                    { text: 'גן אירועים', action: 'venue_garden', icon: '🌳' },
                    { text: 'אולם אירועים', action: 'venue_hall', icon: '🏛️' },
                    { text: 'מלון', action: 'venue_hotel', icon: '🏨' },
                    { text: 'חוף הים', action: 'venue_beach', icon: '🏖️' },
                    { text: 'יקב', action: 'venue_winery', icon: '🍷' },
                    { text: 'המלץ לי!', action: 'venue_recommend', icon: '💡' }
                ]
            },
            'מסיבה': {
                namePrompt: 'סבבה! 🎊\n\nמה סוג המסיבה? (למשל: "מסיבת חברים")',
                forWhomOptions: [
                    { text: 'חברים', action: 'for_friends', icon: '👥' },
                    { text: 'משפחה', action: 'for_family', icon: '👨‍👩‍👧‍👦' },
                    { text: 'עבודה', action: 'for_work', icon: '🏢' }
                ],
                venueOptions: [
                    { text: 'מועדון', action: 'venue_club', icon: '🎉' },
                    { text: 'בר', action: 'venue_bar', icon: '🍸' },
                    { text: 'מסעדה', action: 'venue_restaurant', icon: '🍽️' },
                    { text: 'וילה/צימר', action: 'venue_villa', icon: '🏡' },
                    { text: 'בבית', action: 'venue_home', icon: '🏠' },
                    { text: 'המלץ לי!', action: 'venue_recommend', icon: '💡' }
                ]
            },
            'אירוע עבודה': {
                namePrompt: 'מצוין! 🏢\n\nמה סוג האירוע? (למשל: "כנס צוות שיווק Q4")',
                skipForWhom: true,
                venueOptions: [
                    { text: 'מלון', action: 'venue_hotel', icon: '🏨' },
                    { text: 'מרכז כנסים', action: 'venue_convention', icon: '🏛️' },
                    { text: 'מסעדה', action: 'venue_restaurant', icon: '🍽️' },
                    { text: 'אסקייפ רום', action: 'venue_escape', icon: '🔐' },
                    { text: 'פעילות גיבוש', action: 'venue_teambuilding', icon: '🎯' },
                    { text: 'המלץ לי!', action: 'venue_recommend', icon: '💡' }
                ]
            },
            'טיול': {
                namePrompt: 'יאללה! ✈️\n\nלאן הטיול? (למשל: "טיול לפריז" או "סופש בצפון")',
                forWhomOptions: [
                    { text: 'טיול זוגי', action: 'for_couple', icon: '💑' },
                    { text: 'טיול חברים', action: 'for_friends', icon: '👥' },
                    { text: 'טיול משפחתי', action: 'for_family', icon: '👨‍👩‍👧‍👦' },
                    { text: 'טיול יחיד', action: 'for_solo', icon: '🧳' }
                ],
                venueOptions: [
                    { text: 'מלון', action: 'venue_hotel', icon: '🏨' },
                    { text: 'צימר', action: 'venue_zimmer', icon: '🏡' },
                    { text: 'אכסניה', action: 'venue_hostel', icon: '🛏️' },
                    { text: 'קמפינג', action: 'venue_camping', icon: '⛺' },
                    { text: 'Airbnb', action: 'venue_airbnb', icon: '🏠' },
                    { text: 'המלץ לי!', action: 'venue_recommend', icon: '💡' }
                ]
            },
            'אירוסין': {
                namePrompt: 'מזל טוב! 💍✨\n\nמה שמות בני הזוג? (למשל: "אירוסין של דני ומיכל")',
                skipForWhom: true,
                venueOptions: [
                    { text: 'מסעדה', action: 'venue_restaurant', icon: '🍽️' },
                    { text: 'גן אירועים', action: 'venue_garden', icon: '🌳' },
                    { text: 'בית קפה', action: 'venue_cafe', icon: '☕' },
                    { text: 'מלון', action: 'venue_hotel', icon: '🏨' },
                    { text: 'יקב', action: 'venue_winery', icon: '🍷' },
                    { text: 'המלץ לי!', action: 'venue_recommend', icon: '💡' }
                ]
            },
            'בר מצווה': {
                namePrompt: 'מזל טוב! 🎉\n\nמה שם החוגג? (למשל: "בר מצווה ליוסי")',
                skipForWhom: true,
                venueOptions: [
                    { text: 'אולם אירועים', action: 'venue_hall', icon: '🏛️' },
                    { text: 'גן אירועים', action: 'venue_garden', icon: '🌳' },
                    { text: 'מסעדה', action: 'venue_restaurant', icon: '🍽️' },
                    { text: 'מלון', action: 'venue_hotel', icon: '🏨' },
                    { text: 'בית כנסת', action: 'venue_synagogue', icon: '🕍' },
                    { text: 'המלץ לי!', action: 'venue_recommend', icon: '💡' }
                ]
            },
            'בת מצווה': {
                namePrompt: 'מזל טוב! 🎉\n\nמה שם החוגגת? (למשל: "בת מצווה לנועה")',
                skipForWhom: true,
                venueOptions: [
                    { text: 'אולם אירועים', action: 'venue_hall', icon: '🏛️' },
                    { text: 'גן אירועים', action: 'venue_garden', icon: '🌳' },
                    { text: 'מסעדה', action: 'venue_restaurant', icon: '🍽️' },
                    { text: 'מלון', action: 'venue_hotel', icon: '🏨' },
                    { text: 'המלץ לי!', action: 'venue_recommend', icon: '💡' }
                ]
            },
            'ברית': {
                namePrompt: 'מזל טוב! 👶\n\nמה שם התינוק? (למשל: "ברית לאיתן")',
                skipForWhom: true,
                venueOptions: [
                    { text: 'בבית', action: 'venue_home', icon: '🏠' },
                    { text: 'בית כנסת', action: 'venue_synagogue', icon: '🕍' },
                    { text: 'אולם אירועים', action: 'venue_hall', icon: '🏛️' },
                    { text: 'מסעדה', action: 'venue_restaurant', icon: '🍽️' },
                    { text: 'המלץ לי!', action: 'venue_recommend', icon: '💡' }
                ]
            },
            'מסיבת רווקות': {
                namePrompt: 'יאללה! 🥳\n\nמי הכלה/חתן? (למשל: "רווקות של מיכל")',
                skipForWhom: true,
                venueOptions: [
                    { text: 'ספא', action: 'venue_spa', icon: '💆' },
                    { text: 'מועדון', action: 'venue_club', icon: '🎉' },
                    { text: 'וילה/צימר', action: 'venue_villa', icon: '🏡' },
                    { text: 'מסעדה', action: 'venue_restaurant', icon: '🍽️' },
                    { text: 'יאכטה', action: 'venue_yacht', icon: '🛥️' },
                    { text: 'המלץ לי!', action: 'venue_recommend', icon: '💡' }
                ]
            },
            'יום נישואין': {
                namePrompt: 'מזל טוב! 💕\n\nכמה שנות נישואין? (למשל: "10 שנות נישואין")',
                forWhomOptions: [
                    { text: 'לנו', action: 'for_self', icon: '💑' },
                    { text: 'להורים', action: 'for_parents', icon: '👨‍👩‍👧' },
                    { text: 'לחברים', action: 'for_friends', icon: '👥' }
                ],
                venueOptions: [
                    { text: 'מסעדה', action: 'venue_restaurant', icon: '🍽️' },
                    { text: 'מלון', action: 'venue_hotel', icon: '🏨' },
                    { text: 'צימר', action: 'venue_zimmer', icon: '🏡' },
                    { text: 'ספא', action: 'venue_spa', icon: '💆' },
                    { text: 'המלץ לי!', action: 'venue_recommend', icon: '💡' }
                ]
            },
            'סיום לימודים': {
                namePrompt: 'מזל טוב! 🎓\n\nמה סוג הסיום? (למשל: "סיום תואר ראשון")',
                forWhomOptions: [
                    { text: 'לעצמי', action: 'for_self', icon: '🎓' },
                    { text: 'לילד/ה', action: 'for_child', icon: '👦' },
                    { text: 'לחבר/ה', action: 'for_friend', icon: '👫' }
                ],
                venueOptions: [
                    { text: 'מסעדה', action: 'venue_restaurant', icon: '🍽️' },
                    { text: 'בר', action: 'venue_bar', icon: '🍸' },
                    { text: 'בבית', action: 'venue_home', icon: '🏠' },
                    { text: 'גן אירועים', action: 'venue_garden', icon: '🌳' },
                    { text: 'המלץ לי!', action: 'venue_recommend', icon: '💡' }
                ]
            },
            'פרישה': {
                namePrompt: 'מזל טוב! 🎊\n\nמי הפורש/ת? (למשל: "פרישה של יוסי מהעבודה")',
                forWhomOptions: [
                    { text: 'לעצמי', action: 'for_self', icon: '👤' },
                    { text: 'לעמית', action: 'for_colleague', icon: '👥' },
                    { text: 'להורה', action: 'for_parent', icon: '👨‍👩‍👧' }
                ],
                venueOptions: [
                    { text: 'מסעדה', action: 'venue_restaurant', icon: '🍽️' },
                    { text: 'אולם', action: 'venue_hall', icon: '🏛️' },
                    { text: 'משרד', action: 'venue_office', icon: '🏢' },
                    { text: 'המלץ לי!', action: 'venue_recommend', icon: '💡' }
                ]
            },
            'חנוכת בית': {
                namePrompt: 'מזל טוב! 🏠\n\nמה שם האירוע? (למשל: "חנוכת בית חדש")',
                forWhomOptions: [
                    { text: 'לנו', action: 'for_self', icon: '🏠' },
                    { text: 'לחברים', action: 'for_friends', icon: '👥' },
                    { text: 'למשפחה', action: 'for_family', icon: '👨‍👩‍👧‍👦' }
                ],
                venueOptions: [
                    { text: 'בבית החדש', action: 'venue_home', icon: '🏠' },
                    { text: 'המלץ לי!', action: 'venue_recommend', icon: '💡' }
                ]
            },
            'בייבי שאוור': {
                namePrompt: 'מזל טוב! 👶💝\n\nמי האמא לעתיד? (למשל: "בייבי שאוור לדנה")',
                forWhomOptions: [
                    { text: 'לעצמי', action: 'for_self', icon: '🤰' },
                    { text: 'לחברה', action: 'for_friend', icon: '👯' },
                    { text: 'לאחות', action: 'for_sibling', icon: '👩‍👩‍👧' }
                ],
                venueOptions: [
                    { text: 'בבית', action: 'venue_home', icon: '🏠' },
                    { text: 'בית קפה', action: 'venue_cafe', icon: '☕' },
                    { text: 'גן אירועים', action: 'venue_garden', icon: '🌳' },
                    { text: 'ספא', action: 'venue_spa', icon: '💆' },
                    { text: 'המלץ לי!', action: 'venue_recommend', icon: '💡' }
                ]
            },
            'ארוחת שבת': {
                namePrompt: 'שבת שלום! 🕯️\n\nמה האירוע? (למשל: "ארוחת שבת משפחתית")',
                forWhomOptions: [
                    { text: 'משפחה', action: 'for_family', icon: '👨‍👩‍👧‍👦' },
                    { text: 'חברים', action: 'for_friends', icon: '👥' },
                    { text: 'קהילה', action: 'for_community', icon: '🏘️' }
                ],
                venueOptions: [
                    { text: 'בבית', action: 'venue_home', icon: '🏠' },
                    { text: 'בית כנסת', action: 'venue_synagogue', icon: '🕍' },
                    { text: 'המלץ לי!', action: 'venue_recommend', icon: '💡' }
                ]
            },
            'חג': {
                namePrompt: 'חג שמח! 🎊\n\nאיזה חג? (למשל: "סדר פסח" או "חנוכיה משפחתית")',
                forWhomOptions: [
                    { text: 'משפחה', action: 'for_family', icon: '👨‍👩‍👧‍👦' },
                    { text: 'חברים', action: 'for_friends', icon: '👥' },
                    { text: 'קהילה', action: 'for_community', icon: '🏘️' }
                ],
                venueOptions: [
                    { text: 'בבית', action: 'venue_home', icon: '🏠' },
                    { text: 'בית כנסת', action: 'venue_synagogue', icon: '🕍' },
                    { text: 'אולם', action: 'venue_hall', icon: '🏛️' },
                    { text: 'המלץ לי!', action: 'venue_recommend', icon: '💡' }
                ]
            },
            'אזכרה': {
                namePrompt: 'זכרונו לברכה 🕯️\n\nמה שם האירוע? (למשל: "אזכרה לסבתא שרה")',
                forWhomOptions: [
                    { text: 'משפחה', action: 'for_family', icon: '👨‍👩‍👧‍👦' },
                    { text: 'חברים', action: 'for_friends', icon: '👥' }
                ],
                venueOptions: [
                    { text: 'בבית', action: 'venue_home', icon: '🏠' },
                    { text: 'בית כנסת', action: 'venue_synagogue', icon: '🕍' },
                    { text: 'בית עלמין', action: 'venue_cemetery', icon: '🪦' },
                    { text: 'המלץ לי!', action: 'venue_recommend', icon: '💡' }
                ]
            },
            'כנס': {
                namePrompt: 'מצוין! 🎤\n\nמה נושא הכנס? (למשל: "כנס טכנולוגיה 2024")',
                skipForWhom: true,
                venueOptions: [
                    { text: 'מרכז כנסים', action: 'venue_convention', icon: '🏛️' },
                    { text: 'מלון', action: 'venue_hotel', icon: '🏨' },
                    { text: 'אולם', action: 'venue_hall', icon: '🎭' },
                    { text: 'אונליין', action: 'venue_online', icon: '💻' },
                    { text: 'המלץ לי!', action: 'venue_recommend', icon: '💡' }
                ]
            },
            'סדנה': {
                namePrompt: 'מעולה! 🎨\n\nמה נושא הסדנה? (למשל: "סדנת בישול איטלקי")',
                skipForWhom: true,
                venueOptions: [
                    { text: 'סטודיו', action: 'venue_studio', icon: '🎨' },
                    { text: 'מסעדה', action: 'venue_restaurant', icon: '🍽️' },
                    { text: 'בבית', action: 'venue_home', icon: '🏠' },
                    { text: 'אונליין', action: 'venue_online', icon: '💻' },
                    { text: 'המלץ לי!', action: 'venue_recommend', icon: '💡' }
                ]
            },
            'פגישה': {
                namePrompt: 'בסדר! 📅\n\nמה נושא הפגישה? (למשל: "פגישת צוות שבועית")',
                skipForWhom: true,
                venueOptions: [
                    { text: 'משרד', action: 'venue_office', icon: '🏢' },
                    { text: 'בית קפה', action: 'venue_cafe', icon: '☕' },
                    { text: 'מלון', action: 'venue_hotel', icon: '🏨' },
                    { text: 'זום/אונליין', action: 'venue_online', icon: '💻' },
                    { text: 'המלץ לי!', action: 'venue_recommend', icon: '💡' }
                ]
            },
            'אירוע ספורט': {
                namePrompt: 'יאללה! ⚽\n\nמה סוג האירוע? (למשל: "משחק כדורגל חברים")',
                forWhomOptions: [
                    { text: 'חברים', action: 'for_friends', icon: '👥' },
                    { text: 'צוות', action: 'for_team', icon: '🏃' },
                    { text: 'משפחה', action: 'for_family', icon: '👨‍👩‍👧‍👦' }
                ],
                venueOptions: [
                    { text: 'מגרש', action: 'venue_field', icon: '⚽' },
                    { text: 'חדר כושר', action: 'venue_gym', icon: '🏋️' },
                    { text: 'פארק', action: 'venue_park', icon: '🌳' },
                    { text: 'בריכה', action: 'venue_pool', icon: '🏊' },
                    { text: 'המלץ לי!', action: 'venue_recommend', icon: '💡' }
                ]
            },
            'הופעה': {
                namePrompt: 'מגניב! 🎵\n\nמה ההופעה? (למשל: "הופעה של עידן רייכל")',
                forWhomOptions: [
                    { text: 'לעצמי', action: 'for_self', icon: '🎵' },
                    { text: 'עם חברים', action: 'for_friends', icon: '👥' },
                    { text: 'עם בן/בת זוג', action: 'for_partner', icon: '💑' }
                ],
                venueOptions: [
                    { text: 'אולם הופעות', action: 'venue_concert', icon: '🎤' },
                    { text: 'בר', action: 'venue_bar', icon: '🍸' },
                    { text: 'פארק', action: 'venue_park', icon: '🌳' },
                    { text: 'המלץ לי!', action: 'venue_recommend', icon: '💡' }
                ]
            },
            'פיקניק': {
                namePrompt: 'נשמע כיף! 🧺\n\nמה האירוע? (למשל: "פיקניק משפחתי בפארק")',
                forWhomOptions: [
                    { text: 'משפחה', action: 'for_family', icon: '👨‍👩‍👧‍👦' },
                    { text: 'חברים', action: 'for_friends', icon: '👥' },
                    { text: 'זוגי', action: 'for_couple', icon: '💑' }
                ],
                venueOptions: [
                    { text: 'פארק', action: 'venue_park', icon: '🌳' },
                    { text: 'חוף', action: 'venue_beach', icon: '🏖️' },
                    { text: 'יער', action: 'venue_forest', icon: '🌲' },
                    { text: 'המלץ לי!', action: 'venue_recommend', icon: '💡' }
                ]
            },
            'על האש': {
                namePrompt: 'יאללה מנגל! 🔥\n\nמה האירוע? (למשל: "על האש עם החבר\'ה")',
                forWhomOptions: [
                    { text: 'חברים', action: 'for_friends', icon: '👥' },
                    { text: 'משפחה', action: 'for_family', icon: '👨‍👩‍👧‍👦' },
                    { text: 'עבודה', action: 'for_work', icon: '🏢' }
                ],
                venueOptions: [
                    { text: 'פארק', action: 'venue_park', icon: '🌳' },
                    { text: 'בבית', action: 'venue_home', icon: '🏠' },
                    { text: 'חוף', action: 'venue_beach', icon: '🏖️' },
                    { text: 'יער', action: 'venue_forest', icon: '🌲' },
                    { text: 'המלץ לי!', action: 'venue_recommend', icon: '💡' }
                ]
            }
        };
        
        // בדיקה לפי שם מדויק או חלקי
        if (questions[eventType]) {
            return questions[eventType];
        }
        
        // בדיקה לפי תוכן
        if (normalizedType.includes('אירוסין') || normalizedType.includes('הצעת נישואין')) {
            return questions['אירוסין'];
        }
        if (normalizedType.includes('בר מצווה') || normalizedType.includes('בר-מצווה')) {
            return questions['בר מצווה'];
        }
        if (normalizedType.includes('בת מצווה') || normalizedType.includes('בת-מצווה')) {
            return questions['בת מצווה'];
        }
        if (normalizedType.includes('ברית')) {
            return questions['ברית'];
        }
        if (normalizedType.includes('יום הולדת') || normalizedType.includes('הולדת')) {
            return questions['יום הולדת'];
        }
        if (normalizedType.includes('חתונה')) {
            return questions['חתונה'];
        }
        if (normalizedType.includes('מסיבה')) {
            return questions['מסיבה'];
        }
        if (normalizedType.includes('עבודה') || normalizedType.includes('כנס') || normalizedType.includes('גיבוש')) {
            return questions['אירוע עבודה'];
        }
        if (normalizedType.includes('טיול') || normalizedType.includes('נסיעה') || normalizedType.includes('חופשה')) {
            return questions['טיול'];
        }
        if (normalizedType.includes('רווק') || normalizedType.includes('bachelor')) {
            return questions['מסיבת רווקות'];
        }
        if (normalizedType.includes('פגישה') || normalizedType.includes('meeting')) {
            return questions['פגישה'];
        }
        if (normalizedType.includes('נישואין') || normalizedType.includes('anniversary')) {
            return questions['יום נישואין'];
        }
        if (normalizedType.includes('סיום') || normalizedType.includes('graduation')) {
            return questions['סיום לימודים'];
        }
        if (normalizedType.includes('פרישה') || normalizedType.includes('retirement')) {
            return questions['פרישה'];
        }
        if (normalizedType.includes('חנוכת בית') || normalizedType.includes('housewarming')) {
            return questions['חנוכת בית'];
        }
        if (normalizedType.includes('בייבי') || normalizedType.includes('baby shower')) {
            return questions['בייבי שאוור'];
        }
        if (normalizedType.includes('שבת')) {
            return questions['ארוחת שבת'];
        }
        if (normalizedType.includes('חג') || normalizedType.includes('סדר') || normalizedType.includes('חנוכ')) {
            return questions['חג'];
        }
        if (normalizedType.includes('אזכרה') || normalizedType.includes('זיכרון')) {
            return questions['אזכרה'];
        }
        if (normalizedType.includes('סדנ') || normalizedType.includes('workshop')) {
            return questions['סדנה'];
        }
        if (normalizedType.includes('ספורט') || normalizedType.includes('כדור') || normalizedType.includes('ריצה')) {
            return questions['אירוע ספורט'];
        }
        if (normalizedType.includes('הופעה') || normalizedType.includes('קונצרט') || normalizedType.includes('מופע')) {
            return questions['הופעה'];
        }
        if (normalizedType.includes('פיקניק')) {
            return questions['פיקניק'];
        }
        if (normalizedType.includes('מנגל') || normalizedType.includes('על האש') || normalizedType.includes('אש')) {
            return questions['על האש'];
        }

        return questions[eventType] || {
            namePrompt: 'מעולה! 😊\n\nמה שם האירוע?',
            forWhomOptions: [
                { text: 'לעצמי', action: 'for_self', icon: '👤' },
                { text: 'לבן/בת זוג', action: 'for_partner', icon: '💑' },
                { text: 'למשפחה', action: 'for_family', icon: '👨‍👩‍👧‍👦' },
                { text: 'לחברים', action: 'for_friends', icon: '👥' },
                { text: 'לעבודה', action: 'for_work', icon: '🏢' }
            ],
            venueOptions: [
                { text: 'אולם', action: 'venue_hall', icon: '🏛️' },
                { text: 'מסעדה', action: 'venue_restaurant', icon: '🍽️' },
                { text: 'קפה', action: 'venue_cafe', icon: '☕' },
                { text: 'מועדון', action: 'venue_club', icon: '🎉' },
                { text: 'פארק', action: 'venue_park', icon: '🌳' },
                { text: 'המלץ!', action: 'venue_recommend', icon: '💡' }
            ]
        };
    };

    useEffect(() => {
        addBotMessage(
            'שלום! 👋 אני עוזר AI שעוזר לך ליצור אירוע.\n\nאיזה סוג אירוע?',
            [
                { text: 'יום הולדת', action: 'type_birthday', icon: '🎂' },
                { text: 'חתונה', action: 'type_wedding', icon: '💒' },
                { text: 'אירוסין', action: 'type_engagement', icon: '💍' },
                { text: 'בר/בת מצווה', action: 'type_barmitzvah', icon: '✡️' },
                { text: 'ברית/זבד הבת', action: 'type_brit', icon: '👶' },
                { text: 'מסיבה', action: 'type_party', icon: '🎊' },
                { text: 'רווקות/רווקים', action: 'type_bachelor', icon: '🥳' },
                { text: 'טיול', action: 'type_trip', icon: '✈️' },
                { text: 'אירוע עבודה', action: 'type_work', icon: '🏢' },
                { text: 'פגישה', action: 'type_meeting', icon: '📅' },
                { text: 'אחר', action: 'type_other', icon: '📝' }
            ]
        );
    }, []);

    // ✅ גלילה למטה - תמיד ומיידית
    const scrollToBottom = (force = false) => {
        if (force || !isUserScrolling) {
            // גלילה מיידית
            if (messagesEndRef.current) {
                messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
            }
            
            // גם דרך הקונטיינר כגיבוי
            setTimeout(() => {
                if (messagesContainerRef.current) {
                    const container = messagesContainerRef.current;
                    container.scrollTo({
                        top: container.scrollHeight,
                        behavior: 'smooth'
                    });
                }
            }, 50);
            
            // עוד פעם אחרי רגע לוודא
            setTimeout(() => {
                if (messagesEndRef.current) {
                    messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
                }
            }, 300);
        }
    };

    // ✅ בדיקה אם המשתמש בתחתית השיחה
    const checkIfAtBottom = () => {
        if (!messagesContainerRef.current) return true;
        const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
        const threshold = 100; // פיקסלים מתחתית
        return scrollHeight - scrollTop - clientHeight < threshold;
    };

    // ✅ טיפול בגלילה ידנית של המשתמש
    const handleUserScroll = () => {
        const atBottom = checkIfAtBottom();
        setShowScrollToBottom(!atBottom);
        
        if (!atBottom) {
            setIsUserScrolling(true);
            
            // איפוס אחרי 2 שניות של חוסר פעילות
            if (userScrollTimeoutRef.current) {
                clearTimeout(userScrollTimeoutRef.current);
            }
            userScrollTimeoutRef.current = setTimeout(() => {
                setIsUserScrolling(false);
            }, 2000);
        } else {
            setIsUserScrolling(false);
        }
    };

    useEffect(() => {
        // גלילה אוטומטית תמיד כשיש הודעה חדשה
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        // גלילה גם כשהמקומות/מצבים משתנים
        scrollToBottom();
    }, [searchedPlaces, isLoading, isGeneratingPlan, allPlacesVisible, showConfirmation, showDatePicker, showPlaceDetails]);

    // ✅ Focus על input כשמתחיל שלב חדש (ללא גלילה מיותרת)
    useEffect(() => {
        if (!isLoading && !isGeneratingPlan && !isCreatingEvent && inputRef.current) {
            if (!showDatePicker && !showPlaceDetails && !showConfirmation) {
                setTimeout(() => {
                    inputRef.current?.focus({ preventScroll: true });
                }, 300);
            }
        }
    }, [messages.length, isLoading, isGeneratingPlan, isCreatingEvent, showDatePicker, showPlaceDetails, showConfirmation]);

    // ✅ VisualViewport API - טיפול במקלדת ווירטואלית (Web/PWA)
    useEffect(() => {
        if (typeof window === 'undefined' || !window.visualViewport) return;

        const handleViewportResize = () => {
            const viewport = window.visualViewport;
            const windowHeight = window.innerHeight;
            const viewportHeight = viewport.height;
            
            // חישוב גובה המקלדת
            const keyboardOpen = windowHeight - viewportHeight > 100;
            const calculatedKeyboardHeight = keyboardOpen ? windowHeight - viewportHeight : 0;
            
            setKeyboardHeight(calculatedKeyboardHeight);
            
            // גלילה אוטומטית כשהמקלדת נפתחת
            if (keyboardOpen) {
                setTimeout(() => scrollToBottom(true), 150);
            }
        };

        window.visualViewport.addEventListener('resize', handleViewportResize);
        window.visualViewport.addEventListener('scroll', handleViewportResize);

        return () => {
            if (window.visualViewport) {
                window.visualViewport.removeEventListener('resize', handleViewportResize);
                window.visualViewport.removeEventListener('scroll', handleViewportResize);
            }
        };
    }, []);

    // ✅ גלילה למטה כשהמקלדת נפתחת - עם ריטריי
    useEffect(() => {
        if (keyboardHeight > 0) {
            setTimeout(() => scrollToBottom(true), 100);
            setTimeout(() => scrollToBottom(true), 300);
        }
    }, [keyboardHeight]);

    const addBotMessage = (text, actions = []) => {
        setMessages(prev => [...prev, { type: 'bot', text, actions, timestamp: new Date() }]);
    };

    const addUserMessage = (text) => {
        setMessages(prev => [...prev, { type: 'user', text, timestamp: new Date() }]);
    };

    const updateStepProgress = (stepName) => {
        const stepMapping = {
            'welcome': 0,
            'event_type': 1,
            'event_name': 2,
            'participants': 3,
            'for_whom': 4,
            'location_city': 5,
            'location_specific': 5,
            'location_selection': 5,
            'venue_preference': 5,
            'date_selection': 6,
            'editing': 7
        };
        
        const newIndex = stepMapping[stepName] || currentStepIndex;
        setCurrentStepIndex(newIndex);
    };

    // 🆕 פונקציה חדשה: זיהוי אם המשתמש שואל שאלה או מאתגר את הבוט
    const detectUserIntent = (userInput) => {
        const lowerInput = userInput.toLowerCase().trim();
        
        // זיהוי שאלות
        const questionPatterns = [
            /^(מה|איך|למה|מתי|איפה|האם|כמה|איזה|מי)\s/,
            /\?$/,
            /^(אפשר|יכול|תוכל|אני יכול)/,
            /^(מה זה|מה זאת|הסבר|תסביר)/
        ];
        
        // זיהוי אתגורים או ביקורת
        const challengePatterns = [
            /לא מבין/,
            /לא רוצה/,
            /למה אתה שואל/,
            /כבר אמרתי/,
            /שאלת כבר/,
            /לא רלוונטי/,
            /בוא נתחיל מחדש/,
            /התחל מחדש/,
            /אני מבולבל/,
            /לא ברור/,
            /מה הולך פה/,
            /עזוב/,
            /לא משנה/,
            /תדלג/,
            /דלג/,
            /skip/
        ];
        
        // זיהוי בקשות לעזרה
        const helpPatterns = [
            /עזרה/,
            /help/,
            /מה אפשר/,
            /אפשרויות/,
            /תן לי דוגמא/,
            /דוגמה/,
            /למשל/
        ];

        // זיהוי רצון לחזור אחורה
        const backPatterns = [
            /חזור/,
            /אחורה/,
            /שלב קודם/,
            /לשנות את/,
            /רוצה לתקן/
        ];

        const isQuestion = questionPatterns.some(p => p.test(lowerInput));
        const isChallenge = challengePatterns.some(p => p.test(lowerInput));
        const isHelpRequest = helpPatterns.some(p => p.test(lowerInput));
        const isBackRequest = backPatterns.some(p => p.test(lowerInput));
        
        return {
            isQuestion,
            isChallenge,
            isHelpRequest,
            isBackRequest,
            needsSpecialHandling: isQuestion || isChallenge || isHelpRequest || isBackRequest
        };
    };

    // 🆕 פונקציה חדשה: תשובה חכמה לשאלות/אתגורים
    const handleFreeFormInput = async (userInput, context) => {
        try {
            console.log('[EventCreationChat] 💬 Handling free-form input...');

            const prompt = `אתה עוזר AI ידידותי ואנושי ליצירת אירועים בשם "פלנורה". 

**ההקשר הנוכחי:**
- אנחנו בתהליך יצירת אירוע
- שלב נוכחי: ${context.step}
- מידע שנאסף עד כה:
  * סוג אירוע: ${context.eventType || 'טרם נקבע'}
  * שם: ${context.title || 'טרם נקבע'}
  * משתתפים: ${context.participants || 'טרם נקבע'}
  * מיקום: ${context.destination || context.location || 'טרם נקבע'}
  * למי: ${context.forWhom || 'טרם נקבע'}

**המשתמש אמר:** "${userInput}"

**המשימה שלך:**
1. הבן מה המשתמש רוצה או שואל
2. תן תשובה קצרה, ידידותית ועוזרת בעברית
3. אם זו שאלה על התהליך - הסבר בקצרה
4. אם המשתמש מתוסכל - הרגע אותו והצע לעזור
5. אם הוא רוצה לדלג/לשנות - אשר לו שזה בסדר
6. תמיד סיים עם הנעה להמשך התהליך

**חוקים:**
- תשובה קצרה (2-3 משפטים מקסימום)
- טון ידידותי ואנושי, לא רובוטי
- השתמש באימוג'י אחד מקסימום
- אל תחזור על מידע שכבר נאסף

החזר JSON:
{
  "response": "התשובה שלך למשתמש",
  "shouldContinueFlow": true/false (האם להמשיך בתהליך הרגיל אחרי התשובה),
  "suggestedAction": "continue" / "skip_step" / "go_back" / "restart" / null,
  "extractedData": { כל מידע רלוונטי שחילצת מהקלט או null }
}`;

            const result = await base44.integrations.Core.InvokeLLM({
                prompt,
                add_context_from_internet: false,
                response_json_schema: {
                    type: 'object',
                    properties: {
                        response: { type: 'string' },
                        shouldContinueFlow: { type: 'boolean' },
                        suggestedAction: { type: 'string' },
                        extractedData: { type: 'object' }
                    }
                }
            });

            console.log('[EventCreationChat] 💬 Free-form response:', result);
            return result;
        } catch (error) {
            console.error('[EventCreationChat] ❌ Free-form handling failed:', error);
            return {
                response: 'אני כאן לעזור! בוא נמשיך ביצירת האירוע 😊',
                shouldContinueFlow: true,
                suggestedAction: 'continue',
                extractedData: null
            };
        }
    };

    // 🆕 פונקציה חדשה: חישוב השלב הבא בצורה דינמית
    const calculateNextStep = (currentData) => {
        // בדיקה מה חסר ומהו השלב הבא ההגיוני
        if (!currentData.eventType) return 'welcome';
        if (!currentData.title) return 'event_name';
        if (!currentData.participants) return 'participants';
        
        // 🆕 בדיקה אם צריך לדלג על "למי האירוע"
        const eventDefaults = EVENT_TYPE_DEFAULTS[currentData.eventType];
        const shouldSkipForWhom = eventDefaults?.skipForWhom || 
            SKIP_FOR_WHOM_EVENTS.some(e => currentData.eventType?.includes(e));
        
        if (!currentData.forWhom && !shouldSkipForWhom) return 'for_whom';
        
        if (!currentData.destination) return 'location_city';
        if (!currentData.location && !currentData.locationPollEnabled && !currentData.venuePreference) return 'venue_preference';
        if (!currentData.privacy) return 'privacy_selection';
        if (!currentData.eventDate && !currentData.datePollEnabled) return 'date_selection';
        return 'summary';
    };

    // 🆕 פונקציה חדשה: בניית הודעת אישור דינמית
    const buildAcknowledgmentMessage = (extractedData, previousData) => {
        const parts = [];
        
        if (extractedData.eventType && !previousData.eventType) {
            parts.push(`${extractedData.eventType}`);
        }
        if (extractedData.title && !previousData.title) {
            parts.push(`"${extractedData.title}"`);
        }
        if (extractedData.participants && !previousData.participants) {
            parts.push(`${extractedData.participants} משתתפים`);
        }
        if (extractedData.destination && !previousData.destination) {
            parts.push(`ב${extractedData.destination}`);
        }
        if (extractedData.forWhom && !previousData.forWhom) {
            parts.push(`${extractedData.forWhom}`);
        }

        if (parts.length === 0) return null;
        if (parts.length === 1) return `מעולה! ${parts[0]}! 😊`;
        return `קלטתי! ${parts.join(', ')}! 🎯`;
    };

    const analyzeUserInputSmart = async (userInput, context) => {
        try {
            console.log('[EventCreationChat] 🧠 Smart Analysis...');

            const prompt = `אתה עוזר AI חכם ואנושי ליצירת אירועים. תפקידך לנתח את תשובת המשתמש בצורה גמישה ולחלץ **כל** מידע רלוונטי, גם אם המשתמש סיפק תשובות למספר שלבים בבת אחת.

**הקשר השיחה:**
- שלב נוכחי: ${context.step}
- מידע שכבר נאסף:
  * כותרת: ${context.title || 'לא הוגדר'}
  * תיאור: ${context.description || 'לא הוגדר'}
  * סוג אירוע: ${context.eventType || 'לא הוגדר'}
  * משתתפים: ${context.participants || 'לא הוגדר'}
  * יעד/עיר: ${context.destination || 'לא הוגדר'}
  * סוג מקום מועדף: ${context.venuePreference || 'לא הוגדר'}
  * למי האירוע: ${context.forWhom || 'לא הוגדר'}

**תשובת המשתמש:** "${userInput}"

**המשימה שלך:**
חלץ **כל** מידע שימושי מהקלט! המשתמש יכול לתת תשובה מורכבת כמו "יום הולדת 30 למיכל ב-20 חברים בתל אביב" - חלץ הכל!

**מידע לחילוץ:**
1. **eventType** - סוג האירוע (יום_הולדת/חתונה/מסיבה/בר_מצווה/אירוע_עבודה/כנס/מסיבת_רווקות/טיול/אחר)
2. **title** - שם האירוע אם הוזכר (למשל "יום הולדת 30 למיכל")
3. **destination** - יעד או שם עיר
4. **city** - שם עיר ספציפי
5. **participants** - מספר משתתפים (רק מספר)
6. **placeType** - סוג המקום (בית_קפה/מסעדה/אולם_אירועים/מועדון/פארק/צימר/מלון/גן_אירועים)
7. **activityType** - סוג פעילות
8. **keywords** - מילות מפתח לחיפוש
9. **needsAccommodation** - האם צריך לינה (boolean)
10. **forWhom** - למי האירוע (לעצמי/לבן_זוג/לחבר/למשפחה/לעבודה/לילדים)
11. **budget** - תקציב
12. **style** - סגנון (יוקרתי/משפחתי/בטבע/מסיבה/פורמלי)
13. **dateInfo** - מידע על תאריך
14. **description** - תיאור קצר
15. **isRecurring** - האם זה אירוע חוזר (boolean) - זהה מילים כמו: כל שבוע/חוזר/קבוע/שבועי/חודשי/שנתי
16. **recurrencePattern** - תדירות החזרה (DAILY/WEEKLY/MONTHLY_BY_DAY_OF_MONTH/YEARLY) אם זוהה
17. **recurrenceInterval** - מרווח חזרה (מספר) - למשל "כל שבועיים" = 2

**חשוב מאוד:**
- חלץ כמה שיותר מידע! אם המשתמש נתן תשובה מורכבת - פרק אותה
- אם יש מספר + "אנשים/חברים/משתתפים" = זה participants
- אם יש שם עיר = זה destination
- אם אין מידע - החזר null

החזר רק JSON תקין:`;

            const result = await base44.integrations.Core.InvokeLLM({
                prompt,
                add_context_from_internet: false,
                response_json_schema: {
                    type: 'object',
                    properties: {
                        eventType: { type: 'string' },
                        destination: { type: 'string' },
                        city: { type: 'string' },
                        participants: { type: 'number' },
                        placeType: { type: 'string' },
                        activityType: { type: 'string' },
                        keywords: { type: 'array', items: { type: 'string' } },
                        needsAccommodation: { type: 'boolean' },
                        forWhom: { type: 'string' },
                        budget: { type: 'string' },
                        style: { type: 'string' },
                        dateInfo: { type: 'string' },
                        description: { type: 'string' },
                        isRecurring: { type: 'boolean' },
                        recurrencePattern: { type: 'string' },
                        recurrenceInterval: { type: 'number' }
                    }
                }
            });

            console.log('[EventCreationChat] ✅ Smart Analysis:', result);
            return result;
        } catch (error) {
            console.error('[EventCreationChat] ❌ Smart analysis failed:', error);
            return analyzeUserInputSimple(userInput);
        }
    };

    const analyzeUserInputSimple = (userInput) => {
        console.log('[EventCreationChat] 🔍 Simple fallback analysis...');

        const lowerInput = userInput.toLowerCase();

        let eventType = 'אחר';
        if (lowerInput.includes('טיול') || lowerInput.includes('נסיעה')) eventType = 'טיול';
        else if (lowerInput.includes('חתונה')) eventType = 'חתונה';
        else if (lowerInput.includes('מסיבה') || lowerInput.includes('יום הולדת')) eventType = 'מסיבה';
        else if (lowerInput.includes('בר מצווה') || lowerInput.includes('בת מצווה')) eventType = 'בר_מצווה';
        else if (lowerInput.includes('כנס') || lowerInput.includes('עבודה')) eventType = 'כנס';
        else if (lowerInput.includes('רווקות') || lowerInput.includes('רווקים')) eventType = 'מסיבת_רווקות';

        let participants = null;
        const numberMatch = userInput.match(/(\d+)\s*(אנשים|חברים|משתתפים|איש|נפר|אורחים)/);
        if (numberMatch) participants = parseInt(numberMatch[1]);

        const cities = ['תל אביב', 'ירושלים', 'חיפה', 'אילת', 'באר שבע', 'נתניה',
            'פריז', 'לונדון', 'ניו יורק', 'ברלין', 'רומא', 'אמסטרדם',
            'ברצלונה', 'מדריד', 'פראג', 'וינה', 'בודפשט', 'יוון', 'אתונה'];

        let destination = null;
        let city = null;

        for (const cityName of cities) {
            if (lowerInput.includes(cityName.toLowerCase())) {
                destination = cityName;
                city = cityName;
                break;
            }
        }

        const needsAccommodation = lowerInput.includes('טיסה') ||
            lowerInput.includes('לינה') ||
            lowerInput.includes('מלון') ||
            eventType === 'טיול';

        let keywords = [];
        if (needsAccommodation) keywords.push('מלונות');
        if (lowerInput.includes('מסעדה')) keywords.push('מסעדות');
        if (lowerInput.includes('אולם')) keywords.push('אולמות');

        let placeType = null;
        if (lowerInput.includes('בית קפה') || lowerInput.includes('קפה')) placeType = 'בית קפה';
        else if (lowerInput.includes('מסעדה')) placeType = 'מסעשה';
        else if (lowerInput.includes('אולם אירועים') || lowerInput.includes('אולם')) placeType = 'אולם אירועים';
        else if (lowerInput.includes('מועדון')) placeType = 'מועדון';
        else if (lowerInput.includes('פארק') || lowerInput.includes('טבע')) placeType = 'פארק';
        else if (lowerInput.includes('צימר')) placeType = 'צימר';
        else if (lowerInput.includes('מלון')) placeType = 'מלון';
        else if (lowerInput.includes('גן אירועים') || lowerInput.includes('גן')) placeType = 'גן אירועים';

        let activityType = null;
        if (lowerInput.includes('סדנה')) activityType = 'סדנה';
        else if (lowerInput.includes('הפעלה')) activityType = 'הפעלה';
        else if (lowerInput.includes('ארוחה')) activityType = 'ארוחה';
        else if (lowerInput.includes('mסיבה')) activityType = 'מסיבה';
        else if (lowerInput.includes('טיול') || lowerInput.includes('מסלול')) activityType = 'טיול';

        return {
            eventType,
            destination,
            city,
            participants,
            placeType,
            activityType,
            keywords,
            needsAccommodation,
            forWhom: null,
            budget: null,
            style: null,
            description: null
        };
    };

    const searchPlaces = async (analysis) => {
        try {
            setIsLoading(true);
            addBotMessage('מחפש מקומות... 🔍', []);

            const city = analysis?.city || analysis?.destination || eventData.destination || '';

            if (!city) {
                addBotMessage(
                    'לא זיהיתי את העיר 🤔 איזו עיר?',
                    [{ text: 'הזן מקום ידנית', action: 'manual_location', icon: '📍' }]
                );
                setCurrentStep('location_specific');
                updateStepProgress('location_specific');
                setIsLoading(false);
                return;
            }

            const normalizeText = (text) => {
                if (!text) return '';
                return text.replace(/_/g, ' ');
            };

            let searchQuery = '';

            if (eventData.venuePreference && eventData.venuePreference !== 'recommend' && eventData.venuePreference !== 'אחר') {
                searchQuery = `${normalizeText(eventData.venuePreference)} ${city}`;
            }
            else if (eventData.venuePreference === 'recommend') {
                const eventTypeText = normalizeText(eventData.eventType || analysis?.eventType || 'אירוע');
                const participantsText = eventData.participants ? ` ${eventData.participants} איש` : '';
                searchQuery = `${eventTypeText}${participantsText} ${city}`;
            }
            else if (analysis?.placeType) {
                searchQuery = `${normalizeText(analysis.placeType)} ${city}`;
            }
            else if (analysis?.needsAccommodation) {
                searchQuery = `מלונות ${city}`;
            }
            else {
                const eventTypeText = normalizeText(eventData.eventType || analysis?.eventType || '');
                searchQuery = eventTypeText ? `${eventTypeText} ${city}` : `אטרקציות ${city}`;
            }

            console.log('[EventCreationChat] 🔍 Smart search query:', searchQuery);

            const places = await googleSearchPlaces(searchQuery);

            if (!places || places.length === 0) {
                addBotMessage(
                    `לא מצאתי מקומות ב"${city}" 😕`,
                    [
                        { text: 'כתוב מקום', action: 'manual_location', icon: '✏️' },
                        { text: 'חיפוש אחר', action: 'retry_search', icon: '🔄' }
                    ]
                );
                setCurrentStep('location_specific');
                updateStepProgress('location_specific');
                setIsLoading(false);
                return;
            }

            console.log('[EventCreationChat] 📍 Found places:', places.length);

            console.log('[EventCreationChat] 📝 Translating place names to Hebrew...');
            const translationPrompt = `אתה מתרגם מומחה. תרגם את שמות המקומות הבאים לעברית בצורה טבעית ומקומית.

**חוקים חשובים:**
1. אם השם כבר בעברית במלואו - החזר אותו כמו שהוא בדיוק.
2. אם השם הוא שם עסק או מותג באנגלית - שמור את השם המקורי וספק תרגום חלקי אם נדרש.
3. אם השם מכיל שם עסק + מילה תיאורית (כמו "Hotel", "Restaurant") - תרגם רק את המילה התיאורית לעברית.
4. שמור על שמות עסקים וסניפים במקור - לא לתרגם שמות מותגים!

דוגמאות:
- "Dan Panorama Tel Aviv" → "מלון דן פנורמה תל אביב"
- "Cafe Noir" → "קפה נואר" (שם מותג - לא לתרגם)
- "Max Brenner Chocolate Bar" → "מקס ברנר צ'וקולט בר"
- "מלון אורכידאה" → "מלון אורכידאה" (כבר בעברית)

רשימת מקומות לתרגום:
${places.slice(0, 20).map((p, i) => `${i + 1}. ${p.name}`).join('\n')}

החזר JSON מדויק בפורמט:
[
  {"original": "שם מקורי מדויק", "translated": "שם מתורגם/מקורי בעברית"},
  ...
]

**חשוב מאוד: אם השם כבר בעברית, השתמש בו בדיוק כמו שהוא ב-translated!**`;

            try {
                const translatedNames = await base44.integrations.Core.InvokeLLM({
                    prompt: translationPrompt,
                    add_context_from_internet: false,
                    response_json_schema: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                original: { type: 'string' },
                                translated: { type: 'string' }
                            }
                        }
                    }
                });

                console.log('[EventCreationChat] ✅ Translated names:', translatedNames);

                const finalPlaces = places.map(place => {
                    const translation = translatedNames.find(t => t.original === place.name);
                    return {
                        ...place,
                        name: translation?.translated || place.name
                    };
                });
                
                console.log('[EventCreationChat] 📍 Final places with Hebrew names:', finalPlaces);

                setSearchedPlaces(finalPlaces);
            } catch (translationError) {
                console.warn('[EventCreationChat] ⚠️ Translation failed, using original names:', translationError);
                setSearchedPlaces(places);
            }

            setSelectedPlacesForPoll([]);
            setVisiblePlacesCount(6);
            setAllPlacesVisible(false);

            const placesMessage = `מצאתי ${places.length} מקומות! 📍`;
            addBotMessage(placesMessage, []);

            setCurrentStep('location_selection');
            updateStepProgress('location_selection');

        } catch (error) {
            console.error('[EventCreationChat] ❌ Search failed:', error);
            addBotMessage(
                `שגיאה בחיפוש 😕`,
                [{ text: 'כתוב מקום', action: 'manual_location', icon: '✏️' }]
            );
            setCurrentStep('location_specific');
            updateStepProgress('location_specific');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSend = async () => {
        if (!input.trim() || isLoading || isCreatingEvent) return;

        const userInput = input.trim();
        addUserMessage(userInput);
        setInput('');
        setIsLoading(true);

        try {
            // 🆕 בדיקת כוונת המשתמש - שאלה/אתגור/עזרה
            const userIntent = detectUserIntent(userInput);
            
            // 🆕 טיפול בשאלות/אתגורים בצורה חכמה
            if (userIntent.needsSpecialHandling) {
                console.log('[EventCreationChat] 🎯 Special handling needed:', userIntent);
                
                const freeFormResult = await handleFreeFormInput(userInput, {
                    step: currentStep,
                    ...eventData
                });
                
                // הצג את התשובה החכמה
                addBotMessage(freeFormResult.response, []);
                
                // טיפול בפעולות מוצעות
                if (freeFormResult.suggestedAction === 'restart') {
                    setEventData({
                        title: '', description: '', location: '', eventType: '',
                        participants: null, destination: '', forWhom: '', budget: '',
                        style: '', eventDate: null, endDate: null, datePollEnabled: false,
                        locationPollEnabled: false, dateOptions: [], professionals: [],
                        venuePreference: '', privacy: 'private'
                    });
                    setCurrentStep('welcome');
                    setCurrentStepIndex(0);
                    setTimeout(() => {
                        addBotMessage(
                            'בסדר, מתחילים מחדש! 🔄\n\nאיזה סוג אירוע?',
                            [
                                { text: 'יום הולדת', action: 'type_birthday', icon: '🎂' },
                                { text: 'חתונה', action: 'type_wedding', icon: '💍' },
                                { text: 'מסיבה', action: 'type_party', icon: '🎊' },
                                { text: 'עבודה', action: 'type_work', icon: '🏢' },
                                { text: 'טיול', action: 'type_trip', icon: '✈️' },
                                { text: 'אחר', action: 'type_other', icon: '📝' }
                            ]
                        );
                    }, 500);
                    setIsLoading(false);
                    return;
                }
                
                // אם יש מידע שחולץ מהקלט החופשי - עדכן אותו
                if (freeFormResult.extractedData) {
                    setEventData(prev => ({ ...prev, ...freeFormResult.extractedData }));
                }
                
                // אם לא צריך להמשיך בתהליך - עצור כאן
                if (!freeFormResult.shouldContinueFlow) {
                    setIsLoading(false);
                    return;
                }
                
                // המשך לתהליך הרגיל אם צריך
            }

            // בדיקת הצגת סיכום
            if (canShowSummaryAgain && (
                userInput.includes('תראה') ||
                userInput.includes('הצג') ||
                userInput.includes('סיכום') ||
                userInput.includes('תוכנית') ||
                userInput.includes('שוב')
            )) {
                if (finalEventData && generatedPlan) {
                    addBotMessage('הנה התוכנית! 📋', []);
                    setShowConfirmation(true);
                    setIsLoading(false);
                    return;
                } else {
                    addBotMessage('עדיין לא יצרנו תוכנית. בוא נמשיך! 😊', []);
                    setIsLoading(false);
                    return;
                }
            }

            // 🆕 ניתוח חכם עם חילוץ מידע מקסימלי
            const analysis = await analyzeUserInputSmart(userInput, {
                step: currentStep,
                ...eventData
            });

            console.log('[EventCreationChat] 📊 Full analysis result:', analysis);

            // 🆕 עדכון כל המידע שחולץ
            const previousData = { ...eventData };
            const newData = { ...eventData };
            
            if (analysis.eventType) newData.eventType = analysis.eventType;
            if (analysis.title) newData.title = analysis.title;
            if (analysis.participants) newData.participants = analysis.participants;
            if (analysis.destination || analysis.city) newData.destination = analysis.destination || analysis.city;
            if (analysis.forWhom) newData.forWhom = analysis.forWhom;
            if (analysis.placeType) newData.venuePreference = analysis.placeType;
            if (analysis.description) newData.description = analysis.description;
            if (analysis.budget) newData.budget = analysis.budget;
            if (analysis.style) newData.style = analysis.style;
            
            // Handle recurring event detection
            if (analysis.isRecurring) {
                newData.isRecurring = true;
                if (analysis.recurrencePattern) {
                    newData.recurrenceRule = {
                        recurrence_pattern: analysis.recurrencePattern,
                        recurrence_interval: analysis.recurrenceInterval || 1,
                        recurrence_end_type: 'NEVER'
                    };
                }
            }

            setEventData(newData);

            // 🆕 חישוב השלב הבא בצורה דינמית
            const nextStep = calculateNextStep(newData);
            console.log('[EventCreationChat] 🎯 Calculated next step:', nextStep, 'Current:', currentStep);

            // 🆕 בניית הודעת אישור שמסכמת את כל המידע החדש
            const acknowledgment = buildAcknowledgmentMessage(analysis, previousData);

            // 🆕 טיפול דינמי בשלבים - דילוג על שלבים שכבר יש להם תשובה
            if (currentStep === 'welcome' || currentStep === 'event_type') {
                if (nextStep === 'summary') {
                    // המשתמש נתן את כל המידע בבת אחת!
                    addBotMessage(
                        `${acknowledgment || 'מעולה!'}\n\nיש לי את כל מה שצריך! בוא נבחר תאריך 📅`,
                        [
                            { text: 'בחר תאריך', action: 'select_date', icon: '📅' },
                            { text: 'סקר תאריכים', action: 'create_date_poll', icon: '🗳️' }
                        ]
                    );
                    setCurrentStep('date_selection');
                    updateStepProgress('date_selection');
                } else if (nextStep === 'event_name' && newData.eventType) {
                    let suggestion = '';
                    if (newData.eventType.includes('הולדת')) {
                        suggestion = '\n\nלמשל: "יום הולדת 30 למיכל"';
                    } else if (newData.eventType.includes('חתונה')) {
                        suggestion = '\n\nלמשל: "חתונת דני ומיכל"';
                    }
                    addBotMessage(
                        `${acknowledgment || `מעולה! ${newData.eventType}! 😊`}\n\nמה השם?${suggestion}`,
                        []
                    );
                    setCurrentStep('event_name');
                    updateStepProgress('event_name');
                } else {
                    // דלג ישירות לשלב הרלוונטי
                    await handleDynamicStep(nextStep, newData, acknowledgment);
                }
                setIsLoading(false);
                return;
            }

            // 🆕 טיפול בשלבים אחרים עם דילוג חכם
            if (nextStep !== currentStep && nextStep !== 'summary') {
                await handleDynamicStep(nextStep, newData, acknowledgment);
                setIsLoading(false);
                return;
            }

            // התנהגות רגילה לפי השלב הנוכחי (fallback)
            if (currentStep === 'event_name') {
                // שמירת שם האירוע - חשוב!
                const title = analysis.title || userInput;
                console.log('[EventCreationChat] 📝 Saving event title:', title);
                
                // עדכון מיידי של הטייטל
                const updatedData = { ...newData, title };
                setEventData(updatedData);

                if (updatedData.participants && updatedData.forWhom && updatedData.destination) {
                    // יש כל המידע - דלג לתאריך
                    addBotMessage(
                        `"${title}" - מעולה! 🎉 יש לי את כל הפרטים.\n\nמתי האירוע?`,
                        [
                            { text: 'בחר תאריך', action: 'select_date', icon: '📅' },
                            { text: 'סקר תאריכים', action: 'create_date_poll', icon: '🗳️' }
                        ]
                    );
                    setCurrentStep('date_selection');
                    updateStepProgress('date_selection');
                } else {
                    // שאלה מותאמת למספר משתתפים לפי סוג האירוע
                    let participantsQuestion = 'כמה אנשים משתתפים?';
                    if (updatedData.eventType?.includes('חתונה')) {
                        participantsQuestion = 'כמה מוזמנים צפויים לחתונה?';
                    } else if (updatedData.eventType?.includes('בר מצווה') || updatedData.eventType?.includes('בת מצווה')) {
                        participantsQuestion = 'כמה אורחים מוזמנים?';
                    } else if (updatedData.eventType?.includes('פגישה')) {
                        participantsQuestion = 'כמה משתתפים בפגישה?';
                    } else if (updatedData.eventType?.includes('טיול')) {
                        participantsQuestion = 'כמה טיילים?';
                    }
                    
                    addBotMessage(
                        `"${title}" - שם מעולה! 🎉\n\n${participantsQuestion}`,
                        []
                    );
                    setCurrentStep('participants');
                    updateStepProgress('participants');
                }
                setIsLoading(false);
                return;
            }

            if (currentStep === 'participants') {
                const num = analysis.participants || parseInt(userInput);
                if (!isNaN(num) && num > 0) {
                    setEventData(prev => ({ ...prev, participants: num }));

                    // 🆕 בדיקה אם צריך לדלג על שאלת "למי האירוע"
                    const typeQuestions = getEventTypeQuestions(newData.eventType);
                    const eventDefaults = EVENT_TYPE_DEFAULTS[newData.eventType];
                    const shouldSkipForWhom = typeQuestions.skipForWhom || eventDefaults?.skipForWhom || 
                        SKIP_FOR_WHOM_EVENTS.some(e => newData.eventType?.includes(e));

                    if (shouldSkipForWhom) {
                        // דלג על "למי" ועבור ישירות לעיר
                        const defaultForWhom = eventDefaults?.defaultForWhom || 'לעצמי';
                        setEventData(prev => ({ ...prev, forWhom: defaultForWhom }));
                        
                        if (newData.destination) {
                            // יש כבר עיר - עבור לבחירת מקום
                            addBotMessage(
                                `${num} משתתפים! 👥 מצוין!\n\nמה אתה מחפש ב${newData.destination}?`,
                                typeQuestions.venueOptions
                            );
                            setCurrentStep('venue_preference');
                            updateStepProgress('venue_preference');
                        } else {
                            addBotMessage(`${num} משתתפים! 👥\n\nבאיזו עיר האירוע?`, []);
                            setCurrentStep('location_city');
                            updateStepProgress('location_city');
                        }
                    } else if (newData.forWhom && newData.destination) {
                        addBotMessage(
                            `${num} משתתפים! 👥 מצוין, יש לי הכל.\n\nמתי האירוע?`,
                            [
                                { text: 'בחר תאריך', action: 'select_date', icon: '📅' },
                                { text: 'סקר תאריכים', action: 'create_date_poll', icon: '🗳️' }
                            ]
                        );
                        setCurrentStep('date_selection');
                        updateStepProgress('date_selection');
                    } else {
                        // שימוש בשאלות מותאמות לפי סוג האירוע
                        addBotMessage(
                            `${num} משתתפים! 👥\n\nהאירוע למי?`,
                            typeQuestions.forWhomOptions
                        );
                        setCurrentStep('for_whom');
                        updateStepProgress('for_whom');
                    }
                } else {
                    addBotMessage('לא הבנתי 🤔 כמה אנשים בערך? (למשל: 10)', []);
                }
                setIsLoading(false);
                return;
            }

            if (currentStep === 'for_whom') {
                const forWhom = analysis.forWhom || userInput;
                setEventData(prev => ({ ...prev, forWhom }));

                if (newData.destination) {
                    // שימוש בשאלות מותאמות לפי סוג האירוע
                    const typeQuestions = getEventTypeQuestions(newData.eventType);
                    addBotMessage(
                        `נהדר! 👍\n\nמה אתה מחפש ב${newData.destination}?`,
                        typeQuestions.venueOptions
                    );
                    setCurrentStep('venue_preference');
                    updateStepProgress('venue_preference');
                } else {
                    addBotMessage(`נהדר! 👍 באיזו עיר?`, []);
                    setCurrentStep('location_city');
                    updateStepProgress('location_city');
                }
                setIsLoading(false);
                return;
            }

            if (currentStep === 'location_city') {
                const city = analysis.destination || analysis.city || userInput;
                const placeType = analysis.placeType;

                setEventData(prev => ({
                    ...prev,
                    destination: city,
                    venuePreference: placeType || prev.venuePreference
                }));

                if (placeType) {
                    addBotMessage(`${placeType} ב${city}! 🌟`, []);
                    await searchPlaces({ city, placeType });
                } else {
                    // שימוש בשאלות מותאמות לפי סוג האירוע
                    const typeQuestions = getEventTypeQuestions(eventData.eventType);
                    addBotMessage(
                        `${city} מעולה! 🌟 מה אתה מחפש?`,
                        typeQuestions.venueOptions
                    );
                    setCurrentStep('venue_preference');
                    updateStepProgress('venue_preference');
                }
                setIsLoading(false);
                return;
            }

            if (currentStep === 'venue_preference') {
                setEventData(prev => ({ ...prev, venuePreference: userInput }));
                await searchPlaces({ city: eventData.destination, placeType: userInput });
                setIsLoading(false);
                return;
            }

            if (currentStep === 'location_specific') {
                setEventData(prev => ({
                    ...prev,
                    location: userInput,
                    locationPollEnabled: false
                }));

                addBotMessage(
                    `מצוין! 📍 האם האירוע יהיה ציבורי או פרטי?`,
                    [
                        { text: 'פרטי 🔒', action: 'privacy_private', icon: '🔒' },
                        { text: 'ציבורי 🌍', action: 'privacy_public', icon: '🌍' }
                    ]
                );
                setCurrentStep('privacy_selection');
                updateStepProgress('privacy_selection');
                setIsLoading(false);
                return;
            }

            if (currentStep === 'editing') {
                const updates = {};
                if (analysis.eventType) updates.eventType = analysis.eventType;
                if (analysis.participants) updates.participants = analysis.participants;
                if (analysis.destination || analysis.city) updates.destination = analysis.destination || analysis.city;
                if (analysis.placeType) updates.venuePreference = analysis.placeType;
                if (analysis.description) updates.description = analysis.description;

                if (analysis.destination || analysis.city || analysis.placeType) {
                    updates.location = null;
                    updates.locationPollEnabled = false;
                }

                const updatedEventData = { ...finalEventData, ...updates };
                setEventData(updatedEventData);
                setFinalEventData(updatedEventData);

                addBotMessage(`עדכנתי! 👍 יוצר תוכנית...`, []);
                await generateEventPlan(updatedEventData);
                setIsLoading(false);
                return;
            }

        } catch (error) {
            console.error('[EventCreationChat] Error:', error);
            addBotMessage(
                `אופס, משהו השתבש 😕 אבל אני כאן! ספר לי עוד פעם מה תרצה.`,
                [{ text: 'המשך', action: 'continue_anyway', icon: '✅' }]
            );
            setIsLoading(false);
        }
    };

    // 🆕 פונקציה חדשה: טיפול דינמי בשלבים
    const handleDynamicStep = async (step, data, acknowledgment) => {
        const ackMessage = acknowledgment ? `${acknowledgment}\n\n` : '';

        switch (step) {
            case 'event_name':
                let suggestion = '';
                if (data.eventType?.includes('הולדת')) {
                    suggestion = '\n\nלמשל: "יום הולדת 30 למיכל"';
                }
                addBotMessage(`${ackMessage}מה שם האירוע?${suggestion}`, []);
                setCurrentStep('event_name');
                updateStepProgress('event_name');
                break;

            case 'participants':
                addBotMessage(`${ackMessage}כמה אנשים משתתפים?`, []);
                setCurrentStep('participants');
                updateStepProgress('participants');
                break;

            case 'for_whom':
                addBotMessage(
                    `${ackMessage}האירוע למי?`,
                    [
                        { text: 'לעצמי', action: 'for_self', icon: '👤' },
                        { text: 'לבן/בת זוג', action: 'for_partner', icon: '💑' },
                        { text: 'למשפחה', action: 'for_family', icon: '👨‍👩‍👧‍👦' },
                        { text: 'לחברים', action: 'for_friends', icon: '👥' },
                        { text: 'לעבודה', action: 'for_work', icon: '🏢' }
                    ]
                );
                setCurrentStep('for_whom');
                updateStepProgress('for_whom');
                break;

            case 'location_city':
                addBotMessage(`${ackMessage}באיזו עיר האירוע?`, []);
                setCurrentStep('location_city');
                updateStepProgress('location_city');
                break;

            case 'venue_preference':
                addBotMessage(
                    `${ackMessage}מה אתה מחפש ב${data.destination || 'העיר'}?`,
                    [
                        { text: 'אולם', action: 'venue_hall', icon: '🏛️' },
                        { text: 'מסעדה', action: 'venue_restaurant', icon: '🍽️' },
                        { text: 'קפה', action: 'venue_cafe', icon: '☕' },
                        { text: 'מועדון', action: 'venue_club', icon: '🎉' },
                        { text: 'פארק', action: 'venue_park', icon: '🌳' },
                        { text: 'המלץ!', action: 'venue_recommend', icon: '💡' }
                    ]
                );
                setCurrentStep('venue_preference');
                updateStepProgress('venue_preference');
                break;

            case 'privacy_selection':
                addBotMessage(
                    `${ackMessage}האירוע יהיה ציבורי או פרטי?`,
                    [
                        { text: 'פרטי 🔒', action: 'privacy_private', icon: '🔒' },
                        { text: 'ציבורי 🌍', action: 'privacy_public', icon: '🌍' }
                    ]
                );
                setCurrentStep('privacy_selection');
                updateStepProgress('privacy_selection');
                break;

            case 'date_selection':
                addBotMessage(
                    `${ackMessage}מתי האירוע?`,
                    [
                        { text: 'בחר תאריך', action: 'select_date', icon: '📅' },
                        { text: 'סקר תאריכים', action: 'create_date_poll', icon: '🗳️' }
                    ]
                );
                setCurrentStep('date_selection');
                updateStepProgress('date_selection');
                break;

            default:
                // אם לא ברור - שאל את השאלה הבאה בסדר
                addBotMessage(`${ackMessage}בוא נמשיך! מה עוד תרצה לספר לי?`, []);
        }
    };

    const generateEventPlan = async (data) => {
        setIsGeneratingPlan(true);
        addBotMessage('יוצר תוכנית מותאמת אישית... ✨', []);

        try {
            // 🆕 Prompt משופר עם כל המידע שנאסף
            const prompt = `אתה מתכנן אירועים מקצועי ויצירתי. צור תוכנית מפורטת ומותאמת אישית לאירוע.

**חשוב מאוד: כל התשובות חייבות להיות בעברית בלבד!**

**פרטי האירוע המלאים:**
- שם האירוע: ${data.title}
- סוג האירוע: ${data.eventType || 'לא צוין'}
- תיאור: ${data.description || 'לא צוין'}
- מיקום: ${data.location || data.destination || 'לא צוין'}
- מספר משתתפים: ${data.participants || 'לא צוין'}
- האירוע מיועד ל: ${data.forWhom || 'לא צוין'}
- סגנון מועדף: ${data.style || 'לא צוין'}
- תקציב: ${data.budget || 'לא צוין'}
- סוג מקום: ${data.venuePreference || 'לא צוין'}
- תאריך: ${data.eventDate ? new Date(data.eventDate).toLocaleDateString('he-IL') : (data.datePollEnabled ? 'יקבע בהצבעה' : 'לא צוין')}
- אירוע חוזר: ${data.isRecurring ? 'כן' : 'לא'}
${data.isRecurring && data.recurrenceRule ? `- תדירות: ${data.recurrenceRule.recurrence_pattern === 'DAILY' ? 'יומי' : data.recurrenceRule.recurrence_pattern === 'WEEKLY' ? 'שבועי' : data.recurrenceRule.recurrence_pattern === 'MONTHLY_BY_DAY_OF_MONTH' ? 'חודשי' : data.recurrenceRule.recurrence_pattern === 'YEARLY' ? 'שנתי' : 'לא צוין'}` : ''}

**הנחיות ליצירת התוכנית:**
1. התאם את הלו"ז והמשימות לסוג האירוע (${data.eventType || 'כללי'})
2. אם זה אירוע ${data.forWhom === 'לילדים' ? 'לילדים - התמקד בפעילויות מהנות ובטוחות' : data.forWhom === 'לעבודה' ? 'עבודה - התמקד במקצועיות ובתיאום' : 'משפחתי/חברים - התמקד בחוויה משותפת'}
3. התחשב במספר המשתתפים (${data.participants || 'לא ידוע'}) בהמלצות
4. ${data.style === 'יוקרתי' ? 'הצע אפשרויות יוקרתיות ואיכותיות' : data.style === 'בטבע' ? 'התמקד בפעילויות חוץ וטבע' : 'הצע אפשרויות מגוונות'}

**צור תוכנית הכוללת:**
1. **itinerary** - לו"ז יום האירוע (3-5 פעילויות עם שעות מדויקות) - מותאם לסוג האירוע
2. **tasks** - משימות הכנה (5-7 משימות עם תיאור ומועד יעד ביחס לתאריך האירוע) - מותאם לסוג האירוע
3. **recommendations** - 2-3 המלצות ספציפיות ומעשיות לאירוע הזה
4. **estimatedBudget** - הערכת תקציב לפי מספר המשתתפים והסגנון

**דוגמאות להתאמה:**
- יום הולדת: קישוטים, עוגה, הפעלה, מתנות
- חתונה: רב, צלם, קייטרינג, פרחים
- טיול: ציוד, הזמנות, ביטוח, מסלול
- אירוע עבודה: מצגות, קייטרינג, ציוד טכני

החזר JSON תקין:`;

            const plan = await base44.integrations.Core.InvokeLLM({
                prompt,
                add_context_from_internet: false,
                response_json_schema: {
                    type: 'object',
                    properties: {
                        itinerary: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    time: { type: 'string' },
                                    activity: { type: 'string' },
                                    description: { type: 'string' }
                                }
                            }
                        },
                        tasks: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    title: { type: 'string' },
                                    description: { type: 'string' },
                                    dueOffsetDays: { type: 'number' }
                                }
                            }
                        },
                        recommendations: { type: 'string' },
                        estimatedBudget: { type: 'string' }
                    }
                }
            });

            setGeneratedPlan(plan);
            setFinalEventData(data);
            setShowConfirmation(true);
            setCanShowSummaryAgain(true);

        } catch (error) {
            console.error('[EventCreationChat] ❌ Failed to generate plan:', error);

            const fallbackPlan = {
                itinerary: [
                    { time: '09:00', activity: 'התכנסות', description: 'קבלת אורחים וכיבוד קל' },
                    { time: '12:00', activity: 'פעילות מרכזית', description: 'הפעילות העיקרית של האירוע' }
                ],
                tasks: [
                    { title: 'הזמנת מקום', description: 'להזמין את המקום מראש', dueOffsetDays: -14 },
                    { title: 'שליחת הזמנות', description: 'לשלוח הזמנות למשתתפים', dueOffsetDays: -7 }
                ],
                recommendations: 'תכנון מוקדם חשוב להצלחת האירוע',
                estimatedBudget: data.budget || 'לא צוין'
            };

            setGeneratedPlan(fallbackPlan);
            setFinalEventData(data);
            setShowConfirmation(true);
            setCanShowSummaryAgain(true);
        } finally {
            setIsGeneratingPlan(false);
        }
    };

    const handleEditTitle = () => {
        setShowConfirmation(false);
        addBotMessage(
            `נשנה את השם 📝\n\n"${finalEventData?.title}"\n\nמה השם החדש?`,
            []
        );
        setCurrentStep('event_name');
        updateStepProgress('event_name');
    };

    const handleEditDate = () => {
        setShowConfirmation(false);
        addBotMessage(
            `נשנה תאריך 📅`,
            [
                { text: 'בחר תאריך', action: 'select_date', icon: '📅' },
                { text: 'סקר תאריכים', action: 'create_date_poll', icon: '🗳️' }
            ]
        );
        setCurrentStep('date_selection');
        updateStepProgress('date_selection');
    };

    const handleEditLocation = () => {
        setShowConfirmation(false);
        addBotMessage(
            `נשנה מיקום 📍\n\n"${finalEventData?.location}"`,
            []
        );
        setCurrentStep('location_city');
        updateStepProgress('location_city');
    };

    const handleEditTasks = () => {
        setShowConfirmation(false);
        addBotMessage(
            `נערוך משימות ✅`,
            []
        );
        setCurrentStep('editing');
        updateStepProgress('editing');
    };

    const handleEditItinerary = () => {
        setShowConfirmation(false);
        addBotMessage(
            `נערוך לוח זמנים 📋`,
            []
        );
        setCurrentStep('editing');
        updateStepProgress('editing');
    };

    const handleEdit = () => {
        setShowConfirmation(false);

        addBotMessage(
            `מה לערוך?`,
            [
                { text: 'שם', action: 'edit_title', icon: '📝' },
                { text: 'תאריך', action: 'edit_date', icon: '📅' },
                { text: 'מיקום', action: 'edit_location', icon: '📍' }
            ]
        );

        setCurrentStep('editing');
        updateStepProgress('editing');
    };

    const handleFinalConfirm = async () => {
        if (!finalEventData || !generatedPlan) return;

        setShowConfirmation(false);
        setIsLoading(true);

        try {
            await createEventFromData(finalEventData, generatedPlan);
        } catch (error) {
            console.error('[EventCreationChat] Create event error:', error);
            toast.error(`שגיאה: ${error.message}`);
            addBotMessage(`שגיאה: ${error.message}`, []);
            setIsCreatingEvent(false);
            setCreationProgress('');
        } finally {
            setIsLoading(false);
        }
    };

    const createEventFromData = async (data, plan) => {
        try {
            // וידוא שיש שם אירוע - אם אין, ניקח מהסוג + יעד
            let eventTitle = data.title;
            if (!eventTitle || eventTitle.trim() === '') {
                if (data.eventType && data.destination) {
                    eventTitle = `${data.eventType} - ${data.destination}`;
                } else if (data.eventType) {
                    eventTitle = data.eventType;
                } else {
                    throw new Error('חובה למלא שם אירוע');
                }
            }

            console.log('[EventCreationChat] Creating event with title:', eventTitle);
            console.log('[EventCreationChat] Full data:', data);
            
            setIsCreatingEvent(true);
            setCreationProgress('יוצר את האירוע... ✨');

            let finalLocation = data.location;
            
            if (!finalLocation || finalLocation.trim() === '') {
                if (data.locationPollEnabled && selectedPlacesForPoll.length > 0) {
                    finalLocation = 'יקבע בהצבעה';
                } else if (data.destination) {
                    finalLocation = data.destination;
                } else {
                    throw new Error('חובה למלא מיקום או להפעיל סקר מיקום');
                }
            }

            const event = await createEvent({
                title: eventTitle,
                description: data.description || '',
                location: finalLocation,
                event_date: data.eventDate,
                end_date: data.endDate,
                owner_id: currentUser.id,
                privacy: data.privacy || 'private',
                budget: data.budget ? Number(data.budget) : null,
                status: 'active',
                datePollEnabled: data.datePollEnabled || false,
                locationPollEnabled: data.locationPollEnabled || false,
                category: data.eventType || null,
                is_recurring: data.isRecurring || false,
                isRecurring: data.isRecurring || false
            });

            if (!event || !event.id) {
                throw new Error('יצירת האירוע נכשלה');
            }

            console.log('[EventCreationChat] ✅ Event created:', event);
            setCreationProgress('האירוע נוצר! ✅');

            // המתן קצת שהמשתמש יראה את ההודעה
            await new Promise(resolve => setTimeout(resolve, 800));

            try {
                console.log('[EventCreationChat] Creating event membership...');
                setCreationProgress('מוסיף אותך כמארגן... 👤');
                
                await createEventMember({
                    eventId: event.id,
                    userId: currentUser.id,
                    role: 'organizer'
                });

                console.log('[EventCreationChat] ✅ Membership created');
                await new Promise(resolve => setTimeout(resolve, 600));

            } catch (membershipError) {
                console.error('[EventCreationChat] ❌ Membership creation failed:', membershipError);
            }

            // Create recurring rule if needed
            if (data.isRecurring && data.recurrenceRule && event.id) {
                try {
                    setCreationProgress('מגדיר חזרתיות... 🔄');
                    
                    const rulePayload = {
                        event_id: event.id,
                        recurrence_pattern: data.recurrenceRule.recurrence_pattern,
                        recurrence_interval: data.recurrenceRule.recurrence_interval || 1,
                        recurrence_days_of_week: data.recurrenceRule.recurrence_days_of_week || [],
                        recurrence_day_of_month: data.recurrenceRule.recurrence_day_of_month || null,
                        recurrence_nth_day_of_week: data.recurrenceRule.recurrence_nth_day_of_week || null,
                        recurrence_end_type: data.recurrenceRule.recurrence_end_type || 'NEVER',
                        recurrence_end_date: data.recurrenceRule.recurrence_end_date || null,
                        recurrence_count: data.recurrenceRule.recurrence_count || null,
                        original_event_start_time: data.eventDate ? new Date(data.eventDate).toTimeString().slice(0, 5) : null,
                        original_event_duration_minutes: data.eventDate && data.endDate 
                            ? Math.round((new Date(data.endDate) - new Date(data.eventDate)) / 60000)
                            : 60,
                        excluded_dates: []
                    };
                    
                    await createRecurringEventRule(rulePayload);
                    console.log('[EventCreationChat] ✅ Recurring rule created');
                    setCreationProgress('חזרתיות הוגדרה! ✅');
                    await new Promise(resolve => setTimeout(resolve, 600));
                } catch (recurringError) {
                    console.error('[EventCreationChat] ❌ Recurring rule failed:', recurringError);
                }
            }

            if (data.locationPollEnabled && selectedPlacesForPoll.length > 0) {
                try {
                    setCreationProgress('יוצר סקר מיקום... 📍');
                    
                    const pollOptions = selectedPlacesForPoll.map((place, index) => ({
                        id: `location_${index}`,
                        text: place.name,
                        description: `${place.address || ''}${place.website ? `\n🌐 אתר: ${place.website}` : ''}${place.phoneNumber ? `\n📞 טלפון: ${place.phoneNumber}` : ''}`,
                        location: place.address || place.name
                    }));

                    await createPoll({
                        eventId: event.id,
                        title: 'בחירת מיקום לאירוע',
                        type: 'location',
                        options: pollOptions,
                        allowMultiple: false,
                        isActive: true
                    });

                    setCreationProgress('סקר המיקום נוצר! ✅');
                    await new Promise(resolve => setTimeout(resolve, 600));
                } catch (pollError) {
                    console.error('[EventCreationChat] ❌ Location poll failed:', pollError);
                }
            }

            if (data.datePollEnabled && data.dateOptions?.length > 0) {
                try {
                    setCreationProgress('יוצר סקר תאריכים... 📅');
                    
                    const toISOSafe = (dateValue) => {
                        if (!dateValue) return null;
                        if (typeof dateValue === 'string' && dateValue.includes('T')) return dateValue;
                        try {
                            return new Date(dateValue).toISOString();
                        } catch {
                            return null;
                        }
                    };

                    const pollOptions = data.dateOptions
                        .filter(opt => opt.startDate)
                        .map((opt, index) => ({
                            id: opt.id || String(index),
                            text: opt.text || `אפשרות ${index + 1}: ${new Date(opt.startDate).toLocaleDateString('he-IL')}`,
                            date: toISOSafe(opt.startDate),
                            start_date: toISOSafe(opt.startDate),
                            end_date: toISOSafe(opt.endDate)
                        }));

                    if (pollOptions.length > 0) {
                        await createPoll({
                            eventId: event.id,
                            title: 'בחירת תאריך לאירוע',
                            type: 'date',
                            options: pollOptions,
                            allowMultiple: false,
                            isActive: true
                        });
                        setCreationProgress('סקר התאריכים נוצר! ✅');
                        await new Promise(resolve => setTimeout(resolve, 600));
                    }
                } catch (pollError) {
                    console.error('[EventCreationChat] ❌ Date poll failed:', pollError);
                }
            }

            if (plan?.tasks?.length > 0) {
                try {
                    setCreationProgress(`יוצר ${plan.tasks.length} משימות... ✅`);
                    
                    for (const task of plan.tasks) {
                        await createTask({
                            eventId: event.id,
                            title: task.title,
                            description: task.description || '',
                            status: 'todo',
                            dueDate: task.dueOffsetDays ? calculateDueDate(task.dueOffsetDays) : null
                        });
                    }
                    
                    setCreationProgress(`${plan.tasks.length} משימות נוצרו! ✅`);
                    await new Promise(resolve => setTimeout(resolve, 600));
                } catch (taskError) {
                    console.error('[EventCreationChat] ❌ Tasks failed:', taskError);
                }
            }

            if (plan?.itinerary?.length > 0 && data.eventDate) {
                try {
                    setCreationProgress(`יוצר לוח זמנים... 📋`);
                    
                    for (let i = 0; i < plan.itinerary.length; i++) {
                        const item = plan.itinerary[i];
                        
                        try {
                            const [hours, minutes] = item.time.split(':');
                            const itemDate = new Date(data.eventDate);
                            itemDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

                            let itemTitle = item.activity;
                            let itemDescription = item.description || '';
                            
                            if (selectedPlace && i === 0) {
                                if (selectedPlace.website) {
                                    itemDescription += `\n🌐 אתר: ${selectedPlace.website}`;
                                }
                                if (selectedPlace.phoneNumber) {
                                    itemDescription += `\n📞 טלפון: ${selectedPlace.phoneNumber}`;
                                }
                            }

                            await createItineraryItem({
                                eventId: event.id,
                                title: itemTitle,
                                description: itemDescription,
                                location: data.location || '',
                                date: itemDate.toISOString(),
                                order: i
                            });

                            console.log(`[EventCreationChat] ✅ Created itinerary item ${i + 1}/${plan.itinerary.length}`);
                        } catch (itemError) {
                            console.error(`[EventCreationChat] ❌ Failed to create itinerary item ${i + 1}:`, itemError);
                        }
                    }
                    
                    setCreationProgress(`לוח זמנים נוצר! ✅`);
                    await new Promise(resolve => setTimeout(resolve, 600));
                } catch (itineraryError) {
                    console.error('[EventCreationChat] ❌ Itinerary failed:', itineraryError);
                }
            }

            setCreationProgress('מעביר לאירוע... 🎉');
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            onEventCreated(event);

        } catch (error) {
            console.error('[EventCreationChat] ❌ Error:', error);
            setIsCreatingEvent(false);
            setCreationProgress('');
            throw error;
        }
    };

    const calculateDueDate = (offsetDays) => {
        const date = new Date();
        date.setDate(date.getDate() + offsetDays);
        return date.toISOString();
    };

    const getGoogleMapsUrl = (place) => {
        if (place.location?.lat && place.location?.lng) {
            return `https://www.google.com/maps/search/?api=1&query=${place.location.lat},${place.location.lng}`;
        }
        const query = encodeURIComponent(`${place.name} ${place.address}`);
        return `https://www.google.com/maps/search/?api=1&query=${query}`;
    };

    const loadPlaceDetails = async (place) => {
        if (!place.place_id) {
            console.warn('[EventCreationChat] Place missing place_id:', place.name);
            return place;
        }

        if (place.detailsLoaded) {
            return place;
        }

        try {
            console.log(`[EventCreationChat] 🔍 Loading details for: ${place.name}`);
            const details = await getPlaceDetails(place.place_id);

            const enrichedPlace = {
                ...place,
                website: details?.website || place.website,
                phoneNumber: details?.phoneNumber || place.phoneNumber,
                rating: details?.rating || place.rating,
                user_ratings_total: details?.userRatingCount || place.user_ratings_total,
                detailsLoaded: true
            };

            console.log(`[EventCreationChat] ✅ Details loaded for: ${enrichedPlace.name}`, {
                hasWebsite: !!enrichedPlace.website,
                hasPhone: !!enrichedPlace.phoneNumber
            });

            return enrichedPlace;
        } catch (error) {
            console.warn(`[EventCreationChat] ⚠️ Failed to load details for ${place.name}:`, error);
            return { ...place, detailsLoaded: true };
        }
    };

    const handlePlaceClick = async (place) => {
        const enrichedPlace = await loadPlaceDetails(place);
        
        setSearchedPlaces(prev => 
            prev.map(p => p.id === enrichedPlace.id ? enrichedPlace : p)
        );
        
        setSelectedPlace(enrichedPlace);
        setShowPlaceDetails(true);
    };

    const togglePlaceForPoll = (place) => {
        setSelectedPlacesForPoll(prev => {
            const exists = prev.find(p => p.id === place.id);
            if (exists) {
                return prev.filter(p => p.id !== place.id);
            } else {
                return [...prev, place];
            }
        });
    };

    const handleConfirmPlace = () => {
        if (!selectedPlace) return;

        setShowPlaceDetails(false);

        setEventData(prev => ({
            ...prev,
            location: `${selectedPlace.name}, ${selectedPlace.address}`,
            locationPollEnabled: false
        }));

        addBotMessage(
            `מצוין! ${selectedPlace.name} 📍\n\nהאם האירוע יהיה ציבורי או פרטי?`,
            [
                { text: 'פרטי 🔒', action: 'privacy_private', icon: '🔒' },
                { text: 'ציבורי 🌍', action: 'privacy_public', icon: '🌍' }
            ]
        );
        setCurrentStep('privacy_selection');
        updateStepProgress('privacy_selection');
    };

    const handleDateSelected = async (startDate, endDate) => {
        setShowDatePicker(false);

        const updatedEventData = {
            ...eventData,
            eventDate: startDate,
            endDate: endDate,
            datePollEnabled: false
        };

        setEventData(updatedEventData);

        const dateStr = startDate ? new Date(startDate).toLocaleDateString('he-IL') : '';
        addBotMessage(`מעולה! ${dateStr} 📅`, []);

        await generateEventPlan(updatedEventData);
    };

    const handleShowAllPlaces = () => {
        setVisiblePlacesCount(searchedPlaces.length);
        setAllPlacesVisible(true);
        
        // גלילה חלקה למטה אחרי הצגת כל המקומות
        setTimeout(() => {
            scrollToBottom(); // Replaced messagesContainerRef with scrollToBottom
        }, 100);
    };

    const handleAction = async (action) => {
        setIsLoading(true);

        try {
            if (action === 'edit_title') {
                handleEditTitle();
                setIsLoading(false);
                return;
            }
            if (action === 'edit_date') {
                handleEditDate();
                setIsLoading(false);
                return;
            }
            if (action === 'edit_location') {
                handleEditLocation();
                setIsLoading(false);
                return;
            }
            if (action === 'edit_tasks') {
                handleEditTasks();
                setIsLoading(false);
                return;
            }
            if (action === 'edit_itinerary') {
                handleEditItinerary();
                setIsLoading(false);
                return;
            }

            if (action.startsWith('type_')) {
                const typeMap = {
                    'type_birthday': 'יום הולדת',
                    'type_wedding': 'חתונה',
                    'type_party': 'מסיבה',
                    'type_work': 'אירוע עבודה',
                    'type_trip': 'טיול',
                    'type_engagement': 'אירוסין',
                    'type_barmitzvah': 'בר מצווה',
                    'type_batmitzvah': 'בת מצווה',
                    'type_brit': 'ברית',
                    'type_bachelor': 'מסיבת רווקות',
                    'type_meeting': 'פגישה',
                    'type_graduation': 'סיום לימודים',
                    'type_anniversary': 'יום נישואין',
                    'type_retirement': 'פרישה',
                    'type_housewarming': 'חנוכת בית',
                    'type_babyshower': 'בייבי שאוור',
                    'type_shabbat': 'ארוחת שבת',
                    'type_holiday': 'חג',
                    'type_memorial': 'אזכרה',
                    'type_conference': 'כנס',
                    'type_workshop': 'סדנה',
                    'type_sport': 'אירוע ספורט',
                    'type_concert': 'הופעה',
                    'type_picnic': 'פיקניק',
                    'type_bbq': 'על האש'
                };

                if (action === 'type_other') {
                    addBotMessage('כתוב את סוג האירוע (למשל: אירוסין, בר מצווה, ברית...):', []);
                    setIsLoading(false);
                    return;
                }

                const eventType = typeMap[action];
                setEventData(prev => ({ ...prev, eventType }));

                // שימוש בשאלות מותאמות לפי סוג האירוע
                const typeQuestions = getEventTypeQuestions(eventType);

                addBotMessage(typeQuestions.namePrompt || `מעולה! ${eventType}! 😊\n\nמה שם האירוע?`, []);
                setCurrentStep('event_name');
                updateStepProgress('event_name');
                setIsLoading(false);
                return;
            }

            if (action.startsWith('for_')) {
                const forMap = {
                    'for_self': 'לעצמי',
                    'for_partner': 'לבן/בת זוג',
                    'for_family': 'למשפחה',
                    'for_friends': 'לחברים',
                    'for_work': 'לעבודה',
                    'for_child': 'לילד/ה',
                    'for_friend': 'לחבר/ה',
                    'for_parent': 'להורה',
                    'for_bachelor': 'רווקות/רווקים',
                    'for_graduation': 'מסיבת סיום',
                    'for_holiday': 'מסיבת חג',
                    'for_team': 'לצוות',
                    'for_company': 'לחברה',
                    'for_clients': 'ללקוחות',
                    'for_conference': 'כנס מקצועי',
                    'for_couple': 'טיול זוגי',
                    'for_solo': 'טיול יחיד'
                };

                if (action === 'for_other') {
                    addBotMessage('למי האירוע?', []);
                    setIsLoading(false);
                    return;
                }

                const forWhom = forMap[action] || action.replace('for_', '');
                setEventData(prev => ({ ...prev, forWhom }));

                addBotMessage(
                    `נהדר! 👍 באיזו עיר?`,
                    []
                );
                setCurrentStep('location_city');
                updateStepProgress('location_city');
                setIsLoading(false);
                return;
            }

            if (action.startsWith('venue_')) {
                const venueMap = {
                    'venue_hall': 'אולם אירועים',
                    'venue_restaurant': 'מסעדה',
                    'venue_cafe': 'בית קפה',
                    'venue_club': 'מועדון',
                    'venue_park': 'פארק',
                    'venue_recommend': 'recommend',
                    'venue_garden': 'גן אירועים',
                    'venue_hotel': 'מלון',
                    'venue_beach': 'חוף הים',
                    'venue_winery': 'יקב',
                    'venue_bar': 'בר',
                    'venue_villa': 'וילה',
                    'venue_home': 'בבית',
                    'venue_amusement': 'פארק שעשועים',
                    'venue_convention': 'מרכז כנסים',
                    'venue_escape': 'אסקייפ רום',
                    'venue_teambuilding': 'פעילות גיבוש',
                    'venue_zimmer': 'צימר',
                    'venue_hostel': 'אכסניה',
                    'venue_camping': 'קמפינג',
                    'venue_airbnb': 'Airbnb',
                    'venue_synagogue': 'בית כנסת',
                    'venue_spa': 'ספא',
                    'venue_yacht': 'יאכטה',
                    'venue_office': 'משרד',
                    'venue_online': 'אונליין',
                    'venue_cemetery': 'בית עלמין',
                    'venue_studio': 'סטודיו',
                    'venue_field': 'מגרש',
                    'venue_gym': 'חדר כושר',
                    'venue_pool': 'בריכה',
                    'venue_concert': 'אולם הופעות',
                    'venue_forest': 'יער'
                };

                if (action === 'venue_other') {
                    addBotMessage('איזה סוג מקום?', []);
                    setEventData(prev => ({ ...prev, venuePreference: 'אחר' }));
                    setIsLoading(false);
                    return;
                }

                const venuePreference = venueMap[action] || action.replace('venue_', '');
                setEventData(prev => ({ ...prev, venuePreference }));

                await searchPlaces({
                    city: eventData.destination,
                    placeType: venuePreference === 'recommend' ? null : venuePreference
                });

                setIsLoading(false);
                return;
            }

            // Privacy selection
            if (action === 'privacy_private') {
                setEventData(prev => ({ ...prev, privacy: 'private' }));
                addBotMessage('האירוע יהיה פרטי 🔒\n\nמתי האירוע?', [
                    { text: 'בחר תאריך', action: 'select_date', icon: '📅' },
                    { text: 'סקר תאריכים', action: 'create_date_poll', icon: '🗳️' }
                ]);
                setCurrentStep('date_selection');
                updateStepProgress('date_selection');
                setIsLoading(false);
                return;
            }

            if (action === 'privacy_public') {
                setEventData(prev => ({ ...prev, privacy: 'public' }));
                addBotMessage('האירוע יהיה ציבורי 🌍\n\nמתי האירוע?', [
                    { text: 'בחר תאריך', action: 'select_date', icon: '📅' },
                    { text: 'סקר תאריכים', action: 'create_date_poll', icon: '🗳️' }
                ]);
                setCurrentStep('date_selection');
                updateStepProgress('date_selection');
                setIsLoading(false);
                return;
            }

            if (action === 'select_date') {
                setShowDatePicker(true);
                setIsLoading(false);
                return;
            }

            if (action === 'create_date_poll') {
                addBotMessage(
                    'יוצר סקר תאריכים! 📊',
                    []
                );

                setEventData(prev => ({
                    ...prev,
                    datePollEnabled: true,
                    dateOptions: [
                        { id: crypto.randomUUID(), startDate: null, endDate: null },
                        { id: crypto.randomUUID(), startDate: null, endDate: null }
                    ]
                }));

                await generateEventPlan({
                    ...eventData,
                    datePollEnabled: true
                });

                setIsLoading(false);
                return;
            }

            if (action === 'create_location_poll') {
                if (selectedPlacesForPoll.length === 0) {
                    toast.error('בחר לפחות מקום אחד');
                    setIsLoading(false);
                    return;
                }

                setEventData(prev => ({
                    ...prev,
                    location: 'יקבע בהצבעה',
                    locationPollEnabled: true
                }));

                addBotMessage(
                    `סקר עם ${selectedPlacesForPoll.length} מקומות! 📊\n\nהאם האירוע יהיה ציבורי או פרטי?`,
                    [
                        { text: 'פרטי 🔒', action: 'privacy_private', icon: '🔒' },
                        { text: 'ציבורי 🌍', action: 'privacy_public', icon: '🌍' }
                    ]
                );
                setCurrentStep('privacy_selection');
                updateStepProgress('privacy_selection');
                setIsLoading(false);
                return;
            }

            if (action === 'manual_location') {
                addBotMessage('כתוב שם המקום:', []);
                setCurrentStep('location_specific');
                updateStepProgress('location_specific');
                setIsLoading(false);
                return;
            }

            if (action === 'retry_search') {
                addBotMessage('איזו עיר?', []);
                setCurrentStep('location_city');
                updateStepProgress('location_city');
                setIsLoading(false);
                return;
            }

            if (action === 'continue_anyway') {
                await generateEventPlan(eventData);
                setIsLoading(false);
                return;
            }
        } catch (error) {
            console.error('[EventCreationChat] Action error:', error);
            addBotMessage(`שגיאה: ${error.message}`, []);
            setIsLoading(false);
        }
    };

    return (
        <div className="h-full w-full flex flex-col bg-gradient-to-br from-orange-50 via-white to-pink-50">
            {/* Progress Bar - מוסתר במובייל למקסום שטח */}
            <div className="hidden md:block bg-white/90 backdrop-blur-sm border-b border-orange-100 px-3 py-2.5 flex-shrink-0">
                <div className="flex items-center justify-between max-w-5xl mx-auto">
                    {STEPS.slice(0, -1).map((step, idx) => (
                        <div key={idx} className="flex items-center">
                            <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all ${
                                idx <= currentStepIndex
                                    ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white scale-110'
                                    : 'bg-gray-200 text-gray-400'
                            }`}>
                                <span className="text-sm">{step.emoji}</span>
                            </div>
                            {idx < STEPS.length - 2 && (
                                <div className={`hidden sm:block w-6 md:w-10 h-0.5 mx-1 rounded-full transition-all ${
                                    idx < currentStepIndex ? 'bg-gradient-to-r from-orange-500 to-pink-500' : 'bg-gray-200'
                                }`} />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {isCreatingEvent && (
                <div className="fixed inset-0 bg-white z-[9999] flex items-center justify-center" style={{ top: 0, left: 0, right: 0, bottom: 0, minHeight: '100vh', minWidth: '100vw' }}>
                    <div className="text-center space-y-6 px-8">
                        <div className="relative">
                            <div className="w-28 h-28 mx-auto">
                                <div className="absolute inset-0 border-8 border-orange-200 rounded-full"></div>
                                <div className="absolute inset-0 border-8 border-transparent border-t-orange-500 rounded-full animate-spin"></div>
                                
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Sparkles className="w-14 h-14 text-orange-500 animate-pulse" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-xl font-bold text-gray-900">
                                יוצר את האירוע
                            </h3>
                            <p className="text-base text-orange-600 font-semibold animate-pulse">
                                {creationProgress}
                            </p>
                            <p className="text-xs text-gray-500">
                                רק רגע...
                            </p>
                        </div>

                        <div className="flex justify-center gap-2">
                            <div className="w-2.5 h-2.5 bg-orange-500 rounded-full animate-bounce"></div>
                            <div className="w-2.5 h-2.5 bg-orange-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                            <div className="w-2.5 h-2.5 bg-orange-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                    </div>
                </div>
            )}

            <div 
                ref={messagesContainerRef}
                onScroll={handleUserScroll}
                className="flex-1 overflow-y-auto p-3 space-y-3"
                style={{
                    overscrollBehavior: 'contain',
                    WebkitOverflowScrolling: 'touch'
                }}
            >
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-200`}>
                        <div className={`max-w-[85%] sm:max-w-[70%] rounded-3xl px-4 py-3 shadow-md ${
                            msg.type === 'user'
                                ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white'
                                : 'bg-white text-gray-800 border border-orange-100'
                        }`}>
                            <p className="whitespace-pre-wrap text-sm leading-relaxed font-medium">{msg.text}</p>

                            {msg.actions && msg.actions.length > 0 && (
                                <div className="grid grid-cols-2 gap-2 mt-3">
                                    {msg.actions.map((action, actionIdx) => (
                                        <Button
                                            key={actionIdx}
                                            onClick={() => handleAction(action.action)}
                                            className="bg-white hover:bg-orange-50 text-gray-800 border border-orange-200 hover:border-orange-400 rounded-2xl h-auto py-3 px-3 flex flex-col items-center gap-1.5 transition-all shadow-sm hover:shadow-md"
                                            disabled={isLoading || isCreatingEvent}
                                        >
                                            <span className="text-xl">{action.icon}</span>
                                            <span className="text-xs font-semibold leading-tight text-center">{action.text}</span>
                                        </Button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {searchedPlaces.length > 0 && currentStep === 'location_selection' && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                        <div className="text-center mb-3">
                            <Badge variant="secondary" className="text-sm px-3 py-1.5 bg-orange-100 text-orange-700 font-semibold">
                                {selectedPlacesForPoll.length} נבחרו
                            </Badge>
                        </div>

                        {searchedPlaces.slice(0, visiblePlacesCount).map((place, idx) => {
                            const isSelected = selectedPlacesForPoll.find(p => p.id === place.id);

                            return (
                                <Card
                                    key={idx}
                                    className={`p-4 transition-all shadow-sm hover:shadow-lg ${
                                        isSelected
                                            ? 'border-2 border-orange-500 bg-orange-50'
                                            : 'border border-gray-200 hover:border-orange-300'
                                    }`}
                                >
                                    <div className="space-y-2.5">
                                        <div className="flex items-start gap-3">
                                            <Checkbox
                                                checked={!!isSelected}
                                                onCheckedChange={() => togglePlaceForPoll(place)}
                                                className="mt-0.5 w-5 h-5"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start gap-2 mb-1.5">
                                                    <MapPin className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                                                    <div className="flex-1">
                                                        <p className="font-bold text-gray-900 text-sm leading-tight">{place.name}</p>
                                                        <p className="text-xs text-gray-600 mt-0.5">{place.address}</p>
                                                    </div>
                                                </div>
                                                {place.rating && (
                                                    <div className="flex items-center gap-1.5 bg-amber-50 px-2.5 py-1 rounded-full w-fit">
                                                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                                                        <span className="text-xs font-bold text-amber-700">{place.rating}</span>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* כפתור פרטים בצד שמאל - גדול ובולט */}
                                            <button
                                                onClick={() => handlePlaceClick(place)}
                                                className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all text-sm font-semibold flex-shrink-0"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                                <span>פרטים</span>
                                            </button>
                                        </div>

                                        <div className="flex items-center gap-2 pt-2 border-t border-gray-100 flex-wrap">
                                            {place.website && (
                                                <a
                                                    href={place.website}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium bg-blue-50 px-2.5 py-1.5 rounded-full"
                                                >
                                                    <Globe className="w-3 h-3" />
                                                    אתר
                                                </a>
                                            )}
                                            <a
                                                href={getGoogleMapsUrl(place)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800 font-medium bg-green-50 px-2.5 py-1.5 rounded-full"
                                            >
                                                <MapPin className="w-3 h-3" />
                                                מפות
                                            </a>
                                        </div>

                                        {!isSelected && (
                                            <Button
                                                onClick={() => {
                                                    setSelectedPlace(place);
                                                    handleConfirmPlace();
                                                }}
                                                size="sm"
                                                className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white rounded-2xl py-4 text-sm font-bold shadow-md"
                                            >
                                                <Check className="w-4 h-4 mr-1.5" />
                                                בחר מקום זה
                                            </Button>
                                        )}
                                    </div>
                                </Card>
                            );
                        })}

                        {/* כפתור הצג עוד - תמיד לפני ההוראות */}
                        {visiblePlacesCount < searchedPlaces.length && (
                            <div className="flex justify-center pt-3">
                                <Button
                                    onClick={handleShowAllPlaces}
                                    variant="outline"
                                    className="text-orange-600 hover:bg-orange-50 border-2 border-orange-300 rounded-2xl px-5 py-4 text-sm font-semibold shadow-sm"
                                >
                                    📍 הצג עוד ({searchedPlaces.length - visiblePlacesCount})
                                </Button>
                            </div>
                        )}

                        {/* ההוראות - תמיד אחרונות */}
                        <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 pt-2">
                            <div className="max-w-[85%] sm:max-w-[70%] rounded-3xl px-4 py-3 shadow-md bg-white text-gray-800 border border-orange-100">
                                <p className="text-sm leading-relaxed font-medium mb-2">
                                    בחר מקום או צור סקר:
                                </p>
                                <p className="text-xs text-gray-600 mb-3">
                                    💡 סקר מקום מאפשר למשתתפים להצביע על המקום המועדף עליהם
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                    <Button
                                        onClick={() => handleAction('create_location_poll')}
                                        className="bg-white hover:bg-orange-50 text-gray-800 border border-orange-200 hover:border-orange-400 rounded-2xl h-auto py-3 px-3 flex flex-col items-center gap-1.5 transition-all shadow-sm hover:shadow-md"
                                        disabled={isLoading || isCreatingEvent}
                                    >
                                        <span className="text-xl">📊</span>
                                        <span className="text-xs font-semibold leading-tight text-center">צור סקר</span>
                                    </Button>
                                    <Button
                                        onClick={() => handleAction('manual_location')}
                                        className="bg-white hover:bg-orange-50 text-gray-800 border border-orange-200 hover:border-orange-400 rounded-2xl h-auto py-3 px-3 flex flex-col items-center gap-1.5 transition-all shadow-sm hover:shadow-md"
                                        disabled={isLoading || isCreatingEvent}
                                    >
                                        <span className="text-xl">✏️</span>
                                        <span className="text-xs font-semibold leading-tight text-center">כתוב מקום</span>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {(isLoading || isGeneratingPlan) && (
                    <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2">
                        <div className="bg-white rounded-3xl px-5 py-4 shadow-md border border-orange-100">
                            <div className="flex items-center gap-3">
                                <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
                                <div className="flex items-baseline gap-0.5">
                                    <span className="font-bold text-orange-600 text-base">מעבד</span>
                                    <span className="animate-bounce text-orange-400 text-sm">.</span>
                                    <span className="animate-bounce delay-100 text-orange-400 text-sm">.</span>
                                    <span className="animate-bounce delay-200 text-orange-400 text-sm">.</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* אלמנט ריק לגלילה */}
                <div ref={messagesEndRef} />
            </div>

            {/* ✅ כפתור קפיצה למטה */}
            {showScrollToBottom && (
                <div 
                    className="absolute left-1/2 transform -translate-x-1/2 z-10"
                    style={{ bottom: '90px' }}
                >
                    <Button
                        onClick={() => {
                            setIsUserScrolling(false);
                            scrollToBottom(true);
                        }}
                        className="bg-orange-500 hover:bg-orange-600 text-white rounded-full shadow-lg px-4 py-2 flex items-center gap-2"
                        size="sm"
                    >
                        <span className="text-xs font-semibold">הודעות חדשות</span>
                        <ChevronRight className="w-4 h-4 rotate-90" />
                    </Button>
                </div>
            )}

            {/* Input Area - מוצמד להודעה האחרונה */}
            <div className="flex-shrink-0 p-3 bg-white/95 backdrop-blur-sm border-t border-orange-100">
                <div className="flex gap-2 max-w-3xl mx-auto">
                    <Input
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                        onFocus={() => {
                            setTimeout(() => scrollToBottom(true), 300);
                        }}
                        placeholder="כתוב כאן..."
                        disabled={isLoading || isGeneratingPlan || isCreatingEvent}
                        className="flex-1 text-sm py-5 px-4 rounded-2xl border-2 border-orange-200 focus:border-orange-400 shadow-sm"
                        autoComplete="off"
                    />
                    <Button
                        onClick={handleSend}
                        disabled={isLoading || !input.trim() || isGeneratingPlan || isCreatingEvent}
                        className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 rounded-2xl px-5 py-5 shadow-md"
                    >
                        <Send className="w-5 h-5" />
                    </Button>
                </div>
            </div>

            {/* Dialogs */}
            <Dialog open={showDatePicker} onOpenChange={setShowDatePicker}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-lg">בחר תאריך</DialogTitle>
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
                            className="flex-1 bg-orange-500 hover:bg-orange-600 py-5 text-sm"
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

            <Dialog open={showPlaceDetails} onOpenChange={setShowPlaceDetails}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg">
                            <MapPin className="w-5 h-5 text-orange-500" />
                            {selectedPlace?.name}
                        </DialogTitle>
                    </DialogHeader>

                    {selectedPlace && (
                        <div className="space-y-3">
                            <div className="bg-gray-50 p-3 rounded-lg">
                                <p className="text-xs text-gray-700">{selectedPlace.address}</p>
                            </div>

                            {selectedPlace.rating && (
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1.5">
                                        <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                                        <span className="font-bold text-lg">{selectedPlace.rating}</span>
                                    </div>
                                    {selectedPlace.user_ratings_total > 0 && (
                                        <span className="text-xs text-gray-600">
                                            ({selectedPlace.user_ratings_total} ביקורות)
                                        </span>
                                    )}
                                </div>
                            )}

                            <div className="space-y-2">
                                {selectedPlace.phoneNumber && (
                                    <Button
                                        onClick={() => window.open(`tel:${selectedPlace.phoneNumber}`, '_self')}
                                        variant="outline"
                                        className="w-full justify-start py-4 text-sm"
                                    >
                                        <Phone className="w-4 h-4 mr-2" />
                                        {selectedPlace.phoneNumber}
                                    </Button>
                                )}

                                <Button
                                    onClick={() => window.open(getGoogleMapsUrl(selectedPlace), '_blank')}
                                    variant="outline"
                                    className="w-full justify-start py-4 text-sm"
                                >
                                    <MapPin className="w-4 h-4 mr-2" />
                                    פתח במפות
                                </Button>

                                {selectedPlace.website && (
                                    <Button
                                        onClick={() => window.open(selectedPlace.website, '_blank')}
                                        variant="outline"
                                        className="w-full justify-start py-4 text-sm"
                                    >
                                        <Globe className="w-4 h-4 mr-2" />
                                        בקר באתר
                                    </Button>
                                )}
                            </div>

                            <div className="flex gap-2 pt-3 border-t">
                                <Button
                                    onClick={handleConfirmPlace}
                                    className="flex-1 bg-orange-500 hover:bg-orange-600 py-5 text-sm"
                                >
                                    <Check className="w-4 h-4 mr-2" />
                                    בחר מקום זה
                                </Button>
                                <Button
                                    onClick={() => setShowPlaceDetails(false)}
                                    variant="outline"
                                    className="py-5"
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg">
                            <Calendar className="w-5 h-5 text-orange-500" />
                            אישור יצירת אירוע
                        </DialogTitle>
                        <DialogDescription className="text-sm">
                            בדוק את הפרטים
                        </DialogDescription>
                    </DialogHeader>

                    {finalEventData && generatedPlan && (
                        <div className="space-y-4">
                            <div className="bg-gradient-to-br from-orange-50 to-pink-50 p-4 rounded-xl space-y-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-2.5 flex-1">
                                        <FileText className="w-5 h-5 text-orange-600 mt-0.5" />
                                        <div>
                                            <p className="text-xs text-gray-600 mb-0.5">שם האירוע</p>
                                            <p className="font-bold text-gray-900 text-base">{finalEventData.title}</p>
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={handleEditTitle}
                                        className="text-orange-600 hover:text-orange-700"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </Button>
                                </div>

                                {finalEventData.description && (
                                    <div className="flex items-start gap-2.5">
                                        <FileText className="w-5 h-5 text-orange-600 mt-0.5" />
                                        <div>
                                            <p className="text-xs text-gray-600 mb-0.5">תיאור</p>
                                            <p className="text-sm text-gray-700">{finalEventData.description}</p>
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-2.5 flex-1">
                                        <MapPin className="w-5 h-5 text-orange-600 mt-0.5" />
                                        <div>
                                            <p className="text-xs text-gray-600 mb-0.5">מיקום</p>
                                            <p className="font-semibold text-gray-900 text-sm">{finalEventData.location}</p>
                                            {finalEventData.locationPollEnabled && (
                                                <Badge className="mt-1.5 bg-blue-100 text-blue-800 text-xs px-2 py-0.5">
                                                    🗳️ סקר מיקום
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={handleEditLocation}
                                        className="text-orange-600 hover:text-orange-700"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </Button>
                                </div>

                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-2.5 flex-1">
                                        <Calendar className="w-5 h-5 text-orange-600 mt-0.5" />
                                        <div>
                                            <p className="text-xs text-gray-600 mb-0.5">תאריך</p>
                                            {finalEventData.eventDate && (
                                                <p className="font-semibold text-gray-900 text-sm">
                                                    {new Date(finalEventData.eventDate).toLocaleDateString('he-IL')}
                                                    {finalEventData.endDate && (() => {
                                                        try {
                                                            const startDateStr = new Date(finalEventData.eventDate).toDateString();
                                                            const endDateStr = new Date(finalEventData.endDate).toDateString();
                                                            return startDateStr !== endDateStr ? ` - ${new Date(finalEventData.endDate).toLocaleDateString('he-IL')}` : '';
                                                        } catch (e) {
                                                            return '';
                                                        }
                                                    })()}
                                                </p>
                                            )}
                                            {!finalEventData.eventDate && finalEventData.datePollEnabled && (
                                                <Badge className="mt-1.5 bg-blue-100 text-blue-800 text-xs px-2 py-0.5">
                                                    🗳️ סקר תאריכים
                                                </Badge>
                                            )}
                                            {!finalEventData.eventDate && !finalEventData.datePollEnabled && (
                                                <p className="text-sm text-gray-700">לא נקבע</p>
                                            )}
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={handleEditDate}
                                        className="text-orange-600 hover:text-orange-700"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </Button>
                                </div>

                                {finalEventData.participants && (
                                    <div className="flex items-start gap-2.5">
                                        <Users className="w-5 h-5 text-orange-600 mt-0.5" />
                                        <div>
                                            <p className="text-xs text-gray-600 mb-0.5">משתתפים</p>
                                            <p className="text-sm text-gray-700">{finalEventData.participants} משתתפים</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {generatedPlan.itinerary?.length > 0 && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                            <Calendar className="w-4 h-4" />
                                            לו"ז מוצע:
                                        </p>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={handleEditItinerary}
                                            className="text-orange-600 hover:text-orange-700"
                                        >
                                            <Edit className="w-4 h-4 ml-1" />
                                            ערוך
                                        </Button>
                                    </div>
                                    <div className="bg-white border border-orange-100 rounded-xl p-3 space-y-2">
                                        {generatedPlan.itinerary.map((item, idx) => (
                                            <div key={idx} className="flex gap-2.5 text-sm">
                                                <span className="font-mono text-orange-600 font-bold text-xs">{item.time}</span>
                                                <div>
                                                    <p className="font-semibold text-gray-900 text-sm">{item.activity}</p>
                                                    <p className="text-xs text-gray-600">{item.description}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {generatedPlan.tasks?.length > 0 && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                            <TrendingUp className="w-4 h-4" />
                                            משימות:
                                        </p>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={handleEditTasks}
                                            className="text-orange-600 hover:text-orange-700"
                                        >
                                            <Edit className="w-4 h-4 ml-1" />
                                            ערוך
                                        </Button>
                                    </div>
                                    <div className="space-y-1.5">
                                        {generatedPlan.tasks.map((task, idx) => (
                                            <div key={idx} className="flex items-center gap-2.5 text-xs bg-white p-2.5 rounded-xl border border-orange-100">
                                                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                                                <div className="flex-1">
                                                    <p className="font-semibold text-sm">{task.title}</p>
                                                    <p className="text-gray-600 text-xs">{task.description}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-2 pt-3 border-t">
                                <Button
                                    onClick={handleFinalConfirm}
                                    className="flex-1 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 py-5 text-sm font-bold"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            יוצר...
                                        </>
                                    ) : (
                                        <>
                                            <Check className="w-4 h-4 mr-2" />
                                            אשר ויצור
                                        </>
                                    )}
                                </Button>
                                <Button
                                    onClick={handleEdit}
                                    variant="outline"
                                    disabled={isLoading}
                                    className="py-5 text-sm"
                                >
                                    <Edit className="w-4 h-4 mr-2" />
                                    ערוך
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
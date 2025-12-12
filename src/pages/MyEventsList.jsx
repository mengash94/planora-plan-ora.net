import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, ArrowLeft, Calendar, MapPin, Search, List, CalendarDays, Globe, Lock } from 'lucide-react';
import { getMyEvents, getPublicEvents } from '@/components/instabackService';
// PageGuide and useFirstVisit removed - using SideHelpTab instead
import { formatIsraelDate } from '@/components/utils/dateHelpers';
import SEOHead from '@/components/SEOHead';
import EventCalendarView from '@/components/event/EventCalendarView';
import PublicEventsFilters from '@/components/event/PublicEventsFilters';

export default function MyEventsListPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [allEvents, setAllEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState('active');
  const [ownershipFilter, setOwnershipFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [publicEvents, setPublicEvents] = useState([]);
  const [publicFilters, setPublicFilters] = useState({ category: 'all', dateRange: 'all', location: '' });

  // Tab and view states
  const [activeTab, setActiveTab] = useState('my'); // 'my' | 'public'
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'calendar'

  // Removed - using SideHelpTab instead

  useEffect(() => {
    // Scroll to top on mount
    window.scrollTo(0, 0);
    
    if (isAuthLoading) return;

    if (isAuthenticated && user?.id) {
        const loadEvents = async () => {
            setIsLoading(true);
            try {
                // Load my events
                const myEvents = await getMyEvents(user.id);
                
                const sortedEvents = (myEvents || []).sort((a, b) => {
                  const aDate = new Date(a.createdAt || a.created_date || a.created_at || 0);
                  const bDate = new Date(b.createdAt || b.created_date || b.created_at || 0);
                  return bDate - aDate;
                });
                
                setAllEvents(sortedEvents);

                // Load public events
                try {
                    const pubEvents = await getPublicEvents();
                    console.log('[MyEventsList] Public events loaded:', pubEvents.length, pubEvents.map(e => ({ id: e.id, title: e.title, privacy: e.privacy })));
                    // Filter out events user is already part of
                    const myEventIds = new Set(sortedEvents.map(e => e.id));
                    const filteredPublicEvents = (pubEvents || []).filter(e => !myEventIds.has(e.id));
                    console.log('[MyEventsList] Filtered public events (not in my events):', filteredPublicEvents.length);
                    setPublicEvents(filteredPublicEvents);
                } catch (pubError) {
                    console.error("Failed to load public events:", pubError);
                    setPublicEvents([]);
                }
            } catch (error) {
                console.error("Failed to load events:", error);
                setAllEvents([]);
            }
            setIsLoading(false);
        };
        loadEvents();
    } else if (!isAuthenticated && !isAuthLoading) {
        navigate(createPageUrl('Home'));
    }
  }, [isAuthenticated, user, navigate, isAuthLoading]);

  // Filter events whenever filters or events change
  useEffect(() => {
    let filtered = [];

    // Tab filter - determine which events to show
    if (activeTab === 'public') {
      // Show only public events that user is NOT part of
      filtered = [...publicEvents];

      // Apply public events filters
      if (publicFilters.category && publicFilters.category !== 'all') {
        filtered = filtered.filter(event => event.category === publicFilters.category);
      }

      if (publicFilters.dateRange && publicFilters.dateRange !== 'all') {
        const now = new Date();
        filtered = filtered.filter(event => {
          const eventDate = new Date(event.eventDate || event.event_date);
          if (isNaN(eventDate.getTime())) return true;

          switch (publicFilters.dateRange) {
            case 'today':
              return eventDate.toDateString() === now.toDateString();
            case 'week':
              const weekFromNow = new Date(now);
              weekFromNow.setDate(weekFromNow.getDate() + 7);
              return eventDate >= now && eventDate <= weekFromNow;
            case 'month':
              const monthFromNow = new Date(now);
              monthFromNow.setMonth(monthFromNow.getMonth() + 1);
              return eventDate >= now && eventDate <= monthFromNow;
            default:
              return true;
          }
        });
      }

      if (publicFilters.location && publicFilters.location.trim()) {
        const locationQuery = publicFilters.location.toLowerCase().trim();
        filtered = filtered.filter(event => 
          (event.location || '').toLowerCase().includes(locationQuery)
        );
      }
    } else {
      // Show only user's events (my events)
      filtered = [...allEvents];
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(event => (event.status || 'active') === statusFilter);
    }

    // Ownership filter (only applies to my events, not public)
    if (ownershipFilter === 'owned' && activeTab !== 'public') {
      filtered = filtered.filter(event => event.isOwner || (event.owner_id || event.ownerId || event.OwnerId) === user?.id);
    } else if (ownershipFilter === 'participant' && activeTab !== 'public') {
      filtered = filtered.filter(event => !event.isOwner && (event.owner_id || event.ownerId || event.OwnerId) !== user?.id);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(event => 
        (event.title || event.name || '').toLowerCase().includes(query) ||
        (event.description || '').toLowerCase().includes(query) ||
        (event.location || '').toLowerCase().includes(query)
      );
    }

    setFilteredEvents(filtered);
  }, [allEvents, publicEvents, statusFilter, ownershipFilter, activeTab, searchQuery, user, publicFilters]);

  const getStatusConfig = (status) => {
    switch (status) {
      case 'draft':
        return { label: 'טיוטה', color: 'bg-gray-100 text-gray-700', icon: '📝' };
      case 'active':
        return { label: 'פעיל', color: 'bg-green-100 text-green-700', icon: '✅' };
      case 'completed':
        return { label: 'הסתיים', color: 'bg-blue-100 text-blue-700', icon: '🎉' };
      case 'cancelled':
        return { label: 'בוטל', color: 'bg-red-100 text-red-700', icon: '❌' };
      default:
        return { label: 'פעיל', color: 'bg-green-100 text-green-700', icon: '✅' };
    }
  };

  if (isLoading || isAuthLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-black">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">טוען...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50 dark:from-black dark:via-black dark:to-gray-900" style={{ direction: 'rtl' }}>
      <SEOHead 
        title="האירועים שלי | Planora"
        description="צפה בכל האירועים שלך - אירועים שאתה מארגן ואירועים שאתה משתתף בהם. מצא אירועים ציבוריים להצטרפות."
      />


      {/* Header with moved icon and elevated content */}
      <div className="bg-gradient-to-br from-orange-400 via-rose-400 to-pink-500 px-6 pt-8 pb-6">
        <div className="w-full">
          {/* Title and Icon block */}
          <div className="flex items-start gap-4 mb-3">
            {/* Icon moved to right side */}
            <div className="flex-shrink-0 order-2">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Calendar className="w-7 h-7 text-white" />
              </div>
            </div>
            
            {/* Title and description */}
            <div className="flex-1 order-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">
                האירועים שלי
              </h1>
              <p className="text-white/90 text-sm sm:text-base">
                נהל את כל האירועים שלך במקום אחד
              </p>
            </div>
          </div>          

          {/* Create Event Button */}
          <Button 
            onClick={() => navigate(createPageUrl('CreateEvent'))}
            className="w-full sm:w-auto h-11 bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 rounded-xl font-semibold px-6 transition-all hover:scale-105 mb-4"
          >
            <Plus className="w-5 h-5 ml-2" />
            צור אירוע חדש
          </Button>

          {/* Main Tabs - My Events / Public Events */}
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 mx-[-1.5rem] sm:mx-0 rounded-none sm:rounded-xl p-2 sm:p-3">
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setActiveTab('my')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === 'my'
                    ? 'bg-white text-orange-600 shadow-md'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                <Lock className="w-4 h-4" />
                האירועים שלי ({allEvents.length})
              </button>
              <button
                onClick={() => setActiveTab('public')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === 'public'
                    ? 'bg-white text-orange-600 shadow-md'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                <Globe className="w-4 h-4" />
                אירועים ציבוריים ({publicEvents.length})
              </button>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-2.5 h-4 w-4 text-white/70" />
                <Input
                  placeholder="חפש אירוע..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-10 h-9 bg-white/20 border-white/30 text-white placeholder:text-white/70 text-sm"
                />
              </div>
              <div className="flex bg-white/20 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white text-orange-600' : 'text-white'}`}
                  title="תצוגת רשימה"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`p-2 rounded-md transition-all ${viewMode === 'calendar' ? 'bg-white text-orange-600' : 'text-white'}`}
                  title="תצוגת לוח שנה"
                >
                  <CalendarDays className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filters Row - Only for My Events tab */}
            {activeTab === 'my' && (
              <div className="flex flex-wrap gap-1.5">
                {/* Status Pills */}
                {[
                  { value: 'all', label: 'הכל' },
                  { value: 'active', label: 'פעילים' },
                  { value: 'completed', label: 'הסתיימו' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setStatusFilter(option.value)}
                    className={`px-2 py-1 rounded-full text-xs font-medium transition-all ${
                      statusFilter === option.value
                        ? 'bg-white text-orange-600'
                        : 'bg-white/20 text-white hover:bg-white/30'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
                <span className="text-white/50 px-1">|</span>
                {/* Ownership Pills */}
                {[
                  { value: 'all', label: 'הכל' },
                  { value: 'owned', label: 'מארגן' },
                  { value: 'participant', label: 'משתתף' }
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setOwnershipFilter(option.value)}
                    className={`px-2 py-1 rounded-full text-xs font-medium transition-all ${
                      ownershipFilter === option.value
                        ? 'bg-white text-orange-600'
                        : 'bg-white/20 text-white hover:bg-white/30'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}

            {/* Filters Row - For Public Events tab */}
            {activeTab === 'public' && (
              <PublicEventsFilters 
                onFilterChange={(filters) => {
                  setPublicFilters(filters);
                }}
              />
            )}
            </div>
        </div>
      </div>

      {/* Events Content */}
      <div className="px-4 sm:px-6 -mt-2 pb-4">
        <div className="w-full">
          {/* Calendar View */}
          {viewMode === 'calendar' && (
            <div className="mb-4">
              <EventCalendarView events={filteredEvents} userId={user?.id} />
            </div>
          )}

          {/* List View */}
          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-xl border-0">
            <CardHeader className="pb-2 px-3 sm:px-6">
              <CardTitle className="text-lg sm:text-xl text-gray-900 dark:text-white flex items-center justify-between">
                <span>
                  {activeTab === 'public' ? 'אירועים ציבוריים' : 'האירועים שלי'} 
                  ({filteredEvents.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 px-3 sm:px-6">
              {filteredEvents.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  {searchQuery ? (
                    <>
                      <Search className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                      <p className="text-lg sm:text-xl font-semibold text-gray-600 dark:text-gray-300 mb-2">
                        לא נמצאו תוצאות לחיפוש
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        נסה לחפש במילים אחרות
                      </p>
                    </>
                  ) : activeTab === 'public' ? (
                    <>
                      <Globe className="w-12 h-12 sm:w-16 sm:h-16 text-green-300 mx-auto mb-3" />
                      <p className="text-lg sm:text-xl font-semibold text-gray-600 dark:text-gray-300 mb-2">
                        עדיין אין אירועים ציבוריים
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-xs mx-auto">
                        היה הראשון לשתף אירוע עם הקהילה! צור אירוע ציבורי כדי שאחרים יוכלו להצטרף
                      </p>
                      <Button 
                        onClick={() => navigate(createPageUrl('CreateEvent'))}
                        className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-xl font-semibold text-sm"
                      >
                        <Plus className="w-4 h-4 ml-2" />
                        צור אירוע ציבורי
                      </Button>
                    </>
                  ) : (
                    <>
                      <Calendar className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                      <p className="text-lg sm:text-xl font-semibold text-gray-600 dark:text-gray-300 mb-2">
                        עדיין לא יצרת אף אירוע
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">צור את האירוע הראשון שלך!</p>
                      <Button 
                        onClick={() => navigate(createPageUrl('CreateEvent'))}
                        className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-xl font-semibold text-sm"
                      >
                        <Plus className="w-4 h-4 ml-2" />
                        צור אירוע
                      </Button>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredEvents.map(event => {
                    const displayTitle = event.title || event.name || event.eventTitle || event.event_name || 'ללא שם';
                    const displayDate = event.eventDate || event.event_date || event.date;
                    const formattedDate = displayDate ? formatIsraelDate(displayDate) : null; 
                    const statusConfig = getStatusConfig(event.status || 'active');
                    const isOwner = event.isOwner || (event.owner_id || event.ownerId || event.OwnerId) === user?.id;
                    const isPublicEvent = activeTab === 'public';
                    
                    return (
                      <Link to={createPageUrl(isPublicEvent ? `JoinEvent?id=${event.id}` : `EventDetail?id=${event.id}`)} key={event.id}>
                        <Card className="hover:shadow-lg transition-all duration-200 active:scale-[0.99] border-0 bg-gradient-to-r from-gray-50 to-orange-50/30 dark:from-gray-800 dark:to-gray-800/50 cursor-pointer">
                          <CardContent className="p-3 sm:p-4">
                            <div className="flex items-center gap-3">
                              <div className="flex-1 min-w-0">
                                {/* Title */}
                                <h3 className="font-bold text-base sm:text-lg text-gray-900 dark:text-white truncate mb-1.5">
                                  {displayTitle}
                                </h3>
                                
                                {/* Badges Row */}
                                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                                  {/* Status Badge */}
                                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] sm:text-xs font-medium flex items-center gap-0.5 ${statusConfig.color}`}>
                                    <span>{statusConfig.icon}</span>
                                    {statusConfig.label}
                                  </span>
                                  
                                  {/* Ownership Badge - only for my events */}
                                  {!isPublicEvent && (
                                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${
                                      isOwner ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'
                                    }`}>
                                      {isOwner ? 'מארגן' : 'משתתף'}
                                    </span>
                                  )}

                                  {/* Public Badge */}
                                  {(event.privacy === 'public' || isPublicEvent) && (
                                    <span className="px-1.5 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-green-100 text-green-800">
                                      🌍 ציבורי
                                    </span>
                                  )}
                                </div>

                                {/* Date, Location and Cost */}
                                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600">
                                  {formattedDate && (
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                                      {formattedDate}
                                    </span>
                                  )}
                                  {event.location && (
                                    <span className="flex items-center gap-1 truncate max-w-[150px]">
                                      <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                                      {event.location}
                                    </span>
                                  )}
                                  {/* Participation Cost Badge */}
                                  {(event.participationCost || event.participation_cost) > 0 && (
                                    <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">
                                      💰 ₪{Number(event.participationCost || event.participation_cost).toLocaleString()}
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              {/* Arrow */}
                              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                isPublicEvent 
                                  ? 'bg-gradient-to-br from-green-400 to-green-600'
                                  : event.status === 'completed' 
                                    ? 'bg-gradient-to-br from-blue-400 to-blue-600'
                                    : 'bg-gradient-to-br from-orange-400 to-rose-400'
                              }`}>
                                <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
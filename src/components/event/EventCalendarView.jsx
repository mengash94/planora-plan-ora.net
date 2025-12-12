import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function EventCalendarView({ events = [], userId }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Hebrew month names
  const hebrewMonths = [
    'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
    'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
  ];

  const hebrewDays = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

  // Get events grouped by date
  const eventsByDate = useMemo(() => {
    const map = new Map();
    events.forEach(event => {
      const eventDate = event.eventDate || event.event_date || event.date;
      if (eventDate) {
        const dateKey = new Date(eventDate).toDateString();
        if (!map.has(dateKey)) {
          map.set(dateKey, []);
        }
        map.get(dateKey).push(event);
      }
    });
    return map;
  }, [events]);

  // Get calendar days
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startDay = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days = [];

    // Previous month days
    for (let i = 0; i < startDay; i++) {
      const prevMonthDay = new Date(currentYear, currentMonth, -startDay + i + 1);
      days.push({ date: prevMonthDay, isCurrentMonth: false });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const day = new Date(currentYear, currentMonth, i);
      days.push({ date: day, isCurrentMonth: true });
    }

    // Next month days to fill grid
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const nextMonthDay = new Date(currentYear, currentMonth + 1, i);
      days.push({ date: nextMonthDay, isCurrentMonth: false });
    }

    return days;
  }, [currentMonth, currentYear]);

  const goToPrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const today = new Date().toDateString();

  return (
    <div className="bg-white rounded-xl shadow-lg p-3 sm:p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="sm" onClick={goToPrevMonth}>
          <ChevronRight className="w-5 h-5" />
        </Button>
        
        <div className="text-center">
          <h3 className="font-bold text-lg">
            {hebrewMonths[currentMonth]} {currentYear}
          </h3>
          <Button variant="link" size="sm" onClick={goToToday} className="text-orange-600 p-0 h-auto">
            היום
          </Button>
        </div>

        <Button variant="ghost" size="sm" onClick={goToNextMonth}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
      </div>

      {/* Days header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {hebrewDays.map((day, i) => (
          <div key={i} className="text-center text-xs font-medium text-gray-500 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((dayInfo, index) => {
          const dateKey = dayInfo.date.toDateString();
          const dayEvents = eventsByDate.get(dateKey) || [];
          const isToday = dateKey === today;
          const hasEvents = dayEvents.length > 0;

          return (
            <div
              key={index}
              className={`
                min-h-[48px] sm:min-h-[60px] p-1 rounded-lg text-center relative
                ${!dayInfo.isCurrentMonth ? 'text-gray-300' : 'text-gray-700'}
                ${isToday ? 'bg-orange-100 ring-2 ring-orange-400' : ''}
                ${hasEvents && dayInfo.isCurrentMonth ? 'bg-blue-50' : ''}
              `}
            >
              <span className={`text-xs sm:text-sm ${isToday ? 'font-bold text-orange-600' : ''}`}>
                {dayInfo.date.getDate()}
              </span>
              
              {/* Event dots */}
              {hasEvents && dayInfo.isCurrentMonth && (
                <div className="flex flex-wrap justify-center gap-0.5 mt-1">
                  {dayEvents.slice(0, 3).map((event, i) => {
                    const isOwner = event.isOwner || (event.owner_id || event.ownerId) === userId;
                    return (
                      <Link 
                        key={i} 
                        to={createPageUrl(`EventDetail?id=${event.id}`)}
                        className={`
                          w-2 h-2 rounded-full cursor-pointer hover:scale-125 transition-transform
                          ${isOwner ? 'bg-orange-500' : 'bg-blue-500'}
                        `}
                        title={event.title || event.name}
                      />
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <span className="text-[8px] text-gray-500">+{dayEvents.length - 3}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-orange-500" />
          <span>מארגן</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span>משתתף</span>
        </div>
      </div>

      {/* Events list for current month */}
      {events.filter(e => {
        const eventDate = e.eventDate || e.event_date || e.date;
        if (!eventDate) return false;
        const d = new Date(eventDate);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      }).length > 0 && (
        <div className="mt-4 border-t pt-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">אירועים החודש:</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {events
              .filter(e => {
                const eventDate = e.eventDate || e.event_date || e.date;
                if (!eventDate) return false;
                const d = new Date(eventDate);
                return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
              })
              .sort((a, b) => new Date(a.eventDate || a.event_date) - new Date(b.eventDate || b.event_date))
              .map(event => {
                const eventDate = new Date(event.eventDate || event.event_date);
                const isOwner = event.isOwner || (event.owner_id || event.ownerId) === userId;
                return (
                  <Link 
                    key={event.id} 
                    to={createPageUrl(`EventDetail?id=${event.id}`)}
                    className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className={`w-1 h-8 rounded-full ${isOwner ? 'bg-orange-500' : 'bg-blue-500'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{event.title || event.name}</p>
                      <p className="text-xs text-gray-500">
                        {eventDate.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })}
                        {event.location && (
                          <span className="flex items-center gap-1 inline-flex mr-2">
                            <MapPin className="w-3 h-3" />
                            {event.location.substring(0, 15)}
                          </span>
                        )}
                      </p>
                    </div>
                  </Link>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
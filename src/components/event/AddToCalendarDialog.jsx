import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, Download, ExternalLink, Check, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { generateICSFile, generateGoogleCalendarUrl } from '@/components/utils/calendarHelpers';
import { formatIsraelDate, formatIsraelTime } from '@/components/utils/dateHelpers';

export default function AddToCalendarDialog({ 
  isOpen, 
  onOpenChange, 
  event,
  hasActiveDatePoll = false,
  onNavigateToPoll
}) {
  const [addedTo, setAddedTo] = useState(null);

  if (!event) return null;

  const eventDate = event.eventDate || event.event_date;
  const endDate = event.endDate || event.end_date;
  const hasDate = !!eventDate;

  // Safe date parsing helper
  const safeParseDate = (dateValue) => {
    if (!dateValue) return null;
    try {
      const d = new Date(dateValue);
      return isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  };

  const startDateObj = safeParseDate(eventDate);
  const endDateObj = safeParseDate(endDate);
  const hasValidDate = !!startDateObj;

  // Generate calendar URLs
  const googleCalendarUrl = hasValidDate ? generateGoogleCalendarUrl(event) : null;

  // Outlook Web URL
  const generateOutlookUrl = () => {
    if (!startDateObj) return null;
    const end = endDateObj || new Date(startDateObj.getTime() + 2 * 60 * 60 * 1000);
    
    const formatOutlookDate = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    
    const params = new URLSearchParams({
      path: '/calendar/action/compose',
      rru: 'addevent',
      startdt: formatOutlookDate(startDateObj),
      enddt: formatOutlookDate(end),
      subject: event.title || 'אירוע',
      body: event.description || '',
      location: event.location || ''
    });
    
    return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
  };

  const outlookUrl = hasValidDate ? generateOutlookUrl() : null;

  // Yahoo Calendar URL
  const generateYahooUrl = () => {
    if (!startDateObj) return null;
    const end = endDateObj || new Date(startDateObj.getTime() + 2 * 60 * 60 * 1000);
    
    const formatYahooDate = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    
    const params = new URLSearchParams({
      v: '60',
      title: event.title || 'אירוע',
      st: formatYahooDate(startDateObj),
      et: formatYahooDate(end),
      desc: event.description || '',
      in_loc: event.location || ''
    });
    
    return `https://calendar.yahoo.com/?${params.toString()}`;
  };

  const yahooUrl = hasValidDate ? generateYahooUrl() : null;

  const handleDownloadICS = () => {
    const icsContent = generateICSFile(event);
    if (icsContent) {
      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${event.title || 'event'}.ics`;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
      
      setAddedTo('ics');
      toast.success('קובץ יומן הורד! 📅');
    }
  };

  const handleOpenCalendar = (type, url) => {
    window.open(url, '_blank');
    setAddedTo(type);
    toast.success('נפתח ביומן! 📅');
  };

  const calendarOptions = [
    {
      id: 'google',
      name: 'Google Calendar',
      icon: '📆',
      color: 'bg-blue-500 hover:bg-blue-600',
      url: googleCalendarUrl,
      description: 'הוסף ליומן גוגל'
    },
    {
      id: 'outlook',
      name: 'Outlook',
      icon: '📧',
      color: 'bg-sky-500 hover:bg-sky-600',
      url: outlookUrl,
      description: 'הוסף ליומן Outlook'
    },
    {
      id: 'yahoo',
      name: 'Yahoo Calendar',
      icon: '📅',
      color: 'bg-purple-500 hover:bg-purple-600',
      url: yahooUrl,
      description: 'הוסף ליומן יאהו'
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Calendar className="w-6 h-6 text-orange-500" />
            הוסף ליומן
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Event Preview */}
          <div className="bg-gradient-to-r from-orange-50 to-rose-50 rounded-xl p-4 border border-orange-200">
            <h3 className="font-bold text-lg text-gray-900 mb-2">{event.title}</h3>
            {hasValidDate ? (
              <div className="space-y-1 text-sm">
                <p className="flex items-center gap-2 text-gray-700">
                  <Calendar className="w-4 h-4 text-orange-500" />
                  {formatIsraelDate(eventDate)} בשעה {formatIsraelTime(eventDate)}
                </p>
                {event.location && (
                  <p className="flex items-center gap-2 text-gray-600">
                    📍 {event.location}
                  </p>
                )}
              </div>
            ) : hasActiveDatePoll ? (
              <div className="bg-yellow-100 rounded-lg p-3 text-sm">
                <p className="text-yellow-800 font-medium">⏳ תאריך האירוע טרם נקבע</p>
                <p className="text-yellow-700 text-xs mt-1">קיים סקר פעיל לקביעת התאריך</p>
                {onNavigateToPoll && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={onNavigateToPoll}
                    className="mt-2 text-yellow-800 border-yellow-400"
                  >
                    עבור לסקר
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">לא נקבע תאריך לאירוע</p>
            )}
          </div>

          {hasValidDate && (
            <>
              {/* Calendar Options */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">בחר יומן:</p>
                <div className="grid gap-2">
                  {calendarOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => handleOpenCalendar(option.id, option.url)}
                      disabled={!option.url}
                      className={`flex items-center justify-between p-3 rounded-xl text-white transition-all ${option.color} ${
                        !option.url ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.98]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{option.icon}</span>
                        <div className="text-right">
                          <p className="font-medium">{option.name}</p>
                          <p className="text-xs opacity-80">{option.description}</p>
                        </div>
                      </div>
                      {addedTo === option.id ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <ExternalLink className="w-4 h-4 opacity-70" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Download ICS Option */}
              <div className="border-t pt-4">
                <button
                  onClick={handleDownloadICS}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-100 hover:bg-gray-200 transition-all active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                      <Smartphone className="w-5 h-5 text-gray-600" />
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">הורד קובץ ICS</p>
                      <p className="text-xs text-gray-600">לאפליקציית יומן במכשיר</p>
                    </div>
                  </div>
                  {addedTo === 'ics' ? (
                    <Check className="w-5 h-5 text-green-600" />
                  ) : (
                    <Download className="w-4 h-4 text-gray-500" />
                  )}
                </button>
              </div>

              {/* Helper Text */}
              <p className="text-xs text-gray-500 text-center">
                💡 הקובץ יכלול את כל פרטי האירוע כולל תזכורת
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
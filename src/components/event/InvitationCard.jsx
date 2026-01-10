import React from 'react';
import { formatIsraelDate, formatIsraelTime } from '@/components/utils/dateHelpers';
import { MapPin, Calendar } from 'lucide-react';

export default function InvitationCard({ template, event }) {
  if (!template) return null;

  return (
    <div className="w-full rounded-xl overflow-hidden shadow-lg bg-white relative mb-6">
      {/* Background Image */}
      <div className="relative aspect-[4/5] w-full">
        <img 
          src={template.preview_image_url || event.cover_image_url} 
          alt="Invitation" 
          className="w-full h-full object-cover"
        />
        
        {/* Overlay Content */}
        <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center text-center p-6 text-white">
          <div className="bg-black/40 backdrop-blur-md p-6 rounded-xl border border-white/20 w-full max-w-xs shadow-2xl">
            {template.template_data?.greeting && (
              <p className="text-xl font-serif italic mb-3 text-orange-200">{template.template_data.greeting}</p>
            )}
            
            <h2 className="text-3xl font-bold mb-4 leading-tight drop-shadow-lg">{event.title}</h2>
            
            <div className="space-y-3 text-sm font-medium">
              {(event.eventDate || event.event_date) && (
                <div className="flex items-center justify-center gap-2">
                  <Calendar className="w-4 h-4 text-orange-300" />
                  <span className="drop-shadow-md">
                    {formatIsraelDate(event.eventDate || event.event_date)}
                    {` • ${formatIsraelTime(event.eventDate || event.event_date)}`}
                  </span>
                </div>
              )}
              
              {event.location && (
                <div className="flex items-center justify-center gap-2">
                  <MapPin className="w-4 h-4 text-orange-300" />
                  <span className="drop-shadow-md">{event.location}</span>
                </div>
              )}
            </div>

            {template.template_data?.closing && (
              <p className="mt-6 text-sm opacity-90 font-serif italic">{template.template_data.closing}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
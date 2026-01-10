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
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
          <div 
            className="backdrop-blur-sm p-6 rounded-xl border w-full max-w-xs shadow-2xl transition-colors duration-300"
            style={{
              backgroundColor: template.template_data?.overlayColor || 'rgba(0, 0, 0, 0.4)',
              borderColor: template.template_data?.accentColor ? `${template.template_data.accentColor}40` : 'rgba(255, 255, 255, 0.2)',
              color: template.template_data?.textColor || '#ffffff'
            }}
          >
            {template.template_data?.greeting && (
              <p 
                className="text-xl italic mb-3"
                style={{ 
                  color: template.template_data?.accentColor || '#fed7aa',
                  fontFamily: template.template_data?.fontFamily || 'serif'
                }}
              >
                {template.template_data.greeting}
              </p>
            )}
            
            <h2 
              className="text-3xl font-bold mb-4 leading-tight drop-shadow-md"
              style={{ fontFamily: template.template_data?.fontFamily || 'sans-serif' }}
            >
              {event.title}
            </h2>
            
            <div className="space-y-3 text-sm font-medium">
              {(event.eventDate || event.event_date) && (
                <div className="flex items-center justify-center gap-2">
                  <Calendar 
                    className="w-4 h-4" 
                    style={{ color: template.template_data?.accentColor || '#fed7aa' }}
                  />
                  <span>
                    {formatIsraelDate(event.eventDate || event.event_date)}
                    {` • ${formatIsraelTime(event.eventDate || event.event_date)}`}
                  </span>
                </div>
              )}
              
              {event.location && (
                <div className="flex items-center justify-center gap-2">
                  <MapPin 
                    className="w-4 h-4" 
                    style={{ color: template.template_data?.accentColor || '#fed7aa' }}
                  />
                  <span>{event.location}</span>
                </div>
              )}
            </div>

            {template.template_data?.closing && (
              <p 
                className="mt-6 text-sm opacity-90 italic"
                style={{ fontFamily: template.template_data?.fontFamily || 'serif' }}
              >
                {template.template_data.closing}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
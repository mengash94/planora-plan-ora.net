import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, MapPin, Users, Tag, Clock, FileText, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

export default function EventSummaryDialog({ 
    open, 
    onOpenChange, 
    eventData, 
    onEventDataChange,
    onConfirm,
    isLoading 
}) {
    const formatDate = (date) => {
        if (!date) return null;
        try {
            return format(new Date(date), 'EEEE, d בMMMM yyyy בשעה HH:mm', { locale: he });
        } catch {
            return date;
        }
    };

    const handleFieldChange = (field, value) => {
        onEventDataChange({ ...eventData, [field]: value });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Sparkles className="w-6 h-6 text-orange-500" />
                        סיכום האירוע
                    </DialogTitle>
                </DialogHeader>

                <p className="text-gray-600 text-sm mb-4">
                    בדוק את הפרטים ולחץ "צור אירוע" או ערוך לפי הצורך:
                </p>

                <div className="space-y-4">
                    {/* Title */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                            <Tag className="w-4 h-4" />
                            שם האירוע
                        </label>
                        <Input
                            value={eventData.title || ''}
                            onChange={(e) => handleFieldChange('title', e.target.value)}
                            placeholder="שם האירוע"
                            className="border-orange-200 focus:border-orange-400"
                        />
                    </div>

                    {/* Event Type */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                            <FileText className="w-4 h-4" />
                            סוג האירוע
                        </label>
                        <Input
                            value={eventData.eventType || eventData.category || ''}
                            onChange={(e) => handleFieldChange('eventType', e.target.value)}
                            placeholder="סוג האירוע"
                            className="border-orange-200 focus:border-orange-400"
                        />
                    </div>

                    {/* Date */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                            <Calendar className="w-4 h-4" />
                            תאריך
                        </label>
                        {eventData.datePollEnabled ? (
                            <div className="bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-sm">
                                🗳️ סקר תאריכים יפתח לאחר יצירת האירוע
                            </div>
                        ) : eventData.eventDate ? (
                            <div className="bg-orange-50 text-orange-700 px-3 py-2 rounded-lg">
                                {formatDate(eventData.eventDate)}
                            </div>
                        ) : (
                            <div className="bg-gray-100 text-gray-500 px-3 py-2 rounded-lg text-sm">
                                לא נבחר תאריך
                            </div>
                        )}
                    </div>

                    {/* Location */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                            <MapPin className="w-4 h-4" />
                            מיקום
                        </label>
                        {eventData.locationPollEnabled ? (
                            <div className="bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-sm">
                                🗳️ סקר מקומות יפתח לאחר יצירת האירוע
                                {eventData.locationPollOptions && eventData.locationPollOptions.length > 0 && (
                                    <div className="mt-2">
                                        <span className="font-medium">אפשרויות: </span>
                                        {eventData.locationPollOptions.map(p => p.name).join(', ')}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <Input
                                value={eventData.location || eventData.destination || ''}
                                onChange={(e) => handleFieldChange('location', e.target.value)}
                                placeholder="מיקום האירוע"
                                className="border-orange-200 focus:border-orange-400"
                            />
                        )}
                    </div>

                    {/* Participants */}
                    {eventData.participants && (
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                <Users className="w-4 h-4" />
                                מספר משתתפים
                            </label>
                            <Input
                                type="number"
                                value={eventData.participants || ''}
                                onChange={(e) => handleFieldChange('participants', parseInt(e.target.value) || '')}
                                placeholder="כמה אנשים"
                                className="border-orange-200 focus:border-orange-400"
                            />
                        </div>
                    )}

                    {/* Description */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                            <FileText className="w-4 h-4" />
                            תיאור (אופציונלי)
                        </label>
                        <Textarea
                            value={eventData.description || ''}
                            onChange={(e) => handleFieldChange('description', e.target.value)}
                            placeholder="תיאור קצר של האירוע..."
                            rows={3}
                            className="border-orange-200 focus:border-orange-400"
                        />
                    </div>
                </div>

                <DialogFooter className="flex gap-2 mt-6">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isLoading}
                    >
                        חזור לעריכה
                    </Button>
                    <Button
                        onClick={onConfirm}
                        disabled={isLoading || !eventData.title}
                        className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600"
                    >
                        {isLoading ? (
                            <>
                                <span className="animate-spin mr-2">⏳</span>
                                יוצר אירוע...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4 ml-2" />
                                צור אירוע!
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
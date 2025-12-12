import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar as CalendarIcon, X, CalendarRange } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { he } from 'date-fns/locale';
import MobileDateTimePicker from './MobileDateTimePicker';

export default function DateRangePicker({ 
    startDate, 
    endDate, 
    onStartDateChange, 
    onEndDateChange,
    showTime = true,
    label = "תאריך",
    placeholder = "בחר תאריך",
    allowRange = true,
    required = false,
    requireEndDate = false
}) {
    const [useRange, setUseRange] = useState(!!endDate);

    const handleRangeToggle = (checked) => {
        setUseRange(checked);
        if (!checked) {
            onEndDateChange(null);
        }
    };

    const clearDates = () => {
        onStartDateChange(null);
        onEndDateChange(null);
        setUseRange(false);
    };

    const formatDateDisplay = () => {
        if (!startDate) return placeholder;
        
        const start = new Date(startDate);
        const end = endDate ? new Date(endDate) : null;
        
        const isSameDayEvent = end && isSameDay(start, end);

        if (!end || isSameDayEvent || !useRange) {
            return showTime 
                ? format(start, 'dd/MM/yyyy HH:mm', { locale: he })
                : format(start, 'dd/MM/yyyy', { locale: he });
        }

        const startStr = format(start, 'dd/MM HH:mm', { locale: he });
        const endStr = format(end, 'dd/MM HH:mm', { locale: he });

        return `${startStr} - ${endStr}`;
    };

    return (
        <div className="space-y-3" dir="rtl">
            <div className="flex items-center justify-between">
                <Label>
                    {label}
                    {required && <span className="text-red-500 mr-1">*</span>}
                </Label>
                
                {allowRange && (
                    <div className="flex items-center gap-2">
                        <Checkbox
                            id="range-mode"
                            checked={useRange}
                            onCheckedChange={handleRangeToggle}
                        />
                        <label
                            htmlFor="range-mode"
                            className="text-sm text-gray-600 cursor-pointer flex items-center gap-1"
                        >
                            <CalendarRange className="w-4 h-4" />
                            טווח תאריכים
                        </label>
                    </div>
                )}
            </div>

            {!useRange ? (
                // Single date picker
                <MobileDateTimePicker
                    value={startDate}
                    onChange={onStartDateChange}
                    label=""
                    placeholder={placeholder}
                    showTime={showTime}
                    required={required}
                />
            ) : (
                // Range: two date pickers
                <div className="space-y-3">
                    <MobileDateTimePicker
                        value={startDate}
                        onChange={onStartDateChange}
                        label="תאריך התחלה"
                        placeholder="בחר תאריך התחלה"
                        showTime={showTime}
                        required={required}
                    />
                    
                    <MobileDateTimePicker
                        value={endDate}
                        onChange={onEndDateChange}
                        label="תאריך סיום"
                        placeholder="בחר תאריך סיום"
                        showTime={showTime}
                        minDate={startDate ? new Date(startDate) : new Date()}
                        required={requireEndDate}
                    />
                </div>
            )}

            {startDate && !useRange && (
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearDates}
                    className="text-gray-500 hover:text-gray-700"
                >
                    <X className="w-4 h-4 ml-1" />
                    נקה
                </Button>
            )}
        </div>
    );
}
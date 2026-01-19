
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

// Hebrew month names
const MONTHS = [
  { value: 0, label: 'ינואר' },
  { value: 1, label: 'פברואר' },
  { value: 2, label: 'מרץ' },
  { value: 3, label: 'אפריל' },
  { value: 4, label: 'מאי' },
  { value: 5, label: 'יוני' },
  { value: 6, label: 'יולי' },
  { value: 7, label: 'אוגוסט' },
  { value: 8, label: 'ספטמבר' },
  { value: 9, label: 'אוקטובר' },
  { value: 10, label: 'נובמבר' },
  { value: 11, label: 'דצמבר' }
];

// Wheel Picker Component
function WheelPicker({ items, selected, onChange, label }) {
  const containerRef = useRef(null);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef(null);
  const itemHeight = 48;
  const [initialized, setInitialized] = useState(false);

  // Initialize scroll position once, or re-center if items/selected change
  useEffect(() => {
    if (containerRef.current && selected !== null) {
      const index = items.findIndex(item => item.value === selected);
      if (!initialized && index >= 0) {
        containerRef.current.scrollTop = index * itemHeight;
        setInitialized(true);
      } else if (initialized) {
        // If selected item is not in current items list, or its position changed, re-scroll
        // This is important when filtering items (e.g. months/days based on year/month selection)
        if (index >= 0) {
          containerRef.current.scrollTop = index * itemHeight;
        } else if (items.length > 0) {
          // If the previously selected item is no longer available, scroll to the first available item.
          containerRef.current.scrollTop = 0;
          onChange(items[0].value); // Automatically select the first available item
        }
      }
    }
  }, [selected, items, itemHeight, initialized, onChange]); // Added onChange to dependencies for the auto-selection

  const handleScroll = () => {
    isScrollingRef.current = true;
    
    // Clear previous timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Wait for scroll to stop
    scrollTimeoutRef.current = setTimeout(() => {
      if (!containerRef.current) return;
      
      const scrollTop = containerRef.current.scrollTop;
      const index = Math.round(scrollTop / itemHeight);
      const clampedIndex = Math.max(0, Math.min(index, items.length - 1));
      
      // Snap to position
      containerRef.current.scrollTop = clampedIndex * itemHeight;
      
      // Update value
      if (items[clampedIndex] && items[clampedIndex].value !== selected) {
        onChange(items[clampedIndex].value);
      }
      
      isScrollingRef.current = false;
    }, 100);
  };

  return (
    <div className="flex flex-col items-center">
      <div className="text-xs text-gray-500 mb-2 font-medium">{label}</div>
      <div className="relative h-40 w-24">
        {/* Gradient overlays */}
        <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-white to-transparent pointer-events-none z-10"></div>
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent pointer-events-none z-10"></div>
        
        {/* Selection indicator */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="w-full h-12 border-y-2 border-orange-400 bg-orange-50/20 rounded"></div>
        </div>
        
        {/* Scrollable items */}
        <div
          ref={containerRef}
          className="h-full overflow-y-scroll scrollbar-hide"
          onScroll={handleScroll}
          style={{ 
            scrollSnapType: 'y mandatory',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {/* Top padding */}
          <div style={{ height: itemHeight }}></div>
          
          {items.map((item) => (
            <div
              key={item.value}
              className={`flex items-center justify-center transition-all cursor-pointer ${
                item.value === selected
                  ? 'text-gray-900 font-bold text-lg'
                  : 'text-gray-400 text-base'
              }`}
              style={{ 
                height: itemHeight,
                scrollSnapAlign: 'center'
              }}
              onClick={() => {
                if (!isScrollingRef.current) {
                  const index = items.findIndex(i => i.value === item.value);
                  if (containerRef.current) {
                    containerRef.current.scrollTo({
                      top: index * itemHeight,
                      behavior: 'smooth'
                    });
                  }
                  onChange(item.value);
                }
              }}
            >
              {item.label}
            </div>
          ))}
          
          {/* Bottom padding */}
          <div style={{ height: itemHeight }}></div>
        </div>
      </div>
    </div>
  );
}

export default function MobileDateTimePicker({
  value,
  onChange,
  label = "תאריך ושעה",
  placeholder = "בחר תאריך ושעה",
  showTime = true,
  minDate = null, // ✅ Changed default to null
  required = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  
  // ✅ Always start from today unless there's an existing value
  const today = new Date();
  const effectiveMinDate = minDate || today; // Use minDate if provided, else today
  
  // Initialize with current value or today
  const initialDate = value ? new Date(value) : today; // Use 'today' if no value
  const [selectedDay, setSelectedDay] = useState(initialDate.getDate());
  const [selectedMonth, setSelectedMonth] = useState(initialDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(initialDate.getFullYear());
  const [selectedHour, setSelectedHour] = useState(initialDate.getHours());
  const [selectedMinute, setSelectedMinute] = useState(Math.round(initialDate.getMinutes() / 5) * 5);

  // Update internal state when value changes from outside
  useEffect(() => {
    if (value) {
      const date = new Date(value);
      setSelectedDay(date.getDate());
      setSelectedMonth(date.getMonth());
      setSelectedYear(date.getFullYear());
      setSelectedHour(date.getHours());
      setSelectedMinute(Math.round(date.getMinutes() / 5) * 5);
    }
  }, [value]);

  // ✅ Generate years starting from current year
  const currentYear = today.getFullYear(); // Use today.getFullYear() for consistency
  const years = Array.from({ length: 6 }, (_, i) => ({
    value: currentYear + i,
    label: String(currentYear + i)
  }));

  // Generate days based on selected month and year
  const getDaysInMonth = (month, year) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);
  
  // ✅ Filter days - if it's the current month/year, start from today's date
  const minDay = (selectedYear === today.getFullYear() && selectedMonth === today.getMonth()) 
    ? today.getDate() 
    : 1;
    
  const days = Array.from({ length: daysInMonth - minDay + 1 }, (_, i) => ({
    value: minDay + i,
    label: String(minDay + i)
  }));

  // Adjust day if it's out of range for the new month or less than minDay
  useEffect(() => {
    if (selectedDay > daysInMonth) {
      setSelectedDay(daysInMonth);
    } else if (selectedDay < minDay) { // Adjust if selected day is before the allowed minDay
      setSelectedDay(minDay);
    }
  }, [selectedMonth, selectedYear, daysInMonth, selectedDay, minDay]);

  // ✅ Filter months - if it's the current year, start from the current month
  const availableMonths = selectedYear === today.getFullYear()
    ? MONTHS.filter(m => m.value >= today.getMonth())
    : MONTHS;

  // Adjust selectedMonth if it falls outside availableMonths
  useEffect(() => {
    const isMonthAvailable = availableMonths.some(m => m.value === selectedMonth);
    if (!isMonthAvailable && availableMonths.length > 0) {
      setSelectedMonth(availableMonths[0].value);
    }
  }, [selectedYear, selectedMonth, availableMonths]); // Re-run when year or availableMonths change

  // Generate hours (0-23)
  const hours = Array.from({ length: 24 }, (_, i) => ({
    value: i,
    label: String(i).padStart(2, '0')
  }));

  // Generate minutes (0-59, step 5)
  const minutes = Array.from({ length: 12 }, (_, i) => ({
    value: i * 5,
    label: String(i * 5).padStart(2, '0')
  }));

  const handleConfirm = () => {
    let newDate = new Date(selectedYear, selectedMonth, selectedDay, selectedHour, selectedMinute);
    
    // ✅ Ensure the date is not in the past relative to effectiveMinDate
    if (newDate < effectiveMinDate) {
      // If the selected date is earlier than the effective minimum date,
      // use the effective minimum date instead.
      newDate = effectiveMinDate; 
    }
    
    onChange(newDate.toISOString());
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange(null);
  };

  const formatDisplayValue = () => {
    if (!value) return placeholder;
    try {
      const date = new Date(value);
      if (isNaN(date.getTime())) return placeholder;
      if (showTime) {
        return format(date, 'dd/MM/yyyy HH:mm', { locale: he });
      }
      return format(date, 'dd/MM/yyyy', { locale: he });
    } catch (e) {
      return placeholder;
    }
  };

  return (
    <div className="w-full">
      {label && (
        <Label className="mb-2 block">
          {label}
          {required && <span className="text-red-500 mr-1">*</span>}
        </Label>
      )}
      
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-full px-4 py-2 text-right border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors flex items-center justify-between"
        >
          <span className={value ? 'text-gray-900' : 'text-gray-400'}>
            {formatDisplayValue()}
          </span>
          <CalendarIcon className="w-5 h-5 text-gray-400" />
        </button>
        
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute left-10 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">
              {label || "בחר תאריך ושעה"}
            </DialogTitle>
          </DialogHeader>

          <div className="py-6">
            {/* Date Pickers */}
            <div className="flex justify-center gap-2 mb-6">
              <WheelPicker
                items={days}
                selected={selectedDay}
                onChange={setSelectedDay}
                label="יום"
              />
              <WheelPicker
                items={availableMonths} // ✅ Use availableMonths
                selected={selectedMonth}
                onChange={setSelectedMonth}
                label="חודש"
              />
              <WheelPicker
                items={years}
                selected={selectedYear}
                onChange={setSelectedYear}
                label="שנה"
              />
            </div>

            {/* Time Pickers */}
            {showTime && (
              <div
                className="flex justify-center gap-4 border-t pt-6"
                dir="ltr"            // 👈 הופך את כיוון השורה רק פה
              >
                <WheelPicker
                  items={hours}
                  selected={selectedHour}
                  onChange={setSelectedHour}
                  label="שעה"
                />
                <div className="flex items-center text-2xl font-bold text-gray-400 pt-6">
                  :
                </div>
                <WheelPicker
                  items={minutes}
                  selected={selectedMinute}
                  onChange={setSelectedMinute}
                  label="דקה"
                />
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="flex-1"
            >
              ביטול
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              className="flex-1 bg-orange-500 hover:bg-orange-600"
            >
              אישור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}

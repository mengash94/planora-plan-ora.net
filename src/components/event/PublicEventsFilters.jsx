import React, { useState } from 'react';
import { MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';

const EVENT_CATEGORIES = [
  { value: 'all', label: 'כל הקטגוריות' },
  { value: 'party', label: '🎉 מסיבה' },
  { value: 'wedding', label: '💒 חתונה' },
  { value: 'birthday', label: '🎂 יום הולדת' },
  { value: 'business', label: '💼 עסקי' },
  { value: 'sport', label: '⚽ ספורט' },
  { value: 'culture', label: '🎭 תרבות' },
  { value: 'music', label: '🎵 מוזיקה' },
  { value: 'food', label: '🍽️ אוכל' },
  { value: 'travel', label: '✈️ טיול' },
  { value: 'community', label: '🤝 קהילה' },
  { value: 'other', label: '📋 אחר' }
];

const DATE_RANGES = [
  { value: 'all', label: 'כל התאריכים' },
  { value: 'today', label: 'היום' },
  { value: 'week', label: 'השבוע' },
  { value: 'month', label: 'החודש' }
];

export default function PublicEventsFilters({ onFilterChange }) {
  const [category, setCategory] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [location, setLocation] = useState('');

  const handleCategoryChange = (value) => {
    setCategory(value);
    onFilterChange({ category: value, dateRange, location });
  };

  const handleDateRangeChange = (value) => {
    setDateRange(value);
    onFilterChange({ category, dateRange: value, location });
  };

  const handleLocationChange = (value) => {
    setLocation(value);
    onFilterChange({ category, dateRange, location: value });
  };

  return (
    <div className="space-y-2">
      {/* Category and Date Row */}
      <div className="flex gap-2 flex-wrap">
        {/* Category Select */}
        <select
          value={category}
          onChange={(e) => handleCategoryChange(e.target.value)}
          className="flex-1 min-w-[120px] h-8 px-2 text-xs bg-white/20 border border-white/30 rounded-lg text-white appearance-none cursor-pointer"
          style={{ direction: 'rtl' }}
        >
          {EVENT_CATEGORIES.map(cat => (
            <option key={cat.value} value={cat.value} className="text-gray-900">
              {cat.label}
            </option>
          ))}
        </select>

        {/* Date Range Select */}
        <select
          value={dateRange}
          onChange={(e) => handleDateRangeChange(e.target.value)}
          className="flex-1 min-w-[100px] h-8 px-2 text-xs bg-white/20 border border-white/30 rounded-lg text-white appearance-none cursor-pointer"
          style={{ direction: 'rtl' }}
        >
          {DATE_RANGES.map(range => (
            <option key={range.value} value={range.value} className="text-gray-900">
              {range.label}
            </option>
          ))}
        </select>
      </div>

      {/* Location Input */}
      <div className="relative">
        <MapPin className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/70" />
        <Input
          placeholder="חפש לפי מיקום..."
          value={location}
          onChange={(e) => handleLocationChange(e.target.value)}
          className="h-8 pr-7 text-xs bg-white/20 border-white/30 text-white placeholder:text-white/70"
        />
      </div>
    </div>
  );
}

export { EVENT_CATEGORIES };
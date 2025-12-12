import React from 'react';
import { Button } from '@/components/ui/button';

export default function EventFilters({ filters, onFilterChange }) {
  const ownershipOptions = [
    { value: 'all', label: 'הכל' },
    { value: 'owner', label: 'אירועים שלי' },
    { value: 'member', label: 'משותפים' },
  ];

  const statusOptions = [
    { value: 'all', label: 'כל הסטטוסים' },
    { value: 'planning', label: 'בתכנון' },
    { value: 'final', label: 'סופי' },
    { value: 'cancelled', label: 'מבוטל' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-2">בעלות</label>
        <div className="flex flex-col space-y-2">
          {ownershipOptions.map(option => (
            <Button
              key={option.value}
              variant={filters.ownership === option.value ? 'default' : 'outline'}
              onClick={() => onFilterChange({ ...filters, ownership: option.value })}
              className={`w-full justify-start text-base py-6 ${filters.ownership === option.value ? 'bg-orange-500 text-white' : 'text-gray-700'}`}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-2">סטטוס</label>
        <div className="flex flex-col space-y-2">
          {statusOptions.map(option => (
            <Button
              key={option.value}
              variant={filters.status === option.value ? 'default' : 'outline'}
              onClick={() => onFilterChange({ ...filters, status: option.value })}
              className={`w-full justify-start text-base py-6 ${filters.status === option.value ? 'bg-orange-500 text-white' : 'text-gray-700'}`}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
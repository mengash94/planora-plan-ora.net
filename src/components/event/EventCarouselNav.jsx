import React, { useRef, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';

export default function EventCarouselNav({ tabItems, activeTab, onTabChange, unreadCounts = {} }) {
  const activeTabRef = useRef(null);

  useEffect(() => {
    if (activeTabRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest'
      });
    }
  }, [activeTab]);

  return (
    <div className="relative">
      <div className="flex space-x-3 overflow-x-auto pb-4 hide-scrollbar -mx-4 px-4" dir="ltr">
        {tabItems.map((tab, index) => {
          const isActive = activeTab === tab.id;
          const unreadCount = unreadCounts[tab.id] || 0;
          return (
            <button
              key={tab.id}
              ref={isActive ? activeTabRef : null}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex-shrink-0 px-4 py-2.5 rounded-full transition-colors duration-200 ${
                isActive ? 'bg-orange-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <tab.icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                <span className="font-medium text-sm">{tab.label}</span>
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center">
                    {unreadCount}
                  </Badge>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
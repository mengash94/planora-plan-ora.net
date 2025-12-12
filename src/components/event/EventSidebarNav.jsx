import React from 'react';

export default function EventSidebarNav({ tabItems, activeTab, onTabChange, unreadCounts = {} }) {
  return (
    <aside className="w-24 md:w-56 h-screen bg-white shadow-sm flex-shrink-0 sticky top-0">
      <nav className="flex flex-col p-2 md:p-4 h-full overflow-y-auto">
        {tabItems.map((tab) => {
          const isActive = activeTab === tab.id;
          const unreadCount = unreadCounts[tab.id] || 0;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`w-full flex flex-col md:flex-row items-center md:items-center gap-1 md:gap-3 p-2 md:p-3 rounded-md text-center md:text-right transition-colors mb-1 ${
                isActive
                  ? 'bg-orange-100 text-orange-700 font-bold'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
              title={tab.label}
            >
              <div className="relative">
                <tab.icon className={`w-5 h-5 md:w-5 md:h-5 flex-shrink-0 ${isActive ? 'text-orange-600' : 'text-gray-400'}`} />
                {unreadCount > 0 && (
                  <div className="absolute -top-1 -left-1 w-4 h-4 bg-red-500 rounded-full text-white flex items-center justify-center text-[8px] font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </div>
                )}
              </div>
              <span className="text-[10px] md:text-sm leading-tight md:flex-1">
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
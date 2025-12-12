import React, { useState } from 'react';
import { Accessibility, Lightbulb, X, ChevronLeft, ChevronRight } from 'lucide-react';
import AccessibilityPanel from '@/components/accessibility/AccessibilityPanel';

export default function SideHelpTab() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activePanel, setActivePanel] = useState(null); // 'accessibility' | 'help' | null

  const handleToggle = () => {
    if (isExpanded) {
      setIsExpanded(false);
      setActivePanel(null);
    } else {
      setIsExpanded(true);
    }
  };

  const handleAccessibilityClick = () => {
    setActivePanel(activePanel === 'accessibility' ? null : 'accessibility');
  };

  const handleHelpClick = () => {
    setActivePanel(activePanel === 'help' ? null : 'help');
  };

  const closePanel = () => {
    setActivePanel(null);
  };

  return (
    <>
      {/* Side Tab - Fixed on left side */}
      <div 
        className="fixed left-0 top-1/2 -translate-y-1/2 z-40 flex items-center"
        style={{ direction: 'ltr' }}
      >
        {/* Collapsed state - thin tab */}
        {!isExpanded && (
          <button
            onClick={handleToggle}
            className="bg-gradient-to-b from-blue-500 to-purple-600 text-white py-2 px-0.5 rounded-r-md shadow-md hover:px-1 transition-all duration-200 flex flex-col items-center gap-1"
            aria-label="פתח תפריט עזרה ונגישות"
          >
            <ChevronRight className="w-3 h-3" />
            <Accessibility className="w-3 h-3" />
            <Lightbulb className="w-3 h-3 text-yellow-300" />
          </button>
        )}

        {/* Expanded state - icons visible */}
        {isExpanded && (
          <div className="bg-white shadow-lg rounded-r-lg border border-gray-200 overflow-hidden">
            <div className="flex flex-col">
              {/* Close button */}
              <button
                onClick={handleToggle}
                className="p-1.5 hover:bg-gray-100 transition-colors border-b border-gray-100"
                aria-label="סגור"
              >
                <ChevronLeft className="w-3.5 h-3.5 text-gray-500" />
              </button>

              {/* Accessibility button */}
              <button
                onClick={handleAccessibilityClick}
                className={`p-2 transition-colors ${
                  activePanel === 'accessibility' 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'hover:bg-gray-100 text-blue-600'
                }`}
                aria-label="נגישות"
                title="נגישות"
              >
                <Accessibility className="w-4 h-4" />
              </button>

              {/* Help button - Yellow icon */}
              <button
                onClick={handleHelpClick}
                className={`p-2 transition-colors ${
                  activePanel === 'help' 
                    ? 'bg-yellow-100 text-yellow-600' 
                    : 'hover:bg-gray-100 text-yellow-500'
                }`}
                aria-label="עזרה"
                title="עזרה"
              >
                <Lightbulb className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Accessibility Panel */}
      {activePanel === 'accessibility' && (
        <AccessibilityPanel onClose={closePanel} />
      )}

      {/* Help Panel */}
      {activePanel === 'help' && (
        <div 
          className="fixed left-10 top-1/2 -translate-y-1/2 z-50 w-56 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden"
          style={{ direction: 'rtl' }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4 text-white" />
                <h3 className="font-bold text-white text-xs">טיפים מהירים</h3>
              </div>
              <button
                onClick={closePanel}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-2.5 space-y-2 max-h-[50vh] overflow-y-auto">
            <ul className="space-y-1.5 text-[11px] text-gray-600">
              <li className="flex items-start gap-1.5">
                <span className="text-yellow-500">•</span>
                <span>השתמש בטאבים למעבר בין חלקי האירוע</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-yellow-500">•</span>
                <span>לחץ על ⚙️ לעריכה והגדרות</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-yellow-500">•</span>
                <span>הזמן חברים דרך כפתור המשתתפים</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-yellow-500">•</span>
                <span>צור סקרים לקבלת החלטות משותפות</span>
              </li>
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
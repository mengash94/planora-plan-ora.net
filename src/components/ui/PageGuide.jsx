import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Lightbulb, X } from 'lucide-react';

export default function PageGuide({ title, content, tips = [], autoOpenOnFirstVisit = false }) {
  const [isOpen, setIsOpen] = useState(false);

  // מצב מיקום – פיקסלים על המסך
  const [position, setPosition] = useState({ top: 150, left: 16 });

  // נתוני התחלה לגרירה
  const dragDataRef = useRef(null);

  // פתיחה אוטומטית בפעם הראשונה (אם ביקשת)
  useEffect(() => {
    if (autoOpenOnFirstVisit) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoOpenOnFirstVisit]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPosition({
        top: 150,
        left: 16,
      });
    }
  }, []);

  const handleMouseDown = (e) => {
    e.preventDefault();
    dragDataRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startTop: position.top,
      startLeft: position.left,
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e) => {
    if (!dragDataRef.current) return;

    const { startX, startY, startTop, startLeft } = dragDataRef.current;

    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    setPosition({
      top: startTop + deltaY,
      left: startLeft + deltaX,
    });
  };

  const handleMouseUp = () => {
    dragDataRef.current = null;
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      className="fixed z-40"
      style={{
        direction: 'ltr',
        top: position.top,
        left: position.left,
      }}
    >
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            size="sm"
            onMouseDown={handleMouseDown} // ⬅️ פה מתחילה הגרירה
            className="h-6 w-6 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 cursor-move"
          >
            <Lightbulb className="h-5 w-5" />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          side="bottom"
          align="start"
          className="w-80 p-0 shadow-2xl border-0 bg-white/95 backdrop-blur-sm"
          style={{ direction: 'rtl' }}
        >
          <div className="relative">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-rose-500 p-4 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                    <Lightbulb className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-bold text-white text-lg">{title}</h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="h-6 w-6 p-0 text-white hover:bg-white/20 rounded-full"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              <p className="text-gray-700 leading-relaxed text-sm">
                {content}
              </p>

              {tips.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                    <span className="w-2 h-2 bg-orange-400 rounded-full"></span>
                    טיפים שימושיים:
                  </h4>
                  <ul className="space-y-2">
                    {tips.map((tip, index) => (
                      <li key={index} className="text-xs text-gray-600 flex items-start gap-2">
                        <span className="w-1 h-1 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                        <span className="leading-relaxed">{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-500 text-center">
                  הנורה הזו תמיד כאן לעזרה 💡
                </p>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* כיתוב קטן מתחת לנורה */}
      <div className="flex items-center justify-center text-[10px] text-gray-600 mt-1 select-none">
        <span className="text-green-500 ml-1"></span>עזרה
      </div>
    </div>
  );
}

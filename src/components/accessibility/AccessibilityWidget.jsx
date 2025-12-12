import React, { useState, useEffect, useRef } from 'react';
import { 
  EyeOff, 
  Type, 
  Contrast, 
  MousePointer, 
  Circle,
  X,
  Minus,
  Plus,
  RotateCcw,
  Accessibility
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function AccessibilityWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState(() => {
    const saved = localStorage.getItem('accessibility_button_position');
    return saved ? JSON.parse(saved) : { x: 16, y: window.innerHeight - 80 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const buttonRef = useRef(null);
  
  const [settings, setSettings] = useState({
    fontSize: 100,
    highContrast: false,
    grayscale: false,
    highlightLinks: false,
    reducedMotion: false,
    largerCursor: false,
    lineHeight: 1.5,
    letterSpacing: 0,
  });

  // טעינת הגדרות מ-localStorage
  useEffect(() => {
    const saved = localStorage.getItem('accessibility_settings');
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (e) {
        console.warn('Failed to load accessibility settings');
      }
    }
  }, []);

  // שמירת הגדרות ב-localStorage
  useEffect(() => {
    localStorage.setItem('accessibility_settings', JSON.stringify(settings));
    applySettings(settings);
  }, [settings]);

  // שמירת מיקום הכפתור
  useEffect(() => {
    localStorage.setItem('accessibility_button_position', JSON.stringify(position));
  }, [position]);

  // החלת ההגדרות על ה-DOM
  const applySettings = (settings) => {
    const root = document.documentElement;
    
    root.style.fontSize = `${settings.fontSize}%`;
    
    if (settings.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
    
    if (settings.grayscale) {
      root.style.filter = 'grayscale(100%)';
    } else {
      root.style.filter = 'none';
    }
    
    if (settings.highlightLinks) {
      root.classList.add('highlight-links');
    } else {
      root.classList.remove('highlight-links');
    }
    
    if (settings.reducedMotion) {
      root.classList.add('reduced-motion');
    } else {
      root.classList.remove('reduced-motion');
    }
    
    if (settings.largerCursor) {
      root.classList.add('larger-cursor');
    } else {
      root.classList.remove('larger-cursor');
    }
    
    root.style.setProperty('--line-height', settings.lineHeight);
    root.style.setProperty('--letter-spacing', `${settings.letterSpacing}px`);
  };

  const resetSettings = () => {
    const defaultSettings = {
      fontSize: 100,
      highContrast: false,
      grayscale: false,
      highlightLinks: false,
      reducedMotion: false,
      largerCursor: false,
      lineHeight: 1.5,
      letterSpacing: 0,
    };
    setSettings(defaultSettings);
  };

  // טיפול בגרירה
  const handleMouseDown = (e) => {
    if (isOpen) return; // לא לגרור אם התפריט פתוח
    
    setIsDragging(true);
    const rect = buttonRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleTouchStart = (e) => {
    if (isOpen) return;
    
    setIsDragging(true);
    const touch = e.touches[0];
    const rect = buttonRef.current.getBoundingClientRect();
    setDragOffset({
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    });
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (clientX, clientY) => {
      const newX = Math.max(8, Math.min(clientX - dragOffset.x, window.innerWidth - 64));
      const newY = Math.max(8, Math.min(clientY - dragOffset.y, window.innerHeight - 64));
      setPosition({ x: newX, y: newY });
    };

    const handleMouseMove = (e) => {
      e.preventDefault();
      handleMove(e.clientX, e.clientY);
    };

    const handleTouchMove = (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      handleMove(touch.clientX, touch.clientY);
    };

    const handleEnd = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleEnd);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, dragOffset]);

  // קיצורי מקלדת
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.altKey && e.key === 'a') {
        e.preventDefault();
        setIsOpen(!isOpen);
      }
      
      if (e.altKey && e.key === '=') {
        e.preventDefault();
        setSettings(prev => ({
          ...prev,
          fontSize: Math.min(prev.fontSize + 10, 200)
        }));
      }
      
      if (e.altKey && e.key === '-') {
        e.preventDefault();
        setSettings(prev => ({
          ...prev,
          fontSize: Math.max(prev.fontSize - 10, 80)
        }));
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen]);

  return (
    <>
      {/* כפתור צף - ניתן לגרירה */}
      <div 
        ref={buttonRef}
        className="fixed z-40"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          cursor: isDragging ? 'grabbing' : 'grab',
          touchAction: 'none'
        }}
        dir="rtl"
      >
        <Button
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onClick={(e) => {
            if (!isDragging) {
              setIsOpen(!isOpen);
            }
          }}
          className="rounded-full w-14 h-14 shadow-lg bg-blue-600 hover:bg-blue-700 flex items-center justify-center transition-transform active:scale-95"
          aria-label="פתח תפריט נגישות (Alt + A)"
          title="נגישות - ניתן לגרירה"
        >
          <Accessibility className="w-6 h-6 text-white" />
        </Button>
      </div>

      {/* פאנל הגדרות */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" dir="rtl">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4 shadow-2xl">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Accessibility className="w-6 h-6 text-blue-600" />
                  <div>
                    <CardTitle>הגדרות נגישות</CardTitle>
                    <CardDescription>התאם את האתר לצרכים שלך</CardDescription>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  aria-label="סגור תפריט נגישות"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 p-6">
              {/* גודל גופן */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-semibold flex items-center gap-2">
                    <Type className="w-5 h-5 text-blue-600" />
                    גודל גופן
                  </label>
                  <span className="text-sm text-gray-600">{settings.fontSize}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setSettings(prev => ({ 
                      ...prev, 
                      fontSize: Math.max(prev.fontSize - 10, 80) 
                    }))}
                    aria-label="הקטן גופן"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Slider
                    value={[settings.fontSize]}
                    onValueChange={([value]) => setSettings(prev => ({ ...prev, fontSize: value }))}
                    min={80}
                    max={200}
                    step={10}
                    className="flex-1"
                    aria-label="גודל גופן"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setSettings(prev => ({ 
                      ...prev, 
                      fontSize: Math.min(prev.fontSize + 10, 200) 
                    }))}
                    aria-label="הגדל גופן"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* ניגודיות גבוהה */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Contrast className="w-5 h-5 text-blue-600" />
                  <div>
                    <div className="font-semibold">ניגודיות גבוהה</div>
                    <div className="text-sm text-gray-600">הגבר את הניגודיות בין הטקסט לרקע</div>
                  </div>
                </div>
                <Switch
                  checked={settings.highContrast}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, highContrast: checked }))}
                  aria-label="ניגודיות גבוהה"
                />
              </div>

              {/* גווני אפור */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Circle className="w-5 h-5 text-blue-600" />
                  <div>
                    <div className="font-semibold">גווני אפור</div>
                    <div className="text-sm text-gray-600">הצג את האתר בגווני אפור בלבד</div>
                  </div>
                </div>
                <Switch
                  checked={settings.grayscale}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, grayscale: checked }))}
                  aria-label="גווני אפור"
                />
              </div>

              {/* הדגשת קישורים */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <MousePointer className="w-5 h-5 text-blue-600" />
                  <div>
                    <div className="font-semibold">הדגשת קישורים</div>
                    <div className="text-sm text-gray-600">הוסף קו תחתון וצבע בולט לכל הקישורים</div>
                  </div>
                </div>
                <Switch
                  checked={settings.highlightLinks}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, highlightLinks: checked }))}
                  aria-label="הדגשת קישורים"
                />
              </div>

              {/* הפחתת תנועה */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <EyeOff className="w-5 h-5 text-blue-600" />
                  <div>
                    <div className="font-semibold">הפחתת תנועה</div>
                    <div className="text-sm text-gray-600">עצור אנימציות ומעברים מסחררים</div>
                  </div>
                </div>
                <Switch
                  checked={settings.reducedMotion}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, reducedMotion: checked }))}
                  aria-label="הפחתת תנועה"
                />
              </div>

              {/* סמן עכבר גדול */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <MousePointer className="w-5 h-5 text-blue-600" />
                  <div>
                    <div className="font-semibold">סמן עכבר גדול</div>
                    <div className="text-sm text-gray-600">הגדל את גודל הסמן</div>
                  </div>
                </div>
                <Switch
                  checked={settings.largerCursor}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, largerCursor: checked }))}
                  aria-label="סמן עכבר גדול"
                />
              </div>

              {/* כפתור איפוס */}
              <div className="flex justify-center pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={resetSettings}
                  className="gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  אפס הגדרות
                </Button>
              </div>

              {/* קיצורי מקלדת */}
              <div className="bg-blue-50 p-4 rounded-lg text-sm">
                <div className="font-semibold mb-2 text-blue-900">קיצורי מקלדת שימושיים:</div>
                <ul className="space-y-1 text-blue-800">
                  <li>• <kbd className="px-2 py-1 bg-white rounded">Alt</kbd> + <kbd className="px-2 py-1 bg-white rounded">A</kbd> - פתח/סגור תפריט נגישות</li>
                  <li>• <kbd className="px-2 py-1 bg-white rounded">Alt</kbd> + <kbd className="px-2 py-1 bg-white rounded">+</kbd> - הגדל גופן</li>
                  <li>• <kbd className="px-2 py-1 bg-white rounded">Alt</kbd> + <kbd className="px-2 py-1 bg-white rounded">-</kbd> - הקטן גופן</li>
                  <li>• <kbd className="px-2 py-1 bg-white rounded">Tab</kbd> - נווט בין אלמנטים</li>
                  <li>• <kbd className="px-2 py-1 bg-white rounded">Enter</kbd> - הפעל קישור/כפתור</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* הוספת סגנונות גלובליים */}
      <style jsx global>{`
        .high-contrast {
          filter: contrast(1.5);
        }
        
        .high-contrast * {
          text-shadow: none !important;
          box-shadow: 0 0 0 1px rgba(0,0,0,0.1) !important;
        }

        .highlight-links a {
          text-decoration: underline !important;
          text-decoration-thickness: 2px !important;
          text-underline-offset: 3px !important;
          color: #0066cc !important;
          font-weight: 600 !important;
        }

        .highlight-links a:hover {
          background-color: #ffeb3b !important;
          color: #000 !important;
        }

        .reduced-motion * {
          animation: none !important;
          transition: none !important;
        }

        .larger-cursor,
        .larger-cursor * {
          cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="black" stroke="white" stroke-width="2"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/></svg>') 12 12, auto !important;
        }

        .larger-cursor button,
        .larger-cursor a,
        .larger-cursor [role="button"] {
          cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="blue" stroke="white" stroke-width="2"><path d="M9 11l3 3 8-8"/></svg>') 12 12, pointer !important;
        }

        body {
          line-height: var(--line-height, 1.5) !important;
          letter-spacing: var(--letter-spacing, 0) !important;
        }

        *:focus-visible {
          outline: 3px solid #0066cc !important;
          outline-offset: 2px !important;
          border-radius: 4px;
        }

        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border-width: 0;
        }
      `}</style>
    </>
  );
}
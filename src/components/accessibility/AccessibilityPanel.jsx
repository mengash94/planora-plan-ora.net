import React, { useState, useEffect } from 'react';
import { 
  X, 
  Type,
  Minus,
  Plus,
  RotateCcw,
  Accessibility
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';

export default function AccessibilityPanel({ onClose }) {
  const [settings, setSettings] = useState({
    fontSize: 100,
    highContrast: false,
    grayscale: false,
    highlightLinks: false,
    reducedMotion: false,
    largerCursor: false,
  });

  // Load settings from localStorage
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

  // Save and apply settings
  useEffect(() => {
    localStorage.setItem('accessibility_settings', JSON.stringify(settings));
    applySettings(settings);
  }, [settings]);

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
  };

  const resetSettings = () => {
    setSettings({
      fontSize: 100,
      highContrast: false,
      grayscale: false,
      highlightLinks: false,
      reducedMotion: false,
      largerCursor: false,
    });
  };

  return (
    <div 
      className="fixed left-10 top-1/2 -translate-y-1/2 z-50 w-56 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden"
      style={{ direction: 'rtl' }}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Accessibility className="w-4 h-4 text-white" />
            <h3 className="font-bold text-white text-xs">נגישות</h3>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-2 space-y-2 max-h-[50vh] overflow-y-auto">
        {/* Font Size */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-medium flex items-center gap-1">
              <Type className="w-3 h-3 text-blue-600" />
              גופן
            </label>
            <span className="text-[10px] text-gray-500">{settings.fontSize}%</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setSettings(prev => ({ 
                ...prev, 
                fontSize: Math.max(prev.fontSize - 10, 80) 
              }))}
            >
              <Minus className="w-2.5 h-2.5" />
            </Button>
            <Slider
              value={[settings.fontSize]}
              onValueChange={([value]) => setSettings(prev => ({ ...prev, fontSize: value }))}
              min={80}
              max={150}
              step={10}
              className="flex-1"
            />
            <Button
              variant="outline"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setSettings(prev => ({ 
                ...prev, 
                fontSize: Math.min(prev.fontSize + 10, 150) 
              }))}
            >
              <Plus className="w-2.5 h-2.5" />
            </Button>
          </div>
        </div>

        {/* Toggle Options */}
        <div className="space-y-1">
          <div className="flex items-center justify-between p-1.5 bg-gray-50 rounded">
            <span className="text-[11px]">ניגודיות גבוהה</span>
            <Switch
              checked={settings.highContrast}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, highContrast: checked }))}
              className="scale-75"
            />
          </div>

          <div className="flex items-center justify-between p-1.5 bg-gray-50 rounded">
            <span className="text-[11px]">גווני אפור</span>
            <Switch
              checked={settings.grayscale}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, grayscale: checked }))}
              className="scale-75"
            />
          </div>

          <div className="flex items-center justify-between p-1.5 bg-gray-50 rounded">
            <span className="text-[11px]">הדגשת קישורים</span>
            <Switch
              checked={settings.highlightLinks}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, highlightLinks: checked }))}
              className="scale-75"
            />
          </div>

          <div className="flex items-center justify-between p-1.5 bg-gray-50 rounded">
            <span className="text-[11px]">הפחתת תנועה</span>
            <Switch
              checked={settings.reducedMotion}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, reducedMotion: checked }))}
              className="scale-75"
            />
          </div>
        </div>

        {/* Reset Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={resetSettings}
          className="w-full h-7 text-[10px] gap-1"
        >
          <RotateCcw className="w-2.5 h-2.5" />
          אפס
        </Button>
      </div>
    </div>
  );
}
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowUp, ArrowDown, X, Sparkles, ArrowLeft } from "lucide-react";

export default function EventOnboardingGuide({ eventId, onClose }) {
  const storageKey = useMemo(() => `eventOnboardingSeen:${eventId}`, [eventId]);
  const [stepIndex, setStepIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [targetRect, setTargetRect] = useState(null);

  // Define steps with selectors for real UI elements
  const steps = useMemo(() => [
    {
      id: "invite",
      title: "הזמינו משתתפים",
      description: "לחצו על ‘הזמן משתתפים’ כדי לשתף את קישור ההצטרפות.",
      selectors: ['[data-coachmark="invite"]'],
      ensureVisible: async () => {},
      // arrowPlacement: "above" // Changed from "below" to "above" as per request
    },
    {
      id: "tasks",
      title: "הוסיפו משימה ראשונה",
      description: "כדי להתחיל להתקדם, לחצו על ‘הוסף משימה חדשה’.",
      selectors: ['[data-coachmark="add-task"]', '[data-coachmark="tab-tasks"]'],
      ensureVisible: async () => {
        const addBtn = document.querySelector('[data-coachmark="add-task"]');
        if (addBtn) return;
        const tab = document.querySelector('[data-coachmark="tab-tasks"]');
        if (tab) {
          tab.click();
          await new Promise(r => setTimeout(r, 220));
        }
      },
      arrowPlacement: "above" // Changed from "below" to "above" as per request
    },
    {
      id: "chat",
      title: "פתחו את צ׳אט האירוע",
      description: "עברו לטאב ‘צ׳אט’ כדי לתקשר עם המשתתפים במקום אחד.",
      selectors: ['[data-coachmark="tab-chat"]'],
      ensureVisible: async () => {},
      arrowPlacement: "above"
    },
    {
      id: "polls",
      title: "צרו סקר החלטות",
      description: "בטאב ‘סקרים’ לחצו ‘צור סקר חדש’ לבחירת תאריך/מקום יחד.",
      selectors: ['[data-coachmark="add-poll"]', '[data-coachmark="tab-polls"]'],
      ensureVisible: async () => {
        const addPoll = document.querySelector('[data-coachmark="add-poll"]');
        if (addPoll) return;
        const tab = document.querySelector('[data-coachmark="tab-polls"]');
        if (tab) {
          tab.click();
          await new Promise(r => setTimeout(r, 220));
        }
      },
      arrowPlacement: "above"
    }
  ], []);

  // Close immediately if already seen
  useEffect(() => {
    if (!eventId) return;
    const seen = localStorage.getItem(storageKey) === "1";
    if (seen) {
      setVisible(false);
      onClose?.();
    }
  }, [eventId, storageKey, onClose]);

  // דיוק קבועי החץ והזרקור
  const ARROW_SIZE = 28;
  const ARROW_MARGIN = 10;
  const RING_PADDING = 6;

  const computeRect = useCallback(() => {
    const current = steps[stepIndex];
    if (!current) return;

    let el = null;
    for (const sel of current.selectors) {
      const found = document.querySelector(sel);
      if (found) { el = found; break; }
    }

    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      });
    } else {
      setTargetRect(null);
    }
  }, [stepIndex, steps]);

  const prepareStep = useCallback(async () => {
    const current = steps[stepIndex];
    if (!current) return;
    await current.ensureVisible();
    // Allow a small delay for UI to settle after ensureVisible actions
    await new Promise(r => setTimeout(r, 50));
    computeRect();
  }, [stepIndex, computeRect, steps]);

  useEffect(() => {
    prepareStep();
  }, [prepareStep]);

  // Reposition spotlight on resize/scroll
  useEffect(() => {
    const handler = () => computeRect();
    window.addEventListener("resize", handler);
    window.addEventListener("scroll", handler, true);
    return () => {
      window.removeEventListener("resize", handler);
      window.removeEventListener("scroll", handler, true);
    };
  }, [computeRect]);

  if (!visible) return null;

  const current = steps[stepIndex];

  const handleNext = () => {
    if (stepIndex < steps.length - 1) {
      setStepIndex(stepIndex + 1);
      return;
    }
    localStorage.setItem(storageKey, "1");
    setVisible(false);
    onClose?.();
  };

  const handleSkip = () => {
    localStorage.setItem(storageKey, "1");
    setVisible(false);
    onClose?.();
  };

  // Update arrow color to green
  const renderArrow = () => {
    if (!targetRect) return null;

    const currentStep = steps[stepIndex];
    const placementPref = currentStep?.arrowPlacement || "auto";

    const targetCenterX = targetRect.left + targetRect.width / 2;

    // showBelow = true means arrow is positioned BELOW the target. It should point UP.
    // showBelow = false means arrow is positioned ABOVE the target. It should point DOWN.
    const showBelow = placementPref === "below"
      ? true
      : placementPref === "above"
        ? false
        : (targetRect.top < window.innerHeight / 2); // Auto logic: if target is in upper half, put arrow below it.

    let top = showBelow
      ? targetRect.top + targetRect.height + ARROW_MARGIN
      : targetRect.top - ARROW_SIZE - ARROW_MARGIN;

    let left = targetCenterX - ARROW_SIZE / 2;

    // Clamp to viewport
    top = Math.min(Math.max(top, 8), window.innerHeight - ARROW_SIZE - 8);
    left = Math.min(Math.max(left, 8), window.innerWidth - ARROW_SIZE - 8);

    // Changed: ArrowDown for below placement (points down), ArrowUp for above placement (points up) as per outline.
    // Original: const Icon = showBelow ? ArrowUp : ArrowDown;
  const Icon = showBelow ? ArrowUp : ArrowDown;

    return (
      <Icon
        className="fixed z-[90] text-green-500 drop-shadow animate-bounce" // Changed color to green
        style={{ top, left }}
        size={ARROW_SIZE}
      />
    );
  };

  // החלפת מימוש הזרקור – כולל padding סביב היעד וצל ענק לרקע ללא טשטוש
  const renderSpotlight = () => {
    if (!targetRect) {
      return <div className="fixed inset-0 z-[80] bg-black/30 pointer-events-none" />;
    }
    const top = Math.max(targetRect.top - RING_PADDING, 0);
    const left = Math.max(targetRect.left - RING_PADDING, 0);
    const width = Math.min(targetRect.width + RING_PADDING * 2, window.innerWidth - left);
    const height = Math.min(targetRect.height + RING_PADDING * 2, window.innerHeight - top);

    const shadow =
      "0 0 0 9999px rgba(0,0,0,0.35), 0 0 0 3px rgba(251,146,60,0.85), 0 10px 30px rgba(0,0,0,0.2)";

    return (
      <div
        className="fixed z-[80] pointer-events-none"
        style={{
          top,
          left,
          width: Math.max(1, width),
          height: Math.max(1, height),
          borderRadius: 12,
          boxShadow: shadow,
          transition: "top 120ms, left 120ms, width 120ms, height 120ms"
        }}
      />
    );
  };

  // New: Render "מה עושים?" label below the spotlighted element
  const renderWhatToDoLabel = () => {
    if (!targetRect) return null;

    const labelOffset = 20; // Distance from the bottom of the targetRect
    let top = targetRect.top + targetRect.height + labelOffset;
    let left = targetRect.left + targetRect.width / 2;

    // Ensure it doesn't go off-screen at the bottom.
    // Assuming label height around 30px, and keeping 16px from bottom edge.
    const estimatedLabelHeight = 30; 
    top = Math.min(top, window.innerHeight - estimatedLabelHeight - 16);

    // Ensure it doesn't go off-screen horizontally.
    // Clamp the center point to be within a reasonable range, then translateX(-50%)
    const minCenterLeft = 50; 
    const maxCenterLeft = window.innerWidth - 50; 
    left = Math.min(Math.max(left, minCenterLeft), maxCenterLeft);

    return (
      <div
        className="fixed z-[91] text-orange-500 font-bold text-sm text-center drop-shadow-sm pointer-events-none"
        style={{
          top: top,
          left: left,
          transform: 'translateX(-50%)',
          whiteSpace: 'nowrap' 
        }}
      >
        מה עושים?
      </div>
    );
  };


  // Coach bubble: centered bottom or top to avoid covering target
  const placeBubbleBottom = !targetRect || targetRect.top < window.innerHeight / 2;
  const bubbleStyle = placeBubbleBottom
    ? { bottom: 16, left: "50%", transform: "translateX(-50%)" }
    : { top: 16, left: "50%", transform: "translateX(-50%)" };

  return (
    <div className="fixed inset-0 z-[70] pointer-events-none" style={{ direction: 'rtl' }}>
      {renderSpotlight()}
      {renderArrow()}
      {renderWhatToDoLabel()} {/* Added new label component */}

      {/* Coach Bubble (no backdrop blur) */}
      <div className="fixed z-[95] w-[92%] max-w-lg pointer-events-auto" style={bubbleStyle}>
        <Card className="bg-white/95 border border-orange-200 shadow-xl rounded-2xl">
          <div className="p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">{current?.title}</h3>
              </div>
              <button
                onClick={handleSkip}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"
                aria-label="סגור"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-700 leading-relaxed mb-4">
              {current?.description}
            </p>

            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={handleSkip}>
                דלג
              </Button>
              <div className="flex items-center gap-3">
                <div className="text-xs text-gray-500">
                  צעד {stepIndex + 1} מתוך {steps.length}
                </div>
                <Button onClick={handleNext} className="bg-orange-500 hover:bg-orange-600">
                  הבא
                  <ArrowLeft className="w-4 h-4 mr-2" />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
import React, { useEffect, useState, useRef } from "react";

export default function PwaUpdateBanner() {
  const [updateReady, setUpdateReady] = useState(false);
  const waitingWorkerRef = useRef(null);
  const controllerChangedRef = useRef(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let registration;

    const onControllerChange = () => {
      if (controllerChangedRef.current) return;
      controllerChangedRef.current = true;
      setTimeout(() => window.location.reload(), 100);
    };

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    const checkForUpdate = async () => {
      try {
        registration = await navigator.serviceWorker.getRegistration();
        if (!registration) return;
        
        if (registration.waiting) {
          waitingWorkerRef.current = registration.waiting;
          setUpdateReady(true);
        }
        
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              waitingWorkerRef.current = newWorker;
              setUpdateReady(true);
            }
          });
        });

        registration.update().catch(() => {});
      } catch (e) {
        console.log('PlanOra SW update check failed', e);
      }
    };

    checkForUpdate();

    const interval = setInterval(() => {
      checkForUpdate();
    }, 60_000);

    return () => {
      clearInterval(interval);
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  const applyUpdate = () => {
    const waiting = waitingWorkerRef.current;
    if (waiting) {
      try {
        waiting.postMessage({ type: 'SKIP_WAITING' });
      } catch {}
      setTimeout(() => window.location.reload(), 800);
    } else {
      window.location.reload();
    }
  };

  if (!updateReady) return null;

  return (
    <div className="fixed bottom-24 left-0 right-0 z-[60] px-4">
      <div className="mx-auto max-w-lg bg-slate-900 text-white rounded-xl shadow-lg border border-slate-800 p-3 flex items-center justify-between gap-3">
        <div className="text-sm">
          Planora - גרסה חדשה זמינה • לרענון ועדכון לחץ כאן
        </div>
        <button
          onClick={applyUpdate}
          className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 rounded-lg text-sm font-semibold"
        >
          עדכן עכשיו
        </button>
      </div>
    </div>
  );
}
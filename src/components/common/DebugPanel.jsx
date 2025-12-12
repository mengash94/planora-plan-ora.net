import React from "react";
import { Button } from "@/components/ui/button";
import { Copy, Trash2, ChevronDown, ChevronUp } from "lucide-react";

export default function DebugPanel({ logs = [], onClear, title = "לוגים" }) {
  const [open, setOpen] = React.useState(false);

  const copyAll = async () => {
    const text = logs.map(l => {
      const line = `[${l.time}] ${l.step}`;
      const data = l.data !== undefined ? `\n${JSON.stringify(l.data, null, 2)}` : "";
      return `${line}${data}`;
    }).join("\n\n");
    try {
      await navigator.clipboard.writeText(text || "אין לוגים");
    } catch {}
  };

  return (
    <div className="mt-4 rounded-lg border bg-gray-50">
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          <button onClick={() => setOpen(!open)} className="text-gray-600 hover:text-gray-800">
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <span className="text-sm font-semibold text-gray-700">{title}</span>
          <span className="text-[11px] text-gray-500">({logs.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={copyAll} className="h-7 px-2">
            <Copy className="w-3 h-3 ml-1" /> העתק
          </Button>
          <Button variant="outline" size="sm" onClick={onClear} className="h-7 px-2">
            <Trash2 className="w-3 h-3 ml-1" /> נקה
          </Button>
        </div>
      </div>
      {open && (
        <div className="max-h-64 overflow-auto bg-white border-t px-3 py-2">
          {logs.length === 0 ? (
            <div className="text-xs text-gray-500">אין לוגים להצגה.</div>
          ) : (
            <ul className="space-y-2">
              {logs.map((l, idx) => (
                <li key={idx} className="text-xs">
                  <div className="text-gray-600 font-medium">[{l.time}] {l.step}</div>
                  {l.data !== undefined && (
                    <pre className="mt-1 bg-gray-50 border rounded p-2 overflow-auto text-[11px] leading-4">
{JSON.stringify(l.data, null, 2)}
                    </pre>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
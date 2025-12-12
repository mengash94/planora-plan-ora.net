import React from "react";
import VerifiedVenueFinder from "@/components/venue/VerifiedVenueFinder";

export default function VerifiedVenueFinderPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get("eventId") || "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-rose-50 p-6" style={{ direction: "rtl" }}>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">איתור מקומות אמיתיים מהאינטרנט</h1>
          <p className="text-gray-600 mt-1 text-sm">
            חפש מקומות מאומתים מהרשת עם קישורים תקינים, והפוך אותם לסקר באירוע. 
            כדי לשייך סקר לאירוע, פתח את הדף עם eventId בפרמטר: VerifiedVenueFinder?eventId=EVENT_ID
          </p>
        </div>
        <VerifiedVenueFinder eventId={eventId} />
      </div>
    </div>
  );
}
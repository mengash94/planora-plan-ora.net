import React, { useState } from "react";
import { InvokeLLM } from "@/integrations/Core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, Link as LinkIcon, Check, AlertCircle } from "lucide-react";
import { createPoll } from "@/functions/createPoll";
import { useToast } from "@/components/ui/use-toast";

function isValidHttpUrl(url) {
  if (!url || typeof url !== "string") return false;
  if (/example\.com|placeholder|yourdomain|foo\.bar|^\.+$|^#$|^\s*$/i.test(url)) return false;
  try {
    const u = new URL(url.trim());
    if (!["https:", "http:"].includes(u.protocol)) return false;
    // allow official site or Google Maps / known places
    const host = u.hostname.toLowerCase();
    const allowedHosts = [
      "google.com", "www.google.com", "maps.google.com", "goo.gl",
      "facebook.com", "www.facebook.com", "instagram.com", "www.instagram.com",
      "tripadvisor.com", "www.tripadvisor.com", "yelp.com", "www.yelp.com"
    ];
    // allow any other real-looking domain (has a dot and not local)
    const looksReal = host.includes(".") && !host.endsWith(".local") && !host.endsWith(".invalid");
    return looksReal || allowedHosts.some(h => host.endsWith(h));
  } catch {
    return false;
  }
}

export default function VerifiedVenueFinder({ eventId }) {
  const { toast } = useToast();
  const [query, setQuery] = useState({ type: "", city: "", participants: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.type || !query.city) {
      toast({
        title: "נא למלא סוג אירוע ועיר/אזור",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setSearched(true);
    setSuggestions([]);

    const prompt = `
אתה מסייע בתכנון אירועים. הבא עד 8 מקומות אמתיים מאוששים מהאינטרנט עבור אירוע מסוג "${query.type}"
בעיר/אזור "${query.city}" עבור כ-${query.participants || "מספר"} משתתפים.
חשוב: אל תמציא שמות, החזר רק מקומות שקיימים באמת ומופיעים בחיפושי רשת.
כלול את האתר הרשמי במידה וקיים, או קישור Google Maps אמיתי אם אין אתר רשמי.

החזר JSON בלבד לפי הסכמה:
{
  "suggestions": [
    {
      "name": "שם רשמי ומדויק של המקום",
      "address": "עיר/כתובת",
      "description": "תיאור קצר (עד 140 תווים)",
      "url": "https://example.com או https://maps.google.com/...",
      "source": "מקור קצר: Official site / Google Maps / TripAdvisor"
    }
  ]
}

כל הצעות חייבות להיות ממקור ברשת. אין לכלול example.com, דוגמאות או מצייני מקום. אם אין קישור אמין – השאר url ריק.
    `.trim();

    try {
      const res = await InvokeLLM({
        prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  address: { type: "string" },
                  description: { type: "string" },
                  url: { type: "string" },
                  source: { type: "string" }
                }
              }
            }
          }
        }
      });

      const raw = Array.isArray(res?.suggestions) ? res.suggestions : [];
      const cleaned = raw
        .map((s) => ({
          name: (s.name || "").trim(),
          address: (s.address || "").trim(),
          description: (s.description || "").trim(),
          url: (s.url || "").trim(),
          source: (s.source || "").trim()
        }))
        .filter((s) => s.name && s.address) // require real name and address
        .map((s) => ({
          ...s,
          isUrlValid: isValidHttpUrl(s.url)
        }));

      setSuggestions(cleaned);
      if (cleaned.length === 0) {
        toast({
          title: "לא נמצאו מקומות מאומתים",
          description: "נסה לנסח אחרת או לציין עיר/איזור מדויק יותר",
        });
      }
    } catch (e) {
      toast({
        title: "שגיאה בשליפת נתונים מהרשת",
        description: "נסה שוב בעוד רגע",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePoll = async () => {
    if (!eventId) {
      toast({
        title: "חסר eventId",
        description: "פתחו את הדף עם eventId בכתובת, למשל: VerifiedVenueFinder?eventId=...",
        variant: "destructive"
      });
      return;
    }
    if (!suggestions.length) {
      toast({ title: "אין הצעות ליצירת סקר" });
      return;
    }
    try {
      await createPoll({
        event_id: eventId,
        title: "בחירת מקום לאירוע",
        type: "location",
        allow_multiple: false,
        options: suggestions.map((s, i) => ({
          id: `opt-${Date.now()}-${i}`,
          text: s.name,
          description: s.address
        }))
      });
      toast({
        title: "הסקר נוצר בהצלחה",
        description: "תוכל לראותו בלשונית הסקרים של האירוע",
      });
    } catch (e) {
      toast({
        title: "שגיאה ביצירת הסקר",
        description: "נסה שוב",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6" style={{ direction: "rtl" }}>
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>סוג אירוע</Label>
              <Input
                placeholder='למשל: "יום הולדת", "חתונה", "אירוע חברה"'
                value={query.type}
                onChange={(e) => setQuery((p) => ({ ...p, type: e.target.value }))}
              />
            </div>
            <div>
              <Label>עיר/אזור</Label>
              <Input
                placeholder="למשל: תל אביב, חיפה, ירושלים"
                value={query.city}
                onChange={(e) => setQuery((p) => ({ ...p, city: e.target.value }))}
              />
            </div>
            <div>
              <Label>מס׳ משתתפים (אופציונלי)</Label>
              <Input
                placeholder="למשל: 50"
                value={query.participants}
                onChange={(e) => setQuery((p) => ({ ...p, participants: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSearch} disabled={isLoading} className="bg-orange-600 hover:bg-orange-700">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
              מצא מקומות אמיתיים
            </Button>
            <Button variant="outline" onClick={() => setSuggestions([])} disabled={isLoading}>
              נקה
            </Button>
          </div>
        </CardContent>
      </Card>

      {searched && (
        <div className="space-y-3">
          {!suggestions.length ? (
            <div className="flex items-center gap-2 text-gray-600">
              <AlertCircle className="w-4 h-4" />
              אין תוצאות להצגה כרגע
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">תוצאות מאומתות מהרשת</h3>
                <Button onClick={handleCreatePoll} className="bg-blue-600 hover:bg-blue-700">
                  צור סקר מהמקומות
                </Button>
              </div>
              {suggestions.map((s, i) => (
                <Card key={i} className="border">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-base font-semibold">{s.name}</div>
                        <div className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {s.address}
                        </div>
                        {s.description && (
                          <div className="text-sm text-gray-700 mt-1">{s.description}</div>
                        )}
                        <div className="mt-2 flex items-center gap-2">
                          {s.isUrlValid ? (
                            <>
                              <Badge variant="secondary" className="bg-green-100 text-green-800">
                                <Check className="w-3.5 h-3.5 ml-1" />
                                קישור מאומת
                              </Badge>
                              <a
                                href={s.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline inline-flex items-center gap-1 text-sm"
                              >
                                <LinkIcon className="w-3.5 h-3.5" />
                                מעבר לקישור
                              </a>
                            </>
                          ) : (
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                              ללא קישור מאומת
                            </Badge>
                          )}
                          {s.source && (
                            <Badge variant="outline" className="text-xs">
                              מקור: {s.source}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
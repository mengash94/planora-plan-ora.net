import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Star, MapPin, Phone, Globe, Clock, ExternalLink } from 'lucide-react';

// Map English place types to Hebrew
const typeTranslations = {
    'restaurant': 'מסעדה',
    'cafe': 'בית קפה',
    'bar': 'בר',
    'food': 'אוכל',
    'point_of_interest': 'נקודת עניין',
    'establishment': 'עסק',
    'meal_takeaway': 'משלוחים',
    'meal_delivery': 'משלוחים',
    'bakery': 'מאפייה',
    'night_club': 'מועדון לילה',
    'lodging': 'לינה',
    'hotel': 'מלון',
    'event_venue': 'אולם אירועים',
    'wedding_venue': 'אולם חתונות',
    'banquet_hall': 'אולם אירועים',
    'convention_center': 'מרכז כנסים',
    'park': 'פארק',
    'tourist_attraction': 'אטרקציה תיירותית',
    'spa': 'ספא',
    'gym': 'חדר כושר',
    'store': 'חנות',
    'shopping_mall': 'קניון',
    'movie_theater': 'קולנוע',
    'museum': 'מוזיאון',
    'art_gallery': 'גלריה',
    'amusement_park': 'לונה פארק',
    'bowling_alley': 'באולינג',
    'casino': 'קזינו',
    'zoo': 'גן חיות',
    'aquarium': 'אקווריום',
    'stadium': 'אצטדיון',
    'synagogue': 'בית כנסת',
    'church': 'כנסייה',
    'mosque': 'מסגד'
};

export function translatePlaceType(type) {
    return typeTranslations[type] || type;
}

export function translatePlaceTypes(types) {
    if (!types || types.length === 0) return [];
    return types.map(t => translatePlaceType(t)).filter(t => t !== t.toLowerCase() || !t.includes('_'));
}

export default function PlaceDetailsDialog({ place, open, onOpenChange, onSelect }) {
    if (!place) return null;

    const translatedTypes = translatePlaceTypes(place.types);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl">{place.name}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Photos */}
                    {place.photos && place.photos.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2">
                            {place.photos.slice(0, 4).map((photo, idx) => (
                                <img 
                                    key={idx}
                                    src={photo}
                                    alt={`${place.name} ${idx + 1}`}
                                    className="w-full h-32 object-cover rounded-lg"
                                />
                            ))}
                        </div>
                    ) : place.photo_url ? (
                        <img 
                            src={place.photo_url}
                            alt={place.name}
                            className="w-full h-48 object-cover rounded-lg"
                        />
                    ) : null}

                    {/* Rating */}
                    {place.rating && (
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <Star 
                                        key={star}
                                        className={`w-5 h-5 ${star <= Math.round(place.rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`}
                                    />
                                ))}
                            </div>
                            <span className="font-bold text-lg">{place.rating}</span>
                            {place.user_ratings_total && (
                                <span className="text-gray-500">({place.user_ratings_total} ביקורות)</span>
                            )}
                        </div>
                    )}

                    {/* Price Level */}
                    {place.price_level && (
                        <div className="flex items-center gap-2">
                            <span className="text-gray-600">רמת מחירים:</span>
                            <span className="text-green-600 font-bold">
                                {'₪'.repeat(place.price_level)}
                                <span className="text-gray-300">{'₪'.repeat(4 - place.price_level)}</span>
                            </span>
                        </div>
                    )}

                    {/* Types */}
                    {translatedTypes.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {translatedTypes.slice(0, 5).map((type, idx) => (
                                <span 
                                    key={idx}
                                    className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm"
                                >
                                    {type}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Address */}
                    {place.address && (
                        <div className="flex items-start gap-2 text-gray-700">
                            <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                            <span>{place.address}</span>
                        </div>
                    )}

                    {/* Phone */}
                    {place.phone && (
                        <div className="flex items-center gap-2 text-gray-700">
                            <Phone className="w-5 h-5 text-gray-400" />
                            <a href={`tel:${place.phone}`} className="text-blue-600 hover:underline">
                                {place.phone}
                            </a>
                        </div>
                    )}

                    {/* Opening Hours */}
                    {place.opening_hours && (
                        <div className="flex items-center gap-2">
                            <Clock className="w-5 h-5 text-gray-400" />
                            <span className={place.opening_hours.open_now ? 'text-green-600' : 'text-red-600'}>
                                {place.opening_hours.open_now ? 'פתוח עכשיו' : 'סגור עכשיו'}
                            </span>
                        </div>
                    )}

                    {/* Website */}
                    {place.website && (
                        <a 
                            href={place.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-blue-600 hover:underline"
                        >
                            <Globe className="w-5 h-5" />
                            <span>לאתר המקום</span>
                            <ExternalLink className="w-4 h-4" />
                        </a>
                    )}

                    {/* Google Maps Link */}
                    {place.place_id && (
                        <a 
                            href={`https://www.google.com/maps/place/?q=place_id:${place.place_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-blue-600 hover:underline"
                        >
                            <MapPin className="w-5 h-5" />
                            <span>פתח בגוגל מפות</span>
                            <ExternalLink className="w-4 h-4" />
                        </a>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-4 pt-4 border-t">
                    <Button
                        onClick={() => {
                            onSelect(place);
                            onOpenChange(false);
                        }}
                        className="flex-1 bg-orange-500 hover:bg-orange-600"
                    >
                        בחר מקום זה
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        סגור
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
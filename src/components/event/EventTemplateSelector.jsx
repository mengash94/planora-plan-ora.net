import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { getEventTemplates } from '@/components/instabackService';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Loader2, Calendar, Clock, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

import { getEventTypeByCategory } from '@/components/admin/EventTypeClassification';

export default function EventTemplateSelector({ onTemplateSelected, onClose, eventType }) {
    const [templates, setTemplates] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchTemplates = async () => {
            try {
                const fetchedTemplates = await getEventTemplates();
                setTemplates(fetchedTemplates || []);
            } catch (error) {
                console.error("Failed to fetch event templates:", error);
                toast.error("שגיאה בטעינת התבניות");
            } finally {
                setIsLoading(false);
            }
        };
        fetchTemplates();
    }, []);

    // Extract unique categories from templates
    const categories = useMemo(() => {
        const cats = new Set();
        templates.forEach(t => {
            if (t.category) cats.add(t.category);
        });
        return Array.from(cats);
    }, [templates]);

    // Filter templates by search, category, AND event type
    const filteredTemplates = useMemo(() => {
        return templates.filter(t => {
            const matchesSearch = !searchQuery || 
                (t.title || t.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (t.description || '').toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
            
            // Filter by event type if provided
            if (eventType) {
                const templateEventType = getEventTypeByCategory(t.category);
                if (templateEventType !== eventType) return false;
            }
            
            return matchesSearch && matchesCategory;
        });
    }, [templates, searchQuery, selectedCategory, eventType]);

    const pickColor = (i) => {
        const palette = [
            "from-orange-400 to-rose-400",
            "from-emerald-400 to-green-500",
            "from-blue-400 to-indigo-500",
            "from-purple-400 to-pink-500",
            "from-amber-400 to-yellow-500",
            "from-teal-400 to-cyan-500",
        ];
        return palette[i % palette.length];
    };

    const handleTemplateSelect = async (template) => {
        if (!template) return;

        try {
            console.log('[EventTemplateSelector] Template selected:', template);

            if (onTemplateSelected) {
                onTemplateSelected({
                    templateId: template.id || template.templateId || template.template_id,
                    title: template.title,
                    description: template.description,
                    category: template.category,
                    coverImageUrl: template.cover_image_url || template.coverImageUrl,
                    defaultTasks: template.default_tasks || template.defaultTasks || [],
                    defaultItinerary: template.defaultItinerary || template.default_itinerary || [],
                    canBePublic: template.canBePublic ?? template.can_be_public ?? true,
                    location: template.location || '',
                    budget: template.budget || '',
                    privacy: template.privacy || 'private',
                    participationCost: template.participationCost || template.participation_cost || '',
                    hidePaymentsFromMembers: template.hidePaymentsFromMembers || template.hide_payments_from_members || false,
                    paymentMethod: template.paymentMethod || template.payment_method || '',
                    paymentMethods: template.paymentMethods || template.payment_methods || [],
                    paymentPhone: template.paymentPhone || template.payment_phone || '',
                    bankDetails: template.bankDetails || template.bank_details || null,
                    type: 'template'
                });
            }

            if (onClose) {
                onClose();
            }

        } catch (error) {
            console.error('[EventTemplateSelector] Error handling template selection:', error);
            toast.error('שגיאה בבחירת התבנית');
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
        );
    }

    if (templates.length === 0) {
        return <p className="text-center p-8 text-gray-500">לא נמצאו תבניות זמינות.</p>;
    }

    return (
        <div className="px-1" dir="rtl">
            {/* Compact Search and Filter */}
            <div className="mb-2 flex flex-wrap gap-2 items-center">
                <div className="relative flex-1 min-w-[150px]">
                    <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <Input
                        placeholder="חפש..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pr-8 h-8 text-sm"
                    />
                    {searchQuery && (
                        <button 
                            onClick={() => setSearchQuery('')}
                            className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
                
                {/* Category filters - inline */}
                <div className="flex flex-wrap gap-1">
                    <button
                        onClick={() => setSelectedCategory('all')}
                        className={`px-2 py-1 text-xs rounded-full transition-colors ${
                            selectedCategory === 'all' 
                                ? 'bg-orange-500 text-white' 
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        הכל
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-2 py-1 text-xs rounded-full transition-colors ${
                                selectedCategory === cat 
                                    ? 'bg-orange-500 text-white' 
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {filteredTemplates.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    לא נמצאו תבניות מתאימות
                </div>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredTemplates.map((template, idx) => {
                    const tid = template.id || template.templateId || template.template_id || '';
                    const count = (template.default_tasks || template.defaultTasks || []).length || 0;

                    return (
                        <Card
                            key={tid || template.title || idx}
                            className="cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-0 overflow-hidden group"
                            onClick={() => handleTemplateSelect(template)}
                        >
                            <div className={`h-14 bg-gradient-to-br ${pickColor(idx)} relative overflow-hidden`}>
                                <div className="absolute inset-0 bg-black/10"></div>
                                <div className="absolute bottom-2 left-2">
                                    <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30 text-[10px] px-2 py-0.5">
                                        {template.category || 'אירוע'}
                                    </Badge>
                                </div>
                            </div>
                            <CardContent className="p-3" dir="rtl">
                                <div className="flex items-center gap-2 mb-2">
                                    <Calendar className="w-4 h-4 text-orange-600" />
                                    <CardTitle className="text-sm group-hover:text-orange-600 transition-colors leading-tight text-right w-full">
                                        {template.title || template.name}
                                    </CardTitle>
                                </div>
                                <p className="text-gray-600 text-xs mb-3 line-clamp-2 leading-relaxed text-right" dir="rtl">
                                    {template.description}
                                </p>
                                <div className="flex items-center justify-between text-xs text-gray-500">
                                    <span className="text-right">{count} משימות</span>
                                    <div className="flex items-center">
                                        <Clock className="w-3 h-3 mr-1" />
                                        <span>מוכן</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
            )}
        </div>
    );
}
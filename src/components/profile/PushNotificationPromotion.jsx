
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, X, Zap, MessageCircle, CheckSquare, Calendar, TrendingUp } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { registerToPlanoraAlert } from '@/components/planoraAlertService';
import { motion, AnimatePresence } from 'framer-motion';

export default function PushNotificationPromotion({ user, hasAnyDevices, onDismiss }) {
    const [showBanner, setShowBanner] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        if (!user?.id || hasAnyDevices || dismissed) return;

        const dismissedUntil = localStorage.getItem('push_promo_dismissed_until');
        if (dismissedUntil && Date.now() < parseInt(dismissedUntil)) {
            return;
        }

        const viewCount = parseInt(localStorage.getItem('push_promo_view_count') || '0');
        localStorage.setItem('push_promo_view_count', String(viewCount + 1));

        if (viewCount === 0) {
            setShowModal(true);
        } else {
            setShowBanner(true);
        }
    }, [user?.id, hasAnyDevices, dismissed]);

    const handleDismiss = (days = 3) => {
        const dismissUntil = Date.now() + (days * 24 * 60 * 60 * 1000);
        localStorage.setItem('push_promo_dismissed_until', String(dismissUntil));
        setDismissed(true);
        setShowBanner(false);
        setShowModal(false);
        if (onDismiss) onDismiss();
    };

    const handleRegister = () => {
        if (!user?.id) return;
        localStorage.removeItem('push_promo_dismissed_until');
        localStorage.removeItem('push_promo_view_count');
        registerToPlanoraAlert(user.id);
    };

    const benefits = [
        {
            icon: <MessageCircle className="w-4 h-4 text-blue-500" />,
            title: 'הודעות בזמן אמת',
            description: 'קבל התראה מיידית על כל הודעה חדשה בצ\'אט'
        },
        {
            icon: <CheckSquare className="w-4 h-4 text-green-500" />,
            title: 'משימות חדשות',
            description: 'תתעדכן מיד כשמשימה חדשה מוקצית לך'
        },
        {
            icon: <Calendar className="w-4 h-4 text-orange-500" />,
            title: 'תזכורות אירועים',
            description: 'אל תפספס אף אירוע חשוב עם תזכורות אוטומטיות'
        },
        {
            icon: <TrendingUp className="w-4 h-4 text-purple-500" />,
            title: 'עדכונים חשובים',
            description: 'היה הראשון לדעת על שינויים ועדכונים'
        }
    ];

    return (
        <>
            {/* Sticky Banner */}
            <AnimatePresence>
                {showBanner && (
                    <motion.div
                        initial={{ y: -100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -100, opacity: 0 }}
                        className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-xl"
                    >
                        <div className="max-w-6xl mx-auto px-3 py-2 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                                    <Bell className="w-3.5 h-3.5 animate-pulse" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="font-bold text-xs leading-tight truncate">🔥 פספסת משהו חשוב?</p>
                                    <p className="text-[10px] opacity-90 leading-tight truncate">הפעל התראות וקבל עדכונים בזמן אמת!</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                                <Button
                                    onClick={handleRegister}
                                    size="sm"
                                    className="bg-white text-orange-600 hover:bg-gray-100 font-bold shadow-lg text-[10px] h-7 px-2"
                                >
                                    <Zap className="w-3 h-3 mr-0.5" />
                                    הפעל
                                </Button>
                                <Button
                                    onClick={() => setShowModal(true)}
                                    size="sm"
                                    variant="ghost"
                                    className="text-white hover:bg-white/20 text-[10px] h-7 px-2 hidden sm:inline-flex"
                                >
                                    למה?
                                </Button>
                                <Button
                                    onClick={() => handleDismiss(7)}
                                    size="sm"
                                    variant="ghost"
                                    className="text-white hover:bg-white/20 p-1 h-7 w-7"
                                >
                                    <X className="w-3 h-3" />
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Detailed Modal */}
            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
                    <DialogHeader className="p-4 sm:p-6 pb-2">
                        <DialogTitle className="flex items-center gap-2 text-base sm:text-xl">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-orange-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                                <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                            </div>
                            <span className="leading-tight">שדרג את החוויה שלך עם התראות Push</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs sm:text-sm">
                            ללא התראות, תפספס עדכונים חשובים ולא תקבל את החוויה המלאה
                        </DialogDescription>
                    </DialogHeader>

                    <div className="overflow-y-auto flex-1 px-4 sm:px-6 pb-4">
                        <div className="space-y-3 sm:space-y-4 py-2">
                            {/* Benefits Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                                {benefits.map((benefit, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        className="p-2.5 sm:p-3 bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200 hover:shadow-md transition-all"
                                    >
                                        <div className="flex items-start gap-2">
                                            <div className="mt-0.5">{benefit.icon}</div>
                                            <div>
                                                <h3 className="font-semibold text-gray-900 text-xs sm:text-sm mb-0.5">{benefit.title}</h3>
                                                <p className="text-[10px] sm:text-xs text-gray-600 leading-snug">{benefit.description}</p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            {/* Stats */}
                            <div className="bg-gradient-to-r from-orange-50 to-pink-50 p-3 sm:p-4 rounded-lg border border-orange-200">
                                <div className="text-center space-y-1">
                                    <p className="text-xl sm:text-2xl font-bold text-orange-600">⚡ 3x יותר מהיר</p>
                                    <p className="text-[10px] sm:text-xs text-gray-700">משתמשים עם התראות מגיבים למשימות ולהודעות מהר פי 3!</p>
                                </div>
                            </div>

                            {/* Privacy Note */}
                            <div className="bg-blue-50 p-2.5 sm:p-3 rounded-lg border border-blue-200">
                                <p className="text-[10px] sm:text-xs text-blue-900 flex items-start gap-1.5">
                                    <span className="text-sm sm:text-base">🔒</span>
                                    <span className="leading-snug">
                                        <strong>הפרטיות שלך חשובה לנו:</strong> נשלח לך רק התראות רלוונטיות על אירועים שאתה חלק מהם. תוכל לבטל בכל עת.
                                    </span>
                                </p>
                            </div>

                            {/* CTA Buttons */}
                            <div className="flex flex-col sm:flex-row gap-2">
                                <Button
                                    onClick={handleRegister}
                                    className="flex-1 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-bold text-sm sm:text-base py-4 sm:py-5 shadow-xl"
                                >
                                    <Zap className="w-4 h-4 mr-1.5" />
                                    כן, הפעל התראות Push!
                                </Button>
                                <Button
                                    onClick={() => handleDismiss(7)}
                                    variant="outline"
                                    className="px-4 text-xs sm:text-sm"
                                >
                                    אולי מאוחר יותר
                                </Button>
                            </div>

                            <p className="text-[9px] sm:text-[10px] text-center text-gray-500 leading-snug">
                                התראות Push זמינות בכל הדפדפנים המודרניים (Chrome, Firefox, Edge, Safari)
                            </p>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

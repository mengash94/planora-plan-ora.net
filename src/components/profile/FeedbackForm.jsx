import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Send, Loader2, CheckCircle2, Lightbulb, Bug, HelpCircle, MessageCircleIcon } from 'lucide-react';
import { toast } from 'sonner';

export default function FeedbackForm({ user, onSubmitFeedback }) {
    const [formData, setFormData] = useState({
        feedbackType: 'general',
        title: '',
        message: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const feedbackTypes = [
        { 
            value: 'general', 
            label: 'משוב כללי',
            icon: MessageCircleIcon,
            description: 'שתף אותנו במחשבות שלך על האפליקציה'
        },
        { 
            value: 'suggestion', 
            label: 'הצעה לשיפור',
            icon: Lightbulb,
            description: 'יש לך רעיון לפיצ\'ר חדש?'
        },
        { 
            value: 'bug_report', 
            label: 'דיווח על באג',
            icon: Bug,
            description: 'משהו לא עובד כמו שצריך?'
        },
        { 
            value: 'question', 
            label: 'שאלה',
            icon: HelpCircle,
            description: 'יש לך שאלה? נשמח לעזור'
        }
    ];

    const selectedType = feedbackTypes.find(t => t.value === formData.feedbackType);
    const Icon = selectedType?.icon || MessageSquare;

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.title.trim() || !formData.message.trim()) {
            toast.error('נא למלא כותרת והודעה');
            return;
        }

        setIsSubmitting(true);
        try {
            // Call the backend function via the parent component's handler
            await onSubmitFeedback({
                userId: user.id,
                userName: user.name || user.email,
                userEmail: user.email,
                feedbackType: formData.feedbackType,
                title: formData.title,
                message: formData.message
            });

            // Reset form
            setFormData({
                feedbackType: 'general',
                title: '',
                message: ''
            });

            // Show success message
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 5000);

            toast.success('המשוב נשלח בהצלחה! תודה 🎉');
        } catch (error) {
            console.error('Failed to submit feedback:', error);
            toast.error('שגיאה בשליחת המשוב. אנא נסה שנית');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (showSuccess) {
        return (
            <Card className="border-green-200 bg-green-50">
                <CardContent className="py-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                        <CheckCircle2 className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold text-green-800 mb-2">תודה רבה על המשוב!</h3>
                    <p className="text-gray-700 mb-4">
                        המשוב שלך התקבל בהצלחה ונשלח למנהלי המערכת.
                        <br />
                        אנחנו נבדוק אותו בהקדם האפשרי.
                    </p>
                    <Button
                        onClick={() => setShowSuccess(false)}
                        variant="outline"
                        className="border-green-600 text-green-600 hover:bg-green-100"
                    >
                        שלח משוב נוסף
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-6 h-6 text-orange-500" />
                    שלח משוב
                </CardTitle>
                <CardDescription>
                    נשמח לשמוע את דעתך, הצעותיך או דיווחים על בעיות
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Feedback Type */}
                    <div className="space-y-2">
                        <Label htmlFor="feedbackType">סוג הפניה</Label>
                        <Select
                            value={formData.feedbackType}
                            onValueChange={(value) => setFormData({ ...formData, feedbackType: value })}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {feedbackTypes.map(type => {
                                    const TypeIcon = type.icon;
                                    return (
                                        <SelectItem key={type.value} value={type.value}>
                                            <div className="flex items-center gap-2">
                                                <TypeIcon className="w-4 h-4" />
                                                <div className="flex flex-col items-start">
                                                    <span className="font-medium">{type.label}</span>
                                                    <span className="text-xs text-gray-500">{type.description}</span>
                                                </div>
                                            </div>
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Selected Type Info */}
                    <div className="p-3 bg-gray-50 rounded-lg flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                            <Icon className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                            <p className="font-medium text-gray-900">{selectedType?.label}</p>
                            <p className="text-sm text-gray-600">{selectedType?.description}</p>
                        </div>
                    </div>

                    {/* Title */}
                    <div className="space-y-2">
                        <Label htmlFor="title">כותרת</Label>
                        <Input
                            id="title"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="כותרת קצרה לפניה"
                            required
                        />
                    </div>

                    {/* Message */}
                    <div className="space-y-2">
                        <Label htmlFor="message">הודעה</Label>
                        <Textarea
                            id="message"
                            value={formData.message}
                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                            placeholder="פרט את המשוב, ההצעה או הבעיה..."
                            rows={6}
                            required
                        />
                        <p className="text-xs text-gray-500">
                            ככל שתספק יותר פרטים, כך נוכל לעזור לך טוב יותר
                        </p>
                    </div>

                    {/* Submit Button */}
                    <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-orange-500 hover:bg-orange-600"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                                שולח...
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4 ml-2" />
                                שלח משוב
                            </>
                        )}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
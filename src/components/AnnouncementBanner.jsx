import React from 'react';
import { Button } from '@/components/ui/button';
import { X, Info, AlertTriangle, CheckCircle, Lightbulb } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function AnnouncementBanner({ announcements, onDismiss }) {
    // ✅ הצגת הודעה אחת בכל פעם (הראשונה)
    const announcement = Array.isArray(announcements) && announcements.length > 0 
        ? announcements[0] 
        : null;
        
    if (!announcement) return null;

    const getTypeIcon = () => {
        switch (announcement.type) {
            case 'warning':
                return <AlertTriangle className="w-5 h-5 text-amber-600" />;
            case 'success':
                return <CheckCircle className="w-5 h-5 text-green-600" />;
            case 'guide':
                return <Lightbulb className="w-5 h-5 text-blue-600" />;
            default:
                return <Info className="w-5 h-5 text-blue-600" />;
        }
    };

    const getTypeStyle = () => {
        switch (announcement.type) {
            case 'warning':
                return 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200';
            case 'success':
                return 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200';
            case 'guide':
                return 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200';
            default:
                return 'bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200';
        }
    };

    return (
        <div className={`border-b-2 ${getTypeStyle()} relative z-50`}>
            <div className="max-w-4xl mx-auto px-4 py-4">
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                        {getTypeIcon()}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">
                            {announcement.title}
                        </h3>
                        
                        {/* תוכן נגלל עם גובה מקסימלי במובייל */}
                        <div className="max-h-96 md:max-h-80 overflow-y-auto text-gray-700 text-sm leading-relaxed bg-white/50 rounded-lg p-4 mb-4">
                            <ReactMarkdown
                                components={{
                                    h1: ({children}) => <h1 className="text-lg font-bold mb-3 text-gray-900">{children}</h1>,
                                    h2: ({children}) => <h2 className="text-base font-semibold mb-2 text-gray-800 border-b border-gray-200 pb-1">{children}</h2>,
                                    h3: ({children}) => <h3 className="text-sm font-medium mb-2 text-blue-700">{children}</h3>,
                                    p: ({children}) => <p className="mb-2 text-sm">{children}</p>,
                                    ul: ({children}) => <ul className="list-disc list-inside mb-3 space-y-1 mr-4">{children}</ul>,
                                    ol: ({children}) => <ol className="list-decimal list-inside mb-3 space-y-1 mr-4">{children}</ol>,
                                    li: ({children}) => <li className="text-gray-600 text-sm">{children}</li>,
                                    strong: ({children}) => <strong className="font-semibold text-gray-900">{children}</strong>,
                                    code: ({children}) => <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
                                    hr: () => <hr className="my-3 border-gray-300" />,
                                }}
                            >
                                {announcement.content}
                            </ReactMarkdown>
                        </div>
                        
                        <div className="flex gap-2">
                            <Button
                                onClick={() => onDismiss(announcement.id)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                            >
                                {announcement.dismissible_type === 'confirm_button' ? 'הבנתי!' : 'סגור'}
                            </Button>
                        </div>
                    </div>
                    
                    <button
                        onClick={() => onDismiss(announcement.id)}
                        className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 transition-colors md:block hidden"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
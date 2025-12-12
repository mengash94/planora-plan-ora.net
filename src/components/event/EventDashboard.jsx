import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckSquare, Calendar, Users, MessageSquare, FileText, TrendingUp, AlertCircle } from 'lucide-react';

export default function EventDashboard({ eventData, isLoading, eventId, canManage, userId, onNavigateToTab }) {
  // הגנה מפני undefined data
  if (isLoading || !eventData) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // ערכי ברירת מחדל בטוחים
  const tasks = eventData.tasks || [];
  const itineraryItems = eventData.itineraryItems || [];
  const recentMessages = []; // נחשב מהצ'אט (Removed specific count and display logic based on outline)
  const polls = eventData.polls || [];
  const documents = eventData.documents || [];
  const members = eventData.members || [];

  // חישוב סטטיסטיקות משימות
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
  const todoTasks = tasks.filter(t => t.status === 'todo').length;
  const tasksCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // משימות דחופות (עם תאריך יעד בעתיד הקרוב)
  const urgentTasks = tasks.filter(t => {
    if (t.status === 'done' || !t.dueDate) return false;
    const dueDate = new Date(t.dueDate);
    const now = new Date();
    const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
    return daysUntilDue >= 0 && daysUntilDue <= 7;
  }).length;

  // פריטי לוח זמנים קרובים
  const upcomingCount = itineraryItems.length;

  // סקרים פעילים
  const activePolls = polls.filter(p => p.isActive || p.is_active).length;

  // מסמכים
  const documentsCount = documents.length;

  // משתתפים
  const membersCount = members.length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {/* כרטיס משימות */}
      <button onClick={() => onNavigateToTab('tasks')} className="text-right">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer border-r-4 border-r-blue-500 dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <CheckSquare className="w-4 h-4" />
              משימות
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{totalTasks}</div>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${tasksCompletionRate}%` }}
                ></div>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">{tasksCompletionRate}%</span>
            </div>
            <div className="flex gap-2 mt-2 text-xs">
              <span className="text-green-600 dark:text-green-400">✓ {completedTasks} הושלמו</span>
              <span className="text-blue-600 dark:text-blue-400">→ {inProgressTasks} בתהליך</span>
              <span className="text-gray-500 dark:text-gray-400">○ {todoTasks} חדשות</span>
            </div>
            {urgentTasks > 0 && (
              <div className="mt-2 flex items-center gap-1 text-orange-600 text-xs">
                <AlertCircle className="w-3 h-3" />
                {urgentTasks} משימות דחופות
              </div>
            )}
          </CardContent>
        </Card>
      </button>

      {/* כרטיס לוח זמנים */}
      <button onClick={() => onNavigateToTab('itinerary')} className="text-right">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer border-r-4 border-r-purple-500 dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Calendar className="w-4 h-4" />
              לוח זמנים
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{upcomingCount}</div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">פעילויות מתוכננות</p>
            {itineraryItems.length > 0 && (
              <div className="mt-2 space-y-1">
                {itineraryItems.slice(0, 2).map((item, idx) => (
                  <div key={idx} className="text-xs text-gray-700 dark:text-gray-300 truncate">
                    • {item.title}
                  </div>
                ))}
                {itineraryItems.length > 2 && (
                  <div className="text-xs text-blue-600 dark:text-blue-400">
                    +{itineraryItems.length - 2} נוספות
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </button>

      {/* כרטיס משתתפים */}
      <button onClick={() => onNavigateToTab('participants')} className="text-right">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer border-r-4 border-r-green-500 dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Users className="w-4 h-4" />
              משתתפים
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{membersCount}</div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">משתתפים באירוע</p>
            {members.length > 0 && (
              <div className="flex -space-x-2 mt-2">
                {members.slice(0, 5).map((member, idx) => (
                  <div
                    key={idx}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-semibold border-2 border-white"
                    title={member.name || member.email}
                  >
                    {(member.name || member.email || '?').charAt(0).toUpperCase()}
                  </div>
                ))}
                {members.length > 5 && (
                  <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-700 text-xs font-semibold border-2 border-white">
                    +{members.length - 5}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </button>

      {/* כרטיס צ'אט */}
      <button onClick={() => onNavigateToTab('chat')} className="text-right">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer border-r-4 border-r-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-600">
              <MessageSquare className="w-4 h-4" />
              צ'אט
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">💬</div>
            <p className="text-xs text-gray-500 mt-1">לחץ לצפייה בצ'אט</p>
          </CardContent>
        </Card>
      </button>

      {/* כרטיס סקרים */}
      <button onClick={() => onNavigateToTab('polls')} className="text-right">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer border-r-4 border-r-pink-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-600">
              <TrendingUp className="w-4 h-4" />
              סקרים
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{polls.length}</div>
            <p className="text-xs text-gray-500 mt-1">סקרים באירוע</p>
            {activePolls > 0 && (
              <div className="mt-2 inline-block bg-pink-100 text-pink-700 px-2 py-1 rounded-full text-xs font-semibold">
                {activePolls} פעילים
              </div>
            )}
            {polls.length > 0 && (
              <div className="mt-2 space-y-1">
                {polls.slice(0, 2).map((poll, idx) => (
                  <div key={idx} className="text-xs text-gray-700 dark:text-gray-300 truncate">
                    • {poll.title}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </button>

      {/* כרטיס מסמכים */}
      <button onClick={() => onNavigateToTab('documents')} className="text-right">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer border-r-4 border-r-indigo-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-600">
              <FileText className="w-4 h-4" />
              מסמכים
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{documentsCount}</div>
            <p className="text-xs text-gray-500 mt-1">קבצים ומסמכים</p>
            {documents.length > 0 && (
              <div className="mt-2 space-y-1">
                {documents.slice(0, 2).map((doc, idx) => (
                  <div key={idx} className="text-xs text-gray-700 dark:text-gray-300 truncate">
                    📄 {doc.fileName || doc.file_name || 'מסמך'}
                  </div>
                ))}
                {documents.length > 2 && (
                  <div className="text-xs text-indigo-600">
                    +{documents.length - 2} נוספים
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </button>
    </div>
  );
}
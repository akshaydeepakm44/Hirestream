import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Bell, Clock, CheckCircle, Trash2, Check } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { formatTimeAgo } from '../../utils/timeAgo';
import { Notification } from '../../types';

export const CandidateNotifications = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'unread'>('all');

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/notifications');
            setNotifications(data);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const markAsRead = async (id: number) => {
        try {
            await api.patch(`/notifications/${id}/read`);
            setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const markAllRead = async () => {
        try {
            await api.patch('/notifications/read-all');
            setNotifications(notifications.map(n => ({ ...n, is_read: true })));
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const deleteNotification = async (id: number) => {
        try {
            await api.delete(`/notifications/${id}`);
            setNotifications(notifications.filter(n => n.id !== id));
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    };

    const filteredNotifications = filter === 'all' 
        ? notifications 
        : notifications.filter(n => !n.is_read);

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Activity & Notifications</h1>
                    <p className="text-sm text-slate-500 mt-1">Keep track of your application updates and candidate lifecycle events.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs font-bold uppercase tracking-widest h-10 px-4 rounded-xl border-slate-200"
                        onClick={markAllRead}
                        disabled={!notifications.some(n => !n.is_read)}
                    >
                        <Check className="w-3.5 h-3.5 mr-2" />
                        Mark All Read
                    </Button>
                </div>
            </div>

            <div className="flex items-center gap-3 border-b border-slate-200 pb-1">
                <button 
                    onClick={() => setFilter('all')}
                    className={`pb-3 px-2 text-xs font-bold uppercase tracking-widest transition-all relative ${filter === 'all' ? 'text-primary-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    All Activity
                    {filter === 'all' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-full" />}
                </button>
                <button 
                    onClick={() => setFilter('unread')}
                    className={`pb-3 px-2 text-xs font-bold uppercase tracking-widest transition-all relative ${filter === 'unread' ? 'text-primary-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Unread
                    {filter === 'unread' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-full" />}
                </button>
            </div>

            <div className="space-y-4">
                {loading ? (
                    [...Array(3)].map((_, i) => (
                        <Card key={i} className="p-6 border-slate-100 animate-pulse">
                            <div className="flex gap-4">
                                <div className="w-12 h-12 bg-slate-100 rounded-xl" />
                                <div className="flex-1 space-y-3">
                                    <div className="h-4 bg-slate-100 w-1/4 rounded" />
                                    <div className="h-3 bg-slate-100 w-3/4 rounded" />
                                </div>
                            </div>
                        </Card>
                    ))
                ) : filteredNotifications.length === 0 ? (
                    <div className="py-20 text-center bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                        <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4">
                            <Bell className="w-8 h-8 text-slate-300" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">No notifications found</h3>
                        <p className="text-slate-500 mt-1">We'll let you know when something important happens.</p>
                    </div>
                ) : (
                    filteredNotifications.map((notification) => (
                        <Card 
                            key={notification.id} 
                            className={`p-6 transition-all border-l-4 ${!notification.is_read ? 'bg-white border-l-primary-500 shadow-md ring-1 ring-primary-500/5' : 'bg-white/60 border-l-slate-200 grayscale-[0.5] opacity-80'}`}
                        >
                            <div className="flex items-start gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${!notification.is_read ? 'bg-primary-50 text-primary-600' : 'bg-slate-100 text-slate-400'}`}>
                                    <Bell className="w-6 h-6" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-4">
                                        <h3 className="text-base font-bold text-slate-900 leading-tight">{notification.title}</h3>
                                        <div className="flex items-center gap-2">
                                            {!notification.is_read && (
                                                <button 
                                                    onClick={() => markAsRead(notification.id)}
                                                    className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                                    title="Mark as read"
                                                >
                                                    <CheckCircle className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button 
                                                onClick={() => deleteNotification(notification.id)}
                                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Delete notification"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-sm text-slate-600 mt-2 leading-relaxed">{notification.message}</p>
                                    <div className="flex items-center gap-4 mt-4">
                                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                            <Clock className="w-3.5 h-3.5" />
                                            {formatTimeAgo(notification.created_at)}
                                        </div>
                                        {notification.is_read && (
                                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-500 uppercase tracking-wider">
                                                <CheckCircle className="w-3.5 h-3.5" />
                                                Read
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
};

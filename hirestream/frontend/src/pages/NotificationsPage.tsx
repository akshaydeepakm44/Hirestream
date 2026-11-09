import { useState, useEffect } from 'react';
import { api, safeArray } from '../api/client';
import { 
    Bell, 
    Clock, 
    CheckCircle, 
    Circle, 
    CheckCheck, 
    Filter,
    Briefcase,
    Calendar,
    XCircle,
    Mail,
    UserPlus,
    FileText
} from 'lucide-react';
import { formatTimeAgo } from '../utils/timeAgo';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';

interface Notification {
    id: number;
    title: string;
    message: string;
    type: string;
    is_read: boolean;
    created_at: string;
}

const TYPE_STYLES: Record<string, { bg: string; text: string; icon: any; label: string }> = {
    requisition:  { bg: 'bg-indigo-50', text: 'text-indigo-700', icon: Briefcase, label: 'Hire Request' },
    interview:    { bg: 'bg-amber-50', text: 'text-amber-700', icon: Calendar, label: 'Interview Scheduled' },
    interview_cancelled: { bg: 'bg-red-50', text: 'text-red-700', icon: XCircle, label: 'Interview Cancelled' },
    email:        { bg: 'bg-blue-50', text: 'text-blue-700', icon: Mail, label: 'Email Sent' },
    application:  { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: UserPlus, label: 'New Application' },
    status:       { bg: 'bg-slate-50', text: 'text-slate-700', icon: FileText, label: 'System Update' },
    default:      { bg: 'bg-slate-50', text: 'text-slate-700', icon: Bell, label: 'General' },
};

const getTypeStyle = (type: string) => TYPE_STYLES[type] || TYPE_STYLES.default;


export const NotificationsPage = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
    const [typeFilter, setTypeFilter] = useState<string>('all');

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/notifications?limit=200');
            setNotifications(safeArray(data));
        } catch (e) {
            console.error('Failed to fetch notifications', e);
            setNotifications([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchNotifications(); }, []);

    const markAsRead = async (id: number) => {
        try {
            await api.patch(`/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        } catch (e) { console.error(e); }
    };

    const markAllAsRead = async () => {
        try {
            await api.patch('/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        } catch (e) { console.error(e); }
    };

    const availableTypes = ['all', ...Array.from(new Set(notifications.map(n => n.type)))];

    const filtered = notifications.filter(n => {
        const readMatch = filter === 'all' ? true : filter === 'unread' ? !n.is_read : n.is_read;
        const typeMatch = typeFilter === 'all' || n.type === typeFilter;
        return readMatch && typeMatch;
    });

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-6 min-h-screen pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center">
                            <Bell className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">Notification Activity</h1>
                            <p className="text-sm text-slate-500 mt-0.5">
                                {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllAsRead}
                            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-slate-700 transition-all"
                        >
                            <CheckCheck className="w-4 h-4" />
                            Mark All Read
                        </button>
                    )}
                </div>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Total', value: notifications.length, color: 'text-slate-900' },
                    { label: 'Unread', value: unreadCount, color: 'text-blue-600' },
                    { label: 'Read', value: notifications.length - unreadCount, color: 'text-emerald-600' },
                ].map(stat => (
                    <div key={stat.label} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                        <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
                    <Filter className="w-3.5 h-3.5" />
                    Filters
                </div>
                <div className="flex gap-2">
                    {(['all', 'unread', 'read'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={cn(
                                "px-3 py-1.5 text-xs font-bold rounded-lg transition-all capitalize",
                                filter === f ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                            )}
                        >{f}</button>
                    ))}
                </div>
                <div className="w-px h-4 bg-slate-200" />
                <div className="flex flex-wrap gap-2">
                    {availableTypes.map(t => {
                        const style = t === 'all' ? null : getTypeStyle(t);
                        return (
                            <button
                                key={t}
                                onClick={() => setTypeFilter(t)}
                                className={cn(
                                    "px-3 py-1.5 text-xs font-bold rounded-lg transition-all capitalize",
                                    typeFilter === t
                                        ? t === 'all' ? "bg-slate-900 text-white" : `${style?.bg} ${style?.text} ring-1 ring-inset ring-current`
                                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                )}
                            >{t === 'all' ? 'All Types' : style?.label || t}</button>
                        );
                    })}
                </div>
            </div>

            {/* Notification List */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                {loading ? (
                    <div className="divide-y divide-slate-100">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="p-5 animate-pulse flex gap-4">
                                <div className="w-10 h-10 bg-slate-100 rounded-xl shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-slate-100 rounded w-48" />
                                    <div className="h-3 bg-slate-100 rounded w-96 max-w-full" />
                                    <div className="h-3 bg-slate-100 rounded w-24" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center text-center">
                        <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Bell className="w-7 h-7 text-slate-300" />
                        </div>
                        <p className="text-sm font-bold text-slate-500">No notifications found</p>
                        <p className="text-xs text-slate-400 mt-1">Try adjusting your filters</p>
                    </div>
                ) : (
                    <AnimatePresence initial={false}>
                        <div className="divide-y divide-slate-100">
                            {filtered.map((n, idx) => {
                                const style = getTypeStyle(n.type);
                                return (
                                    <motion.div
                                        key={n.id}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.03 }}
                                        onClick={() => !n.is_read && markAsRead(n.id)}
                                        className={cn(
                                            "flex items-start gap-4 p-5 cursor-pointer hover:bg-slate-50 transition-colors group",
                                            !n.is_read && "bg-blue-50/30"
                                        )}
                                    >
                                        {/* Icon */}
                                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5", style.bg)}>
                                            <Bell className={cn("w-4 h-4", style.text)} />
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <p className="text-sm font-bold text-slate-900 leading-tight">{n.title}</p>
                                                        <span className={cn("px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wide", style.bg, style.text)}>
                                                            {style.label}
                                                        </span>
                                                        {!n.is_read && (
                                                            <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0" />
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-slate-600 mt-1 leading-relaxed">{n.message}</p>
                                                </div>
                                                {/* Read toggle */}
                                                <button
                                                    onClick={e => { e.stopPropagation(); if (!n.is_read) markAsRead(n.id); }}
                                                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    title={n.is_read ? 'Already read' : 'Mark as read'}
                                                >
                                                    {n.is_read
                                                        ? <CheckCircle className="w-5 h-5 text-emerald-400" />
                                                        : <Circle className="w-5 h-5 text-slate-300 hover:text-blue-500 transition-colors" />
                                                    }
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400 font-medium">
                                                <Clock className="w-3 h-3" />
                                                <span>{formatTimeAgo(n.created_at)}</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </AnimatePresence>
                )}

                {/* Footer count */}
                {filtered.length > 0 && (
                    <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 text-center">
                        <p className="text-[11px] font-medium text-slate-400">
                            Showing {filtered.length} of {notifications.length} notifications · sorted by latest first
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

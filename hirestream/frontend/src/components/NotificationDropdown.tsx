import { useState, useEffect, useRef } from 'react';
import { Bell, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatTimeAgo } from '../utils/timeAgo';
import { useNavigate } from 'react-router-dom';
import { api, safeArray } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Notification } from '../types';

export const NotificationDropdown = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const { user } = useAuth();

    const fetchNotifications = async () => {
        try {
            const { data } = await api.get('/notifications');
            setNotifications(safeArray(data));
            const countRes = await api.get('/notifications/unread-count');
            setUnreadCount(countRes.data?.count || 0);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const markAsRead = async (id: number) => {
        try {
            await api.patch(`/notifications/${id}/read`);
            setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await api.patch('/notifications/read-all');
            setNotifications(notifications.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const handleNotificationClick = (notification: Notification) => {
        if (!notification.is_read) {
            markAsRead(notification.id);
        }
        setIsOpen(false);
    };

    const handleViewAll = () => {
        setIsOpen(false);
        const role = user?.role || '';
        const basePath = role === 'hiring_manager'
            ? '/hiring-manager'
            : role === 'resource_manager'
            ? '/resource-manager'
            : '/candidate';
        navigate(`${basePath}/notifications`);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden"
                    >
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Notifications</h3>
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase"
                                >
                                    Mark all read
                                </button>
                            )}
                        </div>

                        <div className="max-h-[400px] overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="p-10 text-center">
                                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Bell className="w-6 h-6 text-slate-300" />
                                    </div>
                                    <p className="text-sm text-slate-500">No notifications yet</p>
                                </div>
                            ) : (
                                notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        onClick={() => handleNotificationClick(notification)}
                                        className={`p-4 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors relative ${!notification.is_read ? 'bg-blue-50/30' : ''}`}
                                    >
                                        {!notification.is_read && (
                                            <div className="absolute top-4 left-2 w-1.5 h-1.5 bg-blue-500 rounded-full" />
                                        )}
                                        <div className="flex justify-between items-start gap-3">
                                            <div className="flex-1">
                                                <p className="text-sm font-bold text-slate-900">{notification.title}</p>
                                                <p className="text-xs text-slate-600 mt-1 line-clamp-2">{notification.message}</p>
                                                <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400 font-medium">
                                                    <Clock className="w-3 h-3" />
                                                    {formatTimeAgo(notification.created_at)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* View All Activity — now navigates to full notifications page */}
                        <div className="p-3 bg-slate-50 border-t border-slate-100">
                            <button
                                onClick={handleViewAll}
                                className="flex items-center justify-center gap-2 w-full text-[11px] font-bold text-slate-600 hover:text-slate-900 uppercase tracking-widest transition-colors group"
                            >
                                
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

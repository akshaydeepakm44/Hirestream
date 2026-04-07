import { Settings, User } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { NotificationDropdown } from './NotificationDropdown';

export const Header = () => {
    const location = useLocation();
    const { user } = useAuth();

    const getPageTitle = () => {
        const parts = location.pathname.split('/').filter(Boolean);
        if (parts.length === 0) return 'Dashboard';
        const last = parts[parts.length - 1];
        return last.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    };

    return (
        <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 flex items-center justify-between px-8">
            <div className="flex items-center gap-4">
                <h2 className="text-lg font-bold text-slate-900 leading-none">{getPageTitle()}</h2>
                <div className="h-4 w-px bg-slate-200" />
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                    <span>Console</span>
                    <span className="text-slate-300">/</span>
                    <span className="text-primary-600">{getPageTitle()}</span>
                </div>
            </div>

            <div className="flex items-center gap-6">
                <div className="flex items-center gap-1 border-l border-slate-200 pl-6">
                    <NotificationDropdown />
                    <Link 
                        to={
                            user?.role === 'hiring_manager' ? '/hiring/dashboard/settings' : 
                            user?.role === 'resource_manager' ? '/resource/dashboard/settings' : 
                            '/candidate/settings'
                        }
                        className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-all"
                    >
                        <Settings className="w-4 h-4" />
                    </Link>

                </div>

                <div className="flex items-center gap-3 border-l border-slate-200 pl-6 group py-2">
                    <div className="flex flex-col items-end">
                        <span className="text-xs font-bold text-slate-900 leading-none group-hover:text-primary-600 transition-colors">{user?.full_name}</span>
                        <span className="text-[10px] font-medium text-slate-500 uppercase tracking-tight mt-1">{user?.role?.replace('_', ' ')}</span>
                    </div>
                    <div className="w-8 h-8 bg-slate-100 rounded flex items-center justify-center text-slate-600 border border-slate-200 group-hover:border-primary-200 group-hover:bg-primary-50 transition-colors">
                        <User className="w-4 h-4 group-hover:text-primary-600" />
                    </div>
                </div>
            </div>
        </header>
    );
};

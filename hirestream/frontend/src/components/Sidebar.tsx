import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Briefcase,
    Calendar,
    Settings,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Workflow,
    PieChart,
    Layers,
    Target,
    Zap,
    Users,
    ClipboardCheck,
    ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/cn';

interface SidebarLink {
    path: string;
    label: string;
    icon: any;
    count?: number;
    badge?: string;
}

export const Sidebar = ({ isCollapsed, toggleSidebar }: { isCollapsed: boolean, toggleSidebar: () => void }) => {
    const { user, logout } = useAuth();
    const location = useLocation();

    const getLinks = (): SidebarLink[] => {
        if (user?.role === 'resource_manager') {
            return [
                { path: '/resource/dashboard', label: 'Analytics', icon: PieChart },
                { path: '/resource/dashboard/roles', label: 'Requisitions', icon: Briefcase },
                { path: '/resource/dashboard/applicants', label: 'Candidates', icon: Users },
                { path: '/resource/dashboard/pipeline', label: 'Sourcing Pipeline', icon: Workflow },
                { path: '/resource/dashboard/administration', label: 'Administration', icon: ClipboardCheck },
                { path: '/resource/dashboard/interviews', label: 'Interviews', icon: Calendar },
                { path: '/resource/dashboard/ats', label: 'ATS Analysis', icon: Target },
            ];
        }
        if (user?.role === 'hiring_manager') {
            return [
                { path: '/hiring/dashboard', label: 'Overview', icon: PieChart },
                { path: '/hiring/dashboard/requisitions', label: 'Requisitions', icon: Briefcase },
                { path: '/hiring/dashboard/pipeline', label: 'Pipeline', icon: Workflow },
                { path: '/hiring/dashboard/interviews', label: 'Interviews', icon: Calendar },
                { path: '/hiring/dashboard/hire-request', label: 'Hire Request', icon: Zap },
            ];
        }
        if (user?.role === 'candidate') {
            return [
                { path: '/candidate', label: 'Dashboard', icon: PieChart },
                { path: '/candidate/jobs', label: 'Browse Jobs', icon: Briefcase },
                { path: '/candidate/applications', label: 'My Applications', icon: Layers },
                { path: '/candidate/assessments', label: 'Assessments', icon: ClipboardCheck },
                { path: '/candidate/onboarding', label: 'Onboarding', icon: ShieldCheck },
            ];
        }
        return [];
    };

    const links = getLinks();

    return (
        <motion.aside
            initial={false}
            animate={{ width: isCollapsed ? 80 : 280 }}
            className={cn(
                "h-screen sticky top-0 bg-white border-r border-slate-100 flex flex-col z-40 transition-all overflow-hidden",
                "shadow-[4px_0_24px_rgba(0,0,0,0.01)]"
            )}
        >
            {/* Logo Section */}
            <div className="h-16 flex items-center px-6 gap-3 border-b border-slate-200">
                <div className="w-8 h-8 bg-primary-600 rounded flex items-center justify-center text-white flex-shrink-0">
                    <Briefcase className="w-5 h-5" />
                </div>
                {!isCollapsed && (
                    <div className="flex flex-col">
                        <span className="text-lg font-bold text-slate-900 leading-none">HireStream</span>
                        <span className="text-[10px] font-medium text-slate-500 mt-1 uppercase tracking-wider">Enterprise Console</span>
                    </div>
                )}
            </div>

            {/* Navigation Section */}
            <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto no-scrollbar">
                {links.map((link) => {
                    const isActive = location.pathname === link.path;
                    return (
                        <NavLink
                            key={link.path}
                            to={link.path}
                            className={({ isActive: innerActive }) => cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all group relative",
                                innerActive
                                    ? "bg-primary-50 text-primary-700 font-semibold"
                                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                            )}
                        >
                            <link.icon className={cn(
                                "w-4 h-4 flex-shrink-0 transition-all",
                                isActive ? "text-primary-600" : "text-slate-400"
                            )} />
                            {!isCollapsed && (
                                <span className="truncate">
                                    {link.label}
                                </span>
                            )}

                            {isActive && !isCollapsed && (
                                <div className="absolute left-0 w-1 h-5 bg-primary-600 rounded-r-full" />
                            )}
                        </NavLink>
                    );
                })}
            </nav>

            {/* Bottom Section (User & Management) */}
            <div className="p-4 border-t border-slate-200 space-y-2">
                {!isCollapsed && (
                    <div className="px-3 py-2 flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs border border-slate-200">
                            {user?.full_name?.charAt(0)}
                        </div>
                        <div className="truncate text-xs">
                            <p className="font-bold text-slate-900 truncate">{user?.full_name}</p>
                            <p className="text-[10px] text-slate-500 uppercase tracking-tight">{user?.role.replace('_', ' ')}</p>
                        </div>
                    </div>
                )}

                <div className={cn("space-y-0.5", isCollapsed && "flex flex-col items-center")}>
                    <NavLink
                        to={
                            user?.role === 'hiring_manager' ? '/hiring/dashboard/settings' :
                                user?.role === 'resource_manager' ? '/resource/dashboard/settings' :
                                    '/candidate/settings'
                        }
                        className={({ isActive }) => cn(
                            "flex items-center gap-3 w-full px-3 py-2 rounded-md text-xs font-medium transition-all",
                            isActive
                                ? "bg-primary-50 text-primary-700"
                                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        )}
                    >
                        <Settings className={cn("w-4 h-4 flex-shrink-0", location.pathname.includes('settings') ? "text-primary-600" : "text-slate-400")} />
                        {!isCollapsed && <span>Settings</span>}
                    </NavLink>
                    <button
                        onClick={logout}
                        className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-xs font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-all"
                    >
                        <LogOut className="w-4 h-4 flex-shrink-0 text-red-500" />
                        {!isCollapsed && <span>Sign Out</span>}
                    </button>
                </div>
            </div>

            {/* Premium Collapse Trigger */}
            <button
                onClick={toggleSidebar}
                className="absolute -right-3 top-24 bg-white border border-slate-100 w-6 h-6 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all hover:scale-110 z-50 text-slate-300 hover:text-primary-500"
            >
                {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </button>
        </motion.aside>
    );
};

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { Analytics } from '../../types';
import { 
    Briefcase, 
    Activity, 
    CheckCircle, 
    Award, 
    Clock, 
    TrendingUp, 
    FileText,
    ChevronRight,
    Bell
} from 'lucide-react';

import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export const HiringManagerDashboard = () => {
    const [data, setData] = useState<Analytics | null>(null);
    const navigate = useNavigate();

    const fetchData = async () => {
        try {
            const { data } = await api.get('/hm/analytics');
            setData(data);
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);

    if (!data) return (
        <div className="p-8 space-y-6 animate-pulse">
            <div className="h-8 w-64 bg-slate-200 rounded" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-slate-100 rounded-lg" />)}
            </div>
        </div>
    );

    const stats = [
        { title: 'Open Requisitions', value: data.active_roles, icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50', trend: '+2 this week' },
        { title: 'Pending Review', value: (data as any).ready_for_review ?? 0, icon: Activity, color: 'text-primary-600', bg: 'bg-primary-50', trend: 'Ready for HM action' },
        { title: 'In Interview', value: data.candidates_in_interview, icon: CheckCircle, color: 'text-amber-600', bg: 'bg-amber-50', trend: 'Scheduled this week' },
        { title: 'Offers Lifecycle', value: data.offers_extended, icon: Award, color: 'text-emerald-600', bg: 'bg-emerald-50', trend: '1 accepted' },
    ];

    const workflowActions = [
        { label: 'Submit Hire Request', desc: 'Create new role requisition', icon: FileText, color: 'text-blue-500', path: '/hiring-manager/hire-request' },
        { label: 'Schedule Review', desc: 'Manage interviewer availability', icon: Clock, color: 'text-amber-500', path: '/hiring-manager/interviews' },
        { label: 'Pipeline Analytics', desc: 'View conversion metrics', icon: TrendingUp, color: 'text-indigo-500', path: '/hiring-manager/pipeline' }
    ];

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Executive Overview</h1>
                    <p className="text-sm text-slate-500 mt-1 uppercase font-bold tracking-widest leading-none">Hiring Manager Console</p>
                </div>
                <div className="flex items-center gap-3 bg-white p-2 border border-slate-200 rounded-lg shadow-sm">
                    <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center text-slate-500">
                        <Bell className="w-5 h-5" />
                    </div>
                    <div className="pr-4">
                        <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1">Status</p>
                        <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">System Active</p>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, idx) => (
                    <Card key={idx} className="p-6 border border-slate-200 bg-white hover:shadow-lg transition-all group overflow-hidden relative">
                        <div className={`absolute top-0 right-0 w-24 h-24 ${stat.bg} rounded-bl-full -mr-8 -mt-8 opacity-20 group-hover:scale-110 transition-transform`} />
                        <div className={`${stat.bg} w-10 h-10 rounded flex items-center justify-center mb-4 border border-current/10`}>
                            <stat.icon className={`w-5 h-5 ${stat.color}`} />
                        </div>
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.title}</h3>
                        <p className="text-3xl font-bold text-slate-900 mt-1">{stat.value}</p>
                        <div className="mt-4 pt-4 border-t border-slate-50 flex items-center gap-2">
                           <TrendingUp className="w-3 h-3 text-slate-300" />
                           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{stat.trend}</span>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Direct Workflows Cluster */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Recruitment Sprints</h3>
                        <Button variant="ghost" size="sm" className="text-[10px] font-bold uppercase text-primary-600 hover:bg-primary-50" onClick={() => navigate('/hiring-manager/pipeline')}>View All Pipeline</Button>
                    </div>
                    <Card className="p-0 border border-slate-200 bg-white overflow-hidden shadow-sm">
                        <div className="p-8 border-b border-slate-100 flex items-center gap-6">
                           <div className="w-14 h-14 bg-slate-900 rounded-lg flex items-center justify-center text-white text-xl font-bold">HS</div>
                           <div>
                              <h4 className="text-lg font-bold text-slate-900">HireStream Core Initiative</h4>
                              <p className="text-xs text-slate-500 font-medium tracking-tight">Expanding the global engineering footprint across APAC and EMEA regions.</p>
                           </div>
                        </div>
                        <div className="p-4 bg-slate-50 flex items-center justify-between">
                            <div className="flex -space-x-2">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-400">JD</div>
                                ))}
                                <div className="w-8 h-8 rounded-full border-2 border-white bg-primary-600 flex items-center justify-center text-[10px] font-bold text-white">+12</div>
                            </div>
                            <Button className="btn-primary-modern bg-slate-900 h-9 text-[10px] font-bold uppercase" onClick={() => navigate('/hiring-manager/hire-request')}>Launch Sprint</Button>
                        </div>
                    </Card>
                </div>

                <div className="space-y-6">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Internal Workflows</h3>
                    <div className="space-y-3">
                        {workflowActions.map((w, idx) => (
                            <button 
                                key={idx} 
                                onClick={() => navigate(w.path)}
                                className="w-full text-left p-4 border border-slate-200 bg-white rounded-lg hover:border-primary-500 transition-all flex items-center justify-between group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded bg-slate-50 flex items-center justify-center ${w.color}`}>
                                        <w.icon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900">{w.label}</p>
                                        <p className="text-[11px] text-slate-500 font-medium">{w.desc}</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

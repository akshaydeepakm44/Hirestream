import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { 
    Users, 
    Briefcase, 
    Workflow, 
    FileText, 
    Zap,
    AlertCircle
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { motion } from 'framer-motion';
import { 
    ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip,
    BarChart, Bar, Cell
} from 'recharts';
import { Analytics } from '../../types';

export const ResourceManagerDashboard = () => {
    const navigate = useNavigate();
    const [data, setData] = useState<Analytics | null>(null);

    useEffect(() => {
        let isMounted = true;
        
        const fetchAnalytics = async () => {
            try {
                const res = await api.get('/rm/analytics/rm');
                if (isMounted) setData(res.data);
            } catch (error) {
                console.error('Failed to fetch RM analytics', error);
            }
        };

        fetchAnalytics();
        const interval = setInterval(fetchAnalytics, 5000);
        
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, []);

    if (!data) return (
        <div className="p-8 space-y-8 animate-pulse">
            <div className="h-10 w-64 bg-slate-200 rounded" />
            <div className="grid grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-32 bg-slate-200 rounded-2xl" />
                ))}
            </div>
            <div className="h-[400px] bg-slate-200 rounded-2xl" />
        </div>
    );

    const stats = [
        { label: 'Total Sourcing', value: data.total || 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Active Requisitions', value: data.active_requisitions || 0, icon: Briefcase, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'In Pipeline', value: data.candidates_in_pipeline || 0, icon: Workflow, color: 'text-amber-600', bg: 'bg-amber-50' },
        { label: 'Offers Released', value: data.offers_extended || 0, icon: FileText, color: 'text-indigo-600', bg: 'bg-indigo-50' }
    ];

    const chartData = data.pipeline || [];

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-10">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Resource Dashboard</h1>
                    <p className="text-slate-500 font-medium mt-1">Enterprise talent acquisition metrics & infrastructure health.</p>
                </div>
            </div>

            {/* Critical Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((s, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                    >
                        <Card className="p-6 border-slate-100 hover:border-primary-200 transition-all group relative overflow-hidden">
                            <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform ${s.color}`}>
                                <s.icon className="w-16 h-16" />
                            </div>
                            <div className={`${s.bg} ${s.color} w-10 h-10 rounded-xl flex items-center justify-center mb-4 ring-4 ring-white shadow-sm`}>
                                <s.icon className="w-5 h-5" />
                            </div>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{s.label}</h3>
                            <div className="flex items-end gap-2 mt-2">
                                <span className="text-3xl font-black text-slate-900">{s.value}</span>
                            </div>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Pipeline Visualization */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2 p-8 border-slate-100">
                    <div className="flex justify-between items-center mb-10">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 leading-none">Global Pipeline Velocity</h3>
                            <p className="text-xs text-slate-500 mt-2">Performance of candidate flow across identity stages.</p>
                        </div>
                        <Badge variant="info" className="h-6 font-bold">Real-time Analysis</Badge>
                    </div>
                    
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis 
                                    dataKey="name" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} 
                                    dy={10}
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} 
                                />
                                <Tooltip 
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '11px', fontWeight: 600 }}
                                />
                                <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={40}>
                                    {chartData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={index === 1 ? '#2563eb' : index === 3 ? '#10b981' : '#94a3b8'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <div className="space-y-6">
                    <Card className="p-8 bg-slate-900 text-white border-none overflow-hidden relative">
                        <div className="absolute -right-10 -bottom-10 opacity-20 rotate-12">
                            <Zap className="w-40 h-40 text-primary-400" />
                        </div>
                        <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-primary-400 mb-6">System Health</h3>
                        <div className="space-y-6 relative z-10">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-medium text-slate-400">Identity Provisioning</span>
                                <span className="text-xs font-bold text-emerald-400">Operational</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-medium text-slate-400">Communication Relay</span>
                                <span className="text-xs font-bold text-emerald-400">Operational</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-medium text-slate-400">Schedule Engine</span>
                                <span className="text-xs font-bold text-emerald-400">Operational</span>
                            </div>
                            <div className="pt-4 mt-4 border-t border-slate-800">
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
                                    Integration with Google Workspace services is established and secure.
                                </p>
                            </div>
                        </div>
                    </Card>

                    <Card 
                        className="p-8 border-amber-200 bg-amber-50 border-dashed hover:bg-amber-100/50 transition-colors cursor-pointer group"
                        onClick={() => navigate('/resource/dashboard/roles')}
                    >
                        <div className="flex items-center gap-2 mb-6">
                            <AlertCircle className="w-5 h-5 text-amber-600" />
                            <h3 className="text-sm font-bold text-amber-900">Attention Needed</h3>
                        </div>
                        <div 
                            className="bg-white rounded-xl p-4 border border-amber-100 shadow-sm flex items-center justify-between group-hover:border-amber-300 transition-colors"
                        >
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Pending Approvals</p>
                                <p className="text-sm font-bold text-slate-700 group-hover:text-primary-600 transition-colors">New Hire Requests</p>
                            </div>
                            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center shadow-inner">
                                <span className="text-lg font-black text-amber-700">{data.pending_hire_requests_count || 0}</span>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

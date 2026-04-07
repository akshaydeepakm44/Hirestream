import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { 
    Briefcase, 
    Users, 
    Calendar, 
    Clock
} from 'lucide-react';
import { 
    AreaChart, 
    Area, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer,
    BarChart,
    Bar,
    Cell
} from 'recharts';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';

export const HiringManagerAnalytics = () => {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const { data } = await api.get('/hm/analytics');
                setStats(data);
            } catch (error) {
                console.error('Failed to fetch stats', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-10 w-48" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-lg" />)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Skeleton className="h-[400px] w-full rounded-lg" />
                <Skeleton className="h-[400px] w-full rounded-lg" />
            </div>
        </div>
    );

    if (!stats) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <p className="text-slate-500">Failed to load analytics. Please try again later.</p>
        </div>
    );

    const cards = [
        { label: 'Active Requisitions', value: stats.active_roles, icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Total Applicants', value: stats.total_applicants, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { label: 'Pending Review', value: stats.ready_for_review, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
        { label: 'Scheduled Interviews', value: stats.scheduled_interviews, icon: Calendar, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    ];

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Hiring Overview</h1>
                    <p className="text-sm text-slate-500 mt-1">Personnel management and recruitment pipeline analytics.</p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((card, idx) => (
                    <Card key={idx} className="glass-card p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center`}>
                                <card.icon className={`w-5 h-5 ${card.color}`} />
                            </div>
                        </div>
                        <p className="text-sm font-medium text-slate-500">{card.label}</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">{card.value}</p>
                    </Card>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <Card className="lg:col-span-3 p-8 glass-card">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Application Velocity</h3>
                            <p className="text-xs text-slate-500 mt-1">Tracking applicant volume over the last 6 months.</p>
                        </div>
                        <Badge variant="info" className="rounded">Active Cycle</Badge>
                    </div>
                    
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats.velocity}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis 
                                    dataKey="name" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: '#64748b', fontSize: 11 }}
                                    dy={10}
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: '#64748b', fontSize: 11 }} 
                                />
                                <Tooltip 
                                    contentStyle={{ 
                                        borderRadius: '8px', 
                                        border: '1px solid #e2e8f0', 
                                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                    }} 
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="count" 
                                    stroke="#3b82f6" 
                                    strokeWidth={2}
                                    fill="#eff6ff" 
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card className="lg:col-span-2 p-8 glass-card">
                    <div className="mb-8">
                        <h3 className="text-lg font-bold text-slate-900">Pipeline Status</h3>
                        <p className="text-xs text-slate-500 mt-1">Distribution of candidates across stages.</p>
                    </div>

                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.distribution} layout="vertical">
                                <XAxis type="number" hide />
                                <YAxis 
                                    dataKey="name" 
                                    type="category" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: '#475569', fontSize: 12, fontWeight: 600 }}
                                    width={100}
                                />
                                <Tooltip cursor={{ fill: '#f8fafc' }} />
                                <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={24}>
                                    {stats.distribution.map((_: any, index: number) => (
                                        <Cell 
                                            key={`cell-${index}`} 

                                            fill={index % 2 === 0 ? '#3b82f6' : '#6366f1'} 
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>
        </div>
    );
};

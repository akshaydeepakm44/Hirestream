import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { 
    Briefcase, 
    CheckCircle, 
    Clock, 
    FileText,
    Search
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';

export const CandidateDashboard = () => {
    const navigate = useNavigate();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/applications/analytics/candidate')
            .then(res => setData(res.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
            <div className="h-10 w-64 bg-slate-100 rounded animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-lg" />)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Skeleton className="lg:col-span-2 h-[400px] w-full rounded-lg" />
                <Skeleton className="h-[400px] w-full rounded-lg" />
            </div>
        </div>
    );

    const stats = [
        { label: 'Active Applications', value: data?.total || 0, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'In Review', value: data?.screening || 0, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
        { label: 'Interviews', value: data?.interview || 0, icon: Briefcase, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { label: 'Offers', value: data?.offers || 0, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    ];

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
                    <p className="text-sm text-slate-500 mt-1">Overview of your current application status and account activity.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" className="btn-outline-modern" onClick={() => navigate('/candidate/jobs')}>
                        <Search className="w-4 h-4 mr-2" />
                        Browse Jobs
                    </Button>
                    <Button className="btn-primary-modern" onClick={() => navigate('/candidate/applications')}>
                        View My Applications
                    </Button>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, idx) => (
                    <Card key={idx} className="glass-card p-6 flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-lg ${stat.bg} flex items-center justify-center`}>
                            <stat.icon className={`w-6 h-6 ${stat.color}`} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
};

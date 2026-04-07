import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Briefcase, Activity, CheckCircle, XCircle, Award } from 'lucide-react';

export const CandidateHome = () => {
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        api.get('/candidates/analytics/candidate')
            .then(res => setData(res.data))
            .catch(console.error);
    }, []);

    if (!data) return <div className="animate-pulse grid grid-cols-1 md:grid-cols-5 gap-4"><div className="h-32 bg-slate-200 rounded-xl" /></div>;

    const cards = [
        { title: 'Total Applications', value: data.total, icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50' },
        { title: 'In Screening', value: data.screening, icon: Activity, color: 'text-yellow-600', bg: 'bg-yellow-50' },
        { title: 'In Interview', value: data.interview, icon: CheckCircle, color: 'text-purple-600', bg: 'bg-purple-50' },
        { title: 'Rejected', value: data.rejected, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
        { title: 'Offers / Onboarding', value: (data.offers || 0) + (data.onboarding || 0), icon: Award, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    ];

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Welcome to your Career Portal</h1>
            <p className="text-slate-500">Track your application progress and career journey.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mt-8">
                {cards.map((card, idx) => (
                    <div key={idx} className="card hover:shadow-md transition-shadow">
                        <div className={`w-12 h-12 rounded-full ${card.bg} flex items-center justify-center mb-4`}>
                            <card.icon className={`w-6 h-6 ${card.color}`} />
                        </div>
                        <h3 className="text-sm font-medium text-slate-500">{card.title}</h3>
                        <p className="text-3xl font-bold text-slate-900 mt-1">{card.value}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

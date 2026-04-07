import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Briefcase, Users, Calendar, Award } from 'lucide-react';

export const HiringManagerHome = () => {
    const [analytics, setAnalytics] = useState<any>(null);

    useEffect(() => {
        // We'll calculate analytics from several endpoints or a dedicated one if we added it
        // For now, let's assume we can get it from /hm/applications and /hm/requisitions/me
        const fetchAnalytics = async () => {
            try {
                const [reqs, apps, interviews] = await Promise.all([
                    api.get('/hm/requisitions/me'),
                    api.get('/hm/applications'),
                    api.get('/hm/interviews')
                ]);

                setAnalytics({
                    active_roles: reqs.data.filter((r: any) => r.status === 'open').length,
                    candidates_in_interview: apps.data.filter((a: any) => a.status === 'interviewing').length,
                    scheduled_interviews: interviews.data.length,
                    offers_onboarding: apps.data.filter((a: any) => a.status === 'offer_extended' || a.status === 'onboarding').length
                });
            } catch (error) {
                console.error('Failed to fetch analytics', error);
            }
        };

        fetchAnalytics();
    }, []);

    if (!analytics) return <div className="animate-pulse grid grid-cols-1 md:grid-cols-4 gap-4"><div className="h-32 bg-slate-200 rounded-xl" /></div>;

    const cards = [
        { title: 'Active Roles', value: analytics.active_roles, icon: Briefcase, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { title: 'Candidates in Interview', value: analytics.candidates_in_interview, icon: Users, color: 'text-amber-600', bg: 'bg-amber-50' },
        { title: 'Scheduled Interviews', value: analytics.scheduled_interviews, icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-50' },
        { title: 'Offers / Onboarding', value: analytics.offers_onboarding, icon: Award, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    ];

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Hiring Manager Dashboard</h1>
            <p className="text-slate-500">Welcome back! Here's an overview of your hiring activity.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
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

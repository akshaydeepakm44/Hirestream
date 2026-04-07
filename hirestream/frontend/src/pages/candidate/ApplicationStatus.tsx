import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Check, Clock, X, Building, Activity } from 'lucide-react';

const PIPELINE_STAGES = [
    { status: 'sourcing', label: 'Sourcing' },
    { status: 'screening', label: 'Screening' },
    { status: 'assessment', label: 'Assessment' },
    { status: 'ready_for_hm', label: 'Ready for HM' },
    { status: 'interviewing', label: 'Interview' },
    { status: 'onboarding', label: 'Onboarding' },
];

export const ApplicationStatus = () => {
    const [apps, setApps] = useState<any[]>([]);

    useEffect(() => {
        api.get('/candidates/applications/me')
            .then(res => setApps(res.data))
            .catch(console.error);
    }, []);

    const getStageIndex = (status: string) => {
        if (status === 'rejected') return -1;
        if (status === 'offer_extended') return PIPELINE_STAGES.length - 1; // map to onboarding approx or just high index
        return PIPELINE_STAGES.findIndex(s => s.status === status);
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-slate-800 mb-2">My Applications</h1>
                <p className="text-slate-500">Track your progress through the hiring pipeline.</p>
            </div>

            {apps.length === 0 && (
                <div className="card text-center p-12 bg-slate-50 border-dashed border-2">
                    <Building className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-600">No applications yet</h3>
                    <p className="text-slate-400 mt-2">Find a job and start your journey.</p>
                </div>
            )}

            <div className="space-y-6">
                {apps.map((app, idx) => {
                    const currentIndex = getStageIndex(app.status);
                    const isRejected = app.status === 'rejected';

                    return (
                        <div key={idx} className="card p-8 bg-white shadow-sm border border-slate-200">
                            <div className="flex justify-between items-start mb-10">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 mb-1">{app.job_title}</h3>
                                    <div className="flex items-center gap-3 text-sm text-slate-500">
                                        <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> Applied {new Date(app.created_at).toLocaleDateString()}</span>
                                        {app.ats_score && (
                                            <span className="bg-primary-50 text-primary-700 px-2 py-0.5 rounded flex items-center gap-1 font-bold">
                                                <Activity className="w-3 h-3" /> ATS: {app.ats_score}%
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <span className={`px-4 py-1.5 rounded-full text-sm font-semibold border 
                                    ${isRejected ? 'bg-red-50 text-red-700 border-red-200' : 'bg-primary-50 text-primary-700 border-primary-200'}`}>
                                    {isRejected ? 'REJECTED' : app.status.replace(/_/g, ' ').toUpperCase()}
                                </span>
                            </div>

                            {/* Linear Tracker */}
                            <div className="relative mt-8">
                                <div className="absolute top-4 left-0 w-full h-0.5 bg-slate-100 -z-10" />
                                <div className="flex justify-between">
                                    {PIPELINE_STAGES.map((stage, sIdx) => {
                                        const isCompleted = !isRejected && currentIndex >= sIdx;
                                        const isCurrent = !isRejected && currentIndex === sIdx;
                                        
                                        return (
                                            <div key={stage.status} className="flex flex-col items-center">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors
                                                    ${isCompleted ? 'bg-primary-500 border-primary-500 text-white' : 'bg-white border-slate-200 text-slate-300'}
                                                    ${isCurrent ? 'ring-4 ring-primary-100' : ''}`}>
                                                    {isCompleted ? <Check className="w-4 h-4" /> : <div className="w-2 h-2 rounded-full bg-current" />}
                                                </div>
                                                <span className={`text-[10px] sm:text-xs mt-2 font-medium 
                                                    ${isCurrent ? 'text-primary-600 font-bold' : isCompleted ? 'text-slate-600' : 'text-slate-400'}`}>
                                                    {stage.label}
                                                </span>
                                            </div>
                                        );
                                    })}
                                    {isRejected && (
                                        <div className="flex flex-col items-center">
                                            <div className="w-8 h-8 rounded-full bg-red-500 border-red-500 text-white flex items-center justify-center border-2">
                                                <X className="w-4 h-4" />
                                            </div>
                                            <span className="text-xs mt-2 font-bold text-red-600">REJECTED</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

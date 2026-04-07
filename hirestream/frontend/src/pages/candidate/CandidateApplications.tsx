import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../../api/client';
import { 
    Check, 
    Building2, 
    Calendar, 
    FileText,
    Clock,
    AlertCircle,
    ArrowRight,
    X
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { cn } from '../../utils/cn';

const PIPELINE_STAGES: { status: string; label: string }[] = [
    { status: 'sourcing', label: 'Applied' },
    { status: 'screening', label: 'Review' },
    { status: 'assessment', label: 'Technical' },
    { status: 'ready_for_hm', label: 'Manager' },
    { status: 'interviewing', label: 'Interview' },
    { status: 'onboarding', label: 'Hired' },
];

export const CandidateApplications = () => {
    const [apps, setApps] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const location = useLocation();
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        if (location.state?.applied) {
            setShowSuccess(true);
            // Clear location state to prevent message showing again on refresh
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    useEffect(() => {
        api.get('/candidates/applications/me')
            .then(res => setApps(res.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const getStageIndex = (status: string) => {
        if (status === 'rejected') return -1;
        if (status === 'offer_extended' || status === 'onboarding') return PIPELINE_STAGES.length - 1;
        if (status === 'internal_shortlist') return 1;
        const idx = PIPELINE_STAGES.findIndex(s => s.status === status);
        return idx !== -1 ? idx : 0;
    };

    if (loading) return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
            <Skeleton className="h-10 w-64" />
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-64 w-full rounded-lg" />)}
        </div>
    );

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">My Applications</h1>
                    <p className="text-sm text-slate-500 mt-1">Track the progress of your active and past job applications.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" className="btn-outline-modern" onClick={() => (window.location.href='/candidate/jobs')}>
                        Browse Jobs
                    </Button>
                </div>
            </div>

            {showSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-200">
                            <Check className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-emerald-900 leading-tight">Application Submitted Successfully!</h3>
                            <p className="text-sm text-emerald-600 mt-1 font-medium">Your application for the role has been received. You can track its progress below.</p>
                        </div>
                    </div>
                    <button onClick={() => setShowSuccess(false)} className="text-emerald-400 hover:text-emerald-600 p-2">
                        <X className="w-5 h-5" />
                    </button>
                </div>
            )}

            {apps.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-center border-2 border-dashed border-slate-200 rounded-lg bg-slate-50">
                    <div className="w-16 h-16 bg-white rounded-full border border-slate-200 flex items-center justify-center text-slate-300 mb-6 shadow-sm">
                        <FileText className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">No active applications</h3>
                    <p className="text-sm text-slate-500 max-w-sm mx-auto mt-2">You haven't applied to any roles yet. Start your journey by exploring our open requisitions.</p>
                    <Button className="mt-8 btn-primary-modern px-8" onClick={() => (window.location.href='/candidate/jobs')}>
                        Browse Jobs
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {apps.map((app) => {
                        const currentIndex = getStageIndex(app.status);
                        const isRejected = app.status === 'rejected';

                        return (
                            <Card key={app.id} className="glass-card p-0 overflow-hidden group border-slate-200 hover:border-primary-500 transition-colors">
                                <div className="p-8 md:p-10 flex flex-col md:flex-row gap-8">
                                    {/* App Info */}
                                    <div className="md:w-1/3 space-y-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors">
                                                <Building2 className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-slate-900 group-hover:text-primary-600 transition-colors leading-tight">{app.job_title}</h3>
                                                <Badge variant="default" className="mt-2 rounded py-0 capitalize text-[10px]">{app.department || 'General'}</Badge>
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Applied</p>
                                                <div className="flex items-center gap-1.5 mt-1 text-sm font-medium text-slate-700">
                                                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                    {new Date(app.applied_at).toLocaleDateString()}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ATS Score</p>
                                                <div className="flex items-center gap-1.5 mt-1 text-sm font-medium text-slate-700">
                                                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                    {app.ats_score ? `${app.ats_score}%` : 'Pending'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Pipeline */}
                                    <div className="flex-1">
                                        <div className="flex justify-between items-center mb-8">
                                            <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">Application Progress</p>
                                            <Badge variant={isRejected ? 'danger' : 'success'} className="rounded py-1 px-3 capitalize">
                                                {isRejected ? 'Rejected' : app.status.replace(/_/g, ' ')}
                                            </Badge>
                                        </div>

                                        {isRejected ? (
                                            <div className="bg-red-50 border border-red-100 rounded-lg p-6 flex items-center gap-4">
                                                <AlertCircle className="w-5 h-5 text-red-500" />
                                                <p className="text-sm font-medium text-red-800">Your application was not selected to move forward at this time.</p>
                                            </div>
                                        ) : (
                                            <div className="relative pt-6 px-2">
                                                <div className="absolute top-[42px] left-0 w-full h-1 bg-slate-100" />
                                                <div 
                                                    className="absolute top-[42px] left-0 h-1 bg-primary-600 transition-all duration-1000" 
                                                    style={{ width: `${(Math.max(0, currentIndex) / (PIPELINE_STAGES.length - 1)) * 100}%` }}
                                                />
                                                <div className="flex justify-between relative z-10">
                                                    {PIPELINE_STAGES.map((stage, sIdx) => {
                                                        const isCompleted = currentIndex >= sIdx;
                                                        const isCurrent = currentIndex === sIdx;
                                                        return (
                                                            <div key={stage.status} className="flex flex-col items-center">
                                                                <div className={cn(
                                                                    "w-8 h-8 rounded-full flex items-center justify-center transition-all border-2",
                                                                    isCompleted ? "bg-primary-600 border-primary-600 text-white" : "bg-white border-slate-200 text-slate-300"
                                                                )}>
                                                                    {isCompleted ? <Check className="w-4 h-4" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />}
                                                                </div>
                                                                <span className={cn(
                                                                    "text-[10px] mt-3 font-bold uppercase tracking-tight",
                                                                    isCurrent ? "text-primary-600" : isCompleted ? "text-slate-900" : "text-slate-400"
                                                                )}>{stage.label}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-slate-50 px-8 py-4 border-t border-slate-100 flex items-center justify-between">
                                    <p className="text-xs text-slate-500 font-medium italic">Application ID: #{app.id} • Last updated {app.updated_at ? new Date(app.updated_at).toLocaleDateString() : 'N/A'}</p>
                                    <Button variant="ghost" size="sm" className="text-primary-600 text-xs font-bold hover:bg-white border border-transparent hover:border-slate-200" onClick={() => window.location.href='/candidate/jobs'}>
                                        View Requisition Details <ArrowRight className="w-3.5 h-3.5 ml-1" />
                                    </Button>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

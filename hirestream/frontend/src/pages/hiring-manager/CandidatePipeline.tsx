import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import { Application, Requisition } from '../../types';
import {
    ExternalLink,
    X,
    Mail,
    Calendar as CalendarIcon,
    Briefcase,

    Send,
    XCircle,
    Star,
    History,
    User,
    MessageSquare,
    ClipboardCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { cn } from '../../utils/cn';
import { useAuth } from '../../context/AuthContext';
import { EmailComposerModal } from '../../components/EmailComposerModal';
import { MeetingSchedulerModal } from '../../components/MeetingSchedulerModal';

export const CandidatePipeline = () => {
    const [apps, setApps] = useState<Application[]>([]);
    const [roles, setRoles] = useState<Requisition[]>([]);
    const [selectedRole, setSelectedRole] = useState<number | null>(null);
    const [viewingProfile, setViewingProfile] = useState<Application | null>(null);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
    const [onboardingConfirm, setOnboardingConfirm] = useState<{ appId: number, name: string, role: string } | null>(null);
    const [searchParams] = useSearchParams();
    const { user } = useAuth();

    const fetchData = async () => {
        try {
            const [rRes, aRes] = await Promise.all([
                api.get('/hm/requisitions/me'),
                api.get('/hm/applications')
            ]);
            setRoles(rRes.data);
            setApps(aRes.data);

            if (viewingProfile) {
                const refreshedApp = aRes.data.find((a: Application) => a.id === viewingProfile.id);
                if (refreshedApp) setViewingProfile(refreshedApp);
            }
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        const roleId = searchParams.get('role');
        if (roleId) setSelectedRole(parseInt(roleId));
        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, [searchParams]);

    const filteredApps = apps.filter(a => {
        if (selectedRole && Number(a.requisition_id) !== Number(selectedRole)) return false;
        const currentStatus = (a.status || '').toLowerCase();
        const allowed = [
            'sourcing', 'screening', 'internal_shortlist', 'assessment',
            'ready_for_hm', 'interviewing', 'offer_extended', 'onboarding', 'rejected'
        ];
        return allowed.includes(currentStatus);
    });

    const getAppsByStatus = (status: string) =>
        filteredApps.filter(a => (a.status || '').toLowerCase() === status.toLowerCase());

    const handleUpdateStatus = async (appId: number, status: string) => {
        const previousApps = [...apps];
        setApps(prev => prev.map(a => a.id === appId ? { ...a, status: status as any } : a));
        try {
            await api.patch(`/hm/applications/${appId}/status`, { status });
            fetchData();
        } catch (e: any) {
            setApps(previousApps);
            alert(`Failed to update status: ${e.response?.data?.detail || e.message}`);
        }
    };

    const handleDragStart = (e: React.DragEvent, appId: number) => {
        e.dataTransfer.setData('appId', appId.toString());
    };

    const handleDrop = async (e: React.DragEvent, status: string) => {
        e.preventDefault();
        const appId = parseInt(e.dataTransfer.getData('appId'));
        if (!appId) return;

        if (status === 'onboarding') {
            const app = apps.find(a => a.id === appId);
            if (app) {
                setOnboardingConfirm({
                    appId,
                    name: app.candidate_name || 'Candidate',
                    role: app.requisition_title || 'Role'
                });
                return;
            }
        }

        handleUpdateStatus(appId, status);
    };

    const renderCandidateCard = (app: Application) => {
        const latestReview = (app.interviews || []).filter(i => i.rating !== null).sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime())[0];

        return (
            <div
                key={app.id}
                draggable
                onDragStart={(e) => handleDragStart(e, app.id)}
                className="bg-white border border-slate-200 rounded-lg p-4 mb-3 shadow-sm hover:border-primary-500 cursor-grab active:cursor-grabbing transition-colors group"
            >
                <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-slate-100 rounded flex items-center justify-center text-slate-500 font-bold text-xs shadow-sm">
                            {app.candidate_name?.charAt(0)}
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-slate-900 leading-tight truncate max-w-[120px]">{app.candidate_name}</h4>
                            <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-tight">{app.requisition_title}</p>
                        </div>
                    </div>
                    {latestReview && (
                        <div className="flex items-center gap-0.5 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                            <Star className="w-2 h-2 fill-amber-500 text-amber-500" />
                            <span className="text-[9px] font-black text-amber-700">{latestReview.rating}</span>
                        </div>
                    )}
                </div>

                {latestReview && (
                    <div className="mb-4 bg-slate-50/80 border border-slate-100 rounded-lg p-2.5">
                        <p className="text-[10px] text-slate-600 font-medium italic line-clamp-2 leading-relaxed">
                            "{latestReview.feedback}"
                        </p>
                    </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400">Match: {app.ats_score || 0}%</span>
                    <button
                        onClick={() => setViewingProfile(app)}
                        className="p-1 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-all"
                    >
                        <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        );
    };

    const COLUMNS = [
        { id: 'ready_for_hm', label: 'New Applicants', color: 'bg-primary-600' },
        { id: 'interviewing', label: 'Interviewing', color: 'bg-amber-600' },
        { id: 'offer_extended', label: 'Offer Stage', color: 'bg-emerald-600' },
        { id: 'onboarding', label: 'Hired / Onboarded', color: 'bg-indigo-600' },
        { id: 'rejected', label: 'Archive / Rejected', color: 'bg-red-600' }
    ];

    return (
        <div className="p-8 max-w-[1600px] mx-auto h-[calc(100vh-140px)] flex flex-col space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 leading-none">Candidate Pipeline</h1>
                    <p className="text-sm text-slate-500 mt-2">Oversee recruitment progression and review stakeholder evaluations.</p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        className="bg-white border border-slate-300 rounded-md px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500"
                        value={selectedRole || ''}
                        onChange={e => setSelectedRole(e.target.value ? parseInt(e.target.value) : null)}
                    >
                        <option value="">All My Requisitions</option>
                        {roles.map(r => (
                            <option key={r.id} value={r.id}>{r.title}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="flex-1 flex gap-6 overflow-x-auto pb-6 custom-scrollbar">
                {COLUMNS.map(col => (
                    <div
                        key={col.id}
                        onDragOver={e => e.preventDefault()}
                        onDrop={e => handleDrop(e, col.id)}
                        className="flex flex-col w-72 shrink-0 bg-slate-50 border border-slate-200 rounded-2xl shadow-sm"
                    >
                        <div className="p-4 border-b border-slate-200 bg-white rounded-t-2xl flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className={cn("w-2 h-2 rounded-full", col.color)} />
                                <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{col.label}</h3>
                            </div>
                            <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
                                {getAppsByStatus(col.id).length}
                            </span>
                        </div>
                        <div className="flex-1 p-3 overflow-y-auto custom-scrollbar">
                            {getAppsByStatus(col.id).map(renderCandidateCard)}
                            {getAppsByStatus(col.id).length === 0 && (
                                <div className="h-24 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Empty</p>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <AnimatePresence>
                {viewingProfile && (
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex border border-slate-200"
                        >
                            <div className="w-72 bg-slate-50 border-r border-slate-200 p-8 flex flex-col shrink-0">
                                <Button variant="ghost" onClick={() => setViewingProfile(null)} className="mb-6 -ml-2 p-2 hover:bg-slate-200 rounded-full w-fit">
                                    <X className="w-5 h-5" />
                                </Button>

                                <div className="text-center mb-8">
                                    <div className="w-16 h-16 bg-primary-600 rounded-2xl mx-auto flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-primary-500/20">
                                        {viewingProfile.candidate_name?.charAt(0)}
                                    </div>
                                    <h2 className="text-xl font-bold text-slate-900 mt-4 leading-tight">{viewingProfile.candidate_name}</h2>
                                    <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-widest">Candidate #{viewingProfile.id}</p>
                                </div>

                                <div className="space-y-4 pt-6 border-t border-slate-200 overflow-y-auto custom-scrollbar">
                                    <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Requisition</p>
                                        <p className="text-sm font-bold text-slate-700">{viewingProfile.requisition_title}</p>
                                    </div>
                                    <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Contact Details</p>
                                        <div className="space-y-2">
                                            <Button variant="ghost" className="w-full justify-start h-8 px-0 text-xs font-bold text-slate-600 hover:text-primary-600">
                                                <Mail className="w-3.5 h-3.5 mr-2" /> {viewingProfile.candidate_email || 'N/A'}
                                            </Button>
                                            <Button
                                                onClick={() => setIsEmailModalOpen(true)}
                                                className="w-full btn-primary-modern h-9 text-[10px] font-black uppercase tracking-widest rounded-lg"
                                            >
                                                <Send className="w-3.5 h-3.5 mr-2" /> Send Email
                                            </Button>
                                            <Button
                                                onClick={() => setIsMeetingModalOpen(true)}
                                                variant="outline"
                                                className="w-full btn-outline-modern h-9 text-[10px] font-black uppercase tracking-widest border-slate-200 rounded-lg"
                                            >
                                                <CalendarIcon className="w-3.5 h-3.5 mr-2" /> Schedule Meeting
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-auto pt-4 border-t border-slate-200 space-y-2">

                                    <Button
                                        onClick={() => { handleUpdateStatus(viewingProfile.id, 'rejected'); setViewingProfile(null); }}
                                        variant="outline"
                                        className="w-full h-9 text-[10px] font-black uppercase tracking-widest border-red-100 text-red-500 hover:bg-red-50 rounded-lg"
                                    >
                                        <XCircle className="w-3.5 h-3.5 mr-2" /> Archive
                                    </Button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-12 custom-scrollbar space-y-10 bg-white">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-[10px] font-bold text-primary-600 uppercase tracking-widest mb-1">HM Pipeline View</h3>
                                        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Technical Assessment</h2>
                                    </div>
                                </div>

                                {/* Step 9: RM Initial Screening Result */}
                                {(viewingProfile.rm_rating || viewingProfile.rm_feedback) && (
                                    <section className="space-y-6">
                                        <div className="flex items-center gap-2 text-slate-900 border-b border-slate-100 pb-2">
                                            <ClipboardCheck className="w-5 h-5 text-emerald-600" />
                                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em]">Resource Manager Recommendation</h4>
                                        </div>
                                        <div className="bg-emerald-50/30 border border-emerald-100 rounded-2xl p-6 relative overflow-hidden group hover:border-emerald-500/30 transition-all shadow-sm">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-emerald-100 flex items-center justify-center text-emerald-600 font-bold">
                                                        RM
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-black text-slate-900 uppercase tracking-tight">Initial Screening Result</p>
                                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Shortlisted for HM Step</p>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <div className="flex gap-1 mb-1">
                                                        {[...Array(5)].map((_, idx) => (
                                                            <Star key={idx} className={cn("w-4 h-4", idx < (viewingProfile.rm_rating || 0) ? "fill-amber-400 text-amber-400" : "text-slate-200")} />
                                                        ))}
                                                    </div>
                                                    <p className="text-[10px] font-black text-slate-900 uppercase">RM Rating: {viewingProfile.rm_rating || 'N/A'}/5</p>
                                                </div>
                                            </div>

                                            <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm relative">
                                                <MessageSquare className="absolute top-4 right-4 w-4 h-4 text-emerald-100/50" />
                                                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-2">Final RM Feedback:</p>
                                                <p className="text-sm text-slate-700 font-medium leading-relaxed italic">
                                                    "{viewingProfile.rm_feedback || 'No detailed feedback provided by Resource Manager.'}"
                                                </p>
                                            </div>
                                        </div>
                                    </section>
                                )}

                                {/* Step 10: Stakeholder Evaluations (HM Only) */}
                                {viewingProfile.interviews && viewingProfile.interviews.some((i: any) => i.rating || i.status === 'completed') && (
                                    <section className="space-y-6">
                                        <div className="flex items-center gap-2 text-slate-900 border-b border-slate-100 pb-2">
                                            <History className="w-5 h-5 text-primary-600" />
                                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em]">Hiring Manager Evaluations</h4>
                                        </div>
                                        <div className="grid grid-cols-1 gap-4">
                                            {viewingProfile.interviews.filter((i: any) => i.rating || i.status === 'completed').sort((a: any, b: any) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime()).map((review: any, rIdx: number) => (
                                                <div key={rIdx} className="bg-slate-50 border border-slate-200 rounded-2xl p-6 relative overflow-hidden group hover:border-primary-500/30 transition-all shadow-sm">
                                                    <div className="flex items-start justify-between mb-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-primary-600 font-bold">
                                                                #{viewingProfile.interviews?.length ? viewingProfile.interviews.length - rIdx : 1}
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-black text-slate-900 uppercase">Assessment Round</p>
                                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">{new Date(review.scheduled_at).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col items-end">
                                                            <div className="flex gap-1 mb-1">
                                                                {[...Array(5)].map((_, idx) => (
                                                                    <Star key={idx} className={cn("w-4 h-4", idx < (review.rating || 0) ? "fill-amber-400 text-amber-400" : "text-slate-200")} />
                                                                ))}
                                                            </div>
                                                            <p className="text-[10px] font-black text-slate-900 uppercase">Evaluation: {review.rating}/5 Score</p>
                                                        </div>
                                                    </div>

                                                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative">
                                                        <MessageSquare className="absolute top-4 right-4 w-4 h-4 text-slate-100" />
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <div className="w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center">
                                                                <User className="w-3 h-3 text-slate-400" />
                                                            </div>
                                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                                                Evaluated by: {review.scheduled_by === user?.id ? "Me" : "Resource Manager (RM)"}
                                                            </p>
                                                        </div>
                                                        <p className="text-sm text-slate-700 font-medium leading-relaxed italic">
                                                            "{review.feedback || 'Round completed. Stakeholder feedback pending.'}"
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                )}

                                <div className="grid grid-cols-2 gap-6">
                                    <Card className="p-6 border border-slate-200 bg-white shadow-sm flex flex-col justify-center">
                                        <div className="flex justify-between items-center mb-4">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">AI Profile Alignment</p>
                                            <Badge variant={(viewingProfile.ats_score || 0) >= 70 ? 'success' : 'info'}>
                                                {viewingProfile.ats_score || 0}%
                                            </Badge>
                                        </div>
                                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                            <div className="bg-primary-600 h-full transition-all duration-700 ease-out" style={{ width: `${viewingProfile.ats_score || 0}%` }} />
                                        </div>
                                    </Card>
                                    <Card className="p-6 border border-slate-200 bg-white flex items-center gap-4 shadow-sm">
                                        <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center shadow-inner">
                                            <Briefcase className="w-6 h-6 text-primary-600" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tenure</p>
                                            <p className="text-2xl font-bold text-slate-900">{viewingProfile.candidate_experience || 0} <span className="text-sm font-medium text-slate-400 uppercase ml-1">Years</span></p>
                                        </div>
                                    </Card>
                                </div>


                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {onboardingConfirm && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-[200]">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200"
                        >
                            <div className="p-8 text-center">
                                <div className="w-20 h-20 bg-indigo-50 rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-sm border border-indigo-100">
                                    <User className="w-10 h-10 text-indigo-600" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2">Initialize Onboarding?</h3>
                                <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                                    Are you sure you want to send this candidate to the Administration Team for the onboarding process?
                                </p>

                                <div className="bg-slate-50 rounded-2xl p-5 mb-8 border border-slate-100/50">
                                    <div className="flex flex-col gap-2">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="font-bold text-slate-400 uppercase tracking-widest">Candidate</span>
                                            <span className="font-black text-slate-900">{onboardingConfirm.name}</span>
                                        </div>
                                        <div className="h-px bg-slate-200/50 w-full" />
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="font-bold text-slate-400 uppercase tracking-widest">Job Role</span>
                                            <span className="font-black text-slate-900">{onboardingConfirm.role}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <Button
                                        variant="outline"
                                        onClick={() => setOnboardingConfirm(null)}
                                        className="h-12 text-xs font-black uppercase tracking-widest border-slate-200 rounded-xl hover:bg-slate-50"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            handleUpdateStatus(onboardingConfirm.appId, 'onboarding');
                                            setOnboardingConfirm(null);
                                        }}
                                        className="h-12 text-xs font-black uppercase tracking-widest bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-500/20"
                                    >
                                        Send to Admin
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {viewingProfile && (
                <>
                    <EmailComposerModal
                        isOpen={isEmailModalOpen}
                        onClose={() => setIsEmailModalOpen(false)}
                        candidateEmail={viewingProfile.candidate_email || ''}
                        candidateName={viewingProfile.candidate_name || ''}
                        currentUserEmail={user?.email || ''}
                    />
                    <MeetingSchedulerModal
                        isOpen={isMeetingModalOpen}
                        onClose={() => setIsMeetingModalOpen(false)}
                        applicationId={viewingProfile.id}
                        candidateName={viewingProfile.candidate_name || ''}
                        candidateEmail={viewingProfile.candidate_email || ''}
                        onSuccess={fetchData}
                    />
                </>
            )}
        </div>
    );
};

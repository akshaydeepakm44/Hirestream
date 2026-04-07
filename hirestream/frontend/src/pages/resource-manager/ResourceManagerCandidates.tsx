import { useEffect, useState, useMemo } from 'react';
import { api, API_URL } from '../../api/client';
import { Application, Requisition } from '../../types';
import { 
    Activity, 
    Zap, 
    Download,
    Mail,
    ExternalLink,
    Clock,
    X,
    Send,
    Target,
    Briefcase,
    GraduationCap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { cn } from '../../utils/cn';
import { useAuth } from '../../context/AuthContext';
import { EmailComposerModal } from '../../components/EmailComposerModal';
import { MeetingSchedulerModal } from '../../components/MeetingSchedulerModal';
import { Trash2, Calendar as CalendarIcon, Star, ClipboardCheck, MessageSquare, User, History } from 'lucide-react';
import { ReviewModal } from '../../components/ReviewModal';
import { SendAssessmentModal } from '../../components/SendAssessmentModal';
import { RejectModal } from '../../components/RejectModal';
import { UserMinus } from 'lucide-react';

export const ResourceManagerCandidates = () => {
    const [apps, setApps] = useState<Application[]>([]);
    const [roles, setRoles] = useState<Requisition[]>([]);
    const [selectedRole, setSelectedRole] = useState<number | null>(null);

    const [viewingProfile, setViewingProfile] = useState<Application | null>(null);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
    const [reviewModal, setReviewModal] = useState({ isOpen: false, interviewId: 0, candidateName: '' });
    const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false);
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [rejectCandidateApp, setRejectCandidateApp] = useState<Application | null>(null);
    const { user } = useAuth();
    const now = new Date();

    const fetchData = async () => {
        try {
            const [rRes, aRes] = await Promise.all([
                api.get('/rm/requisitions'),
                api.get('/rm/applications')
            ]);
            setRoles(rRes.data);
            setApps(aRes.data);
            
            // If viewing profile, update it too
            if (viewingProfile) {
                const refreshedApp = aRes.data.find((a: Application) => a.id === viewingProfile.id);
                if (refreshedApp) setViewingProfile(refreshedApp);
            }
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        let isMounted = true;
        
        const fetchAndMount = async () => {
            try {
                const [rRes, aRes] = await Promise.all([
                    api.get('/rm/requisitions'),
                    api.get('/rm/applications')
                ]);
                if (isMounted) {
                    setRoles(rRes.data);
                    setApps(aRes.data);
                }
            } catch (e) {
                console.error(e);
            }
        };

        fetchAndMount();
        
        // Auto-refresh the pipeline every 5 seconds to show new candidates instantly
        const interval = setInterval(() => {
            fetchAndMount();
        }, 5000);

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, []);

    const filteredApps = useMemo(() => {
        return apps.filter(a => {
            // Robust numeric comparison for requisition filters
            if (selectedRole && Number(a.requisition_id) !== Number(selectedRole)) return false;
            
            // Normalizing status to ensure case-insensitive matching in columns
            const currentStatus = (a.status || '').toLowerCase();
            
            const allowed = [
                'sourcing', 'screening', 'internal_shortlist', 'assessment', 
                'ready_for_hm', 'rejected'
            ];
            return allowed.includes(currentStatus);
        });
    }, [apps, selectedRole]);

    const getAppsByStatus = (status: string) => filteredApps.filter(a => (a.status || '').toLowerCase() === status.toLowerCase());

    const handleUpdateStatus = async (appId: number, status: string) => {
        try {
            await api.patch(`/rm/applications/${appId}/status`, { status });
            fetchData();
        } catch (e) {
            console.error(e);
        }
    };

    const handleCancelInterview = async (interviewId: number) => {
        if (!confirm('Are you sure you want to cancel this interview?')) return;
        try {
            await api.delete(`/interviews/${interviewId}`);
            if (viewingProfile?.interviews) {
                setViewingProfile({
                    ...viewingProfile,
                    interviews: viewingProfile.interviews.filter(i => i.id !== interviewId)
                });
            }
            fetchData();
        } catch (e) {
            console.error(e);
        }
    };

    const handleDragStart = (e: React.DragEvent, appId: number) => {
        e.dataTransfer.setData('appId', appId.toString());
    };

    const handleDrop = async (e: React.DragEvent, status: string) => {
        e.preventDefault();
        const appId = parseInt(e.dataTransfer.getData('appId'));
        if (!appId) return;
        handleUpdateStatus(appId, status);
    };

    const renderCandidateCard = (app: Application) => {
        // Find latest completed/reviewed interview
        const reviews = (app.interviews || []).filter(i => i.status === 'completed' && i.rating);
        const latestReview = reviews.length > 0 ? reviews.sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime())[0] : null;

        // Check if any interview is ready for review (ended but not reviewed)
        const readyForReview = (app.interviews || []).find(i => {
           const endTime = new Date(i.end_time || (new Date(i.scheduled_at).getTime() + (i.duration_minutes || 30) * 60000));
           return now.getTime() >= endTime.getTime() && i.status !== 'completed' && !i.rating && i.status !== 'cancelled';
        });

        const isRejected = app.status === 'rejected';

        return (
            <div
                key={app.id}
                draggable={!isRejected}
                onDragStart={(e) => { if (!isRejected) handleDragStart(e, app.id); }}
                className={cn(
                    "bg-white border rounded-lg p-4 mb-3 shadow-sm transition-colors group relative",
                    isRejected ? "border-red-200 opacity-80" : "border-slate-200 hover:border-primary-500 cursor-grab active:cursor-grabbing"
                )}
            >

                <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-slate-100 rounded flex items-center justify-center text-slate-500 font-bold text-xs">
                            {app.candidate_name?.charAt(0)}
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-slate-900 leading-tight truncate max-w-[120px]">{app.candidate_name}</h4>
                            <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-tight">{app.requisition_title}</p>
                        </div>
                    </div>
                    {readyForReview ? (
                         <Badge variant="warning" className="text-[8px] font-black uppercase tracking-widest bg-amber-50 text-amber-600 border-amber-100">
                             Evaluation Required
                         </Badge>
                    ) : app.assessments && app.assessments.some(a => a.status === 'submitted') ? (
                        <Badge variant="success" className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border-emerald-100 font-bold uppercase tracking-tight">
                            Assessment Submitted
                        </Badge>
                    ) : (
                        <Badge variant={ isRejected ? 'danger' : ((app.ats_score || 0) >= 70 ? 'success' : 'info') } className="text-[10px] px-1.5 py-0.5 rounded">
                            {isRejected ? 'Rejected' : `${app.ats_score || 0}% Match`}
                        </Badge>
                    )}
                </div>

                {latestReview && (
                    <div className="mb-3 p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="flex items-center gap-1.5 mb-1">
                            <div className="flex gap-0.5">
                                {[...Array(5)].map((_, idx) => (
                                    <Star 
                                        key={idx} 
                                        className={cn("w-2.5 h-2.5", idx < (latestReview.rating || 0) ? "fill-amber-400 text-amber-400" : "text-slate-200")} 
                                    />
                                ))}
                            </div>
                            <span className="text-[10px] font-black text-slate-900">{latestReview.rating}/5</span>
                        </div>
                        <p className="text-[10px] text-slate-500 line-clamp-1 italic font-medium leading-relaxed">
                            "{latestReview.feedback}"
                        </p>
                    </div>
                )}

                {!isRejected && (
                    <>
                        {app.status === 'assessment' && (!app.assessments || app.assessments.length === 0) ? (
                            <Button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setViewingProfile(app);
                                    setIsAssessmentModalOpen(true);
                                }}
                                className="w-full mb-3 h-8 text-[9px] font-black uppercase bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 flex items-center justify-center gap-1.5 rounded-md"
                            >
                                <ClipboardCheck className="w-3 h-3" /> Send Assessment
                            </Button>
                        ) : readyForReview ? (
                            <Button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setReviewModal({ isOpen: true, interviewId: readyForReview.id, candidateName: app.candidate_name || '' });
                                }}
                                className="w-full mb-3 h-8 text-[9px] font-black uppercase bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-200 flex items-center justify-center gap-1.5 rounded-md"
                            >
                                <ClipboardCheck className="w-3 h-3" /> Ready for Review
                            </Button>
                        ) : null}
                    </>
                )}

                {isRejected && (
                    <div className="w-full mb-3 h-8 text-[10px] uppercase font-black tracking-widest bg-red-50 text-red-500 rounded-md flex items-center justify-center border border-red-100">
                        Application Rejected
                    </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                       <Clock className="w-3 h-3 text-slate-400" />
                       <span className="text-[10px] font-bold text-slate-400">Applied {new Date(app.applied_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        {!isRejected && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setRejectCandidateApp(app);
                                    setIsRejectModalOpen(true);
                                }}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                            >
                                <UserMinus className="w-3.5 h-3.5" />
                            </button>
                        )}
                        <button 
                            onClick={() => setViewingProfile(app)} 
                            className="p-1 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const COLUMNS = [
        { id: 'sourcing', label: 'Applied', color: 'bg-slate-500' },
        { id: 'screening', label: 'Initial Screening', color: 'bg-blue-600' },
        { id: 'internal_shortlist', label: 'Shortlisted', color: 'bg-violet-600' },
        { id: 'assessment', label: 'Technical Interview', color: 'bg-indigo-600' },
        { id: 'ready_for_hm', label: 'Sent to Manager', color: 'bg-emerald-600' },
        { id: 'rejected', label: 'Rejected', color: 'bg-red-600' }
    ];

    return (
        <div className="p-8 max-w-[1600px] mx-auto h-[calc(100vh-140px)] flex flex-col space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Applicant Pipeline</h1>
                    <p className="text-sm text-slate-500 mt-1">Manage and track candidates through the initial recruitment lifecycle.</p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        className="bg-white border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500"
                        value={selectedRole || ''}
                        onChange={e => setSelectedRole(e.target.value ? parseInt(e.target.value) : null)}
                    >
                        <option value="">All Requisitions</option>
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
                        className="flex flex-col w-72 shrink-0 bg-slate-50 border border-slate-200 rounded-lg"
                    >
                        <div className="p-4 border-b border-slate-200 bg-white rounded-t-lg flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className={cn("w-2 h-2 rounded-full", col.color)} />
                                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">{col.label}</h3>
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                {getAppsByStatus(col.id).length}
                            </span>
                        </div>

                        <div className="flex-1 p-3 overflow-y-auto custom-scrollbar">
                            {getAppsByStatus(col.id).map(renderCandidateCard)}
                            {getAppsByStatus(col.id).length === 0 && (
                                <div className="h-24 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-lg">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">No candidates</p>
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
                            className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex border border-slate-200"
                        >
                            <div className="w-72 bg-slate-50 border-r border-slate-200 p-8 flex flex-col">
                                <Button variant="ghost" onClick={() => setViewingProfile(null)} className="mb-6 -ml-2 p-2 hover:bg-slate-200 rounded-full w-fit">
                                    <X className="w-5 h-5" />
                                </Button>
                                <div className="text-center mb-8">
                                    <div className="w-16 h-16 bg-slate-900 rounded mx-auto flex items-center justify-center text-white text-2xl font-bold">
                                        {viewingProfile.candidate_name?.charAt(0)}
                                    </div>
                                    <h2 className="text-xl font-bold text-slate-900 mt-4 leading-tight">{viewingProfile.candidate_name}</h2>
                                    <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-widest">Candidate #{viewingProfile.id}</p>
                                </div>

                                <div className="space-y-4 pt-6 border-t border-slate-200 overflow-y-auto custom-scrollbar max-h-[400px]">
                                    <div className="p-4 bg-white rounded border border-slate-200 shadow-sm">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Requisition</p>
                                        <p className="text-sm font-bold text-slate-700">{viewingProfile.requisition_title}</p>
                                    </div>
                                    <div className="p-4 bg-white rounded border border-slate-200 shadow-sm">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Contact Details</p>
                                        <div className="space-y-2">
                                            <Button variant="ghost" className="w-full justify-start h-8 px-0 text-xs font-bold text-slate-600 hover:text-primary-600">
                                                <Mail className="w-3.5 h-3.5 mr-2" /> {viewingProfile.candidate_email}
                                            </Button>
                                            <Button 
                                                onClick={() => setIsEmailModalOpen(true)}
                                                className="w-full btn-primary-modern h-9 text-[10px] font-black uppercase tracking-widest"
                                            >
                                                <Send className="w-3.5 h-3.5 mr-2" /> Send Email
                                            </Button>
                                            <Button 
                                                onClick={() => setIsMeetingModalOpen(true)}
                                                variant="outline"
                                                className="w-full btn-outline-modern h-9 text-[10px] font-black uppercase tracking-widest border-slate-200"
                                            >
                                                <CalendarIcon className="w-3.5 h-3.5 mr-2" /> Schedule Meeting
                                            </Button>
                                            <Button 
                                                onClick={() => setIsAssessmentModalOpen(true)}
                                                variant="outline"
                                                className="w-full h-9 text-[10px] font-black uppercase tracking-widest border-indigo-200 text-indigo-600 hover:bg-indigo-50 bg-indigo-50/20 disabled:opacity-50"
                                                disabled={viewingProfile.status === 'rejected'}
                                            >
                                                <ClipboardCheck className="w-3.5 h-3.5 mr-2" /> Send Assessment
                                            </Button>
                                            {viewingProfile.status !== 'rejected' && (
                                                <Button 
                                                    onClick={() => {
                                                        setRejectCandidateApp(viewingProfile);
                                                        setIsRejectModalOpen(true);
                                                    }}
                                                    className="w-full h-9 text-[10px] font-black uppercase tracking-widest bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 mt-2"
                                                >
                                                    <UserMinus className="w-3.5 h-3.5 mr-2" /> Reject Candidate
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <Button 
                                    onClick={() => setViewingProfile(null)} 
                                    className="mt-auto btn-outline-modern w-full"
                                >
                                    Close Panel
                                </Button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-12 custom-scrollbar space-y-10">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-[10px] font-bold text-primary-600 uppercase tracking-widest mb-1">Internal Review</h3>
                                        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Candidate Insight</h2>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button 
                                            size="sm" 
                                            variant="outline" 
                                            className="btn-outline-modern"
                                            onClick={() => {
                                                if (viewingProfile.resume_url) {
                                                    const url = viewingProfile.resume_url.startsWith('http') 
                                                        ? viewingProfile.resume_url 
                                                        : `${API_URL}${viewingProfile.resume_url}`;
                                                    window.open(url, '_blank');
                                                } else if (viewingProfile.resume_path) {
                                                    api.get(`/files/presigned-download?object_key=${viewingProfile.resume_path}`)
                                                       .then(res => window.open(res.data.download_url.startsWith('http') ? res.data.download_url : `${API_URL}${res.data.download_url}`, '_blank'))
                                                       .catch(() => alert('Failed to download resume.'));
                                                } else {
                                                    alert('No resume attached to this application.');
                                                }
                                            }}
                                        >
                                            <Download className="w-4 h-4 mr-2" /> Resume
                                        </Button>
                                    </div>
                                </div>

                                {/* Step 6: Interview Review Section */}
                                {viewingProfile.interviews && viewingProfile.interviews.some((i: any) => i.rating || i.status === 'completed') && (
                                    <section className="space-y-6">
                                        <div className="flex items-center gap-2 text-slate-900 border-b border-slate-100 pb-2">
                                            <History className="w-5 h-5 text-primary-600" />
                                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em]">Post-Interview Decapsulation</h4>
                                        </div>
                                        <div className="grid grid-cols-1 gap-4">
                                            {viewingProfile.interviews.filter((i: any) => i.rating || i.status === 'completed').sort((a: any, b: any) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime()).map((review: any, rIdx: number) => (
                                                <div key={rIdx} className="bg-slate-50 border border-slate-200 rounded-2xl p-6 relative overflow-hidden group hover:border-primary-500/30 transition-all">
                                                    <div className="flex items-start justify-between mb-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-primary-600 font-bold">
                                                                #{viewingProfile.interviews?.length ? viewingProfile.interviews.length - rIdx : 1}
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-black text-slate-900 uppercase">Interview Round</p>
                                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">{new Date(review.scheduled_at).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col items-end">
                                                            <div className="flex gap-1 mb-1">
                                                                {[...Array(5)].map((_, idx) => (
                                                                    <Star key={idx} className={cn("w-4 h-4", idx < (review.rating || 0) ? "fill-amber-400 text-amber-400" : "text-slate-200")} />
                                                                ))}
                                                            </div>
                                                            <p className="text-[10px] font-black text-slate-900 uppercase">Result: {review.rating}/5 Score</p>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm relative">
                                                        <MessageSquare className="absolute top-4 right-4 w-4 h-4 text-slate-100" />
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                           <User className="w-3 h-3" /> Evaluated by: {review.scheduled_by === user?.id ? "Me (RM)" : "Hiring Manager"}
                                                        </p>
                                                        <p className="text-sm text-slate-700 font-medium leading-relaxed italic">
                                                            "{review.feedback || (review.status === 'completed' ? 'Round completed. Evaluation pending.' : 'Not yet reviewed.')}"
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                )}
                                {viewingProfile.assessments && viewingProfile.assessments.length > 0 && (
                                    <section className="space-y-6">
                                        <div className="flex items-center gap-2 text-slate-900 border-b border-slate-100 pb-2">
                                            <ClipboardCheck className="w-5 h-5 text-indigo-600" />
                                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em]">Technical Assessment Intelligence</h4>
                                        </div>
                                        <div className="grid grid-cols-1 gap-4">
                                            {viewingProfile.assessments.map((assessment, aIdx) => (
                                                <div key={aIdx} className="bg-indigo-50/30 border border-indigo-100 rounded-2xl p-6 relative overflow-hidden group hover:border-indigo-500/30 transition-all">
                                                    <div className="flex items-start justify-between mb-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-indigo-100/50 flex items-center justify-center text-indigo-600 font-bold">
                                                                <Zap className="w-5 h-5" />
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-black text-slate-900 uppercase">{assessment.title}</p>
                                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Status: {assessment.status}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col items-end">
                                                            {assessment.status === 'submitted' && (
                                                                <Badge variant="success" className="text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                                                                    Submitted
                                                                </Badge>
                                                            )}
                                                            {assessment.deadline && (
                                                                <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Due: {new Date(assessment.deadline).toLocaleDateString()}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="bg-white p-5 rounded-xl border border-indigo-100/50 shadow-sm relative">
                                                        <div className="flex justify-between items-center">
                                                            <div>
                                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Candidate Submission</p>
                                                                {assessment.submitted_at ? (
                                                                    <p className="text-xs font-bold text-slate-700">Received on {new Date(assessment.submitted_at).toLocaleDateString()}</p>
                                                                ) : (
                                                                    <p className="text-xs font-bold text-slate-400 italic">No submission yet</p>
                                                                )}
                                                            </div>
                                                            <div className="flex gap-2">
                                                                {assessment.submission_file_path && (
                                                                    <Button 
                                                                        onClick={() => {
                                                                            api.get(`/files/presigned-download?object_key=${assessment.submission_file_path}`)
                                                                               .then(res => {
                                                                                   const url = res.data.download_url;
                                                                                   const finalUrl = url.startsWith('http') ? url : `${API_URL}${url}`;
                                                                                   window.open(finalUrl, '_blank');
                                                                               })
                                                                               .catch(err => console.error(err));
                                                                        }}
                                                                        size="sm" 
                                                                        variant="outline" 
                                                                        className="h-8 text-[9px] font-black uppercase border-indigo-100 hover:bg-indigo-50"
                                                                    >
                                                                        <Download className="w-3 h-3 mr-1.5" /> File
                                                                    </Button>
                                                                )}
                                                                {assessment.submission_link && (
                                                                    <Button 
                                                                        onClick={() => window.open(assessment.submission_link, '_blank')}
                                                                        size="sm" 
                                                                        variant="outline" 
                                                                        className="h-8 text-[9px] font-black uppercase border-indigo-100 hover:bg-indigo-50"
                                                                    >
                                                                        <ExternalLink className="w-3 h-3 mr-1.5" /> Link
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                )}

                                <div className="grid grid-cols-1 gap-6">
                                    <Card className="p-6 border border-slate-200 bg-white shadow-sm">
                                        <div className="flex justify-between items-center mb-4">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global Talent Score</p>
                                            <Badge variant={(viewingProfile.ats_score || 0) >= 70 ? 'success' : 'info'}>{viewingProfile.ats_score || 0}% Match</Badge>
                                        </div>
                                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                            <div className="bg-primary-600 h-full transition-all duration-500" style={{ width: `${viewingProfile.ats_score || 0}%` }} />
                                        </div>
                                    </Card>
                                </div>

                                <section className="space-y-6 pt-6 border-t border-slate-100">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center text-center group hover:bg-white hover:border-primary-200 transition-all">
                                                <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-primary-600 mb-3 group-hover:scale-110 transition-transform">
                                                    <Briefcase className="w-5 h-5" />
                                                </div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Date of Birth</p>
                                                <p className="text-sm font-black text-slate-800 mt-1 leading-tight">{viewingProfile.dob || "Not specified"}</p>
                                            </div>
                                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center text-center group hover:bg-white hover:border-primary-200 transition-all">
                                                <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-primary-600 mb-3 group-hover:scale-110 transition-transform">
                                                    <Briefcase className="w-5 h-5" />
                                                </div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Experience</p>
                                                <p className="text-lg font-black text-slate-900 mt-0.5">{(viewingProfile.relevant_experience || (viewingProfile.candidate_experience && viewingProfile.candidate_experience > 0 ? viewingProfile.candidate_experience : 0)) || 'N/A'} Years</p>
                                            </div>
                                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center text-center group hover:bg-white hover:border-primary-200 transition-all col-span-2">
                                                <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-emerald-600 mb-3 group-hover:scale-110 transition-transform">
                                                    <Target className="w-5 h-5" />
                                                </div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Role</p>
                                                <p className="text-sm font-black text-slate-800 mt-1 leading-tight">{viewingProfile.current_role_title || viewingProfile.candidate_current_title || "Not specified"}</p>
                                            </div>
                                        </div>

                                    <div className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 space-y-4">
                                        <div className="flex items-center gap-2 text-indigo-700">
                                            <GraduationCap className="w-4 h-4" />
                                            <h4 className="text-[10px] font-black uppercase tracking-widest">Academic Credentials</h4>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">Degree</p>
                                                <p className="text-sm font-bold text-slate-800 mt-1">{viewingProfile.degree || "Not specified"}</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">Institution</p>
                                                <p className="text-sm font-bold text-slate-800 mt-1 leading-tight">{viewingProfile.school || "Not specified"}</p>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                <section className="space-y-4 pt-4">
                                    <div className="flex items-center gap-2 text-slate-400 border-b border-slate-100 pb-2">
                                        <Activity className="w-4 h-4" />
                                        <h4 className="text-[10px] font-bold uppercase tracking-widest">Experience Summary</h4>
                                    </div>
                                    <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-6 rounded-2xl border-l-[6px] border-primary-600 shadow-inner">
                                        {viewingProfile.candidate_summary || "Candidate has not provided a focus summary."}
                                    </p>
                                </section>

                                <section className="space-y-4 pt-4">
                                    <div className="flex items-center gap-2 text-slate-400 border-b border-slate-100 pb-2">
                                        <Zap className="w-4 h-4" />
                                        <h4 className="text-[10px] font-bold uppercase tracking-widest">Skills & Competencies</h4>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {(viewingProfile.candidate_skills || '').split(',').map(skill => (
                                            <Badge key={skill} variant="info" className="px-4 py-1.5 text-[10px] rounded-lg border-slate-200 font-bold bg-white text-slate-500 hover:border-primary-500 transition-colors">
                                                {skill.trim()}
                                            </Badge>
                                        ))}
                                    </div>
                                </section>

                                {viewingProfile.interviews && viewingProfile.interviews.filter((i: any) => i.status !== 'completed').length > 0 && (
                                    <section className="space-y-4">
                                        <div className="flex items-center gap-2 text-slate-400 border-b border-slate-100 pb-2">
                                            <CalendarIcon className="w-4 h-4" />
                                            <h4 className="text-[10px] font-bold uppercase tracking-widest">Upcoming Interlock Sessions</h4>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {viewingProfile.interviews.filter((item: any) => item.status !== 'completed' && item.status !== 'cancelled').map((item: any) => (
                                                <div key={item.id} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-primary-500/50 transition-all">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 bg-primary-50 rounded-xl flex flex-col items-center justify-center text-primary-600">
                                                            <span className="text-[10px] font-bold leading-none uppercase">{new Date(item.scheduled_at).toLocaleDateString('en-US', { month: 'short' })}</span>
                                                            <span className="text-lg font-black leading-tight">{new Date(item.scheduled_at).getDate()}</span>
                                                        </div>
                                                        <div>
                                                            <p className="text-[11px] font-bold text-slate-900">{new Date(item.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({item.mode})</p>
                                                            <div className="flex items-center gap-1.5 mt-1">
                                                                <Badge variant="info" className="text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest">Scheduled</Badge>
                                                                {item.meeting_link && (
                                                                    <a href={item.meeting_link} target="_blank" rel="noreferrer" className="text-[9px] text-primary-600 hover:underline font-black uppercase">Join Link</a>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button size="sm" variant="ghost" onClick={() => handleCancelInterview(item.id)} className="h-9 w-9 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                )}
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
                    <ReviewModal 
                        {...reviewModal}
                        onClose={() => setReviewModal({ ...reviewModal, isOpen: false })}
                        onSuccess={fetchData}
                    />
                    <SendAssessmentModal 
                        isOpen={isAssessmentModalOpen}
                        onClose={() => setIsAssessmentModalOpen(false)}
                        applicationId={viewingProfile.id}
                        candidateName={viewingProfile.candidate_name || ''}
                        onSuccess={fetchData}
                    />
                    <RejectModal 
                        isOpen={isRejectModalOpen}
                        onClose={() => setIsRejectModalOpen(false)}
                        applicationId={rejectCandidateApp?.id || 0}
                        candidateName={rejectCandidateApp?.candidate_name || ''}
                        candidateEmail={rejectCandidateApp?.candidate_email || ''}
                        jobRole={rejectCandidateApp?.requisition_title || ''}
                        onRejectSuccess={() => {
                            setIsRejectModalOpen(false);
                            if (viewingProfile && viewingProfile.id === rejectCandidateApp?.id) {
                                setViewingProfile(null);
                            }
                            fetchData();
                        }}
                    />
                </>
            )}
        </div>
    );
};

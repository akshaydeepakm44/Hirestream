import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { 
    Video, 
    Clock, 
    Search, 
    CheckCircle2,
    FileText,
    AlertTriangle,
    Trash2,
    Edit3
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { ReviewModal } from '../../components/ReviewModal';
import { EditInterviewModal } from '../../components/EditInterviewModal';
import { Star, ClipboardCheck } from 'lucide-react';
import { cn } from '../../utils/cn';

const Countdown = ({ targetDate }: { targetDate: string }) => {
    const [status, setStatus] = useState('');

    useEffect(() => {
        const updateStatus = () => {
            const targetTime = new Date(targetDate).getTime();
            const now = new Date().getTime();
            const difference = targetTime - now;
            
            if (difference > 0) {
                const seconds = Math.floor(difference / 1000);
                const minutes = Math.floor(seconds / 60);
                const hours = Math.floor(minutes / 60);
                const days = Math.floor(hours / 24);

                if (seconds < 60) return `Starts in ${seconds}s`;
                if (minutes < 5) return `Starting Soon (${minutes}m)`;
                if (minutes < 60) return `Starts in ${minutes}m`;
                if (hours < 24) return `Starts in ${hours}h ${minutes % 60}m`;
                return `Starts in ${days}d ${hours % 24}h`;
            } else {
                const durationMinutes = 30; // Default or fetched from interview
                const endedTime = targetTime + (durationMinutes * 60 * 1000);
                
                if (now < endedTime) {
                    return 'Live Now';
                }
                return 'Completed';
            }
        };

        setStatus(updateStatus());
        const timer = setInterval(() => setStatus(updateStatus()), 1000);
        return () => clearInterval(timer);
    }, [targetDate]);

    const getStatusColor = () => {
        if (status === 'Live Now') return 'text-emerald-600 animate-pulse';
        if (status.includes('Starting Soon')) return 'text-amber-600 font-black';
        if (status === 'Completed') return 'text-slate-400';
        return 'text-slate-500';
    };

    return <span className={cn("font-bold", getStatusColor())}>{status}</span>;
};

export const ResourceManagerInterviews = () => {
    const [interviews, setInterviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [reviewModal, setReviewModal] = useState({ 
        isOpen: false, 
        interviewId: 0, 
        candidateName: '',
        initialRating: 0,
        initialFeedback: ''
    });
    const [cancelModal, setCancelModal] = useState({ isOpen: false, interviewId: 0, candidateName: '' });
    const [isCancelling, setIsCancelling] = useState(false);
    const [now, setNow] = useState(new Date());
    const [clearModalOpen, setClearModalOpen] = useState(false);
    const [isClearing, setIsClearing] = useState(false);
    const [editModal, setEditModal] = useState<{ isOpen: boolean; interview: any | null }>({ 
        isOpen: false, 
        interview: null 
    });

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const fetchInterviews = () => {
        setLoading(true);
        api.get('/interviews')
            .then(res => setInterviews(res.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    const handleCancel = async () => {
        if (!cancelModal.interviewId) return;
        setIsCancelling(true);
        try {
            await api.post(`/interviews/${cancelModal.interviewId}/cancel`);
            setCancelModal({ isOpen: false, interviewId: 0, candidateName: '' });
            fetchInterviews();
        } catch (err) {
            console.error('Failed to cancel interview:', err);
            alert('Failed to cancel interview. Please try again.');
        } finally {
            setIsCancelling(false);
        }
    };

    const handleClearHistory = async () => {
        setIsClearing(true);
        try {
            await api.post('/interviews/clear-history');
            setClearModalOpen(false);
            fetchInterviews();
        } catch (err) {
            console.error('Failed to clear history:', err);
            alert('Failed to clear history. Please try again.');
        } finally {
            setIsClearing(false);
        }
    };

    useEffect(() => {
        fetchInterviews();
    }, []);

    const upcomingInterviews = interviews.filter(i => i.status !== 'completed');
    const completedInterviews = interviews.filter(i => i.status === 'completed');

    const filteredUpcoming = upcomingInterviews.filter(i => 
        (i.candidate_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
        (i.requisition_title || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Global Interview Schedule</h1>
                    <p className="text-sm text-slate-500 mt-1">Cross-departmental interview coordination and oversight.</p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <Button 
                        variant="outline" 
                        onClick={() => setClearModalOpen(true)}
                        className="h-10 text-[10px] font-black uppercase tracking-widest text-red-500 border-red-100 hover:bg-red-50 hover:border-red-200 px-4 flex items-center gap-2"
                    >
                        <Trash2 className="w-3.5 h-3.5" /> Clear History
                    </Button>
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search candidates or roles..."
                            className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Upcoming Section */}
            <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Pending Evaluations</h3>
                <Card className="p-0 overflow-hidden border border-slate-200 shadow-sm bg-white">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Candidate</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Position</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Scheduled Time</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mode</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    [...Array(3)].map((_, i) => (
                                        <tr key={i}>
                                            <td colSpan={5} className="px-6 py-4"><Skeleton className="h-10 w-full rounded" /></td>
                                        </tr>
                                    ))
                                ) : filteredUpcoming.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-16 text-center">
                                            <Clock className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">No pending evaluations</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUpcoming.map((i, idx) => {
                                        const startTime = new Date(i.scheduled_at);
                                        const endTime = new Date(i.end_time || (startTime.getTime() + (i.duration_minutes || 30) * 60000));
                                        const isJoinable = now.getTime() >= startTime.getTime() - 5 * 60000 && now.getTime() < endTime.getTime();
                                        const hasEnded = now.getTime() >= endTime.getTime();
                                        const isReviewed = i.rating !== null;
                                        const isCancelled = i.status === 'cancelled';
                                        
                                        let statusColor = "bg-slate-100 text-slate-600";
                                        let statusText = "Scheduled";
                                        let borderColor = "group-hover:border-primary-500";

                                        if (isCancelled) {
                                            statusColor = "bg-red-50 text-red-600 border border-red-100";
                                            statusText = "Cancelled";
                                            borderColor = "border-red-500";
                                        } else if (isJoinable) {
                                            statusColor = "bg-blue-50 text-blue-600 border border-blue-200 animate-pulse";
                                            statusText = "Active Now";
                                            borderColor = "border-blue-500";
                                        } else if (hasEnded && !isReviewed) {
                                            statusColor = "bg-amber-50 text-amber-600 border border-amber-200";
                                            statusText = "Ended — Review Pending";
                                            borderColor = "border-amber-500";
                                        } else if (isReviewed) {
                                            statusColor = "bg-emerald-50 text-emerald-600 border border-emerald-200";
                                            statusText = "Evaluation Completed";
                                            borderColor = "border-emerald-500";
                                        }
                                        
                                        return (
                                            <tr key={idx} className={cn(
                                                "group hover:bg-slate-50 transition-colors",
                                                hasEnded && !isReviewed && !isCancelled && "bg-amber-50/20",
                                                isCancelled && "bg-slate-50/50 opacity-80"
                                            )}>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn(
                                                            "w-8 h-8 rounded flex items-center justify-center text-white font-bold text-[10px]",
                                                            isCancelled ? "bg-slate-400" : isJoinable ? "bg-blue-600" : hasEnded && !isReviewed ? "bg-amber-500" : "bg-primary-600"
                                                        )}>
                                                            {i.candidate_name?.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-900">{i.candidate_name}</p>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <Badge variant="white" className={cn(
                                                                    "text-[8px] font-black uppercase tracking-widest px-1.5 py-0",
                                                                    statusColor
                                                                )}>{statusText}</Badge>
                                                                {isReviewed && (
                                                                    <div className="flex items-center gap-0.5 text-amber-500">
                                                                        <Star className="w-2.5 h-2.5 fill-amber-500" />
                                                                        <span className="text-[10px] font-black">{i.rating}/5</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-sm text-slate-600 font-medium">{i.requisition_title}</span>
                                                    <p className="text-[9px] font-bold text-slate-400 -mt-0.5">{i.requisition_role}</p>
                                                </td>
                                                <td className={cn("px-6 py-4 border-l-4 transition-all", borderColor)}>
                                                    <div className="text-sm text-slate-700 font-bold">
                                                        {startTime.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                                    </div>
                                                    {!hasEnded && !isCancelled && (
                                                        <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5 mt-1">
                                                            <Clock className="w-3 h-3" />
                                                            <Countdown targetDate={i.scheduled_at} />
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Badge variant="info" className="text-[9px] uppercase tracking-widest py-0.5">
                                                        {i.mode?.replace('_', ' ') || 'Online'}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {!hasEnded && !isCancelled ? (
                                                            <>
                                                                {isJoinable ? (
                                                                    <a 
                                                                        href={i.meeting_link} 
                                                                        target="_blank" 
                                                                        rel="noopener noreferrer"
                                                                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md h-8 text-[10px] font-bold hover:bg-blue-700 transition-colors gap-2 shadow-lg shadow-blue-200"
                                                                    >
                                                                        <Video className="w-3.5 h-3.5" /> Join Session
                                                                    </a>
                                                                ) : (
                                                                    <Button disabled variant="outline" size="sm" className="h-8 text-[10px] font-bold opacity-50 px-4">
                                                                        Waiting to Start
                                                                    </Button>
                                                                )}
                                                                <Button 
                                                                    variant="ghost" 
                                                                    onClick={() => setCancelModal({ isOpen: true, interviewId: i.id, candidateName: i.candidate_name })}
                                                                    className="h-8 text-[10px] font-bold text-red-500 hover:text-red-600 hover:bg-red-50 px-3 rounded-md"
                                                                >
                                                                    Cancel Meeting
                                                                </Button>
                                                                <Button 
                                                                    variant="outline" 
                                                                    onClick={() => setEditModal({ isOpen: true, interview: i })}
                                                                    className="h-8 w-8 p-0 border-slate-200 hover:bg-slate-50 flex items-center justify-center rounded-md group-hover:border-primary-200 transition-colors"
                                                                    title="Edit Interview"
                                                                >
                                                                    <Edit3 className="w-3.5 h-3.5 text-slate-400 group-hover:text-primary-500" />
                                                                </Button>
                                                            </>
                                                        ) : isCancelled ? (
                                                            <Badge variant="white" className="bg-slate-100 text-slate-400 text-[9px] font-black uppercase tracking-widest border-slate-200">
                                                                Meeting Cancelled
                                                            </Badge>
                                                        ) : !isReviewed ? (
                                                            <Button 
                                                                onClick={() => setReviewModal({ 
                                                                    isOpen: true, 
                                                                    interviewId: i.id, 
                                                                    candidateName: i.candidate_name,
                                                                    initialRating: 0,
                                                                    initialFeedback: '' 
                                                                })}
                                                                className="h-8 text-[10px] font-black uppercase bg-amber-600 hover:bg-amber-700 text-white px-4 rounded-lg shadow-lg shadow-amber-200 flex items-center gap-2"
                                                            >
                                                                Ready for Review <ClipboardCheck className="w-3.5 h-3.5" />
                                                            </Button>
                                                        ) : (
                                                            <Badge variant="success" className="bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest border-emerald-100">
                                                                Review Submitted
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            {/* Recently Completed Section */}
            <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Recent Completions</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {completedInterviews.length > 0 ? (
                        completedInterviews.slice(0, 3).map((i, idx) => (
                            <Card key={idx} className="p-6 border border-slate-200 bg-white hover:border-primary-500 transition-colors group relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-16 h-16 bg-primary-50 rounded-bl-full -mr-4 -mt-4 flex items-start justify-end p-5">
                                    <CheckCircle2 className="w-4 h-4 text-primary-500" />
                                </div>
                                
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-10 h-10 bg-slate-100 rounded flex items-center justify-center text-slate-900 font-bold">
                                        {i.candidate_name?.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-900 tracking-tight">{i.candidate_name}</h4>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{i.requisition_title}</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between py-2 border-y border-slate-50">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Completed On</span>
                                        <span className="text-[10px] font-bold text-slate-900">{new Date(i.scheduled_at).toLocaleDateString()}</span>
                                    </div>
                                    <Button 
                                        variant="outline" 
                                        onClick={() => setReviewModal({ 
                                            isOpen: true, 
                                            interviewId: i.id, 
                                            candidateName: i.candidate_name,
                                            initialRating: i.rating || 0,
                                            initialFeedback: i.feedback || ''
                                        })}
                                        className="w-full btn-outline-modern h-10 text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200"
                                    >
                                        Edit Evaluation
                                    </Button>
                                </div>
                            </Card>
                        ))
                    ) : (
                        // Placeholder cards if no completed interviews
                        [...Array(3)].map((_, idx) => (
                            <Card key={idx} className="p-6 border border-slate-100 bg-slate-50/50 flex flex-col items-center justify-center text-center space-y-3 opacity-60">
                                <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-300">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No Recent Completion</p>
                                    <p className="text-[9px] text-slate-400 font-medium">Completed evaluations will appear here.</p>
                                </div>
                            </Card>
                        ))
                    )}
                </div>
            </div>

            <ReviewModal 
                {...reviewModal}
                onClose={() => setReviewModal({ ...reviewModal, isOpen: false })}
                onSuccess={fetchInterviews}
            />

            <EditInterviewModal 
                isOpen={editModal.isOpen}
                interview={editModal.interview}
                onClose={() => setEditModal({ isOpen: false, interview: null })}
                onSuccess={fetchInterviews}
            />

            {/* Cancellation Confirmation Modal */}
            {cancelModal.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
                        <div className="p-8 text-center">
                            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 mx-auto mb-6 border border-red-100">
                                <AlertTriangle className="w-8 h-8" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 mb-2">Cancel Interview</h3>
                            <p className="text-slate-500 font-medium leading-relaxed mb-8">
                                Are you sure you want to cancel the interview for <span className="font-bold text-slate-900">{cancelModal.candidateName}</span>?<br/>
                                This action cannot be undone and notifications will be sent to all participants.
                            </p>
                            
                            <div className="flex flex-col gap-3">
                                <Button 
                                    onClick={handleCancel}
                                    isLoading={isCancelling}
                                    className="w-full h-14 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl shadow-xl shadow-red-500/20"
                                >
                                    Yes, Cancel Meeting
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    onClick={() => setCancelModal({ isOpen: false, interviewId: 0, candidateName: '' })}
                                    className="w-full h-14 font-bold text-slate-500 hover:bg-slate-50 rounded-2xl"
                                >
                                    No, Keep Meeting
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Clear History Confirmation Modal */}
            {clearModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
                        <div className="p-8 text-center">
                            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 mx-auto mb-6 border border-red-100">
                                <Trash2 className="w-8 h-8" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 mb-2">Clear History?</h3>
                            <p className="text-slate-500 font-medium leading-relaxed mb-8">
                                This will permanently remove all <span className="font-bold text-slate-900">Completed</span> and <span className="font-bold text-slate-900">Cancelled</span> interviews from your history view.
                            </p>
                            
                            <div className="flex flex-col gap-3">
                                <Button 
                                    onClick={handleClearHistory}
                                    isLoading={isClearing}
                                    className="w-full h-14 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl shadow-xl shadow-red-500/20"
                                >
                                    Confirm Cleanup
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    onClick={() => setClearModalOpen(false)}
                                    className="w-full h-14 font-bold text-slate-500 hover:bg-slate-50 rounded-2xl"
                                >
                                    Keep History
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

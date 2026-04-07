import { useEffect, useState, useMemo } from 'react';
import { api } from '../../api/client';
import { 
    FileText, 
    CheckCircle2, 
    Clock, 
    Upload, 
    Briefcase,
    Search,
    AlertCircle,
    Download,
    Mail,
    Send,
    Edit3
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { cn } from '../../utils/cn';
import { Application } from '../../types';

export const ResourceManagerAdministration = () => {
    const [candidates, setCandidates] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedCandidate, setSelectedCandidate] = useState<Application | null>(null);
    const [offerDeadline, setOfferDeadline] = useState(3);
    const [offerFile, setOfferFile] = useState<File | null>(null);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [emailContent, setEmailContent] = useState({
        subject: '',
        body: ''
    });
    const [showSuccessPopup, setShowSuccessPopup] = useState(false);

    const fetchCandidates = async () => {
        try {
            const res = await api.get('/rm/onboarding/candidates');
            setCandidates(res.data);
            if (selectedCandidate) {
                const updated = res.data.find((c: any) => c.id === selectedCandidate.id);
                if (updated) setSelectedCandidate(updated);
            }
        } catch (e) {
            console.error('Failed to fetch onboarding candidates', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCandidates();
        const interval = setInterval(fetchCandidates, 10000);
        return () => clearInterval(interval);
    }, []);

    const handleOpenEmailModal = (app: Application) => {
        if (!offerFile) {
            alert('Please select an offer letter file first');
            return;
        }
        setEmailContent({
            subject: `Job Offer: ${app.requisition_title} | HireStream`,
            body: `Dear ${app.candidate_name},\n\nWe are pleased to offer you the position of ${app.requisition_title}. Please find the attached offer letter for your review and signature.\n\nBest regards,\nHR Team`
        });
        setIsEmailModalOpen(true);
    };

    const handleSendOffer = async () => {
        if (!selectedCandidate || !offerFile) return;

        setLoading(true);
        const formData = new FormData();
        formData.append('file', offerFile);
        formData.append('email_description', emailContent.body);
        formData.append('email_subject', emailContent.subject);
        formData.append('deadline_days', offerDeadline.toString());

        try {
            await api.post(`/rm/onboarding/${selectedCandidate.id}/send-offer`, formData);
            await fetchCandidates();
            setIsEmailModalOpen(false);
            setOfferFile(null);
            alert('Offer letter sent successfully!');
        } catch (e: any) {
            alert(e.response?.data?.detail || 'Failed to send offer');
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadAcceptance = async () => {
        if (!selectedCandidate) return;
        try {
            const res = await api.get(`/rm/acceptance-letter/${selectedCandidate.id}`);
            window.open(res.data.download_url, '_blank');
        } catch (e) {
            alert('Failed to get acceptance document URL');
        }
    };

    const [isCompleting, setIsCompleting] = useState(false);

    const handleComplete = async () => {
        if (!selectedCandidate) return;
        setLoading(true);
        try {
            await api.post(`/rm/onboarding/${selectedCandidate.id}/complete`);
            setIsCompleting(true);
            setTimeout(() => {
                setIsCompleting(false);
                setSelectedCandidate(null);
                fetchCandidates();
            }, 2000);
        } catch (e: any) {
            alert(e.response?.data?.detail || 'Failed to complete onboarding');
        } finally {
            setLoading(false);
        }
    };

    const filteredCandidates = useMemo(() => candidates.filter(c =>
        (c.candidate_name?.toLowerCase().includes(search.toLowerCase())) ||
        (c.requisition_title?.toLowerCase().includes(search.toLowerCase()))
    ), [candidates, search]);

    const getCompletionCount = (app: Application) => {
        let count = 0;
        if (app.offer_letter_accepted) count++;
        
        // Count verified documents
        let verifiedCount = 0;
        let totalToVerify = 4; // govt_id, academic, address, photo
        
        if (app.govt_id_verified) verifiedCount++;
        if (app.academic_verified) verifiedCount++;
        if (app.address_verified) verifiedCount++;
        if (app.photo_verified) verifiedCount++;

        if (!app.is_fresher) {
            totalToVerify += 3;
            if (app.experience_verified) verifiedCount++;
            if (app.relieving_verified) verifiedCount++;
            if (app.payslips_verified) verifiedCount++;
        }
        
        // If everything verified, mark documents step as done
        if (verifiedCount === totalToVerify) count++;
        
        if (app.onboarding_completed) count++;
        return count;
    };

    const isFullyVerified = (app: Application) => {
        const baseVerified = app.govt_id_verified && app.academic_verified && app.address_verified && app.photo_verified;
        const experienceVerified = app.is_fresher ? true : (app.experience_verified && app.relieving_verified && app.payslips_verified);
        return baseVerified && experienceVerified && app.offer_letter_accepted;
    };

    const renderOnboardingWorkflow = (app: Application) => {
        const steps = [
            { id: 'offer', label: 'Offer Letter', completed: app.offer_letter_accepted },
            { id: 'identity', label: 'Candidate Documents', completed: app.documents_submitted },
            { id: 'final', label: 'Onboarding Finalized', completed: app.onboarding_completed }
        ];

        const completionCount = getCompletionCount(app);

        return (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Workflow Progress</h3>
                        <Badge variant={completionCount === 3 ? 'success' : 'info'} className="h-6">
                            {completionCount} / 3 Completed
                        </Badge>
                    </div>

                    <div className="relative flex justify-between">
                        <div className="absolute top-5 left-0 w-full h-[2px] bg-slate-200 z-0" />
                        <div
                            className="absolute top-5 left-0 h-[2px] bg-emerald-500 z-0 transition-all duration-700 ease-in-out"
                            style={{ width: `${(completionCount / 3) * 100}%` }}
                        />

                        {steps.map((step) => (
                            <div key={step.id} className="relative z-10 flex flex-col items-center gap-3 bg-slate-50 px-4">
                                <div className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 border-2 shadow-sm",
                                    step.completed
                                        ? "bg-emerald-500 border-emerald-500 text-white"
                                        : "bg-white border-slate-200 text-slate-400"
                                )}>
                                    {step.completed ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                                </div>
                                <span className={cn(
                                    "text-[10px] font-black uppercase tracking-widest",
                                    step.completed ? "text-emerald-600" : "text-slate-400"
                                )}>
                                    {step.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Card className="p-8 border-slate-100 hover:border-primary-200 transition-all shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600">
                                <FileText className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-900">Offer Letter Section</h4>
                                <p className="text-[10px] text-slate-500 font-bold uppercase">Candidate: {app.offer_letter_accepted ? 'Accepted' : (app.offer_letter_sent ? 'Sent' : 'Pending')}</p>
                            </div>
                        </div>

                        {!app.offer_letter_sent && (
                            <div className="space-y-4">
                                <div className="relative p-4 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-primary-400 transition-colors cursor-pointer group">
                                    <input type="file" accept=".pdf" onChange={(e) => setOfferFile(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" />
                                    <Upload className="w-6 h-6 text-slate-300 group-hover:text-primary-500" />
                                    <p className="text-xs font-bold text-slate-500">{offerFile ? offerFile.name : 'Upload Offer Letter (PDF)'}</p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase mb-3 block">Offer Acceptance Deadline</label>
                                    <div className="flex gap-2">
                                        {[3, 5, 7].map((days) => (
                                            <button
                                                key={days}
                                                type="button"
                                                onClick={() => setOfferDeadline(days)}
                                                className={cn(
                                                    "flex-1 py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all border-2",
                                                    offerDeadline === days 
                                                        ? "bg-primary-600 border-primary-600 text-white shadow-lg shadow-primary-500/20 scale-[1.02]" 
                                                        : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                                                )}
                                            >
                                                {days} Days
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex flex-col gap-4 mt-8">
                                    <Button 
                                        onClick={() => handleOpenEmailModal(app)}
                                        disabled={loading || !offerFile}
                                        className="h-12 btn-primary-modern rounded-2xl flex items-center justify-center text-[10px] font-black uppercase tracking-[0.2em] shadow-xl"
                                    >
                                        {loading ? 'SENDING...' : 'REVIEW & SEND OFFER'} <Send className="ml-2 w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {app.offer_letter_sent && !app.offer_letter_accepted && (
                            <div className="p-6 bg-amber-50 border border-amber-100 rounded-2xl flex flex-col items-center text-center">
                                <Clock className="w-10 h-10 text-amber-500 mb-3" />
                                <h5 className="text-sm font-bold text-amber-900 mb-1">Waiting for Candidate</h5>
                                <p className="text-xs text-amber-700 leading-relaxed font-medium">
                                    Offer letter has been sent. Candidate is yet to accept and upload the signed copy.
                                </p>
                            </div>
                        )}

                        {app.offer_letter_accepted && (
                            <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-2xl flex flex-col items-center text-center">
                                <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-3" />
                                <h5 className="text-sm font-bold text-emerald-900 mb-1">Offer Accepted</h5>
                                <div className="w-full mt-4">
                                    <Button
                                        onClick={handleDownloadAcceptance}
                                        variant="outline" className="w-full h-10 rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-100 text-[10px] font-black uppercase tracking-[0.15em] shadow-sm"
                                    >
                                        <Download className="w-4 h-4 mr-2" /> Download Signed Acceptance
                                    </Button>
                                </div>
                            </div>
                        )}
                    </Card>

                    <Card className="p-8 border-slate-100 hover:border-indigo-200 transition-all shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                                <Briefcase className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-900">Identification Documents</h4>
                                <p className="text-[10px] text-slate-500 font-bold uppercase">
                                    Status: {app.documents_submitted ? 'Submitted' : 'Pending'}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-4">
                            {[
                                { id: 'photo', label: 'Candidate Photo', url: app.photo_url, verified: app.photo_verified },
                                { id: 'pan', label: 'PAN Card', url: app.pan_url, verified: app.govt_id_verified },
                                { id: 'aadhaar', label: 'Aadhaar Card', url: app.aadhaar_url, verified: app.govt_id_verified },
                                { id: 'academic', label: 'Academic Degree', url: app.education_docs_url, verified: app.academic_verified },
                                { id: 'address', label: 'Address Proof', url: app.address_proof_url, verified: app.address_verified },
                                ...(!app.is_fresher ? [
                                    { id: 'experience', label: 'Experience Letter', url: app.experience_docs_url, verified: app.experience_verified },
                                    { id: 'relieving', label: 'Relieving Letter', url: app.relieving_letter_url, verified: app.relieving_verified },
                                    { id: 'payslips', label: 'Previous 3m Payslips', url: app.payslips_url, verified: app.payslips_verified }
                                ] : [])
                            ].map((doc) => (
                                <div key={doc.id} className={cn(
                                    "p-4 border rounded-2xl flex flex-col gap-4 group transition-all",
                                    doc.url ? "bg-white border-slate-200 hover:border-indigo-300" : "bg-slate-50 border-slate-100 opacity-60"
                                )}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-slate-800">{doc.label}</span>
                                                {doc.verified && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                                            </div>
                                            {doc.url ? (
                                                <button 
                                                    onClick={() => window.open(doc.url, '_blank')}
                                                    className="text-[9px] font-black uppercase mt-1 text-primary-600 hover:underline flex items-center"
                                                >
                                                    Open / Download <Download className="w-2.5 h-2.5 ml-1" />
                                                </button>
                                            ) : (
                                                <span className="text-[9px] font-black uppercase mt-1 text-slate-400">Not Uploaded</span>
                                            )}
                                        </div>
                                        {doc.url && !doc.verified && (
                                            <Button 
                                                variant="outline" 
                                                size="sm"
                                                className="h-8 rounded-lg border-slate-200 text-[10px] font-bold hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600 transition-colors"
                                                onClick={async () => {
                                                    try {
                                                        await api.post(`/rm/onboarding/${app.id}/verify-document`, { doc_id: doc.id });
                                                        await fetchCandidates();
                                                    } catch (e) {
                                                        alert('Verification failed');
                                                    }
                                                }}
                                            >
                                                Verify Document
                                            </Button>
                                        )}
                                        {doc.verified && (
                                            <Badge variant="success" className="h-8 px-3 rounded-lg text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border-emerald-100">
                                                VERIFIED
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>

                <div className="flex justify-end pt-8 border-t border-slate-200">
                    <Button
                        disabled={!isFullyVerified(app) || loading || isCompleting}
                        onClick={handleComplete}
                        className={cn(
                            "h-12 px-10 text-xs font-black uppercase tracking-[0.2em] rounded-2xl transition-all duration-500",
                            isCompleting 
                                ? "bg-emerald-500 text-white shadow-emerald-500/40 scale-[1.03]"
                                : isFullyVerified(app)
                                    ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-500/20 scale-105"
                                    : "bg-slate-100 text-slate-400 cursor-not-allowed opacity-50"
                        )}
                    >
                        {isCompleting ? (
                            <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5" /> ONBOARDING COMPLETED
                            </motion.div>
                        ) : isFullyVerified(app) ? (
                            'Finalize & Mark Hired'
                        ) : (
                            'Pending Verification'
                        )}
                    </Button>
                </div>
            </div>
        );
    };

    return (
        <div className="p-10 max-w-[1600px] mx-auto min-h-screen">
            <div className="flex flex-col lg:flex-row gap-10">
                <div className="w-full lg:w-[400px] flex flex-col gap-8">
                    <Card className="p-8 border-none bg-white shadow-xl rounded-[2.5rem]">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight italic">Administrate</h2>
                            <Badge variant="info" className="px-3 py-1 font-black">
                                {candidates.length} PENDING
                            </Badge>
                        </div>
                        
                        <div className="relative mb-6">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                                type="text"
                                placeholder="Search candidates..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full h-12 pl-12 pr-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-primary-500/20 transition-all outline-none"
                            />
                        </div>

                        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                            {filteredCandidates.length > 0 ? (
                                filteredCandidates.map((app) => (
                                    <div 
                                        key={app.id}
                                        onClick={() => setSelectedCandidate(app)}
                                        className={cn(
                                            "p-4 rounded-[2rem] border-2 transition-all cursor-pointer group",
                                            selectedCandidate?.id === app.id 
                                                ? "bg-slate-900 border-slate-900 shadow-xl scale-[1.02]" 
                                                : "bg-white border-slate-50 hover:border-slate-200"
                                        )}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold shadow-sm transition-colors",
                                                selectedCandidate?.id === app.id ? "bg-white/10 text-white" : "bg-slate-100 text-slate-900"
                                            )}>
                                                {app.candidate_name?.charAt(0)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-0.5">
                                                    <h3 className={cn(
                                                        "text-sm font-bold truncate",
                                                        selectedCandidate?.id === app.id ? "text-white" : "text-slate-900"
                                                    )}>{app.candidate_name}</h3>
                                                </div>
                                                <p className={cn(
                                                    "text-[10px] font-black uppercase truncate tracking-widest",
                                                    selectedCandidate?.id === app.id ? "text-slate-400" : "text-slate-400"
                                                )}>{app.current_role_title || app.candidate_current_title || app.requisition_title}</p>
                                            </div>
                                            <div className={cn(
                                                "w-8 h-8 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all",
                                                selectedCandidate?.id === app.id ? "bg-white/10 text-white" : "bg-slate-50 text-slate-400"
                                            )}>
                                                <Briefcase className="w-4 h-4" />
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-8 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl">
                                    <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                                    <p className="text-xs font-bold text-slate-500">No candidates in onboarding.</p>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

                <div className="flex-1 min-w-0">
                    <AnimatePresence mode="wait">
                        {selectedCandidate ? (
                            <div key={selectedCandidate.id}>
                                <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-xl">
                                            {selectedCandidate.candidate_name?.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{selectedCandidate.candidate_name}</h2>
                                                <Badge variant="outline" className="h-6">ID: HS-{selectedCandidate.id}</Badge>
                                            </div>
                                            <div className="flex items-center gap-4 mt-1.5 text-slate-500">
                                                <div className="flex items-center gap-1.5">
                                                    <Briefcase className="w-3.5 h-3.5" />
                                                    <span className="text-xs font-medium">{selectedCandidate.requisition_title}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Mail className="w-3.5 h-3.5" />
                                                    <span className="text-xs font-medium">{selectedCandidate.candidate_email}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {renderOnboardingWorkflow(selectedCandidate)}
                            </div>
                        ) : (
                            <div className="h-[600px] bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center p-12">
                                <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center shadow-sm border border-slate-100 mb-6">
                                    <AlertCircle className="w-10 h-10 text-slate-300" />
                                </div>
                                <h2 className="text-xl font-bold text-slate-900 mb-2">Initialize Administrator Workflow</h2>
                                <p className="text-sm text-slate-500 max-w-sm leading-relaxed font-medium">
                                    Select a candidate from the administration pipeline to begin the document verification and offer management process.
                                </p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {showSuccessPopup && selectedCandidate && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-10 text-center">
                            <div className="w-20 h-20 bg-emerald-100 rounded-[24px] flex items-center justify-center text-emerald-600 mx-auto mb-6">
                                <CheckCircle2 className="w-10 h-10" />
                            </div>
                            
                            <h2 className="text-2xl font-black text-slate-900 mb-2">Candidate Onboarding Completed</h2>
                            <p className="text-slate-500 mb-8 font-medium">All documents verified successfully. Candidate has been moved to the Hired section.</p>
                            
                            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 text-left mb-8 space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Candidate</span>
                                    <span className="text-sm font-bold text-slate-900">{selectedCandidate.candidate_name}</span>
                                </div>
                                <div className="flex justify-between items-center border-t border-slate-200/50 pt-4">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Role</span>
                                    <span className="text-sm font-bold text-slate-900">{selectedCandidate.requisition_title}</span>
                                </div>
                                <div className="flex justify-between items-center border-t border-slate-200/50 pt-4 text-emerald-600 font-bold">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</span>
                                    <Badge variant="success">Finalized & Hired</Badge>
                                </div>
                            </div>

                            <Button 
                                onClick={() => {
                                    setShowSuccessPopup(false);
                                    setSelectedCandidate(null);
                                    fetchCandidates();
                                }}
                                className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em]"
                            >
                                Close Dashboard
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {isEmailModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <Card className="w-full max-w-2xl bg-white rounded-[2.5rem] p-10 shadow-2xl border-none slide-up">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-600">
                                    <Edit3 className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900">Review Offer Email</h3>
                                    <p className="text-xs text-slate-500 font-medium">Edit the template before sending it to the candidate.</p>
                                </div>
                            </div>
                            <button onClick={() => setIsEmailModalOpen(false)} className="w-10 h-10 rounded-xl hover:bg-slate-50 flex items-center justify-center transition-colors">
                                <AlertCircle className="w-5 h-5 text-slate-400 rotate-45" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Email Subject</label>
                                <input 
                                    type="text" 
                                    value={emailContent.subject}
                                    onChange={(e) => setEmailContent(prev => ({ ...prev, subject: e.target.value }))}
                                    className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary-500/20 outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Message Body</label>
                                <textarea 
                                    value={emailContent.body}
                                    onChange={(e) => setEmailContent(prev => ({ ...prev, body: e.target.value }))}
                                    className="w-full h-48 p-4 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary-500/20 outline-none resize-none"
                                />
                            </div>
                        </div>

                        <div className="flex gap-4 mt-10">
                            <Button
                                variant="outline"
                                onClick={() => setIsEmailModalOpen(false)}
                                className="flex-1 h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest border-slate-200"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSendOffer}
                                disabled={loading}
                                className="flex-1 h-12 btn-primary-modern rounded-2xl flex items-center justify-center text-[10px] font-black uppercase tracking-widest shadow-xl"
                            >
                                {loading ? 'SENDING...' : 'CONFIRM & SEND'} <Send className="ml-2 w-4 h-4" />
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

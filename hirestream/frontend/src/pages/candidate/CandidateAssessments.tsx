import { useEffect, useState } from 'react';
import { api, API_URL } from '../../api/client';
import { Assessment } from '../../types';
import { 
    ClipboardCheck, 
    Download, 
    Link as LinkIcon, 
    Send, 
    CheckCircle2, 
    Clock, 
    Upload,
    FileText,
    ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { cn } from '../../utils/cn';

export const CandidateAssessments = () => {
    const [assessments, setAssessments] = useState<Assessment[]>([]);
    const [submittingId, setSubmittingId] = useState<number | null>(null);
    const [submissionType, setSubmissionType] = useState<Number | null>(null);
    const [submissionData, setSubmissionData] = useState({ file: null as File | null, link: '' });
    const [isLoading, setIsLoading] = useState(true);

    const fetchAssessments = async () => {
        try {
            const res = await api.get('/candidates/assessments');
            setAssessments(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAssessments();
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSubmissionData(prev => ({ ...prev, file: e.target.files![0] }));
        }
    };

    const handleSubmit = async (assessmentId: number) => {
        setSubmittingId(assessmentId);
        try {
            let submission_file_path = '';
            if (submissionData.file) {
                const formData = new FormData();
                formData.append('file', submissionData.file);
                const uploadRes = await api.post('/files/upload', formData);
                submission_file_path = uploadRes.data.object_key;
            }

            await api.post(`/candidates/assessments/${assessmentId}/submit`, {
                submission_file_path,
                submission_link: submissionData.link
            });

            fetchAssessments();
            setSubmissionType(null);
            setSubmissionData({ file: null, link: '' });
        } catch (e) {
            console.error(e);
            alert('Failed to submit assessment. Please try again.');
        } finally {
            setSubmittingId(null);
        }
    };

    if (isLoading) {
        return <div className="p-8"><p>Loading assessments...</p></div>;
    }

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Assessments & Tasks</h1>
                <p className="text-slate-500 font-medium mt-1">Review and submit technical tasks assigned by your hiring teams.</p>
            </div>

            {assessments.length === 0 ? (
                <Card className="p-12 text-center border-dashed bg-slate-50/50">
                    <ClipboardCheck className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-900">No assessments found</h3>
                    <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto font-medium leading-relaxed">You haven't been assigned any technical assessments yet. They will appear here once assigned.</p>
                </Card>
            ) : (
                <div className="space-y-6">
                    {assessments.map((assessment) => (
                        <Card key={assessment.id} className="p-0 overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-white rounded-3xl">
                            <div className="p-8">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                                            <FileText className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-900 leading-tight">{assessment.title}</h3>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Assigned on {new Date(assessment.created_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <Badge 
                                        variant={assessment.status === 'submitted' ? 'success' : 'info'}
                                        className={cn(
                                            "font-black uppercase tracking-widest px-3 py-1",
                                            assessment.status === 'submitted' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-indigo-50 text-indigo-600 border-indigo-100"
                                        )}
                                    >
                                        {assessment.status}
                                    </Badge>
                                </div>

                                <div className="space-y-6">
                                    {assessment.instructions && (
                                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-inner">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Task Instructions</p>
                                            <p className="text-sm text-slate-700 leading-relaxed font-medium">{assessment.instructions}</p>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-4 py-4 border-y border-slate-50">
                                        {assessment.file_path && (
                                            <Button 
                                                variant="outline" 
                                                className="btn-outline-modern flex-1 rounded-2xl h-14 font-black uppercase tracking-widest"
                                                onClick={() => {
                                                    api.get(`/files/presigned-download?object_key=${assessment.file_path}`)
                                                       .then(res => {
                                                           const url = res.data.download_url;
                                                           const finalUrl = url.startsWith('http') ? url : `${API_URL}${url}`;
                                                           window.open(finalUrl, '_blank');
                                                       })
                                                       .catch(err => console.error(err));
                                                }}
                                            >
                                                <Download className="w-4 h-4 mr-2" /> Download details (PDF)
                                            </Button>
                                        )}
                                        {assessment.deadline && (
                                            <div className="flex items-center gap-2 px-6">
                                                <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center text-amber-600 shadow-sm border border-amber-100/50">
                                                    <Clock className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase">Deadline</p>
                                                    <p className="text-sm font-bold text-slate-900">{new Date(assessment.deadline).toLocaleString()}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {assessment.status !== 'submitted' ? (
                                        <div className="pt-4 space-y-6">
                                            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                                <Send className="w-3.5 h-3.5" /> Submit your work
                                            </h4>
                                            
                                            <div className="grid grid-cols-2 gap-4">
                                                <button 
                                                    onClick={() => setSubmissionType(1)}
                                                    className={cn(
                                                        "p-6 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all",
                                                        submissionType === 1 ? "bg-primary-50 border-primary-500" : "bg-white border-slate-100 hover:border-slate-200"
                                                    )}
                                                >
                                                    <Upload className={cn("w-6 h-6", submissionType === 1 ? "text-primary-600" : "text-slate-400")} />
                                                    <span className="text-xs font-bold text-slate-900 uppercase">Upload PDF</span>
                                                </button>
                                                <button 
                                                    onClick={() => setSubmissionType(2)}
                                                    className={cn(
                                                        "p-6 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all",
                                                        submissionType === 2 ? "bg-primary-50 border-primary-500" : "bg-white border-slate-100 hover:border-slate-200"
                                                    )}
                                                >
                                                    <LinkIcon className={cn("w-6 h-6", submissionType === 2 ? "text-primary-600" : "text-slate-400")} />
                                                    <span className="text-xs font-bold text-slate-900 uppercase">External Link</span>
                                                </button>
                                            </div>

                                            <AnimatePresence>
                                                {submissionType === 1 && (
                                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4">
                                                        <label className="flex items-center justify-center gap-3 w-full h-32 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-100/50 transition-all font-bold text-slate-500">
                                                            <input type="file" className="hidden" accept=".pdf" onChange={handleFileChange} />
                                                            {submissionData.file ? (
                                                                <div className="flex items-center gap-3 text-primary-600">
                                                                    <FileText className="w-6 h-6" />
                                                                    <span>{submissionData.file.name}</span>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <Upload className="w-6 h-6" />
                                                                    <span>Select Submission PDF</span>
                                                                </>
                                                            )}
                                                        </label>
                                                    </motion.div>
                                                )}

                                                {submissionType === 2 && (
                                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4">
                                                        <div className="flex items-center gap-2 group">
                                                            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-focus-within:bg-primary-50 group-focus-within:text-primary-600 transition-colors">
                                                                <LinkIcon className="w-5 h-5" />
                                                            </div>
                                                            <input 
                                                                type="url"
                                                                placeholder="GitHub URL or Google Drive Link"
                                                                className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl h-12 px-4 text-sm font-semibold outline-none focus:bg-white focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all shadow-inner"
                                                                value={submissionData.link}
                                                                onChange={e => setSubmissionData(prev => ({ ...prev, link: e.target.value }))}
                                                            />
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            <Button 
                                                className={cn(
                                                    "w-full h-14 rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all",
                                                    (submissionData.file || (submissionData.link && submissionData.link.length > 5)) ? "bg-slate-900 text-white shadow-slate-200" : "bg-slate-100 text-slate-400 cursor-not-allowed border-none shadow-none"
                                                )}
                                                disabled={!submissionData.file && !(submissionData.link && submissionData.link.length > 5)}
                                                isLoading={submittingId === assessment.id}
                                                onClick={() => handleSubmit(assessment.id)}
                                            >
                                                {submittingId === assessment.id ? "Submitting..." : "Submit Assessment"} <Send className="w-4 h-4 ml-2" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                                            <div className="flex items-center gap-3 text-emerald-600">
                                                <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center shadow-sm border border-emerald-100/50">
                                                    <CheckCircle2 className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest">Submission Status</p>
                                                    <p className="text-sm font-bold">Successfully Submitted</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                {assessment.submission_file_path && (
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        className="text-[10px] font-black uppercase tracking-widest hover:bg-slate-50"
                                                        onClick={() => {
                                                            api.get(`/files/presigned-download?object_key=${assessment.submission_file_path}`)
                                                               .then(res => {
                                                                   const url = res.data.download_url;
                                                                   const finalUrl = url.startsWith('http') ? url : `${API_URL}${url}`;
                                                                   window.open(finalUrl, '_blank');
                                                               })
                                                               .catch(err => console.error(err));
                                                        }}
                                                    >
                                                        <FileText className="w-4 h-4 mr-2" /> View File
                                                    </Button>
                                                )}
                                                {assessment.submission_link && (
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        className="text-[10px] font-black uppercase tracking-widest hover:bg-slate-50"
                                                        onClick={() => window.open(assessment.submission_link!, '_blank')}
                                                    >
                                                        <ExternalLink className="w-4 h-4 mr-2" /> View Link
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Review Info */}
                            {assessment.status === 'reviewed' && (
                                <div className="p-8 bg-slate-900 text-white">
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="text-sm font-black uppercase tracking-widest">Team Feedback</h4>
                                        <div className="text-center">
                                            <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Score</p>
                                            <p className="text-2xl font-black text-primary-400">{assessment.score}/100</p>
                                        </div>
                                    </div>
                                    <div className="bg-white/5 p-4 rounded-xl border border-white/10 font-medium text-sm leading-relaxed text-slate-300 italic">
                                        "{assessment.feedback}"
                                    </div>
                                </div>
                            )}
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

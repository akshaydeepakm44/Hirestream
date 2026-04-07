import { useState, useEffect } from 'react';
import { X, Send, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api/client';

export interface RejectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onRejectSuccess: () => void;
    candidateName: string;
    candidateEmail: string;
    jobRole: string;
    applicationId: number;
}

export const RejectModal = ({
    isOpen,
    onClose,
    onRejectSuccess,
    candidateName,
    candidateEmail,
    jobRole,
    applicationId
}: RejectModalProps) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const COMPANY_NAME = "HireStream";
    
    const [template, setTemplate] = useState({
        subject: `Application Update — ${jobRole}`,
        body: `Dear ${candidateName},

Thank you for your interest in the ${jobRole} position at ${COMPANY_NAME}.

After careful review of your profile, we regret to inform you that we will not be moving forward with your application at this time.

We truly appreciate your time and effort in applying, and we encourage you to apply for future opportunities that match your skills and experience.

We wish you all the best in your job search.

Best Regards
${COMPANY_NAME} Recruitment Team`
    });

    // Reset template if props change
    useEffect(() => {
        if (isOpen) {
            setTemplate({
                subject: `Application Update — ${jobRole}`,
                body: `Dear ${candidateName},

Thank you for your interest in the ${jobRole} position at ${COMPANY_NAME}.

After careful review of your profile, we regret to inform you that we will not be moving forward with your application at this time.

We truly appreciate your time and effort in applying, and we encourage you to apply for future opportunities that match your skills and experience.

We wish you all the best in your job search.

Best Regards
${COMPANY_NAME} Recruitment Team`
            });
            setError('');
        }
    }, [isOpen, candidateName, jobRole]);

    if (!isOpen) return null;

    const handleReject = async () => {
        setIsLoading(true);
        setError('');
        try {
            // 1. Send rejection email
            const formData = new FormData();
            formData.append('to', candidateEmail);
            formData.append('subject', template.subject);
            // Convert newlines to HTML breaks for email body
            formData.append('body', template.body.replace(/\n/g, '<br>'));
            
            await api.post('/mail/send', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // 2. Update status and trigger notifications
            await api.post(`/rm/applications/${applicationId}/reject`, {
                rejection_reason: 'Rejected via Email Template'
            });
            
            onRejectSuccess();
        } catch (err: any) {
            console.error('Rejection failed:', err);
            setError(err.message || 'Failed to reject candidate. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                />
                
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-red-50/30">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold tracking-tight text-slate-900">Reject Candidate</h3>
                                <p className="text-sm font-medium text-slate-500">
                                    {candidateName} • {jobRole}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto hidden-scrollbar">
                        {error && (
                            <div className="mb-6 p-4 rounded-2xl bg-red-50 text-red-600 text-sm font-medium border border-red-100 flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                                {error}
                            </div>
                        )}

                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                                    Email Subject
                                </label>
                                <input
                                    type="text"
                                    value={template.subject}
                                    onChange={(e) => setTemplate({ ...template, subject: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-red-500 focus:ring-4 focus:ring-red-500/20 text-slate-900 font-medium transition-all outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                                    Message Template (Editable)
                                </label>
                                <textarea
                                    value={template.body}
                                    onChange={(e) => setTemplate({ ...template, body: e.target.value })}
                                    rows={10}
                                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-red-500 focus:ring-4 focus:ring-red-500/20 text-slate-900 font-medium transition-all outline-none resize-none leading-relaxed"
                                />
                            </div>
                        </div>
                        
                        <div className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0 text-slate-500">
                                <Send className="w-4 h-4" />
                            </div>
                            <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                This will automatically send the email template above to {candidateEmail}, change the candidate's status to Rejected, and notify the Hiring Manager.
                            </p>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3 shrink-0">
                        <button
                            onClick={onClose}
                            disabled={isLoading}
                            className="flex-1 px-4 py-3 text-slate-600 font-bold bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl transition-all disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleReject}
                            disabled={isLoading || !template.subject.trim() || !template.body.trim()}
                            className="flex-1 px-4 py-3 text-white font-bold bg-red-600 hover:bg-red-700 active:scale-[0.98] rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:active:scale-100 shadow-xl shadow-red-600/20"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Send className="w-5 h-5 relative -left-1" />
                                    Send & Reject
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

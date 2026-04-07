import React, { useState } from 'react';
import { X, Send, Upload, AlertCircle, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/Button';
import { api } from '../api/client';

interface SendAssessmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    applicationId: number;
    candidateName: string;
    onSuccess?: () => void;
}

export const SendAssessmentModal: React.FC<SendAssessmentModalProps> = ({ 
    isOpen, 
    onClose, 
    applicationId, 
    candidateName,
    onSuccess 
}) => {
    const [title, setTitle] = useState('');
    const [instructions, setInstructions] = useState('');
    const [deadline, setDeadline] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSending(true);
        setError('');

        try {
            let file_path = '';
            if (file) {
                const formData = new FormData();
                formData.append('file', file);
                const uploadRes = await api.post('/files/upload', formData);
                file_path = uploadRes.data.object_key;
            }

            await api.post('/rm/assessments/send', {
                application_id: applicationId,
                title,
                instructions,
                file_path,
                deadline: deadline ? new Date(deadline).toISOString() : null
            });

            onSuccess?.();
            onClose();
            // Reset form
            setTitle('');
            setInstructions('');
            setDeadline('');
            setFile(null);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to send assessment. Please try again.');
        } finally {
            setIsSending(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-[110]">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="bg-white rounded-[32px] w-full max-w-xl overflow-hidden shadow-2xl border border-slate-100"
                    >
                        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Send Assessment</h3>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Assigning task to {candidateName}</p>
                            </div>
                            <Button variant="ghost" onClick={onClose} className="rounded-full w-10 h-10 p-0 hover:bg-white hover:shadow-sm">
                                <X className="w-5 h-5 text-slate-400" />
                            </Button>
                        </div>

                        <form onSubmit={handleSend} className="p-8 space-y-6">
                            {error && (
                                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-600">
                                    <AlertCircle className="w-5 h-5 shrink-0" />
                                    <p className="text-xs font-bold leading-relaxed">{error}</p>
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Assessment Title</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="e.g. Backend Assignment, Frontend Task"
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-semibold outline-none focus:bg-white focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all shadow-inner"
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Instructions (Optional)</label>
                                    <textarea
                                        rows={4}
                                        placeholder="Add any specific instructions or requirements here..."
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-semibold outline-none focus:bg-white focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all shadow-inner resize-none"
                                        value={instructions}
                                        onChange={e => setInstructions(e.target.value)}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Deadline</label>
                                        <input
                                            type="datetime-local"
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-semibold outline-none focus:bg-white focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all shadow-inner"
                                            value={deadline}
                                            onChange={e => setDeadline(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Reference File (PDF)</label>
                                        <label className="flex items-center justify-center gap-2 w-full bg-slate-50 border border-slate-100 border-dashed rounded-2xl px-5 py-4 text-sm font-semibold cursor-pointer hover:bg-slate-100 transition-all group">
                                            <input type="file" className="hidden" accept=".pdf" onChange={handleFileChange} />
                                            {file ? (
                                                <div className="flex items-center gap-2 text-primary-600 truncate">
                                                    <FileText className="w-4 h-4 shrink-0" />
                                                    <span className="truncate max-w-[120px]">{file.name}</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 text-slate-400 group-hover:text-slate-600">
                                                    <Upload className="w-4 h-4" />
                                                    <span>Upload PDF</span>
                                                </div>
                                            )}
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-4">
                                <Button variant="ghost" type="button" onClick={onClose} className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest border border-slate-100">
                                    Cancel
                                </Button>
                                <Button 
                                    className="flex-[1.5] h-14 rounded-2xl font-black uppercase tracking-widest bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-200 gap-2"
                                    type="submit"
                                    isLoading={isSending}
                                >
                                    {isSending ? 'Sending...' : 'Send Assessment'} <Send className="w-4 h-4" />
                                </Button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

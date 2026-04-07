import React, { useState, useRef, useEffect } from 'react';
import { 
    X, 
    Send, 
    Paperclip, 
    Trash2, 
    Maximize2, 
    Minus,
    MessageSquare,
    MoreVertical,
    AlertCircle,
    CheckCircle2,
    Loader2,
    FileJson,
    Lock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/Button';
import { api } from '../api/client';
import { cn } from '../utils/cn';

interface EmailComposerModalProps {
    isOpen: boolean;
    onClose: () => void;
    candidateEmail: string;
    candidateName: string;
    currentUserEmail: string;
}

export const EmailComposerModal: React.FC<EmailComposerModalProps> = ({
    isOpen,
    onClose,
    candidateEmail,
    candidateName,
    currentUserEmail
}) => {
    const { user } = useAuth();
    const [to, setTo] = useState(candidateEmail);
    const [subject, setSubject] = useState(`Regarding your application - ${candidateName}`);
    const [body, setBody] = useState('');
    const [cc, setCc] = useState('');
    const [bcc, setBcc] = useState('');
    const [showCc, setShowCc] = useState(false);
    const [attachments, setAttachments] = useState<File[]>([]);
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [showTemplates, setShowTemplates] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const bodyRef = useRef<HTMLTextAreaElement>(null);

    const TEMPLATES = [
        {
            name: 'Interview Invitation',
            subject: `Interview Invitation: ${candidateName} x HireStream`,
            body: `Hi ${candidateName},\n\nI hope you're having a great week.\n\nOur team was impressed with your background and would love to invite you to a formal interview. We'd like to discuss your experience and how it aligns with our current needs.\n\nPlease let us know your availability for a 30-minute call later this week.\n\nBest regards,\nRecruitment Team`
        },
        {
            name: 'Offer Letter',
            subject: `Job Offer: Congratulations ${candidateName}!`,
            body: `Dear ${candidateName},\n\nWe are thrilled to offer you a position at HireStream! After meeting with the team, we are confident that your skills and perspective will be a fantastic addition to our company.\n\nPlease find the attached offer details and next steps. We look forward to having you onboard!\n\nCheers,\nHR Department`
        },
        {
            name: 'Application Update (Rejection)',
            subject: `Update regarding your application - ${candidateName}`,
            body: `Hi ${candidateName},\n\nThank you for giving us the opportunity to review your profile. While your background is impressive, we've decided to move forward with other candidates who more closely match our current requirements.\n\nWe will keep your details in our talent pool for future openings that might be a better fit.\n\nWe wish you the best in your career journey.\n\nWarmly,\nRecruitment Team`
        }
    ];

    const applyTemplate = (tpl: typeof TEMPLATES[0]) => {
        setSubject(tpl.subject);
        setBody(tpl.body);
        setShowTemplates(false);
    };

    useEffect(() => {
        if (isOpen) {
            setSuccess(false);
            setError(null);
            setTo(candidateEmail);
            setSubject(`Regarding your application - ${candidateName}`);
        }
    }, [isOpen, candidateEmail, candidateName]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
        }
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handleSend = async () => {
        if (!to || !subject || !body) {
            setError('Please fill in all required fields');
            return;
        }

        setIsSending(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('to', to);
            formData.append('subject', subject);
            formData.append('body', body);
            if (cc) formData.append('cc', cc);
            if (bcc) formData.append('bcc', bcc);
            
            attachments.forEach(file => {
                formData.append('attachments', file);
            });

            await api.post('/mail/send', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            setSuccess(true);
            setTimeout(() => {
                onClose();
                setSuccess(false);
                setBody('');
                setAttachments([]);
            }, 2000);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to send email. Please try again.');
        } finally {
            setIsSending(false);
        }
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.files) {
            setAttachments(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
        }
    };

    if (!isOpen) return null;

    const isGoogleConnected = (user as any)?.has_google_connected;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 100, scale: 0.95 }}
                animate={{ 
                    opacity: 1, 
                    y: 0,
                    scale: 1,
                    height: isMinimized ? '48px' : 'auto',
                    width: isMinimized ? '300px' : 'min(640px, 95vw)',
                    bottom: '20px',
                    right: '20px'
                }}
                exit={{ opacity: 0, y: 100, scale: 0.95 }}
                className={cn(
                    "fixed z-[200] bg-white shadow-2xl rounded-xl overflow-hidden border border-slate-200 flex flex-col transition-all duration-300",
                    isMinimized ? "rounded-b-xl" : ""
                )}
                style={{ 
                    maxHeight: 'calc(100vh - 40px)',
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
            >
                {/* Header */}
                <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between cursor-pointer shrink-0"
                     onClick={() => isMinimized && setIsMinimized(false)}>
                    <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-primary-400" />
                        <span className="text-sm font-bold truncate">
                            {isMinimized ? `Draft: ${subject || 'New Message'}` : 'New Message'}
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        <button onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }} className="p-1 hover:bg-white/10 rounded transition-colors">
                            {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-1 hover:bg-white/10 rounded transition-colors">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                {!isMinimized && !isGoogleConnected && user?.role !== 'resource_manager' && (
                    <div className="flex-1 flex flex-col items-center justify-center p-10 text-center space-y-6">
                        <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center text-primary-600 font-black">
                            <Lock className="w-10 h-10" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold text-slate-900">Google Account Required</h3>
                            <p className="text-sm text-slate-500 max-w-sm mx-auto">To send professional emails via your company Gmail account, you must first authorize HireStream.</p>
                        </div>
                        <a 
                            href={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/auth/google/login?role=${user?.role}`}
                            className="btn-primary-modern h-12 px-10 flex items-center gap-2 font-bold no-underline"
                        >
                            <CheckCircle2 className="w-4 h-4" /> Connect My Google Account
                        </a>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                            Secured by OAuth 2.0 · We only access Gmail Send permissions
                        </p>
                    </div>
                )}

                {!isMinimized && (isGoogleConnected || user?.role === 'resource_manager') && (
                    <>
                        <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
                            {/* Recipient Fields */}
                            <div className="flex flex-col border-b border-slate-100 shrink-0">
                                <div className="flex items-center px-4 py-2 bg-slate-50 border-b border-slate-100">
                                    <span className="text-xs font-bold text-slate-400 w-12">From</span>
                                    <span className="text-xs font-semibold text-slate-600">{currentUserEmail}</span>
                                </div>
                                
                                <div className="flex items-center px-4 py-2 group">
                                    <span className="text-xs font-bold text-slate-400 w-12 group-focus-within:text-primary-600">To</span>
                                    <input 
                                        type="email" 
                                        className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-slate-700" 
                                        value={to}
                                        onChange={e => setTo(e.target.value)}
                                    />
                                    <button 
                                        onClick={() => setShowTemplates(!showTemplates)}
                                        className="text-[10px] font-bold text-primary-600 hover:text-primary-800 px-2 flex items-center gap-1"
                                    >
                                        <FileJson className="w-3 h-3" /> Templates
                                    </button>
                                    <button 
                                        onClick={() => setShowCc(!showCc)}
                                        className="text-[10px] font-bold text-slate-400 hover:text-slate-600 px-2"
                                    >
                                        Cc/Bcc
                                    </button>
                                </div>

                                {showTemplates && (
                                    <div className="px-4 py-3 bg-primary-50 border-b border-primary-100 flex flex-wrap gap-2">
                                        {TEMPLATES.map(tpl => (
                                            <button 
                                                key={tpl.name}
                                                onClick={() => applyTemplate(tpl)}
                                                className="px-3 py-1.5 bg-white border border-primary-200 rounded-lg text-[10px] font-bold text-primary-700 hover:bg-primary-600 hover:text-white transition-all shadow-sm"
                                            >
                                                {tpl.name}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {showCc && (
                                    <motion.div 
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        className="flex flex-col border-t border-slate-50"
                                    >
                                        <div className="flex items-center px-4 py-2 border-b border-slate-50">
                                            <span className="text-xs font-bold text-slate-400 w-12">Cc</span>
                                            <input 
                                                type="text" 
                                                className="flex-1 bg-transparent border-none outline-none text-sm text-slate-600" 
                                                value={cc}
                                                onChange={e => setCc(e.target.value)}
                                                placeholder="Recipient emails..."
                                            />
                                        </div>
                                        <div className="flex items-center px-4 py-2">
                                            <span className="text-xs font-bold text-slate-400 w-12">Bcc</span>
                                            <input 
                                                type="text" 
                                                className="flex-1 bg-transparent border-none outline-none text-sm text-slate-600" 
                                                value={bcc}
                                                onChange={e => setBcc(e.target.value)}
                                                placeholder="Recipient emails..."
                                            />
                                        </div>
                                    </motion.div>
                                )}

                                <div className="flex items-center px-4 py-2 border-t border-slate-100 group">
                                    <span className="text-xs font-bold text-slate-400 w-12 group-focus-within:text-primary-600">Subject</span>
                                    <input 
                                        type="text" 
                                        className="flex-1 bg-transparent border-none outline-none text-sm font-bold text-slate-900" 
                                        value={subject}
                                        onChange={e => setSubject(e.target.value)}
                                        placeholder="Enter subject line"
                                    />
                                </div>
                            </div>

                            {/* Compose Area */}
                            <div className="flex-1 bg-white relative flex flex-col">
                                <textarea 
                                    ref={bodyRef}
                                    className="w-full flex-1 min-h-[300px] p-6 text-sm text-slate-700 outline-none resize-none leading-relaxed"
                                    placeholder={`Hi ${candidateName},\n\nI hope this email finds you well...`}
                                    value={body}
                                    onChange={e => setBody(e.target.value)}
                                />
                                
                                {/* Attachments Preview */}
                                {attachments.length > 0 && (
                                    <div className="px-6 py-3 border-t border-slate-50 flex flex-wrap gap-2 bg-white sticky bottom-0">
                                        {attachments.map((file, i) => (
                                            <div key={i} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 group hover:border-primary-300 transition-colors">
                                                <Paperclip className="w-3 h-3 text-slate-400" />
                                                <span className="text-[10px] font-bold text-slate-600 truncate max-w-[120px]">{file.name}</span>
                                                <span className="text-[9px] text-slate-400">({(file.size / 1024).toFixed(1)} KB)</span>
                                                <button onClick={() => removeAttachment(i)} className="p-0.5 hover:bg-red-50 hover:text-red-500 rounded text-slate-400">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Formatting Bar */}
                        <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-1">
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-3 text-slate-500 hover:text-primary-600 hover:bg-white rounded-xl transition-all border border-transparent hover:border-slate-200 shadow-sm flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest"
                                >
                                    <Paperclip className="w-4 h-4" /> Add Attachment
                                </button>
                            </div>
                            <div className="flex items-center gap-2">
                                <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded transition-colors"><MoreVertical className="w-4 h-4" /></button>
                                <button 
                                    onClick={() => {
                                        if (confirm('Clear entire draft and attachments?')) {
                                            setBody('');
                                            setAttachments([]);
                                        }
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Footer / Send Button */}
                        <div className="px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <Button 
                                    disabled={isSending || success}
                                    onClick={handleSend}
                                    className="bg-primary-600 hover:bg-primary-700 text-white rounded-lg h-10 px-6 font-bold shadow-lg shadow-primary-200 flex items-center gap-2"
                                >
                                    {isSending ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : success ? (
                                        <CheckCircle2 className="w-4 h-4" />
                                    ) : (
                                        <Send className="w-4 h-4" />
                                    )}
                                    {isSending ? 'Sending...' : success ? 'Sent!' : 'Send Email'}
                                </Button>
                                {success && (
                                    <motion.p 
                                        initial={{ opacity: 0, x: -10 }} 
                                        animate={{ opacity: 1, x: 0 }} 
                                        className="text-emerald-600 text-xs font-bold"
                                    >
                                        Message reached candidate inbox
                                    </motion.p>
                                )}
                                {error && (
                                    <div className="flex items-center gap-1.5 text-red-500 text-xs font-bold">
                                        <AlertCircle className="w-3.5 h-3.5" />
                                        <span>{error}</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-1">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mr-2">Secure Gmail Loop</p>
                                <div className="w-2 h-2 rounded-full bg-emerald-500 pulse" />
                            </div>
                        </div>
                    </>
                )}

                <input 
                    type="file" 
                    multiple 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleFileChange}
                />
            </motion.div>
        </AnimatePresence>
    );
};

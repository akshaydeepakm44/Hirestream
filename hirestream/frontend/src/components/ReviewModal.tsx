import React, { useState } from 'react';
import { Star, MessageSquare, X, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/Button';
import { api } from '../api/client';
import { cn } from '../utils/cn';

interface ReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    interviewId: number;
    candidateName: string;
    onSuccess: () => void;
    initialRating?: number;
    initialFeedback?: string;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
    isOpen,
    onClose,
    interviewId,
    candidateName,
    onSuccess,
    initialRating = 0,
    initialFeedback = ''
}) => {
    const [rating, setRating] = useState(initialRating);
    const [hover, setHover] = useState(0);
    const [feedback, setFeedback] = useState(initialFeedback);

    React.useEffect(() => {
        setRating(initialRating);
        setFeedback(initialFeedback);
    }, [initialRating, initialFeedback]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (rating === 0) {
            setError('Please provide a rating');
            return;
        }
        if (!feedback.trim()) {
            setError('Please provide feedback');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            await api.post(`/interviews/${interviewId}/review`, {
                rating,
                feedback
            });
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to submit review');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100"
                >
                    {/* Header */}
                    <div className="bg-slate-50 px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">Post-Interview Evaluation</h3>
                            <p className="text-sm font-medium text-slate-500 mt-1">Reviewing: <span className="text-primary-600 font-bold">{candidateName}</span></p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 group">
                            <X className="w-5 h-5 group-hover:text-slate-900" />
                        </button>
                    </div>

                    <div className="p-8 space-y-8">
                        {/* Rating */}
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Star className="w-3 h-3" /> Technical & Cultural Rating
                            </label>
                            <div className="flex items-center gap-3">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() => setRating(star)}
                                        onMouseEnter={() => setHover(star)}
                                        onMouseLeave={() => setHover(0)}
                                        className="transition-all duration-200 transform hover:scale-110 focus:outline-none"
                                    >
                                        <Star 
                                            className={cn(
                                                "w-10 h-10 transition-colors",
                                                (hover || rating) >= star 
                                                    ? "fill-amber-400 text-amber-400" 
                                                    : "text-slate-200"
                                            )}
                                        />
                                    </button>
                                ))}
                                <span className="ml-4 text-lg font-black text-slate-900">{rating > 0 ? `${rating}/5` : '—'}</span>
                            </div>
                        </div>

                        {/* Feedback */}
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <MessageSquare className="w-3 h-3" /> Detailed Feedback
                            </label>
                            <textarea
                                className="w-full h-40 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-medium text-slate-700 outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all placeholder:text-slate-400 placeholder:font-medium"
                                placeholder="E.g. Strong system design knowledge, excellent communication, but need more experience with cloud infra..."
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                            />
                        </div>

                        {error && (
                            <p className="text-xs font-bold text-red-500 flex items-center gap-2 bg-red-50 p-4 rounded-xl border border-red-100">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                {error}
                            </p>
                        )}

                        <div className="pt-4 flex gap-3">
                            <Button 
                                variant="outline" 
                                onClick={onClose}
                                className="flex-1 h-14 rounded-2xl font-bold text-slate-600 border-slate-200"
                            >
                                Not Now
                            </Button>
                            <Button 
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="flex-[2] btn-primary-modern h-14 rounded-2xl font-bold shadow-xl shadow-primary-500/20"
                            >
                                {isSubmitting ? 'Submitting...' : (
                                    <>Submit Evaluation <CheckCircle2 className="w-5 h-5 ml-2" /></>
                                )}
                            </Button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

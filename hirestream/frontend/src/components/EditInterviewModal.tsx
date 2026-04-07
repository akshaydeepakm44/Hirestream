import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { Calendar, Clock, Link as LinkIcon, Video, AlignLeft, X } from 'lucide-react';
import { api } from '../api/client';
import { motion, AnimatePresence } from 'framer-motion';

interface EditInterviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    interview: {
        id: number;
        candidate_name: string;
        requisition_title: string;
        scheduled_at: string;
        mode: string;
        location_or_link: string | null;
        notes: string | null;
        duration_minutes: number;
    } | null;
}

export const EditInterviewModal: React.FC<EditInterviewModalProps> = ({ isOpen, onClose, onSuccess, interview }) => {
    const [formData, setFormData] = useState({
        scheduled_at: '',
        mode: 'online',
        location_or_link: '',
        duration_minutes: 30,
        notes: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (interview) {
            // Format datetime-local for input
            const date = new Date(interview.scheduled_at);
            const formattedDate = date.toISOString().slice(0, 16);
            
            setFormData({
                scheduled_at: formattedDate,
                mode: interview.mode || 'online',
                location_or_link: interview.location_or_link || '',
                duration_minutes: interview.duration_minutes || 30,
                notes: interview.notes || ''
            });
        }
    }, [interview]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!interview) return;
        
        setIsSubmitting(true);
        setError('');
        
        try {
            await api.patch(`/interviews/${interview.id}`, formData);
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to update interview. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen || !interview) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Edit Interview</h3>
                            <p className="text-sm text-slate-500 font-medium mt-1">Adjust schedule for <span className="font-bold text-slate-900">{interview.candidate_name}</span></p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                            <X className="w-6 h-6 text-slate-400" />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto">
                        {error && (
                            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold">
                                {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="group">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block group-focus-within:text-primary-500 transition-colors">Date & Time</label>
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
                                    <input 
                                        type="datetime-local" 
                                        required
                                        value={formData.scheduled_at}
                                        onChange={e => setFormData({ ...formData, scheduled_at: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-semibold outline-none focus:bg-white focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="group">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block group-focus-within:text-primary-500 transition-colors">Duration (min)</label>
                                    <div className="relative">
                                        <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
                                        <input 
                                            type="number" 
                                            required
                                            min="15"
                                            step="15"
                                            value={formData.duration_minutes}
                                            onChange={e => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-semibold outline-none focus:bg-white focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all"
                                        />
                                    </div>
                                </div>
                                <div className="group">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block group-focus-within:text-primary-500 transition-colors">Mode</label>
                                    <div className="relative">
                                        <Video className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
                                        <select 
                                            value={formData.mode}
                                            onChange={e => setFormData({ ...formData, mode: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-semibold outline-none appearance-none focus:bg-white focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all"
                                        >
                                            <option value="online">Online</option>
                                            <option value="offline">Offline</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="group">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block group-focus-within:text-primary-500 transition-colors">Location / Meeting Link</label>
                                <div className="relative">
                                    <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
                                    <input 
                                        type="text" 
                                        placeholder="Add meeting link or office location"
                                        value={formData.location_or_link}
                                        onChange={e => setFormData({ ...formData, location_or_link: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-semibold outline-none focus:bg-white focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="group">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block group-focus-within:text-primary-500 transition-colors">Internal Notes</label>
                                <div className="relative">
                                    <AlignLeft className="absolute left-4 top-4 w-4 h-4 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
                                    <textarea 
                                        placeholder="Specific instructions for panel members..."
                                        rows={3}
                                        value={formData.notes}
                                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-semibold outline-none focus:bg-white focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all resize-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4 pt-4">
                            <Button 
                                type="button"
                                variant="ghost" 
                                onClick={onClose}
                                className="flex-1 h-14 font-bold text-slate-500 hover:bg-slate-50 rounded-2xl"
                            >
                                Cancel
                            </Button>
                            <Button 
                                type="submit" 
                                isLoading={isSubmitting}
                                className="flex-1 h-14 bg-primary-600 hover:bg-primary-700 text-white font-black rounded-2xl shadow-xl shadow-primary-500/20"
                            >
                                Update Schedule
                            </Button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

import React, { useState, useEffect, useRef } from 'react';
import { 
    X, 
    Calendar as CalendarIcon, 
    Clock, 
    Video, 
    Users, 
    CheckCircle2,
    AlertCircle,
    Plus,
    FileText,
    Search,
    UserPlus,
    Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/Button';
import { api } from '../api/client';
import { cn } from '../utils/cn';

interface StaffUser {
    id: number;
    full_name: string;
    email: string;
    role: 'hiring_manager' | 'resource_manager';
}

interface ParticipantTag {
    email: string;
    name: string;
    role?: string;
    isManual?: boolean;
}

interface MeetingSchedulerModalProps {
    isOpen: boolean;
    onClose: () => void;
    applicationId: number;
    candidateName: string;
    candidateEmail: string;
    onSuccess?: () => void;
}

export const MeetingSchedulerModal: React.FC<MeetingSchedulerModalProps> = ({
    isOpen,
    onClose,
    applicationId,
    candidateName,
    candidateEmail,
    onSuccess
}) => {
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [duration, setDuration] = useState('30');
    const [notes, setNotes] = useState('');
    const [participants, setParticipants] = useState<ParticipantTag[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<StaffUser[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setSuccess(false);
            setError(null);
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            setDate(tomorrow.toISOString().split('T')[0]);
            setTime('10:00');
            setParticipants([]);
            setSearchQuery('');
            setSearchResults([]);
        }
    }, [isOpen]);

    // Live search with debounce
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchQuery.length < 1) {
                setSearchResults([]);
                setShowDropdown(false);
                return;
            }
            setIsSearching(true);
            try {
                const res = await api.get(`/users/search-staff?q=${encodeURIComponent(searchQuery)}`);
                const filtered = res.data.filter((u: StaffUser) => 
                    !participants.some(p => p.email === u.email)
                );
                setSearchResults(filtered);
                setShowDropdown(true);
            } catch {
                // If search fails, allow manual email entry
                setSearchResults([]);
                setShowDropdown(false);
            } finally {
                setIsSearching(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, participants]);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const addParticipantFromSearch = (user: StaffUser) => {
        setParticipants(prev => [...prev, { email: user.email, name: user.full_name, role: user.role }]);
        setSearchQuery('');
        setShowDropdown(false);
    };

    const addParticipantManually = () => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const trimmed = searchQuery.trim();
        if (trimmed && emailRegex.test(trimmed) && !participants.some(p => p.email === trimmed)) {
            setParticipants(prev => [...prev, { email: trimmed, name: trimmed, isManual: true }]);
            setSearchQuery('');
            setShowDropdown(false);
            setError(null);
        } else if (!emailRegex.test(trimmed)) {
            setError("Please enter a valid email address or select a user from search");
        }
    };

    const removeParticipant = (email: string) => {
        setParticipants(prev => prev.filter(p => p.email !== email));
    };

    const validate = () => {
        if (!date || !time) return "Date and time are required";
        const selectedTime = new Date(`${date}T${time}`);
        if (selectedTime < new Date()) return "Cannot schedule meetings in the past";
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const validationError = validate();
        if (validationError) {
            setError(validationError);
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const scheduledAt = new Date(`${date}T${time}`).toISOString();
            const payload = {
                application_id: applicationId,
                scheduled_at: scheduledAt,
                mode: 'online',
                location_or_link: '',
                duration_minutes: parseInt(duration),
                notes,
                participants: participants.map(p => p.email)
            };

            console.log('--- MEETING SCHEDULER: API REQUEST BODY ---');
            console.log(JSON.stringify(payload, null, 2));
            
            await api.post('/interviews', payload);

            setSuccess(true);
            setTimeout(() => {
                onSuccess?.();
                onClose();
            }, 2500);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to schedule meeting. Please verify calendar permissions.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const roleLabel = (role?: string) => {
        if (role === 'resource_manager') return 'RM';
        if (role === 'hiring_manager') return 'HM';
        return null;
    };

    const roleColor = (role?: string) => {
        if (role === 'resource_manager') return 'bg-violet-100 text-violet-700';
        if (role === 'hiring_manager') return 'bg-blue-100 text-blue-700';
        return 'bg-slate-100 text-slate-600';
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[200]">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-white rounded-[24px] w-full max-w-[540px] shadow-2xl overflow-hidden border border-white"
                >
                    {/* Header */}
                    <div className="bg-slate-900 px-8 py-6 text-white relative">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center">
                                <CalendarIcon className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold tracking-tight">Schedule Interview</h2>
                                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Candidate: {candidateName}</p>
                            </div>
                        </div>
                        <button 
                            onClick={onClose}
                            className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto">
                        {error && (
                            <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-xs font-bold">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {success && (
                            <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-[20px] space-y-3">
                                <div className="flex items-center gap-3 text-emerald-600 text-sm font-black">
                                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                                    <span>All Participants Invited Successfully!</span>
                                </div>
                                <div className="pl-8 space-y-1">
                                    <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-widest opacity-70">Notified Attendees:</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[9px] font-black">{candidateEmail} (Candidate)</span>
                                        {participants.map(p => (
                                            <span key={p.email} className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[9px] font-black">
                                                {p.name} {p.role ? `(${roleLabel(p.role)})` : ''}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label>
                                <div className="relative group">
                                    <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary-500" />
                                    <input 
                                        type="date" 
                                        required
                                        value={date}
                                        onChange={e => setDate(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-12 pr-4 py-3 text-sm font-bold outline-none focus:bg-white focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Time (Local)</label>
                                <div className="relative group">
                                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary-500" />
                                    <input 
                                        type="time" 
                                        required
                                        value={time}
                                        onChange={e => setTime(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-12 pr-4 py-3 text-sm font-bold outline-none focus:bg-white focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Duration</label>
                                <select 
                                    value={duration}
                                    onChange={e => setDuration(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:bg-white focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all appearance-none cursor-pointer"
                                >
                                    <option value="15">15 Minutes</option>
                                    <option value="30">30 Minutes</option>
                                    <option value="45">45 Minutes</option>
                                    <option value="60">1 Hour</option>
                                    <option value="90">1.5 Hours</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mode</label>
                                <div className="flex bg-slate-50 p-1.5 rounded-xl border border-slate-100">
                                    <div className="flex-1 flex items-center justify-center gap-2 py-2 bg-white shadow-sm text-primary-600 rounded-lg font-bold text-xs">
                                        <Video className="w-4 h-4" />
                                        <span>Google Meet</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* --- Participants Section with Live Search --- */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center justify-between">
                                <span className="flex items-center gap-1.5"><UserPlus className="w-3.5 h-3.5" /> Add Panel Members</span>
                                <span className="text-[8px] opacity-60 font-bold">All tagged members will be notified</span>
                            </label>

                            {/* Always-visible: candidate chip */}
                            <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg text-[10px] font-bold border border-emerald-100">
                                    <Users className="w-3 h-3" />
                                    <span className="truncate max-w-[150px]">{candidateName}</span>
                                    <span className="bg-emerald-200 text-emerald-800 px-1 py-0.5 rounded text-[8px] font-black uppercase">Candidate</span>
                                </div>
                                {participants.map(p => (
                                    <div 
                                        key={p.email} 
                                        className="flex items-center gap-1.5 bg-primary-50 text-primary-700 px-3 py-1.5 rounded-lg text-[10px] font-bold border border-primary-100 group hover:bg-red-50 hover:text-red-700 hover:border-red-100 cursor-pointer transition-all"
                                        onClick={() => removeParticipant(p.email)}
                                    >
                                        <span className="truncate max-w-[130px]">{p.name}</span>
                                        {p.role && (
                                            <span className={cn("px-1 py-0.5 rounded text-[8px] font-black uppercase", roleColor(p.role))}>
                                                {roleLabel(p.role)}
                                            </span>
                                        )}
                                        <X className="w-2.5 h-2.5 shrink-0 transition-transform group-hover:scale-125" />
                                    </div>
                                ))}
                            </div>

                            {/* Search input with live dropdown */}
                            <div ref={searchRef} className="relative">
                                <div className="relative group">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary-500" />
                                    <input 
                                        type="text"
                                        placeholder="Search by name, email, or role... (or type email to add manually)"
                                        value={searchQuery}
                                        onChange={e => { setSearchQuery(e.target.value); setError(null); }}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') { e.preventDefault(); addParticipantManually(); }
                                        }}
                                        onFocus={() => searchQuery.length > 0 && setShowDropdown(true)}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-12 pr-4 py-3 text-sm font-bold outline-none focus:bg-white focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all"
                                    />
                                    {isSearching && (
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                                    )}
                                </div>

                                <AnimatePresence>
                                    {showDropdown && searchResults.length > 0 && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -8 }}
                                            className="absolute z-50 mt-2 w-full bg-white border border-slate-100 rounded-2xl shadow-2xl overflow-hidden"
                                        >
                                            <div className="p-2 space-y-0.5">
                                                {searchResults.map(user => (
                                                    <button
                                                        key={user.id}
                                                        type="button"
                                                        onClick={() => addParticipantFromSearch(user)}
                                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left group"
                                                    >
                                                        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600 font-bold text-xs shrink-0 group-hover:bg-primary-100 group-hover:text-primary-600 transition-colors">
                                                            {user.full_name.charAt(0)}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-bold text-slate-900 truncate">{user.full_name}</p>
                                                            <p className="text-[10px] text-slate-500 font-medium truncate">{user.email}</p>
                                                        </div>
                                                        <span className={cn("px-2 py-1 rounded-lg text-[9px] font-black uppercase shrink-0", roleColor(user.role))}>
                                                            {roleLabel(user.role)}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="border-t border-slate-50 p-2">
                                                <button
                                                    type="button"
                                                    onClick={addParticipantManually}
                                                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors text-[10px] font-bold text-slate-500"
                                                >
                                                    <Plus className="w-3.5 h-3.5" />
                                                    Add "{searchQuery}" manually
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Meeting Notes</label>
                            <div className="relative group">
                                <FileText className="absolute left-4 top-4 w-4 h-4 text-slate-400 group-focus-within:text-primary-500" />
                                <textarea 
                                    placeholder="Add preparation notes or instructions for the candidate..."
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-12 pr-4 py-4 text-sm font-bold outline-none focus:bg-white focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all h-24 resize-none"
                                />
                            </div>
                        </div>

                        {participants.length > 0 && !success && (
                            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-[10px] font-bold text-blue-700 flex items-start gap-2">
                                <Shield className="w-4 h-4 shrink-0 mt-0.5" />
                                <div>
                                    <span className="font-black uppercase tracking-widest">All {participants.length + 1} participant(s) will receive:</span>
                                    <span className="block text-blue-600 font-medium mt-0.5">In-app notification • Google Calendar invite (if connected) • Meeting link</span>
                                </div>
                            </div>
                        )}

                        <Button 
                            type="submit" 
                            isLoading={isSubmitting}
                            disabled={success}
                            className="w-full h-14 rounded-2xl text-md font-black shadow-xl shadow-primary-500/20"
                        >
                            {success ? (
                                <>Scheduled <CheckCircle2 className="w-5 h-5 ml-2" /></>
                            ) : (
                                <>Confirm & Notify All Participants <CalendarIcon className="w-5 h-5 ml-2" /></>
                            )}
                        </Button>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

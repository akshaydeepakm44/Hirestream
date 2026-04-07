import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
    Settings, Bell, Briefcase, 
    CheckCircle, Loader2, Save, Trash2, Key, AlertCircle, Lock,
    Mail, Send, X
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { motion, AnimatePresence } from 'framer-motion';

export const CandidateSettingsPage = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [settings, setSettings] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('notifications');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    
    // Support Modal State
    const [isSupportOpen, setIsSupportOpen] = useState(false);
    const [supportMessage, setSupportMessage] = useState('');

    // Deactivation Modal State
    const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
    
    // Password State
    const [passwords, setPasswords] = useState({
        current: '',
        new: '',
        confirm: ''
    });
    const [passwordError, setPasswordError] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }

        const fetchSettings = async () => {
            setLoading(true);
            try {
                const res = await api.get('/candidate/settings');
                setSettings(res.data);
            } catch (err: any) {
                console.error('Fetch settings error:', err);
                setSettings({
                    notifications: { application_updates: true, interview_notifications: true },
                    job_preferences: { preferred_role: '', preferred_location: '', employment_type: 'Full-Time' },
                    dashboard: { default_view: 'Grid', items_per_page: 10 }
                });
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, [user, navigate]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.put('/candidate/settings', settings);
            setMessage({ type: 'success', text: 'Settings Saved Successfully' });
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to save settings' });
        } finally {
            setSaving(false);
            setTimeout(() => setMessage(null), 3000);
        }
    };

    const handlePasswordChange = async () => {
        if (!passwords.current || !passwords.new || !passwords.confirm) {
            setPasswordError('All fields are required');
            return;
        }
        if (passwords.new !== passwords.confirm) {
            setPasswordError('Passwords do not match');
            return;
        }
        if (passwords.new.length < 8) {
            setPasswordError('Password must be at least 8 characters');
            return;
        }

        setPasswordLoading(true);
        setPasswordError('');
        try {
            await api.post('/auth/change-password', {
                current_password: passwords.current,
                new_password: passwords.new
            });
            setMessage({ type: 'success', text: 'Password Updated Successfully' });
            setPasswords({ current: '', new: '', confirm: '' });
        } catch (err: any) {
            setPasswordError(err.response?.data?.detail || 'Failed to update password');
            setMessage({ type: 'error', text: 'Password Update Failed' });
        } finally {
            setPasswordLoading(false);
            setTimeout(() => setMessage(null), 3000);
        }
    };

    const handleDeactivate = async () => {
        setSaving(true);
        try {
            await api.delete('/auth/account');
            logout();
            navigate('/login');
        } catch (err) {
            console.error('Deactivation error:', err);
            setMessage({ type: 'error', text: 'Termination Failed' });
        } finally {
            setSaving(false);
            setIsDeactivateOpen(false);
        }
    };

    if (loading) return <div className="p-8 flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>;

    const tabs = [
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'preferences', label: 'Job Preferences', icon: Briefcase },
        { id: 'security', label: 'Security & Access', icon: Key }
    ];

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-10 pb-32">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center border border-indigo-100 shadow-sm">
                             <Settings className="w-6 h-6 text-indigo-500" />
                        </div>
                        Candidate Settings
                    </h1>
                    <p className="text-xs text-slate-400 font-black uppercase tracking-widest mt-2 ml-1">Configure your professional identity & signal status</p>
                </div>
                <div className="flex items-center gap-4">
                    <button 
                        onClick={handleSave}
                        disabled={saving}
                        className="px-10 py-4 bg-primary-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary-700 transition-all shadow-xl shadow-primary-500/20 active:scale-95 disabled:opacity-50 flex items-center gap-3"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Commit Settings
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-12 bg-white rounded-[40px] p-8 shadow-2xl shadow-indigo-500/5 border border-slate-100 min-h-[600px]">
                {/* Left Sidebar Tabs */}
                <div className="space-y-3">
                    {tabs.map(tab => (
                        <button 
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "w-full text-left p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 transition-all",
                                activeTab === tab.id ? "bg-primary-50 text-primary-600 shadow-sm border border-primary-100" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                            )}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                    <div className="pt-8 px-4 border-t border-slate-100 mt-8">
                         <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Support & Exit</h4>
                         <button 
                            onClick={() => setIsSupportOpen(true)}
                            className="text-xs font-bold text-slate-400 hover:text-primary-500 flex items-center gap-2 mb-3 w-full text-left"
                         >
                            <AlertCircle className="w-3.5 h-3.5" /> Core Help Center
                         </button>
                         <button 
                            onClick={() => setIsDeactivateOpen(true)}
                            className="text-xs font-bold text-slate-400 hover:text-rose-500 flex items-center gap-2 w-full text-left"
                         >
                            <Trash2 className="w-3.5 h-3.5" /> Deactivate Sequence
                         </button>
                    </div>
                </div>

                {/* Right Panel Content */}
                <div className="lg:col-span-3 pb-8">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-10"
                        >
                            {activeTab === 'notifications' && (
                                <Section title="Notification Vector Control" description="Manage how the platform communicates critical application pulses to you.">
                                    <div className="space-y-6">
                                        <Toggle label="Application Pulse Updates" description="Instant alerts on status changes (Shortlisted, Screening, etc.)" value={settings.notifications?.application_updates} onChange={(v: boolean) => setSettings({...settings, notifications: {...settings.notifications, application_updates: v}})} />
                                        <Toggle label="Interview Uplinks" description="Direct coordination alerts for technical and HR interview rounds." value={settings.notifications?.interview_notifications} onChange={(v: boolean) => setSettings({...settings, notifications: {...settings.notifications, interview_notifications: v}})} />
                                    </div>
                                </Section>
                            )}


                            {activeTab === 'preferences' && (
                                <Section title="Strategic Job Alignment" description="Define your ideal operational parameters for automated job matching.">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <InputGroup label="Preferred Role Focus" value={settings.job_preferences?.preferred_role} onChange={(v: string) => setSettings({...settings, job_preferences: {...settings.job_preferences, preferred_role: v}})} placeholder="e.g. Senior Frontend Engineer" />
                                        <InputGroup label="Target Geographic Hub" value={settings.job_preferences?.preferred_location} onChange={(v: string) => setSettings({...settings, job_preferences: {...settings.job_preferences, preferred_location: v}})} placeholder="e.g. Remote / Hybrid NY" />
                                        <OptionGroup 
                                            label="Employment Vector" 
                                            options={['Full-Time', 'Contract', 'Internship', 'Part-Time']} 
                                            value={settings.job_preferences?.employment_type} 
                                            onChange={(v: string) => setSettings({...settings, job_preferences: {...settings.job_preferences, employment_type: v}})} 
                                        />
                                        <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100 flex items-center justify-between col-span-1 md:col-span-2">
                                            <div className="space-y-1">
                                                <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Default Environment</h4>
                                                <p className="text-[10px] text-slate-400 font-medium">Primary view upon system entry.</p>
                                            </div>
                                            <div className="flex bg-white rounded-xl p-1 shadow-sm border border-slate-100">
                                                {['Grid', 'List'].map(mode => (
                                                    <button 
                                                        key={mode}
                                                        onClick={() => setSettings({...settings, dashboard: {...settings.dashboard, default_view: mode}})}
                                                        className={cn("px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all tracking-widest", 
                                                            settings.dashboard?.default_view === mode ? "bg-primary-600 text-white shadow-md" : "text-slate-400"
                                                        )}
                                                    >
                                                        {mode} View
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </Section>
                            )}

                            {activeTab === 'security' && (
                                <Section title="Identity Protection" description="Update your account password to ensure maximum security control.">
                                    <div className="max-w-md space-y-6">
                                         <div className="space-y-4">
                                            <PasswordInput 
                                                label="Current Password" 
                                                placeholder="••••••••" 
                                                value={passwords.current} 
                                                onChange={(v: string) => setPasswords({...passwords, current: v})} 
                                            />
                                            <PasswordInput 
                                                label="New Password" 
                                                placeholder="••••••••" 
                                                value={passwords.new} 
                                                onChange={(v: string) => setPasswords({...passwords, new: v})} 
                                            />
                                            <PasswordInput 
                                                label="Confirm New Password" 
                                                placeholder="••••••••" 
                                                value={passwords.confirm} 
                                                onChange={(v: string) => setPasswords({...passwords, confirm: v})} 
                                            />
                                         </div>

                                         {passwordError && (
                                             <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                                 <X className="w-3.5 h-3.5" /> {passwordError}
                                             </div>
                                         )}

                                         <button 
                                            onClick={handlePasswordChange}
                                            disabled={passwordLoading}
                                            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-900/10 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                         >
                                            {passwordLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                                            Update Password Sequence
                                         </button>
                                         <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3 text-amber-700">
                                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                            <p className="text-[10px] font-bold leading-relaxed">
                                                Ensure your password contains at least 8 characters, including special symbols and numeric vectors.
                                            </p>
                                         </div>
                                    </div>
                                </Section>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            <AnimatePresence>
                {message && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={cn(
                        "fixed bottom-8 right-8 px-6 py-4 rounded-2xl text-white text-sm font-bold shadow-2xl flex items-center gap-3 z-50",
                        message.type === 'success' ? "bg-emerald-500" : "bg-rose-500"
                    )}>
                        <CheckCircle className="w-5 h-5" /> {message.text}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Support Modal */}
            <AnimatePresence>
                {isSupportOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }} 
                            onClick={() => setIsSupportOpen(false)}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 20 }} 
                            animate={{ opacity: 1, scale: 1, y: 0 }} 
                            exit={{ opacity: 0, scale: 0.95, y: 20 }} 
                            className="bg-white w-full max-w-lg rounded-[32px] shadow-2xl relative overflow-hidden flex flex-col"
                        >
                            <div className="p-8 bg-slate-900 text-white flex items-center justify-between">
                                <div className="space-y-1">
                                    <h3 className="text-xl font-black uppercase tracking-widest">Support Request</h3>
                                    <p className="text-[10px] text-slate-400 font-bold">Lodge a high-priority system uplink request.</p>
                                </div>
                                <button onClick={() => setIsSupportOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            
                            <div className="p-8 space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">From Email (Your Uplink)</label>
                                    <div className="flex items-center gap-3 px-5 py-4 bg-slate-50 rounded-2xl border border-slate-100 italic text-slate-400 font-bold text-sm">
                                        <Mail className="w-4 h-4" /> {user?.email}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">To Support Engineering</label>
                                    <div className="flex items-center gap-3 px-5 py-4 bg-slate-50 rounded-2xl border border-slate-100 text-slate-900 font-bold text-sm">
                                        <Mail className="w-4 h-4 text-primary-500" /> akshaydeeepakm@gmail.com
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Message Detail</label>
                                    <textarea 
                                        rows={4}
                                        value={supportMessage}
                                        onChange={(e) => setSupportMessage(e.target.value)}
                                        placeholder="Describe the technical anomaly or help requirement..."
                                        className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:border-primary-500 outline-none transition-all shadow-sm resize-none"
                                    />
                                </div>

                                <button 
                                    onClick={() => {
                                        setIsSupportOpen(false);
                                        setSupportMessage('');
                                        setMessage({ type: 'success', text: 'Support Ticket Dispatched Successfully' });
                                        setTimeout(() => setMessage(null), 3000);
                                    }}
                                    className="w-full py-4 bg-primary-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary-700 transition-all shadow-xl shadow-primary-500/20 flex items-center justify-center gap-3 active:scale-95"
                                >
                                    <Send className="w-4 h-4" /> Ship Support Manifest
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Deactivation Modal */}
            <AnimatePresence>
                {isDeactivateOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }} 
                            onClick={() => setIsDeactivateOpen(false)}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 20 }} 
                            animate={{ opacity: 1, scale: 1, y: 0 }} 
                            exit={{ opacity: 0, scale: 0.95, y: 20 }} 
                            className="bg-white w-full max-w-md rounded-[32px] shadow-2xl relative overflow-hidden"
                        >
                            <div className="p-8 text-center space-y-6">
                                <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-2 shadow-inner border border-rose-100">
                                    <AlertCircle className="w-10 h-10 text-rose-500" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">System Termination</h3>
                                    <p className="text-xs text-slate-400 font-bold leading-relaxed px-4">
                                        Are you absolutely certain? This operation will permanently incinerate your professional identity and data assets from our servers. This cannot be undone.
                                    </p>
                                </div>
                                <div className="flex flex-col gap-3 pt-4">
                                     <button 
                                        onClick={handleDeactivate}
                                        disabled={saving}
                                        className="w-full py-4 bg-rose-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-600 transition-all shadow-xl shadow-rose-500/20 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                                    >
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                        Yes, Deactivate Account
                                    </button>
                                    <button 
                                        onClick={() => setIsDeactivateOpen(false)}
                                        className="w-full py-4 bg-slate-50 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all active:scale-95"
                                    >
                                        Cancel Sequence
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

const Section = ({ title, description, children }: any) => (
    <div className="space-y-8">
        <div className="space-y-2">
            <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase tracking-widest">{title}</h2>
            <p className="text-xs text-slate-400 font-bold max-w-2xl">{description}</p>
        </div>
        <div className="pt-2">{children}</div>
    </div>
);

const Toggle = ({ label, description, value, onChange }: any) => (
    <div className="flex items-center justify-between p-6 bg-slate-50 rounded-[28px] border border-slate-100 group hover:bg-white transition-all hover:shadow-xl hover:shadow-indigo-500/5">
        <div className="space-y-1">
            <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{label}</h4>
            <p className="text-[10px] text-slate-400/80 font-bold leading-relaxed">{description}</p>
        </div>
        <button 
            onClick={() => onChange(!value)}
            className={cn("w-12 h-6 rounded-full transition-all relative p-1", value ? "bg-primary-600" : "bg-slate-200")}
        >
            <div className={cn("w-4 h-4 bg-white rounded-full shadow-sm transition-all", value ? "translate-x-6" : "translate-x-0")} />
        </button>
    </div>
);

const OptionGroup = ({ label, options, value, onChange }: any) => (
    <div className="space-y-4">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{label}</h4>
        <div className="flex flex-wrap gap-3">
            {options.map((opt: string) => (
                <button 
                    key={opt}
                    onClick={() => onChange(opt)}
                    className={cn("px-6 py-3 rounded-2xl text-[10px] font-black tracking-widest uppercase transition-all", 
                        value === opt ? "bg-primary-600 text-white shadow-lg shadow-primary-500/20" : "bg-slate-50 text-slate-500 border border-slate-100 hover:bg-white"
                    )}
                >
                    {opt}
                </button>
            ))}
        </div>
    </div>
);

const InputGroup = ({ label, value, onChange, placeholder }: any) => (
    <div className="space-y-3">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{label}</h4>
        <input 
            type="text" 
            value={value || ''} 
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:border-primary-500 outline-none transition-all shadow-sm"
        />
    </div>
);

const PasswordInput = ({ label, placeholder, value, onChange }: any) => (
    <div className="space-y-3">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{label}</h4>
        <div className="relative">
            <input 
                type="password" 
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:border-primary-500 outline-none transition-all shadow-sm"
            />
            <Lock className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
        </div>
    </div>
);

import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
    User, 
    Mail, 
    Phone, 
    MapPin, 
    Briefcase, 
    Building2, 
    Calendar, 
    Clock, 
    CheckCircle, 
    Edit3, 
    Save, 
    X,
    Trophy,
    Users,
    Activity,
    AlertCircle,
    Loader2
} from 'lucide-react';
import { cn } from '../utils/cn';
import { motion, AnimatePresence } from 'framer-motion';

interface ProfileData {
    full_name: string;
    email: string;
    role: string;
    phone: string;
    designation: string;
    department: string;
    location: string;
    company_name: string;
    employee_id: string;
    joined_date: string;
    last_login: string;
}

interface ProfileStats {
    roles_created?: number;
    active_hiring_requests?: number;
    candidates_managed?: number;
    hiring_requests_approved?: number;
    active_pipelines?: number;
    teams_managed?: number;
}

export const ProfilePage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [stats, setStats] = useState<ProfileStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState<Partial<ProfileData>>({});
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        if (!user) {
            console.log('ProfilePage: No user session found, redirecting...');
            navigate('/login');
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            setError(null);
            console.log('ProfilePage: Initializing data fetch sequence...');
            try {
                // Fetch profile basic data
                console.log('Fetching /settings...');
                const profileRes = await api.get('/settings');
                console.log('Profile settings received:', profileRes.data);
                
                setProfile(profileRes.data);
                setEditData(profileRes.data);

                // Fetch stats separately
                try {
                    console.log('Fetching /settings/profile/stats...');
                    const statsRes = await api.get('/settings/profile/stats');
                    console.log('Stats received:', statsRes.data);
                    setStats(statsRes.data);
                } catch (statsErr: any) {
                    console.warn('Network Error on Stats (tolerated):', statsErr.message);
                }
            } catch (err: any) {
                console.error('CRITICAL Network Error on Profile:', err);
                if (err.response) {
                    console.error('Server responded with:', err.response.status, err.response.data);
                }
                const errMsg = err.response?.data?.detail || err.message || 'Verification link broken';
                setError(errMsg);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user, navigate]);

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            await api.put('/settings', editData);
            if (editData.full_name !== profile?.full_name) {
                await api.patch('/settings/profile', null, { params: { full_name: editData.full_name } });
            }
            setProfile({ ...profile!, ...editData });
            setIsEditing(false);
            setMessage({ type: 'success', text: 'Identity Manifest Updated' });
        } catch (error) {
            setMessage({ type: 'error', text: 'Sync Failure: Check connection' });
        } finally {
            setSaving(false);
            setTimeout(() => setMessage(null), 3000);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <Loader2 className="w-12 h-12 text-primary-500 animate-spin" />
                <p className="text-slate-500 font-medium animate-pulse">Synchronizing Core Profile...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-12 max-w-lg mx-auto text-center space-y-6">
                <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
                    <AlertCircle className="w-10 h-10" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Endpoint Unreachable</h2>
                    <p className="text-slate-500 mt-2">{error}</p>
                    <p className="text-[10px] text-slate-400 mt-4 uppercase tracking-tighter">Diagnostic: Backend may have undergone transformation</p>
                </div>
                <button 
                    onClick={() => window.location.reload()}
                    className="px-8 py-3 bg-primary-600 text-white font-bold rounded-2xl hover:bg-primary-700 shadow-xl shadow-primary-500/20 active:scale-95 transition-all w-full"
                >
                    Retry Handshake
                </button>
            </div>
        );
    }

    if (!profile) return null;

    const isHM = user?.role === 'hiring_manager';

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-8 pb-32">
            {/* Header Content */}
            <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative group overflow-hidden rounded-[32px] shadow-2xl shadow-indigo-500/10"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-primary-600 to-indigo-900 opacity-5 group-hover:opacity-10 transition-all duration-700" />
                <div className="relative p-10 flex flex-col md:flex-row items-center gap-10 bg-white/60 backdrop-blur-xl border border-white">
                    <div className="relative">
                        <div className="w-40 h-40 rounded-[40px] bg-white shadow-2xl border-8 border-white flex items-center justify-center text-primary-600 font-black text-5xl overflow-hidden shrink-0 transform-gpu rotate-3 hover:rotate-0 transition-transform duration-500">
                            {profile.full_name?.charAt(0) || 'U'}
                        </div>
                    </div>
                    <div className="flex-1 text-center md:text-left space-y-3">
                        <div className="flex items-center justify-center md:justify-start gap-4 flex-wrap">
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight">{profile.full_name}</h1>
                            <span className="px-4 py-1.5 bg-primary-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full leading-none shadow-lg shadow-primary-500/20">
                                {profile.role?.replace('_', ' ')}
                            </span>
                        </div>
                        <p className="text-slate-500 font-bold flex items-center justify-center md:justify-start gap-2.5">
                            <Building2 className="w-5 h-5 text-primary-500 shrink-0" />
                            {profile.designation || 'Specialist'} · {profile.department || 'Direct Operations'}
                        </p>
                        <div className="flex items-center justify-center md:justify-start gap-6 pt-4">
                            <p className="text-xs text-slate-400 flex items-center gap-2 font-bold uppercase tracking-wider">
                                <Calendar className="w-4 h-4 text-slate-300" />
                                Est. {profile.joined_date || 'Q1 2026'}
                            </p>
                            <span className="w-1.5 h-1.5 bg-primary-200 rounded-full" />
                            <p className="text-xs text-slate-400 flex items-center gap-2 font-bold uppercase tracking-wider">
                                <Activity className="w-4 h-4 text-slate-300" />
                                {profile.company_name || 'HireStream HQ'}
                            </p>
                        </div>
                    </div>
                    <div>
                        <button 
                            onClick={() => setIsEditing(!isEditing)}
                            className={cn(
                                "flex items-center gap-2 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[.25em] transition-all shadow-xl",
                                isEditing ? "bg-slate-900 text-white hover:bg-slate-800" : "bg-white text-slate-900 hover:bg-slate-50 border border-slate-100"
                            )}
                        >
                            {isEditing ? <><X className="w-4 h-4" /> Exit</> : <><Edit3 className="w-4 h-4" /> Modify</>}
                        </button>
                    </div>
                </div>
            </motion.div>

            <AnimatePresence>
                {message && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className={cn(
                        "p-5 rounded-2xl border text-sm font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl overflow-hidden",
                        message.type === 'success' ? "bg-emerald-500 text-white border-emerald-400" : "bg-red-500 text-white border-red-400"
                    )}>
                        <CheckCircle className="w-5 h-5 shrink-0" /> {message.text}
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Information Sections */}
                <div className="lg:col-span-2 space-y-10">
                    <div className="bg-white border border-slate-200 rounded-[32px] shadow-xl overflow-hidden ring-1 ring-slate-100">
                        <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                            <div>
                                <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.3em] flex items-center gap-2.5">
                                    <div className="w-2 h-2 rounded-full bg-primary-500" />
                                    Identity Profile
                                </h3>
                                <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">Core Personal Specifications</p>
                            </div>
                            {isEditing && (
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-primary-700 disabled:opacity-50 transition-all shadow-lg active:scale-95"
                                >
                                    {saving ? 'Saving...' : <><Save className="w-4 h-4" /> Commit</>}
                                </button>
                            )}
                        </div>
                        <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                            {[
                                { id: 'full_name', label: 'Full Display Name', icon: User, value: editData.full_name },
                                { id: 'email', label: 'Login Credential', icon: Mail, value: profile.email, disabled: true },
                                { id: 'phone', label: 'Registered Contact', icon: Phone, value: editData.phone },
                                { id: 'location', label: 'Operational Hub', icon: MapPin, value: editData.location },
                                { id: 'designation', label: 'Corporate Title', icon: Briefcase, value: editData.designation },
                                { id: 'department', label: 'Domain / Dept', icon: Building2, value: editData.department },
                                { id: 'company_name', label: 'Organization', icon: Activity, value: editData.company_name },
                                { id: 'employee_id', label: 'Control Index ID', icon: Users, value: editData.employee_id },
                            ].map(field => (
                                <div key={field.id} className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <field.icon className="w-3.5 h-3.5 text-primary-400" />
                                        {field.label}
                                    </label>
                                    {isEditing && !field.disabled ? (
                                        <input 
                                            type="text" 
                                            value={field.value || ''} 
                                            onChange={e => setEditData({...editData, [field.id]: e.target.value})}
                                            placeholder={`Enter ${field.label.toLowerCase()}`}
                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:border-primary-500 outline-none transition-all shadow-sm"
                                        />
                                    ) : (
                                        <p className={cn("text-base font-black px-1", field.disabled ? "text-slate-400" : "text-slate-900")}>
                                            {field.value || '---'}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Pipeline Stats Column */}
                <div className="space-y-10">
                    <div className="bg-slate-900 border border-slate-800 rounded-[32px] p-8 shadow-2xl space-y-8">
                        <h3 className="text-[10px] font-black text-white uppercase tracking-[0.4em] flex items-center gap-3">
                            <Trophy className="w-5 h-5 text-amber-500" />
                            Performance
                        </h3>
                        <div className="space-y-5">
                            {isHM ? (
                                <>
                                    <StatRow label="Roles Architected" value={stats?.roles_created} />
                                    <StatRow label="Active Pipelines" value={stats?.candidates_managed} />
                                    <div className="pt-2">
                                        <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-primary-500 w-[65%]" />
                                        </div>
                                        <p className="text-[9px] text-slate-500 font-bold mt-2 uppercase tracking-widest text-center">Efficiency: 82.4%</p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <StatRow label="Strategic Clearances" value={stats?.hiring_requests_approved} />
                                    <StatRow label="Active Networks" value={stats?.candidates_managed} />
                                    <StatRow label="Domain Nodes" value={stats?.active_pipelines} />
                                </>
                            )}
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-xl space-y-8 ring-1 ring-slate-100">
                        <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.4em] flex items-center gap-3">
                            <Clock className="w-5 h-5 text-primary-500" />
                            Security Log
                        </h3>
                        <div className="space-y-6">
                            <AuditRow label="Access Point" value={profile.email} />
                            <AuditRow label="Clearance Level" value={profile.role?.replace('_', ' ')} isCap />
                            <AuditRow label="Last Uplink" value={profile.last_login || 'Just now'} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatRow = ({ label, value }: { label: string, value: any }) => (
    <div className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5 group hover:bg-white/10 transition-colors">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{label}</p>
        <p className="text-xl font-black text-white">{value ?? '0'}</p>
    </div>
);

const AuditRow = ({ label, value, isCap }: { label: string, value: any, isCap?: boolean }) => (
    <div className="space-y-1.5 px-1">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{label}</p>
        <p className={cn("text-xs font-black text-slate-900", isCap && "capitalize")}>{value}</p>
    </div>
);

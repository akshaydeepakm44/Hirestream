import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { 
    User, 
    Bell, 
    Shield, 
    Save, 
    Check,
    Briefcase,
    Lock,
    Upload
} from 'lucide-react';
import { cn } from '../utils/cn';
import { motion } from 'framer-motion';

interface UserSettings {
    full_name: string;
    email: string;
    phone: string;
    designation: string;
    department: string;
    profile_picture_url: string;
    email_notifications: boolean;
    in_app_notifications: boolean;
    candidate_updates: boolean;
    interview_notifications: boolean;
    jd_approval_notifications: boolean;
    hire_request_notifications: boolean;
    pipeline_notifications: boolean;
    ats_alerts: boolean;
    default_employment_type: string;
    default_location: string;
    default_experience_min: number;
    default_experience_max: number;
    default_hiring_priority: string;
    default_view: string;
    items_per_page: number;
    candidate_view_preference: string;
}

const SECTIONS = [
    { id: 'profile', label: 'Profile Settings', icon: User },
    { id: 'notifications', label: 'Notification Settings', icon: Bell },
    { id: 'preferences', label: 'Hiring Preferences', icon: Briefcase },
    { id: 'integrations', label: 'Integrations', icon: Upload },
    { id: 'security', label: 'Security Settings', icon: Shield },
];

export const SettingsPage = () => {
    const { user } = useAuth();
    const [activeSection, setActiveSection] = useState('profile');
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
    const [passwordSaving, setPasswordSaving] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const { data } = await api.get('/settings');
                setSettings(data);
            } catch (error) {
                console.error('Failed to fetch settings:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async () => {
        if (!settings) return;
        setSaving(true);
        setMessage(null);
        try {
            await api.put('/settings', settings);
            // Also update the full name if it changed
            if (settings.full_name !== user?.full_name) {
                await api.patch('/settings/profile', null, { params: { full_name: settings.full_name } });
            }
            setMessage({ type: 'success', text: 'Settings Updated Successfully' });
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to update settings' });
        } finally {
            setSaving(false);
            setTimeout(() => setMessage(null), 3000);
        }
    };

    const handlePasswordChange = async () => {
        if (!passwordData.current || !passwordData.new || !passwordData.confirm) {
            setMessage({ type: 'error', text: 'All password fields are required' });
            return;
        }
        if (passwordData.new !== passwordData.confirm) {
            setMessage({ type: 'error', text: 'New passwords do not match' });
            return;
        }
        setPasswordSaving(true);
        try {
            await api.post('/auth/change-password', {
                current_password: passwordData.current,
                new_password: passwordData.new
            });
            setMessage({ type: 'success', text: 'Password Changed Successfully' });
            setPasswordData({ current: '', new: '', confirm: '' });
        } catch (error: any) {
            setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to change password' });
        } finally {
            setPasswordSaving(false);
            setTimeout(() => setMessage(null), 3000);
        }
    };

    if (loading) {
        return <div className="p-8 animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 rounded w-48" />
            <div className="grid grid-cols-4 gap-8">
                <div className="bg-slate-100 h-64 rounded-xl" />
                <div className="col-span-3 bg-slate-50 h-96 rounded-xl" />
            </div>
        </div>;
    }

    if (!settings) return null;

    const isRM = user?.role === 'resource_manager';
    const isHM = user?.role === 'hiring_manager';

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">User Settings</h1>
                    <p className="text-slate-500 mt-1">Manage your account preferences and configurations</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/20 disabled:opacity-50"
                >
                    {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white animate-spin rounded-full" /> : <Save className="w-4 h-4" />}
                    {saving ? 'Saving...' : 'Save All Changes'}
                </button>
            </div>

            {message && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                        "p-4 rounded-xl border text-sm font-medium flex items-center gap-2",
                        message.type === 'success' ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-red-50 border-red-100 text-red-700"
                    )}
                >
                    <Check className="w-4 h-4" />
                    {message.text}
                </motion.div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Left Sidebar */}
                <div className="space-y-1">
                    {SECTIONS.filter(s => {
                        if (s.id === 'preferences' && !isHM) return false;
                        return true;
                    }).map(section => (
                        <button
                            key={section.id}
                            onClick={() => setActiveSection(section.id)}
                            className={cn(
                                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left",
                                activeSection === section.id 
                                    ? "bg-white text-primary-600 shadow-sm border border-slate-200" 
                                    : "text-slate-500 hover:bg-slate-100"
                            )}
                        >
                            <section.icon className="w-4 h-4" />
                            {section.label}
                        </button>
                    ))}
                </div>

                {/* Right Panel */}
                <div className="lg:col-span-3">
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden anim-fade-in">
                        <div className="p-8 space-y-8">
                            {/* Profile Section */}
                            {activeSection === 'profile' && (
                                <div className="space-y-6">
                                    <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-4 flex items-center gap-2">
                                        <User className="w-5 h-5 text-primary-500" />
                                        Profile Information
                                    </h3>
                                    
                                    <div className="flex items-center gap-6 pb-6">
                                        <div className="relative group">
                                            <div className="w-20 h-20 rounded-2xl bg-slate-100 border-2 border-slate-200 flex items-center justify-center text-slate-400 font-bold text-2xl group-hover:bg-slate-200 transition-colors">
                                                {settings.full_name?.charAt(0)}
                                            </div>
                                            <button className="absolute -bottom-2 -right-2 p-2 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 transition-all">
                                                <Upload className="w-3.5 h-3.5 text-slate-600" />
                                            </button>
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900">{settings.full_name}</p>
                                            <p className="text-sm text-slate-500">{user?.role?.replace('_', ' ')}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Full Name</label>
                                            <input 
                                                type="text" 
                                                value={settings.full_name} 
                                                onChange={e => setSettings({...settings, full_name: e.target.value})}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:border-primary-500 transition-all outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1.5 opacity-60">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Email Address</label>
                                            <input type="email" value={settings.email} disabled className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-sm cursor-not-allowed" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Phone Number</label>
                                            <input 
                                                type="text" 
                                                value={settings.phone || ''} 
                                                onChange={e => setSettings({...settings, phone: e.target.value})}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:border-primary-500 transition-all outline-none"
                                            />
                                        </div>
                                        {isHM && (
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Designation</label>
                                                <input 
                                                    type="text" 
                                                    value={settings.designation || ''} 
                                                    onChange={e => setSettings({...settings, designation: e.target.value})}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:border-primary-500 transition-all outline-none"
                                                />
                                            </div>
                                        )}
                                        {isHM && (
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Department</label>
                                                <input 
                                                    type="text" 
                                                    value={settings.department || ''} 
                                                    onChange={e => setSettings({...settings, department: e.target.value})}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:border-primary-500 transition-all outline-none"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Notifications Section */}
                            {activeSection === 'notifications' && (
                                <div className="space-y-6">
                                    <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-4 flex items-center gap-2">
                                        <Bell className="w-5 h-5 text-primary-500" />
                                        Communication Preferences
                                    </h3>

                                    <div className="space-y-4">
                                        {[
                                            { id: 'email_notifications', label: 'Email Notifications', desc: 'Receive system alerts via email', role: 'all' },
                                            { id: 'in_app_notifications', label: 'In-App Notifications', desc: 'Desktop alerts while browsing', role: 'all' },
                                            { id: 'candidate_updates', label: 'Candidate Updates', desc: 'When candidates move stages', role: 'all' },
                                            { id: 'interview_notifications', label: 'Interview Notifications', desc: 'Meeting scheduling updates', role: 'all' },
                                            { id: 'jd_approval_notifications', label: 'JD Approval Notifications', desc: 'When requisition status changes', role: isHM ? 'hiring_manager' : 'all' },
                                            { id: 'hire_request_notifications', label: 'Hire Request Alerts', desc: 'New requisitions from managers', role: isRM ? 'resource_manager' : 'all' },
                                            { id: 'ats_alerts', label: 'ATS Intelligence Alerts', desc: 'Critical matching score warnings', role: isRM ? 'resource_manager' : 'all' },
                                        ].filter(item => item.role === 'all' || item.role === user?.role).map(item => (
                                            <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200/50">
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900">{item.label}</p>
                                                    <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                                                </div>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={settings[item.id as keyof UserSettings] as boolean} 
                                                        onChange={e => setSettings({...settings, [item.id]: e.target.checked})}
                                                        className="sr-only peer" 
                                                    />
                                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Preferences Section (HM Only) */}
                            {activeSection === 'preferences' && isHM && (
                                <div className="space-y-6">
                                    <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-4 flex items-center gap-2">
                                        <Briefcase className="w-5 h-5 text-primary-500" />
                                        Default Hiring Preferences
                                    </h3>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Default Employment Type</label>
                                            <select 
                                                value={settings.default_employment_type} 
                                                onChange={e => setSettings({...settings, default_employment_type: e.target.value})}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:bg-white focus:border-primary-500 transition-all"
                                            >
                                                <option>Full-time</option>
                                                <option>Contract</option>
                                                <option>Internship</option>
                                                <option>Freelance</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Default Location</label>
                                            <input 
                                                type="text" 
                                                value={settings.default_location || ''} 
                                                onChange={e => setSettings({...settings, default_location: e.target.value})}
                                                placeholder="e.g. Bangalore"
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:bg-white focus:border-primary-500 transition-all"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Default Hiring Priority</label>
                                            <select 
                                                value={settings.default_hiring_priority} 
                                                onChange={e => setSettings({...settings, default_hiring_priority: e.target.value})}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:bg-white focus:border-primary-500 transition-all"
                                            >
                                                <option>High</option>
                                                <option>Medium</option>
                                                <option>Low</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}


                            {/* Integrations Section */}
                            {activeSection === 'integrations' && (
                                <div className="space-y-6">
                                    <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-4 flex items-center gap-2">
                                        <Upload className="w-5 h-5 text-primary-500" />
                                        External Integrations
                                    </h3>

                                    <div className="p-6 border border-slate-200 rounded-2xl bg-slate-50/50 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-white rounded-xl border border-slate-200 flex items-center justify-center p-2.5">
                                                <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google" className="w-full h-full" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-900">Google Workspace</p>
                                                <p className="text-xs text-slate-500">Enable Gmail for professional email communication</p>
                                            </div>
                                        </div>
                                        
                                        {(user as any)?.has_google_connected ? (
                                            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-bold border border-emerald-100">
                                                <Check className="w-3.5 h-3.5" /> Connected
                                            </div>
                                        ) : (
                                            <a 
                                                href={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/auth/google/login?role=${user?.role}`}
                                                className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all shadow-sm no-underline"
                                            >
                                                Connect Account
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Security Section */}
                            {activeSection === 'security' && (
                                <div className="space-y-6">
                                    <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-4 flex items-center gap-2">
                                        <Shield className="w-5 h-5 text-primary-500" />
                                        Account Security
                                    </h3>

                                    <div className="space-y-6">
                                        <div className="p-6 border border-slate-200 rounded-2xl bg-slate-50/50 space-y-4">
                                            <div className="flex items-center gap-3">
                                                <Lock className="w-4 h-4 text-slate-400" />
                                                <p className="text-sm font-bold text-slate-900">Change Password</p>
                                            </div>
                                            <div className="grid grid-cols-1 gap-4">
                                                <div className="relative">
                                                    <input 
                                                        type="password" 
                                                        placeholder="Current Password" 
                                                        value={passwordData.current}
                                                        onChange={e => setPasswordData({...passwordData, current: e.target.value})}
                                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary-500" 
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <input 
                                                        type="password" 
                                                        placeholder="New Password" 
                                                        value={passwordData.new}
                                                        onChange={e => setPasswordData({...passwordData, new: e.target.value})}
                                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary-500" 
                                                    />
                                                    <input 
                                                        type="password" 
                                                        placeholder="Confirm New Password" 
                                                        value={passwordData.confirm}
                                                        onChange={e => setPasswordData({...passwordData, confirm: e.target.value})}
                                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary-500" 
                                                    />
                                                </div>
                                            </div>
                                            <button 
                                                onClick={handlePasswordChange}
                                                disabled={passwordSaving}
                                                className="text-xs font-bold text-primary-600 uppercase tracking-widest hover:text-primary-700 transition-colors disabled:opacity-50"
                                            >
                                                {passwordSaving ? 'Updating...' : 'Update Password'}
                                            </button>
                                        </div>

                                        <div className="p-6 border border-red-100 rounded-2xl bg-red-50/30 space-y-4">
                                            <div className="flex items-center gap-3">
                                                <Shield className="w-4 h-4 text-red-400" />
                                                <p className="text-sm font-bold text-red-900">Danger Zone</p>
                                            </div>
                                            <p className="text-xs text-red-600 font-medium">Permanently delete your account and all associated data. This action cannot be undone.</p>
                                            <button 
                                                onClick={() => {
                                                    if (window.confirm("Are you sure you want to deactivate? Your account will be removed permanently from the database.")) {
                                                        api.delete('/auth/account').then(() => {
                                                            alert("Account deleted successfully.");
                                                            window.location.href = "/";
                                                        });
                                                    }
                                                }}
                                                className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-500/20"
                                            >
                                                Deactivate Account
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

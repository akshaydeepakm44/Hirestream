import { useState, useEffect } from 'react';
import { 
    LayoutDashboard, Users, Building2, Briefcase, 
    CheckCircle, XCircle, Bell, LogOut, TrendingUp, 
    Mail, Shield, UserCheck, BarChart3,
    Trash2, AlertTriangle, UserX, MessageSquare, 
    Send, Inbox
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api, safeArray } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

// Confirmation modal
const ConfirmModal = ({ title, message, onConfirm, onCancel, loading }: {
    title: string; message: string;
    onConfirm: () => void; onCancel: () => void; loading: boolean;
}) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-slate-900 border border-red-500/20 rounded-[32px] p-8 max-w-md w-full shadow-2xl"
        >
            <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <div>
                    <h3 className="text-lg font-black text-white mb-1">{title}</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">{message}</p>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <Button variant="outline" onClick={onCancel}
                    className="border-white/10 text-slate-400 hover:bg-white/5 h-12 rounded-2xl font-black text-xs">
                    Cancel
                </Button>
                <Button onClick={onConfirm} isLoading={loading}
                    className="bg-red-600 hover:bg-red-700 text-white h-12 rounded-2xl font-black text-xs shadow-lg shadow-red-500/20">
                    <Trash2 className="w-4 h-4 mr-2" /> Permanently Remove
                </Button>
            </div>
        </motion.div>
    </div>
);

const ReplyModal = ({ inquiry, onReply, onCancel, loading }: {
    inquiry: any; onReply: (msg: string) => void; onCancel: () => void; loading: boolean;
}) => {
    const [message, setMessage] = useState('');
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onCancel} />
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative bg-slate-900 border border-white/5 rounded-[32px] p-8 max-w-xl w-full shadow-2xl overflow-hidden"
            >
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/10 rounded-full blur-3xl -mr-16 -mt-16" />
                
                <h3 className="text-xl font-black text-white mb-6 flex items-center gap-3">
                    <div className="p-2.5 bg-purple-600/10 rounded-xl">
                        <MessageSquare className="w-5 h-5 text-purple-400" />
                    </div>
                    Reply to Inquiry
                </h3>

                <div className="space-y-4 mb-6">
                    <div className="p-4 bg-slate-950/50 rounded-2xl border border-white/5">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">Inquiry from</span>
                            <Badge className="bg-white/5 text-slate-400 border-none text-[9px]">{new Date(inquiry.created_at).toLocaleDateString()}</Badge>
                        </div>
                        <p className="text-xs font-bold text-white mb-2">{inquiry.email}</p>
                        <p className="text-xs text-slate-400 leading-relaxed italic line-clamp-3">"{inquiry.message}"</p>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block ml-2">Your Response</label>
                        <textarea 
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Type your reply here..."
                            rows={5}
                            className="w-full p-4 bg-slate-950 border border-white/5 rounded-2xl text-xs font-bold text-white focus:ring-4 focus:ring-purple-500/10 transition-all outline-none resize-none"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Button variant="outline" onClick={onCancel}
                        className="border-white/5 text-slate-500 h-11 rounded-xl font-black text-xs hover:bg-white/5 transition-all">
                        Discard
                    </Button>
                    <Button onClick={() => onReply(message)} isLoading={loading} disabled={!message.trim()}
                        className="bg-purple-600 hover:bg-purple-700 text-white h-11 rounded-xl font-black text-xs shadow-xl shadow-purple-500/20 gap-2 transition-all">
                        <Send className="w-3.5 h-3.5" /> Send Response
                    </Button>
                </div>
            </motion.div>
        </div>
    );
};

export const SuperAdminDashboard = () => {
    const { logout, user } = useAuth();
    const [stats, setStats] = useState<any>(null);
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);
    const [allRecruiters, setAllRecruiters] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'approvals' | 'users' | 'companies' | 'inquiries'>('overview');
    const [actionLoading, setActionLoading] = useState<number | null>(null);
    const [inquiries, setInquiries] = useState<any[]>([]);
    const [replyModal, setReplyModal] = useState<any | null>(null);
    const [replyLoading, setReplyLoading] = useState(false);
    const [confirmModal, setConfirmModal] = useState<{
        show: boolean; title: string; message: string;
        onConfirm: () => Promise<void>;
    } | null>(null);
    const [confirmLoading, setConfirmLoading] = useState(false);

    useEffect(() => { fetchDashboardData(); }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const [statsRes, pendingRes, recruitersRes, inquiriesRes] = await Promise.all([
                api.get('/admin/dashboard-stats'),
                api.get('/auth/pending-requests'),
                api.get('/admin/all-recruiters'),
                api.get('/admin/contact-requests'),
            ]);
            setStats(statsRes.data || { stats: { companies: 0, candidates: 0, hms: 0, rms: 0, requests: 0 }, hm_analytics: [], rm_analytics: [], companies_overview: [] });
            setPendingRequests(safeArray(pendingRes.data));
            setAllRecruiters(safeArray(recruitersRes.data));
            setInquiries(safeArray(inquiriesRes.data));
        } catch (err) {
            console.error("Failed to fetch admin data", err);
            setStats({ stats: { companies: 0, candidates: 0, hms: 0, rms: 0, requests: 0 }, hm_analytics: [], rm_analytics: [], companies_overview: [] });
            setPendingRequests([]);
            setAllRecruiters([]);
        } finally {
            setLoading(false);
        }
    };

    const handleApproval = async (userId: number, approve: boolean) => {
        try {
            setActionLoading(userId);
            await api.post('/auth/approve-request', { user_id: userId, approve });
            setPendingRequests(prev => prev.filter(u => u.id !== userId));
            fetchDashboardData();
        } catch (err) { console.error("Action failed", err); }
        finally { setActionLoading(null); }
    };

    const confirmRemoveUser = (u: any) => {
        setConfirmModal({
            show: true,
            title: `Remove ${u.role === 'hiring_manager' ? 'Hiring Manager' : 'Resource Manager'}`,
            message: `"${u.name || u.full_name}" (${u.email}) will be permanently removed. They must re-register to regain access.`,
            onConfirm: async () => {
                await api.delete(`/admin/remove-user/${u.id}`);
                await fetchDashboardData();
            }
        });
    };

    const confirmRemoveCompany = (companyName: string) => {
        setConfirmModal({
            show: true,
            title: `Remove Company: ${companyName}`,
            message: `All Hiring Managers and Resource Managers from "${companyName}" will be permanently removed. They must re-register with the same company to regain access.`,
            onConfirm: async () => {
                await api.delete(`/admin/remove-company/${encodeURIComponent(companyName)}`);
                await fetchDashboardData();
            }
        });
    };

    const handleConfirm = async () => {
        if (!confirmModal) return;
        setConfirmLoading(true);
        try { await confirmModal.onConfirm(); }
        catch (err) { console.error("Remove failed", err); }
        finally { setConfirmLoading(false); setConfirmModal(null); }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
            </div>
        );
    }

    const navItems = [
        { id: 'overview', label: 'Command Center', icon: LayoutDashboard },
        { id: 'approvals', label: 'Access Requests', icon: UserCheck, count: pendingRequests.length },
        { id: 'inquiries', label: 'Support Cases', icon: Inbox, count: inquiries.filter(i => i.status === 'new').length },
        { id: 'users', label: 'Manage Users', icon: UserX },
        { id: 'companies', label: 'Global Network', icon: Building2 },
    ];

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-purple-500/30">
            {confirmModal?.show && (
                <ConfirmModal
                    title={confirmModal.title}
                    message={confirmModal.message}
                    onConfirm={handleConfirm}
                    onCancel={() => setConfirmModal(null)}
                    loading={confirmLoading}
                />
            )}

            {replyModal && (
                <ReplyModal 
                    inquiry={replyModal}
                    loading={replyLoading}
                    onCancel={() => setReplyModal(null)}
                    onReply={async (msg) => {
                        setReplyLoading(true);
                        try {
                            await api.post(`/admin/contact-requests/${replyModal.id}/reply`, { message: msg });
                            setInquiries(prev => prev.map(i => i.id === replyModal.id ? { ...i, status: 'responded' } : i));
                            setReplyModal(null);
                        } catch (err) { alert("Failed to send reply. Ensure your Google account is connected."); }
                        finally { setReplyLoading(false); }
                    }}
                />
            )}

            <div className="flex h-screen overflow-hidden">
                {/* Sidebar */}
                <aside className="w-72 bg-slate-900/50 border-r border-white/5 flex flex-col p-6 backdrop-blur-2xl">
                    <div className="flex items-center gap-3 mb-10 px-2">
                        <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                            <Shield className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="font-black tracking-tight text-white leading-none">HireStream</h2>
                            <span className="text-[10px] uppercase font-black text-purple-400 tracking-[0.2em]">Super Admin</span>
                        </div>
                    </div>

                    <nav className="space-y-1 flex-1">
                        {navItems.map((item) => (
                            <button key={item.id} onClick={() => setActiveTab(item.id as any)}
                                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all ${
                                    activeTab === item.id
                                        ? 'bg-purple-600 text-white shadow-xl shadow-purple-500/10'
                                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
                                }`}>
                                <div className="flex items-center gap-3">
                                    <item.icon className="w-5 h-5" />
                                    <span className="text-sm font-bold tracking-tight">{item.label}</span>
                                </div>
                                {(item as any).count !== undefined && (item as any).count > 0 && (
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                        activeTab === item.id ? 'bg-white text-purple-600' : 'bg-red-500/20 text-red-400'
                                    }`}>{(item as any).count}</span>
                                )}
                            </button>
                        ))}
                    </nav>

                    <div className="pt-6 border-t border-white/5 space-y-4">
                        <div className="flex items-center gap-3 px-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500" />
                            <div className="flex-1 overflow-hidden">
                                <p className="text-xs font-bold truncate">{user?.full_name}</p>
                                <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
                            </div>
                        </div>
                        <Button variant="ghost" onClick={logout}
                            className="w-full justify-start gap-3 text-red-400 hover:text-red-300 hover:bg-red-500/5 px-4 h-11 rounded-2xl">
                            <LogOut className="w-4 h-4" />
                            <span className="text-sm font-bold">Terminate Session</span>
                        </Button>
                    </div>
                </aside>

                {/* Main */}
                <main className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_50%_-20%,rgba(120,50,255,0.08),transparent)]">
                    <header className="h-24 flex items-center justify-between px-10 sticky top-0 bg-slate-950/80 backdrop-blur-md z-20 border-b border-white/5">
                        <h1 className="text-2xl font-black tracking-tight">
                            {activeTab === 'overview' && "Command Center"}
                            {activeTab === 'approvals' && "Access Management"}
                            {activeTab === 'inquiries' && "Support Center"}
                            {activeTab === 'users' && "User Management"}
                            {activeTab === 'companies' && "Company Ecosystem"}
                        </h1>
                        <button className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center hover:bg-white/10 transition-colors relative">
                            <Bell className="w-5 h-5 text-slate-400" />
                            {pendingRequests.length > 0 && <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-slate-950" />}
                        </button>
                    </header>

                    <div className="p-10 max-w-7xl mx-auto space-y-10">
                        <AnimatePresence mode="wait">

                            {/* OVERVIEW TAB */}
                            {activeTab === 'overview' && (
                                <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-10">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        {[
                                            { label: 'Ecosystem Companies', value: stats?.stats?.companies, icon: Building2, color: 'blue' },
                                            { label: 'Global Candidate Pool', value: stats?.stats?.candidates, icon: Users, color: 'purple' },
                                            { label: 'Active Hiring Managers', value: stats?.stats?.hms, icon: Briefcase, color: 'indigo' },
                                            { label: 'Platform Requisitions', value: stats?.stats?.requests, icon: TrendingUp, color: 'emerald' },
                                        ].map((stat, i) => (
                                            <Card key={i} className="bg-slate-900 border-white/5 p-6 hover:border-purple-500/20 transition-all">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className={`p-3 rounded-xl bg-${stat.color}-500/10`}>
                                                        <stat.icon className={`w-5 h-5 text-${stat.color}-400`} />
                                                    </div>
                                                </div>
                                                <h3 className="text-3xl font-black tracking-tight mb-1">{stat.value ?? 0}</h3>
                                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{stat.label}</p>
                                            </Card>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                        {/* HM Table */}
                                        <div className="lg:col-span-2 bg-slate-900 rounded-[32px] border border-white/5 p-8">
                                            <div className="flex items-center justify-between mb-8">
                                                <div>
                                                    <h3 className="text-lg font-black tracking-tight">Hiring Manager Analytics</h3>
                                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Requests & Shortlists per HM</p>
                                                </div>
                                                <BarChart3 className="w-5 h-5 text-purple-400" />
                                            </div>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left">
                                                    <thead>
                                                        <tr className="border-b border-white/5 text-[10px] uppercase font-black text-slate-500 tracking-widest">
                                                            <th className="pb-4 px-2">Manager</th>
                                                            <th className="pb-4 px-2 text-center">Requests</th>
                                                            <th className="pb-4 px-2 text-center">Applicants</th>
                                                            <th className="pb-4 px-2 text-center">Shortlisted</th>
                                                            <th className="pb-4 px-2 text-center">Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-white/5">
                                                        {stats?.hm_analytics?.length === 0 && (
                                                            <tr><td colSpan={5} className="py-8 text-center text-slate-600 text-sm font-bold">No Hiring Managers yet</td></tr>
                                                        )}
                                                        {stats?.hm_analytics?.map((hm: any) => (
                                                            <tr key={hm.id} className="group hover:bg-white/5 transition-colors">
                                                                <td className="py-4 px-2">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-sm font-bold">{hm.name}</span>
                                                                        <span className="text-[10px] text-slate-500 uppercase tracking-tight">{hm.company}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="py-4 px-2 text-center font-bold text-slate-300">{hm.requests_raised}</td>
                                                                <td className="py-4 px-2 text-center font-bold text-blue-400">{hm.total_applicants}</td>
                                                                <td className="py-4 px-2 text-center">
                                                                    <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20">{hm.shortlisted}</Badge>
                                                                </td>
                                                                <td className="py-4 px-2 text-center">
                                                                    <button onClick={() => confirmRemoveUser(hm)}
                                                                        className="opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center mx-auto">
                                                                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {/* RM Panel */}
                                        <div className="bg-slate-900 rounded-[32px] border border-white/5 p-8">
                                            <div className="flex items-center justify-between mb-8">
                                                <div>
                                                    <h3 className="text-lg font-black tracking-tight">Resource Managers</h3>
                                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Pipeline Oversight</p>
                                                </div>
                                                <Users className="w-5 h-5 text-blue-400" />
                                            </div>
                                            <div className="space-y-4">
                                                {stats?.rm_analytics?.length === 0 && (
                                                    <p className="text-center text-slate-600 text-sm font-bold py-4">No Resource Managers yet</p>
                                                )}
                                                {stats?.rm_analytics?.map((rm: any) => (
                                                    <div key={rm.id} className="group p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-red-500/10 transition-all">
                                                        <div className="flex items-center justify-between mb-3">
                                                            <span className="text-sm font-black">{rm.name}</span>
                                                            <div className="flex items-center gap-2">
                                                                <Badge className="bg-blue-500/10 text-blue-400 border-none px-2 text-[10px]">{rm.company}</Badge>
                                                                <button onClick={() => confirmRemoveUser(rm)}
                                                                    className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center">
                                                                    <Trash2 className="w-3 h-3 text-red-400" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="text-center p-2 rounded-xl bg-slate-950/50">
                                                                <p className="text-lg font-black">{rm.pipeline_size}</p>
                                                                <p className="text-[8px] uppercase font-black text-slate-500">Pipeline</p>
                                                            </div>
                                                            <div className="text-center p-2 rounded-xl bg-slate-950/50">
                                                                <p className="text-lg font-black text-indigo-400">{rm.under_review}</p>
                                                                <p className="text-[8px] uppercase font-black text-slate-500">In Review</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* APPROVALS TAB */}
                            {activeTab === 'approvals' && (
                                <motion.div key="approvals" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h2 className="text-3xl font-black tracking-tight">Pending Authorizations</h2>
                                            <p className="text-slate-400 font-medium mt-1">Verify identity and grant access to platform recruiters</p>
                                        </div>
                                        <Badge className="bg-purple-500 text-white font-black px-4 py-1.5">{pendingRequests.length} New Requests</Badge>
                                    </div>

                                    {pendingRequests.length === 0 ? (
                                        <div className="h-96 flex flex-col items-center justify-center bg-slate-900 border border-dashed border-white/10 rounded-[40px]">
                                            <CheckCircle className="w-16 h-16 text-slate-800 mb-4" />
                                            <p className="text-slate-500 font-black tracking-tight">System Status: Cleared</p>
                                            <p className="text-xs text-slate-600 uppercase font-black tracking-widest mt-2">No pending registration requests</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {pendingRequests.map((req) => (
                                                <Card key={req.id} className="bg-slate-900 border-white/10 p-8 rounded-[32px] flex flex-col hover:shadow-2xl hover:border-purple-500/20 transition-all">
                                                    <div className="flex justify-between items-start mb-6">
                                                        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                                                            {req.role === 'hiring_manager' ? <Briefcase className="w-6 h-6 text-blue-400" /> : <Users className="w-6 h-6 text-indigo-400" />}
                                                        </div>
                                                        <Badge className={`${req.role === 'hiring_manager' ? 'bg-blue-500/10 text-blue-400' : 'bg-indigo-500/10 text-indigo-400'} border-none font-black text-[10px] uppercase`}>
                                                            {req.role.replace('_', ' ')}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex-1 space-y-4 mb-8">
                                                        <div>
                                                            <h4 className="text-xl font-black tracking-tight">{req.full_name}</h4>
                                                            <div className="flex items-center gap-2 text-slate-400 mt-1">
                                                                <Mail className="w-3.5 h-3.5" />
                                                                <span className="text-xs font-bold">{req.email}</span>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-3">
                                                            <div className="flex items-center gap-2">
                                                                <Building2 className="w-4 h-4 text-slate-500" />
                                                                <span className="text-sm font-bold text-slate-300">{req.company_name}</span>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-3 pt-2">
                                                                <div className="bg-slate-950 p-3 rounded-xl">
                                                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Dept</p>
                                                                    <p className="text-xs font-bold truncate">{req.department || 'N/A'}</p>
                                                                </div>
                                                                <div className="bg-slate-950 p-3 rounded-xl">
                                                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Specialty</p>
                                                                    <p className="text-xs font-bold truncate">{req.job_title || req.specialization || 'General'}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <Button variant="outline" onClick={() => handleApproval(req.id, false)} isLoading={actionLoading === req.id}
                                                            className="border-red-500/20 hover:bg-red-500/10 text-red-400 h-12 rounded-xl text-xs font-black">
                                                            <XCircle className="w-4 h-4 mr-2" /> REJECT
                                                        </Button>
                                                        <Button onClick={() => handleApproval(req.id, true)} isLoading={actionLoading === req.id}
                                                            className="bg-purple-600 hover:bg-purple-700 text-white h-12 rounded-xl shadow-lg shadow-purple-500/20 text-xs font-black">
                                                            <CheckCircle className="w-4 h-4 mr-2" /> APPROVE
                                                        </Button>
                                                    </div>
                                                </Card>
                                            ))}
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {/* USERS TAB */}
                            {activeTab === 'users' && (
                                <motion.div key="users" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h2 className="text-3xl font-black tracking-tight">Platform Users</h2>
                                            <p className="text-slate-400 font-medium mt-1">Remove users who should no longer have platform access</p>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs font-black text-slate-500 bg-slate-900 border border-white/5 rounded-2xl px-4 py-2">
                                            <UserX className="w-4 h-4 text-red-400" />
                                            {allRecruiters.length} Active Recruiter{allRecruiters.length !== 1 ? 's' : ''}
                                        </div>
                                    </div>

                                    {allRecruiters.length === 0 ? (
                                        <div className="h-64 flex flex-col items-center justify-center bg-slate-900 border border-dashed border-white/10 rounded-[40px]">
                                            <Users className="w-12 h-12 text-slate-800 mb-4" />
                                            <p className="text-slate-500 font-black">No active recruiters</p>
                                        </div>
                                    ) : (
                                        <div className="bg-slate-900 rounded-[32px] border border-white/5 overflow-hidden">
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="border-b border-white/5 text-[10px] uppercase font-black text-slate-500 tracking-widest">
                                                        <th className="px-8 py-5">User</th>
                                                        <th className="px-4 py-5">Role</th>
                                                        <th className="px-4 py-5">Company</th>
                                                        <th className="px-4 py-5">Department</th>
                                                        <th className="px-8 py-5 text-right">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {allRecruiters.map((u: any) => (
                                                        <tr key={u.id} className="group hover:bg-white/5 transition-colors">
                                                            <td className="px-8 py-5">
                                                                <div>
                                                                    <p className="text-sm font-black">{u.name}</p>
                                                                    <p className="text-xs text-slate-500">{u.email}</p>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-5">
                                                                <Badge className={`text-[10px] font-black uppercase border-none ${u.role === 'hiring_manager' ? 'bg-blue-500/10 text-blue-400' : 'bg-indigo-500/10 text-indigo-400'}`}>
                                                                    {u.role.replace('_', ' ')}
                                                                </Badge>
                                                            </td>
                                                            <td className="px-4 py-5 text-sm font-bold text-slate-300">{u.company || '—'}</td>
                                                            <td className="px-4 py-5 text-sm text-slate-500">{u.department || '—'}</td>
                                                            <td className="px-8 py-5 text-right">
                                                                <Button variant="outline" onClick={() => confirmRemoveUser(u)}
                                                                    className="opacity-0 group-hover:opacity-100 border-red-500/20 hover:bg-red-500/10 text-red-400 h-9 rounded-xl text-xs font-black gap-2 transition-opacity">
                                                                    <Trash2 className="w-3.5 h-3.5" /> Remove
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {/* COMPANIES TAB */}
                            {activeTab === 'companies' && (
                                <motion.div key="companies" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8">
                                    <div>
                                        <h2 className="text-3xl font-black tracking-tight">Company Ecosystem</h2>
                                        <p className="text-slate-400 font-medium mt-1">Manage access at the company level — removing a company removes all its recruiters</p>
                                    </div>
                                    {stats?.companies_overview?.length === 0 && (
                                        <div className="h-64 flex flex-col items-center justify-center bg-slate-900 border border-dashed border-white/10 rounded-[40px]">
                                            <Building2 className="w-12 h-12 text-slate-800 mb-4" />
                                            <p className="text-slate-500 font-black">No companies registered yet</p>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {stats?.companies_overview?.map((co: any, i: number) => (
                                            <Card key={i} className="bg-slate-900 border-white/5 p-8 hover:bg-slate-800/50 transition-colors group">
                                                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-blue-500/10">
                                                    <Building2 className="w-8 h-8 text-white" />
                                                </div>
                                                <h3 className="text-2xl font-black mb-6">{co.name}</h3>
                                                <div className="space-y-3 mb-6">
                                                    <div className="flex items-center justify-between p-4 bg-slate-950/50 rounded-2xl">
                                                        <div className="flex items-center gap-3">
                                                            <Briefcase className="w-4 h-4 text-slate-500" />
                                                            <span className="text-sm font-bold text-slate-300">Hiring Managers</span>
                                                        </div>
                                                        <span className="font-black h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center">{co.hms_count}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between p-4 bg-slate-950/50 rounded-2xl">
                                                        <div className="flex items-center gap-3">
                                                            <Users className="w-4 h-4 text-slate-500" />
                                                            <span className="text-sm font-bold text-slate-300">Resource Managers</span>
                                                        </div>
                                                        <span className="font-black h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center">{co.rms_count}</span>
                                                    </div>
                                                </div>
                                                <Button variant="outline" onClick={() => confirmRemoveCompany(co.name)}
                                                    className="w-full border-red-500/20 hover:bg-red-500/10 text-red-400 h-11 rounded-xl text-xs font-black gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Trash2 className="w-4 h-4" /> Remove Entire Company
                                                </Button>
                                            </Card>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {/* INQUIRIES TAB */}
                            {activeTab === 'inquiries' && (
                                <motion.div key="inquiries" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h2 className="text-xl font-black tracking-tight">Support Inquiries</h2>
                                            <p className="text-xs text-slate-400 font-medium mt-1">Direct inquiries from the landing page</p>
                                        </div>
                                    </div>

                                    {inquiries.length === 0 ? (
                                        <div className="h-64 flex flex-col items-center justify-center bg-slate-900 border border-dashed border-white/10 rounded-[40px]">
                                            <MessageSquare className="w-12 h-12 text-slate-800 mb-4" />
                                            <p className="text-slate-500 font-black">No inquiries found</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                            {inquiries.map((inq) => (
                                                <Card key={inq.id} className="bg-slate-900 border-white/5 p-5 rounded-2xl hover:border-purple-500/20 transition-all group">
                                                    <div className="flex flex-col gap-5 h-full">
                                                        <div className="space-y-3 flex-1">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-2.5">
                                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${inq.status === 'new' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                                                                        <Mail className="w-4 h-4" />
                                                                    </div>
                                                                    <div>
                                                                        <h4 className="text-xs font-black tracking-tight leading-none">{inq.email}</h4>
                                                                        <p className="text-[10px] font-bold text-slate-500 mt-1">{new Date(inq.created_at).toLocaleString()}</p>
                                                                    </div>
                                                                </div>
                                                                <Badge className={`text-[9px] h-5 border-none px-2 ${inq.status === 'new' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                                                                    {inq.status}
                                                                </Badge>
                                                            </div>
                                                            <div className="p-4 bg-slate-950/50 rounded-xl border border-white/5">
                                                                <p className="text-xs text-slate-400 font-medium leading-relaxed italic line-clamp-4">"{inq.message}"</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3 pt-2">
                                                            {inq.status === 'new' ? (
                                                                <Button onClick={() => setReplyModal(inq)}
                                                                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white h-10 rounded-xl font-black text-[10px] gap-2">
                                                                    <Send className="w-3.5 h-3.5" /> Reply
                                                                </Button>
                                                            ) : (
                                                                <div className="flex-1 flex items-center justify-center gap-2 text-emerald-400 font-black text-[10px] h-10 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                                                                    <CheckCircle className="w-3.5 h-3.5" /> Responded
                                                                </div>
                                                            )}
                                                            <Button variant="outline" onClick={async () => {
                                                                if(window.confirm("Permanently delete this inquiry from the system?")) {
                                                                    try {
                                                                        await api.delete(`/admin/contact-requests/${inq.id}`);
                                                                        setInquiries(prev => prev.filter(i => i.id !== inq.id));
                                                                    } catch (err) { alert("Failed to delete inquiry."); }
                                                                }
                                                            }}
                                                                className="border-white/5 text-slate-600 hover:text-red-400 hover:bg-red-500/5 h-10 w-10 rounded-xl transition-all shrink-0">
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </Card>
                                            ))}
                                        </div>
                                    )}
                                </motion.div>
                            )}

                        </AnimatePresence>
                    </div>
                </main>
            </div>
        </div>
    );
};

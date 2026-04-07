import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { 
    MapPin, 
    Building, 
    Trash2, 
    Bell, 
    X, 
    Briefcase,
    Users,
    Calendar,
    Plus,
    Sparkles,
    Copy,
    Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { cn } from '../../utils/cn';

export const ResourceManagerOpenRoles = () => {
    const [roles, setRoles] = useState<any[]>([]);
    const [copiedId, setCopiedId] = useState<number | null>(null);
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);
    const [hiringManagers, setHiringManagers] = useState<any[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [isGeneratingJD, setIsGeneratingJD] = useState(false);
    const [formData, setFormData] = useState({
        title: '', department: '', location: '', skills: '', description: '', assigned_hm_id: '',
        employment_type: 'Full-time', openings: 1, urgency: 'Medium',
        experience_required: '', education: '', salary_min: '', salary_max: '',
        budget_approved: false, target_joining_date: '',
        roles_responsibilities: '', nice_to_have_skills: ''
    });
    const [requestToApprove, setRequestToApprove] = useState<any>(null);

    useEffect(() => {
        fetchRoles();
        fetchPendingRequests();
        fetchHiringManagers();
    }, []);

    const fetchRoles = async () => {
        try {
            const { data } = await api.get('/rm/requisitions');
            setRoles(data);
        } catch (error) {
            console.error('Failed to fetch roles', error);
        }
    };

    const fetchPendingRequests = async () => {
        try {
            const { data } = await api.get('/rm/hire-requests');
            setPendingRequests(data);
        } catch (error) {
            console.error('Failed to fetch pending requests', error);
        }
    };

    const fetchHiringManagers = () => {
        api.get('/users/hiring-managers').then(res => setHiringManagers(res.data)).catch(console.error);
    };

    const handleGenerateJD = async () => {
        if (!formData.title || !formData.skills) return;
        setIsGeneratingJD(true);
        try {
            const { data } = await api.post('/hm/generate-jd', { title: formData.title, skills: formData.skills });
            setFormData(prev => ({ ...prev, description: data.generated_description }));
        } catch (error) {
            console.error(error);
        } finally {
            setIsGeneratingJD(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = { 
                ...formData, 
                role: formData.title,
                assigned_hm_id: formData.assigned_hm_id ? parseInt(formData.assigned_hm_id) : null,
                required_skills: formData.skills,
                job_description: formData.description,
                salary_min: formData.salary_min ? parseFloat(formData.salary_min) : null,
                salary_max: formData.salary_max ? parseFloat(formData.salary_max) : null,
            };

            if (requestToApprove) {
                await api.patch(`/rm/hire-requests/${requestToApprove.id}/approve`, payload);
                setRequestToApprove(null);
            } else {
                await api.post('/rm/requisitions', payload);
            }

            setIsCreating(false);
            setFormData({ 
                title: '', department: '', location: '', skills: '', description: '', assigned_hm_id: '', 
                employment_type: 'Full-time', openings: 1, urgency: 'Medium',
                experience_required: '', education: '', salary_min: '', salary_max: '',
                budget_approved: false, target_joining_date: '',
                roles_responsibilities: '', nice_to_have_skills: ''
            });
            fetchPendingRequests();
            fetchRoles();
        } catch (error) {
            console.error(error);
        }
    };

    const toggleStatus = async (role: any) => {
        const newStatus = role.status === 'open' ? 'closed' : 'open';
        try {
            await api.patch(`/rm/requisitions/${role.id}/status`, { status: newStatus });
            fetchRoles();
        } catch (error) {
            console.error(error);
        }
    };

    const handleDelete = async (roleId: number) => {
        if (!confirm('Are you sure? This will delete all associated applications.')) return;
        try {
            await api.post(`/rm/requisitions/${roleId}/delete`);
            setRoles(prev => prev.filter(r => r.id !== roleId));
        } catch (error: any) {
            console.error(error);
        }
    };

    const handleCopyLink = (roleId: number) => {
        const url = `${window.location.origin}/jobs/${roleId}`;
        navigator.clipboard.writeText(url);
        setCopiedId(roleId);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleApproveRequest = (req: any) => {
        setFormData({
            title: req.title || '',
            department: req.department || '',
            location: req.location || '',
            skills: req.required_skills || req.skills || '',
            description: req.job_description || req.description || '',
            roles_responsibilities: req.roles_responsibilities || '',
            assigned_hm_id: req.assigned_hm_id ? req.assigned_hm_id.toString() : '',
            employment_type: req.employment_type || 'Full-time',
            openings: req.openings || 1,
            urgency: req.urgency || 'Medium',
            experience_required: req.experience_required || '',
            education: req.education || '',
            salary_min: req.salary_min ? req.salary_min.toString() : '',
            salary_max: req.salary_max ? req.salary_max.toString() : '',
            budget_approved: req.budget_approved || false,
            target_joining_date: req.target_joining_date || '',
            nice_to_have_skills: req.nice_to_have_skills || ''
        });
        setRequestToApprove(req);
        setIsCreating(true);
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Job Management</h1>
                    <p className="text-sm text-slate-500 mt-1">Manage active requisitions and approve incoming hire requests.</p>
                </div>
                <div className="flex items-center gap-3">

                    <Button className="btn-primary-modern" onClick={() => { setRequestToApprove(null); setIsCreating(true); }}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Requisition
                    </Button>
                </div>
            </div>

            {/* Pending Hire Requests */}
            {pendingRequests.length > 0 && (
                <div className="bg-amber-50/50 border border-amber-200 rounded-lg p-6">
                    <div className="flex items-center gap-2 mb-6 text-amber-900">
                        <Bell className="w-5 h-5" />
                        <h2 className="text-lg font-bold">Pending Hire Requests ({pendingRequests.length})</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {pendingRequests.map(req => (
                            <Card key={req.id} className="bg-white border-amber-200 shadow-sm relative overflow-hidden group">
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="w-10 h-10 bg-amber-100 rounded flex items-center justify-center text-amber-700">
                                            <Briefcase className="w-5 h-5" />
                                        </div>
                                        <Badge variant="info" className="rounded py-0.5 text-[10px] uppercase font-bold">Review Required</Badge>
                                    </div>
                                    <h3 className="text-base font-bold text-slate-900 mb-1">{req.title}</h3>
                                    <p className="text-xs text-slate-500 font-medium mb-4">{req.department} • {req.location || 'Remote'}</p>
                                    
                                    <div className="space-y-2 mb-6">
                                        <div className="flex justify-between text-xs font-medium">
                                            <span className="text-slate-500">Openings:</span>
                                            <span className="text-slate-900">{req.openings || 1}</span>
                                        </div>
                                        <div className="flex justify-between text-xs font-medium">
                                            <span className="text-slate-500">Urgency:</span>
                                            <span className="text-slate-900">{req.urgency || 'Medium'}</span>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <Button onClick={() => handleApproveRequest(req)} className="flex-1 btn-primary-modern h-9 text-xs">Review</Button>
                                        <Button variant="ghost" className="flex-1 text-xs h-9 hover:bg-slate-100" onClick={() => { if(confirm('Reject request?')) api.patch(`/rm/hire-requests/${req.id}/reject`).then(fetchPendingRequests) }}>Reject</Button>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Active Requisitions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
                {roles.map(role => (
                    <Card 
                        key={role.id} 
                        className="glass-card p-6 flex flex-col group hover:border-slate-300 transition-colors"
                    >
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-12 h-12 bg-slate-100 rounded flex items-center justify-center text-slate-500 group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors">
                                <Briefcase className="w-6 h-6" />
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-[10px] font-bold text-slate-400 bg-slate-50 border-slate-200">ID: {role.id}</Badge>
                                    <Badge variant={role.status === 'open' ? 'success' : 'default'} className="rounded py-0.5 capitalize">
                                        {role.status}
                                    </Badge>
                                </div>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleDelete(role.id); }} 
                                    className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-slate-900 group-hover:text-primary-600 transition-colors leading-tight mb-2">{role.title}</h3>
                            <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 text-xs font-medium text-slate-500">
                                <div className="flex items-center gap-1.5">
                                    <Building className="w-3.5 h-3.5 opacity-60" /> {role.department}
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5 opacity-60" /> {role.location || 'Remote'}
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Users className="w-3.5 h-3.5 opacity-60" /> {role.openings || 1} Openings
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1">
                                    <span className={cn("w-2 h-2 rounded-full", role.status === 'open' ? 'bg-emerald-500' : 'bg-slate-300')}></span>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{role.status === 'open' ? 'Active' : 'Inactive'}</span>
                                </div>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-7 text-[10px] font-black uppercase text-slate-500 hover:bg-slate-50 px-2"
                                    onClick={(e) => { e.stopPropagation(); handleCopyLink(role.id); }}
                                >
                                    {copiedId === role.id ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                                    {copiedId === role.id ? 'Copied' : 'Link'}
                                </Button>
                            </div>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-primary-600 text-[10px] font-bold hover:bg-primary-50 px-2" 
                                onClick={(e) => { e.stopPropagation(); toggleStatus(role); }}
                            >
                                {role.status === 'open' ? 'Close' : 'Re-open'}
                            </Button>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Create/Approve Modal */}
            <AnimatePresence>
                {isCreating && (
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-slate-200"
                        >
                            <div className="px-8 py-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900">{requestToApprove ? 'Approve Hire Request' : 'Create New Requisition'}</h2>
                                    <p className="text-xs text-slate-500 mt-1">Configure job details and set recruitment parameters.</p>
                                </div>
                                <button onClick={() => { setIsCreating(false); setRequestToApprove(null); }} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>

                            <form onSubmit={handleCreate} className="overflow-y-auto p-10 space-y-12 flex-1 custom-scrollbar">
                                {/* Core Identity */}
                                <section>
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-1.5 h-6 bg-primary-600 rounded-full"></div>
                                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Base Information</h3>
                                    </div>
                                    <div className="grid grid-cols-2 gap-8">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Job Title</label>
                                            <input required type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="input-modern h-12" placeholder="e.g. Senior Software Engineer" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Department</label>
                                            <input required type="text" value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} className="input-modern h-12" placeholder="e.g. Product Engineering" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Location</label>
                                            <input type="text" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} className="input-modern h-12" placeholder="e.g. London / Remote" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Hiring Manager</label>
                                            <select required value={formData.assigned_hm_id} onChange={e => setFormData({ ...formData, assigned_hm_id: e.target.value })} className="input-modern h-12">
                                                <option value="" disabled>Select User</option>
                                                {hiringManagers.map(hm => (
                                                    <option key={hm.id} value={hm.id}>{hm.full_name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </section>

                                {/* Hiring Parameters */}
                                <section>
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
                                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Recruitment Parameters</h3>
                                    </div>
                                    <div className="grid grid-cols-4 gap-6">
                                        <div className="col-span-2">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Employment Type</label>
                                            <select value={formData.employment_type} onChange={e => setFormData({ ...formData, employment_type: e.target.value })} className="input-modern h-12">
                                                <option>Full-time</option>
                                                <option>Contract</option>
                                                <option>Internship</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Openings</label>
                                            <input type="number" min="1" value={formData.openings} onChange={e => setFormData({ ...formData, openings: parseInt(e.target.value) })} className="input-modern h-12" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Urgency</label>
                                            <select value={formData.urgency} onChange={e => setFormData({ ...formData, urgency: e.target.value })} className="input-modern h-12 text-xs font-bold uppercase">
                                                <option>High</option>
                                                <option>Medium</option>
                                                <option>Low</option>
                                            </select>
                                        </div>
                                    </div>
                                </section>

                                {/* Compensation / Logistics */}
                                <section>
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-1.5 h-6 bg-emerald-600 rounded-full"></div>
                                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Financials & Logistics</h3>
                                    </div>
                                    <div className="grid grid-cols-3 gap-8">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Salary Range (Min-Max)</label>
                                            <div className="flex items-center gap-2">
                                                <input type="number" value={formData.salary_min} onChange={e => setFormData({ ...formData, salary_min: e.target.value })} className="input-modern h-12 text-sm" placeholder="Min" />
                                                <span className="text-slate-400">—</span>
                                                <input type="number" value={formData.salary_max} onChange={e => setFormData({ ...formData, salary_max: e.target.value })} className="input-modern h-12 text-sm" placeholder="Max" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Target Date</label>
                                            <div className="relative">
                                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <input type="date" value={formData.target_joining_date} onChange={e => setFormData({ ...formData, target_joining_date: e.target.value })} className="input-modern h-12 pl-10" />
                                            </div>
                                        </div>
                                        <div className="flex items-end">
                                            <label className="flex items-center gap-3 cursor-pointer p-3 border border-slate-200 rounded bg-slate-50 w-full h-12 transition-colors hover:bg-slate-100">
                                                <input type="checkbox" checked={formData.budget_approved} onChange={e => setFormData({ ...formData, budget_approved: e.target.checked })} className="w-4 h-4 text-primary-600 rounded border-slate-300" />
                                                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Budget Approved</span>
                                            </label>
                                        </div>
                                    </div>
                                </section>

                                {/* Content Generation */}
                                <section>
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-1.5 h-6 bg-amber-600 rounded-full"></div>
                                            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Job Content</h3>
                                        </div>
                                         {!requestToApprove && (
                                            <Button type="button" variant="outline" size="sm" onClick={handleGenerateJD} disabled={isGeneratingJD} className="text-[10px] font-bold uppercase h-8 border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100">
                                                {isGeneratingJD ? 'Generating...' : <><Sparkles className="w-3.5 h-3.5 mr-2" /> AI Assistant</>}
                                            </Button>
                                        )}
                                    </div>
                                    <div className="space-y-6">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Primary Skills (Comma Separated)</label>
                                            <input required type="text" value={formData.skills} onChange={e => setFormData({ ...formData, skills: e.target.value })} className="input-modern h-12" placeholder="e.g. React, Node.js, AWS, Kubernetes" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Comprehensive Job Description (Roles & Responsibilities)</label>
                                            <textarea required rows={10} value={formData.roles_responsibilities} onChange={e => setFormData({ ...formData, roles_responsibilities: e.target.value })} className="input-modern p-4 text-sm leading-relaxed" placeholder="Detailed role responsibilities..." />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Role Impact / Base Description</label>
                                            <textarea required rows={4} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="input-modern p-4 text-sm leading-relaxed" placeholder="High-level summary of the role..." />
                                        </div>
                                    </div>
                                </section>
                            </form>

                            <div className="px-10 py-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                                <Button variant="ghost" onClick={() => setIsCreating(false)} className="px-8 font-bold text-slate-600">Cancel</Button>
                                <Button className="btn-primary-modern px-10" onClick={handleCreate}>
                                    {requestToApprove ? 'Approve & Release Role' : 'Save Requisition'}
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

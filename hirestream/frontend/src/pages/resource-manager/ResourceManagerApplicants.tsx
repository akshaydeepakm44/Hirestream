import { useEffect, useState } from 'react';
import { api, API_URL } from '../../api/client';
import { 
    User,
    Users, 
    Zap, 
    Sparkles,
    ChevronLeft, 
    ChevronRight, 
    Search, 
    Trash2,
    Mail,
    Calendar,
    Filter,
    MoreHorizontal,
    FileText,
    Briefcase,
    GraduationCap,
    X,
    CheckCircle,
    RotateCcw,
    ArrowUp,
    ArrowDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { cn } from '../../utils/cn';
import { useAuth } from '../../context/AuthContext';
import { EmailComposerModal } from '../../components/EmailComposerModal';
import { MeetingSchedulerModal } from '../../components/MeetingSchedulerModal';

interface Applicant {
    id: number;
    candidate_id: number;
    candidate_name: string;
    candidate_email: string;
    candidate_experience: number;
    candidate_skills: string;
    candidate_summary: string;
    candidate_current_title: string;
    requisition_title: string;
    ats_score: number | null;
    status: string;
    applied_at: string;
    resume_path?: string;
    cover_letter?: string;
    candidate_status?: string; // New global status: applied, in_pipeline, rejected, archived
    candidate_phone?: string;
    
    // Application Specifics
    dob?: string;
    country?: string;
    city?: string;
    state?: string;
    school?: string;
    degree?: string;
    degree_of_study?: string;
    area_of_study?: string;
    education_country?: string;
    is_first_job?: boolean;
    current_ctc?: number;
    expected_ctc?: number;
    willing_to_relocate?: boolean;
    available_start_date?: string;
    work_mode_preference?: string;
    relevant_experience?: number;
    current_role_title?: string;
    domain_experience?: string;
    screening_answers?: string;
    status_history?: any[];
    resume_url?: string;
}

export const ResourceManagerApplicants = () => {
    const [applicants, setApplicants] = useState<Applicant[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [movingId, setMovingId] = useState<number | null>(null);
    const [scanningId, setScanningId] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [minScore, setMinScore] = useState(0);
    const [viewingApplicant, setViewingApplicant] = useState<Applicant | null>(null);
    const [isScanningAll, setIsScanningAll] = useState(false);
    const [activeTab, setActiveTab] = useState<'details' | 'mail' | 'schedule'>('details');
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const { user } = useAuth();
    const [roles, setRoles] = useState<{ id: number; title: string }[]>([]);
    const [selectedRole, setSelectedRole] = useState<number | null>(null);
    const [showFilters, setShowFilters] = useState(false);
    
    // Detailed Filters
    const [workMode, setWorkMode] = useState<string>('');
    const [employmentType, setEmploymentType] = useState<string>('');
    const [ctcRange, setCtcRange] = useState<{ min: number; max: number }>({ min: 0, max: 100 }); // In Lakhs
    const [expRange, setExpRange] = useState<{ min: number; max: number }>({ min: 0, max: 30 }); // In Years
    const [daysAgo, setDaysAgo] = useState<number>(0);
    const [sortBy, setSortBy] = useState<string>('applied_at');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [filterMetadata, setFilterMetadata] = useState<{ work_modes: string[], employment_types: string[] }>({
        work_modes: [],
        employment_types: []
    });
    
    const limit = 10;

    const fetchData = async (background = false) => {
        if (!background) setLoading(true);
        try {
            const { data } = await api.get(`/rm/applications/paginated`, {
                params: { 
                    page, 
                    limit, 
                    min_score: minScore, 
                    requisition_id: selectedRole || undefined,
                    search: searchTerm || undefined,
                    work_mode: workMode || undefined,
                    employment_type: employmentType || undefined,
                    min_ctc: ctcRange.min * 100000 || undefined,
                    max_ctc: ctcRange.max * 100000 || undefined,
                    min_experience: expRange.min || undefined,
                    max_experience: expRange.max || undefined,
                    days_ago: daysAgo || undefined,
                    sort_by: sortBy,
                    sort_order: sortOrder
                }
            });
            setApplicants(data.items);
            setTotal(data.total);
        } catch (error) {
            console.error('Failed to fetch applicants:', error);
        } finally {
            if (!background) setLoading(false);
        }
    };

    useEffect(() => {
        api.get('/rm/requisitions').then(res => setRoles(res.data)).catch(console.error);
        api.get('/rm/applications/filter-metadata').then(res => setFilterMetadata(res.data)).catch(console.error);
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(() => fetchData(true), 10000);
        return () => clearInterval(interval);
    }, [page, minScore, selectedRole, searchTerm, workMode, employmentType, ctcRange, expRange, daysAgo, sortBy, sortOrder]);

    const handleMoveToPipeline = async (app: Applicant) => {
        setMovingId(app.id);
        try {
            // Step 1: Update Application to use the new move-to-pipeline endpoint
            await api.patch(`/rm/applications/${app.id}/move-to-pipeline`);
            
            // Refresh local state to reflect change instantly
            setApplicants(prev => prev.map(a => a.id === app.id ? { ...a, candidate_status: 'in_pipeline' } : a));
            
            if (viewingApplicant?.id === app.id) {
                setViewingApplicant({ ...viewingApplicant, candidate_status: 'in_pipeline' });
            }
            
            // Optional: You could still trigger things like auto-shortlisting here
        } catch (error) {
            console.error('Failed to move to pipeline:', error);
        } finally {
            setMovingId(null);
        }
    };

    const handleScan = async (appId: number) => {
        setScanningId(appId);
        try {
            const { data } = await api.post('/rm/ats/analyze-application', { application_id: appId });
            setApplicants(prev => prev.map(a => a.id === appId ? { ...a, ats_score: data.ats_score } : a));
        } catch (error) {
            console.error('Scan failed:', error);
        } finally {
            setScanningId(null);
        }
    };

    const handleScanAll = async () => {
        const unscanned = applicants.filter(app => app.ats_score === null);
        if (unscanned.length === 0) {
            alert('All candidates on this page already have ATS scores.');
            return;
        }

        setIsScanningAll(true);
        try {
            for (const app of unscanned) {
                await handleScan(app.id);
            }
        } finally {
            setIsScanningAll(false);
        }
    };
    const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);

    const handleDelete = async (appId: number) => {
        if (!confirm('Are you sure you want to delete this application?')) return;
        try {
            await api.delete(`/rm/applications/${appId}`);
            setApplicants(prev => prev.filter(a => a.id !== appId));
            setTotal(prev => prev - 1);
        } catch (error) {
            console.error('Failed to delete applicant:', error);
        }
    };

    const totalPages = Math.ceil(total / limit);

    const clearAllFilters = () => {
        setSearchTerm('');
        setMinScore(0);
        setSelectedRole(null);
        setWorkMode('');
        setEmploymentType('');
        setCtcRange({ min: 0, max: 100 });
        setExpRange({ min: 0, max: 30 });
        setDaysAgo(0);
        setSortBy('applied_at');
        setSortOrder('desc');
        setPage(1);
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 min-h-screen pb-20">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-slate-100">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                        Candidate Management
                        {total > 0 && <span className="text-xs bg-primary-50 text-primary-600 px-2 py-0.5 rounded-full border border-primary-100">{total}</span>}
                    </h1>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Global Talent Acquisition Pipeline</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Search by name or email..." 
                            className="bg-white border border-slate-200 text-sm rounded-xl pl-10 pr-4 py-2.5 w-72 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all shadow-sm"
                            value={searchTerm}
                            onChange={(e) => { 
                                setSearchTerm(e.target.value);
                                setPage(1);
                            }}
                        />
                    </div>
                    <Button 
                        variant={showFilters ? "primary" : "outline"}
                        className={cn("h-10 text-xs font-bold uppercase tracking-widest px-6", showFilters && "bg-slate-900 text-white")}
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        <Filter className="w-4 h-4 mr-2" /> 
                        {showFilters ? "Close Filters" : "Filter System"}
                    </Button>
                </div>
            </div>

            {/* Advanced Filter Panel */}
            <AnimatePresence>
                {showFilters && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <Card className="p-8 bg-slate-50 border-slate-200 border shadow-inner space-y-8 rounded-3xl">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                                {/* Role & Score */}
                                <div className="space-y-4">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Inbound for Requisition</label>
                                    <select 
                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary-500/10 shadow-sm"
                                        value={selectedRole || ''}
                                        onChange={(e) => setSelectedRole(Number(e.target.value) || null)}
                                    >
                                        <option value="">All Active Roles</option>
                                        {roles.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
                                    </select>
                                    
                                    <div className="space-y-2 mt-6">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex justify-between">
                                            Min ATS Score <span>{minScore}%</span>
                                        </label>
                                        <input 
                                            type="range" 
                                            min="0" max="100" 
                                            value={minScore} 
                                            onChange={(e) => setMinScore(Number(e.target.value))}
                                            className="w-full accent-primary-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                                        />
                                    </div>
                                </div>

                                {/* Work Mode & Employment */}
                                <div className="space-y-4">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Work Preference</label>
                                    <div className="flex flex-wrap gap-2">
                                        {(filterMetadata.work_modes.length > 0 ? filterMetadata.work_modes : ['Remote', 'Hybrid', 'Onsite']).map(mode => (
                                            <button 
                                                key={mode}
                                                onClick={() => {
                                                    setWorkMode(workMode === mode ? '' : mode);
                                                    setPage(1);
                                                }}
                                                className={cn(
                                                    "px-4 py-2 text-[10px] font-bold uppercase rounded-lg border transition-all",
                                                    workMode === mode 
                                                        ? "bg-primary-600 border-primary-600 text-white shadow-md shadow-primary-500/20" 
                                                        : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                                                )}
                                            >
                                                {mode}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="mt-4 space-y-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Employment Type</label>
                                        <select 
                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium outline-none"
                                            value={employmentType}
                                            onChange={(e) => {
                                                setEmploymentType(e.target.value);
                                                setPage(1);
                                            }}
                                        >
                                            <option value="">All Types</option>
                                            {(filterMetadata.employment_types.length > 0 ? filterMetadata.employment_types : ['Fulltime', 'Internship', 'Contract', 'Freelance']).map(type => (
                                                <option key={type} value={type}>{type}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Experience & CTC */}
                                <div className="space-y-4">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Experience Range (Years)</label>
                                    <div className="flex items-center gap-3">
                                        <input 
                                            type="number" 
                                            placeholder="Min" 
                                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none"
                                            value={expRange.min}
                                            onChange={(e) => setExpRange({...expRange, min: Number(e.target.value)})}
                                        />
                                        <span className="text-slate-400">-</span>
                                        <input 
                                            type="number" 
                                            placeholder="Max" 
                                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none"
                                            value={expRange.max}
                                            onChange={(e) => setExpRange({...expRange, max: Number(e.target.value)})}
                                        />
                                    </div>

                                    <div className="mt-4 space-y-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Expected CTC (LPA)</label>
                                        <div className="flex items-center gap-3">
                                            <input 
                                                type="number" 
                                                placeholder="Min" 
                                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none"
                                                value={ctcRange.min}
                                                onChange={(e) => setCtcRange({...ctcRange, min: Number(e.target.value)})}
                                            />
                                            <span className="text-slate-400">-</span>
                                            <input 
                                                type="number" 
                                                placeholder="Max" 
                                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none"
                                                value={ctcRange.max}
                                                onChange={(e) => setCtcRange({...ctcRange, max: Number(e.target.value)})}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Sorting & Time */}
                                <div className="space-y-4">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ranking / Sort By</label>
                                    <div className="flex gap-2">
                                        <select 
                                            className="grow bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium outline-none"
                                            value={sortBy}
                                            onChange={(e) => setSortBy(e.target.value)}
                                        >
                                            <option value="applied_at">Date Applied</option>
                                            <option value="ats_score">ATS Score</option>
                                            <option value="relevant_experience">Experience</option>
                                            <option value="expected_ctc">Min CTC</option>
                                        </select>
                                        <button 
                                            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                                            className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600"
                                        >
                                            {sortOrder === 'desc' ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />}
                                        </button>
                                    </div>

                                    <div className="mt-4 space-y-2 text-right">
                                        <Button 
                                            variant="ghost" 
                                            className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 hover:text-red-500 hover:bg-red-50"
                                            onClick={clearAllFilters}
                                        >
                                            <RotateCcw className="w-3.5 h-3.5 mr-2" /> Reset All Parameters
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Active Filters Row */}
            {(workMode || employmentType || minScore > 0 || selectedRole || searchTerm) && (
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mr-2">Telemetry Filter:</span>
                    {selectedRole && <Badge variant="info" className="bg-white border-primary-100 text-primary-600 px-3 py-1 text-[9px] font-bold rounded-full shadow-sm">{roles.find(r => r.id === selectedRole)?.title}</Badge>}
                    {workMode && <Badge variant="info" className="px-3 py-1 text-[9px] font-bold rounded-full shadow-sm">{workMode}</Badge>}
                    {employmentType && <Badge variant="info" className="px-3 py-1 text-[9px] font-bold rounded-full shadow-sm">{employmentType}</Badge>}
                    {minScore > 0 && <Badge variant="success" className="px-3 py-1 text-[9px] font-bold rounded-full shadow-sm">Score &gt; {minScore}%</Badge>}
                    {searchTerm && <Badge variant="white" className="px-3 py-1 text-[9px] font-bold rounded-full shadow-sm">Query: {searchTerm}</Badge>}
                </div>
            )}

            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Button 
                        onClick={handleScanAll} 
                        disabled={isScanningAll || loading || applicants.length === 0}
                        className="bg-slate-900 h-10 px-6 group overflow-hidden relative text-white"
                    >
                        <div className={cn("flex items-center gap-2", isScanningAll && "opacity-0 invisible")}>
                            <Sparkles className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
                            <span>Scan All Candidates</span>
                        </div>
                        {isScanningAll && (
                            <div className="absolute inset-0 flex items-center justify-center bg-primary-600">
                                <Zap className="w-4 h-4 animate-spin text-white" />
                                <span className="ml-2">Scanning...</span>
                            </div>
                        )}
                    </Button>
                </div>
            </div>

            <Card className="p-0 overflow-hidden border border-slate-200 shadow-sm bg-white">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Candidate</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Current Role</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Applied Position</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ATS Score</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i}>
                                        <td colSpan={5} className="px-6 py-4"><Skeleton className="h-10 w-full rounded" /></td>
                                    </tr>
                                ))
                            ) : (
                                applicants.map((app) => (
                                    <tr key={app.id} className="group hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => { setViewingApplicant(app); setActiveTab('details'); }}>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 bg-slate-100 rounded flex items-center justify-center text-slate-500 font-bold text-xs border border-slate-200">
                                                    {app.candidate_name?.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900 group-hover:text-primary-600 transition-colors">{app.candidate_name}</p>
                                                    <p className="text-xs text-slate-500">{app.candidate_email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm text-slate-700 font-medium truncate max-w-[180px]">{app.current_role_title || app.candidate_current_title || "N/A"}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm text-slate-700 font-medium truncate max-w-[180px]">{app.requisition_title}</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">#{app.id}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                                    <div 
                                                        className={cn("h-full transition-all duration-700", (app.ats_score || 0) >= 70 ? 'bg-emerald-500' : 'bg-primary-500')} 
                                                        style={{ width: `${app.ats_score || 0}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs font-bold text-slate-700">
                                                    {app.ats_score !== null ? `${app.ats_score}%` : '---'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-2">
                                                <Badge variant={app.status === 'ready_for_hm' ? 'success' : app.status === 'rejected' ? 'danger' : 'info'} className="w-fit rounded capitalize font-bold text-[10px]">
                                                    {app.status === 'sourcing' ? 'Applied' : app.status.replace(/_/g, ' ')}
                                                </Badge>
                                                {app.candidate_status === 'applied' ? (
                                                    <Button 
                                                        size="sm" 
                                                        onClick={(e) => { e.stopPropagation(); handleMoveToPipeline(app); }}
                                                        isLoading={movingId === app.id}
                                                        className="h-7 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white border-none font-black px-2 py-0.5 rounded shadow-sm"
                                                    >
                                                        Move to Pipeline
                                                    </Button>
                                                ) : app.candidate_status === 'in_pipeline' ? (
                                                    <Badge className="bg-slate-100 text-slate-500 border-slate-200 text-[10px] font-bold py-1 w-fit shadow-none">
                                                        <CheckCircle className="w-3 h-3 mr-1 text-emerald-500" /> In Pipeline
                                                    </Badge>
                                                ) : null}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={(e) => { e.stopPropagation(); handleScan(app.id); }} disabled={scanningId === app.id} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-white border border-transparent hover:border-slate-200 rounded transition-all" title="Run ATS Analysis">
                                                    <Zap className={cn("w-4 h-4", scanningId === app.id && "animate-spin text-amber-500")} />
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); handleDelete(app.id); }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-white border border-transparent hover:border-slate-200 rounded transition-all" title="Delete Application">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                                <button className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-white border border-transparent hover:border-slate-200 rounded transition-all">
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                            {!loading && applicants.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center">
                                        <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                        <p className="text-base font-bold text-slate-900">No applicants found</p>
                                        <p className="text-sm text-slate-500 mt-1">Try broadening your search or filter criteria.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="bg-slate-50 px-6 py-4 flex items-center justify-between border-t border-slate-200">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Displaying {applicants.length} of {total} results
                    </p>
                    <div className="flex items-center gap-2">
                         <Button
                            variant="outline"
                            size="sm"
                            disabled={page === 1}
                            onClick={() => setPage(p => p - 1)}
                            className="btn-outline-modern h-8 px-2"
                        >
                            <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                        </Button>
                        <div className="flex items-center gap-1">
                            {[...Array(totalPages)].slice(0, 5).map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setPage(i + 1)}
                                    className={cn(
                                        "w-8 h-8 rounded text-xs font-bold transition-all",
                                        page === i + 1 ? "bg-white border border-slate-300 text-primary-600 shadow-sm" : "bg-transparent text-slate-500 hover:bg-white hover:border-slate-200 border border-transparent"
                                    )}
                                >
                                    {i + 1}
                                </button>
                            ))}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page === totalPages}
                            onClick={() => setPage(p => p + 1)}
                            className="btn-outline-modern h-8 px-2"
                        >
                            Next <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Candidate Detail Modal */}
            <AnimatePresence>
                {viewingApplicant && (
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col md:flex-row border border-slate-200"
                        >
                            {/* Left Side: Navigation / Summary */}
                            <div className="w-full md:w-80 bg-slate-50 border-r border-slate-200 p-8 flex flex-col">
                                <Button variant="ghost" onClick={() => setViewingApplicant(null)} className="mb-6 -ml-2 p-2 hover:bg-slate-200 rounded-full w-fit">
                                    <X className="w-5 h-5" />
                                </Button>
                                <div className="text-center mb-10">
                                    <div className="w-20 h-20 bg-slate-900 rounded-lg mx-auto flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-slate-900/10">
                                        {viewingApplicant.candidate_name?.charAt(0)}
                                    </div>
                                    <h2 className="text-xl font-bold text-slate-900 mt-6 leading-tight">{viewingApplicant.candidate_name}</h2>
                                    <p className="text-xs text-slate-500 mt-1 uppercase font-bold tracking-tight">{viewingApplicant.candidate_current_title || 'Applicant'}</p>
                                </div>

                                <div className="space-y-2 mb-8">
                                    <Button 
                                        onClick={() => setActiveTab('details')}
                                        className={cn("w-full justify-start rounded-md h-11 text-sm font-semibold", activeTab === 'details' ? "bg-white border-slate-200 text-primary-600 shadow-sm" : "bg-transparent text-slate-600 hover:bg-slate-200")}
                                        variant="outline"
                                    >
                                        <User className="w-4 h-4 mr-3" /> Candidate Profile
                                    </Button>
                                </div>

                                <div className="mt-auto pt-8 border-t border-slate-200 space-y-4">
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Primary Contact</p>
                                        <p className="text-sm font-medium text-slate-700 truncate">{viewingApplicant.candidate_email}</p>
                                        {viewingApplicant.candidate_phone && (
                                            <p className="text-sm font-medium text-slate-700 truncate mt-1">{viewingApplicant.candidate_phone}</p>
                                        )}
                                        {viewingApplicant.city && viewingApplicant.country && (
                                            <p className="text-xs text-slate-500 mt-1">{viewingApplicant.city}, {viewingApplicant.country}</p>
                                        )}
                                    </div>
                                    <Button onClick={() => setViewingApplicant(null)} variant="outline" className="w-full text-xs font-bold h-10 border-slate-300">Close Profile</Button>
                                </div>
                            </div>

                            {/* Right Side: Tabbed Content */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-10">
                                {activeTab === 'details' && (
                                    <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-10">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="text-sm font-bold text-primary-600 uppercase tracking-widest leading-none mb-2">Review</h3>
                                                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Applicant Details</h2>
                                            </div>
                                            <Badge variant="success" className="rounded py-1 px-3">Active</Badge>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <Card className="p-6 bg-slate-50 border-none rounded-lg">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-4">ATS Match Score</p>
                                                <div className="flex items-center gap-4">
                                                    <span className="text-4xl font-bold text-slate-900">{viewingApplicant.ats_score || 0}%</span>
                                                    <div className="flex-1 bg-white h-2 rounded-full border border-slate-200 overflow-hidden">
                                                        <div className="bg-primary-600 h-full" style={{ width: `${viewingApplicant.ats_score || 0}%` }} />
                                                    </div>
                                                </div>
                                            </Card>
                                            <Card className="p-6 bg-slate-50 border-none rounded-lg flex flex-col justify-between">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Status & Pipeline</p>
                                                    <Badge variant={viewingApplicant.candidate_status === 'applied' ? 'info' : 'success'}>
                                                        {viewingApplicant.candidate_status === 'applied' ? 'New Applicant' : 'Active Pipeline'}
                                                    </Badge>
                                                </div>
                                                {viewingApplicant.candidate_status === 'applied' && (
                                                    <Button 
                                                        onClick={() => handleMoveToPipeline(viewingApplicant)}
                                                        isLoading={movingId === viewingApplicant.id}
                                                        className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 shadow-lg shadow-emerald-200"
                                                    >
                                                        Move to Pipeline
                                                    </Button>
                                                )}
                                                {viewingApplicant.candidate_status === 'in_pipeline' && (
                                                    <div className="flex items-center gap-2 text-emerald-600 mt-4 text-sm font-bold">
                                                        <CheckCircle className="w-5 h-5" /> Verified in Pipeline
                                                    </div>
                                                )}
                                            </Card>
                                        </div>

                                        <section className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                <Sparkles className="w-3.5 h-3.5 text-primary-500" /> Candidate Bio & Summary
                                            </h4>
                                            <div className="text-sm text-slate-700 leading-relaxed font-medium">
                                                {viewingApplicant.candidate_summary ? (
                                                    <div className="whitespace-pre-line bg-white p-4 rounded-lg border border-slate-200/50 shadow-sm">
                                                        {viewingApplicant.candidate_summary}
                                                    </div>
                                                ) : (
                                                    <div className="italic text-slate-400 p-4 border-2 border-dashed border-slate-200 rounded-lg text-center">
                                                        No profile summary provided by the candidate.
                                                    </div>
                                                )}
                                            </div>
                                        </section>

                                        <div className="grid grid-cols-2 gap-8">
                                            <section className="space-y-4">
                                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2 flex items-center gap-2">
                                                    <Briefcase className="w-3.5 h-3.5" /> Experience
                                                </h4>
                                                <div className="grid grid-cols-1 gap-4">
                                                    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-tighter">Date of Birth</p>
                                                        <p className="text-sm font-bold text-slate-800 mt-1 leading-tight">{viewingApplicant.dob || "Not specified"}</p>
                                                    </div>
                                                    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-tighter">Total Years</p>
                                                        <p className="text-lg font-bold text-slate-900 mt-0.5">{(viewingApplicant.relevant_experience || (viewingApplicant.candidate_experience > 0 ? viewingApplicant.candidate_experience : 0)) || 'N/A'} Years</p>
                                                    </div>
                                                    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-tighter">Current Role</p>
                                                        <p className="text-sm font-bold text-slate-800 mt-1 leading-tight">{viewingApplicant.current_role_title || viewingApplicant.candidate_current_title || "Not specified"}</p>
                                                    </div>
                                                    {viewingApplicant.current_ctc && (
                                                        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-tighter">Current CTC</p>
                                                            <p className="text-sm font-bold text-slate-800 mt-1">₹ {viewingApplicant.current_ctc.toLocaleString()}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </section>

                                            <section className="space-y-4">
                                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2 flex items-center gap-2">
                                                    <GraduationCap className="w-3.5 h-3.5" /> Education
                                                </h4>
                                                <div className="grid grid-cols-1 gap-4">
                                                    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-tighter">Degree</p>
                                                        <p className="text-sm font-bold text-slate-800 mt-1">{viewingApplicant.degree || "Not specified"}</p>
                                                    </div>
                                                    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-tighter">Institution</p>
                                                        <p className="text-sm font-bold text-slate-800 mt-1 leading-tight">{viewingApplicant.school || "Not specified"}</p>
                                                    </div>
                                                    {viewingApplicant.area_of_study && (
                                                        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-tighter">Field of Study</p>
                                                            <p className="text-sm font-bold text-slate-800 mt-1">{viewingApplicant.area_of_study}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </section>
                                        </div>

                                        <section className="space-y-4">
                                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2 flex items-center gap-2">
                                                <Zap className="w-3.5 h-3.5" /> Skillset & Key Competencies
                                            </h4>
                                            <div className="flex flex-wrap gap-2.5">
                                                {viewingApplicant.candidate_skills ? (
                                                    viewingApplicant.candidate_skills.split(',').map((skill, idx) => (
                                                        <Badge key={idx} variant="info" className="px-4 py-2 text-xs rounded-lg border-slate-200 font-bold bg-white text-slate-700 shadow-sm hover:border-primary-300 hover:text-primary-600 transition-all cursor-default">
                                                            {skill.trim()}
                                                        </Badge>
                                                    ))
                                                ) : (
                                                    <p className="text-sm text-slate-400 italic">No specific skills listed in profile.</p>
                                                )}
                                            </div>
                                        </section>

                                        <section className="space-y-4">
                                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2 flex items-center gap-2">
                                                <FileText className="w-3.5 h-3.5" /> Core Documents
                                            </h4>
                                            {viewingApplicant.resume_url ? (
                                                <div className="flex items-center gap-4 bg-primary-50/30 p-5 rounded-2xl border border-primary-100/50 group transition-all hover:bg-primary-50/50">
                                                    <div className="w-14 h-14 bg-white text-primary-600 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                                        <FileText className="w-7 h-7" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="font-bold text-slate-900 text-base">{viewingApplicant.candidate_name}'s Resume.pdf</p>
                                                        <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5 font-medium">
                                                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Securely Verified & Scanned
                                                        </p>
                                                    </div>
                                                    <a 
                                                        href={viewingApplicant.resume_url?.startsWith('http') 
                                                            ? viewingApplicant.resume_url 
                                                            : `${API_URL}${viewingApplicant.resume_url?.startsWith('/') ? '' : '/'}${viewingApplicant.resume_url}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="px-6 py-3 bg-primary-600 text-white hover:bg-primary-700 rounded-xl text-sm font-bold transition-all shadow-lg shadow-primary-200"
                                                    >
                                                        Open Resume
                                                    </a>
                                                </div>
                                            ) : (
                                                <div className="bg-amber-50 rounded-xl p-5 border border-amber-200 flex items-center gap-3 text-amber-800">
                                                    <Sparkles className="w-5 h-5" />
                                                    <p className="text-sm font-medium">Wait, no resume was found in the storage bucket for this candidate.</p>
                                                </div>
                                            )}
                                        </section>

                                        {viewingApplicant.status_history && viewingApplicant.status_history.length > 0 && (
                                            <section className="space-y-4">
                                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">Application Journey</h4>
                                                <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                                                    {viewingApplicant.status_history.map((h, i) => (
                                                        <div key={h.id} className="relative">
                                                            <div className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full ring-4 ring-white ${i === 0 ? 'bg-primary-600' : 'bg-slate-300'}`} />
                                                            <div>
                                                                <p className="text-sm font-bold text-slate-900">
                                                                    {h.status === 'screening' ? 'Moved to Pipeline' : h.status}
                                                                </p>
                                                                <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                                                                    {new Date(h.changed_at).toLocaleDateString()}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </section>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'mail' && (
                                    <div className="flex flex-col items-center justify-center min-h-[40vh] text-center space-y-4">
                                        <div className="w-16 h-16 bg-primary-50 text-primary-600 rounded-full flex items-center justify-center">
                                            <Mail className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-900">Professional Communicator</h3>
                                            <p className="text-sm text-slate-500 max-w-sm mt-1">Our email system is now upgraded to a professional Gmail-like experience.</p>
                                        </div>
                                        <Button 
                                            onClick={() => setIsEmailModalOpen(true)}
                                            className="btn-primary-modern h-12 px-8"
                                        >
                                            Launch Composer
                                        </Button>
                                    </div>
                                )}

                                {activeTab === 'schedule' && (
                                    <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-8">
                                        <h2 className="text-3xl font-bold text-slate-900">Schedule Interview</h2>
                                        <div className="grid grid-cols-2 gap-8">
                                                <div className="bg-slate-900 overflow-hidden relative p-8 rounded-3xl shadow-2xl border border-white/10 group hover:border-primary-500/50 transition-all duration-500">
                                                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 rounded-bl-full -mr-8 -mt-8 flex items-start justify-end p-8">
                                                        <Sparkles className="w-8 h-8 text-primary-400 opacity-50" />
                                                    </div>
                                                    
                                                    <div className="relative z-10">
                                                        <h3 className="text-xl font-bold text-white mb-2">Schedule Evaluator Review</h3>
                                                        <p className="text-slate-400 text-sm font-medium leading-relaxed mb-8">
                                                            Launch the enterprise scheduler to coordinate with multiple stakeholders, 
                                                            tag panel members, and establish Google Meet synchronization.
                                                        </p>
                                                        
                                                        <Button 
                                                            onClick={() => setIsMeetingModalOpen(true)}
                                                            className="w-full h-14 bg-white text-slate-900 hover:bg-slate-50 font-black rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-black/10 group-hover:scale-[1.02] transform transition-all active:scale-[0.98]"
                                                        >
                                                            Open Enterprise Scheduler
                                                            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white">
                                                                <Calendar className="w-4 h-4" />
                                                            </div>
                                                        </Button>
                                                    </div>
                                                </div>
                                            <Card className="bg-slate-50 border-none p-8 flex flex-col items-center justify-center text-center">
                                                <Calendar className="w-10 h-10 text-primary-500 mb-4" />
                                                <p className="text-sm font-bold text-slate-900 mb-2">Calendar Synchronization</p>
                                                <p className="text-xs text-slate-500 font-medium leading-relaxed">System will check for internal availability and send invites upon confirmation.</p>
                                            </Card>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {viewingApplicant && (
                <>
                    <EmailComposerModal 
                        isOpen={isEmailModalOpen}
                        onClose={() => setIsEmailModalOpen(false)}
                        candidateEmail={viewingApplicant.candidate_email || ''}
                        candidateName={viewingApplicant.candidate_name || ''}
                        currentUserEmail={user?.email || ''}
                    />
                    <MeetingSchedulerModal 
                        isOpen={isMeetingModalOpen}
                        onClose={() => setIsMeetingModalOpen(false)}
                        applicationId={viewingApplicant.id}
                        candidateName={viewingApplicant.candidate_name}
                        candidateEmail={viewingApplicant.candidate_email}
                        onSuccess={() => {
                            // Success handling already built-in to modal
                        }}
                    />
                </>
            )}
        </div>
    );
};

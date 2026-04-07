import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import { Requisition } from '../../types';
import { 
    MapPin, 
    Briefcase, 
    Search, 
    CheckCircle, 
    Building2, 
    ArrowRight
} from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { cn } from '../../utils/cn';
import { CandidateApplyFlow } from './CandidateApplyFlow';

export const CandidateFindJobs = () => {
    const navigate = useNavigate();
    const [jobs, setJobs] = useState<Requisition[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedJob, setSelectedJob] = useState<Requisition | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [appliedJobIds, setAppliedJobIds] = useState<number[]>([]);

    const [searchParams, setSearchParams] = useSearchParams();
    const applyJobId = searchParams.get('apply');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [reqs, apps] = await Promise.all([
                    api.get('/candidates/jobs'),
                    api.get('/candidates/applications/me')
                ]);
                
                const appsData = Array.isArray(apps.data) ? apps.data : (apps.data.results || []);
                const appliedIds = appsData.map((a: any) => Number(a.requisition_id));
                setAppliedJobIds(appliedIds);

                const jobsData = reqs.data.map((j: any) => ({
                    ...j,
                    job_description: j.job_description || j.description,
                    required_skills: j.required_skills || j.skills,
                    is_applied: j.is_applied || appliedIds.includes(Number(j.id))
                }));
                setJobs(jobsData);

                // Auto-apply logic
                if (applyJobId) {
                    const job = jobsData.find((j: any) => Number(j.id) === Number(applyJobId));
                    if (job && !job.is_applied) {
                        setSelectedJob(job);
                        localStorage.removeItem('applyJobId'); // Self-cleaning!
                    }
                    // Remove query param without reload
                    const newParams = new URLSearchParams(searchParams);
                    newParams.delete('apply');
                    setSearchParams(newParams, { replace: true });
                }
                
            } catch (e) {
                console.error("FAILED TO FETCH CANDIDATE DATA:", e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [applyJobId]);

    const filteredJobs = jobs.filter(j => 
        (j.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
         (j.department || '').toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Job Search</h1>
                    <p className="text-sm text-slate-500 mt-1">Explore and apply to approved requisitions across the organization.</p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Search roles or departments..." 
                            className="bg-white border border-slate-300 rounded-md pl-10 pr-4 py-2 text-sm w-full focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Content List */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-64 w-full rounded-lg" />)}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredJobs.map((job: any) => {
                        const isApplied = job.is_applied || appliedJobIds.includes(Number(job.id));
                        return (
                            <Card 
                                key={job.id} 
                                className={cn(
                                    "glass-card p-6 flex flex-col hover:border-primary-500 cursor-pointer transition-all group relative border-l-4 duration-300",
                                    isApplied ? "border-l-emerald-500 border-emerald-50/20 bg-emerald-50/5" : "border-l-transparent"
                                )}
                                onClick={() => {
                                    if (isApplied) {
                                        alert("You have already applied for this role. Please check 'My Applications' for status updates.");
                                        return;
                                    }
                                    navigate(`/jobs/${job.id}`);
                                }}
                            >
                                {isApplied && (
                                    <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-emerald-100/90 backdrop-blur-md text-emerald-700 px-3 py-1.5 rounded-full text-[11px] font-black border border-emerald-200/50 shadow-sm z-10 animate-in fade-in zoom-in-95">
                                        <CheckCircle className="w-4 h-4" />
                                        ALREADY APPLIED
                                    </div>
                                )}
                                
                                <div className="flex justify-between items-start mb-6">
                                    <div className={cn(
                                        "w-12 h-12 rounded-xl flex items-center justify-center transition-colors shadow-sm border border-slate-100",
                                        isApplied ? "bg-emerald-50 text-emerald-600" : "bg-white text-slate-400 group-hover:bg-primary-50 group-hover:text-primary-600"
                                    )}>
                                        <Building2 className="w-6 h-6" />
                                    </div>
                                    <Badge variant="default" className={cn(
                                        "rounded-full py-0.5 px-3 border-none capitalize font-bold text-[10px]",
                                        isApplied ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                                    )}>
                                        {job.department}
                                    </Badge>
                                </div>

                                <div className="flex-1">
                                    <p className="text-[10px] font-black text-primary-600 uppercase tracking-[0.2em] mb-1">{job.company_name || 'HireStream'}</p>
                                    <h3 className={cn(
                                        "text-lg font-bold transition-colors",
                                        isApplied ? "text-emerald-900 line-through opacity-40 text-sm" : "text-slate-900 group-hover:text-primary-600"
                                    )}>
                                        {job.title}
                                    </h3>
                                    <div className="flex items-center gap-4 mt-2 text-xs font-medium text-slate-500">
                                        <div className="flex items-center gap-1.5">
                                            <MapPin className="w-3.5 h-3.5 text-slate-400" /> {job.location || 'Remote'}
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Briefcase className="w-3.5 h-3.5 text-slate-400" /> Full-time
                                        </div>
                                    </div>
                                    <p className="text-sm text-slate-600 mt-4 line-clamp-2 leading-relaxed opacity-80">
                                        {job.job_description || 'No description available.'}
                                    </p>
                                </div>

                                <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between">
                                    <div className="flex gap-1.5">
                                        {(job.required_skills || 'General').split(',').slice(0, 2).map((skill: string) => (
                                            <Badge key={skill} variant="info" className={cn(
                                                "text-[10px] rounded px-2 font-bold",
                                                isApplied ? "bg-emerald-50 text-emerald-600/50 border-none" : "bg-blue-50 text-blue-600 border-blue-100"
                                            )}>
                                                {skill.trim()}
                                            </Badge>
                                        ))}
                                    </div>
                                    
                                    {isApplied ? (
                                        <Button 
                                            disabled 
                                            className="bg-emerald-100 text-emerald-700 border-none px-6 rounded-full font-black text-xs h-9 shadow-inner flex items-center gap-2 cursor-not-allowed opacity-100"
                                            title="You have already applied for this role"
                                        >
                                            Applied <CheckCircle className="w-4 h-4" />
                                        </Button>
                                    ) : (
                                        <div className="flex gap-2">
                                            <Button 
                                                className="btn-primary-modern px-6 rounded-full font-black text-xs h-9"
                                                onClick={(e) => { e.stopPropagation(); setSelectedJob(job); }}
                                            >
                                                Apply Now <ArrowRight className="w-3.5 h-3.5 ml-2" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        );
                    })}
                    {filteredJobs.length === 0 && (
                        <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 rounded-lg">
                            <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-lg font-bold text-slate-900">No open roles found</p>
                            <p className="text-sm text-slate-500 mt-1">New opportunities appear when roles are approved.</p>
                        </div>
                    )}
                </div>
            )}

            <AnimatePresence>
                {selectedJob && (
                    <CandidateApplyFlow 
                        job={selectedJob} 
                        onClose={() => setSelectedJob(null)} 
                        onSuccess={(id) => setAppliedJobIds(prev => [...prev, id])}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};




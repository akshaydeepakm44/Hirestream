import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { CandidateApplyFlow } from './candidate/CandidateApplyFlow';
import { AnimatePresence } from 'framer-motion';
import { 
    MapPin, 
    Briefcase, 
    Zap, 
    Building2, 
    ShieldCheck, 
    Clock, 
    Users, 
    User, 
    Calendar,
    ArrowRight
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { cn } from '../utils/cn';

export const JobDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, token } = useAuth();
    const [job, setJob] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showApplyFlow, setShowApplyFlow] = useState(false);
    const [isApplied, setIsApplied] = useState(false);

    useEffect(() => {
        setLoading(true);
        api.get(`/public/jobs/${id}`)
           .then(res => {
               if (typeof res.data === 'object' && res.data !== null && 'id' in res.data) {
                   setJob(res.data);
               } else {
                   setJob(null);
               }
               setLoading(false);
           })
           .catch(err => {
               console.error(err);
               setJob(null);
               setLoading(false);
           });
        
        if (token && user?.role === 'candidate') {
            api.get('/candidates/applications/me')
               .then(res => {
                   const apps = Array.isArray(res.data) ? res.data : (res.data.results || []);
                   const applied = apps.some((a: any) => Number(a.requisition_id) === Number(id));
                   setIsApplied(applied);
               })
               .catch(err => console.error("Failed to check application status", err));
        }
    }, [id, token, user]);


    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-primary-600 rounded-full animate-spin"></div>
        </div>
    );

    if (!job) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
            <h2 className="text-2xl font-bold mb-4">Job Not Found</h2>
        </div>
    );

    const handleApplyClick = () => {
        if (user?.role === 'candidate') {
            setShowApplyFlow(true);
        } else {
            localStorage.setItem("applyJobId", id || "");
            localStorage.setItem("redirectAfterLogin", "apply");
            navigate('/login');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50/50">
            {/* Minimal Header */}
            <header className="bg-white border-b border-slate-100 sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-900 font-bold border border-slate-200">HS</div>
                        <span className="text-lg font-black text-slate-900 tracking-tight">HireStream</span>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-12">

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-8">
                        <Card className="p-10 border-slate-200 bg-white shadow-xl rounded-3xl relative overflow-hidden">
                            <div className="relative z-10">
                                <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-6 border-b border-slate-100 pb-8">
                                    <div>
                                        <div className="flex items-center gap-3 mb-4">
                                            <Badge className="bg-primary-50 text-primary-700 font-black border-none uppercase tracking-widest text-[10px] px-3 py-1">
                                                {job.department}
                                            </Badge>
                                            <Badge variant="outline" className="text-slate-400 font-bold uppercase tracking-widest text-[9px] px-3 py-1 border-slate-200 bg-slate-50">
                                                ID: {job.id}
                                            </Badge>
                                        </div>
                                        <h1 className="text-4xl font-black text-slate-900 leading-tight mb-4">{job.title}</h1>
                                        <div className="flex flex-wrap items-center gap-6 text-sm font-semibold text-slate-500">
                                            <span className="flex items-center gap-2"><MapPin className="w-4 h-4 text-primary-500" /> {job.location || 'Remote'}</span>
                                            <span className="flex items-center gap-2"><Briefcase className="w-4 h-4 text-primary-500" /> {job.employment_type}</span>
                                            <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-primary-500" /> {job.experience_required || 'Mid-Level'}</span>
                                        </div>
                                    </div>
                                    <div className="w-20 h-20 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm flex items-center justify-center shrink-0">
                                        <Building2 className="w-10 h-10 text-slate-900" />
                                    </div>
                                </div>

                                <div className="space-y-12">
                                    <section>
                                        <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2 uppercase tracking-wide text-sm">
                                            <div className="w-1 h-4 bg-primary-500 rounded-full" /> Job Summary
                                        </h3>
                                        <div className="text-slate-600 leading-relaxed space-y-4 whitespace-pre-line text-[15px] font-medium">
                                            {job.job_description}
                                        </div>
                                    </section>

                                    {job.roles_responsibilities && (
                                        <section>
                                            <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2 uppercase tracking-wide text-sm">
                                                <div className="w-1 h-4 bg-amber-500 rounded-full" /> Roles & Responsibilities
                                            </h3>
                                            <div className="text-slate-600 leading-relaxed whitespace-pre-line text-[15px] font-medium">
                                                {job.roles_responsibilities}
                                            </div>
                                        </section>
                                    )}

                                    <section>
                                        <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2 uppercase tracking-wide text-sm">
                                            <div className="w-1 h-4 bg-emerald-500 rounded-full" /> Core Competencies
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {(job.required_skills || '').split(',').map((skill: string) => (
                                                <div key={skill} className="flex items-center gap-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 backdrop-blur-sm">
                                                    <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                                                    <span className="text-slate-700 font-bold text-[14px]">{skill.trim()}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Sidebar Infobox */}
                    <div className="space-y-6">
                        <Card className="p-8 border-slate-200 bg-white shadow-lg rounded-3xl sticky top-24">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Position Details</h4>
                            <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                                        <User className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hiring Manager</p>
                                        <p className="text-sm font-bold text-slate-900">{job.hiring_manager}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                        <Building2 className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Company</p>
                                        <p className="text-sm font-bold text-slate-900">{job.company_name || 'HireStream'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                                        <Users className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Openings</p>
                                        <p className="text-sm font-bold text-slate-900">{job.openings}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                                        <Calendar className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Posted On</p>
                                        <p className="text-sm font-bold text-slate-900">{new Date(job.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600">
                                        <Zap className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Applicants</p>
                                        <p className="text-sm font-bold text-slate-900">{job.applicants_count}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 pt-4">
                                <Button 
                                    className={cn(
                                        "w-full h-14 text-lg rounded-2xl shadow-xl transition-all",
                                        isApplied 
                                            ? "bg-emerald-50 text-emerald-600 border-none cursor-not-allowed" 
                                            : "bg-slate-900 hover:bg-slate-800 text-white shadow-slate-200"
                                    )} 
                                    onClick={handleApplyClick}
                                    disabled={isApplied}
                                >
                                    {isApplied ? (
                                        <div className="flex items-center justify-center gap-2">
                                            <ShieldCheck className="w-5 h-5" /> Already Applied
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center gap-2">
                                            Apply Now <ArrowRight className="w-5 h-5" />
                                        </div>
                                    )}
                                </Button>
                            </div>

                            <div className="mt-8 pt-8 border-t border-slate-100">
                                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl">
                                    <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                                        Equal Opportunity Employer and committed to diversity in the workplace.
                                    </p>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            </main>

            <AnimatePresence>
                {showApplyFlow && (
                    <CandidateApplyFlow 
                        job={job} 
                        onClose={() => setShowApplyFlow(false)} 
                        onSuccess={() => setIsApplied(true)} 
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

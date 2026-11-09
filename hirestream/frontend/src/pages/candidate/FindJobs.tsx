import { useEffect, useState } from 'react';
import { api, safeArray } from '../../api/client';
import { MapPin, Briefcase, Search, CheckCircle } from 'lucide-react';
import { JobApplicationDrawer } from './JobApplicationDrawer';

export const FindJobs = () => {
    const [jobs, setJobs] = useState<any[]>([]);
    const [selectedJob, setSelectedJob] = useState<any | null>(null);
    const [applySuccess, setApplySuccess] = useState(false);

    useEffect(() => {
        api.get('/candidates/jobs')
            .then(res => setJobs(safeArray(res.data)))
            .catch(err => {
                console.warn('Failed to fetch candidate jobs:', err);
                setJobs([]);
            });
    }, []);

    return (
        <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Open Opportunities</h1>
            <p className="text-slate-500 mb-8">Discover and apply to your dream job.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                {jobs.map(job => (
                    <div key={job.id} className="card relative overflow-hidden flex flex-col">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-primary-50 rounded-lg text-primary-600">
                                <Briefcase className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 leading-tight">{job.title}</h3>
                        </div>
                        <div className="space-y-2 text-sm text-slate-500 mb-6">
                            <p className="flex items-center"><MapPin className="w-4 h-4 mr-2 text-slate-400" /> {job.location || 'Remote'}</p>
                            <p className="flex items-center"><Search className="w-4 h-4 mr-2 text-slate-400" /> {job.department || 'General'}</p>
                        </div>
                        <p className="text-sm text-slate-600 line-clamp-2 mb-4">
                            {job.description}
                        </p>
                        <div className="mt-auto">
                           <button onClick={() => setSelectedJob(job)} className="btn-secondary w-full">View Details</button>
                        </div>
                    </div>
                ))}
            </div>

            {selectedJob && (
                <JobApplicationDrawer 
                    job={selectedJob} 
                    onClose={() => setSelectedJob(null)}
                    onSuccess={() => {
                        setSelectedJob(null);
                        setApplySuccess(true);
                        setTimeout(() => setApplySuccess(false), 5000);
                    }}
                />
            )}
            
            {applySuccess && (
                <div className="fixed bottom-8 right-8 z-[60] bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-slide-up">
                    <CheckCircle className="w-6 h-6" />
                    <div>
                        <p className="font-bold">Application Successful!</p>
                        <p className="text-xs text-emerald-50">You can track your status in the Applications tab.</p>
                    </div>
                </div>
            )}
        </div>
    );
};

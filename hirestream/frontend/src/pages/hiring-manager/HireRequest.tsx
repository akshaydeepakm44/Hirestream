import { useState } from 'react';
import { api } from '../../api/client';
import { 
    Briefcase, 
    DollarSign, 
    FileText, 
    CheckCircle,
    Users,
    ChevronRight,
    ShieldCheck,
    ChevronLeft,
    Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { cn } from '../../utils/cn';

export const HireRequest = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [step, setStep] = useState(1);
    const [isGeneratingJD, setIsGeneratingJD] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        department: '',
        location: '',
        employment_type: 'Full-time',
        openings: 1,
        experience_required: '',
        skills: '',
        education: '',
        salary_min: '',
        salary_max: '',
        budget_approved: false,
        target_joining_date: '',
        urgency: 'Medium',
        roles_responsibilities: '',
        required_skills_text: '',
        nice_to_have_skills: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
        }));
    };

    const handleGenerateJD = async () => {
        if (!formData.title || !formData.skills) {
            alert("Title and Skills are required to generate a JD.");
            setStep(1); // Take them back to Step 1 if title missing
            return;
        }
        setIsGeneratingJD(true);
        try {
            const { data } = await api.post('/generate-jd', { 
                title: formData.title, 
                skills: formData.skills,
                department: formData.department,
                location: formData.location
            });
            setFormData(prev => ({ ...prev, roles_responsibilities: data.job_description }));
        } catch (error) {
            console.error('Failed to generate JD:', error);
        } finally {
            setIsGeneratingJD(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        if (e) e.preventDefault();
        
        // Prevent submission if not on the final step
        if (step < 4) {
            setStep(prev => prev + 1);
            return;
        }

        setLoading(true);
        try {
            await api.post('/hm/hire-requests', {
                ...formData,
                salary_min: formData.salary_min ? parseFloat(formData.salary_min) : null,
                salary_max: formData.salary_max ? parseFloat(formData.salary_max) : null,
            });
            setSuccess(true);
            setTimeout(() => {
                navigate('/hiring-manager');
            }, 3000);
        } catch (error: any) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setSuccess(false);
        setStep(1);
        setFormData({
            title: '',
            department: '',
            location: '',
            employment_type: 'Full-time',
            openings: 1,
            experience_required: '',
            skills: '',
            education: '',
            salary_min: '',
            salary_max: '',
            budget_approved: false,
            target_joining_date: '',
            urgency: 'Medium',
            roles_responsibilities: '',
            required_skills_text: '',
            nice_to_have_skills: ''
        });
    };

    if (success) {
        return (
            <div className="h-[70vh] flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-500">
                <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center text-white mb-6 shadow-lg shadow-emerald-500/20">
                    <CheckCircle className="w-8 h-8" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900">Hire Request Submitted</h1>
                <p className="text-sm text-slate-500 max-w-sm mt-2">Your request has been sent for approval. You will be notified once a Resource Manager reviews it.</p>
                <div className="mt-8 flex gap-3">
                    <Button variant="outline" className="btn-outline-modern" onClick={() => navigate('/hiring-manager')}>Go to Dashboard</Button>
                    <Button className="btn-primary-modern" onClick={handleReset}>Submit Another</Button>
                </div>
            </div>
        );
    }

    const steps = [
        { id: 1, label: 'Position Details', icon: Briefcase },
        { id: 2, label: 'Requirements', icon: Users },
        { id: 3, label: 'Budget & Timeline', icon: DollarSign },
        { id: 4, label: 'Job Description', icon: FileText }
    ];

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-8">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">New Hire Request</h1>
                    <p className="text-sm text-slate-500 mt-1">Submit a new job requisition for internal review and recruitment.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Stepper */}
                <div className="lg:col-span-1 space-y-2">
                    {steps.map((s) => (
                        <div
                            key={s.id}
                            className={cn(
                                "p-4 rounded-lg flex items-center gap-4 transition-all border",
                                step === s.id 
                                    ? "bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/10" 
                                    : "bg-white border-slate-200 text-slate-500 cursor-pointer hover:bg-slate-50"
                            )}
                            onClick={() => setStep(s.id)}
                        >
                            <div className={cn(
                                "w-8 h-8 rounded flex items-center justify-center text-xs font-bold",
                                step === s.id ? "bg-white/20" : "bg-slate-100"
                            )}>
                                {step > s.id ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : s.id}
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wide">{s.label}</span>
                        </div>
                    ))}
                </div>

                {/* Content Area */}
                <div className="lg:col-span-3">
                    <Card className="p-10 border border-slate-200 shadow-sm bg-white min-h-[500px] flex flex-col">
                        <div className="space-y-10 flex-1">
                            <AnimatePresence mode="wait">
                                {step === 1 && (
                                    <motion.div 
                                        key="step1"
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -10 }}
                                        className="space-y-8"
                                    >
                                        <div className="border-b border-slate-100 pb-4">
                                            <h3 className="text-lg font-bold text-slate-900">Position Details</h3>
                                            <p className="text-xs text-slate-500 mt-1">Foundational information for the role.</p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="col-span-2">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Job Title</label>
                                                <input required type="text" name="title" value={formData.title} onChange={handleChange} className="input-modern h-12" placeholder="e.g. Senior Backend Engineer" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Department</label>
                                                <select required name="department" value={formData.department} onChange={handleChange} className="input-modern h-12">
                                                    <option value="">Select Department</option>
                                                    <option value="Engineering">Engineering</option>
                                                    <option value="Product">Product Management</option>
                                                    <option value="Design">Design</option>
                                                    <option value="Marketing">Marketing</option>
                                                    <option value="Sales">Sales</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Location</label>
                                                <input type="text" name="location" value={formData.location} onChange={handleChange} className="input-modern h-12" placeholder="e.g. Remote / Office" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Employment Type</label>
                                                <select name="employment_type" value={formData.employment_type} onChange={handleChange} className="input-modern h-12">
                                                    <option value="Full-time">Full-time</option>
                                                    <option value="Contract">Contract</option>
                                                    <option value="Internship">Internship</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Urgency</label>
                                                <select name="urgency" value={formData.urgency} onChange={handleChange} className="input-modern h-12">
                                                    <option value="Low">Low</option>
                                                    <option value="Medium">Medium</option>
                                                    <option value="High">High</option>
                                                </select>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {step === 2 && (
                                    <motion.div 
                                        key="step2"
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -10 }}
                                        className="space-y-8"
                                    >
                                        <div className="border-b border-slate-100 pb-4">
                                            <h3 className="text-lg font-bold text-slate-900">Requirements</h3>
                                            <p className="text-xs text-slate-500 mt-1">Specify technical and professional expectations.</p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Number of Openings</label>
                                                <input required type="number" min="1" name="openings" value={formData.openings} onChange={handleChange} className="input-modern h-12" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Experience Level</label>
                                                <input type="text" name="experience_required" value={formData.experience_required} onChange={handleChange} className="input-modern h-12" placeholder="e.g. 5-7 years" />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Core Skills (Comma separated)</label>
                                                <input type="text" name="skills" value={formData.skills} onChange={handleChange} className="input-modern h-12" placeholder="e.g. React, Node.js, SQL" />
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {step === 3 && (
                                    <motion.div 
                                        key="step3"
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -10 }}
                                        className="space-y-8"
                                    >
                                        <div className="border-b border-slate-100 pb-4">
                                            <h3 className="text-lg font-bold text-slate-900">Budget & Timeline</h3>
                                            <p className="text-xs text-slate-500 mt-1">Financial and scheduling parameters.</p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Salary Range (Min - Max)</label>
                                                <div className="flex items-center gap-2">
                                                    <input type="number" name="salary_min" value={formData.salary_min} onChange={handleChange} className="input-modern h-12 text-sm" placeholder="Min" />
                                                    <input type="number" name="salary_max" value={formData.salary_max} onChange={handleChange} className="input-modern h-12 text-sm" placeholder="Max" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Target Start Date</label>
                                                <input type="date" name="target_joining_date" value={formData.target_joining_date} onChange={handleChange} className="input-modern h-12" />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="flex items-center gap-3 cursor-pointer p-4 border border-slate-200 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                                                    <input type="checkbox" name="budget_approved" checked={formData.budget_approved} onChange={handleChange} className="w-4 h-4 text-primary-600 rounded" />
                                                    <span className="text-sm font-bold text-slate-700">Budget already approved for this mandate</span>
                                                </label>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {step === 4 && (
                                    <motion.div 
                                        key="step4"
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -10 }}
                                        className="space-y-8"
                                    >
                                        <div className="border-b border-slate-100 pb-4 flex justify-between items-center">
                                            <div>
                                                <h3 className="text-lg font-bold text-slate-900">Job Description</h3>
                                                <p className="text-xs text-slate-500 mt-1">Detail the roles and responsibilities.</p>
                                            </div>
                                            <Button 
                                                type="button" 
                                                variant="outline" 
                                                size="sm" 
                                                onClick={handleGenerateJD} 
                                                disabled={isGeneratingJD}
                                                className="text-[10px] font-bold uppercase h-9 border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100"
                                            >
                                                {isGeneratingJD ? 'Generating...' : <><Sparkles className="w-3.5 h-3.5 mr-2" /> AI JD Assistant</>}
                                            </Button>
                                        </div>

                                        <div className="space-y-6">
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Comprehensive Job Description</label>
                                                <textarea required name="roles_responsibilities" value={formData.roles_responsibilities} onChange={handleChange} rows={10} className="input-modern p-4 text-sm leading-relaxed" placeholder="Detailed role description..." />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Role Impact / Summary</label>
                                                <textarea name="required_skills_text" value={formData.required_skills_text} onChange={handleChange} rows={3} className="input-modern p-4 text-sm" placeholder="Overview of the position..." />
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="mt-auto pt-10 border-t border-slate-100 flex justify-between">
                                <Button 
                                    type="button" 
                                    variant="ghost" 
                                    disabled={step === 1} 
                                    onClick={() => setStep(s => s - 1)}
                                    className="h-12 px-6 font-bold text-slate-500"
                                >
                                    <ChevronLeft className="w-4 h-4 mr-2" /> Previous
                                </Button>
                                
                                {step < 4 ? (
                                    <Button 
                                        type="button" 
                                        onClick={() => setStep(s => s + 1)}
                                        className="btn-primary-modern h-12 px-8"
                                    >
                                        Continue <ChevronRight className="w-4 h-4 ml-2" />
                                    </Button>
                                ) : (
                                    <Button 
                                        type="button" 
                                        onClick={handleSubmit}
                                        isLoading={loading}
                                        disabled={!formData.roles_responsibilities || formData.roles_responsibilities.length < 50}
                                        className="btn-primary-modern h-12 px-10 bg-emerald-600 hover:bg-emerald-700"
                                    >
                                        Submit Request
                                    </Button>
                                )}
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
            
            <div className="flex items-center gap-3 px-10 py-4 bg-slate-50 rounded-lg border border-slate-200">
                <ShieldCheck className="w-5 h-5 text-slate-400" />
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Formal process active. Internal workflow rules apply to all submissions.</p>
            </div>
        </div>
    );
};

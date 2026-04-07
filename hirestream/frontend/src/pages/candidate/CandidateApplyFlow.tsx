import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, Check, ChevronRight,
    UploadCloud, User, Briefcase, 
    MapPin, FileText, Calendar,
    CheckCircle, Building, Info,
    Loader2, Send, Globe2,
    Database, Laptop, Home, Award, Terminal
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { cn } from '../../utils/cn';

interface CandidateApplyFlowProps {
    job: any;
    onClose: () => void;
    onSuccess: (id: number) => void;
}

export const CandidateApplyFlow = ({ job, onClose, onSuccess }: CandidateApplyFlowProps) => {
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);
    const [resume, setResume] = useState<File | null>(null);
    const [resumeKey, setResumeKey] = useState<string>('');
    const [extractedSkills, setExtractedSkills] = useState<string[]>([]);
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form Data State
    const [formData, setFormData] = useState({
        // Stage 1
        dob: '',
        
        // Stage 2: Personal Details
        full_name: '',
        email: '',
        phone: '',
        country: '',
        state: '',
        city: '',
        
        // Stage 2: Education
        degree: '',
        institution: '',
        field_of_study: '',
        
        // Stage 2: Work Experience
        experience_years: 0,
        current_role: '',
        is_first_job: false,
        
        // Stage 2: Skills
        skills: [] as string[],
        
        // Stage 2: Preferences
        preferred_location: '',
        work_mode: 'Remote'
    });

    const [skillInput, setSkillInput] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        const fetchInitialData = async () => {
            // Fetch User basics (always succeed for logged in)
            try {
                const userRes = await api.get('/auth/me');
                const u = userRes.data;
                setFormData(prev => ({
                    ...prev,
                    full_name: (u.full_name || (u.first_name ? `${u.first_name} ${u.last_name || ''}`.trim() : '')) || prev.full_name || '',
                    email: u.email || prev.email || '',
                }));
            } catch (err) {
                console.error("Failed to load user info", err);
            }

            // Fetch Candidate profile basics (optional)
            try {
                const profileRes = await api.get('/candidates/profile');
                const p = profileRes.data;
                setFormData(prev => ({
                    ...prev,
                    phone: p.phone || prev.phone || '',
                    country: p.country || prev.country || '',
                    state: p.state || prev.state || '',
                    city: p.location || prev.city || '',
                    experience_years: p.experience_years || prev.experience_years || 0,
                    current_role: p.current_title || prev.current_role || '',
                    skills: p.skills ? p.skills.split(',').map((s: string) => s.trim()) : prev.skills || [],
                    work_mode: p.preferred_work_mode || 'Remote',
                    dob: p.dob || prev.dob || ''
                }));
            } catch (err) {
                console.log("No existing profile found or failed to load profile", err);
            }
        };
        fetchInitialData();
    }, []);

    const handleResumeUpload = async (file: File) => {
        setResume(file);
        if (errors.resume) setErrors(prev => {
            const { resume: _, ...rest } = prev;
            return rest;
        });
        setIsExtracting(true);
        try {
            const uploadData = new FormData();
            uploadData.append('file', file);
            const { data } = await api.post('/files/upload', uploadData);
            
            setResumeKey(data.object_key);
            if (data.extracted_skills && data.extracted_skills.length > 0) {
                setExtractedSkills(data.extracted_skills);
                setFormData(prev => ({
                    ...prev,
                    skills: [...new Set([...prev.skills, ...data.extracted_skills])]
                }));
            }
        } catch (err) {
            console.error("Upload/Extraction failed", err);
        } finally {
            setIsExtracting(false);
        }
    };

    const handleNext = () => {
        const newErrors: Record<string, string> = {};

        if (step === 1) {
            if (!formData.dob) {
                newErrors.dob = "Please fill this field";
            } else {
                const birthDate = new Date(formData.dob);
                const today = new Date();
                let age = today.getFullYear() - birthDate.getFullYear();
                const m = today.getMonth() - birthDate.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                    age--;
                }
                
                if (age < 18) {
                    newErrors.dob = "Candidates must be at least 18 years old to apply.";
                }
            }
            if (!resume) newErrors.resume = "Please upload your resume";
        }
        
        if (step === 2) {
            if (!formData.full_name?.trim()) newErrors.full_name = "Please fill this field";
            if (!formData.email?.trim()) newErrors.email = "Please fill this field";
            if (!formData.phone?.trim()) newErrors.phone = "Please fill this field";
            if (!formData.country?.trim()) newErrors.country = "Please fill this field";
            if (!formData.state?.trim()) newErrors.state = "Please fill this field";
            if (!formData.city?.trim()) newErrors.city = "Please fill this field";
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setErrors({});
        setStep(prev => prev + 1);
    };

    const handleBack = () => {
        setStep(prev => prev - 1);
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const submitData = new FormData();
            submitData.append('requisition_id', job.id.toString());
            submitData.append('resume_path', resumeKey);
            submitData.append('dob', formData.dob);
            submitData.append('country', formData.country);
            submitData.append('state', formData.state);
            submitData.append('city', formData.city);
            submitData.append('degree', formData.degree);
            submitData.append('school', formData.institution);
            submitData.append('area_of_study', formData.field_of_study);
            submitData.append('is_first_job', formData.is_first_job.toString());
            submitData.append('relevant_experience', formData.experience_years.toString());
            submitData.append('current_role_title', formData.current_role);
            submitData.append('work_mode_preference', formData.work_mode);
            submitData.append('willing_to_relocate', (formData.preferred_location !== '').toString());
            
            // Skill summary in screening answers
            submitData.append('screening_answers', JSON.stringify({
                preferred_location: formData.preferred_location,
                skills_at_application: formData.skills.join(', ')
            }));

            // Also update candidate profile for future apps
            try {
                await api.patch('/candidates/profile', {
                    phone: formData.phone,
                    location: formData.city,
                    experience_years: formData.experience_years,
                    current_title: formData.current_role,
                    skills: formData.skills.join(', '),
                    preferred_work_mode: formData.work_mode,
                    dob: formData.dob
                });
            } catch (err) {
                console.error("Profile update failed (non-blocking)", err);
            }

            await api.post('/candidates/applications', submitData);
            
            onSuccess(job.id);
            navigate('/candidate/applications', { state: { applied: true } });
            onClose();
        } catch (err: any) {
            alert(err.response?.data?.detail || "Submission failed");
        } finally {
            setIsSubmitting(false);
        }
    };

    const addSkill = () => {
        if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
            setFormData(prev => ({
                ...prev,
                skills: [...prev.skills, skillInput.trim()]
            }));
            setSkillInput('');
        }
    };

    const removeSkill = (skill: string) => {
        setFormData(prev => ({
            ...prev,
            skills: prev.skills.filter(s => s !== skill)
        }));
    };

    const steps = [
        { id: 1, name: 'Basic Info', icon: FileText, label: 'Stage 1' },
        { id: 2, name: 'Profile Details', icon: User, label: 'Stage 2' },
        { id: 3, name: 'Job Review', icon: Briefcase, label: 'Stage 3' }
    ];

    const slideVariants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 1000 : -1000,
            opacity: 0
        }),
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1
        },
        exit: (direction: number) => ({
            zIndex: 0,
            x: direction < 0 ? 1000 : -1000,
            opacity: 0
        })
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-end">
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                onClick={onClose}
            />
            
            <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="relative w-full max-w-2xl bg-slate-50 h-full shadow-2xl flex flex-col overflow-hidden border-l border-white/20"
            >
                {/* Custom Gradient Header */}
                <div className="relative px-8 pt-10 pb-20 bg-gradient-to-br from-primary-600 via-primary-700 to-indigo-800 text-white overflow-hidden">
                    <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                    <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-48 h-48 bg-indigo-400/20 rounded-full blur-2xl" />
                    
                    <div className="relative z-10 flex justify-between items-start">
                        <div>
                            <Badge className="bg-white/10 text-white border-white/20 mb-3 px-3 py-1 font-bold tracking-widest uppercase text-[10px]">
                                {job.department}
                            </Badge>
                            <h2 className="text-3xl font-black tracking-tight">{job.title}</h2>
                            <p className="text-primary-100 mt-2 text-sm font-medium flex items-center gap-3">
                                <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 opacity-70" /> {job.location}</span>
                                <span className="w-1 h-1 bg-white/30 rounded-full" />
                                <span className="flex items-center gap-1.5"><Building className="w-4 h-4 opacity-70" /> {job.employment_type || 'Full-time'}</span>
                            </p>
                        </div>
                        <button 
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-full transition-colors group"
                        >
                            <X className="w-6 h-6 text-white group-hover:rotate-90 transition-transform duration-300" />
                        </button>
                    </div>

                    {/* Step Indicator Integrated into Header */}
                    <div className="absolute bottom-0 left-0 right-0 px-8 py-6">
                        <div className="flex items-center justify-between gap-4">
                            {steps.map((s) => (
                                <div key={s.id} className="flex-1 flex flex-col gap-2">
                                    <div className="flex items-center gap-2">
                                        <div className={cn(
                                            "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-all duration-500",
                                            step >= s.id ? "bg-white text-primary-700 shadow-lg shadow-black/10" : "bg-white/10 text-white/50 border border-white/10"
                                        )}>
                                            {step > s.id ? <Check className="w-4 h-4" /> : s.id}
                                        </div>
                                        <span className={cn(
                                            "text-xs font-black uppercase tracking-widest hidden sm:inline",
                                            step >= s.id ? "text-white" : "text-white/40"
                                        )}>
                                            {s.name}
                                        </span>
                                    </div>
                                    <div className={cn(
                                        "h-1 rounded-full transition-all duration-700",
                                        step >= s.id ? "bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]" : "bg-white/10"
                                    )} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto px-8 py-10 custom-scrollbar relative bg-slate-50">
                    <AnimatePresence mode="wait" custom={step}>
                        {step === 1 && (
                            <motion.div 
                                key="step1"
                                custom={1}
                                variants={slideVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                className="space-y-10"
                            >
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-black text-slate-900">Basic Information</h3>
                                    <p className="text-slate-500 font-medium">Please provide your vitals and upload your latest resume.</p>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-2.5">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                            <Calendar className="w-3.5 h-3.5 text-primary-500" /> Date of Birth
                                        </label>
                                        <input 
                                            type="date" 
                                            className={cn(
                                                "w-full bg-white border rounded-xl px-4 py-3.5 text-slate-900 focus:ring-4 outline-none transition-all font-medium",
                                                errors.dob ? "border-rose-500 focus:ring-rose-500/10 focus:border-rose-500" : "border-slate-200 focus:ring-primary-500/10 focus:border-primary-500"
                                            )}
                                            value={formData.dob}
                                            onChange={e => {
                                                setFormData({...formData, dob: e.target.value});
                                                if (errors.dob) setErrors(prev => {
                                                    const { dob: _, ...rest } = prev;
                                                    return rest;
                                                });
                                            }}
                                        />
                                        {errors.dob && <p className="text-[10px] font-bold text-rose-500 mt-1.5 ml-1 animate-in fade-in slide-in-from-top-1">{errors.dob}</p>}
                                    </div>

                                    <div className="space-y-4">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                            <UploadCloud className="w-3.5 h-3.5 text-primary-500" /> Resume Upload
                                        </label>
                                        
                                        <div 
                                            onClick={() => fileInputRef.current?.click()}
                                            className={cn(
                                                "relative cursor-pointer group transition-all duration-300",
                                                resume 
                                                    ? "bg-emerald-50 border-2 border-emerald-500/30 rounded-2xl p-8"
                                                    : cn(
                                                        "bg-white border-2 border-dashed hover:bg-primary-50/30 rounded-2xl p-12",
                                                        errors.resume ? "border-rose-500 bg-rose-50/10 hover:border-rose-600" : "border-slate-200 hover:border-primary-400"
                                                    )
                                            )}
                                        >
                                            <input 
                                                type="file" 
                                                ref={fileInputRef} 
                                                className="hidden" 
                                                accept=".pdf,.doc,.docx"
                                                onChange={(e) => e.target.files?.[0] && handleResumeUpload(e.target.files[0])}
                                            />
                                            
                                            <div className="flex flex-col items-center justify-center text-center space-y-4">
                                                <div className={cn(
                                                    "w-16 h-16 rounded-3xl flex items-center justify-center transition-all duration-500",
                                                    resume ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200" : "bg-slate-100 text-slate-400 group-hover:bg-primary-100 group-hover:text-primary-600"
                                                )}>
                                                    {isExtracting ? (
                                                        <Loader2 className="w-8 h-8 animate-spin" />
                                                    ) : resume ? (
                                                        <CheckCircle className="w-8 h-8" />
                                                    ) : (
                                                        <UploadCloud className="w-8 h-8" />
                                                    )}
                                                </div>
                                                
                                                <div>
                                                    <p className={cn(
                                                        "text-lg font-black tracking-tight",
                                                        resume ? "text-emerald-900" : "text-slate-600"
                                                    )}>
                                                        {resume ? resume.name : "Select your PDF Resume"}
                                                    </p>
                                                    <p className="text-sm text-slate-400 font-medium mt-1">
                                                        {resume ? "Click to change file" : "Drop your file here or browse"}
                                                    </p>
                                                </div>

                                                {isExtracting && (
                                                    <div className="flex items-center gap-2 text-primary-600 text-xs font-black uppercase tracking-widest animate-pulse">
                                                        <Database className="w-4 h-4" /> Extracting Skills...
                                                    </div>
                                                )}

                                                {extractedSkills.length > 0 && !isExtracting && (
                                                    <div className="pt-2">
                                                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                                                            {extractedSkills.length} Skills Extracted
                                                        </Badge>
                                                    </div>
                                                )}

                                                {errors.resume && (
                                                    <p className="text-sm font-bold text-rose-500 pt-2 animate-in pulse duration-300">
                                                        {errors.resume}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div 
                                key="step2"
                                custom={1}
                                variants={slideVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                className="space-y-12"
                            >
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-black text-slate-900">Candidate Profile Details</h3>
                                    <p className="text-slate-500 font-medium">Build your professional identity for the review team.</p>
                                </div>

                                {/* Personal Details Section */}
                                <section className="space-y-6">
                                    <div className="flex items-center gap-2 text-slate-400 uppercase tracking-[0.2em] text-[10px] font-black">
                                        <div className="w-8 h-[1px] bg-slate-200" /> Personal Information
                                    </div>
                                    <div className="grid grid-cols-2 gap-5">
                                        <div className="col-span-2">
                                            <label className={cn("text-[10px] font-black uppercase tracking-widest mb-2 block transition-colors", errors.full_name ? "text-rose-500" : "text-slate-400")}>Full Name</label>
                                            <input 
                                                type="text" 
                                                className={cn(
                                                    "w-full bg-white border rounded-xl px-4 py-3 text-slate-900 focus:ring-4 transition-all font-semibold",
                                                    errors.full_name ? "border-rose-500 focus:ring-rose-500/10 focus:border-rose-500" : "border-slate-200 focus:ring-primary-500/10 focus:border-primary-500"
                                                )}
                                                value={formData.full_name}
                                                onChange={e => {
                                                    setFormData({...formData, full_name: e.target.value});
                                                    if (errors.full_name) setErrors(prev => {
                                                        const { full_name: _, ...rest } = prev;
                                                        return rest;
                                                    });
                                                }}
                                            />
                                            {errors.full_name && <p className="text-[10px] font-bold text-rose-500 mt-1.5 ml-1 animate-in fade-in slide-in-from-top-1">{errors.full_name}</p>}
                                        </div>
                                        <div>
                                            <label className={cn("text-[10px] font-black uppercase tracking-widest mb-2 block transition-colors", errors.email ? "text-rose-500" : "text-slate-400")}>Email Address</label>
                                            <input 
                                                type="email" 
                                                className={cn(
                                                    "w-full bg-slate-100 border rounded-xl px-4 py-3 text-slate-500 font-semibold cursor-not-allowed",
                                                    errors.email ? "border-rose-500" : "border-slate-200"
                                                )}
                                                value={formData.email}
                                                readOnly
                                            />
                                            {errors.email && <p className="text-[10px] font-bold text-rose-500 mt-1.5 ml-1 animate-in fade-in slide-in-from-top-1">{errors.email}</p>}
                                        </div>
                                        <div>
                                            <label className={cn("text-[10px] font-black uppercase tracking-widest mb-2 block transition-colors", errors.phone ? "text-rose-500" : "text-slate-400")}>Phone Number</label>
                                            <input 
                                                type="text" 
                                                className={cn(
                                                    "w-full bg-white border rounded-xl px-4 py-3 text-slate-900 focus:ring-4 transition-all font-semibold",
                                                    errors.phone ? "border-rose-500 focus:ring-rose-500/10 focus:border-rose-500" : "border-slate-200 focus:ring-primary-500/10 focus:border-primary-500"
                                                )}
                                                value={formData.phone}
                                                onChange={e => {
                                                    setFormData({...formData, phone: e.target.value});
                                                    if (errors.phone) setErrors(prev => {
                                                        const { phone: _, ...rest } = prev;
                                                        return rest;
                                                    });
                                                }}
                                            />
                                            {errors.phone && <p className="text-[10px] font-bold text-rose-500 mt-1.5 ml-1 animate-in fade-in slide-in-from-top-1">{errors.phone}</p>}
                                        </div>
                                        <div className="col-span-2 grid grid-cols-3 gap-4">
                                            <div>
                                                <label className={cn("text-[10px] font-black uppercase tracking-widest mb-2 block transition-colors", errors.country ? "text-rose-500" : "text-slate-400")}>Country</label>
                                                <input 
                                                    type="text" 
                                                    className={cn(
                                                        "w-full bg-white border rounded-xl px-4 py-3 text-sm font-semibold focus:ring-4 outline-none transition-all",
                                                        errors.country ? "border-rose-500 focus:ring-rose-500/10 focus:border-rose-500" : "border-slate-200 focus:ring-primary-500/10 focus:border-primary-500"
                                                    )} 
                                                    value={formData.country} 
                                                    onChange={e => {
                                                        setFormData({...formData, country: e.target.value});
                                                        if (errors.country) setErrors(prev => {
                                                            const { country: _, ...rest } = prev;
                                                            return rest;
                                                        });
                                                    }} 
                                                    placeholder="e.g. USA" 
                                                />
                                                {errors.country && <p className="text-[10px] font-bold text-rose-500 mt-1.5 ml-1 animate-in fade-in slide-in-from-top-1">{errors.country}</p>}
                                            </div>
                                            <div>
                                                <label className={cn("text-[10px] font-black uppercase tracking-widest mb-2 block transition-colors", errors.state ? "text-rose-500" : "text-slate-400")}>State</label>
                                                <input 
                                                    type="text" 
                                                    className={cn(
                                                        "w-full bg-white border rounded-xl px-4 py-3 text-sm font-semibold focus:ring-4 outline-none transition-all",
                                                        errors.state ? "border-rose-500 focus:ring-rose-500/10 focus:border-rose-500" : "border-slate-200 focus:ring-primary-500/10 focus:border-primary-500"
                                                    )} 
                                                    value={formData.state} 
                                                    onChange={e => {
                                                        setFormData({...formData, state: e.target.value});
                                                        if (errors.state) setErrors(prev => {
                                                            const { state: _, ...rest } = prev;
                                                            return rest;
                                                        });
                                                    }} 
                                                    placeholder="e.g. CA" 
                                                />
                                                {errors.state && <p className="text-[10px] font-bold text-rose-500 mt-1.5 ml-1 animate-in fade-in slide-in-from-top-1">{errors.state}</p>}
                                            </div>
                                            <div>
                                                <label className={cn("text-[10px] font-black uppercase tracking-widest mb-2 block transition-colors", errors.city ? "text-rose-500" : "text-slate-400")}>City</label>
                                                <input 
                                                    type="text" 
                                                    className={cn(
                                                        "w-full bg-white border rounded-xl px-4 py-3 text-sm font-semibold focus:ring-4 outline-none transition-all",
                                                        errors.city ? "border-rose-500 focus:ring-rose-500/10 focus:border-rose-500" : "border-slate-200 focus:ring-primary-500/10 focus:border-primary-500"
                                                    )} 
                                                    value={formData.city} 
                                                    onChange={e => {
                                                        setFormData({...formData, city: e.target.value});
                                                        if (errors.city) setErrors(prev => {
                                                            const { city: _, ...rest } = prev;
                                                            return rest;
                                                        });
                                                    }} 
                                                    placeholder="e.g. SF" 
                                                />
                                                {errors.city && <p className="text-[10px] font-bold text-rose-500 mt-1.5 ml-1 animate-in fade-in slide-in-from-top-1">{errors.city}</p>}
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                {/* Education Section */}
                                <section className="space-y-6 pt-4">
                                    <div className="flex items-center gap-2 text-slate-400 uppercase tracking-[0.2em] text-[10px] font-black">
                                        <div className="w-8 h-[1px] bg-slate-200" /> Education Details
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div className="col-span-2 md:col-span-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Highest Degree</label>
                                            <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold" value={formData.degree} onChange={e => setFormData({...formData, degree: e.target.value})} placeholder="e.g. B.Tech" />
                                        </div>
                                        <div className="col-span-2 md:col-span-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Institution</label>
                                            <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold" value={formData.institution} onChange={e => setFormData({...formData, institution: e.target.value})} placeholder="e.g. MIT" />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Field of Study</label>
                                            <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold" value={formData.field_of_study} onChange={e => setFormData({...formData, field_of_study: e.target.value})} placeholder="e.g. Computer Science" />
                                        </div>
                                    </div>
                                </section>

                                {/* Work Experience Section */}
                                <section className="space-y-6 pt-4">
                                    <div className="flex items-center gap-2 text-slate-400 uppercase tracking-[0.2em] text-[10px] font-black">
                                        <div className="w-8 h-[1px] bg-slate-200" /> Work Experience
                                    </div>
                                    <div className="grid grid-cols-2 gap-5">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Total Experience (Years)</label>
                                            <input type="number" step="0.5" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-semibold" value={formData.experience_years} onChange={e => setFormData({...formData, experience_years: parseFloat(e.target.value) || 0})} disabled={formData.is_first_job} />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Current Role</label>
                                            <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-semibold placeholder:font-normal" value={formData.current_role} onChange={e => setFormData({...formData, current_role: e.target.value})} placeholder={formData.is_first_job ? "Student / Seeking First Job" : "e.g. Senior Developer"} disabled={formData.is_first_job} />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="flex items-center gap-3 cursor-pointer group p-4 bg-white border border-slate-200 rounded-2xl hover:border-primary-400 transition-all">
                                                <input 
                                                    type="checkbox" 
                                                    className="w-5 h-5 rounded-lg border-2 border-slate-300 text-primary-600 focus:ring-primary-600 transition-all"
                                                    checked={formData.is_first_job}
                                                    onChange={e => setFormData({...formData, is_first_job: e.target.checked, experience_years: e.target.checked ? 0 : formData.experience_years, current_role: e.target.checked ? '' : formData.current_role})}
                                                />
                                                <span className="text-sm font-black text-slate-700 uppercase tracking-tight">This is my first job</span>
                                            </label>
                                        </div>
                                    </div>
                                </section>

                                {/* Skills Section */}
                                <section className="space-y-6 pt-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-slate-400 uppercase tracking-[0.2em] text-[10px] font-black">
                                            <div className="w-8 h-[1px] bg-slate-200" /> Skills
                                        </div>
                                        <Badge variant="info" className="text-[10px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 border-none">
                                            {formData.skills.length} Expertise Tags
                                        </Badge>
                                    </div>
                                    
                                    <div className="bg-white border border-slate-200 rounded-2xl p-6 min-h-[140px] flex flex-wrap gap-2.5">
                                        {formData.skills.map((skill, i) => (
                                            <motion.div 
                                                initial={{ scale: 0.8, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                key={i} 
                                                className="group flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl hover:border-primary-300 hover:bg-white transition-all shadow-sm"
                                            >
                                                <span className="text-xs font-black text-slate-700 uppercase tracking-tight">{skill}</span>
                                                <button onClick={() => removeSkill(skill)} className="text-slate-300 hover:text-rose-500 transition-colors">
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </motion.div>
                                        ))}
                                        {formData.skills.length === 0 && (
                                            <div className="w-full flex flex-col items-center justify-center text-slate-400 italic text-sm space-y-2 py-4">
                                                <Database className="w-8 h-8 opacity-20" />
                                                <p>No skills added yet</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-semibold outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all pr-36"
                                            placeholder="Add skill (e.g. TypeScript, AWS)"
                                            value={skillInput}
                                            onChange={e => setSkillInput(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && addSkill()}
                                        />
                                        <button 
                                            onClick={addSkill}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary-600 transition-all active:scale-95"
                                        >
                                            Add Skill
                                        </button>
                                    </div>
                                </section>

                                {/* Preferences Section */}
                                <section className="space-y-6 pt-4">
                                    <div className="flex items-center gap-2 text-slate-400 uppercase tracking-[0.2em] text-[10px] font-black">
                                        <div className="w-8 h-[1px] bg-slate-200" /> Preferences
                                    </div>
                                    <div className="grid grid-cols-2 gap-5">
                                        <div className="col-span-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Work Mode Preference</label>
                                            <div className="grid grid-cols-3 gap-3">
                                                {['Remote', 'Hybrid', 'On-site'].map(mode => (
                                                    <button 
                                                        key={mode}
                                                        onClick={() => setFormData({...formData, work_mode: mode})}
                                                        className={cn(
                                                            "px-4 py-4 rounded-2xl border-2 text-xs font-black uppercase tracking-widest transition-all",
                                                            formData.work_mode === mode 
                                                                ? "bg-primary-50 border-primary-500 text-primary-700 shadow-md shadow-primary-200/50" 
                                                                : "bg-white border-slate-100 text-slate-400 hover:border-slate-300"
                                                        )}
                                                    >
                                                        {mode === 'Remote' && <Laptop className="w-4 h-4 mx-auto mb-2" />}
                                                        {mode === 'Hybrid' && <Home className="w-4 h-4 mx-auto mb-2" />}
                                                        {mode === 'On-site' && <Building className="w-4 h-4 mx-auto mb-2" />}
                                                        {mode}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="col-span-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Preferred City/Location (if any)</label>
                                            <div className="relative">
                                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                                <input 
                                                    type="text" 
                                                    className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-6 py-4 text-sm font-semibold outline-none focus:ring-4 focus:ring-primary-50/50 transition-all font-semibold"
                                                    value={formData.preferred_location}
                                                    onChange={e => setFormData({...formData, preferred_location: e.target.value})}
                                                    placeholder="e.g. New York, Bangalore, or 'Anywhere'" 
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div 
                                key="step3"
                                custom={1}
                                variants={slideVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                className="space-y-10"
                            >
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-black text-slate-900">Job Details & Confirm</h3>
                                    <p className="text-slate-500 font-medium">Review the position requirements one last time before submitting.</p>
                                </div>

                                <Card className="p-8 border-slate-200 bg-white/50 backdrop-blur-sm space-y-8 rounded-3xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                        <Award className="w-32 h-32 rotate-12" />
                                    </div>

                                    <div className="space-y-8 relative z-10">
                                        <section className="space-y-4">
                                            <div className="flex items-center gap-2 text-primary-600 uppercase tracking-[0.2em] text-[10px] font-black">
                                                <Info className="w-3.5 h-3.5" /> Job Description
                                            </div>
                                            <p className="text-slate-600 text-sm leading-relaxed font-medium">
                                                {job.job_description || "Detailed role overview provided in the JD."}
                                            </p>
                                        </section>

                                        <div className="grid grid-cols-2 gap-8">
                                            <section className="space-y-4">
                                                <div className="flex items-center gap-2 text-amber-600 uppercase tracking-[0.2em] text-[10px] font-black">
                                                    <Award className="w-3.5 h-3.5" /> Key Responsibilities
                                                </div>
                                                <ul className="space-y-2.5">
                                                    {(job.roles_responsibilities || "").split(',').map((item: string, i: number) => (
                                                        <li key={i} className="text-xs text-slate-500 font-semibold flex items-start gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                                                            {item.trim()}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </section>

                                            <section className="space-y-4">
                                                <div className="flex items-center gap-2 text-indigo-600 uppercase tracking-[0.2em] text-[10px] font-black">
                                                    <Terminal className="w-3.5 h-3.5" /> Required Skills
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {(job.required_skills || "").split(',').map((skill: string, i: number) => (
                                                        <Badge key={i} className="bg-indigo-50 text-indigo-700 border-none font-black text-[9px] uppercase px-3 py-1">
                                                            {skill.trim()}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </section>
                                        </div>

                                        <section className="pt-6 border-t border-slate-100 flex items-center justify-between">
                                            <div>
                                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5">Required Experience</h5>
                                                <div className="flex items-center gap-2 text-slate-800 font-black">
                                                    <Briefcase className="w-4 h-4 text-primary-500" />
                                                    {job.experience_required || "Not specified"}
                                                </div>
                                            </div>
                                            <div>
                                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5">Employee Benefits</h5>
                                                <div className="flex items-center gap-2 text-emerald-600 font-black">
                                                    <Globe2 className="w-4 h-4" />
                                                    Standard Package
                                                </div>
                                            </div>
                                        </section>
                                    </div>
                                </Card>

                                <div className="bg-primary-50 border border-primary-100 p-6 rounded-2xl flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-primary-500 shadow-sm shrink-0">
                                        <CheckCircle className="w-6 h-6" />
                                    </div>
                                    <p className="text-sm font-bold text-primary-900 leading-tight">
                                        Almost there! All your details including the {resume?.name} resume will be submitted to the recruitment team.
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Fixed Footer */}
                <div className="px-8 py-6 bg-white border-t border-slate-100 flex items-center justify-between shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)]">
                    <Button 
                        variant="ghost" 
                        onClick={step === 1 ? onClose : handleBack}
                        className="btn-outline-modern px-8 py-6 rounded-2xl font-black uppercase tracking-widest text-xs"
                    >
                        {step === 1 ? 'Cancel' : 'Go Back'}
                    </Button>

                    <div className="flex items-center gap-4">
                        {step < 3 ? (
                            <Button 
                                onClick={handleNext}
                                disabled={isExtracting}
                                className="btn-primary-modern px-10 py-6 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-2 shadow-xl shadow-primary-500/20"
                            >
                                Next Step <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                        ) : (
                            <Button 
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-xs px-12 py-6 rounded-2xl shadow-xl shadow-emerald-500/20 flex items-center gap-3 active:scale-95 transition-all"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        Submit Application
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

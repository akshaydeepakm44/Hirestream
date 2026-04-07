import { useState, useEffect, useRef } from 'react';
import { api } from '../../api/client';
import { 
    X, Check, ChevronRight, ChevronLeft, 
    User, ClipboardList, Send, UploadCloud,
    MapPin, Building, Globe, DollarSign, CheckCircle
} from 'lucide-react';
import { cn } from '../../utils/cn';

interface JobApplicationDrawerProps {
    job: any;
    onClose: () => void;
    onSuccess: () => void;
}

export const JobApplicationDrawer = ({ job, onClose, onSuccess }: JobApplicationDrawerProps) => {
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [resume, setResume] = useState<File | null>(null);

    // Step 2: Career Profile (Reusable)
    const [profileData, setProfileData] = useState({
        full_name: '', // We might need to fetch this from User
        phone: '',
        location: '',
        experience_years: 0,
        skills: '',
        linkedin_url: '',
        portfolio_url: '',
        summary: '',
        notice_period: 'Immediate',
        preferred_work_mode: 'Remote',
        preferred_location: '',
        dob: ''
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    // Step 3: Role-Specific
    const [roleData, setRoleData] = useState({
        current_ctc: '',
        expected_ctc: '',
        willing_to_relocate: false,
        available_start_date: '',
        work_mode_preference: 'Remote',
        current_role_title: '',
        domain_experience: '',
        relevant_experience: '',
        interest_reason: '',
        employment_type: 'Fulltime'
    });

    const [isExtractingSkills, setIsExtractingSkills] = useState(false);
    const [extractedSkillsCount, setExtractedSkillsCount] = useState(0);
    const [skillInput, setSkillInput] = useState('');
    const [skillList, setSkillList] = useState<string[]>([]);

    useEffect(() => {
        if (step === 2) {
            fetchProfile();
        }
    }, [step]);

    const fetchProfile = async () => {
        try {
            const { data } = await api.get('/candidates/profile'); 
            setProfileData({
                full_name: data.full_name || '',
                phone: data.phone || '',
                location: data.location || '',
                experience_years: data.experience_years || 0,
                skills: data.skills || '',
                linkedin_url: data.linkedin_url || '',
                portfolio_url: data.portfolio_url || '',
                summary: data.summary || '',
                notice_period: data.notice_period || 'Immediate',
                preferred_work_mode: data.preferred_work_mode || 'Remote',
                preferred_location: data.preferred_location || '',
                dob: data.dob || ''
            });
        } catch (error) {
            console.error('Failed to fetch profile', error);
            try {
                const { data: u } = await api.get('/auth/me');
                setProfileData(prev => ({ ...prev, full_name: u.full_name }));
            } catch (e) {}
        }
    };

    const handleNext = () => {
        if (step === 3) {
            if (!profileData.dob) {
                setErrors({ dob: "Date of Birth is required" });
                return;
            }
            
            const birthDate = new Date(profileData.dob);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            
            if (age < 18) {
                setErrors({ dob: "Candidates must be at least 18 years old to apply." });
                return;
            }
        }
        setErrors({});
        if (step < 4) setStep(prev => prev + 1);
    };

    const handleBack = () => {
        if (step > 1) setStep(prev => prev - 1);
    };

    const handleSubmit = async () => {
        if (!resume) {
            alert('Please upload your resume to complete the application.');
            return;
        }

        setIsSubmitting(true);
        try {
            // 1. Prepare profile data with final skill list
            const finalProfile = {
                ...profileData,
                skills: skillList.join(', '),
                dob: profileData.dob
            };
            await api.patch('/candidates/profile', finalProfile);

            // 2. Use the already uploaded resume key
            const objectKey = (window as any)._resumeObjectKey;
            
            if (!objectKey) {
                // Fallback upload (shouldn't happen with new flow but just in case)
                const uploadFormData = new FormData();
                uploadFormData.append('file', resume);
                const { data: uploadResult } = await api.post('/files/upload', uploadFormData);
                (window as any)._resumeObjectKey = uploadResult.object_key;
            }

            const finalObjectKey = (window as any)._resumeObjectKey;

            // 3. Submit Application
            const appFormData = new FormData();
            appFormData.append('requisition_id', job.id.toString());
            appFormData.append('resume_path', finalObjectKey);
            appFormData.append('dob', profileData.dob);
            
            // Append role specific fields
            appFormData.append('current_ctc', roleData.current_ctc);
            appFormData.append('expected_ctc', roleData.expected_ctc);
            appFormData.append('willing_to_relocate', roleData.willing_to_relocate.toString());
            appFormData.append('available_start_date', roleData.available_start_date);
            appFormData.append('work_mode_preference', roleData.work_mode_preference);
            appFormData.append('relevant_experience', roleData.relevant_experience);
            appFormData.append('current_role_title', roleData.current_role_title);
            appFormData.append('domain_experience', roleData.domain_experience);
            appFormData.append('employment_type', roleData.employment_type);
            appFormData.append('screening_answers', JSON.stringify({
                interest_reason: roleData.interest_reason,
                experience_in_skill: `Yes, proficient in ${skillList.slice(0, 3).join(', ')}`
            }));

            await api.post('/candidates/applications', appFormData);
            
            // Cleanup
            delete (window as any)._resumeObjectKey;
            onSuccess();
        } catch (error: any) {
            alert(error.response?.data?.detail || 'Submission failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const steps = [
        { id: 1, name: 'Upload Resume', icon: UploadCloud },
        { id: 2, name: 'Review Skills', icon: ClipboardList },
        { id: 3, name: 'Career Profile', icon: User },
        { id: 4, name: 'Final Details', icon: Send }
    ];

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
            
            {/* Drawer Content */}
            <div className="relative w-full max-w-2xl bg-white shadow-2xl h-full flex flex-col animate-slide-left">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 leading-tight">{job.title}</h2>
                        <p className="text-sm text-slate-500 mt-1 flex items-center gap-3">
                            <span className="flex items-center"><Building className="w-3.5 h-3.5 mr-1" /> {job.department}</span>
                            <span className="flex items-center"><MapPin className="w-3.5 h-3.5 mr-1" /> {job.location}</span>
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <X className="w-6 h-6 text-slate-400" />
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="px-8 py-4 bg-white border-b border-slate-50 flex justify-between items-center">
                    {steps.map((s, idx) => (
                        <div key={s.id} className="flex items-center flex-1 last:flex-none">
                            <div className={`flex flex-col items-center gap-1.5`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                    step >= s.id ? 'bg-primary-600 text-white ring-4 ring-primary-50' : 'bg-slate-100 text-slate-400'
                                }`}>
                                    {step > s.id ? <Check className="w-4 h-4" /> : s.id}
                                </div>
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${step >= s.id ? 'text-primary-600' : 'text-slate-400'}`}>
                                    {s.name}
                                </span>
                            </div>
                            {idx < steps.length - 1 && (
                                <div className={`h-0.5 flex-1 mx-4 rounded-full transition-colors ${step > s.id ? 'bg-primary-600' : 'bg-slate-100'}`} />
                            )}
                        </div>
                    ))}
                </div>

                {/* Body (Scrollable) */}
                <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                    
                    {step === 1 && (
                        <div className="space-y-8 animate-fade-in flex flex-col items-center justify-center pt-8">
                            <div className="text-center space-y-4">
                                <div className="w-20 h-20 bg-primary-50 text-primary-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                    <UploadCloud className="w-10 h-10" />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900">Upload Your Resume</h3>
                                <p className="text-slate-500 max-w-sm mx-auto">Upload your PDF resume to get started. We'll automatically extract your skills to save you time.</p>
                            </div>

                            <div className={`w-full max-w-md border-2 border-dashed rounded-3xl p-10 text-center transition-all ${
                                resume ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200 bg-slate-50 hover:border-primary-300 hover:bg-primary-50/20'
                            }`}>
                                <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    setResume(file);
                                    
                                    // Auto-trigger extraction
                                    setIsExtractingSkills(true);
                                    try {
                                        const formData = new FormData();
                                        formData.append('file', file);
                                        const { data } = await api.post('/files/upload', formData);
                                        if (data.extracted_skills) {
                                            setSkillList(data.extracted_skills);
                                            setExtractedSkillsCount(data.extracted_skills.length);
                                            setProfileData(prev => ({ ...prev, skills: data.extracted_skills.join(', ') }));
                                        }
                                        // Store object key for final submission
                                        (window as any)._resumeObjectKey = data.object_key;
                                    } catch (err) {
                                        console.error("Extraction failed", err);
                                    } finally {
                                        setIsExtractingSkills(false);
                                    }
                                }} />
                                {resume ? (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-center gap-3 text-emerald-700 font-bold">
                                            <CheckCircle className="w-5 h-5" /> {resume.name}
                                        </div>
                                        {isExtractingSkills ? (
                                            <div className="flex items-center justify-center gap-2 text-primary-600 text-sm font-medium">
                                                <div className="w-4 h-4 border-2 border-primary-600/30 border-t-primary-600 animate-spin rounded-full" />
                                                Extracting Skills from Resume...
                                            </div>
                                        ) : extractedSkillsCount > 0 ? (
                                            <div className="text-emerald-600 text-xs font-bold uppercase tracking-wider">
                                                Successfully Extracted {extractedSkillsCount} Skills
                                            </div>
                                        ) : null}
                                        <button onClick={() => fileInputRef.current?.click()} className="text-xs font-bold text-primary-600 underline">Change file</button>
                                    </div>
                                ) : (
                                    <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-3 mx-auto">
                                        <UploadCloud className="w-8 h-8 text-slate-400" />
                                        <span className="text-sm font-bold text-slate-600">Select PDF Resume</span>
                                    </button>
                                )}
                            </div>

                            {resume && !isExtractingSkills && (
                                <button onClick={handleNext} className="btn-primary w-full max-w-md py-4 flex items-center justify-center gap-2 text-lg">
                                    Continue to Skills Review <ChevronRight className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-8 animate-fade-in">
                            <div className="space-y-2">
                                <h3 className="text-2xl font-bold text-slate-900">Skills Extracted From Resume</h3>
                                <p className="text-sm text-slate-500">We've identified these skills from your resume. Review and add any missing expertise.</p>
                            </div>

                            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 min-h-[120px]">
                                <div className="flex flex-wrap gap-2">
                                    {skillList.length > 0 ? skillList.map((skill, idx) => (
                                        <div key={idx} className="group flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-primary-300 transition-all">
                                            <span className="text-sm font-bold text-slate-700 capitalize">{skill}</span>
                                            <button 
                                                onClick={() => setSkillList(prev => prev.filter((_, i) => i !== idx))}
                                                className="text-slate-300 hover:text-red-500 transition-colors"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    )) : (
                                        <div className="w-full text-center py-4 text-slate-400 text-sm italic">
                                            No skills extracted. Try adding some below.
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Add Additional Skills (Optional)</label>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        value={skillInput}
                                        onChange={e => setSkillInput(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter' && skillInput.trim()) {
                                                setSkillList(prev => [...prev, skillInput.trim().toLowerCase()]);
                                                setSkillInput('');
                                            }
                                        }}
                                        className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm focus:border-primary-500 focus:ring-4 focus:ring-primary-50 outline-none transition-all pr-32" 
                                        placeholder="Type skill and press Enter (e.g. AWS, Figma)"
                                    />
                                    <button 
                                        onClick={() => {
                                            if (skillInput.trim()) {
                                                setSkillList(prev => [...prev, skillInput.trim().toLowerCase()]);
                                                setSkillInput('');
                                            }
                                        }}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all"
                                    >
                                        Add Skill
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6 animate-fade-in">
                            <h3 className="text-xl font-bold text-slate-900">Career Profile</h3>
                            <p className="text-sm text-slate-500">Provide your professional background to complete your candidate record.</p>
                            
                            <div className="grid grid-cols-2 gap-6">
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Full Name</label>
                                    <input type="text" value={profileData.full_name} onChange={e => setProfileData({...profileData, full_name: e.target.value})} className="input-field py-3 bg-slate-50/50" placeholder="John Doe" />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Phone Number</label>
                                    <input type="text" value={profileData.phone} onChange={e => setProfileData({...profileData, phone: e.target.value})} className="input-field" placeholder="+91 ..." />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Current Location</label>
                                    <input type="text" value={profileData.location} onChange={e => setProfileData({...profileData, location: e.target.value})} className="input-field" placeholder="e.g. Hyderabad" />
                                </div>
                                <div className="col-span-1">
                                    <label className={`block text-xs font-bold uppercase mb-1.5 ${errors.dob ? 'text-rose-500' : 'text-slate-500'}`}>Date of Birth</label>
                                    <input 
                                        type="date" 
                                        value={profileData.dob} 
                                        onChange={e => {
                                            setProfileData({...profileData, dob: e.target.value});
                                            if (errors.dob) setErrors({});
                                        }} 
                                        className={cn(
                                            "input-field",
                                            errors.dob ? "border-rose-500 focus:border-rose-500 ring-rose-500/10" : ""
                                        )} 
                                    />
                                    {errors.dob && <p className="text-[10px] text-rose-500 mt-1 font-bold">{errors.dob}</p>}
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Total Experience (Years)</label>
                                    <input type="number" min="0" step="0.5" value={profileData.experience_years} onChange={e => setProfileData({...profileData, experience_years: parseFloat(e.target.value)})} className="input-field" />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Notice Period</label>
                                    <select value={profileData.notice_period} onChange={e => setProfileData({...profileData, notice_period: e.target.value})} className="input-field">
                                        <option>Immediate</option>
                                        <option>15 Days</option>
                                        <option>30 Days</option>
                                        <option>60 Days</option>
                                        <option>90 Days</option>
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Profile Summary (AI Bio/Self Intro)</label>
                                    <textarea rows={3} value={profileData.summary} onChange={e => setProfileData({...profileData, summary: e.target.value})} className="input-field" placeholder="Briefly describe your professional background..." />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">LinkedIn Profile</label>
                                    <input type="url" value={profileData.linkedin_url} onChange={e => setProfileData({...profileData, linkedin_url: e.target.value})} className="input-field" placeholder="https://linkedin.com/in/..." />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Portfolio/Github</label>
                                    <input type="url" value={profileData.portfolio_url} onChange={e => setProfileData({...profileData, portfolio_url: e.target.value})} className="input-field" placeholder="https://..." />
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="space-y-6 animate-fade-in">
                            <h3 className="text-xl font-bold text-slate-900">Final Details</h3>
                            <p className="text-sm text-slate-500">Provide details specific to the {job.title} position.</p>

                            <div className="space-y-8">
                                <section className="space-y-4">
                                    <h4 className="flex items-center gap-2 text-sm font-bold text-slate-800"><DollarSign className="w-4 h-4 text-emerald-600" /> Compensation</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Current CTC (per annum)</label>
                                            <input type="number" value={roleData.current_ctc} onChange={e => setRoleData({...roleData, current_ctc: e.target.value})} className="input-field" placeholder="e.g. 1200000" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Expected CTC (per annum)</label>
                                            <input type="number" value={roleData.expected_ctc} onChange={e => setRoleData({...roleData, expected_ctc: e.target.value})} className="input-field" placeholder="e.g. 1500000" />
                                        </div>
                                    </div>
                                </section>

                                <section className="space-y-4">
                                    <h4 className="flex items-center gap-2 text-sm font-bold text-slate-800"><Globe className="w-4 h-4 text-blue-600" /> Availability & Logistics</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2 sm:col-span-1">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Earliest Start Date</label>
                                            <input type="date" value={roleData.available_start_date} onChange={e => setRoleData({...roleData, available_start_date: e.target.value})} className="input-field" />
                                        </div>
                                        <div className="col-span-2 sm:col-span-1">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Work Mode Preference</label>
                                            <select value={roleData.work_mode_preference} onChange={e => setRoleData({...roleData, work_mode_preference: e.target.value})} className="input-field">
                                                <option>Remote</option>
                                                <option>Onsite</option>
                                                <option>Hybrid</option>
                                            </select>
                                        </div>
                                        <div className="col-span-2 sm:col-span-1">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Employment Type</label>
                                            <select value={roleData.employment_type} onChange={e => setRoleData({...roleData, employment_type: e.target.value})} className="input-field">
                                                <option value="Fulltime">Full-time</option>
                                                <option value="Internship">Internship</option>
                                                <option value="Contract">Contract</option>
                                                <option value="Freelance">Freelance</option>
                                            </select>
                                        </div>
                                        <div className="col-span-2">
                                            <label className="flex items-center gap-3 cursor-pointer p-4 border border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100 transition-all group">
                                                <input type="checkbox" checked={roleData.willing_to_relocate} onChange={e => setRoleData({...roleData, willing_to_relocate: e.target.checked})} className="w-5 h-5 rounded-md border-slate-300 text-primary-600 focus:ring-primary-600" />
                                                <span className="text-sm font-medium text-slate-700">I am willing to relocate for this position</span>
                                            </label>
                                        </div>
                                    </div>
                                </section>

                                <section className="space-y-4">
                                    <h4 className="flex items-center gap-2 text-sm font-bold text-slate-800"><CheckCircle className="w-4 h-4 text-indigo-600" /> Experience & Screening</h4>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Current Job Title</label>
                                            <input type="text" value={roleData.current_role_title} onChange={e => setRoleData({...roleData, current_role_title: e.target.value})} className="input-field" placeholder="e.g. Senior Frontend Engineer" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Domain/Industry Experience</label>
                                            <input type="text" value={roleData.domain_experience} onChange={e => setRoleData({...roleData, domain_experience: e.target.value})} className="input-field" placeholder="e.g. FinTech, Healthcare" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Relevant Experience (Years)</label>
                                            <p className="text-[10px] text-slate-400 mb-1.5">* Excluding internships</p>
                                            <input type="number" step="0.5" value={roleData.relevant_experience} onChange={e => setRoleData({...roleData, relevant_experience: e.target.value})} className="input-field" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Why are you interested in this role?</label>
                                            <textarea rows={3} value={roleData.interest_reason} onChange={e => setRoleData({...roleData, interest_reason: e.target.value})} className="input-field" placeholder="Tell us about yourself..." />
                                        </div>
                                    </div>
                                </section>
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer */}
                <div className="px-8 py-6 border-t border-slate-100 bg-white flex justify-between items-center">
                    {step > 1 ? (
                        <button onClick={handleBack} className="flex items-center gap-2 px-6 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-all">
                            <ChevronLeft className="w-4 h-4" /> Back
                        </button>
                    ) : <div />}

                    {step < 4 ? (
                        <button 
                            onClick={handleNext} 
                            disabled={step === 1 && (!resume || isExtractingSkills)}
                            className="btn-primary px-10 py-2.5 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            Next <ChevronRight className="w-4 h-4" />
                        </button>
                    ) : (
                        <button onClick={handleSubmit} disabled={isSubmitting || !resume} className="btn-primary px-12 py-3 bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center gap-2 disabled:opacity-50">
                            {isSubmitting ? 'Submitting...' : <><Send className="w-4 h-4" /> Finish & Submit Application</>}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

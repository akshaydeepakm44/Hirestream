import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Briefcase, Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, ArrowLeft, Users, Building2, MapPin, Tag } from 'lucide-react';
import { api } from '../api/client';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/Button';
import { cn } from '../utils/cn';

export const RecruiterRegister: React.FC = () => {
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const roleType = queryParams.get('role') as 'hiring_manager' | 'resource_manager' || 'hiring_manager';

    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
        companyName: '',
        department: '',
        jobTitle: '',
        location: '',
        specialization: ''
    });
    
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const config = roleType === 'hiring_manager' 
        ? { title: 'Hiring Manager Registration', icon: <Briefcase className="w-8 h-8 text-blue-600" />, themeBg: 'bg-blue-50', btn: 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20', glow: 'bg-blue-500/10', accent: 'text-blue-600' }
        : { title: 'Resource Manager Registration', icon: <Users className="w-8 h-8 text-indigo-600" />, themeBg: 'bg-indigo-50', btn: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20', glow: 'bg-indigo-500/10', accent: 'text-indigo-600' };

    const passwordsMatch = formData.password && formData.confirmPassword && formData.password === formData.confirmPassword;
    const passwordStrong = formData.password.length >= 8;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!passwordsMatch) {
            setError('Passwords do not match.');
            return;
        }
        if (!passwordStrong) {
            setError('Password must be at least 8 characters.');
            return;
        }

        setIsLoading(true);
        try {
            await api.post('/auth/register', {
                full_name: formData.fullName,
                email: formData.email,
                password: formData.password,
                role: roleType,
                company_name: formData.companyName,
                department: formData.department,
                job_title: formData.jobTitle,
                location: formData.location,
                specialization: formData.specialization
            });

            setSuccess(true);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Registration failed. Please check your details.');
        } finally {
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full bg-white rounded-[40px] p-10 shadow-2xl text-center">
                    <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-10 h-10 text-emerald-500" />
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 mb-4">Request Submitted</h2>
                    <p className="text-slate-500 font-medium leading-relaxed mb-8">
                        Your registration has been sent to the Super Admin for approval. 
                        You will receive an email once your account is activated.
                    </p>
                    <Button onClick={() => navigate('/recruiter')} className="w-full h-14 rounded-2xl bg-slate-900 text-white font-black">
                        Return to Portal
                    </Button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden">
            {/* Top Left Back Button */}
            <div className="absolute top-8 left-8 z-50">
                <Button 
                    variant="ghost" 
                    onClick={() => navigate('/recruiter')}
                    className="flex items-center gap-2 font-black text-slate-500 hover:text-slate-900 transition-colors bg-white/50 backdrop-blur-sm rounded-xl px-4 py-2 hover:bg-white shadow-sm border border-slate-100"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="text-[10px] uppercase tracking-widest">Back to Access</span>
                </Button>
            </div>

            {/* Background Decorations */}
            <div className={`absolute top-[-20%] right-[-10%] w-[50%] h-[50%] ${config.glow} rounded-full blur-[140px]`} />
            
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-[720px] z-10 py-12"
            >
                <div className="text-center mb-10">
                    <motion.div 
                        initial={{ rotate: -10 }}
                        animate={{ rotate: 0 }}
                        className={`inline-flex items-center justify-center w-16 h-16 ${config.themeBg} rounded-2xl shadow-xl border border-white mb-6`}
                    >
                        {config.icon}
                    </motion.div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-3">{config.title}</h1>
                    <p className="text-slate-500 font-medium">Create your corporate profile for platform authorization</p>
                </div>

                <div className="bg-white/80 backdrop-blur-xl rounded-[40px] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-white p-6 md:p-12">
                    <form onSubmit={handleRegister} className="space-y-8">
                        {error && (
                            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold leading-relaxed">
                                {error}
                            </div>
                        )}

                        <div className="space-y-6">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Personal Identity</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="group">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Full Legal Name</label>
                                    <div className="relative">
                                        <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-600" />
                                        <input name="fullName" type="text" value={formData.fullName} onChange={handleChange} required placeholder="Jane Doe" className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-semibold outline-none focus:bg-white focus:ring-4 focus:ring-slate-500/10 transition-all" />
                                    </div>
                                </div>
                                <div className="group">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Corporate Email</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-600" />
                                        <input name="email" type="email" value={formData.email} onChange={handleChange} required placeholder="jane.doe@company.com" className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-semibold outline-none focus:bg-white focus:ring-4 focus:ring-slate-500/10 transition-all" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Organization Context</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="group">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Company Name</label>
                                    <div className="relative">
                                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-600" />
                                        <input name="companyName" type="text" value={formData.companyName} onChange={handleChange} required placeholder="Alphanome AI" className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-semibold outline-none focus:bg-white focus:ring-4 focus:ring-slate-500/10 transition-all" />
                                    </div>
                                </div>
                                <div className="group">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Department</label>
                                    <div className="relative">
                                        <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-600" />
                                        <input name="department" type="text" value={formData.department} onChange={handleChange} required placeholder="Engineering / HR" className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-semibold outline-none focus:bg-white focus:ring-4 focus:ring-slate-500/10 transition-all" />
                                    </div>
                                </div>
                                <div className="group">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">{roleType === 'hiring_manager' ? 'Job Title' : 'Specialization'}</label>
                                    <div className="relative">
                                        <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-600" />
                                        <input name={roleType === 'hiring_manager' ? 'jobTitle' : 'specialization'} type="text" value={roleType === 'hiring_manager' ? formData.jobTitle : formData.specialization} onChange={handleChange} required placeholder={roleType === 'hiring_manager' ? 'VP Engineering' : 'Technical Sourcing'} className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-semibold outline-none focus:bg-white focus:ring-4 focus:ring-slate-500/10 transition-all" />
                                    </div>
                                </div>
                                <div className="group">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Office Location</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-600" />
                                        <input name="location" type="text" value={formData.location} onChange={handleChange} required placeholder="San Francisco, CA" className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-semibold outline-none focus:bg-white focus:ring-4 focus:ring-slate-500/10 transition-all" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Security Credentials</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="group text-left">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Access Key</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-600" />
                                        <input name="password" type={showPassword ? 'text' : 'password'} value={formData.password} onChange={handleChange} required placeholder="••••••••" className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl pl-12 pr-12 py-4 text-sm font-semibold outline-none focus:bg-white focus:ring-4 focus:ring-slate-500/10 transition-all" />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                                    </div>
                                </div>
                                <div className="group text-left">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Confirm Access Key</label>
                                    <div className="relative">
                                        <ShieldCheck className={cn("absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors", passwordsMatch ? "text-emerald-500" : "text-slate-400")} />
                                        <input name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} required placeholder="••••••••" className={cn("w-full bg-slate-50/50 border border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-semibold outline-none transition-all", passwordsMatch && "focus:ring-emerald-500/10 focus:border-emerald-500")} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-6">
                            <Button type="submit" isLoading={isLoading} className={`w-full h-16 rounded-2xl text-white text-md font-black shadow-xl ${config.btn}`}>
                                Initiate Registration Request <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>

                            <div className="relative py-6">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-slate-100"></div>
                                </div>
                                <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest">
                                    <span className="bg-white px-4 text-slate-400">Identity based registration</span>
                                </div>
                            </div>

                            <Button 
                                type="button" 
                                variant="outline"
                                onClick={() => {
                                    localStorage.setItem('sso_intended_role', roleType);
                                    window.location.href = `/auth/google/login?role=${roleType}`;
                                }}
                                className="w-full h-16 rounded-2xl text-md font-black border-slate-200 hover:bg-slate-50 gap-3"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="currentColor" d="M5.84 14.09c-.22-.67-.35-1.39-.35-2.09s.13-1.42.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                Register with Google
                            </Button>
                        </div>
                    </form>

                    <div className="mt-10 pt-8 border-t border-slate-100 text-center">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                            Already authenticated?{' '}
                            <Link to={roleType === 'hiring_manager' ? '/hiring/login' : '/resource/login'} className={`${config.accent} hover:underline ml-1`}>
                                Secure Login
                            </Link>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

const CheckCircle = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
);

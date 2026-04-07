import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, CheckCircle2, AlertCircle, ArrowLeft, ShieldCheck } from 'lucide-react';
import { api } from '../api/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/ui/Button';

export const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [step, setStep] = useState(1); // 1: Email, 2: OTP & New Password
    const [otp, setOtp] = useState('');
    const [newPass, setNewPass] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSendOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            await api.post('/auth/forgot-password', { email });
            setStep(2);
        } catch (err: any) {
            setError(err.response?.data?.detail || "Could not send OTP. Check if email exists.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            await api.post('/auth/verify-otp', { email, otp, new_password: newPass });
            setSuccess("Identity verified. Access key has been rotated.");
            setTimeout(() => navigate('/'), 3000);
        } catch (err: any) {
            setError(err.response?.data?.detail || "Verification failed. Check your OTP.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden">
            <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary-500/10 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px]" />

            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-[480px] z-10"
            >
                <div className="bg-white/80 backdrop-blur-xl rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-white p-10">
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-50 rounded-2xl mb-6">
                            <ShieldCheck className="w-8 h-8 text-primary-600" />
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Security Manifest</h2>
                        <p className="text-slate-500 text-sm font-medium">Identity synchronization protocol</p>
                    </div>

                    {success ? (
                        <div className="text-center space-y-4">
                            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                            <p className="font-bold text-slate-900">{success}</p>
                            <p className="text-xs text-slate-500">Redirecting to login portal...</p>
                        </div>
                    ) : (
                        <AnimatePresence mode="wait">
                            {step === 1 ? (
                                <motion.form 
                                    key="step1"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    onSubmit={handleSendOTP} 
                                    className="space-y-6"
                                >
                                    <div className="group">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Account Email</label>
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input 
                                                type="email" 
                                                value={email} 
                                                onChange={e => setEmail(e.target.value)} 
                                                required 
                                                placeholder="name@company.com"
                                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-semibold outline-none focus:bg-white focus:border-primary-500 transition-all" 
                                            />
                                        </div>
                                    </div>

                                    {error && <p className="text-xs font-bold text-red-500 bg-red-50 p-3 rounded-xl border border-red-100 flex gap-2"><AlertCircle className="w-4 h-4" /> {error}</p>}

                                    <Button type="submit" isLoading={isLoading} className="w-full h-14 rounded-2xl text-sm font-black uppercase tracking-widest">
                                        Issue Verification Link
                                    </Button>
                                    
                                    <Link to="/" className="flex items-center justify-center gap-2 text-[10px] font-black text-slate-400 hover:text-primary-600 transition-colors uppercase tracking-widest mt-6">
                                        <ArrowLeft className="w-3 h-3" /> Back to portal
                                    </Link>
                                </motion.form>
                            ) : (
                                <motion.form 
                                    key="step2"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    onSubmit={handleVerify} 
                                    className="space-y-6"
                                >
                                    <div className="space-y-4">
                                        <div className="group">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Verification Token (OTP)</label>
                                            <div className="relative">
                                                <input 
                                                    type="text" 
                                                    value={otp} 
                                                    onChange={e => setOtp(e.target.value)} 
                                                    required 
                                                    placeholder="6-digit protocol key"
                                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-4 text-sm font-semibold outline-none focus:bg-white focus:border-primary-500 transition-all text-center tracking-[1em]" 
                                                />
                                            </div>
                                        </div>

                                        <div className="group">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">New Access Key</label>
                                            <div className="relative">
                                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <input 
                                                    type="password" 
                                                    value={newPass} 
                                                    onChange={e => setNewPass(e.target.value)} 
                                                    required 
                                                    placeholder="New credentials"
                                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-semibold outline-none focus:bg-white focus:border-primary-500 transition-all" 
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {error && <p className="text-xs font-bold text-red-500 bg-red-50 p-3 rounded-xl border border-red-100 flex gap-2"><AlertCircle className="w-4 h-4" /> {error}</p>}

                                    <Button type="submit" isLoading={isLoading} className="w-full h-14 rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-primary-500/20">
                                        Establish New Identity
                                    </Button>
                                    
                                    <button 
                                        type="button"
                                        onClick={() => setStep(1)}
                                        className="w-full text-[10px] font-black text-slate-400 hover:text-primary-600 transition-colors uppercase tracking-widest"
                                    >
                                        Use different email
                                    </button>
                                </motion.form>
                            )}
                        </AnimatePresence>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

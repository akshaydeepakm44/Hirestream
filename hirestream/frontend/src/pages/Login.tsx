import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Briefcase, ArrowRight, Lock, Mail, AlertCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { UserRole } from '../types';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/Button';

export const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const role: UserRole = 'candidate';
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const [searchParams] = useSearchParams();
 
    useEffect(() => {
        const errorType = searchParams.get('error');
        const emailParam = searchParams.get('email');
        if (emailParam) setEmail(emailParam);

        if (errorType === 'user_not_found' || errorType === 'not_registered_for_role') {
            setError('Account not found. Please register first to apply for jobs.');
        } else if (errorType === 'google_failed') {
            setError('Google authentication failed. Please try again.');
        }
    }, [searchParams]);

    // Import useSearchParams from react-router-dom at the top if needed

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            const { data } = await api.post('/auth/login', { email, password, role });
            login(data.access_token, data.user);
            
            // Check for redirect task
            const applyJobId = localStorage.getItem("applyJobId");
            if (applyJobId && data.user.role === 'candidate') {
                navigate(`/candidate/jobs?apply=${applyJobId}`);
            } else {
                navigate('/candidate');
            }
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Authentication failed. Please check your credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden">
            {/* Top Left Back Button */}
            <div className="absolute top-8 left-8 z-50">
                <Button 
                    variant="ghost" 
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 font-black text-slate-500 hover:text-slate-900 transition-colors bg-white/50 backdrop-blur-sm rounded-xl px-4 py-2 hover:bg-white shadow-sm border border-slate-100"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="text-[10px] uppercase tracking-widest">Back to Home</span>
                </Button>
            </div>

            {/* Background Decorations */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-500/10 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px]" />
            
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="w-full max-w-[480px] z-10"
            >
                <div className="text-center mb-10">
                    <motion.div 
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-xl shadow-primary-500/10 mb-6 border border-slate-100 cursor-pointer"
                        onClick={() => navigate('/')}
                    >
                        <Briefcase className="w-8 h-8 text-primary-600" />
                    </motion.div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-3">Candidate Login</h1>
                    <p className="text-slate-500 font-medium">Access your career portal and track your applications</p>
                </div>

                <div className="bg-white/80 backdrop-blur-xl rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-white p-10">
                    <form onSubmit={handleLogin} className="space-y-6">
                        {error && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="p-5 bg-red-50 border border-red-100 rounded-2xl flex flex-col gap-3 text-red-600 shadow-sm"
                            >
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 shrink-0" />
                                    <span className="text-xs font-bold leading-relaxed">{error}</span>
                                </div>
                                {error.includes('register') && (
                                    <Button 
                                        type="button"
                                        variant="outline"
                                        onClick={() => navigate('/register')}
                                        className="w-full bg-white border-red-200 text-red-600 hover:bg-red-50 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest mt-2"
                                    >
                                        Register Now
                                    </Button>
                                )}
                            </motion.div>
                        )}

                        <div className="space-y-4">
                            <div className="group">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block group-focus-within:text-primary-500 transition-colors">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
                                    <input 
                                        type="email" 
                                        value={email} 
                                        onChange={e => setEmail(e.target.value)} 
                                        required 
                                        placeholder="you@example.com"
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-semibold outline-none focus:bg-white focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all shadow-inner" 
                                    />
                                </div>
                            </div>

                            <div className="group">
                                <div className="flex justify-between items-end mb-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-focus-within:text-primary-500 transition-colors">Password</label>
                                    <Link to="/forgot-password" data-testid="forgot-password" className="text-[10px] font-black text-primary-600 uppercase tracking-widest hover:text-primary-700">Forgot?</Link>
                                </div>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
                                    <input 
                                        type="password" 
                                        value={password} 
                                        onChange={e => setPassword(e.target.value)} 
                                        required 
                                        placeholder="••••••••"
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-semibold outline-none focus:bg-white focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all shadow-inner" 
                                    />
                                </div>
                            </div>
                        </div>

                        <Button 
                            type="submit" 
                            isLoading={isLoading} 
                            className="w-full h-14 rounded-2xl text-md font-black shadow-xl shadow-primary-500/20"
                        >
                            Sign In <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>

                        <div className="relative py-4">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-100"></div>
                            </div>
                            <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest">
                                <span className="bg-white px-4 text-slate-400">Or use identity provider</span>
                            </div>
                        </div>

                        <Button 
                            type="button" 
                            variant="outline"
                            onClick={() => {
                                localStorage.setItem('login_role', 'candidate');
                                window.location.href = '/auth/google/login?role=candidate';
                            }}
                            className="w-full h-14 rounded-2xl text-md font-black border-slate-200 hover:bg-slate-50 gap-3"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="currentColor" d="M5.84 14.09c-.22-.67-.35-1.39-.35-2.09s.13-1.42.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Continue with Google
                        </Button>
                    </form>

                    <div className="mt-10 pt-8 border-t border-slate-50 text-center space-y-6">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-loose">
                            Don't have an account?{' '}
                            <Link to="/register" className="text-primary-600 hover:text-primary-700 ml-1 decoration-skip-ink-none underline underline-offset-4 decoration-primary-500/30">
                                Create Profile
                            </Link>
                        </p>
                    </div>
                </div>
                
            </motion.div>
        </div>
    );
};

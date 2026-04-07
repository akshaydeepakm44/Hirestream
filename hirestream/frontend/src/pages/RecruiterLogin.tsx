import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Briefcase, ArrowRight, Lock, Mail, AlertCircle, Users, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/Button';

export const RecruiterLogin: React.FC<{ roleType: 'hiring_manager' | 'resource_manager' }> = ({ roleType }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Setup visual configurations based strictly on the role
    const config = roleType === 'hiring_manager' 
        ? { title: 'Hiring Manager Access', icon: <Briefcase className="w-8 h-8 text-blue-600" />, themeBg: 'bg-blue-50', btn: 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20', glow: 'bg-blue-500/10' }
        : { title: 'Resource Manager Access', icon: <Users className="w-8 h-8 text-indigo-600" />, themeBg: 'bg-indigo-50', btn: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20', glow: 'bg-indigo-500/10' };

    useEffect(() => {
        const errorType = searchParams.get('error');
        const reqRole = searchParams.get('requested_role')?.replace('_', ' ');
        if (errorType === 'pending_approval') {
            setError('Your account is currently pending approval by the Super Admin.');
        } else if (errorType === 'rejected_access') {
            setError('Your registration request was rejected by the organization.');
        } else if (errorType === 'not_registered_for_role') {
            setError(`You are not registered as ${reqRole || 'this role'}. Please register first.`);
        } else if (errorType === 'user_not_found') {
            setError('No account found for this email. Please register first.');
        }
    }, [searchParams]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            const { data } = await api.post('/auth/login', { email, password, role: roleType });
            login(data.access_token, data.user);
            navigate(roleType === 'hiring_manager' ? '/hiring/dashboard' : '/resource/dashboard');
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
                    onClick={() => window.location.href = '/'}
                    className="flex items-center gap-2 font-black text-slate-500 hover:text-slate-900 transition-colors bg-white/50 backdrop-blur-sm rounded-xl px-4 py-2 hover:bg-white shadow-sm border border-slate-100"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="text-[10px] uppercase tracking-widest">Back to Home</span>
                </Button>
            </div>

            {/* Background Decorations */}
            <div className={`absolute top-[-20%] right-[-10%] w-[50%] h-[50%] ${config.glow} rounded-full blur-[140px]`} />
            
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
                        className={`inline-flex items-center justify-center w-16 h-16 ${config.themeBg} rounded-2xl shadow-xl shadow-slate-200/50 mb-6 border border-white`}
                    >
                        {config.icon}
                    </motion.div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-3">{config.title}</h1>
                    <p className="text-slate-500 font-medium">Internal Corporate Authenticator</p>
                </div>

                <div className="bg-white/80 backdrop-blur-xl rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-white p-10">
                    <form onSubmit={handleLogin} className="space-y-6">
                        {error && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-600 mb-6"
                            >
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                <span className="text-xs font-bold leading-relaxed">{error}</span>
                            </motion.div>
                        )}

                        <div className="space-y-4">
                            <div className="group">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block transition-colors">Corporate Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-600 transition-colors" />
                                    <input 
                                        type="email" 
                                        value={email} 
                                        onChange={e => setEmail(e.target.value)} 
                                        required 
                                        placeholder="employee@alphanome.ai"
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-semibold outline-none focus:bg-white focus:ring-4 focus:ring-slate-500/10 focus:border-slate-300 transition-all shadow-inner" 
                                    />
                                </div>
                            </div>

                            <div className="group">
                                <div className="flex justify-between items-end mb-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest transition-colors">Access Key</label>
                                </div>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-600 transition-colors" />
                                    <input 
                                        type="password" 
                                        value={password} 
                                        onChange={e => setPassword(e.target.value)} 
                                        required 
                                        placeholder="••••••••"
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-semibold outline-none focus:bg-white focus:ring-4 focus:ring-slate-500/10 focus:border-slate-300 transition-all shadow-inner" 
                                    />
                                </div>
                            </div>
                        </div>

                        <Button 
                            type="submit" 
                            isLoading={isLoading} 
                            className={`w-full h-14 rounded-2xl text-white text-md font-black shadow-xl mt-4 ${config.btn}`}
                        >
                            Secure Login <ArrowRight className="w-4 h-4 ml-2" />
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
                                localStorage.setItem('login_role', roleType);
                                window.location.href = `/auth/google/login?role=${roleType}`;
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

                    <div className="mt-8 pt-8 border-t border-slate-100 text-center">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                            Don't have an account?{' '}
                            <button 
                                onClick={() => navigate(`/recruiter/register?role=${roleType}`)} 
                                className={`${roleType === 'hiring_manager' ? 'text-blue-600' : 'text-indigo-600'} hover:underline ml-1`}
                            >
                                Register Now
                            </button>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

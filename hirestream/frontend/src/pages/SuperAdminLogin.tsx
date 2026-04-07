import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ArrowRight, Lock, Mail, AlertCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/Button';

export const SuperAdminLogin: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            const { data } = await api.post('/auth/login', { 
                email, 
                password, 
                role: 'super_admin' 
            });
            login(data.access_token, data.user);
            navigate('/super-admin/dashboard');
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Authentication failed. Please check your credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
            {/* Top Left Back Button */}
            <div className="absolute top-8 left-8 z-50">
                <Button 
                    variant="ghost" 
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 font-black text-slate-400 hover:text-white transition-colors bg-white/5 backdrop-blur-sm rounded-xl px-4 py-2 hover:bg-white/10 shadow-sm border border-white/5"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="text-[10px] uppercase tracking-widest">Back to Home</span>
                </Button>
            </div>

            {/* Background Decorations */}
            <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 rounded-full blur-[140px]" />
            <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[140px]" />
            
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="w-full max-w-[480px] z-10"
            >
                <div className="text-center mb-10">
                    <motion.div 
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        className="inline-flex items-center justify-center w-16 h-16 bg-purple-500/20 rounded-2xl shadow-xl mb-6 border border-purple-500/20"
                    >
                        <Shield className="w-8 h-8 text-purple-400" />
                    </motion.div>
                    <h1 className="text-4xl font-black text-white tracking-tight mb-3">Super Admin</h1>
                    <p className="text-slate-400 font-medium">Elevated Platform Control</p>
                </div>

                <div className="bg-slate-900/50 backdrop-blur-xl rounded-[32px] shadow-2xl border border-white/5 p-10">
                    <form onSubmit={handleLogin} className="space-y-6">
                        {error && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 text-red-400 mb-6"
                            >
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                <span className="text-xs font-bold leading-relaxed">{error}</span>
                            </motion.div>
                        )}

                        <div className="space-y-4">
                            <div className="group">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block transition-colors">Admin Identifier</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                                    <input 
                                        type="email" 
                                        value={email} 
                                        onChange={e => setEmail(e.target.value)} 
                                        required 
                                        className="w-full bg-slate-800/50 border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-sm font-semibold text-white outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500/30 transition-all shadow-inner" 
                                    />
                                </div>
                            </div>

                            <div className="group">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block transition-colors">Access Key</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                                    <input 
                                        type="password" 
                                        value={password} 
                                        onChange={e => setPassword(e.target.value)} 
                                        required 
                                        className="w-full bg-slate-800/50 border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-sm font-semibold text-white outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500/30 transition-all shadow-inner" 
                                    />
                                </div>
                            </div>
                        </div>

                        <Button 
                            type="submit" 
                            isLoading={isLoading} 
                            className="w-full h-14 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-md font-black shadow-xl shadow-purple-500/20 mt-4"
                        >
                            Authorize Entry <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </form>
                </div>
            </motion.div>
        </div>
    );
};

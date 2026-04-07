import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Briefcase, Users, ArrowRight, ArrowLeft } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export const RecruiterAccess = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
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

            <div className="mb-12 text-center z-10">
                <div className="flex items-center gap-2 justify-center mb-6 cursor-pointer" onClick={() => navigate('/')}>
                    <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white font-bold">HS</div>
                    <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">HireStream</span>
                </div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-3">Recruiter Access</h1>
                <p className="text-slate-500 font-medium max-w-md mx-auto">Select your specialized workspace to review candidates and manage open requisitions.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl z-10">
                {/* Hiring Manager Card */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                    <Card className="p-10 border-none shadow-[0_30px_60px_rgba(0,0,0,0.06)] bg-white/90 backdrop-blur-xl rounded-[40px] h-full flex flex-col hover:shadow-2xl hover:scale-[1.02] transition-all cursor-pointer border border-white" onClick={() => navigate('/hiring/login')}>
                        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-8 border border-blue-100/50 shadow-sm">
                            <Briefcase className="w-8 h-8" />
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 mb-4">Hiring Manager</h2>
                        <p className="text-slate-500 font-medium leading-relaxed mb-10 flex-1">Access hiring requests and candidate approvals</p>
                        <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black h-14 rounded-2xl shadow-xl shadow-blue-500/20 text-md">
                            Login as Hiring Manager <ArrowRight className="w-5 h-5 ml-2" />
                        </Button>
                    </Card>
                </motion.div>

                {/* Resource Manager Card */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
                    <Card className="p-10 border-none shadow-[0_30px_60px_rgba(0,0,0,0.06)] bg-white/90 backdrop-blur-xl rounded-[40px] h-full flex flex-col hover:shadow-2xl hover:scale-[1.02] transition-all cursor-pointer border border-white" onClick={() => navigate('/resource/login')}>
                        <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-8 border border-indigo-100/50 shadow-sm">
                            <Users className="w-8 h-8" />
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 mb-4">Resource Manager</h2>
                        <p className="text-slate-500 font-medium leading-relaxed mb-10 flex-1">Manage candidates and hiring pipeline</p>
                        <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black h-14 rounded-2xl shadow-xl shadow-indigo-500/20 text-md">
                            Login as Resource Manager <ArrowRight className="w-5 h-5 ml-2" />
                        </Button>
                    </Card>
                </motion.div>
            </div>
            
            <div className="mt-12 z-10">
                <Button variant="ghost" className="font-bold text-slate-500 hover:bg-slate-200" onClick={() => navigate('/login')}>
                    I'm a Candidate
                </Button>
            </div>
        </div>
    );
};

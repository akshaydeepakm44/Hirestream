import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { MapPin, Briefcase, Zap, Target, BarChart, Send, Mail, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { cn } from '../utils/cn';
import { useAuth } from '../context/AuthContext';

export const LandingPage = () => {
    const navigate = useNavigate();
    const { token, user, login } = useAuth();
    const [jobs, setJobs] = useState<any[]>([]);
    const [searchParams] = useSearchParams();
    const [contactForm, setContactForm] = useState({ email: '', message: '' });
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        // Fetch public jobs
        api.get('/public/jobs').then(res => setJobs(res.data)).catch(console.error);
    }, []);

    useEffect(() => {
        const urlToken = searchParams.get('token');
        if (urlToken) {
            api.get('/users/me', { headers: { Authorization: `Bearer ${urlToken}` } })
               .then(res => {
                    const user = res.data;
                    login(urlToken, user);
                    
                    // Redirect based on role
                    if (user.role === 'hiring_manager') {
                        navigate('/hiring/dashboard');
                    } else if (user.role === 'resource_manager') {
                        navigate('/resource/dashboard');
                    } else if (user.role === 'super_admin') {
                        navigate('/super-admin/dashboard');
                    } else if (user.role === 'candidate') {
                        const applyJobId = localStorage.getItem("applyJobId");
                        if (applyJobId) {
                            navigate(`/candidate/jobs?apply=${applyJobId}`);
                        } else {
                            navigate('/candidate');
                        }
                    } else {
                        navigate('/');
                    }
               })
               .catch(err => {
                    console.error('SSO fetch user failed:', err);
                    navigate('/login?error=sso_failed');
               });
        }
    }, [searchParams, login, navigate]);

    return (
        <div className="min-h-screen bg-white">
            {/* Header/Navbar */}
            {/* Header/Navbar */}
            <header className="fixed top-0 w-full bg-white/70 backdrop-blur-xl z-50 border-b border-slate-200/50 transition-all duration-500">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-10">
                        {/* Logo */}
                        <div className="flex items-center gap-2.5 cursor-pointer group" onClick={() => navigate('/')}>
                            <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center text-white font-black shadow-xl shadow-slate-900/10 group-hover:scale-105 transition-transform duration-300">
                                HS
                            </div>
                            <span className="text-xl font-black tracking-tight text-slate-900">hirestream</span>
                        </div>

                        {/* Nav Links */}
                        <nav className="hidden md:flex items-center gap-8">
                            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 hover:text-primary-600 cursor-pointer transition-colors" onClick={() => document.getElementById('jobs')?.scrollIntoView({ behavior: 'smooth' })}>Careers</span>
                            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 hover:text-primary-600 cursor-pointer transition-colors" onClick={() => document.getElementById('why')?.scrollIntoView({ behavior: 'smooth' })}>Platform</span>
                            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 hover:text-primary-600 cursor-pointer transition-colors" onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}>Support</span>

                        </nav>
                    </div>

                    <div className="flex items-center gap-3">
                        {token ? (
                            <div className="flex items-center gap-2 p-1 bg-slate-100/50 border border-slate-200/60 rounded-2xl">
                                <div className="px-4 py-1.5 text-xs font-bold text-slate-600 hidden sm:block">
                                    Hey, {user?.full_name?.split(' ')[0]}
                                </div>
                                <Button 
                                    className="bg-slate-900 hover:bg-slate-800 text-white font-black text-[11px] uppercase tracking-widest h-10 px-6 rounded-xl shadow-2xl shadow-slate-900/20 active:scale-95 transition-all" 
                                    onClick={() => {
                                        const roleMap: Record<string, string> = {
                                            candidate: '/candidate',
                                            hiring_manager: '/hiring/dashboard',
                                            resource_manager: '/resource/dashboard'
                                        };
                                        navigate(roleMap[user?.role || 'candidate']);
                                    }}
                                >
                                    Dashboard
                                </Button>
                                <Button 
                                    variant="ghost"
                                    className="h-10 w-10 p-0 rounded-xl hover:bg-white text-slate-400 hover:text-red-500 transition-colors"
                                    onClick={() => { localStorage.removeItem('token'); window.location.reload(); }}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                </Button>
                            </div>
                        ) : (
                            <>

                                <Button 
                                    className="bg-primary-600 hover:bg-primary-500 text-white font-black text-[11px] uppercase tracking-widest h-11 px-8 rounded-2xl shadow-2xl shadow-primary-500/25 active:scale-95 transition-all" 
                                    onClick={() => navigate('/login')}
                                >
                                    Get Started
                                </Button>
                                <div className="w-px h-6 bg-slate-200 mx-2 hidden md:block"></div>
                                <Button 
                                    variant="outline"
                                    className="hidden md:flex border-none font-black text-slate-400 text-[10px] uppercase tracking-[0.2em] h-11 px-6 rounded-2xl hover:text-slate-900 transition-all"
                                    onClick={() => navigate('/recruiter')}
                                >
                                    Employers
                                </Button>
                                <Button 
                                    variant="outline"
                                    className="hidden lg:flex border-none font-black text-purple-400/60 text-[10px] uppercase tracking-[0.2em] h-11 px-4 rounded-2xl hover:text-purple-500 transition-all"
                                    onClick={() => navigate('/super-admin/login')}
                                >
                                    SA
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </header>

            <section className="pt-40 pb-20 px-6 max-w-7xl mx-auto">
                <div className="text-center max-w-4xl mx-auto mb-12 animate-in slide-in-from-bottom-5 duration-1000">

                    <h1 className="text-6xl md:text-8xl font-black text-slate-900 tracking-tighter leading-[0.95] mb-8">
                        Find Your Next <br/><span className="text-primary-600 decoration-8 underline decoration-primary-500/10 underline-offset-8">Opportunity</span>
                    </h1>
                    <p className="text-xl text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed mb-12">
                        HireStream is the modern intelligence layer for your technical career growth. Discover curated roles, apply instantly, and own your recruitment journey.
                    </p>

                </div>
            </section>

            {/* Why hirestream Features */}
            <section id="why" className="bg-slate-50 py-24">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-slate-900">Why build your career here?</h2>
                        <p className="text-slate-500 mt-2 font-medium">We put candidates first in the hiring ecosystem.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <Card className="p-8 border-none shadow-sm hover:shadow-md transition-shadow bg-white rounded-2xl">
                            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-6">
                                <Zap className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-4">AI Based Hiring</h3>
                            <p className="text-slate-500 text-sm leading-relaxed">Our intelligent matching ensures you are only considered for roles where you'll thrive.</p>
                        </Card>
                        <Card className="p-8 border-none shadow-sm hover:shadow-md transition-shadow bg-white rounded-2xl">
                            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 mb-6">
                                <Target className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-4">Fast Application</h3>
                            <p className="text-slate-500 text-sm leading-relaxed">1-click apply after setting up your profile. No redundant forms ever.</p>
                        </Card>
                        <Card className="p-8 border-none shadow-sm hover:shadow-md transition-shadow bg-white rounded-2xl">
                            <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 mb-6">
                                <BarChart className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-4">Track Progress</h3>
                            <p className="text-slate-500 text-sm leading-relaxed">Real-time status updates from screening to final offer stage.</p>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Featured Jobs */}
            <section id="jobs" className="py-24 px-6 max-w-7xl mx-auto">
                <div className="flex items-end justify-between mb-12">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-900">Open Opportunities</h2>
                        <p className="text-slate-500 mt-2 font-medium">Discover roles that match your ambitions.</p>
                    </div>
                </div>

                <div className="flex overflow-x-auto gap-6 pb-12 snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                    {jobs.length > 0 ? jobs.map(job => (
                        <div key={job.id} className="min-w-[85vw] md:min-w-[400px] flex-none snap-start">
                            <Card className="h-full p-8 border-slate-200 hover:border-primary-500 transition-colors group rounded-3xl flex flex-col cursor-pointer shadow-sm hover:shadow-xl" onClick={() => navigate(`/jobs/${job.id}`)}>
                                <div className="flex justify-between items-start mb-6">
                                    <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors border border-slate-100">
                                        <Briefcase className="w-7 h-7" />
                                    </div>
                                    <Badge className="bg-slate-100 text-slate-600 font-bold border-none px-4 py-1.5 capitalize rounded-full">
                                        {job.department}
                                    </Badge>
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] font-black text-primary-600 uppercase tracking-[0.2em] mb-2">{job.company_name || 'HireStream'}</p>
                                    <h3 className="text-2xl font-bold text-slate-900 group-hover:text-primary-600 transition-colors mb-3">{job.title}</h3>
                                    <div className="flex items-center gap-3 text-slate-500 font-medium mb-6">
                                        <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {job.location || 'Remote'}</span>
                                        <span>•</span>
                                        <span>{job.experience_level || 'Mid-Level'}</span>
                                    </div>
                                </div>
                                <div className="mt-8 pt-6 border-t border-slate-100 flex items-center gap-4">
                                    <Button variant="outline" className="flex-1 rounded-xl font-bold h-12 border-slate-200 hover:bg-slate-50" onClick={(e) => { e.stopPropagation(); navigate(`/jobs/${job.id}`); }}>
                                        Details
                                    </Button>
                                    <Button className="btn-primary-modern flex-[1.5] rounded-xl font-bold h-12 shadow-md shadow-primary-500/10" onClick={(e) => { e.stopPropagation(); navigate(`/jobs/${job.id}`); }}>
                                        Apply Now
                                    </Button>
                                </div>
                            </Card>
                        </div>
                    )) : (
                        <div className="w-full py-12 text-center text-slate-500 font-medium bg-slate-50 rounded-3xl border border-slate-100 border-dashed">
                            No open roles available right now.
                        </div>
                    )}
                </div>
            </section>

            <section id="contact" className="py-24 bg-slate-900 overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
                    <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary-500 rounded-full blur-[120px]" />
                    <div className="absolute top-1/2 -right-24 w-72 h-72 bg-purple-500 rounded-full blur-[120px]" />
                </div>
                
                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-8 md:p-16 flex flex-col lg:flex-row gap-16 items-center">
                        <div className="lg:w-1/2 space-y-8">
                            <div className="w-16 h-16 bg-primary-500/10 rounded-[2rem] flex items-center justify-center text-primary-400 border border-primary-500/20">
                                <Mail className="w-8 h-8" />
                            </div>
                            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter leading-tight">
                                Have questions? <br/><span className="text-primary-400">Get in touch with us.</span>
                            </h2>
                            <p className="text-slate-400 text-lg font-medium leading-relaxed max-w-md">
                                Whether you're a curious developer or an enterprise looking to scale, our team is ready to help you navigate your next step.
                            </p>
                        </div>

                        <div className="lg:w-1/2 w-full">
                            <Card className={cn(
                                "p-8 md:p-10 bg-white shadow-2xl rounded-[2.5rem] border-none relative overflow-hidden transition-all duration-500",
                                submitted ? "scale-95 opacity-90" : "scale-100"
                            )}>
                                {submitted ? (
                                    <div className="flex flex-col items-center justify-center text-center py-10 animate-in zoom-in duration-500">
                                        <div className="w-20 h-20 bg-emerald-50 rounded-[2.5rem] flex items-center justify-center text-emerald-500 mb-6 border border-emerald-100 shadow-xl shadow-emerald-500/10">
                                            <CheckCircle2 className="w-10 h-10" />
                                        </div>
                                        <h3 className="text-2xl font-black text-slate-900 mb-2">Message Sent!</h3>
                                        <p className="text-slate-500 font-medium mb-8">We've received your request and will get back to you shortly.</p>
                                        <Button 
                                            variant="outline" 
                                            className="h-12 px-8 rounded-xl font-black text-[10px] uppercase tracking-widest border-slate-100"
                                            onClick={() => {
                                                setSubmitted(false);
                                                setContactForm({ email: '', message: '' });
                                            }}
                                        >
                                            Send Another
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Your Professional Email</label>
                                            <input 
                                                type="email" 
                                                placeholder="alex@company.com"
                                                value={contactForm.email}
                                                onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                                                className="w-full h-14 px-6 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary-500/10 transition-all outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">How can we help?</label>
                                            <textarea 
                                                rows={4}
                                                placeholder="Tell us about your requirements or questions..."
                                                value={contactForm.message}
                                                onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                                                className="w-full p-6 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary-500/10 transition-all outline-none resize-none"
                                            />
                                        </div>
                                        <Button 
                                            className="w-full h-14 bg-primary-600 hover:bg-primary-500 text-white rounded-2xl flex items-center justify-center text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary-500/10"
                                            disabled={submitting || !contactForm.email || !contactForm.message}
                                            onClick={async () => {
                                                setSubmitting(true);
                                                try {
                                                    await api.post('/public/contact', contactForm);
                                                    setSubmitted(true);
                                                } catch (e) {
                                                    alert('Failed to send message. Please try again later.');
                                                } finally {
                                                    setSubmitting(false);
                                                }
                                            }}
                                        >
                                            {submitting ? 'Sending Request...' : 'Send Message'} <Send className="ml-2 w-4 h-4" />
                                        </Button>
                                    </div>
                                )}
                            </Card>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-slate-900 text-slate-400 py-20">
                <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12 text-center md:text-left">
                    <div className="md:col-span-2">
                        <div className="flex items-center gap-2 mb-6 justify-center md:justify-start">
                            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white font-bold opacity-90 text-[10px]">hs</div>
                            <span className="text-xl font-bold text-white tracking-tight">HireStream</span>
                        </div>
                        <p className="text-sm leading-relaxed max-w-sm mx-auto md:mx-0">Modernize your recruitment workflow with our intelligent, platform-driven approach to hiring top talent with HireStream.</p>
                    </div>
                    <div>
                        <h4 className="text-white font-bold mb-6">Platform</h4>
                        <ul className="space-y-4 text-sm font-medium">
                            <li className="hover:text-primary-400 cursor-pointer transition-colors" onClick={() => document.getElementById('jobs')?.scrollIntoView({ behavior: 'smooth' })}>Browse Jobs</li>
                            <li className="hover:text-primary-400 cursor-pointer transition-colors" onClick={() => document.getElementById('why')?.scrollIntoView({ behavior: 'smooth' })}>How it works</li>
                            <li className="hover:text-primary-400 cursor-pointer transition-colors">Our Story</li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-white font-bold mb-6">Legal</h4>
                        <ul className="space-y-4 text-sm font-medium">
                            <li className="hover:text-primary-400 cursor-pointer transition-colors">Privacy</li>
                            <li className="hover:text-primary-400 cursor-pointer transition-colors">Terms</li>
                            <li className="hover:text-primary-400 cursor-pointer transition-colors">Cookies</li>
                        </ul>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto px-6 mt-16 pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center text-sm gap-4">
                    <span className="text-slate-500">© {new Date().getFullYear()} hirestream. All rights reserved.</span>
                    <div className="flex gap-8 text-slate-500">
                        <span className="hover:text-white cursor-pointer transition-colors">Privacy Policy</span>
                        <span className="hover:text-white cursor-pointer transition-colors">Terms of Service</span>
                    </div>
                </div>
            </footer>
        </div>
    );
};

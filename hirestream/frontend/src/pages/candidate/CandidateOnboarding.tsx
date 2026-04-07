import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import {
    CheckCircle2,
    FileText,
    Upload,
    Download,
    ShieldCheck,
    AlertCircle,
    ArrowRight
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { cn } from '../../utils/cn';

export const CandidateOnboarding = () => {
    const [onboarding, setOnboarding] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    const fetchOnboarding = async () => {
        try {
            const res = await api.get('/candidates/onboarding');
            setOnboarding(res.data);
        } catch (e) {
            console.error('Failed to fetch onboarding data', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOnboarding();
    }, []);

    const handleAcceptOffer = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', e.target.files[0]);

        try {
            await api.post('/candidates/onboarding/accept', formData);
            fetchOnboarding();
            alert('Offer accepted and document uploaded!');
        } catch (e) {
            alert('Failed to upload acceptance document');
        } finally {
            setUploading(false);
        }
    };

    const [docs, setDocs] = useState<Record<string, File | null>>({
        photo: null,
        pan: null,
        aadhaar: null,
        academic: null,
        address: null,
        experience: null,
        relieving: null,
        payslips: null
    });

    const handleSubmitDocs = async () => {
        setUploading(true);
        const formData = new FormData();
        formData.append('is_fresher', String(onboarding.is_fresher));
        
        Object.entries(docs).forEach(([key, file]) => {
            if (file) formData.append(key, file);
        });

        try {
            await api.post('/candidates/onboarding/documents', formData);
            fetchOnboarding();
            alert('Onboarding documents submitted successfully!');
        } catch (e) {
            alert('Failed to submit documents');
        } finally {
            setUploading(false);
        }
    };

    if (loading) return (
        <div className="p-8 max-w-5xl mx-auto space-y-8 animate-pulse">
            <div className="h-10 w-64 bg-slate-100 rounded-lg" />
            <div className="h-64 bg-slate-50 rounded-3xl" />
        </div>
    );

    if (!onboarding) return (
        <div className="p-8 max-w-5xl mx-auto h-[600px] flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-6">
                <ShieldCheck className="w-10 h-10 text-slate-300" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">No Active Onboarding</h2>
            <p className="text-slate-500 max-w-md font-medium">
                You don't have any active onboarding tasks at the moment. Keep an eye on your applications!
            </p>
        </div>
    );

    const steps = [
        { id: 1, label: 'Review Offer', completed: onboarding.offer_letter_sent },
        { id: 2, label: 'Accept Offer', completed: onboarding.offer_letter_accepted },
        { id: 3, label: 'Submit Docs', completed: onboarding.documents_submitted }
    ];

    const currentStep = !onboarding.offer_letter_sent ? 1 :
        !onboarding.offer_letter_accepted ? 2 :
            !onboarding.documents_submitted ? 3 : 4;

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Candidate Onboarding</h1>
                    <p className="text-slate-500 font-medium mt-1">Complete your final steps to join the team.</p>
                </div>
                <Badge variant={onboarding.onboarding_completed ? 'success' : 'info'} className="h-8 font-bold px-4">
                    {onboarding.onboarding_completed ? 'ONBOARDING COMPLETE' : 'IN PROGRESS'}
                </Badge>
            </div>

            {/* Stepper UI */}
            <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm">
                <div className="relative flex justify-between">
                    <div className="absolute top-5 left-0 w-full h-[2px] bg-slate-100 z-0" />
                    <div
                        className="absolute top-5 left-0 h-[2px] bg-primary-500 z-0 transition-all duration-700"
                        style={{ width: `${((currentStep - 1) / 2) * 100}%` }}
                    />

                    {steps.map((step) => (
                        <div key={step.id} className="relative z-10 flex flex-col items-center gap-3 bg-white px-4">
                            <div className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 border-2",
                                step.completed
                                    ? "bg-primary-500 border-primary-500 text-white shadow-lg shadow-primary-500/20"
                                    : currentStep === step.id
                                        ? "bg-white border-primary-500 text-primary-600"
                                        : "bg-white border-slate-200 text-slate-400"
                            )}>
                                {step.completed ? <CheckCircle2 className="w-5 h-5" /> : <span className="text-xs font-black">{step.id}</span>}
                            </div>
                            <span className={cn(
                                "text-[10px] font-black uppercase tracking-widest",
                                step.completed || currentStep === step.id ? "text-slate-900" : "text-slate-400"
                            )}>
                                {step.label}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Task Detail */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Offer Letter Task */}
                    <Card className={cn(
                        "p-8 transition-all duration-500 overflow-hidden relative",
                        currentStep === 2 ? "border-primary-500 ring-4 ring-primary-500/5 shadow-xl" : "border-slate-100 opacity-60"
                    )}>
                        <div className="flex items-start justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-600">
                                    <FileText className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">Review & Accept Offer</h3>
                                    <p className="text-xs text-slate-500 font-medium">Step 2: Sign and formalize your employment.</p>
                                </div>
                            </div>
                            {onboarding.offer_letter_accepted && <Badge variant="success">COMPLETED</Badge>}
                        </div>

                        <div className="space-y-6">
                            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100">
                                        <FileText className="w-5 h-5 text-red-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 leading-none">Official Offer Letter.pdf</p>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Ready for Signature</p>
                                    </div>
                                </div>
                                <Button
                                    onClick={() => window.open(onboarding.offer_letter_url, '_blank')}
                                    variant="outline" className="h-10 rounded-xl bg-white border-slate-200 text-slate-700 font-bold hover:bg-white shadow-sm"
                                >
                                    <Download className="w-4 h-4 mr-2" /> Download
                                </Button>
                            </div>

                            {!onboarding.offer_letter_accepted && (
                                <div className="p-8 border-2 border-dashed border-primary-200 rounded-3xl bg-primary-50/30 flex flex-col items-center justify-center text-center gap-4 group hover:border-primary-500 hover:bg-primary-50/50 transition-all cursor-pointer relative">
                                    <input
                                        type="file"
                                        accept=".pdf"
                                        onChange={handleAcceptOffer}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        disabled={uploading}
                                    />
                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-primary-500 ring-4 ring-primary-500/5 group-hover:scale-110 transition-transform">
                                        <Upload className={cn("w-6 h-6", uploading && "animate-bounce")} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900">Upload Signed Acceptance</p>
                                        <p className="text-xs text-slate-500 font-medium mt-1">Drag and drop or click to browse (PDF only)</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Documents Task */}
                    <Card className={cn(
                        "p-8 transition-all duration-500 overflow-hidden relative",
                        currentStep === 3 ? "border-primary-500 ring-4 ring-primary-500/5 shadow-xl" : "border-slate-100 opacity-60"
                    )}>
                        <div className="flex items-start justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                                    <ShieldCheck className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">Professional Verification</h3>
                                    <p className="text-xs text-slate-500 font-medium">Step 3: Document submission for background check.</p>
                                </div>
                            </div>
                            {onboarding.documents_submitted && <Badge variant="success">COMPLETED</Badge>}
                        </div>

                        <div className="space-y-6">
                                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 flex justify-between items-center">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Employment Status</label>
                                        <p className="text-sm font-bold text-slate-900 mt-1">{onboarding.is_fresher ? 'Fresher' : 'Experienced'}</p>
                                    </div>
                                    <Badge variant="info" className="px-3 py-1 font-black">LOCKED</Badge>
                                </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[
                                    { id: 'photo', label: 'Candidate Photo' },
                                    { id: 'pan', label: 'PAN Card' },
                                    { id: 'aadhaar', label: 'Aadhaar Card' },
                                    { id: 'academic', label: 'Academic Degree' },
                                    { id: 'address', label: 'Address Proof' },
                                    ...(!onboarding.is_fresher ? [
                                        { id: 'experience', label: 'Experience Letter' },
                                        { id: 'relieving', label: 'Relieving Letter' },
                                        { id: 'payslips', label: 'Previous 3m Payslips' }
                                    ] : [])
                                ].map((doc) => (
                                    <div key={doc.id} className="p-4 bg-slate-50 border border-slate-100 rounded-xl relative overflow-hidden">
                                        <div className="flex items-center justify-between pointer-events-none">
                                            <span className="text-sm font-bold text-slate-600">{doc.label}</span>
                                            <div className="flex items-center gap-2">
                                                {docs[doc.id] ? (
                                                    <Badge variant="success">READY</Badge>
                                                ) : onboarding?.[`${doc.id}_url`] ? (
                                                    <Badge variant="info">UPLOADED</Badge>
                                                ) : (
                                                    <Upload className="w-4 h-4 text-slate-300" />
                                                )}
                                            </div>
                                        </div>
                                        <input 
                                            type="file" 
                                            accept=".pdf,image/*" 
                                            onChange={(e) => setDocs(prev => ({ ...prev, [doc.id]: e.target.files?.[0] || null }))}
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                        />
                                    </div>
                                ))}
                            </div>

                            {currentStep === 3 && (
                                <Button
                                    onClick={handleSubmitDocs}
                                    disabled={uploading}
                                    className="w-full h-12 btn-primary-modern rounded-2xl flex items-center justify-center text-xs font-black uppercase tracking-widest mt-6 shadow-xl"
                                >
                                    {uploading ? "Uploading..." : "Submit All Documents"} <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            )}
                        </div>
                    </Card>
                </div>

                {/* Right Column: Info & Help */}
                <div className="space-y-6">
                    <Card className="p-6 bg-slate-900 text-white border-none space-y-6 relative overflow-hidden">
                        <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-primary-500/10 rounded-full blur-3xl" />

                        <h4 className="text-xs font-black uppercase tracking-[0.2em] text-primary-400">Onboarding Support</h4>
                        <div className="space-y-4 relative z-10">
                            <p className="text-sm font-medium text-slate-400 leading-relaxed">
                                Our administration team is here to help you with the onboarding process.
                            </p>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all cursor-pointer">
                                    <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center">
                                        <AlertCircle className="w-4 h-4 text-white" />
                                    </div>
                                    <span className="text-xs font-bold">Read Onboarding Guide</span>
                                </div>
                            </div>
                        </div>
                        <div className="pt-4 border-t border-white/10">
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
                                HIRESTREAM SYSTEM VERIFIED SECURE PIPELINE
                            </p>
                        </div>
                    </Card>

                    <Card className="p-6 border-slate-100 bg-slate-50/50">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Required Documents</h4>
                        <ul className="space-y-3">
                            {[
                                'Clear scanned copy of Aadhaar/ID',
                                'Signed Offer Letter Copy',
                                'Academic Marksheets (Degree)',
                                'Previous 3 Months Payslips (if exp)'
                            ].map((item, i) => (
                                <li key={i} className="flex gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5 shrink-0" />
                                    <span className="text-xs font-bold text-slate-600 leading-relaxed">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </Card>
                </div>
            </div>
        </div>
    );
};

import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Requisition } from '../../types';
import { Upload, FileText, Zap, Activity, Briefcase, FileCheck, AlertCircle } from 'lucide-react';

import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { cn } from '../../utils/cn';

export const ResourceManagerATS = () => {
    const [roles, setRoles] = useState<Requisition[]>([]);
    const [selectedRole, setSelectedRole] = useState<string>('');
    const [file, setFile] = useState<File | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState<{
        ats_score: number;
        matched_skills: string[];
        missing_skills: string[];
    } | null>(null);

    useEffect(() => {
        api.get('/rm/requisitions').then(res => setRoles(res.data)).catch(console.error);
    }, []);

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !selectedRole) return;

        setIsAnalyzing(true);
        const formData = new FormData();
        formData.append('resume', file);
        formData.append('requisition_id', selectedRole);

        try {
            const { data } = await api.post('/rm/ats/analyze', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setResult(data);
        } catch (err: any) {
            console.error(err);
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">ATS Analysis</h1>
                    <p className="text-sm text-slate-500 mt-1">Compare resumes against active requisitions to evaluate skill alignment.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Upload Form */}
                <Card className="lg:col-span-1 p-8 border border-slate-200 shadow-sm bg-white">
                    <form onSubmit={handleUpload} className="space-y-6">
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Target Requisition</label>
                            <div className="relative">
                                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <select 
                                    value={selectedRole} 
                                    onChange={e => setSelectedRole(e.target.value)}
                                    className="input-modern h-12 pl-10"
                                    required
                                >
                                    <option value="">Select Requisition</option>
                                    {roles.map(r => (
                                        <option key={r.id} value={r.id}>{r.title}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Resume Document (PDF)</label>
                            <div className={cn(
                                "border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center transition-all relative",
                                file ? "border-primary-500 bg-primary-50" : "border-slate-200 bg-slate-50 hover:border-slate-300"
                            )}>
                                <input 
                                    type="file" 
                                    accept=".pdf" 
                                    onChange={e => setFile(e.target.files?.[0] || null)}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                {file ? (
                                    <>
                                        <div className="w-10 h-10 bg-white rounded shadow-sm flex items-center justify-center text-primary-600 mb-2 border border-primary-100">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <p className="text-xs font-bold text-slate-900 text-center truncate w-full">{file.name}</p>
                                        <p className="text-[10px] text-slate-500 mt-1">Ready to analyze</p>
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-8 h-8 text-slate-300 mb-2" />
                                        <p className="text-xs font-bold text-slate-400">Click or drag PDF</p>
                                    </>
                                )}
                            </div>
                        </div>

                        <Button 
                            type="submit" 
                            disabled={isAnalyzing || !file || !selectedRole}
                            isLoading={isAnalyzing}
                            className="btn-primary-modern w-full h-12 font-bold"
                        >
                            Analyze Resume
                        </Button>
                    </form>
                </Card>

                {/* Analysis Results */}
                <div className="lg:col-span-2">
                    {result ? (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
                            <Card className="p-8 border border-slate-200 shadow-sm bg-white">
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900">Analysis Results</h3>
                                        <p className="text-xs text-slate-500 mt-1">Resume score based on requisition requirements.</p>
                                    </div>
                                    <div className="text-right">
                                        <div className={cn(
                                            "text-4xl font-bold",
                                            result.ats_score >= 70 ? "text-emerald-600" : "text-amber-600"
                                        )}>
                                            {result.ats_score}%
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Match Score</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-emerald-600 border-b border-slate-100 pb-2">
                                            <FileCheck className="w-4 h-4" />
                                            <h4 className="text-[10px] font-bold uppercase tracking-widest">Matched Skills</h4>
                                        </div>
                                        <div className="flex flex-wrap gap-2 text-sm">
                                            {result.matched_skills.map(skill => (
                                                <Badge key={skill} variant="success" className="px-3 py-1 rounded bg-emerald-50 text-emerald-700 border-emerald-100 font-bold text-[10px]">
                                                    {skill}
                                                </Badge>
                                            ))}
                                            {result.matched_skills.length === 0 && <p className="text-xs text-slate-400 italic">No direct matches found.</p>}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-amber-600 border-b border-slate-100 pb-2">
                                            <AlertCircle className="w-4 h-4" />
                                            <h4 className="text-[10px] font-bold uppercase tracking-widest">Missing Skills</h4>
                                        </div>
                                        <div className="flex flex-wrap gap-2 text-sm">
                                            {result.missing_skills.map(skill => (
                                                <Badge key={skill} variant="info" className="px-3 py-1 rounded border-slate-200 text-slate-500 font-bold text-[10px]">
                                                    {skill}
                                                </Badge>
                                            ))}
                                            {result.missing_skills.length === 0 && <p className="text-xs text-slate-400 italic">No missing skills identified.</p>}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-10 pt-8 border-t border-slate-100">
                                    <div className="bg-slate-50 p-4 rounded-lg flex items-start gap-3">
                                        <Zap className="w-5 h-5 text-primary-500 shrink-0" />
                                        <p className="text-xs text-slate-500 leading-relaxed">
                                            <strong>Developer Note:</strong> This score is a heuristic match based on keyword extraction. Manual review of the resume is still recommended for qualitative assessment.
                                        </p>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    ) : (
                        <div className="h-full min-h-[400px] border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center text-center p-8 bg-slate-50/50">
                            <Activity className="w-12 h-12 text-slate-200 mb-4" />
                            <h3 className="text-base font-bold text-slate-900">Awaiting Analysis</h3>
                            <p className="text-sm text-slate-500 mt-1 max-w-xs">Upload a resume and select a target requisition on the left to begin the comparison process.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

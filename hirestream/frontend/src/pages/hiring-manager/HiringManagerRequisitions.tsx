import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { 
    Briefcase, 
    MapPin, 
    Building, 
    Users, 
    Calendar, 
    Plus
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { useNavigate } from 'react-router-dom';

export const HiringManagerRequisitions = () => {
    const [requisitions, setRequisitions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const fetchRequisitions = async () => {
        try {
            const { data } = await api.get('/hm/requisitions/me');
            // Include pending requisitions so HMs can see their requests awaiting approval
            setRequisitions(data.filter((r: any) => r.status === 'open' || r.status === 'pending' || r.is_active));
        } catch (error) {
            console.error('Failed to fetch requisitions', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequisitions();
        const interval = setInterval(fetchRequisitions, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Active Requisitions</h1>
                    <p className="text-sm text-slate-500 mt-1">View and monitor all open job roles assigned to you.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" className="btn-outline-modern" onClick={() => navigate('/hiring-manager/hire-request')}>
                        <Plus className="w-4 h-4 mr-2" />
                        New Request
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
                </div>
            ) : requisitions.length === 0 ? (
                <Card className="p-12 text-center bg-slate-50/50 border-dashed border-2 border-slate-200">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                        <Briefcase className="w-8 h-8 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">No active requisitions</h3>
                    <p className="text-sm text-slate-500 mt-2 max-w-xs mx-auto">
                        You don't have any open roles assigned to you at the moment.
                    </p>
                    <Button className="mt-6 btn-primary-modern" onClick={() => navigate('/hiring-manager/hire-request')}>
                        Submit Job Requisition
                    </Button>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {requisitions.map((req) => (
                        <Card key={req.id} className="group hover:border-primary-500 transition-all duration-300 overflow-hidden bg-white shadow-sm border border-slate-200 flex flex-col">
                            <div className="p-6 flex-1">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors">
                                        <Briefcase className="w-6 h-6" />
                                    </div>
                                    <Badge variant="success" className="rounded py-0.5 capitalize text-[10px] font-bold tracking-tight">
                                        {req.status}
                                    </Badge>
                                </div>

                                <h3 className="text-lg font-bold text-slate-900 group-hover:text-primary-600 transition-colors leading-tight mb-4">
                                    {req.title}
                                </h3>

                                <div className="space-y-3">
                                    <div className="flex items-center gap-2.5 text-xs font-medium text-slate-500">
                                        <Building className="w-4 h-4 text-slate-400" />
                                        <span>{req.department}</span>
                                    </div>
                                    <div className="flex items-center gap-2.5 text-xs font-medium text-slate-500">
                                        <MapPin className="w-4 h-4 text-slate-400" />
                                        <span>{req.location || 'Remote'}</span>
                                    </div>
                                    <div className="flex items-center gap-2.5 text-xs font-medium text-slate-500">
                                        <Users className="w-4 h-4 text-slate-400" />
                                        <span>{req.openings || 1} Open Slots</span>
                                    </div>
                                </div>
                            </div>

                            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center">
                                <div className="flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        Opened {new Date(req.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

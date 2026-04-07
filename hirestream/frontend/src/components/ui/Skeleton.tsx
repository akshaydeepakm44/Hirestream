import { cn } from '../../utils/cn';

export const Skeleton = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={cn('animate-pulse rounded-xl bg-slate-200', className)} {...props} />
);

export const DashboardStatsSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
        ))}
    </div>
);

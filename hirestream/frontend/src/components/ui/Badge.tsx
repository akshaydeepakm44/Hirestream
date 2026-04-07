import * as React from 'react';
import { cn } from '../../utils/cn';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'white' | 'indigo' | 'outline';
}

export const Badge = ({ className, variant = 'default', ...props }: BadgeProps) => {
    const variants = {
        default: 'bg-slate-100 text-slate-700 border-slate-200',
        success: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        warning: 'bg-amber-50 text-amber-700 border-amber-100',
        danger: 'bg-red-50 text-red-700 border-red-100',
        info: 'bg-blue-50 text-blue-700 border-blue-100',
        purple: 'bg-purple-50 text-purple-700 border-purple-100',
        white: 'bg-white text-slate-900 border-slate-100 shadow-sm',
        indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
        outline: 'bg-transparent text-slate-500 border-slate-200 hover:bg-slate-50'
    };

    return (
        <div 
            className={cn(
                'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider transition-colors',
                variants[variant],
                className
            )} 
            {...props} 
        />
    );
};


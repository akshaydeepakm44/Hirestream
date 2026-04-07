import * as React from 'react';
import { cn } from '../../utils/cn';

export const Card = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div 
        className={cn(
            'bg-card rounded-2xl border border-border shadow-[0_1px_3px_rgba(0,0,0,0.02),0_4px_12px_rgba(0,0,0,0.03)] p-6 transition-all',
            className
        )} 
        {...props}
    >
        {children}
    </div>
);

export const GlassCard = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div 
        className={cn(
            'bg-white/70 backdrop-blur-xl border border-white/40 shadow-xl rounded-3xl p-6',
            className
        )} 
        {...props}
    >
        {children}
    </div>
);

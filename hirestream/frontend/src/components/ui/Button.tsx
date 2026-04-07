import * as React from 'react';
import { cn } from '../../utils/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'outline' | 'ghost' | 'danger' | 'white';
    size?: 'sm' | 'md' | 'lg' | 'icon';
    isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
        const variants = {
            primary: 'bg-primary-500 text-white shadow-[0_1px_2px_rgba(0,0,0,0.1),_inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-primary-600 active:scale-95',
            outline: 'border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 active:bg-slate-100',
            ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
            danger: 'bg-red-500 text-white hover:bg-red-600',
            white: 'bg-white text-slate-900 border border-slate-200 shadow-sm hover:bg-slate-50'
        };

        const sizes = {
            sm: 'px-3 py-1.5 text-xs',
            md: 'px-4 py-2.5 text-sm',
            lg: 'px-6 py-3 text-base',
            icon: 'p-2'
        };

        return (
            <button
                ref={ref}
                disabled={isLoading || disabled}
                className={cn(
                    'inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none focus-visible:ring-2 focus-visible:ring-primary-500/50 outline-none',
                    variants[variant],
                    sizes[size],
                    className
                )}
                {...props}
            >
                {isLoading ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                ) : null}
                {children}
            </button>
        );
    }
);

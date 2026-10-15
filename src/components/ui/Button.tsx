import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, disabled, children, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#f4f7fc] dark:focus:ring-offset-[#0b0f19] disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]';

    const variants = {
      primary:
        'bg-[#005a9c] hover:bg-[#0877c9] text-white shadow-lg shadow-blue-950/20 focus:ring-[#0877c9] border border-[#005a9c] dark:bg-emerald-600 dark:hover:bg-emerald-500 dark:shadow-emerald-950/40 dark:focus:ring-emerald-500 dark:border-emerald-500/30',
      secondary:
        'bg-[#edf5fc] hover:bg-[#dcecff] text-[#005a9c] border border-[#b9d9f3] focus:ring-[#0877c9] dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 dark:border-slate-700/80 dark:focus:ring-slate-500',
      outline:
        'bg-white hover:bg-[#edf5fc] text-[#52647d] hover:text-[#005a9c] border border-[#b9d9f3] focus:ring-[#0877c9] dark:bg-transparent dark:hover:bg-slate-800/60 dark:text-slate-300 dark:hover:text-white dark:border-slate-700 dark:focus:ring-slate-500',
      danger:
        'bg-rose-600/90 hover:bg-rose-600 text-white shadow-lg shadow-rose-950/40 focus:ring-rose-500 border border-rose-500/30',
      ghost:
        'bg-transparent hover:bg-[#edf5fc] text-[#52647d] hover:text-[#005a9c] focus:ring-[#0877c9] dark:hover:bg-slate-800/50 dark:text-slate-300 dark:hover:text-white dark:focus:ring-slate-500',
      success:
        'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold focus:ring-emerald-400 shadow-lg shadow-emerald-500/20',
    };

    const sizes = {
      sm: 'px-2.5 py-1.5 text-xs gap-1.5',
      md: 'px-4 py-2 text-sm gap-2',
      lg: 'px-5 py-2.5 text-base gap-2.5',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

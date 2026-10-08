import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'outline';
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'neutral',
  children,
  ...props
}) => {
  const variants = {
    success: 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30',
    warning: 'bg-amber-950/60 text-amber-400 border border-amber-500/30',
    danger: 'bg-rose-950/60 text-rose-400 border border-rose-500/30',
    info: 'bg-blue-950/60 text-blue-400 border border-blue-500/30',
    neutral: 'bg-slate-800 text-slate-300 border border-slate-700',
    outline: 'bg-transparent text-slate-400 border border-slate-700',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium tracking-wide',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};

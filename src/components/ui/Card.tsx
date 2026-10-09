import React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({ className, hoverable, children, ...props }) => {
  return (
    <div
      className={cn(
        'bg-white border border-[#dce4f0] rounded-xl p-5 shadow-[0_8px_22px_-14px_rgba(18,44,82,.22)] dark:bg-[#121826] dark:border-slate-800/90 dark:shadow-xl dark:shadow-black/20',
        hoverable && 'transition-all duration-200 hover:border-[#9fc9ed] hover:shadow-[0_14px_28px_-16px_rgba(18,44,82,.28)] hover:-translate-y-0.5 dark:hover:border-slate-700 dark:hover:shadow-2xl',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div className={cn('flex items-center justify-between pb-4 border-b border-[#dce4f0] mb-4 dark:border-slate-800/80', className)} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  className,
  children,
  ...props
}) => (
  <h3 className={cn('text-base font-semibold text-[#152238] flex items-center gap-2 dark:text-slate-100', className)} {...props}>
    {children}
  </h3>
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  className,
  children,
  ...props
}) => (
  <p className={cn('text-xs text-[#627289] mt-1 dark:text-slate-400', className)} {...props}>
    {children}
  </p>
);

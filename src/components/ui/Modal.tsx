import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '5xl' | '6xl';
  /** 'destaque': cabeçalho azul-escuro de largura total, usado na identificação de pessoas. */
  variant?: 'padrao' | 'destaque';
}

// Pilha de modais abertos: só o do topo responde ao Esc, e a rolagem da página
// fica travada enquanto houver algum modal aberto.
const openModals: string[] = [];

const syncBodyScroll = () => {
  document.body.style.overflow = openModals.length ? 'hidden' : '';
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  icon,
  children,
  maxWidth = 'lg',
  variant = 'padrao',
}) => {
  const modalId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    openModals.push(modalId);
    syncBodyScroll();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && openModals[openModals.length - 1] === modalId) onCloseRef.current();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      const index = openModals.lastIndexOf(modalId);
      if (index >= 0) openModals.splice(index, 1);
      syncBodyScroll();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, modalId]);

  if (!isOpen) return null;

  const maxWidths = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
  };

  if (variant === 'destaque') {
    return createPortal(
      <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4" style={{ paddingBottom: 'var(--keyboard-inset, 0px)' }}>
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity" onClick={onClose} />
        <div
          className={cn(
            'relative z-10 flex max-h-[calc(92dvh-var(--keyboard-inset,0px))] w-full flex-col overflow-hidden rounded-t-[24px] bg-white shadow-[0_32px_64px_-20px_rgba(10,30,70,.45)] sm:max-h-[96vh] sm:rounded-3xl dark:bg-[#121826]',
            maxWidths[maxWidth]
          )}
        >
          <div className="relative overflow-hidden bg-gradient-to-r from-[#081a40] via-[#0c2558] to-[#123a86] px-4 pb-7 pt-4 sm:px-7 sm:pb-11 sm:pt-8">
            <div aria-hidden className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full border border-sky-300/15" />
            <div aria-hidden className="pointer-events-none absolute -right-8 -top-48 h-96 w-96 rounded-full border border-sky-300/10" />
            <div className="relative flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 sm:gap-4">
                {icon && (
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/15 bg-white/10 text-white sm:h-14 sm:w-14">
                    {icon}
                  </div>
                )}
                <div>
                  <h2 className="text-lg font-extrabold tracking-tight text-white sm:text-2xl">{title}</h2>
                  {description && <p className="mt-0.5 text-xs text-sky-200/90 sm:text-base">{description}</p>}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/20 bg-white/10 text-white transition-colors hover:bg-white/20"
                aria-label="Fechar janela"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="relative -mt-4 flex-1 overflow-y-auto rounded-t-3xl bg-white dark:bg-[#121826]">{children}</div>
        </div>
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4" style={{ paddingBottom: 'var(--keyboard-inset, 0px)' }}>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div
        className={cn(
          'relative z-10 flex max-h-[calc(92dvh-var(--keyboard-inset,0px))] w-full flex-col overflow-hidden rounded-t-[24px] border border-[#dce4f0] bg-white p-5 shadow-[0_24px_52px_-16px_rgba(18,44,82,.28)] sm:max-h-[96vh] sm:rounded-2xl sm:p-6 dark:border-slate-700/80 dark:bg-[#121826] dark:shadow-2xl',
          maxWidths[maxWidth]
        )}
      >
        <div className={cn('flex justify-between border-b border-[#dce4f0] dark:border-slate-800', icon ? 'items-start gap-3 pb-4' : 'items-center pb-3')}>
          <div className={cn(icon && 'flex items-center gap-3.5')}>
            {icon && (
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#edf5fc] text-[#0b6bbf] dark:bg-slate-800 dark:text-sky-300">
                {icon}
              </div>
            )}
            <div>
              <h2 className={cn('font-bold text-[#152238] dark:text-slate-100', icon ? 'text-xl' : 'text-lg')}>{title}</h2>
              {description && <p className={cn('text-[#627289] dark:text-slate-400 mt-0.5', icon ? 'text-sm' : 'text-xs')}>{description}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-11 w-11 place-items-center rounded-xl text-[#627289] transition-colors hover:bg-[#edf5fc] hover:text-[#005a9c] dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label="Fechar janela"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 overflow-y-auto flex-1 sm:py-3">{children}</div>
      </div>
    </div>,
    document.body,
  );
};

import React from 'react';
import { AlertTriangle, CheckCircle2, CircleDot, Clock3, Loader2, Search } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import { SITUACOES } from '@/services/ccoService';
import { CcoSituacao } from '@/types';

/** Cor + ícone + texto: a situação nunca depende só da cor. */
export const ESTILO_SITUACAO: Record<CcoSituacao, { classe: string; ponto: string; icone: typeof CircleDot }> = {
  registrada: {
    classe: 'bg-sky-50 text-sky-800 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-200 dark:ring-sky-500/30',
    ponto: 'bg-sky-500',
    icone: CircleDot,
  },
  em_analise: {
    classe: 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/30',
    ponto: 'bg-amber-500',
    icone: Search,
  },
  em_atendimento: {
    classe: 'bg-violet-50 text-violet-800 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-200 dark:ring-violet-500/30',
    ponto: 'bg-violet-500',
    icone: Clock3,
  },
  concluida: {
    classe: 'bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/30',
    ponto: 'bg-green-600',
    icone: CheckCircle2,
  },
};

export const SituacaoBadge: React.FC<{ situacao: CcoSituacao; className?: string }> = ({ situacao, className }) => {
  const estilo = ESTILO_SITUACAO[situacao];
  const Icone = estilo.icone;
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ring-1', estilo.classe, className)}>
      <Icone className="h-3.5 w-3.5" aria-hidden="true" />
      {SITUACOES[situacao].rotulo}
    </span>
  );
};

export const Cartao: React.FC<React.HTMLAttributes<HTMLElement> & { as?: 'section' | 'div' }> = ({ as: Tag = 'section', className, ...props }) => (
  <Tag
    className={cn(
      'rounded-2xl border border-[#e2eaf4] bg-white shadow-[0_10px_30px_-22px_rgba(16,48,96,.45)] dark:border-slate-800 dark:bg-[#121826] dark:shadow-none',
      className,
    )}
    {...props}
  />
);

export const IconeTitulo: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <span className={cn('grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#e8f1fd] text-[#0b63ce] ring-1 ring-[#d3e3f8] dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/20', className)}>
    {children}
  </span>
);

export const botaoPrimario =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#0b63ce] px-5 text-[15px] font-bold text-white shadow-[0_10px_20px_-12px_rgba(11,99,206,.9)] transition-all hover:bg-[#0a56b4] active:scale-[.98] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#0b63ce] disabled:cursor-not-allowed disabled:opacity-60';

export const botaoSecundario =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#b9cfe9] bg-white px-5 text-[15px] font-bold text-[#0b4fa3] transition-colors hover:bg-[#f0f6fe] active:scale-[.98] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#0b63ce] disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-transparent dark:text-sky-200 dark:hover:bg-slate-800';

interface ConfirmacaoProps {
  aberta: boolean;
  titulo: string;
  mensagem: React.ReactNode;
  confirmar: string;
  cancelar?: string;
  perigo?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
  /** Esc, X ou clique fora; por padrão, o mesmo que cancelar. */
  onFechar?: () => void;
}

/** Pergunta de confirmação com o foco no botão seguro. */
export const Confirmacao: React.FC<ConfirmacaoProps> = ({ aberta, titulo, mensagem, confirmar, cancelar = 'Cancelar', perigo, onConfirmar, onCancelar, onFechar }) => (
  <Modal isOpen={aberta} onClose={onFechar ?? onCancelar} title={titulo} maxWidth="md" icon={<AlertTriangle className="h-6 w-6" />}>
    <div className="space-y-5">
      <div className="text-sm leading-relaxed text-[#3b4d68] dark:text-slate-300">{mensagem}</div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" autoFocus onClick={onCancelar} className={botaoSecundario}>{cancelar}</button>
        <button
          type="button"
          onClick={onConfirmar}
          className={cn(botaoPrimario, perigo && 'bg-rose-600 shadow-none hover:bg-rose-700 focus-visible:outline-rose-600')}
        >
          {confirmar}
        </button>
      </div>
    </div>
  </Modal>
);

export const Carregando: React.FC<{ texto?: string }> = ({ texto = 'Carregando…' }) => (
  <div role="status" className="flex items-center justify-center gap-2 py-10 text-sm text-[#5f7391] dark:text-slate-400">
    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> {texto}
  </div>
);

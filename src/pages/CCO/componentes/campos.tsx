import React from 'react';
import { AlertCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { agoraBrasilia } from '@/services/ccoService';

/** Classes da caixa de texto do CCO (mesma altura e foco em todos os campos). */
export const caixaCampo = (erro?: string | null) =>
  cn(
    'w-full min-h-12 rounded-xl border bg-white px-3.5 text-[15px] text-[#10233f] shadow-[inset_0_1px_2px_rgba(16,35,63,.04)] transition-colors placeholder:text-[#8a9bb3]',
    'focus:outline-none focus-visible:border-[#0b63ce] focus-visible:ring-4 focus-visible:ring-[#0b63ce]/15',
    'disabled:cursor-not-allowed disabled:bg-[#f3f6fa] disabled:text-[#8a9bb3]',
    'dark:border-slate-700 dark:bg-[#0f1524] dark:text-slate-100 dark:placeholder:text-slate-500 dark:disabled:bg-slate-900/60',
    erro ? 'border-rose-400 dark:border-rose-500/70' : 'border-[#cfdbea] hover:border-[#a9c1de]',
  );

export const MensagemErro: React.FC<{ id: string; children?: React.ReactNode }> = ({ id, children }) =>
  children ? (
    <p id={id} className="mt-1.5 flex items-start gap-1.5 text-[13px] font-medium text-rose-600 dark:text-rose-400">
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  ) : null;

interface CampoProps {
  id: string;
  rotulo: string;
  obrigatorio?: boolean;
  erro?: string | null;
  ajuda?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export const Campo: React.FC<CampoProps> = ({ id, rotulo, obrigatorio, erro, ajuda, className, children }) => (
  <div className={cn('min-w-0', className)}>
    <label htmlFor={id} className="mb-1.5 block text-sm font-bold text-[#10233f] dark:text-slate-200">
      {rotulo}
      {obrigatorio && <span className="ml-0.5 text-rose-500" aria-hidden="true">*</span>}
    </label>
    {children}
    <MensagemErro id={`${id}-erro`}>{erro}</MensagemErro>
    {!erro && ajuda && <div className="mt-1.5 text-xs text-[#5f7391] dark:text-slate-400">{ajuda}</div>}
  </div>
);

/** Mantém só dígitos e insere os dois-pontos: "830" → "08:30" ao sair do campo. */
const mascararHora = (texto: string) => {
  const digitos = texto.replace(/\D/g, '').slice(0, 4);
  return digitos.length > 2 ? `${digitos.slice(0, 2)}:${digitos.slice(2)}` : digitos;
};

export const completarHora = (texto: string) => {
  const digitos = texto.replace(/\D/g, '');
  if (!digitos) return '';
  if (digitos.length <= 2) return `${digitos.padStart(2, '0')}:00`;
  if (digitos.length === 3) return `0${digitos[0]}:${digitos.slice(1)}`;
  return `${digitos.slice(0, 2)}:${digitos.slice(2, 4)}`;
};

export const horaValida = (hora: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(hora);

interface CampoHoraProps {
  id: string;
  valor: string;
  onChange: (valor: string) => void;
  erro?: string | null;
  disabled?: boolean;
  rotuloAgora?: string;
}

/** Horário sempre em 24 h (o campo nativo pode aparecer em AM/PM conforme o aparelho). */
export const CampoHora: React.FC<CampoHoraProps> = ({ id, valor, onChange, erro, disabled, rotuloAgora = 'Usar o horário atual' }) => (
  <div className="relative">
    <input
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder="--:--"
      maxLength={5}
      value={valor}
      disabled={disabled}
      onChange={(e) => onChange(mascararHora(e.target.value))}
      onBlur={(e) => onChange(completarHora(e.target.value))}
      aria-invalid={Boolean(erro)}
      aria-describedby={erro ? `${id}-erro` : `${id}-formato`}
      className={cn(caixaCampo(erro), 'pr-12 font-medium tabular-nums tracking-wide')}
    />
    <span id={`${id}-formato`} className="sr-only">Formato 24 horas, horas e minutos.</span>
    <button
      type="button"
      onClick={() => onChange(agoraBrasilia())}
      disabled={disabled}
      title={rotuloAgora}
      aria-label={rotuloAgora}
      className="absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-[#4c6283] transition-colors hover:bg-[#eaf2fd] hover:text-[#0b63ce] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0b63ce] disabled:pointer-events-none disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800"
    >
      <Clock className="h-5 w-5" />
    </button>
  </div>
);

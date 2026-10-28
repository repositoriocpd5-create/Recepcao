import React, { useEffect, useRef, useState } from 'react';
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

const HORAS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTOS = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

const opcaoHora = (marcada: boolean) =>
  cn(
    'block w-full rounded-md px-2 py-1.5 text-center text-sm tabular-nums transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0b63ce]',
    marcada ? 'bg-[#0b63ce] font-bold text-white' : 'text-[#10233f] hover:bg-[#eaf2fd] dark:text-slate-100 dark:hover:bg-slate-800',
  );

/**
 * Horário sempre em 24 h (o campo nativo pode aparecer em AM/PM conforme o aparelho).
 * Ao clicar, abre a lista de horas e minutos; também dá para digitar.
 */
export const CampoHora: React.FC<CampoHoraProps> = ({ id, valor, onChange, erro, disabled, rotuloAgora = 'Usar o horário atual' }) => {
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const colunaHoras = useRef<HTMLDivElement>(null);
  const colunaMinutos = useRef<HTMLDivElement>(null);
  const valido = horaValida(valor);
  const hora = valido ? valor.slice(0, 2) : '';
  const minuto = valido ? valor.slice(3, 5) : '';

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => { if (!raiz.current?.contains(e.target as Node)) setAberto(false); };
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') setAberto(false); };
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', tecla);
    // Mostra a hora escolhida (ou a atual) no meio da coluna.
    const referencia = valido ? valor : agoraBrasilia();
    const centralizar = (coluna: HTMLDivElement | null, texto: string) => {
      const item = coluna?.querySelector<HTMLElement>(`[data-valor="${texto}"]`);
      if (coluna && item) coluna.scrollTop = item.offsetTop - coluna.clientHeight / 2 + item.clientHeight / 2;
    };
    centralizar(colunaHoras.current, referencia.slice(0, 2));
    centralizar(colunaMinutos.current, String(Math.floor(Number(referencia.slice(3, 5)) / 5) * 5).padStart(2, '0'));
    return () => {
      document.removeEventListener('mousedown', fora);
      document.removeEventListener('keydown', tecla);
    };
    // Centraliza só ao abrir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  return (
    <div
      ref={raiz}
      className="relative"
      // Fecha ao sair com Tab; clique fora é tratado no mousedown (no Safari o botão clicado não recebe foco).
      onBlur={(e) => { if (e.relatedTarget && !raiz.current?.contains(e.relatedTarget as Node)) setAberto(false); }}
    >
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="--:--"
        maxLength={5}
        value={valor}
        disabled={disabled}
        onClick={() => setAberto(true)}
        onKeyDown={(e) => { if (e.key === 'ArrowDown') { e.preventDefault(); setAberto(true); } }}
        onChange={(e) => onChange(mascararHora(e.target.value))}
        onBlur={(e) => onChange(completarHora(e.target.value))}
        aria-invalid={Boolean(erro)}
        aria-describedby={erro ? `${id}-erro` : `${id}-formato`}
        aria-expanded={aberto}
        aria-controls={`${id}-horarios`}
        className={cn(caixaCampo(erro), 'cursor-pointer pr-12 font-medium tabular-nums tracking-wide')}
      />
      <span id={`${id}-formato`} className="sr-only">Formato 24 horas, horas e minutos. Seta para baixo abre a lista de horários.</span>
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        disabled={disabled}
        title="Escolher o horário"
        aria-label="Escolher o horário"
        aria-expanded={aberto}
        className="absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-[#4c6283] transition-colors hover:bg-[#eaf2fd] hover:text-[#0b63ce] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0b63ce] disabled:pointer-events-none disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800"
      >
        <Clock className="h-5 w-5" />
      </button>

      {aberto && !disabled && (
        <div
          id={`${id}-horarios`}
          className="absolute left-0 top-full z-30 mt-2 w-[184px] rounded-xl border border-[#d6e2f0] bg-white p-2 shadow-[0_18px_40px_-18px_rgba(16,48,96,.55)] dark:border-slate-700 dark:bg-[#121826]"
        >
          <div className="grid grid-cols-2 gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#6b7f9b] dark:text-slate-500">
            <span className="text-center">Hora</span>
            <span className="text-center">Min</span>
          </div>
          <div className="mt-1 grid grid-cols-2 gap-1.5">
            <div ref={colunaHoras} className="relative h-48 overflow-y-auto pr-0.5" role="listbox" aria-label="Hora">
              {HORAS.map((h) => (
                <button
                  key={h}
                  type="button"
                  role="option"
                  aria-selected={h === hora}
                  data-valor={h}
                  onClick={() => onChange(`${h}:${minuto || '00'}`)}
                  className={opcaoHora(h === hora)}
                >
                  {h}
                </button>
              ))}
            </div>
            <div ref={colunaMinutos} className="relative h-48 overflow-y-auto pr-0.5" role="listbox" aria-label="Minutos">
              {MINUTOS.map((m) => (
                <button
                  key={m}
                  type="button"
                  role="option"
                  aria-selected={m === minuto}
                  data-valor={m}
                  onClick={() => {
                    onChange(`${hora || agoraBrasilia().slice(0, 2)}:${m}`);
                    setAberto(false);
                  }}
                  className={opcaoHora(m === minuto)}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onChange(agoraBrasilia());
              setAberto(false);
            }}
            aria-label={rotuloAgora}
            className="mt-2 w-full rounded-lg border border-[#b9cfe9] py-1.5 text-sm font-bold text-[#0b4fa3] hover:bg-[#f0f6fe] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0b63ce] dark:border-slate-700 dark:text-sky-200 dark:hover:bg-slate-800"
          >
            Agora
          </button>
        </div>
      )}
    </div>
  );
};

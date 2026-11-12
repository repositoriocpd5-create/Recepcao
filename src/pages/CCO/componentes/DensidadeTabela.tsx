import React, { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, Rows2, Rows3, Rows4 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type Densidade = 'padrao' | 'regular' | 'compacto';

const CHAVE = 'cco-densidade-tabela';
const VALIDAS: Densidade[] = ['padrao', 'regular', 'compacto'];

/** Densidade escolhida, lembrada neste navegador (sem localStorage a tela funciona igual, no padrão). */
export const useDensidade = (): [Densidade, (d: Densidade) => void] => {
  const [densidade, setDensidade] = useState<Densidade>(() => {
    try {
      const salvo = localStorage.getItem(CHAVE) as Densidade | null;
      return salvo && VALIDAS.includes(salvo) ? salvo : 'padrao';
    } catch {
      return 'padrao';
    }
  });
  const mudar = (d: Densidade) => {
    setDensidade(d);
    try { localStorage.setItem(CHAVE, d); } catch { /* navegação privada: segue sem lembrar */ }
  };
  return [densidade, mudar];
};

const OPCOES: { valor: Densidade; titulo: string; descricao: string; icone: typeof Rows2; linhas: number }[] = [
  { valor: 'padrao', titulo: 'Padrão', descricao: 'Leitura espaçosa, com todos os detalhes de cada ocorrência.', icone: Rows2, linhas: 2 },
  { valor: 'regular', titulo: 'Regular', descricao: 'Um equilíbrio entre espaço e informação.', icone: Rows3, linhas: 3 },
  { valor: 'compacto', titulo: 'Compacto', descricao: 'Mais ocorrências na tela, uma linha para cada.', icone: Rows4, linhas: 5 },
];

/** Miniatura que mostra a "cara" de cada densidade. */
const Miniatura: React.FC<{ linhas: number; ativo: boolean }> = ({ linhas, ativo }) => (
  <span
    aria-hidden="true"
    className={cn(
      'flex h-[52px] w-[88px] shrink-0 flex-col justify-around rounded-lg border px-2 py-1.5',
      ativo ? 'border-[#0b63ce]/40 bg-white dark:border-sky-400/40 dark:bg-slate-900' : 'border-[#dbe5f1] bg-[#f4f8fd] dark:border-slate-700 dark:bg-slate-800/60',
    )}
  >
    {Array.from({ length: linhas }).map((_, i) => (
      <span key={i} className="flex items-center gap-1">
        <span className={cn('h-1.5 w-1.5 rounded-full', ativo ? 'bg-[#0b63ce] dark:bg-sky-400' : 'bg-[#9fb2cb] dark:bg-slate-500')} />
        <span className="flex-1 space-y-[2px]">
          <span className={cn('block h-[3px] rounded-full', ativo ? 'bg-[#0b63ce]/70 dark:bg-sky-400/70' : 'bg-[#b8c7dc] dark:bg-slate-600')} />
          {linhas <= 3 && <span className={cn('block h-[3px] w-2/3 rounded-full', ativo ? 'bg-[#0b63ce]/40 dark:bg-sky-400/40' : 'bg-[#d3deec] dark:bg-slate-700')} />}
        </span>
      </span>
    ))}
  </span>
);

export const DensidadeControle: React.FC<{ valor: Densidade; onChange: (d: Densidade) => void }> = ({ valor, onChange }) => {
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const idPainel = useId();
  const atual = OPCOES.find((o) => o.valor === valor) ?? OPCOES[0];
  const IconeAtual = atual.icone;

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => { if (!raiz.current?.contains(e.target as Node)) setAberto(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAberto(false); };
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', fora); document.removeEventListener('keydown', esc); };
  }, [aberto]);

  return (
    <div ref={raiz} className="relative">
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#6b7f9b] dark:text-slate-500">Densidade</span>
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-expanded={aberto}
        aria-controls={idPainel}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#cfdbea] bg-white px-3 text-[13px] font-semibold text-[#10233f] hover:border-[#a9c1de] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0b63ce]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      >
        <IconeAtual className="h-4 w-4 text-[#0b63ce] dark:text-sky-300" aria-hidden="true" />
        {atual.titulo}
        <ChevronDown className={cn('h-4 w-4 text-[#6b7f9b] transition-transform', aberto && 'rotate-180')} aria-hidden="true" />
      </button>

      {aberto && (
        <div
          id={idPainel}
          className="absolute right-0 top-full z-30 mt-2 w-[min(360px,calc(100vw-2rem))] rounded-2xl border border-[#d6e2f0] bg-white p-3 shadow-[0_20px_40px_-16px_rgba(16,35,63,.35)] dark:border-slate-700 dark:bg-slate-900"
        >
          <p className="px-1 text-sm font-extrabold text-[#10233f] dark:text-slate-100">Densidade da tabela</p>
          <p className="mb-2 px-1 text-xs text-[#5f7391] dark:text-slate-400">Mais espaço para ler ou mais ocorrências à vista.</p>
          <div role="radiogroup" aria-label="Densidade da tabela" className="space-y-2">
            {OPCOES.map((o) => {
              const ativo = o.valor === valor;
              return (
                <label
                  key={o.valor}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-xl border p-2.5 transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-[#0b63ce]',
                    ativo ? 'border-[#0b63ce] bg-[#eaf3ff] dark:border-sky-400 dark:bg-sky-500/10' : 'border-[#dbe5f1] hover:border-[#a9c1de] dark:border-slate-700',
                  )}
                >
                  <input
                    type="radio"
                    name="cco-densidade"
                    checked={ativo}
                    onChange={() => { onChange(o.valor); setAberto(false); }}
                    className="sr-only"
                  />
                  <span className={cn('grid h-5 w-5 shrink-0 place-items-center rounded-full border-2', ativo ? 'border-[#0b63ce] bg-[#0b63ce] text-white dark:border-sky-400 dark:bg-sky-400 dark:text-slate-900' : 'border-[#9fb2cb] dark:border-slate-500')} aria-hidden="true">
                    {ativo && <Check className="h-3 w-3" strokeWidth={3} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-extrabold text-[#10233f] dark:text-slate-100">{o.titulo}</span>
                    <span className="block text-xs leading-snug text-[#5f7391] dark:text-slate-400">{o.descricao}</span>
                  </span>
                  <Miniatura linhas={o.linhas} ativo={ativo} />
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

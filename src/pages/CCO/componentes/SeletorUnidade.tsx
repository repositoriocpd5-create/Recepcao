import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Unidade {
  id: string;
  nome: string;
}

const normalizar = (texto: string) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');

/** Lista de unidades que também é campo de busca (sem acento, em qualquer parte do nome). */
export const SeletorUnidade: React.FC<{ unidades: Unidade[]; valor: string; onChange: (id: string) => void; autoFocus?: boolean }> = ({ unidades, valor, onChange, autoFocus }) => {
  const idLista = useId();
  const raiz = useRef<HTMLDivElement>(null);
  const entrada = useRef<HTMLInputElement>(null);
  const [aberta, setAberta] = useState(false);
  const [busca, setBusca] = useState('');
  const [ativo, setAtivo] = useState(0);
  const escolhida = unidades.find((u) => u.id === valor);

  const filtradas = useMemo(() => {
    const termos = normalizar(busca).split(/\s+/).filter(Boolean);
    return termos.length ? unidades.filter((u) => termos.every((t) => normalizar(u.nome).includes(t))) : unidades;
  }, [unidades, busca]);

  useEffect(() => { setAtivo(0); }, [busca, aberta]);

  useEffect(() => {
    if (!aberta) return;
    const fora = (e: MouseEvent) => { if (!raiz.current?.contains(e.target as Node)) { setAberta(false); setBusca(''); } };
    document.addEventListener('mousedown', fora);
    return () => document.removeEventListener('mousedown', fora);
  }, [aberta]);

  useEffect(() => {
    if (aberta) document.getElementById(`${idLista}-${ativo}`)?.scrollIntoView({ block: 'nearest' });
  }, [ativo, aberta, idLista]);

  const escolher = (u: Unidade) => {
    onChange(u.id);
    setAberta(false);
    setBusca('');
  };

  const aoTeclar = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setAberta(true); setAtivo((a) => Math.min(a + 1, filtradas.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setAtivo((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter' && aberta) { e.preventDefault(); if (filtradas[ativo]) escolher(filtradas[ativo]); }
    else if (e.key === 'Escape' && aberta) { e.stopPropagation(); setAberta(false); setBusca(''); }
  };

  return (
    <div ref={raiz} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5f7391] dark:text-slate-400" aria-hidden="true" />
        <input
          ref={entrada}
          role="combobox"
          aria-expanded={aberta}
          aria-controls={idLista}
          aria-autocomplete="list"
          autoFocus={autoFocus}
          value={aberta ? busca : escolhida?.nome ?? ''}
          placeholder={aberta && escolhida ? escolhida.nome : 'Digite para buscar a unidade…'}
          onFocus={() => setAberta(true)}
          onClick={() => setAberta(true)}
          onChange={(e) => { setBusca(e.target.value); setAberta(true); }}
          onKeyDown={aoTeclar}
          className="min-h-12 w-full rounded-xl border border-[#cfdbea] bg-white pl-10 pr-20 text-[15px] font-semibold text-[#10233f] placeholder:font-medium placeholder:text-[#7c8da6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0b63ce]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
          {valor && (
            <button type="button" aria-label="Limpar a unidade" onClick={() => { onChange(''); setBusca(''); entrada.current?.focus(); }} className="grid h-8 w-8 place-items-center rounded-lg text-[#5f7391] hover:bg-[#eef4fc] dark:text-slate-400 dark:hover:bg-slate-800">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          <button type="button" tabIndex={-1} aria-label="Abrir a lista de unidades" onClick={() => { setAberta((a) => !a); entrada.current?.focus(); }} className="grid h-8 w-8 place-items-center rounded-lg text-[#10233f] dark:text-slate-300">
            <ChevronDown className={cn('h-5 w-5 transition-transform', aberta && 'rotate-180')} aria-hidden="true" />
          </button>
        </div>
      </div>
      {aberta && (
        <ul id={idLista} role="listbox" className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-[#cfdbea] bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          {filtradas.length === 0 ? (
            <li className="px-4 py-3 text-sm text-[#5f7391] dark:text-slate-400">Nenhuma unidade encontrada para “{busca}”.</li>
          ) : filtradas.map((u, i) => (
            <li
              key={u.id}
              id={`${idLista}-${i}`}
              role="option"
              aria-selected={u.id === valor}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => escolher(u)}
              onMouseEnter={() => setAtivo(i)}
              className={cn('flex cursor-pointer items-center justify-between gap-2 px-4 py-2.5 text-[14px] text-[#10233f] dark:text-slate-100', i === ativo && 'bg-[#eaf2fd] dark:bg-slate-800', u.id === valor && 'font-bold')}
            >
              <span>{u.nome}</span>
              {u.id === valor && <Check className="h-4 w-4 shrink-0 text-[#0b63ce]" aria-hidden="true" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

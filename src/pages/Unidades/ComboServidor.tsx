import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { BadgeCheck, ChevronDown, Link2, Search, UserRound, X } from 'lucide-react';
import { Servidor } from '@/types';
import { cn } from '@/lib/utils';

export const normalizarTexto = (texto?: string | null) =>
  (texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

export const ehDirigenteEscolar = (s: Servidor) => normalizarTexto(s.cargo).includes('dirigente');

const PALAVRAS_COMUNS = new Set(['e', 'm', 'em', 'eem', 'escola', 'municipal', 'estadualizada', 'estadual', 'creche', 'ciep', 'c', 'cmei', 'emei', 'ei', 'de', 'da', 'do', 'das', 'dos', 'pref', 'prefeito', 'prof', 'profa', 'professor', 'professora', 'ver', 'vereador', 'dr', 'dra', 'smedu', 'n', 'no']);

/** Nome da unidade sem pontuação, acentos e prefixos comuns (E. M., ESCOLA MUNICIPAL, CRECHE…), para comparar com a lotação do quadro. */
export const chaveUnidade = (texto?: string | null) =>
  normalizarTexto(texto).replace(/[^a-z0-9 ]+/g, ' ').split(' ').filter((p) => p && !PALAVRAS_COMUNS.has(p)).join(' ');

/** O servidor está lotado nesta unidade (compara a lotação do quadro com a lotação ou o nome da unidade, de forma tolerante). */
export const lotadoNaUnidade = (s: Servidor, ...nomes: (string | null | undefined)[]) => {
  const lot = chaveUnidade(s.lotacao);
  if (!lot) return false;
  return nomes.some((n) => {
    const k = chaveUnidade(n);
    if (!k) return false;
    if (k === lot) return true;
    const [curto, longo] = k.length <= lot.length ? [k, lot] : [lot, k];
    return curto.length >= 8 && longo.includes(curto);
  });
};

export interface OpcaoServidor {
  servidor: Servidor;
  /** 3 = dirigente escolar desta unidade · 2 = lotado na unidade · 1 = dirigente de outra · 0 = demais */
  prioridade: number;
}

interface Props {
  label: string;
  nome: string;
  servidorId: string | null;
  opcoes: OpcaoServidor[];
  onChange: (nome: string, servidorId: string | null) => void;
  placeholder?: string;
  inputRef?: React.Ref<HTMLInputElement>;
  carregando?: boolean;
}

const MAX_RESULTADOS = 40;

/** Campo que é ao mesmo tempo lista e busca de servidores do Quadro da SMEDU; aceita também um nome digitado. */
export const ComboServidor: React.FC<Props> = ({ label, nome, servidorId, opcoes, onChange, placeholder = 'Buscar servidor pelo nome ou matrícula', inputRef, carregando }) => {
  const id = useId();
  const [aberto, setAberto] = useState(false);
  const [consulta, setConsulta] = useState('');
  const [ativo, setAtivo] = useState(0);
  const caixa = useRef<HTMLDivElement>(null);

  const termos = useMemo(() => normalizarTexto(consulta).split(' ').filter(Boolean), [consulta]);
  const resultados = useMemo(() => {
    const base = termos.length
      ? opcoes.filter(({ servidor: s }) => {
          const alvo = normalizarTexto(`${s.nome} ${s.matricula} ${s.cargo} ${s.lotacao ?? ''}`);
          return termos.every((t) => alvo.includes(t));
        })
      : opcoes.filter((o) => o.prioridade >= 2);
    return [...base]
      .sort((a, b) => b.prioridade - a.prioridade || a.servidor.nome.localeCompare(b.servidor.nome, 'pt-BR'))
      .slice(0, MAX_RESULTADOS);
  }, [opcoes, termos]);

  useEffect(() => setAtivo(0), [consulta, aberto]);
  // Ao abrir, rola a gaveta para a lista aparecer inteira.
  useEffect(() => {
    if (aberto) window.setTimeout(() => caixa.current?.querySelector('ul')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 30);
  }, [aberto]);
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => { if (!caixa.current?.contains(e.target as Node)) fechar(); };
    document.addEventListener('mousedown', fora);
    return () => document.removeEventListener('mousedown', fora);
  });

  const fechar = () => { setAberto(false); setConsulta(''); };
  const escolher = (o: OpcaoServidor) => { onChange(o.servidor.nome, o.servidor.id); fechar(); };
  const vinculado = servidorId ? opcoes.find((o) => o.servidor.id === servidorId)?.servidor : undefined;

  const aoTeclar = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setAberto(true); setAtivo((i) => Math.min(resultados.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setAtivo((i) => Math.max(0, i - 1)); }
    else if (e.key === 'Enter' && aberto) { e.preventDefault(); if (resultados[ativo]) escolher(resultados[ativo]); else if (consulta.trim()) { onChange(consulta.trim(), null); fechar(); } }
    else if (e.key === 'Escape' && aberto) { e.stopPropagation(); fechar(); }
  };

  return (
    <div ref={caixa} className="relative w-full space-y-1.5">
      <label htmlFor={id} className="block text-xs font-medium text-slate-300">{label}</label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          id={id}
          ref={inputRef}
          role="combobox"
          aria-expanded={aberto}
          aria-controls={`${id}-lista`}
          aria-autocomplete="list"
          aria-activedescendant={aberto && resultados[ativo] ? `${id}-o${ativo}` : undefined}
          autoComplete="off"
          value={aberto ? consulta : nome}
          placeholder={nome ? undefined : placeholder}
          onFocus={() => setAberto(true)}
          onChange={(e) => { setAberto(true); setConsulta(e.target.value); }}
          onKeyDown={aoTeclar}
          className="min-h-11 w-full rounded-lg border border-slate-700/80 bg-[#121826] py-2 pl-9 pr-16 text-sm text-slate-100 placeholder-slate-500 transition-colors focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        />
        <div className="absolute inset-y-0 right-1 flex items-center">
          {nome && !aberto && (
            <button type="button" onClick={() => onChange('', null)} aria-label={`Limpar ${label}`} className="grid h-9 w-9 place-items-center rounded-md text-slate-400 hover:bg-slate-800/60 hover:text-rose-400"><X className="h-4 w-4" /></button>
          )}
          <button type="button" tabIndex={-1} onClick={() => setAberto((v) => !v)} aria-label="Abrir lista de servidores" className="grid h-9 w-8 place-items-center text-slate-400"><ChevronDown className={cn('h-4 w-4 transition-transform', aberto && 'rotate-180')} /></button>
        </div>
      </div>

      {nome && !aberto && (
        <p className={cn('flex items-center gap-1.5 text-[11px] font-semibold', servidorId ? 'text-emerald-600 dark:text-emerald-300' : 'text-[#6b7f9b] dark:text-slate-400')}>
          {servidorId
            ? <><Link2 className="h-3.5 w-3.5" aria-hidden="true" /> Vinculado ao Quadro de Servidores{vinculado ? ` · matrícula ${vinculado.matricula}` : ''}</>
            : <>Nome digitado manualmente (sem vínculo com o quadro)</>}
        </p>
      )}

      {aberto && (
        <ul id={`${id}-lista`} role="listbox" aria-label={`Servidores para ${label}`}
          className="absolute left-0 right-0 z-30 mt-1 max-h-72 overflow-y-auto rounded-xl border border-[#cfe0f5] bg-white p-1 shadow-[0_24px_48px_-20px_rgba(16,48,96,.55)] dark:border-slate-700 dark:bg-[#121826]">
          {!carregando && opcoes.length === 0 && <li className="px-3 py-3 text-xs font-semibold text-amber-700 dark:text-amber-300">Nenhum servidor do Quadro de Servidores foi carregado. Confira a tela Servidores ou atualize a página.</li>}
          {carregando && <li className="px-3 py-3 text-xs text-[#5f7391] dark:text-slate-400">Carregando o Quadro de Servidores…</li>}
          {!carregando && resultados.length === 0 && (
            <li className="px-3 py-3 text-xs text-[#5f7391] dark:text-slate-400">
              {termos.length ? 'Nenhum servidor encontrado.' : 'Digite o nome ou a matrícula para buscar no Quadro de Servidores.'}
              {consulta.trim() && <button type="button" onClick={() => { onChange(consulta.trim(), null); fechar(); }} className="mt-2 block min-h-9 font-bold text-[#0b63ce] hover:underline dark:text-sky-300">Usar “{consulta.trim()}” como nome digitado</button>}
            </li>
          )}
          {resultados.map((o, i) => {
            const s = o.servidor;
            return (
              <li key={s.id} id={`${id}-o${i}`} role="option" aria-selected={s.id === servidorId} onMouseEnter={() => setAtivo(i)} onMouseDown={(e) => e.preventDefault()} onClick={() => escolher(o)}
                className={cn('flex cursor-pointer items-start gap-2.5 rounded-lg px-2.5 py-2', i === ativo ? 'bg-[#eaf2fd] dark:bg-sky-500/15' : '')}>
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#e6f1fb] text-[#005a9c] dark:bg-sky-500/15 dark:text-sky-300" aria-hidden="true"><UserRound className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate text-[13px] font-bold text-[#0d2240] dark:text-slate-100">{s.nome}</span>
                    {o.prioridade === 3 && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-extrabold uppercase text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"><BadgeCheck className="h-3 w-3" aria-hidden="true" />Dirigente desta escola</span>}
                    {o.prioridade === 2 && <span className="rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-extrabold uppercase text-sky-700 dark:bg-sky-500/20 dark:text-sky-300">Lotado aqui</span>}
                  </span>
                  <span className="block truncate text-[11px] text-[#5f7391] dark:text-slate-400">{s.cargo}{s.lotacao ? ` · ${s.lotacao}` : ''}{s.matricula ? ` · mat. ${s.matricula}` : ''}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

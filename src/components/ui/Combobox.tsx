import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ComboboxOption {
  value: string;
  label: string;
  /** Texto secundário (ex.: cargo). Também entra na busca. */
  detail?: string;
  /** Destaca a opção em vermelho (ex.: responsável que exige autorização prévia). */
  destaque?: 'perigo';
}

export interface ComboboxProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  required?: boolean;
  requiredMessage?: string;
  className?: string;
  id?: string;
}

const normalizar = (texto: string) =>
  texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Destaca no texto os trechos que casam com os termos buscados. */
function Destacar({ texto, termos }: { texto: string; termos: string[] }) {
  if (!termos.length) return <>{texto}</>;
  const base = normalizar(texto);
  const marcado = new Array<boolean>(texto.length).fill(false);
  for (const termo of termos) {
    let pos = base.indexOf(termo);
    while (pos !== -1) {
      for (let i = pos; i < pos + termo.length; i += 1) marcado[i] = true;
      pos = base.indexOf(termo, pos + termo.length);
    }
  }
  const partes: React.ReactNode[] = [];
  let inicio = 0;
  for (let i = 1; i <= texto.length; i += 1) {
    if (i === texto.length || marcado[i] !== marcado[inicio]) {
      const trecho = texto.slice(inicio, i);
      partes.push(marcado[inicio]
        ? <mark key={inicio} className="rounded-sm bg-sky-200/80 px-0 text-inherit dark:bg-sky-500/30">{trecho}</mark>
        : <React.Fragment key={inicio}>{trecho}</React.Fragment>);
      inicio = i;
    }
  }
  return <>{partes}</>;
}

/**
 * Campo de seleção com busca: abre a lista ao focar, filtra enquanto se digita (sem diferenciar
 * acentos/maiúsculas), navega por teclado (↑ ↓ Enter Esc) e permite limpar a escolha.
 */
export function Combobox({
  label,
  value,
  onChange,
  options,
  placeholder = 'Selecione',
  searchPlaceholder = 'Digite para buscar',
  emptyMessage = 'Nenhum resultado encontrado',
  disabled = false,
  required = false,
  requiredMessage = 'Selecione uma opção.',
  className,
  id,
}: ComboboxProps) {
  const reactId = useId();
  const inputId = id || `combobox-${reactId}`;
  const listId = `${inputId}-lista`;
  const raiz = useRef<HTMLDivElement>(null);
  const entrada = useRef<HTMLInputElement>(null);
  const lista = useRef<HTMLUListElement>(null);
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState('');
  const [ativo, setAtivo] = useState(0);

  const selecionada = options.find((o) => o.value === value && o.value !== '');
  const termos = useMemo(() => normalizar(busca).split(/\s+/).filter(Boolean), [busca]);

  const filtradas = useMemo(() => {
    const candidatas = options.filter((o) => o.value !== '');
    if (!termos.length) return candidatas;
    return candidatas.filter((o) => {
      const alvo = normalizar(`${o.label} ${o.detail ?? ''}`);
      return termos.every((t) => alvo.includes(t));
    });
  }, [options, termos]);

  useEffect(() => {
    entrada.current?.setCustomValidity(required && !selecionada ? requiredMessage : '');
  }, [required, selecionada, requiredMessage]);

  useEffect(() => {
    if (!aberto) return;
    const fora = (event: MouseEvent) => {
      if (!raiz.current?.contains(event.target as Node)) fechar();
    };
    document.addEventListener('mousedown', fora);
    return () => document.removeEventListener('mousedown', fora);
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    lista.current?.querySelector<HTMLElement>('[data-ativo="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [ativo, aberto, filtradas]);

  function fechar() {
    setAberto(false);
    setBusca('');
  }

  function abrir() {
    if (disabled) return;
    const indice = filtradas.findIndex((o) => o.value === value);
    setAtivo(indice >= 0 ? indice : 0);
    setAberto(true);
    // No celular o teclado cobriria a lista: leva o campo ao topo da área rolável assim que o teclado abre.
    if (window.matchMedia('(pointer: coarse)').matches) {
      window.setTimeout(() => raiz.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 300);
    }
  }

  function escolher(opcao: ComboboxOption) {
    onChange(opcao.value);
    fechar();
  }

  function aoTeclar(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!aberto) { abrir(); return; }
      if (!filtradas.length) return;
      const passo = event.key === 'ArrowDown' ? 1 : -1;
      setAtivo((atual) => (atual + passo + filtradas.length) % filtradas.length);
    } else if (event.key === 'Home' && aberto) {
      event.preventDefault();
      setAtivo(0);
    } else if (event.key === 'End' && aberto) {
      event.preventDefault();
      setAtivo(Math.max(filtradas.length - 1, 0));
    } else if (event.key === 'Enter') {
      if (aberto) {
        event.preventDefault();
        if (filtradas[ativo]) escolher(filtradas[ativo]);
      }
    } else if (event.key === 'Escape') {
      if (aberto) {
        event.preventDefault();
        event.stopPropagation();
        fechar();
      }
    } else if (event.key === 'Tab') {
      // Tab com uma busca digitada e resultado destacado confirma a escolha antes de seguir.
      if (aberto && busca && filtradas[ativo]) onChange(filtradas[ativo].value);
      fechar();
    }
  }

  return (
    <div className="w-full scroll-mt-2 space-y-1.5" ref={raiz}>
      {label && (
        <label htmlFor={inputId} className="block text-xs font-medium text-slate-300">
          {label}
        </label>
      )}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          ref={entrada}
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={aberto}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={aberto && filtradas[ativo] ? `${inputId}-op-${ativo}` : undefined}
          autoComplete="off"
          disabled={disabled}
          value={aberto ? busca : (selecionada?.label ?? '')}
          placeholder={aberto ? searchPlaceholder : placeholder}
          onFocus={abrir}
          onClick={() => { if (!aberto) abrir(); }}
          onChange={(event) => {
            setBusca(event.target.value);
            setAtivo(0);
            if (!aberto) setAberto(true);
          }}
          onKeyDown={aoTeclar}
          className={cn(
            'w-full min-h-11 rounded-lg border border-slate-700/80 bg-[#121826] py-2 pl-9 pr-16 text-sm text-slate-100 placeholder-slate-500 transition-colors',
            'focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50',
            'disabled:bg-slate-900 disabled:opacity-50',
            !aberto && selecionada && 'font-semibold',
            className,
          )}
        />
        <div className="absolute inset-y-0 right-1.5 flex items-center gap-0.5">
          {selecionada && !disabled && (
            <button
              type="button"
              tabIndex={-1}
              aria-label="Limpar seleção"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => { onChange(''); setBusca(''); entrada.current?.focus(); }}
              className="grid h-7 w-7 place-items-center rounded-md text-slate-400 transition-colors hover:bg-slate-500/15 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            tabIndex={-1}
            aria-label={aberto ? 'Fechar lista' : 'Abrir lista'}
            disabled={disabled}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => { if (aberto) fechar(); else { abrir(); entrada.current?.focus(); } }}
            className="grid h-7 w-7 place-items-center rounded-md text-slate-400 transition-colors hover:bg-slate-500/15 disabled:pointer-events-none"
          >
            <ChevronDown className={cn('h-4 w-4 transition-transform', aberto && 'rotate-180')} />
          </button>
        </div>

        {aberto && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-[#c9dcf0] bg-white shadow-xl shadow-slate-900/15 dark:border-slate-700 dark:bg-slate-900">
            <ul id={listId} ref={lista} role="listbox" aria-label={label} className="max-h-[clamp(7rem,calc(100dvh-var(--keyboard-inset,0px)-19rem),15rem)] overflow-y-auto p-1.5 sm:max-h-60">
              {filtradas.map((opcao, indice) => {
                const marcada = opcao.value === value;
                const sobre = indice === ativo;
                return (
                  <li
                    key={opcao.value}
                    id={`${inputId}-op-${indice}`}
                    role="option"
                    aria-selected={marcada}
                    data-ativo={sobre}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => escolher(opcao)}
                    onMouseMove={() => { if (!sobre) setAtivo(indice); }}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm',
                      sobre ? 'bg-[#e8f2fd] dark:bg-slate-800' : 'bg-transparent',
                      opcao.destaque === 'perigo' ? 'text-rose-600 dark:text-rose-400' : 'text-[#102755] dark:text-slate-100',
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className={cn('block truncate', marcada && 'font-bold')}><Destacar texto={opcao.label} termos={termos} /></span>
                      {opcao.detail && (
                        <span className="block truncate text-xs text-[#627289] dark:text-slate-400"><Destacar texto={opcao.detail} termos={termos} /></span>
                      )}
                    </span>
                    {marcada && <Check className="h-4 w-4 shrink-0 text-[#0877d1] dark:text-sky-300" />}
                  </li>
                );
              })}
              {!filtradas.length && (
                <li role="presentation" className="px-3 py-4 text-center text-sm text-[#627289] dark:text-slate-400">{emptyMessage}</li>
              )}
            </ul>
            <div className="flex items-center justify-between border-t border-[#e1ebf6] bg-[#f6faff] px-3 py-1.5 text-[11px] text-[#627289] dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400">
              <span>{filtradas.length} {filtradas.length === 1 ? 'resultado' : 'resultados'}</span>
              <span className="hidden sm:inline">↑↓ navegar · Enter selecionar · Esc fechar</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

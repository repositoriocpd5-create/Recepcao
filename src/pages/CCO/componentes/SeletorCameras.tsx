import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Plus, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CAMERAS_SUGERIDAS, LOCAIS_SUGERIDOS } from '@/services/ccoService';

interface Props {
  id: string;
  valor: string[];
  onChange: (cameras: string[]) => void;
  erro?: string | null;
  disabled?: boolean;
  /** Itens oferecidos na lista (padrão: câmeras). */
  sugestoes?: string[];
  /** Textos de acessibilidade e do campo "outro". */
  rotuloSelecionados?: string;
  rotuloLista?: string;
  placeholderOutro?: string;
  rotuloOutro?: string;
  placeholderBusca?: string;
  /** Chamado quando o texto digitado em "Incluir" é um item que ainda não existe na lista (para guardá-lo no sistema). */
  onNovoItem?: (nome: string) => void;
  /** Id do campo que recebe o foco depois de "Incluir" (a lista também fecha). */
  focarAposIncluir?: string;
}

const NOME_MAX = 60;

/** Escolha de uma ou mais câmeras: sugestões da lista ou nome digitado pela unidade. */
export const SeletorCameras: React.FC<Props> = ({
  id,
  valor,
  onChange,
  erro,
  disabled,
  sugestoes = CAMERAS_SUGERIDAS,
  rotuloSelecionados = 'Câmeras selecionadas',
  rotuloLista = 'Câmeras da unidade',
  placeholderOutro = 'Outra câmera (ex.: Biblioteca)',
  rotuloOutro = 'Nome de outra câmera',
  placeholderBusca,
  onNovoItem,
  focarAposIncluir,
}) => {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState('');
  const [outra, setOutra] = useState('');
  const raiz = useRef<HTMLDivElement>(null);
  const campoOutra = useRef<HTMLInputElement>(null);
  const campoBusca = useRef<HTMLInputElement>(null);
  const botaoAbrir = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (aberto) (placeholderBusca ? campoBusca : campoOutra).current?.focus();
    else setBusca('');
  }, [aberto, placeholderBusca]);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => { if (!raiz.current?.contains(e.target as Node)) setAberto(false); };
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setAberto(false);
        botaoAbrir.current?.focus();
      }
    };
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', fora);
      document.removeEventListener('keydown', esc);
    };
  }, [aberto]);

  const normalizar = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR').trim();

  const alternar = (camera: string) =>
    onChange(valor.includes(camera) ? valor.filter((c) => c !== camera) : [...valor, camera]);

  const adicionarOutra = () => {
    const nome = outra.trim().replace(/\s+/g, ' ').slice(0, NOME_MAX);
    if (!nome) return;
    const existente = [...sugestoes, ...valor].some((c) => normalizar(c) === normalizar(nome));
    if (!valor.some((c) => normalizar(c) === normalizar(nome))) onChange([...valor, nome]);
    if (!existente) onNovoItem?.(nome);
    setOutra('');
    if (focarAposIncluir) {
      setAberto(false);
      // Espera a lista fechar para levar o foco ao próximo campo do formulário.
      window.setTimeout(() => {
        const proximo = document.getElementById(focarAposIncluir);
        proximo?.focus();
        proximo?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }, 0);
    }
  };

  const extras = valor.filter((c) => !sugestoes.includes(c));
  const opcoes = [...sugestoes, ...extras];
  const filtradas = opcoes.filter((opcao) => normalizar(opcao).includes(normalizar(busca)));

  return (
    <div ref={raiz} className="relative">
      <div
        className={cn(
          'flex min-h-[52px] w-full items-center gap-2 rounded-xl border bg-white py-1.5 pl-2 pr-12 transition-colors dark:bg-[#0f1524]',
          erro ? 'border-rose-400 dark:border-rose-500/70' : 'border-[#cfdbea] hover:border-[#a9c1de] dark:border-slate-700',
          disabled && 'cursor-not-allowed bg-[#f3f6fa] dark:bg-slate-900/60',
        )}
      >
        <ul className="flex min-w-0 flex-1 flex-wrap items-center gap-2" aria-label={rotuloSelecionados}>
          {valor.map((camera) => (
            <li key={camera} className="inline-flex max-w-full items-center gap-2 rounded-full bg-[#e6f0fc] py-1.5 pl-4 pr-2 text-[15px] text-[#1f3557] dark:bg-sky-500/15 dark:text-sky-100">
              <span className="truncate">{camera}</span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => alternar(camera)}
                aria-label={`Remover ${camera}`}
                className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[#0b4fa3] hover:bg-[#cfe0f7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0b63ce] dark:text-sky-200 dark:hover:bg-sky-500/25"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          ))}
          <li>
            <button
              id={id}
              ref={botaoAbrir}
              type="button"
              disabled={disabled}
              onClick={() => setAberto((atual) => !atual)}
              aria-expanded={aberto}
              aria-controls={`${id}-lista`}
              aria-invalid={Boolean(erro)}
              aria-describedby={erro ? `${id}-erro` : undefined}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-[15px] font-semibold text-[#0b63ce] hover:bg-[#eaf2fd] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0b63ce] disabled:opacity-50 dark:text-sky-300 dark:hover:bg-slate-800"
            >
              {placeholderBusca ? <Search className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
              {placeholderBusca ? (valor.length ? 'Adicionar local' : 'Buscar ou selecionar local') : 'Adicionar'}
            </button>
          </li>
        </ul>
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => setAberto((a) => !a)}
          aria-hidden="true"
          className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-[#10233f] hover:bg-[#eaf2fd] disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <ChevronDown className={cn('h-5 w-5 transition-transform', aberto && 'rotate-180')} />
        </button>
      </div>

      {aberto && (
        <div
          id={`${id}-lista`}
          className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-[#d6e2f0] bg-white shadow-[0_18px_40px_-18px_rgba(16,48,96,.55)] dark:border-slate-700 dark:bg-[#121826]"
        >
          {placeholderBusca && (
            <div className="border-b border-[#e6edf6] p-3 dark:border-slate-800">
              <div className="flex min-h-11 items-center gap-2 rounded-lg border border-[#cfdbea] bg-[#f6f9fe] px-3 focus-within:border-[#0b63ce] focus-within:ring-2 focus-within:ring-[#0b63ce]/20 dark:border-slate-700 dark:bg-[#0f1524]">
                <Search className="h-4 w-4 shrink-0 text-[#0b63ce] dark:text-sky-300" aria-hidden="true" />
                <input
                  ref={campoBusca}
                  type="text"
                  value={busca}
                  disabled={disabled}
                  onChange={(e) => setBusca(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                  placeholder={placeholderBusca}
                  aria-label="Buscar local da ocorrência"
                  aria-controls={`${id}-opcoes`}
                  autoComplete="off"
                  className="min-w-0 flex-1 bg-transparent py-2 text-base text-[#10233f] outline-none placeholder:text-[#6b7f9b] dark:text-slate-100"
                />
                {busca && (
                  <button type="button" onClick={() => { setBusca(''); campoBusca.current?.focus(); }} aria-label="Limpar busca de local" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[#5f7391] hover:bg-[#e6f0fc] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0b63ce] dark:text-slate-300 dark:hover:bg-slate-800">
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>
              <p role="status" className="mt-2 text-xs text-[#5f7391] dark:text-slate-400">
                {busca.trim() ? `${filtradas.length} ${filtradas.length === 1 ? 'local encontrado' : 'locais encontrados'}` : 'Busque pelo nome e selecione um ou mais locais.'}
              </p>
            </div>
          )}
          <ul id={`${id}-opcoes`} className="max-h-52 overflow-y-auto py-1.5" aria-label={rotuloLista}>
            {filtradas.map((camera) => {
              const marcada = valor.includes(camera);
              return (
                <li key={camera}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={marcada}
                    disabled={disabled}
                    onClick={() => alternar(camera)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[15px] text-[#10233f] hover:bg-[#f2f7fe] focus-visible:bg-[#f2f7fe] focus-visible:outline-none dark:text-slate-100 dark:hover:bg-slate-800 dark:focus-visible:bg-slate-800"
                  >
                    <span className={cn('grid h-5 w-5 shrink-0 place-items-center rounded border', marcada ? 'border-[#0b63ce] bg-[#0b63ce] text-white' : 'border-[#a9bdd6] dark:border-slate-600')}>
                      {marcada && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                    </span>
                    {camera}
                  </button>
                </li>
              );
            })}
            {filtradas.length === 0 && (
              <li className="px-4 py-5 text-sm text-[#5f7391] dark:text-slate-400">
                Nenhum local encontrado. Você pode incluir um novo no campo abaixo.
              </li>
            )}
          </ul>
          <div className="flex gap-2 border-t border-[#e6edf6] p-2.5 dark:border-slate-800">
            <input
              ref={campoOutra}
              value={outra}
              disabled={disabled}
              maxLength={NOME_MAX}
              onChange={(e) => setOutra(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  adicionarOutra();
                }
              }}
              placeholder={placeholderOutro}
              aria-label={rotuloOutro}
              className="min-h-10 min-w-0 flex-1 rounded-lg border border-[#cfdbea] bg-white px-3 text-sm text-[#10233f] placeholder:text-[#8a9bb3] focus:outline-none focus-visible:border-[#0b63ce] focus-visible:ring-2 focus-visible:ring-[#0b63ce]/20 dark:border-slate-700 dark:bg-[#0f1524] dark:text-slate-100"
            />
            <button
              type="button"
              onClick={adicionarOutra}
              disabled={disabled || !outra.trim()}
              className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-[#0b63ce] px-3 text-sm font-bold text-white hover:bg-[#0a56b4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b63ce] disabled:opacity-50"
            >
              <Plus className="h-4 w-4" aria-hidden="true" /> Incluir
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/** Local da ocorrência: mesmo componente, com as sugestões de local. */
export const SeletorLocais: React.FC<Omit<Props, 'sugestoes' | 'rotuloSelecionados' | 'rotuloLista' | 'placeholderOutro' | 'rotuloOutro'> & { locaisIncluidos?: string[] }> = ({ locaisIncluidos = [], ...props }) => (
  <SeletorCameras
    {...props}
    sugestoes={[...LOCAIS_SUGERIDOS, ...locaisIncluidos.filter((l) => !LOCAIS_SUGERIDOS.includes(l))]}
    rotuloSelecionados="Locais selecionados"
    rotuloLista="Locais da unidade"
    placeholderOutro="Outro local (ex.: Biblioteca)"
    rotuloOutro="Nome de outro local"
    placeholderBusca="Buscar local (ex.: pátio)"
  />
);

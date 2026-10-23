import React, { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ORDEM_SITUACOES, SITUACOES, formatarData } from '@/services/ccoService';
import { CcoOcorrencia, CcoSituacao } from '@/types';
import { caixaCampo } from './campos';
import { ESTILO_SITUACAO } from './ui';

export interface FiltrosEstado {
  busca: string;
  situacao: CcoSituacao | '';
  unidade: string;
  de: string;
  ate: string;
}

const VAZIO: FiltrosEstado = { busca: '', situacao: '', unidade: '', de: '', ate: '' };

const normalizar = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const useFiltros = (ocorrencias: CcoOcorrencia[]) => {
  const [filtros, setFiltros] = useState<FiltrosEstado>(VAZIO);
  const mudar = (parcial: Partial<FiltrosEstado>) => setFiltros((atual) => ({ ...atual, ...parcial }));
  const limpar = () => setFiltros(VAZIO);

  // Filtra por tudo menos a situação: assim os contadores das situações acompanham os outros filtros.
  const semSituacao = useMemo(() => {
    const termo = normalizar(filtros.busca.trim());
    return ocorrencias.filter((oc) => {
      if (filtros.unidade && oc.unidade_id !== filtros.unidade) return false;
      if (filtros.de && oc.data_ocorrencia < filtros.de) return false;
      if (filtros.ate && oc.data_ocorrencia > filtros.ate) return false;
      if (!termo) return true;
      return normalizar([oc.protocolo, oc.descricao, oc.unidade_nome, oc.criado_por_nome, oc.responsavel_nome].join(' ')).includes(termo);
    });
  }, [ocorrencias, filtros.busca, filtros.unidade, filtros.de, filtros.ate]);

  const filtradas = useMemo(
    () => (filtros.situacao ? semSituacao.filter((oc) => oc.situacao === filtros.situacao) : semSituacao),
    [semSituacao, filtros.situacao],
  );

  const contagem = useMemo(() => {
    const total = Object.fromEntries(ORDEM_SITUACOES.map((s) => [s, 0])) as Record<CcoSituacao, number>;
    semSituacao.forEach((oc) => { total[oc.situacao] += 1; });
    return total;
  }, [semSituacao]);

  const ativos = Object.entries(filtros).filter(([, valor]) => valor).length;
  return { filtros, mudar, limpar, filtradas, contagem, totalSemSituacao: semSituacao.length, ativos };
};

interface Props {
  filtros: FiltrosEstado;
  mudar: (parcial: Partial<FiltrosEstado>) => void;
  limpar: () => void;
  contagem: Record<CcoSituacao, number>;
  total: number;
  ativos: number;
  unidades?: { id: string; nome: string }[];
  placeholderBusca?: string;
  /** Outros grupos na mesma faixa dos filtros de situação (ex.: importância, ordenação). */
  extras?: React.ReactNode;
}

export interface OpcaoSegmentada {
  valor: string;
  rotulo: string;
  contagem?: number;
  /** Classe da bolinha de cor (ex.: situação ou importância). */
  ponto?: string;
}

/** Grupo de botões lado a lado (um só ativo), com rótulo e contagem: visual de controle segmentado. */
export const Segmentado: React.FC<{ rotulo: string; valor: string; opcoes: OpcaoSegmentada[]; onChange: (valor: string) => void }> = ({ rotulo, valor, opcoes, onChange }) => (
  <div className="min-w-0">
    <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[#6b7f9b] dark:text-slate-500" aria-hidden="true">{rotulo}</p>
    <div role="group" aria-label={`Filtrar por ${rotulo.toLowerCase()}`} className="inline-flex max-w-full flex-wrap gap-0.5 rounded-xl bg-[#e9eff7] p-1 dark:bg-slate-800">
      {opcoes.map((o) => {
        const ativo = valor === o.valor;
        return (
          <button
            key={o.valor || 'todas'}
            type="button"
            aria-pressed={ativo}
            onClick={() => onChange(ativo && o.valor ? '' : o.valor)}
            className={cn(
              'inline-flex min-h-9 items-center gap-2 whitespace-nowrap rounded-lg px-3 text-[13px] font-semibold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#0b63ce]',
              ativo
                ? 'bg-white text-[#0d2240] shadow-[0_1px_3px_rgba(16,35,63,.18)] dark:bg-slate-950 dark:text-slate-50'
                : 'text-[#4c6283] hover:bg-white/60 hover:text-[#0d2240] dark:text-slate-400 dark:hover:bg-slate-900/60 dark:hover:text-slate-100',
            )}
          >
            {o.ponto && <span className={cn('h-2 w-2 shrink-0 rounded-full', o.ponto)} aria-hidden="true" />}
            {o.rotulo}
            {o.contagem !== undefined && (
              <span
                className={cn(
                  'min-w-[22px] rounded-md px-1.5 py-px text-center text-[11px] font-bold tabular-nums',
                  ativo ? 'bg-[#0b63ce] text-white' : 'bg-white/70 text-[#4c6283] dark:bg-slate-900 dark:text-slate-400',
                )}
              >
                {o.contagem}
              </span>
            )}
          </button>
        );
      })}
    </div>
  </div>
);

export const BarraFiltros: React.FC<Props> = ({ filtros, mudar, limpar, contagem, total, ativos, unidades, extras, placeholderBusca = 'Buscar por protocolo ou texto da ocorrência' }) => {
  const periodoInvalido = filtros.de && filtros.ate && filtros.de > filtros.ate;
  return (
    <div className="space-y-3">
      <div className={cn('grid grid-cols-1 gap-3', unidades ? 'lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto]' : 'lg:grid-cols-[minmax(0,1fr)_auto]')}>
        <div className="relative">
          <label htmlFor="cco-busca" className="sr-only">Buscar ocorrências</label>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7f9b]" aria-hidden="true" />
          <input
            id="cco-busca"
            type="search"
            value={filtros.busca}
            onChange={(e) => mudar({ busca: e.target.value })}
            placeholder={placeholderBusca}
            className={cn(caixaCampo(), 'pl-10')}
          />
        </div>
        {unidades && (
          <div>
            <label htmlFor="cco-filtro-unidade" className="sr-only">Unidade escolar</label>
            <select id="cco-filtro-unidade" value={filtros.unidade} onChange={(e) => mudar({ unidade: e.target.value })} className={caixaCampo()}>
              <option value="">Todas as unidades</option>
              {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
          </div>
        )}
        <fieldset className="flex min-w-0 items-center gap-2">
          <legend className="sr-only">Período da ocorrência</legend>
          <label htmlFor="cco-de" className="sr-only">De</label>
          <input id="cco-de" type="date" value={filtros.de} max={filtros.ate || undefined} onChange={(e) => mudar({ de: e.target.value })} className={cn(caixaCampo(periodoInvalido ? 'x' : null), 'min-w-0 flex-1 lg:w-[165px] lg:flex-none')} title="Data inicial" />
          <span className="text-sm text-[#6b7f9b]" aria-hidden="true">até</span>
          <label htmlFor="cco-ate" className="sr-only">Até</label>
          <input id="cco-ate" type="date" value={filtros.ate} min={filtros.de || undefined} onChange={(e) => mudar({ ate: e.target.value })} className={cn(caixaCampo(periodoInvalido ? 'x' : null), 'min-w-0 flex-1 lg:w-[165px] lg:flex-none')} title="Data final" />
        </fieldset>
      </div>

      <div className="flex flex-wrap items-end gap-x-6 gap-y-3 rounded-2xl bg-[#f6f9fd] p-3 ring-1 ring-[#e6edf6] dark:bg-slate-900/40 dark:ring-slate-800">
        <Segmentado
          rotulo="Situação"
          valor={filtros.situacao}
          onChange={(v) => mudar({ situacao: v as FiltrosEstado['situacao'] })}
          opcoes={[
            { valor: '', rotulo: 'Todas', contagem: total },
            ...ORDEM_SITUACOES.map((s) => ({ valor: s, rotulo: SITUACOES[s].rotulo, contagem: contagem[s], ponto: ESTILO_SITUACAO[s].ponto })),
          ]}
        />
        {extras}
        {ativos > 0 && (
          <button type="button" onClick={limpar} className="inline-flex min-h-9 items-center gap-1 self-end rounded-lg px-2.5 text-[13px] font-bold text-[#0b63ce] hover:bg-[#eaf2fd] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0b63ce] dark:text-sky-300 dark:hover:bg-slate-800">
            <X className="h-3.5 w-3.5" aria-hidden="true" /> Limpar filtros
          </button>
        )}
      </div>
      {periodoInvalido && (
        <p className="text-[13px] font-medium text-rose-600 dark:text-rose-400">A data inicial ({formatarData(filtros.de)}) é posterior à final ({formatarData(filtros.ate)}).</p>
      )}
    </div>
  );
};

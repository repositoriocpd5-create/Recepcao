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
}

export const BarraFiltros: React.FC<Props> = ({ filtros, mudar, limpar, contagem, total, ativos, unidades, placeholderBusca = 'Buscar por protocolo ou texto da ocorrência' }) => {
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

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por situação">
        <button
          type="button"
          aria-pressed={!filtros.situacao}
          onClick={() => mudar({ situacao: '' })}
          className={cn(
            'inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b63ce]',
            !filtros.situacao ? 'border-[#0b63ce] bg-[#0b63ce] text-white' : 'border-[#cfdbea] bg-white text-[#3b4d68] hover:border-[#a9c1de] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300',
          )}
        >
          Todas <span className="tabular-nums opacity-80">{total}</span>
        </button>
        {ORDEM_SITUACOES.map((s) => {
          const ativo = filtros.situacao === s;
          return (
            <button
              key={s}
              type="button"
              aria-pressed={ativo}
              onClick={() => mudar({ situacao: ativo ? '' : s })}
              className={cn(
                'inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b63ce]',
                ativo ? cn('border-transparent ring-2', ESTILO_SITUACAO[s].classe) : 'border-[#cfdbea] bg-white text-[#3b4d68] hover:border-[#a9c1de] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300',
              )}
            >
              <span className={cn('h-2 w-2 rounded-full', ESTILO_SITUACAO[s].ponto)} aria-hidden="true" />
              {SITUACOES[s].rotulo} <span className="tabular-nums opacity-70">{contagem[s]}</span>
            </button>
          );
        })}
        {ativos > 0 && (
          <button type="button" onClick={limpar} className="inline-flex min-h-10 items-center gap-1 rounded-full px-3 text-[13px] font-bold text-[#0b63ce] hover:bg-[#eaf2fd] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0b63ce] dark:text-sky-300 dark:hover:bg-slate-800">
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

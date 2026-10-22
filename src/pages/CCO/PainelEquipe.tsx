import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, LayoutDashboard, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { dataService } from '@/services/dataService';
import { ORDEM_SITUACOES, formatarDataHora } from '@/services/ccoService';
import { UserProfile } from '@/types';
import { CabecalhoCco } from './componentes/Cabecalho';
import { BarraFiltros, useFiltros } from './componentes/Filtros';
import { ListaOcorrencias, ListaVazia } from './componentes/ListaOcorrencias';
import { Carregando, Cartao, ESTILO_SITUACAO } from './componentes/ui';
import { useDetalheNaUrl, useOcorrencias } from './hooks';
import { DetalheOcorrencia } from './componentes/DetalheOcorrencia';

const INDICADOR: Record<string, string> = { registrada: 'Registradas', em_analise: 'Em análise', em_atendimento: 'Em atendimento', concluida: 'Concluídas' };

/** Painel da equipe CCO (e do administrador): ocorrências das unidades autorizadas. */
export const PainelEquipe: React.FC<{ user: UserProfile }> = ({ user }) => {
  const ocorrencias = useOcorrencias(user, { atualizarSozinho: true });
  const lista = ocorrencias.data || [];
  const { filtros, mudar, limpar, filtradas, contagem, totalSemSituacao, ativos } = useFiltros(lista);
  const detalhe = useDetalheNaUrl();

  const unidadesCadastradas = useQuery({ queryKey: ['cco', 'unidades'], queryFn: () => dataService.getRamaisUnidades(), staleTime: 10 * 60_000 });
  const unidades = useMemo(() => {
    const mapa = new Map<string, string>();
    (unidadesCadastradas.data || [])
      .filter((u) => u.tipo === 'unidade_escolar' && (!user.cco_unidades?.length || user.cco_unidades.includes(u.id)))
      .forEach((u) => mapa.set(u.id, u.nome));
    lista.forEach((oc) => mapa.set(oc.unidade_id, oc.unidade_nome));
    return [...mapa].map(([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [unidadesCadastradas.data, lista, user.cco_unidades]);

  const abertas = lista.filter((oc) => oc.situacao !== 'concluida').length;

  return (
    <div className="space-y-5">
      <CabecalhoCco
        titulo="Central Controle Operacional"
        subtitulo="Acompanhe e atenda as ocorrências registradas pelas unidades escolares."
        trilha="Painel da equipe"
        user={user}
        unidadeNome={user.cco_unidades?.length ? `${user.cco_unidades.length} unidade(s) autorizada(s)` : 'Todas as unidades'}
        icone={<LayoutDashboard className="h-7 w-7 sm:h-9 sm:w-9" aria-hidden="true" />}
      />

      <section aria-label="Indicadores" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {ORDEM_SITUACOES.map((s) => {
          const ativo = filtros.situacao === s;
          const Icone = ESTILO_SITUACAO[s].icone;
          return (
            <button
              key={s}
              type="button"
              aria-pressed={ativo}
              onClick={() => mudar({ situacao: ativo ? '' : s })}
              className={cn(
                'group flex min-h-[96px] items-start justify-between gap-2 rounded-2xl border bg-white p-4 text-left shadow-[0_10px_30px_-24px_rgba(16,48,96,.5)] transition-all hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#0b63ce] dark:bg-[#121826]',
                ativo ? 'border-[#0b63ce] ring-2 ring-[#0b63ce]/20' : 'border-[#e2eaf4] dark:border-slate-800',
              )}
            >
              <span>
                <span className="block text-[13px] font-bold text-[#4c6283] dark:text-slate-400">{INDICADOR[s]}</span>
                <span className="mt-1 block text-3xl font-extrabold tabular-nums tracking-tight text-[#0d2240] dark:text-slate-50">{contagem[s]}</span>
              </span>
              <span className={cn('grid h-10 w-10 place-items-center rounded-xl ring-1', ESTILO_SITUACAO[s].classe)}>
                <Icone className="h-5 w-5" aria-hidden="true" />
              </span>
            </button>
          );
        })}
      </section>

      <Cartao>
        <div className="flex flex-col gap-3 border-b border-[#e6edf6] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-extrabold text-[#0d2240] dark:text-slate-100">Ocorrências das unidades</h2>
            <p className="text-[13px] text-[#5f7391] dark:text-slate-400">
              {abertas} em aberto · {lista.length} no total
              {ocorrencias.dataUpdatedAt ? ` · atualizado ${formatarDataHora(new Date(ocorrencias.dataUpdatedAt).toISOString()).split(' às ')[1]}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void ocorrencias.refetch()}
            disabled={ocorrencias.isFetching}
            className="inline-flex min-h-10 items-center gap-2 self-start rounded-xl border border-[#cfdbea] bg-white px-3.5 text-sm font-bold text-[#0b4fa3] hover:bg-[#f0f6fe] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0b63ce] disabled:opacity-60 sm:self-auto dark:border-slate-700 dark:bg-transparent dark:text-sky-200"
          >
            <RefreshCw className={cn('h-4 w-4', ocorrencias.isFetching && 'animate-spin')} aria-hidden="true" /> Atualizar
          </button>
        </div>
        <div className="border-b border-[#e6edf6] px-4 py-4 sm:px-6 dark:border-slate-800">
          <BarraFiltros
            filtros={filtros}
            mudar={mudar}
            limpar={limpar}
            contagem={contagem}
            total={totalSemSituacao}
            ativos={ativos}
            unidades={unidades}
            placeholderBusca="Buscar por protocolo, unidade, texto ou pessoa"
          />
        </div>
        {ocorrencias.isLoading ? (
          <Carregando texto="Carregando as ocorrências…" />
        ) : ocorrencias.error ? (
          <p role="alert" className="m-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-700 sm:m-6 dark:bg-rose-950/30 dark:text-rose-200">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" /> {(ocorrencias.error as Error).message}
          </p>
        ) : (
          <div className="pt-2">
            <ListaOcorrencias
              ocorrencias={filtradas}
              mostrarUnidade
              onAbrir={(oc) => detalhe.abrir(oc.id)}
              vazio={<ListaVazia titulo={ativos ? 'Nenhuma ocorrência com estes filtros.' : 'Nenhuma ocorrência registrada.'} texto={ativos ? 'Ajuste ou limpe os filtros.' : undefined} />}
            />
          </div>
        )}
      </Cartao>

      <DetalheOcorrencia ocorrenciaId={detalhe.id} user={user} onFechar={detalhe.fechar} />
    </div>
  );
};

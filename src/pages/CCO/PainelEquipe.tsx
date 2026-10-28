import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, FileDown, LayoutDashboard, Loader2, MessageSquarePlus, RefreshCw, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { dataService } from '@/services/dataService';
import { IMPORTANCIAS, Importancia, ORDEM_SITUACOES, SITUACOES, ccoService, formatarData, formatarDataHora, importanciaDe } from '@/services/ccoService';
import { gerarRelatorioCcoPdf } from './relatorioPdf';
import { CcoOcorrencia, UserProfile } from '@/types';
import { perfilCco } from '@/lib/modulos';
import { ExcluirOcorrencia } from './componentes/ExcluirOcorrencia';
import { CabecalhoCco } from './componentes/Cabecalho';
import { BarraFiltros, Segmentado, useFiltros } from './componentes/Filtros';
import { ListaOcorrencias, ListaVazia } from './componentes/ListaOcorrencias';
import { Carregando, Cartao, ESTILO_SITUACAO } from './componentes/ui';
import { useDetalheNaUrl, useOcorrencias } from './hooks';
import { DetalheOcorrencia } from './componentes/DetalheOcorrencia';
import { TabelaAdmin } from './componentes/TabelaAdmin';
import { BoasVindasAdmin } from './componentes/BoasVindasAdmin';

const INDICADOR: Record<string, string> = { registrada: 'Registradas', em_analise: 'Em análise', em_atendimento: 'Em atendimento', concluida: 'Solucionadas' };

/** Painel da equipe CCO (e do administrador): ocorrências das unidades autorizadas. */
export const PainelEquipe: React.FC<{ user: UserProfile }> = ({ user }) => {
  const ocorrencias = useOcorrencias(user, { atualizarSozinho: true });
  const lista = ocorrencias.data || [];
  const { filtros, mudar, limpar, filtradas, contagem, totalSemSituacao, ativos } = useFiltros(lista);
  const detalhe = useDetalheNaUrl();
  const queryClient = useQueryClient();
  const admin = perfilCco(user) === 'admin';
  const [excluir, setExcluir] = useState<CcoOcorrencia | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const aoExcluir = (oc: CcoOcorrencia) => {
    setExcluir(null);
    detalhe.fechar();
    // Some da lista e dos contadores na hora; depois confirma com o servidor.
    queryClient.setQueryData<CcoOcorrencia[]>(['cco', 'ocorrencias', user.id], (atual) => atual?.filter((item) => item.id !== oc.id));
    void queryClient.invalidateQueries({ queryKey: ['cco'] });
    setToast(`Ocorrência ${oc.protocolo} excluída. Uma cópia ficou registrada na auditoria.`);
  };

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

  // Administrador: colunas a mais (direção, quem registrou), filtro e ordem por importância.
  const pessoas = useQuery({ queryKey: ['cco', 'pessoas-unidades'], queryFn: () => ccoService.listarPessoasDasUnidades(), enabled: admin, staleTime: 10 * 60_000 });
  const [importancia, setImportancia] = useState<Importancia | ''>('');
  const [ordem, setOrdem] = useState<'recentes' | 'importancia'>('recentes');
  const exibidas = useMemo(() => {
    if (!admin) return filtradas;
    const lista = importancia ? filtradas.filter((oc) => importanciaDe(oc).nivel === importancia) : filtradas;
    if (ordem === 'recentes') return lista;
    return [...lista].sort((a, b) => IMPORTANCIAS[importanciaDe(a).nivel].ordem - IMPORTANCIAS[importanciaDe(b).nivel].ordem || b.created_at.localeCompare(a.created_at));
  }, [admin, filtradas, importancia, ordem]);
  // PDF: a lista exatamente como está na tela (filtros e ordem), 15 casos por página.
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const descreverFiltros = () => [
    filtros.busca.trim() && `Busca: "${filtros.busca.trim()}"`,
    filtros.unidade && `Unidade: ${unidades.find((u) => u.id === filtros.unidade)?.nome ?? filtros.unidade}`,
    (filtros.de || filtros.ate) && `Período: ${filtros.de ? formatarData(filtros.de) : 'início'} a ${filtros.ate ? formatarData(filtros.ate) : 'hoje'}`,
    filtros.situacao && `Situação: ${SITUACOES[filtros.situacao].rotulo}`,
    admin && importancia && `Importância: ${IMPORTANCIAS[importancia].rotulo}`,
    admin && ordem === 'importancia' && 'Ordem: mais importantes primeiro',
  ].filter(Boolean).join(' · ');
  const gerarPdf = async () => {
    setGerandoPdf(true);
    try {
      await gerarRelatorioCcoPdf({ ocorrencias: exibidas, user, pessoas: pessoas.data, filtros: descreverFiltros(), completo: admin });
      setToast(`PDF gerado com ${exibidas.length} ocorrência(s).`);
    } catch {
      setToast('Não foi possível gerar o PDF. Tente novamente.');
    } finally {
      setGerandoPdf(false);
    }
  };

  const contagemImportancia = useMemo(() => {
    const total: Record<Importancia, number> = { alta: 0, media: 0, baixa: 0 };
    filtradas.forEach((oc) => { total[importanciaDe(oc).nivel] += 1; });
    return total;
  }, [filtradas]);

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
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => void gerarPdf()}
            disabled={gerandoPdf || ocorrencias.isLoading}
            aria-busy={gerandoPdf}
            title="Gera um PDF com a lista exibida (15 ocorrências por página)"
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#0b63ce] px-3.5 text-sm font-bold text-white shadow-[0_8px_18px_-12px_rgba(11,99,206,.9)] hover:bg-[#0a56b4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b63ce] disabled:opacity-60"
          >
            {gerandoPdf ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FileDown className="h-4 w-4" aria-hidden="true" />}
            {gerandoPdf ? 'Gerando PDF…' : 'Gerar PDF'}
          </button>
          <button
            type="button"
            onClick={() => void ocorrencias.refetch()}
            disabled={ocorrencias.isFetching}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#cfdbea] bg-white px-3.5 text-sm font-bold text-[#0b4fa3] hover:bg-[#f0f6fe] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0b63ce] disabled:opacity-60 dark:border-slate-700 dark:bg-transparent dark:text-sky-200"
          >
            <RefreshCw className={cn('h-4 w-4', ocorrencias.isFetching && 'animate-spin')} aria-hidden="true" /> Atualizar
          </button>
          </div>
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
            extras={admin && (
              <>
                <Segmentado
                  rotulo="Importância"
                  valor={importancia}
                  onChange={(v) => setImportancia(v as Importancia | '')}
                  opcoes={[
                    { valor: '', rotulo: 'Todas', contagem: filtradas.length },
                    { valor: 'alta', rotulo: IMPORTANCIAS.alta.rotulo, contagem: contagemImportancia.alta, ponto: 'bg-rose-600' },
                    { valor: 'media', rotulo: IMPORTANCIAS.media.rotulo, contagem: contagemImportancia.media, ponto: 'bg-amber-500' },
                    { valor: 'baixa', rotulo: IMPORTANCIAS.baixa.rotulo, contagem: contagemImportancia.baixa, ponto: 'bg-slate-400' },
                  ]}
                />
                <label className="ml-auto block">
                  <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#6b7f9b] dark:text-slate-500">Ordenar por</span>
                  <select
                    value={ordem}
                    onChange={(e) => setOrdem(e.target.value as 'recentes' | 'importancia')}
                    className="min-h-11 rounded-xl border border-[#cfdbea] bg-white px-3 text-[13px] font-semibold text-[#10233f] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0b63ce]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  >
                    <option value="recentes">Mais recentes</option>
                    <option value="importancia">Mais importantes primeiro</option>
                  </select>
                </label>
              </>
            )}
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
            {admin && exibidas.length > 0 && (
              <div className="hidden lg:block">
                <TabelaAdmin
                  ocorrencias={exibidas}
                  pessoas={pessoas.data}
                  onAbrir={(oc) => detalhe.abrir(oc.id)}
                  onAndamento={(oc) => detalhe.abrir(oc.id, 'andamento')}
                  onExcluir={setExcluir}
                />
              </div>
            )}
            <div className={cn(admin && exibidas.length > 0 && 'lg:hidden')}>
            <ListaOcorrencias
              ocorrencias={exibidas}
              mostrarUnidade
              mostrarImportancia={admin}
              onAbrir={(oc) => detalhe.abrir(oc.id)}
              acaoLinha={(oc) => (
                <div className="flex items-center gap-1.5">
                {oc.situacao === 'concluida' ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 dark:text-green-400" title="Ocorrência finalizada">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" /><span className="hidden lg:inline">Finalizada</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => detalhe.abrir(oc.id, 'andamento')}
                  title={`Adicionar andamento à ${oc.protocolo}`}
                  aria-label={`Adicionar andamento à ocorrência ${oc.protocolo}`}
                  className="inline-flex min-h-10 min-w-10 items-center justify-center gap-1.5 rounded-xl border border-[#b9cfe9] bg-white px-2.5 text-xs font-bold text-[#0b4fa3] transition-colors hover:bg-[#f0f6fe] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b63ce] dark:border-slate-700 dark:bg-slate-900 dark:text-sky-200"
                >
                  <MessageSquarePlus className="h-4 w-4" aria-hidden="true" /><span className="hidden lg:inline">Andamento</span>
                </button>
                )}
                {admin && (
                  <button
                    type="button"
                    onClick={() => setExcluir(oc)}
                    title={`Excluir ${oc.protocolo}`}
                    aria-label={`Excluir a ocorrência ${oc.protocolo}`}
                    className="hidden min-h-10 min-w-10 items-center justify-center rounded-xl text-[#8a9bb3] transition-colors hover:bg-rose-50 hover:text-rose-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600 lg:inline-flex dark:hover:bg-rose-950/30"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
                </div>
              )}
              vazio={<ListaVazia titulo={ativos || importancia ? 'Nenhuma ocorrência com estes filtros.' : 'Nenhuma ocorrência registrada.'} texto={ativos || importancia ? 'Ajuste ou limpe os filtros.' : undefined} />}
            />
            </div>
          </div>
        )}
      </Cartao>

      <DetalheOcorrencia ocorrenciaId={detalhe.id} user={user} onFechar={detalhe.fechar} focarAndamento={detalhe.acao === 'andamento'} onExcluir={admin ? setExcluir : undefined} />
      {admin && <ExcluirOcorrencia oc={excluir} user={user} onFechar={() => setExcluir(null)} onExcluida={aoExcluir} />}
      {/* Administrador: boas-vindas com o resumo do dia (uma vez por dia; espera o detalhe aberto por link fechar). */}
      {admin && <BoasVindasAdmin user={user} ocorrencias={lista} carregando={ocorrencias.isLoading || Boolean(detalhe.id)} onAbrir={(id) => detalhe.abrir(id)} />}
      {toast && (
        <div role="status" className="fixed bottom-24 left-1/2 z-[70] flex w-[calc(100%-32px)] max-w-md -translate-x-1/2 items-center gap-3 rounded-2xl bg-[#0d2240] px-4 py-3 text-sm font-semibold text-white shadow-xl md:bottom-6 dark:bg-slate-800">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-green-400" aria-hidden="true" />
          <span className="flex-1">{toast}</span>
          <button type="button" onClick={() => setToast(null)} aria-label="Fechar aviso" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white/10"><X className="h-4 w-4" /></button>
        </div>
      )}
    </div>
  );
};

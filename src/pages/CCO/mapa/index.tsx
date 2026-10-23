import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  Bookmark,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  Info,
  Maximize2,
  Minimize2,
  Navigation,
  Plus,
  Route,
  School,
  Search,
  UserRound,
  X,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { dataService } from '@/services/dataService';
import { useOcorrencias } from '../hooks';
import { Carregando } from '../componentes/ui';
import { MapaRede } from './MapaRede';
import {
  CRITICIDADES,
  Criticidade,
  MAX_ROTA,
  PRAZO_DIAS,
  UnidadeMapa,
  distanciaKm,
  exportarCsv,
  linkGoogleMaps,
  montarUnidades,
  ordenarRota,
  resumoUnidade,
  SEDE,
  buscarRotaPorRuas,
  comoChegar,
} from './dados';

type FiltroCriticidade = '' | 'critica' | 'atencao' | 'estavel';
type FiltroStatus = '' | 'pendencias' | 'vencidas' | 'atendimento' | 'ok';

const GRUPO_CRITICIDADE: Record<Exclude<FiltroCriticidade, ''>, Criticidade[]> = {
  critica: ['critica'],
  atencao: ['vencida', 'atencao'],
  estavel: ['atendimento', 'ok'],
};

const ICONE_CRITICIDADE: Record<Criticidade, typeof AlertTriangle> = {
  critica: AlertTriangle,
  vencida: Clock,
  atencao: Info,
  atendimento: UserRound,
  ok: CheckCircle2,
};

const normalizar = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const campo =
  'h-10 min-w-0 rounded-lg border border-[#cfdbea] bg-white px-3 text-sm text-[#10233f] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0b63ce]/40 dark:border-slate-700 dark:bg-[#121826] dark:text-slate-100';
const botaoBarra =
  'inline-flex h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b63ce]';

const Etiqueta: React.FC<{ c: Criticidade }> = ({ c }) => (
  <span className={cn('inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-bold ring-1', CRITICIDADES[c].etiqueta)}>{CRITICIDADES[c].rotulo}</span>
);

const Indicador: React.FC<{ icone: typeof School; valor: number; rotulo: string; destaque?: string; ativo?: boolean; onClick?: () => void }> = ({ icone: Icone, valor, rotulo, destaque, ativo, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={ativo}
    className={cn(
      'flex min-h-[60px] items-center gap-3 rounded-xl border bg-white px-4 text-left shadow-[0_8px_22px_-20px_rgba(16,48,96,.6)] transition-colors hover:border-[#9fc3ec] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0b63ce] dark:bg-[#121826]',
      ativo ? 'border-[#0b63ce] ring-2 ring-[#0b63ce]/20' : 'border-[#e2eaf4] dark:border-slate-800',
    )}
  >
    <Icone className="h-5 w-5 shrink-0 text-[#3b4d68] dark:text-slate-300" aria-hidden="true" />
    <span className="text-[15px] text-[#10233f] dark:text-slate-100">
      <strong className={cn('mr-1 text-lg font-extrabold tabular-nums', destaque)}>{valor}</strong>{rotulo}
    </span>
  </button>
);

/** Mapa Operacional da Rede: visão territorial das unidades e roteirizador de vistorias (administração do CCO). */
export const MapaRedePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const ocorrencias = useOcorrencias(user!, { atualizarSozinho: true });
  const unidadesCadastradas = useQuery({ queryKey: ['cco', 'unidades'], queryFn: () => dataService.getRamaisUnidades(), staleTime: 10 * 60_000 });

  const [busca, setBusca] = useState('');
  const [bairro, setBairro] = useState('');
  const [filtroCriticidade, setFiltroCriticidade] = useState<FiltroCriticidade>('');
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('');
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [paradas, setParadas] = useState<string[]>([]);
  const [escolhendo, setEscolhendo] = useState(false);
  const [buscaEscolha, setBuscaEscolha] = useState('');
  const [verTodas, setVerTodas] = useState(false);
  const [telaCheia, setTelaCheia] = useState(false);
  const [aviso, setAviso] = useState('');
  const area = useRef<HTMLElement>(null);
  const menuEscolha = useRef<HTMLDivElement>(null);

  const { comLocal, semLocal } = useMemo(
    () => montarUnidades(unidadesCadastradas.data || [], ocorrencias.data || []),
    [unidadesCadastradas.data, ocorrencias.data],
  );
  const bairros = useMemo(() => [...new Set(comLocal.map((u) => u.bairro).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, 'pt-BR')), [comLocal]);

  const filtradas = useMemo(() => {
    const termo = normalizar(busca.trim());
    return comLocal.filter((u) => {
      if (termo && !normalizar(`${u.nome} ${u.bairro ?? ''}`).includes(termo)) return false;
      if (bairro === '__sem' ? u.bairro : bairro && u.bairro !== bairro) return false;
      if (filtroCriticidade && !GRUPO_CRITICIDADE[filtroCriticidade].includes(u.criticidade)) return false;
      if (filtroStatus === 'pendencias' && !u.abertas.length) return false;
      if (filtroStatus === 'vencidas' && !u.vencidas) return false;
      if (filtroStatus === 'atendimento' && !u.emAtendimento) return false;
      if (filtroStatus === 'ok' && u.abertas.length) return false;
      return true;
    });
  }, [comLocal, busca, bairro, filtroCriticidade, filtroStatus]);

  const indicadores = useMemo(() => ({
    total: comLocal.length + semLocal.length,
    criticas: comLocal.filter((u) => u.criticidade === 'critica').length,
    atendimento: comLocal.filter((u) => u.emAtendimento > 0).length,
    vencidas: comLocal.filter((u) => u.vencidas > 0).length,
  }), [comLocal, semLocal]);

  const prioridades = useMemo(() => filtradas.filter((u) => u.abertas.length), [filtradas]);
  const unidadesDaRota = useMemo(() => paradas.map((id) => comLocal.find((u) => u.id === id)).filter(Boolean) as UnidadeMapa[], [paradas, comLocal]);
  // Rota pelas ruas (melhor ordem, distância e tempo); enquanto calcula ou se falhar, ordem pela mais próxima em linha reta.
  const porRuas = useQuery({
    queryKey: ['cco', 'rota-ruas', [...paradas].sort().join(',')],
    queryFn: ({ signal }) => buscarRotaPorRuas(unidadesDaRota, signal),
    enabled: unidadesDaRota.length > 0,
    staleTime: 30 * 60_000,
    retry: 1,
  });
  const retaAprox = useMemo(() => ordenarRota(unidadesDaRota), [unidadesDaRota]);
  const rotaPorRuas = porRuas.data && porRuas.data.ordem.length === unidadesDaRota.length ? porRuas.data : null;
  const rota = { ordem: rotaPorRuas?.ordem ?? retaAprox.ordem, km: rotaPorRuas?.km ?? retaAprox.km };
  const unidadeSelecionada = comLocal.find((u) => u.id === selecionada) || null;
  const filtrosAtivos = Boolean(busca || bairro || filtroCriticidade || filtroStatus);

  const mostrarAviso = (texto: string) => {
    setAviso(texto);
    window.setTimeout(() => setAviso(''), 3500);
  };

  const alternarParada = useCallback((id: string) => {
    setParadas((atual) => {
      if (atual.includes(id)) return atual.filter((x) => x !== id);
      if (atual.length >= MAX_ROTA) {
        mostrarAviso(`A rota aceita até ${MAX_ROTA} unidades.`);
        return atual;
      }
      return [...atual, id];
    });
  }, []);

  const sugerirTop5 = () => {
    const top = comLocal.filter((u) => u.abertas.length).slice(0, 5).map((u) => u.id);
    if (!top.length) return mostrarAviso('Nenhuma unidade com pendências agora.');
    setParadas(top);
    mostrarAviso(`Rota sugerida com as ${top.length} unidade(s) de maior prioridade.`);
  };

  // Tela cheia da área do mapa.
  useEffect(() => {
    const aoMudar = () => setTelaCheia(document.fullscreenElement === area.current);
    document.addEventListener('fullscreenchange', aoMudar);
    return () => document.removeEventListener('fullscreenchange', aoMudar);
  }, []);
  const alternarTelaCheia = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void area.current?.requestFullscreen?.();
  };

  // Fecha o menu de escolha ao clicar fora ou com Esc.
  useEffect(() => {
    if (!escolhendo) return;
    const fora = (e: MouseEvent) => { if (!menuEscolha.current?.contains(e.target as Node)) setEscolhendo(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setEscolhendo(false); };
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', fora);
      document.removeEventListener('keydown', esc);
    };
  }, [escolhendo]);

  if (unidadesCadastradas.isLoading || ocorrencias.isLoading) return <Carregando texto="Carregando o mapa da rede…" />;

  const listaPrioridade = verTodas ? prioridades : prioridades.slice(0, 8);
  const opcoesEscolha = comLocal.filter((u) => !buscaEscolha || normalizar(u.nome).includes(normalizar(buscaEscolha)));

  return (
    <section ref={area} aria-labelledby="mapa-titulo" className={cn('space-y-4', telaCheia && 'overflow-auto bg-[#f4f8fd] p-4 dark:bg-[#0b0f19]')}>
      <header>
        <h1 id="mapa-titulo" className="text-2xl font-extrabold tracking-tight text-[#0d2240] sm:text-[28px] dark:text-slate-50">Mapa Operacional da Rede</h1>
        <p className="text-sm text-[#5f7391] dark:text-slate-400">Visão territorial e roteirizador logístico de vistorias</p>
      </header>

      {/* Barra de filtros e ações */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-[200px] flex-1 lg:max-w-[240px]">
          <span className="sr-only">Buscar escola ou bairro</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7f9b]" aria-hidden="true" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar escola ou bairro" className={cn(campo, 'w-full pl-9')} />
        </label>
        <select aria-label="Bairro" value={bairro} onChange={(e) => setBairro(e.target.value)} className={cn(campo, 'w-[170px]')}>
          <option value="">Bairro (todos)</option>
          {bairros.map((b) => <option key={b} value={b}>{b}</option>)}
          <option value="__sem">Bairro não identificado</option>
        </select>
        <select aria-label="Criticidade" value={filtroCriticidade} onChange={(e) => setFiltroCriticidade(e.target.value as FiltroCriticidade)} className={cn(campo, 'w-[170px]')}>
          <option value="">Criticidade (todas)</option>
          <option value="critica">Crítica</option>
          <option value="atencao">Atenção</option>
          <option value="estavel">Estável</option>
        </select>
        <select aria-label="Status" value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value as FiltroStatus)} className={cn(campo, 'w-[170px]')}>
          <option value="">Status (todos)</option>
          <option value="pendencias">Com pendências</option>
          <option value="vencidas">Prazos vencidos</option>
          <option value="atendimento">Em atendimento</option>
          <option value="ok">Sem pendências</option>
        </select>

        <div ref={menuEscolha} className="relative">
          <button
            type="button"
            aria-expanded={escolhendo}
            aria-haspopup="true"
            onClick={() => setEscolhendo((v) => !v)}
            className={cn(botaoBarra, 'rounded-full border border-[#0b4fa3] bg-white text-[#0b4fa3] hover:bg-[#eef5fe] dark:bg-transparent dark:text-sky-200 dark:border-sky-400/60')}
          >
            <School className="h-4 w-4" aria-hidden="true" /> Escolher unidades
            <span className="rounded-full bg-[#e6f0fc] px-1.5 text-xs tabular-nums dark:bg-sky-500/20">{paradas.length}/{MAX_ROTA}</span>
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          </button>
          {escolhendo && (
            <div className="absolute left-0 top-12 z-[1000] w-[min(92vw,340px)] rounded-xl border border-[#dbe6f3] bg-white p-3 shadow-2xl dark:border-slate-700 dark:bg-[#121826]">
              <p className="mb-2 text-xs font-semibold text-[#5f7391] dark:text-slate-400">Marque até {MAX_ROTA} unidades para a rota de vistoria.</p>
              <input value={buscaEscolha} onChange={(e) => setBuscaEscolha(e.target.value)} placeholder="Buscar unidade" aria-label="Buscar unidade para a rota" className={cn(campo, 'mb-2 w-full')} autoFocus />
              <ul className="max-h-64 space-y-0.5 overflow-y-auto">
                {opcoesEscolha.map((u) => (
                  <li key={u.id}>
                    <label className="flex min-h-9 cursor-pointer items-center gap-2 rounded-md px-2 text-[13px] text-[#10233f] hover:bg-[#f2f7fd] dark:text-slate-200 dark:hover:bg-slate-800">
                      <input type="checkbox" checked={paradas.includes(u.id)} onChange={() => alternarParada(u.id)} className="accent-[#0b63ce]" />
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: CRITICIDADES[u.criticidade].cor }} aria-hidden="true" />
                      <span className="truncate">{u.nome}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <button type="button" onClick={sugerirTop5} className={cn(botaoBarra, 'rounded-full border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200')}>
          <Zap className="h-4 w-4" aria-hidden="true" /> Sugestão Top 5
        </button>
        <button type="button" onClick={() => exportarCsv(filtradas)} className={cn(botaoBarra, 'text-[#10233f] hover:bg-[#eef5fe] dark:text-slate-200 dark:hover:bg-slate-800')}>
          <Download className="h-4 w-4" aria-hidden="true" /> Exportar
        </button>
        <button
          type="button"
          onClick={alternarTelaCheia}
          aria-pressed={telaCheia}
          title={telaCheia ? 'Sair da tela cheia (Esc)' : 'Tela cheia: filtros, indicadores, mapa e prioridades'}
          className={cn(botaoBarra, 'text-[#0b63ce] hover:bg-[#eef5fe] dark:text-sky-300 dark:hover:bg-slate-800')}
        >
          {telaCheia ? <Minimize2 className="h-4 w-4" aria-hidden="true" /> : <Maximize2 className="h-4 w-4" aria-hidden="true" />}
          {telaCheia ? 'Sair da tela cheia' : 'Tela cheia'}
        </button>
        {filtrosAtivos && (
          <button type="button" onClick={() => { setBusca(''); setBairro(''); setFiltroCriticidade(''); setFiltroStatus(''); }} className={cn(botaoBarra, 'text-[#5f7391] hover:bg-[#eef5fe] dark:text-slate-400 dark:hover:bg-slate-800')}>
            <X className="h-4 w-4" aria-hidden="true" /> Limpar filtros
          </button>
        )}
      </div>

      {aviso && <p role="status" className="rounded-lg bg-[#0d2240] px-3 py-2 text-sm font-semibold text-white dark:bg-slate-800">{aviso}</p>}

      {/* Indicadores */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador icone={School} valor={indicadores.total} rotulo="Unidades escolares" ativo={!filtrosAtivos} onClick={() => { setFiltroCriticidade(''); setFiltroStatus(''); }} />
        <Indicador icone={AlertTriangle} valor={indicadores.criticas} rotulo="Situação crítica" destaque="text-rose-600" ativo={filtroCriticidade === 'critica'} onClick={() => setFiltroCriticidade((v) => (v === 'critica' ? '' : 'critica'))} />
        <Indicador icone={UserRound} valor={indicadores.atendimento} rotulo="Em atendimento" destaque="text-blue-600" ativo={filtroStatus === 'atendimento'} onClick={() => setFiltroStatus((v) => (v === 'atendimento' ? '' : 'atendimento'))} />
        <Indicador icone={Clock} valor={indicadores.vencidas} rotulo="Prazos vencidos" destaque="text-orange-600" ativo={filtroStatus === 'vencidas'} onClick={() => setFiltroStatus((v) => (v === 'vencidas' ? '' : 'vencidas'))} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* Mapa */}
        <div className={cn('relative overflow-hidden rounded-2xl border border-[#e2eaf4] bg-white shadow-[0_10px_30px_-22px_rgba(16,48,96,.45)] dark:border-slate-800', telaCheia ? 'h-[calc(100vh-260px)]' : 'h-[460px] sm:h-[560px]')}>
          <MapaRede unidades={filtradas} selecionada={selecionada} rota={rota.ordem} trajeto={rotaPorRuas?.trajeto} onSelecionar={setSelecionada} />
          {/* Legenda */}
          <div className="pointer-events-none absolute bottom-3 left-3 z-[500] rounded-xl bg-white/95 px-3 py-2 text-[11px] shadow-md dark:bg-[#121826]/95">
            <ul className="space-y-1">
              {(Object.keys(CRITICIDADES) as Criticidade[]).map((c) => (
                <li key={c} className="flex items-center gap-1.5 text-[#3b4d68] dark:text-slate-300">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: CRITICIDADES[c].cor }} aria-hidden="true" />
                  {CRITICIDADES[c].rotulo}{c === 'vencida' ? ` (+${PRAZO_DIAS} dias)` : ''}
                </li>
              ))}
            </ul>
          </div>
          {filtradas.length === 0 && (
            <p className="absolute inset-x-0 top-4 z-[500] mx-auto w-fit rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#3b4d68] shadow dark:bg-[#121826] dark:text-slate-200">Nenhuma unidade com estes filtros.</p>
          )}
        </div>

        {/* Painel lateral */}
        <aside className="space-y-4">
          {unidadeSelecionada && (
            <section aria-label="Unidade selecionada" className="rounded-2xl border border-[#cfe0f5] bg-white p-4 shadow-[0_10px_30px_-22px_rgba(16,48,96,.45)] dark:border-slate-700 dark:bg-[#121826]">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="text-[15px] font-extrabold leading-snug text-[#0d2240] dark:text-slate-100">{unidadeSelecionada.nome}</h2>
                  <p className="mt-0.5 text-xs text-[#5f7391] dark:text-slate-400">{unidadeSelecionada.bairro ? `${unidadeSelecionada.bairro} · Itaguaí` : 'Itaguaí'}</p>
                </div>
                <button type="button" onClick={() => setSelecionada(null)} aria-label="Fechar unidade" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#6b7f9b] hover:bg-[#eef5fe] dark:hover:bg-slate-800"><X className="h-4 w-4" /></button>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <Etiqueta c={unidadeSelecionada.criticidade} />
                <span className="text-[#3b4d68] dark:text-slate-300">{resumoUnidade(unidadeSelecionada)}</span>
                <span className="text-[#6b7f9b]">· {distanciaKm(SEDE, unidadeSelecionada).toFixed(1).replace('.', ',')} km da sede</span>
              </div>
              {unidadeSelecionada.abertas.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {unidadeSelecionada.abertas.slice(0, 4).map((oc) => (
                    <li key={oc.id}>
                      <button type="button" onClick={() => navigate(`/cco?ocorrencia=${oc.id}`)} className="flex w-full items-start gap-2 rounded-lg bg-[#f5f8fc] px-2.5 py-2 text-left text-xs hover:bg-[#eaf2fd] dark:bg-slate-800/60 dark:hover:bg-slate-800">
                        <span className="font-mono font-bold text-[#0b4fa3] dark:text-sky-300">{oc.protocolo}</span>
                        <span className="line-clamp-2 flex-1 text-[#3b4d68] dark:text-slate-300">{oc.descricao}</span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-[#9aaac0]" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => alternarParada(unidadeSelecionada.id)} className={cn(botaoBarra, 'h-9 border border-[#b9cfe9] text-[#0b4fa3] hover:bg-[#eef5fe] dark:border-slate-700 dark:text-sky-200')}>
                  {paradas.includes(unidadeSelecionada.id) ? <><X className="h-4 w-4" /> Tirar da rota</> : <><Plus className="h-4 w-4" /> Rota</>}
                </button>
                <a href={comoChegar(unidadeSelecionada)} target="_blank" rel="noreferrer" className={cn(botaoBarra, 'h-9 text-[#0b63ce] hover:bg-[#eef5fe] dark:text-sky-300 dark:hover:bg-slate-800')}>
                  <Navigation className="h-4 w-4" aria-hidden="true" /> Como chegar
                </a>
                {unidadeSelecionada.mapaUrl && (
                  <a href={unidadeSelecionada.mapaUrl} target="_blank" rel="noreferrer" className={cn(botaoBarra, 'h-9 text-[#0b63ce] hover:bg-[#eef5fe] dark:text-sky-300 dark:hover:bg-slate-800')}>
                    <ExternalLink className="h-4 w-4" aria-hidden="true" /> Endereço no Google Maps
                  </a>
                )}
              </div>
            </section>
          )}

          {rota.ordem.length > 0 && (
            <section aria-labelledby="rota-titulo" className="rounded-2xl border border-[#cfe0f5] bg-white p-4 shadow-[0_10px_30px_-22px_rgba(16,48,96,.45)] dark:border-slate-700 dark:bg-[#121826]">
              <div className="flex items-center justify-between gap-2">
                <h2 id="rota-titulo" className="flex items-center gap-2 text-sm font-extrabold text-[#0d2240] dark:text-slate-100"><Route className="h-4 w-4 text-[#0b63ce]" aria-hidden="true" /> Rota de vistoria</h2>
                <button type="button" onClick={() => setParadas([])} className="text-xs font-bold text-[#6b7f9b] hover:text-rose-600">Limpar</button>
              </div>
              <p className="mt-0.5 text-xs text-[#5f7391] dark:text-slate-400" aria-live="polite">
                {porRuas.isFetching ? (
                  <>Calculando a rota pelas ruas…</>
                ) : rotaPorRuas ? (
                  <>Saindo da sede · {rota.ordem.length} parada(s) · <strong className="text-[#10233f] dark:text-slate-200">{rotaPorRuas.km.toFixed(1).replace('.', ',')} km</strong> · cerca de <strong className="text-[#10233f] dark:text-slate-200">{rotaPorRuas.minutos >= 60 ? `${Math.floor(rotaPorRuas.minutos / 60)} h ${rotaPorRuas.minutos % 60} min` : `${rotaPorRuas.minutos} min`}</strong> de carro, na melhor ordem</>
                ) : (
                  <>Rota pelas ruas indisponível agora: ordem pela unidade mais próxima (~{rota.km.toFixed(1).replace('.', ',')} km em linha reta). O Google Maps calcula o trajeto completo.</>
                )}
              </p>
              <ol className="mt-2 space-y-1">
                {rota.ordem.map((u, i) => (
                  <li key={u.id} className="flex items-center gap-2 text-[13px]">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#0b63ce] text-[10px] font-bold text-white">{i + 1}</span>
                    <button type="button" onClick={() => setSelecionada(u.id)} className="min-w-0 flex-1 truncate text-left text-[#10233f] hover:underline dark:text-slate-200">{u.nome}</button>
                    <button type="button" onClick={() => alternarParada(u.id)} aria-label={`Tirar ${u.nome} da rota`} className="grid h-7 w-7 place-items-center rounded text-[#9aaac0] hover:text-rose-600"><X className="h-3.5 w-3.5" /></button>
                  </li>
                ))}
              </ol>
              <a href={linkGoogleMaps(rota.ordem)} target="_blank" rel="noreferrer" className="mt-3 flex h-10 items-center justify-center gap-2 rounded-lg bg-[#0b63ce] text-sm font-bold text-white hover:bg-[#0a56b4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b63ce]">
                <Navigation className="h-4 w-4" aria-hidden="true" /> Abrir rota no Google Maps
              </a>
            </section>
          )}

          <section aria-labelledby="prioridade-titulo" className="rounded-2xl border border-[#e2eaf4] bg-white shadow-[0_10px_30px_-22px_rgba(16,48,96,.45)] dark:border-slate-800 dark:bg-[#121826]">
            <div className="flex items-center justify-between gap-2 border-b border-[#edf2f8] px-4 py-3 dark:border-slate-800">
              <h2 id="prioridade-titulo" className="flex items-center gap-2 text-sm font-extrabold text-[#0d2240] dark:text-slate-100"><Bookmark className="h-4 w-4" aria-hidden="true" /> Prioridade de atendimento</h2>
              {prioridades.length > 8 && (
                <button type="button" onClick={() => setVerTodas((v) => !v)} className="text-xs font-bold text-[#0b63ce] hover:underline dark:text-sky-300">{verTodas ? 'Ver menos' : `Ver todas (${prioridades.length})`}</button>
              )}
            </div>
            {listaPrioridade.length ? (
              <ul className="max-h-[480px] space-y-2 overflow-y-auto p-3">
                {listaPrioridade.map((u) => {
                  const Icone = ICONE_CRITICIDADE[u.criticidade];
                  const naRota = paradas.includes(u.id);
                  return (
                    <li key={u.id} className={cn('flex items-start gap-2.5 rounded-xl border px-2.5 py-2', u.id === selecionada ? 'border-[#0b63ce] bg-[#f3f8ff] dark:bg-sky-500/10' : 'border-[#edf2f8] dark:border-slate-800')}>
                      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full" style={{ background: `${CRITICIDADES[u.criticidade].cor}1a`, color: CRITICIDADES[u.criticidade].cor }}>
                        <Icone className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <button type="button" onClick={() => setSelecionada(u.id)} className="block w-full text-left">
                          <span className="line-clamp-2 text-[13px] font-semibold leading-snug text-[#10233f] hover:underline dark:text-slate-100">{u.nome}</span>
                          <span className="block text-[11px] text-[#5f7391] dark:text-slate-400">{resumoUnidade(u)}{u.bairro ? ` · ${u.bairro}` : ''}</span>
                        </button>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <Etiqueta c={u.criticidade} />
                          <button
                            type="button"
                            onClick={() => alternarParada(u.id)}
                            aria-pressed={naRota}
                            aria-label={naRota ? `Tirar ${u.nome} da rota` : `Adicionar ${u.nome} à rota`}
                            className={cn('rounded-full border px-2 py-0.5 text-[11px] font-bold', naRota ? 'border-[#0b63ce] bg-[#0b63ce] text-white' : 'border-[#b9cfe9] text-[#0b4fa3] hover:bg-[#eef5fe] dark:border-slate-700 dark:text-sky-200')}
                          >
                            {naRota ? '✓ Na rota' : '+ Rota'}
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="flex items-center gap-2 px-4 py-6 text-sm text-[#5f7391] dark:text-slate-400"><CheckCircle2 className="h-4 w-4 text-green-600" aria-hidden="true" /> Nenhuma unidade com pendências{filtrosAtivos ? ' nestes filtros' : ''}.</p>
            )}
          </section>

          {semLocal.length > 0 && (
            <p className="rounded-xl border border-dashed border-[#cfdbea] px-3 py-2 text-xs text-[#5f7391] dark:border-slate-700 dark:text-slate-400">
              {semLocal.length} unidade(s) sem localização cadastrada: {semLocal.map((u) => u.nome).join(', ')}.
            </p>
          )}
        </aside>
      </div>
    </section>
  );
};

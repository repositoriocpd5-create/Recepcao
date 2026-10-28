import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  Bookmark,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  ExternalLink,
  Info,
  Maximize2,
  Minimize2,
  Navigation,
  PanelRight,
  Ellipsis,
  LocateFixed,
  Building2,
  Loader2,
  Plus,
  Route,
  School,
  Search,
  UserRound,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { perfilCco } from '@/lib/modulos';
import { cn } from '@/lib/utils';
import { dataService } from '@/services/dataService';
import { useDetalheNaUrl, useOcorrencias } from '../hooks';
import { DetalheOcorrencia } from '../componentes/DetalheOcorrencia';
import { IMPORTANCIAS, importanciaDe } from '@/services/ccoService';
import { Carregando } from '../componentes/ui';
import { MapaRede } from './MapaRede';
import { useTempoRealCco } from '../tempoReal';
import { CcoOcorrencia } from '@/types';
import {
  CRITICIDADES,
  Criticidade,
  MAX_ROTA,
  PRAZO_DIAS,
  UnidadeMapa,
  distanciaKm,
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

const normalizar = (texto: string) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

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

/**
 * Dropdown customizado de Bairro: exibe contador de ocorrências abertas em vermelho por bairro.
 * Como o <select> nativo não suporta cores por opção, este componente é um popover acessível.
 */
const SelectBairro: React.FC<{
  bairros: string[];
  valor: string;
  onChange: (v: string) => void;
  ocorrenciasPorBairro: Map<string, number>;
}> = ({ bairros, valor, onChange, ocorrenciasPorBairro }) => {
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const idLista = 'bairro-lista';

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => { if (!raiz.current?.contains(e.target as Node)) setAberto(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAberto(false); };
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', fora); document.removeEventListener('keydown', esc); };
  }, [aberto]);

  const rotulo = valor === '' ? 'Bairro (todos)' : valor === '__sem' ? 'Sem bairro' : valor;
  const totalPorBairro = (b: string) => ocorrenciasPorBairro.get(b) ?? 0;
  const totalGeral = [...ocorrenciasPorBairro.values()].reduce((s, n) => s + n, 0);
  const qtdSelecionada = valor === '' ? totalGeral : valor === '__sem' ? 0 : totalPorBairro(valor);

  const selecionar = (v: string) => { onChange(v); setAberto(false); };

  return (
    <div ref={raiz} className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-controls={idLista}
        className={cn(
          campo,
          'flex w-[210px] items-center justify-between gap-1.5 pr-2.5 text-left transition-all',
          valor && valor !== '__sem' && 'border-[#0b63ce] ring-1 ring-[#0b63ce]/30',
        )}
      >
        <div className="flex min-w-0 items-center gap-1.5 truncate">
          <span className="truncate">{rotulo}</span>
          {qtdSelecionada > 0 && (
            <span className="shrink-0 rounded-full bg-rose-600 px-1.5 py-0.2 text-[10px] font-extrabold text-white shadow-sm dark:bg-rose-500">
              {qtdSelecionada}
            </span>
          )}
        </div>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-[#6b7f9b] transition-transform duration-200', aberto && 'rotate-180')} aria-hidden="true" />
      </button>

      {aberto && (
        <div
          id={idLista}
          role="listbox"
          aria-label="Selecionar bairro"
          className="absolute left-0 top-[calc(100%+6px)] z-[1200] w-[min(92vw,280px)] overflow-hidden rounded-xl border border-[#dbe6f3] bg-white shadow-[0_20px_50px_-16px_rgba(16,48,96,.55)] dark:border-slate-700 dark:bg-[#121826]"
        >
          {/* Cabeçalho */}
          <div className="flex items-center justify-between border-b border-[#edf2f8] px-3 py-2 dark:border-slate-800">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#6b7f9b] dark:text-slate-400">Filtrar por bairro</p>
            {totalGeral > 0 && (
              <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                {totalGeral} ocorrência{totalGeral > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <ul className="max-h-72 space-y-1 overflow-y-auto p-1.5">
            {/* Todos */}
            <li>
              <button
                type="button"
                role="option"
                aria-selected={valor === ''}
                onClick={() => selecionar('')}
                className={cn(
                  'flex w-full items-center justify-between rounded-lg px-3 py-2 text-[13px] font-medium transition-colors',
                  valor === ''
                    ? 'bg-[#eaf2fd] font-bold text-[#0b4fa3] dark:bg-sky-500/10 dark:text-sky-200'
                    : 'text-[#10233f] hover:bg-[#f5f9fe] dark:text-slate-200 dark:hover:bg-slate-800/60',
                )}
              >
                <span>Todos os bairros</span>
                {totalGeral > 0 ? (
                  <span className="ml-2 min-w-[22px] rounded-full bg-rose-100 px-2 py-0.5 text-center text-[11px] font-extrabold tabular-nums text-rose-700 dark:bg-rose-500/20 dark:text-rose-300">
                    {totalGeral}
                  </span>
                ) : (
                  <span className="ml-2 min-w-[22px] rounded-full bg-[#f0f4f9] px-2 py-0.5 text-center text-[11px] font-semibold tabular-nums text-[#8a9bb3] dark:bg-slate-800 dark:text-slate-500">
                    0
                  </span>
                )}
              </button>
            </li>

            {/* Bairros */}
            {bairros.map((b) => {
              const qtd = totalPorBairro(b);
              const temOc = qtd > 0;
              const selecionado = valor === b;
              return (
                <li key={b}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selecionado}
                    onClick={() => selecionar(b)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-lg px-3 py-2 text-[13px] font-medium transition-all',
                      temOc
                        ? selecionado
                          ? 'border border-rose-600 bg-rose-600 font-bold text-white shadow-md'
                          : 'border border-rose-300/90 bg-rose-50 text-rose-900 shadow-sm hover:border-rose-400 hover:bg-rose-100 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-200 dark:hover:bg-rose-950/70'
                        : selecionado
                          ? 'bg-[#eaf2fd] font-bold text-[#0b4fa3] dark:bg-sky-500/10 dark:text-sky-200'
                          : 'text-[#10233f] hover:bg-[#f5f9fe] dark:text-slate-200 dark:hover:bg-slate-800/60',
                    )}
                  >
                    <span className="font-semibold">{b}</span>
                    {temOc ? (
                      <span
                        className={cn(
                          'ml-2 min-w-[22px] rounded-full px-2 py-0.5 text-center text-[11px] font-extrabold tabular-nums shadow-sm',
                          selecionado
                            ? 'bg-white text-rose-700'
                            : 'bg-rose-600 text-white dark:bg-rose-500',
                        )}
                      >
                        {qtd}
                      </span>
                    ) : (
                      <span className="ml-2 min-w-[22px] rounded-full bg-[#f0f4f9] px-2 py-0.5 text-center text-[11px] font-semibold tabular-nums text-[#8a9bb3] dark:bg-slate-800 dark:text-slate-500">
                        0
                      </span>
                    )}
                  </button>
                </li>
              );
            })}

            {/* Sem bairro */}
            <li className="border-t border-[#edf2f8] pt-1 dark:border-slate-800">
              <button
                type="button"
                role="option"
                aria-selected={valor === '__sem'}
                onClick={() => selecionar('__sem')}
                className={cn(
                  'flex w-full items-center justify-between rounded-lg px-3 py-2 text-[13px] transition-colors',
                  valor === '__sem'
                    ? 'bg-[#eaf2fd] font-bold text-[#0b4fa3] dark:bg-sky-500/10 dark:text-sky-200'
                    : 'text-[#10233f] hover:bg-[#f5f9fe] dark:text-slate-200 dark:hover:bg-slate-800/60',
                )}
              >
                <span className="italic">Bairro não identificado</span>
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};

/** Mapa Operacional da Rede: visão territorial das unidades e roteirizador de vistorias (administração do CCO). */
export const MapaRedePage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user ? perfilCco(user) === 'admin' : false;
  // Detalhe da ocorrência aberto aqui mesmo, sobre o mapa (?ocorrencia=…), para agir sem sair da tela.
  const detalhe = useDetalheNaUrl();
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
  // Painel lateral: admin pode recolher para dar mais espaço ao mapa.
  const [painelAberto, setPainelAberto] = useState(true);
  // Celular/tablet: o painel vira uma gaveta que sobe de baixo, aberta pelo botão de 3 pontinhos do mapa.
  const [desktop, setDesktop] = useState(() => (typeof window === 'undefined' ? true : window.matchMedia('(min-width: 1280px)').matches));
  const [gavetaAberta, setGavetaAberta] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1280px)');
    const aoMudar = () => { setDesktop(mq.matches); if (mq.matches) setGavetaAberta(false); };
    mq.addEventListener('change', aoMudar);
    return () => mq.removeEventListener('change', aoMudar);
  }, []);
  useEffect(() => {
    if (desktop || !gavetaAberta) return;
    const aoTeclar = (e: KeyboardEvent) => { if (e.key === 'Escape') setGavetaAberta(false); };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [desktop, gavetaAberta]);

  // Origem da rota: sede ou a posição atual do administrador (GPS do aparelho).
  const [origemModo, setOrigemModo] = useState<'sede' | 'minha'>('sede');
  const [minhaPos, setMinhaPos] = useState<{ lat: number; lng: number } | null>(null);
  const [buscandoPos, setBuscandoPos] = useState(false);
  const [erroPos, setErroPos] = useState('');
  const [posAproximada, setPosAproximada] = useState('');
  const usarMinhaLocalizacao = useCallback(() => {
    setErroPos('');
    setPosAproximada('');
    if (!window.isSecureContext) { setErroPos('O navegador só libera a localização em conexão segura (https). Abra o sistema pelo endereço https.'); return; }
    if (!navigator.geolocation) { setErroPos('Este aparelho não permite descobrir a localização.'); return; }
    setBuscandoPos(true);
    let concluido = false;
    const fim = (erro?: string) => {
      if (concluido) return;
      concluido = true;
      window.clearTimeout(vigia);
      setBuscandoPos(false);
      if (erro) setErroPos(erro);
    };
    // Garantia: se o aparelho nunca responder (aviso de permissão ignorado, GPS travado), libera o botão.
    const vigia = window.setTimeout(() => fim('Não recebemos a localização. Confira se o GPS está ligado e a permissão do site está em "Permitir".'), 25_000);
    const sucesso = (p: GeolocationPosition) => {
      if (concluido) return;
      setMinhaPos({ lat: p.coords.latitude, lng: p.coords.longitude });
      setPosAproximada('');
      setOrigemModo('minha');
      fim();
    };
    const falha = (e: GeolocationPositionError) => {
      if (e.code === 1) { fim('Localização bloqueada. Toque no cadeado do endereço, permita "Localização" para este site e tente de novo.'); return; }
      // Computador sem GPS / serviço de localização desligado: usa a posição aproximada pela internet (cidade).
      fetch('https://ipwho.is/')
        .then((r) => r.json())
        .then((d: { success?: boolean; latitude?: number; longitude?: number; city?: string }) => {
          if (concluido) return;
          if (!d.success || typeof d.latitude !== 'number' || typeof d.longitude !== 'number') throw new Error('sem posição');
          setMinhaPos({ lat: d.latitude, lng: d.longitude });
          setOrigemModo('minha');
          setPosAproximada(d.city ? `Posição aproximada (${d.city}), pela internet. Ligue o GPS ou a localização do Windows para mais precisão.` : 'Posição aproximada, pela internet.');
          fim();
        })
        .catch(() => fim('Não foi possível obter a sua localização. Ligue o GPS (ou a localização do Windows) e tente novamente.'));
    };
    // 1ª tentativa: rápida (rede/Wi‑Fi); se falhar por tempo, tenta com GPS de alta precisão.
    navigator.geolocation.getCurrentPosition(sucesso, (e) => {
      if (e.code === 1 || concluido) { falha(e); return; }
      navigator.geolocation.getCurrentPosition(sucesso, falha, { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 });
    }, { enableHighAccuracy: false, timeout: 8_000, maximumAge: 60_000 });
  }, []);
  const origem = origemModo === 'minha' && minhaPos ? minhaPos : SEDE;
  const saindoDaPosicao = origemModo === 'minha' && minhaPos !== null;
  const area = useRef<HTMLElement>(null);
  const menuEscolha = useRef<HTMLDivElement>(null);

  const { comLocal, semLocal } = useMemo(
    () => montarUnidades(unidadesCadastradas.data || [], ocorrencias.data || []),
    [unidadesCadastradas.data, ocorrencias.data],
  );
  const bairros = useMemo(() => [...new Set(comLocal.map((u) => u.bairro).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, 'pt-BR')), [comLocal]);

  // Contagem de ocorrências ABERTAS por bairro (para o dropdown colorido).
  const ocorrenciasPorBairro = useMemo(() => {
    const mapa = new Map<string, number>();
    comLocal.forEach((u) => {
      if (u.bairro && u.abertas.length) {
        mapa.set(u.bairro, (mapa.get(u.bairro) ?? 0) + u.abertas.length);
      }
    });
    return mapa;
  }, [comLocal]);

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
    queryKey: ['cco', 'rota-ruas', [...paradas].sort().join(','), origem.lat.toFixed(4), origem.lng.toFixed(4)],
    queryFn: ({ signal }) => buscarRotaPorRuas(unidadesDaRota, signal, origem),
    enabled: unidadesDaRota.length > 0,
    staleTime: 30 * 60_000,
    retry: 1,
  });
  const retaAprox = useMemo(() => ordenarRota(unidadesDaRota, origem), [unidadesDaRota, origem]);
  const rotaPorRuas = porRuas.data && porRuas.data.ordem.length === unidadesDaRota.length ? porRuas.data : null;
  const rota = { ordem: rotaPorRuas?.ordem ?? retaAprox.ordem, km: rotaPorRuas?.km ?? retaAprox.km };
  const unidadeSelecionada = comLocal.find((u) => u.id === selecionada) || null;
  const filtrosAtivos = Boolean(busca || bairro || filtroCriticidade || filtroStatus);

  // Tempo real: cada nova ocorrência aparece na hora no mapa, com aviso e destaque no marcador.
  const [novas, setNovas] = useState<CcoOcorrencia[]>([]);
  const [destaques, setDestaques] = useState<string[]>([]);
  const estadoTempoReal = useTempoRealCco(useCallback((oc: CcoOcorrencia) => {
    setNovas((atual) => [oc, ...atual.filter((x) => x.id !== oc.id)].slice(0, 3));
    setDestaques((atual) => [...new Set([...atual, oc.unidade_id])]);
    window.setTimeout(() => setNovas((atual) => atual.filter((x) => x.id !== oc.id)), 15_000);
    window.setTimeout(() => setDestaques((atual) => atual.filter((id) => id !== oc.unidade_id)), 60_000);
  }, []));

  /** A mais urgente da unidade: importância (alta → baixa) e, no empate, a mais antiga. */
  const maisUrgente = (u: UnidadeMapa) =>
    [...u.abertas].sort((a, b) =>
      IMPORTANCIAS[importanciaDe(a).nivel].ordem - IMPORTANCIAS[importanciaDe(b).nivel].ordem
      || a.created_at.localeCompare(b.created_at))[0];

  /** Clique na escola do mapa: com ocorrência em aberto, já abre a mais urgente para tomar providências. */
  const clicarNaUnidade = useCallback((id: string) => {
    setSelecionada(id);
    const unidade = comLocal.find((u) => u.id === id);
    if (unidade?.abertas.length) detalhe.abrir(maisUrgente(unidade).id);
    else if (!window.matchMedia('(min-width: 1280px)').matches) setGavetaAberta(true);
  }, [comLocal, detalhe]); // eslint-disable-line react-hooks/exhaustive-deps

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
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 id="mapa-titulo" className="text-2xl font-extrabold tracking-tight text-[#0d2240] sm:text-[28px] dark:text-slate-50">Mapa Operacional da Rede</h1>
          <p className="text-sm text-[#5f7391] dark:text-slate-400">Visão territorial e roteirizador logístico de vistorias</p>
        </div>
        <span
          role="status"
          title={estadoTempoReal === 'ao_vivo' ? 'Conectado: novas ocorrências aparecem na hora, sem recarregar.' : estadoTempoReal === 'demonstracao' ? 'Modo demonstração: atualiza quando outra aba registra.' : 'Reconectando… enquanto isso, o mapa se atualiza a cada minuto.'}
          className={cn(
            'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ring-1',
            estadoTempoReal === 'ao_vivo' || estadoTempoReal === 'demonstracao'
              ? 'bg-green-50 text-green-700 ring-green-200 dark:bg-green-500/10 dark:text-green-300 dark:ring-green-500/30'
              : 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/30',
          )}
        >
          <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
            {estadoTempoReal === 'ao_vivo' && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-60 motion-reduce:animate-none" />}
            <span className={cn('relative inline-flex h-2.5 w-2.5 rounded-full', estadoTempoReal === 'ao_vivo' || estadoTempoReal === 'demonstracao' ? 'bg-green-600' : 'bg-amber-500')} />
          </span>
          {estadoTempoReal === 'ao_vivo' ? 'Ao vivo' : estadoTempoReal === 'demonstracao' ? 'Ao vivo (demonstração)' : estadoTempoReal === 'conectando' ? 'Conectando…' : 'Reconectando…'}
        </span>
      </header>

      {/* Avisos de novas ocorrências (chegam pelo canal em tempo real). */}
      {novas.length > 0 && (
        <div aria-live="polite" className="fixed bottom-24 right-4 z-[1100] flex w-[min(92vw,360px)] flex-col gap-2 md:bottom-6">
          {novas.map((oc) => (
            <div key={oc.id} className="flex items-start gap-3 rounded-2xl border border-[#cfe0f5] bg-white p-3 shadow-[0_18px_40px_-18px_rgba(16,48,96,.6)] dark:border-slate-700 dark:bg-[#121826]">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300"><AlertTriangle className="h-5 w-5" aria-hidden="true" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-extrabold text-[#0d2240] dark:text-slate-100">Nova ocorrência · <span className="font-mono">{oc.protocolo}</span></p>
                <p className="truncate text-xs font-semibold text-[#3b4d68] dark:text-slate-300">{oc.unidade_nome}</p>
                <p className="line-clamp-2 text-xs text-[#5f7391] dark:text-slate-400">{oc.descricao}</p>
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={() => { setSelecionada(oc.unidade_id); setNovas((a) => a.filter((x) => x.id !== oc.id)); }} className="rounded-lg bg-[#0b63ce] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#0a56b4]">Ver no mapa</button>
                  <button type="button" onClick={() => { setSelecionada(oc.unidade_id); detalhe.abrir(oc.id); setNovas((a) => a.filter((x) => x.id !== oc.id)); }} className="rounded-lg border border-[#b9cfe9] px-3 py-1.5 text-xs font-bold text-[#0b4fa3] hover:bg-[#eef5fe] dark:border-slate-700 dark:text-sky-200">Abrir</button>
                </div>
              </div>
              <button type="button" onClick={() => setNovas((a) => a.filter((x) => x.id !== oc.id))} aria-label="Fechar aviso" className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[#9aaac0] hover:bg-[#eef5fe] dark:hover:bg-slate-800"><X className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      )}

      {/* Barra de filtros e ações */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-[200px] flex-1 lg:max-w-[240px]">
          <span className="sr-only">Buscar escola ou bairro</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7f9b]" aria-hidden="true" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar escola ou bairro" className={cn(campo, 'w-full pl-9')} />
        </label>
        <SelectBairro
          bairros={bairros}
          valor={bairro}
          onChange={setBairro}
          ocorrenciasPorBairro={ocorrenciasPorBairro}
        />
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

        {desktop && isAdmin && (
          <button
            type="button"
            onClick={() => setPainelAberto((v) => !v)}
            aria-pressed={painelAberto}
            title={painelAberto ? 'Recolher painel lateral (mais espaço para o mapa)' : 'Expandir painel lateral'}
            className={cn(
              botaoBarra,
              painelAberto
                ? 'border-[#0b63ce] bg-[#eef5fe] font-bold text-[#0b4fa3] dark:bg-sky-500/15 dark:text-sky-200'
                : 'text-[#5f7391] hover:bg-[#eef5fe] dark:text-slate-400 dark:hover:bg-slate-800',
            )}
          >
            <PanelRight className="h-4 w-4" aria-hidden="true" />
            <span>{painelAberto ? 'Recolher painel' : 'Expandir painel'}</span>
          </button>
        )}
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

      {/* Grade: mapa + painel lateral */}
      <div className={cn(
        'grid grid-cols-1 gap-4',
        isAdmin && painelAberto ? 'xl:grid-cols-[minmax(0,1fr)_340px]' : 'xl:grid-cols-1',
      )}>
        {/* Mapa */}
        <div className={cn('relative isolate z-0 overflow-hidden rounded-2xl border border-[#e2eaf4] bg-white shadow-[0_10px_30px_-22px_rgba(16,48,96,.45)] dark:border-slate-800', telaCheia ? 'h-[calc(100vh-260px)]' : 'h-[460px] sm:h-[560px]')}>
          <MapaRede unidades={filtradas} selecionada={selecionada} rota={rota.ordem} trajeto={rotaPorRuas?.trajeto} minhaPosicao={saindoDaPosicao ? minhaPos : null} destaques={destaques} onSelecionar={clicarNaUnidade} />
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
          {/* Celular/tablet: 3 pontinhos abrem o painel lateral como gaveta */}
          {!desktop && (
            <button
              type="button"
              onClick={() => setGavetaAberta(true)}
              aria-label="Abrir painel lateral"
              aria-haspopup="dialog"
              className="absolute left-3 top-3 z-[600] grid h-10 w-14 place-items-center rounded-xl border-2 border-[#0d2240] bg-white/95 text-[#0b4fa3] shadow-lg backdrop-blur-sm transition active:scale-95 dark:border-slate-700 dark:bg-[#121826]/95 dark:text-sky-300"
            >
              <Ellipsis className="h-5 w-5" aria-hidden="true" />
              {prioridades.length > 0 && (
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-extrabold text-white ring-2 ring-white dark:ring-[#121826]">{prioridades.length > 99 ? '99+' : prioridades.length}</span>
              )}
            </button>
          )}
          {/* Desktop (admin): abrir painel lateral quando recolhido */}
          {desktop && isAdmin && !painelAberto && (
            <button
              type="button"
              onClick={() => setPainelAberto(true)}
              title="Abrir painel lateral"
              className="absolute right-3 top-3 z-[600] flex items-center gap-1.5 rounded-xl border border-[#cfe0f5] bg-white/95 px-3 py-2 text-xs font-bold text-[#0b4fa3] shadow-md backdrop-blur-sm transition-colors hover:bg-white dark:border-slate-700 dark:bg-[#121826]/90 dark:text-sky-300"
            >
              <PanelRight className="h-4 w-4" aria-hidden="true" />
              Painel
            </button>
          )}
        </div>

        {/* Painel lateral — admin pode recolher para dar mais espaço ao mapa */}
        {!desktop && gavetaAberta && (
          <div className="fixed inset-0 z-[999] bg-[#06142b]/50 backdrop-blur-[2px]" onClick={() => setGavetaAberta(false)} aria-hidden="true" />
        )}
        {(desktop ? (!isAdmin || painelAberto) : gavetaAberta) && (
          <aside
            role={desktop ? undefined : 'dialog'}
            aria-modal={desktop ? undefined : true}
            aria-label={desktop ? undefined : 'Painel lateral'}
            className={desktop
              ? 'space-y-4'
              : 'fixed inset-x-0 bottom-0 z-[1000] max-h-[86dvh] space-y-4 overflow-y-auto overscroll-contain rounded-t-3xl border-t border-[#cfe0f5] bg-[#f4f8fd] px-4 pb-[calc(24px+env(safe-area-inset-bottom))] pt-0 shadow-[0_-24px_60px_-12px_rgba(8,43,87,.45)] dark:border-slate-700 dark:bg-[#0f1422]'}
          >
            {/* Gaveta (celular): alça + título + fechar, fixos no topo */}
            {!desktop && (
              <div className="sticky top-0 z-10 -mx-4 border-b border-[#e2eaf4] bg-[#f4f8fd]/95 px-4 pb-2 pt-2.5 backdrop-blur dark:border-slate-800 dark:bg-[#0f1422]/95">
                <span className="mx-auto mb-2 block h-1.5 w-10 rounded-full bg-[#c4d4e8] dark:bg-slate-600" aria-hidden="true" />
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-[15px] font-extrabold text-[#0d2240] dark:text-slate-100"><PanelRight className="h-4 w-4 text-[#0b63ce]" aria-hidden="true" /> Painel lateral</span>
                  <button type="button" onClick={() => setGavetaAberta(false)} aria-label="Fechar painel lateral" className="grid h-10 w-10 place-items-center rounded-full text-[#5f7391] hover:bg-[#e6f0fc] dark:text-slate-300 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
                </div>
              </div>
            )}
            {/* Cabeçalho do painel (só admin, desktop) com botão de fechar */}
            {desktop && isAdmin && (
              <div className="flex items-center justify-between rounded-xl border border-[#e2eaf4] bg-white px-4 py-2.5 shadow-sm dark:border-slate-800 dark:bg-[#121826]">
                <span className="flex items-center gap-2 text-sm font-bold text-[#0d2240] dark:text-slate-100">
                  <PanelRight className="h-4 w-4 text-[#0b63ce]" aria-hidden="true" />
                  Painel lateral
                </span>
                <button
                  type="button"
                  onClick={() => setPainelAberto(false)}
                  title="Recolher painel — mais espaço para o mapa"
                  aria-label="Recolher painel lateral"
                  className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-bold text-[#6b7f9b] transition-colors hover:bg-[#f0f6fe] hover:text-[#0b4fa3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0b63ce] dark:hover:bg-slate-800 dark:hover:text-sky-300"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  Recolher
                </button>
              </div>
            )}

            <section aria-label="Origem da rota" className="rounded-2xl border border-[#e2eaf4] bg-white p-3 shadow-[0_10px_30px_-22px_rgba(16,48,96,.45)] dark:border-slate-800 dark:bg-[#121826]">
              <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-[#6b7f9b] dark:text-slate-400">Rota saindo de</p>
              <div role="radiogroup" aria-label="Origem da rota" className="grid grid-cols-2 gap-1.5 rounded-xl bg-[#eef3fa] p-1 dark:bg-slate-800/70">
                <button type="button" role="radio" aria-checked={origemModo === 'sede'} onClick={() => setOrigemModo('sede')}
                  className={cn('flex h-11 items-center justify-center gap-1.5 rounded-lg text-[13px] font-bold transition', origemModo === 'sede' ? 'bg-white text-[#0b4fa3] shadow dark:bg-[#121826] dark:text-sky-300' : 'text-[#5f7391] dark:text-slate-400')}>
                  <Building2 className="h-4 w-4" aria-hidden="true" /> Sede
                </button>
                <button type="button" role="radio" aria-checked={origemModo === 'minha'} disabled={buscandoPos}
                  onClick={() => (minhaPos ? setOrigemModo('minha') : usarMinhaLocalizacao())}
                  className={cn('flex h-11 items-center justify-center gap-1.5 rounded-lg text-[13px] font-bold transition disabled:opacity-70', origemModo === 'minha' ? 'bg-white text-[#0b4fa3] shadow dark:bg-[#121826] dark:text-sky-300' : 'text-[#5f7391] dark:text-slate-400')}>
                  {buscandoPos ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <LocateFixed className="h-4 w-4" aria-hidden="true" />} Minha localização
                </button>
              </div>
              {posAproximada && !erroPos && <p role="status" className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">{posAproximada}</p>}
              {erroPos && <p role="alert" className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{erroPos}</p>}
              {saindoDaPosicao && (
                <button type="button" onClick={usarMinhaLocalizacao} disabled={buscandoPos} className="mt-2 text-xs font-bold text-[#0b63ce] hover:underline dark:text-sky-300">Atualizar minha posição</button>
              )}
            </section>

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
                        <button type="button" onClick={() => detalhe.abrir(oc.id)} className="flex w-full items-start gap-2 rounded-lg bg-[#f5f8fc] px-2.5 py-2 text-left text-xs hover:bg-[#eaf2fd] dark:bg-slate-800/60 dark:hover:bg-slate-800">
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
                  <a href={comoChegar(unidadeSelecionada, origem)} target="_blank" rel="noreferrer" className={cn(botaoBarra, 'h-9 text-[#0b63ce] hover:bg-[#eef5fe] dark:text-sky-300 dark:hover:bg-slate-800')}>
                    <Navigation className="h-4 w-4" aria-hidden="true" /> {saindoDaPosicao ? 'Como chegar daqui' : 'Como chegar'}
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
                    <>Saindo {saindoDaPosicao ? 'da sua localização' : 'da sede'} ·{rota.ordem.length} parada(s) · <strong className="text-[#10233f] dark:text-slate-200">{rotaPorRuas.km.toFixed(1).replace('.', ',')} km</strong> · cerca de <strong className="text-[#10233f] dark:text-slate-200">{rotaPorRuas.minutos >= 60 ? `${Math.floor(rotaPorRuas.minutos / 60)} h ${rotaPorRuas.minutos % 60} min` : `${rotaPorRuas.minutos} min`}</strong> de carro, na melhor ordem</>
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
                <a href={linkGoogleMaps(rota.ordem, origem)} target="_blank" rel="noreferrer" className="mt-3 flex h-10 items-center justify-center gap-2 rounded-lg bg-[#0b63ce] text-sm font-bold text-white hover:bg-[#0a56b4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b63ce]">
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
        )}
      </div>
      <DetalheOcorrencia ocorrenciaId={detalhe.id} user={user!} onFechar={detalhe.fechar} />
    </section>
  );
};

import React, { useEffect, useMemo, useState } from 'react';
import {
  FileSpreadsheet,
  ShieldAlert,
  Download,
  RefreshCw,
  Search,
  X,
  CalendarRange,
  User,
  Database,
  MonitorSmartphone,
  SlidersHorizontal,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  LogIn,
  ScanSearch,
  ArrowRightLeft,
  BadgeCheck,
  UserPlus,
  Users,
  CheckCircle2,
  CircleDot,
  MoonStar,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Activity,
  Eye,
  Camera,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { dataService } from '@/services/dataService';
import { AuditoriaLog } from '@/types';
import { cn, formatDateTime } from '@/lib/utils';

// ─── Catálogo de ações ───────────────────────────────────────────────────────

type CategoriaId = 'acesso' | 'lgpd' | 'movimentacoes' | 'crachas' | 'cadastros' | 'usuarios' | 'autorizacoes' | 'cco' | 'outros';

const CATEGORIAS: Record<CategoriaId, { rotulo: string; icone: typeof LogIn; cor: string; chipAtivo: string }> = {
  acesso: { rotulo: 'Acesso ao sistema', icone: LogIn, cor: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700', chipAtivo: 'from-slate-600 to-slate-800' },
  lgpd: { rotulo: 'Consultas LGPD', icone: ScanSearch, cor: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/30', chipAtivo: 'from-sky-500 to-sky-700' },
  movimentacoes: { rotulo: 'Movimentações', icone: ArrowRightLeft, cor: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30', chipAtivo: 'from-emerald-500 to-emerald-700' },
  crachas: { rotulo: 'Crachás e QR', icone: BadgeCheck, cor: 'bg-cyan-50 text-cyan-700 ring-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-300 dark:ring-cyan-500/30', chipAtivo: 'from-cyan-500 to-cyan-700' },
  cadastros: { rotulo: 'Cadastros', icone: UserPlus, cor: 'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/30', chipAtivo: 'from-violet-500 to-violet-700' },
  usuarios: { rotulo: 'Usuários e permissões', icone: Users, cor: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30', chipAtivo: 'from-rose-500 to-rose-700' },
  autorizacoes: { rotulo: 'Autorizações', icone: CheckCircle2, cor: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30', chipAtivo: 'from-amber-500 to-amber-600' },
  cco: { rotulo: 'CCO — ocorrências', icone: Camera, cor: 'bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-500/30', chipAtivo: 'from-indigo-500 to-indigo-700' },
  outros: { rotulo: 'Outros', icone: CircleDot, cor: 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700', chipAtivo: 'from-slate-500 to-slate-700' },
};

const ACOES: Record<string, { rotulo: string; categoria: CategoriaId; sensivel?: boolean }> = {
  LOGIN: { rotulo: 'Entrada no sistema', categoria: 'acesso' },
  LOGOUT: { rotulo: 'Saída do sistema', categoria: 'acesso' },
  CONSULTA_CPF: { rotulo: 'Consulta de CPF', categoria: 'lgpd', sensivel: true },
  CONSULTA_MATRICULA: { rotulo: 'Consulta de matrícula', categoria: 'lgpd' },
  REGISTRO_ENTRADA: { rotulo: 'Registro de entrada', categoria: 'movimentacoes' },
  REGISTRO_SAIDA: { rotulo: 'Registro de saída', categoria: 'movimentacoes' },
  EDICAO_ADMINISTRATIVA_MOVIMENTACAO: { rotulo: 'Edição de movimentação', categoria: 'movimentacoes', sensivel: true },
  EXCLUSAO_ADMINISTRATIVA_MOVIMENTACAO: { rotulo: 'Exclusão de movimentação', categoria: 'movimentacoes', sensivel: true },
  ATRIBUICAO_CRACHA: { rotulo: 'Crachá entregue', categoria: 'crachas' },
  DEVOLUCAO_CRACHA: { rotulo: 'Crachá devolvido', categoria: 'crachas' },
  PENDENCIA_CRACHA: { rotulo: 'Pendência de crachá', categoria: 'crachas' },
  EMISSAO_QR: { rotulo: 'QR Code emitido', categoria: 'crachas' },
  VALIDACAO_QR: { rotulo: 'QR Code validado', categoria: 'crachas' },
  CADASTRO_VISITANTE: { rotulo: 'Cadastro de visitante', categoria: 'cadastros' },
  CADASTRO_FOTO_VISITANTE: { rotulo: 'Foto de visitante', categoria: 'cadastros', sensivel: true },
  CADASTRO_DIGITAL_VISITANTE: { rotulo: 'Digital de visitante', categoria: 'cadastros', sensivel: true },
  ATUALIZAR_CONTATO_SERVIDOR: { rotulo: 'Contato de servidor atualizado', categoria: 'cadastros' },
  IMPORT: { rotulo: 'Importação de dados', categoria: 'cadastros', sensivel: true },
  CRIAR_USUARIO: { rotulo: 'Usuário criado', categoria: 'usuarios', sensivel: true },
  ATUALIZAR_USUARIO: { rotulo: 'Usuário alterado', categoria: 'usuarios', sensivel: true },
  EXCLUIR_USUARIO: { rotulo: 'Usuário removido', categoria: 'usuarios', sensivel: true },
  RESPOSTA_AUTORIZACAO: { rotulo: 'Resposta de autorização', categoria: 'autorizacoes' },
  CCO_REGISTRO: { rotulo: 'Ocorrência registrada (CCO)', categoria: 'cco' },
  CCO_ATUALIZACAO: { rotulo: 'Atendimento de ocorrência (CCO)', categoria: 'cco' },
  CCO_TERMINO: { rotulo: 'Horário final de ocorrência (CCO)', categoria: 'cco' },
  CCO_FINALIZACAO: { rotulo: 'Ocorrência finalizada (CCO)', categoria: 'cco' },
  CCO_REABERTURA: { rotulo: 'Ocorrência reaberta (CCO)', categoria: 'cco', sensivel: true },
};

/** Ação desconhecida: deduz a categoria pelo código e deixa o rótulo legível. */
const infoAcao = (codigo: string) => {
  const conhecida = ACOES[codigo];
  if (conhecida) return conhecida;
  const c = codigo.toUpperCase();
  const categoria: CategoriaId =
    c.startsWith('CCO') ? 'cco'
    : c.includes('CONSULTA') ? 'lgpd'
    : c.includes('ENTRADA') || c.includes('SAIDA') || c.includes('MOVIMENT') ? 'movimentacoes'
    : c.includes('CRACHA') || c.includes('QR') ? 'crachas'
    : c.includes('USUARIO') ? 'usuarios'
    : c.includes('AUTORIZ') ? 'autorizacoes'
    : c.includes('CADASTRO') || c.includes('IMPORT') ? 'cadastros'
    : c.includes('LOGIN') || c.includes('LOGOUT') ? 'acesso'
    : 'outros';
  const rotulo = codigo.toLowerCase().replace(/_/g, ' ').replace(/^./, (l) => l.toUpperCase());
  return { rotulo, categoria, sensivel: /EXCLU|DELET|REMOV/.test(c) };
};

const TABELAS: Record<string, string> = {
  movimentacoes: 'Movimentações',
  servidores: 'Servidores',
  visitantes: 'Visitantes',
  profiles: 'Usuários',
  crachas: 'Crachás',
  autorizacoes: 'Autorizações',
  agendamentos: 'Agendamentos',
  setores: 'Setores',
  departamentos: 'Departamentos',
  ramais_unidades: 'Ramais',
  cco_ocorrencias: 'Ocorrências do CCO',
};
const nomeTabela = (tabela?: string) => (tabela ? TABELAS[tabela] || tabela : 'Sem entidade');

/** Fim de semana ou antes das 7h / a partir das 19h (horário local). */
const foraDoExpediente = (iso: string) => {
  const data = new Date(iso);
  const dia = data.getDay();
  const hora = data.getHours();
  return dia === 0 || dia === 6 || hora < 7 || hora >= 19;
};

const normalizar = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const valorLegivel = (valor: unknown): string => {
  if (valor === null || valor === undefined || valor === '') return '—';
  if (typeof valor === 'boolean') return valor ? 'sim' : 'não';
  if (typeof valor === 'object') return JSON.stringify(valor);
  return String(valor);
};

// ─── Período ────────────────────────────────────────────────────────────────

type PeriodoId = 'hoje' | '7d' | '30d' | '90d' | 'personalizado';
const PERIODOS: { id: PeriodoId; rotulo: string; dias?: number }[] = [
  { id: 'hoje', rotulo: 'Hoje', dias: 0 },
  { id: '7d', rotulo: '7 dias', dias: 6 },
  { id: '30d', rotulo: '30 dias', dias: 29 },
  { id: '90d', rotulo: '90 dias', dias: 89 },
  { id: 'personalizado', rotulo: 'Personalizado' },
];

const paraDataInput = (data: Date) => {
  const d = new Date(data.getTime() - data.getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 10);
};
const inicioDoDia = (yyyyMmDd: string) => new Date(`${yyyyMmDd}T00:00:00`).toISOString();
const fimDoDia = (yyyyMmDd: string) => new Date(`${yyyyMmDd}T23:59:59.999`).toISOString();
const formatarDia = (yyyyMmDd: string) => yyyyMmDd.split('-').reverse().join('/');

// Limite de eventos carregados por período (os mais recentes).
const LIMITE = 2000;
const POR_PAGINA = 50;

// ─── Estilos compartilhados ─────────────────────────────────────────────────

const campoClasse =
  'h-10 w-full rounded-xl border border-[#d4e0ee] bg-white px-3 text-sm text-[#102755] outline-none transition-shadow placeholder:text-[#9aabc3] focus:border-[#0d6efd] focus:ring-4 focus:ring-[#0d6efd]/15 dark:border-slate-700 dark:bg-[#0f1524] dark:text-slate-100 dark:[color-scheme:dark]';
const rotuloClasse = 'mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#627fa5] dark:text-slate-400';

const CampoComIcone: React.FC<{ icone: React.ReactNode; children: React.ReactNode }> = ({ icone, children }) => (
  <div className="relative">
    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8aa0bf]">{icone}</span>
    {children}
  </div>
);

const Interruptor: React.FC<{ ativo: boolean; onChange: () => void; icone: React.ReactNode; titulo: string; dica: string; tom: 'rosa' | 'indigo' }> = ({ ativo, onChange, icone, titulo, dica, tom }) => (
  <button
    type="button"
    role="switch"
    aria-checked={ativo}
    onClick={onChange}
    className={cn(
      'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all',
      ativo
        ? tom === 'rosa'
          ? 'border-rose-300 bg-rose-50 shadow-[0_8px_18px_-14px_rgba(225,29,72,.8)] dark:border-rose-500/40 dark:bg-rose-500/10'
          : 'border-indigo-300 bg-indigo-50 shadow-[0_8px_18px_-14px_rgba(79,70,229,.8)] dark:border-indigo-500/40 dark:bg-indigo-500/10'
        : 'border-[#e1e9f4] bg-white hover:border-[#c5d7ec] dark:border-slate-800 dark:bg-[#0f1524] dark:hover:border-slate-700'
    )}
  >
    <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-lg', tom === 'rosa' ? 'bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300' : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300')}>{icone}</span>
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-bold text-[#102755] dark:text-slate-100">{titulo}</span>
      <span className="block text-[11px] leading-snug text-[#627fa5] dark:text-slate-400">{dica}</span>
    </span>
    <span className={cn('relative h-6 w-10 shrink-0 rounded-full transition-colors', ativo ? (tom === 'rosa' ? 'bg-rose-500' : 'bg-indigo-500') : 'bg-[#d4e0ee] dark:bg-slate-700')}>
      <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', ativo ? 'left-[18px]' : 'left-0.5')} />
    </span>
  </button>
);

// ─── Página ─────────────────────────────────────────────────────────────────

export const RelatoriosPage: React.FC = () => {
  const hoje = paraDataInput(new Date());
  const [logs, setLogs] = useState<AuditoriaLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Período (consultado no banco)
  const [periodo, setPeriodo] = useState<PeriodoId>('7d');
  const [de, setDe] = useState(() => paraDataInput(new Date(Date.now() - 6 * 86400000)));
  const [ate, setAte] = useState(hoje);

  // Filtros (aplicados na tela)
  const [busca, setBusca] = useState('');
  const [categorias, setCategorias] = useState<Set<CategoriaId>>(new Set());
  const [acao, setAcao] = useState('');
  const [operador, setOperador] = useState('');
  const [tabela, setTabela] = useState('');
  const [terminal, setTerminal] = useState('');
  const [somenteSensiveis, setSomenteSensiveis] = useState(false);
  const [somenteForaExpediente, setSomenteForaExpediente] = useState(false);
  const [ordem, setOrdem] = useState<'desc' | 'asc'>('desc');
  const [pagina, setPagina] = useState(1);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [detalhe, setDetalhe] = useState<AuditoriaLog | null>(null);
  const [copiado, setCopiado] = useState(false);

  const escolherPeriodo = (id: PeriodoId) => {
    setPeriodo(id);
    const dias = PERIODOS.find((p) => p.id === id)?.dias;
    if (dias !== undefined) {
      setDe(paraDataInput(new Date(Date.now() - dias * 86400000)));
      setAte(hoje);
    }
  };

  const carregarLogs = async () => {
    setIsLoading(true);
    setErro(null);
    try {
      const inicio = de <= ate ? de : ate;
      const fim = de <= ate ? ate : de;
      setLogs(await dataService.getLogsAuditoria({ desde: inicioDoDia(inicio), ate: fimDoDia(fim), limite: LIMITE }));
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível carregar a auditoria.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void carregarLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [de, ate]);

  useEffect(() => setPagina(1), [busca, categorias, acao, operador, tabela, terminal, somenteSensiveis, somenteForaExpediente, ordem, logs]);

  /** Aplica todos os filtros da tela; `ignorar` permite contar as opções de um filtro sem ele mesmo. */
  const passa = (log: AuditoriaLog, ignorar?: 'categoria' | 'acao' | 'operador' | 'tabela') => {
    const info = infoAcao(log.acao);
    if (ignorar !== 'categoria' && categorias.size && !categorias.has(info.categoria)) return false;
    if (ignorar !== 'acao' && acao && log.acao !== acao) return false;
    if (ignorar !== 'operador' && operador && (log.usuario_email || 'sistema') !== operador) return false;
    if (ignorar !== 'tabela' && tabela && (log.tabela || '') !== tabela) return false;
    if (terminal && !normalizar(log.ip_origem || '').includes(normalizar(terminal))) return false;
    if (somenteSensiveis && !info.sensivel) return false;
    if (somenteForaExpediente && !foraDoExpediente(log.created_at)) return false;
    if (busca.trim()) {
      const alvo = normalizar(`${log.acao} ${info.rotulo} ${log.usuario_email || ''} ${log.tabela || ''} ${log.registro_id || ''} ${log.ip_origem || ''} ${JSON.stringify(log.detalhes || {})}`);
      if (!normalizar(busca).split(/\s+/).filter(Boolean).every((termo) => alvo.includes(termo))) return false;
    }
    return true;
  };

  const filtrados = useMemo(() => {
    const lista = logs.filter((log) => passa(log));
    return ordem === 'desc' ? lista : [...lista].reverse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logs, busca, categorias, acao, operador, tabela, terminal, somenteSensiveis, somenteForaExpediente, ordem]);

  /** Opções de um filtro com quantos eventos cada uma teria com os demais filtros aplicados. */
  const contar = (ignorar: 'categoria' | 'acao' | 'operador' | 'tabela', chave: (log: AuditoriaLog) => string) => {
    const mapa = new Map<string, number>();
    logs.forEach((log) => { if (passa(log, ignorar)) mapa.set(chave(log), (mapa.get(chave(log)) || 0) + 1); });
    return mapa;
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const porCategoria = useMemo(() => contar('categoria', (l) => infoAcao(l.acao).categoria), [filtrados, logs]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const porAcao = useMemo(() => [...contar('acao', (l) => l.acao)].sort((a, b) => b[1] - a[1]), [filtrados, logs]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const porOperador = useMemo(() => [...contar('operador', (l) => l.usuario_email || 'sistema')].sort((a, b) => b[1] - a[1]), [filtrados, logs]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const porTabela = useMemo(() => [...contar('tabela', (l) => l.tabela || '')].sort((a, b) => b[1] - a[1]), [filtrados, logs]);

  const resumo = useMemo(() => ({
    operadores: new Set(filtrados.map((l) => l.usuario_email || 'sistema')).size,
    lgpd: filtrados.filter((l) => infoAcao(l.acao).categoria === 'lgpd').length,
    sensiveis: filtrados.filter((l) => infoAcao(l.acao).sensivel).length,
    foraExpediente: filtrados.filter((l) => foraDoExpediente(l.created_at)).length,
  }), [filtrados]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const visiveis = filtrados.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA);

  const alternarCategoria = (id: CategoriaId) =>
    setCategorias((atual) => {
      const nova = new Set(atual);
      if (nova.has(id)) nova.delete(id); else nova.add(id);
      return nova;
    });

  const limparFiltros = () => {
    setBusca(''); setCategorias(new Set()); setAcao(''); setOperador(''); setTabela(''); setTerminal('');
    setSomenteSensiveis(false); setSomenteForaExpediente(false);
  };

  // Filtros ativos em forma de etiquetas removíveis.
  const ativos: { chave: string; rotulo: string; remover: () => void }[] = [
    ...(busca.trim() ? [{ chave: 'busca', rotulo: `“${busca.trim()}”`, remover: () => setBusca('') }] : []),
    ...[...categorias].map((id) => ({ chave: `cat-${id}`, rotulo: CATEGORIAS[id].rotulo, remover: () => alternarCategoria(id) })),
    ...(acao ? [{ chave: 'acao', rotulo: infoAcao(acao).rotulo, remover: () => setAcao('') }] : []),
    ...(operador ? [{ chave: 'op', rotulo: operador, remover: () => setOperador('') }] : []),
    ...(tabela ? [{ chave: 'tab', rotulo: nomeTabela(tabela), remover: () => setTabela('') }] : []),
    ...(terminal ? [{ chave: 'ip', rotulo: `Terminal: ${terminal}`, remover: () => setTerminal('') }] : []),
    ...(somenteSensiveis ? [{ chave: 'sens', rotulo: 'Somente sensíveis', remover: () => setSomenteSensiveis(false) }] : []),
    ...(somenteForaExpediente ? [{ chave: 'fora', rotulo: 'Fora do expediente', remover: () => setSomenteForaExpediente(false) }] : []),
  ];

  const exportarCsv = () => {
    const celula = (valor: string) => `"${valor.replace(/"/g, '""')}"`;
    const cabecalho = ['Data/Hora', 'Ação', 'Código', 'Categoria', 'Operador', 'Entidade', 'Registro', 'Terminal/IP', 'Fora do expediente', 'Detalhes'];
    const linhas = filtrados.map((l) => {
      const info = infoAcao(l.acao);
      return [
        formatDateTime(l.created_at), info.rotulo, l.acao, CATEGORIAS[info.categoria].rotulo, l.usuario_email || 'sistema',
        nomeTabela(l.tabela), l.registro_id || '', l.ip_origem || '', foraDoExpediente(l.created_at) ? 'sim' : 'não', JSON.stringify(l.detalhes || {}),
      ].map(celula).join(';');
    });
    const blob = new Blob(['﻿' + [cabecalho.map(celula).join(';'), ...linhas].join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `auditoria_smedu_${de}_a_${ate}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const copiarDetalhe = async () => {
    if (!detalhe) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(detalhe, null, 2));
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 1800);
    } catch { /* área de transferência indisponível */ }
  };

  const BadgeAcao: React.FC<{ log: AuditoriaLog }> = ({ log }) => {
    const info = infoAcao(log.acao);
    const Icone = CATEGORIAS[info.categoria].icone;
    return (
      <span className={cn('inline-flex max-w-full items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-bold ring-1', CATEGORIAS[info.categoria].cor)} title={log.acao}>
        <Icone className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{info.rotulo}</span>
        {info.sensivel && <ShieldAlert className="h-3 w-3 shrink-0 text-rose-500" aria-label="Ação sensível" />}
      </span>
    );
  };

  const ResumoDetalhes: React.FC<{ detalhes: Record<string, unknown> }> = ({ detalhes }) => {
    const pares = Object.entries(detalhes || {});
    if (!pares.length) return <span className="text-[#9aabc3] dark:text-slate-500">—</span>;
    return (
      <span className="flex flex-wrap gap-1">
        {pares.slice(0, 3).map(([chave, valor]) => (
          <span key={chave} className="inline-flex max-w-[220px] items-center gap-1 rounded-md bg-[#f2f6fb] px-1.5 py-0.5 text-[10px] text-[#37475e] dark:bg-slate-800 dark:text-slate-300">
            <span className="font-semibold text-[#627fa5] dark:text-slate-400">{chave.replace(/_/g, ' ')}:</span>
            <span className="truncate font-mono">{valorLegivel(valor)}</span>
          </span>
        ))}
        {pares.length > 3 && <span className="rounded-md px-1 py-0.5 text-[10px] font-bold text-[#0b5ed7] dark:text-sky-300">+{pares.length - 3}</span>}
      </span>
    );
  };

  const cartoesResumo = [
    { rotulo: 'Eventos', valor: filtrados.length, icone: Activity, cor: 'text-[#005a9c] bg-[#e6f1fb] dark:bg-sky-500/10 dark:text-sky-300', acao: undefined as undefined | (() => void), ativo: false },
    { rotulo: 'Operadores', valor: resumo.operadores, icone: User, cor: 'text-slate-700 bg-slate-100 dark:bg-slate-800 dark:text-slate-200', acao: undefined, ativo: false },
    { rotulo: 'Consultas LGPD', valor: resumo.lgpd, icone: ScanSearch, cor: 'text-sky-700 bg-sky-50 dark:bg-sky-500/10 dark:text-sky-300', acao: () => alternarCategoria('lgpd'), ativo: categorias.has('lgpd') },
    { rotulo: 'Ações sensíveis', valor: resumo.sensiveis, icone: ShieldAlert, cor: 'text-rose-700 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-300', acao: () => setSomenteSensiveis((v) => !v), ativo: somenteSensiveis },
    { rotulo: 'Fora do expediente', valor: resumo.foraExpediente, icone: MoonStar, cor: 'text-indigo-700 bg-indigo-50 dark:bg-indigo-500/10 dark:text-indigo-300', acao: () => setSomenteForaExpediente((v) => !v), ativo: somenteForaExpediente },
  ];

  const qtdFiltrosAvancados = [acao, operador, tabela, terminal].filter(Boolean).length + Number(somenteSensiveis) + Number(somenteForaExpediente);

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-[#c5e0fa] bg-[#e6f1fb] text-[#005a9c] shadow-sm dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300">
              <FileSpreadsheet className="h-5 w-5" />
            </span>
            <h2 className="text-xl font-extrabold tracking-tight text-[#102755] sm:text-2xl dark:text-slate-100">Relatórios & Auditoria de Segurança</h2>
          </div>
          <p className="mt-1.5 text-xs text-[#627fa5] sm:text-sm dark:text-slate-400">Trilha de auditoria em conformidade com a LGPD: quem fez o quê, quando e de onde.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={carregarLogs} disabled={isLoading} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#d4e0ee] bg-white px-3.5 text-sm font-semibold text-[#37475e] shadow-sm transition-colors hover:border-[#9fc9ed] disabled:opacity-60 dark:border-slate-700 dark:bg-[#121826] dark:text-slate-200">
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} /> Atualizar
          </button>
          <button type="button" onClick={exportarCsv} disabled={!filtrados.length} className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-b from-[#1f7be6] to-[#0647c4] px-3.5 text-sm font-bold text-white shadow-[0_10px_20px_-10px_rgba(6,71,196,.8)] transition-opacity hover:opacity-95 disabled:opacity-50">
            <Download className="h-4 w-4" /> Exportar CSV <span className="rounded-md bg-white/20 px-1.5 text-[11px] tabular-nums">{filtrados.length}</span>
          </button>
        </div>
      </div>

      {/* Período */}
      <section className="rounded-2xl border border-[#dce4f0] bg-white p-4 shadow-[0_12px_28px_-22px_rgba(18,44,82,.45)] dark:border-slate-800 dark:bg-[#121826]">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
          <div className="min-w-0 flex-1">
            <p className={rotuloClasse}><CalendarRange className="h-3.5 w-3.5" /> Período</p>
            <div className="flex gap-1 overflow-x-auto rounded-xl border border-[#e1e9f4] bg-[#f4f8fd] p-1 [scrollbar-width:none] dark:border-slate-800 dark:bg-[#0b0f19] [&::-webkit-scrollbar]:hidden" role="radiogroup" aria-label="Período">
              {PERIODOS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={periodo === p.id}
                  onClick={() => escolherPeriodo(p.id)}
                  className={cn('min-h-9 flex-1 whitespace-nowrap rounded-lg px-3 text-xs font-bold transition-all', periodo === p.id ? 'bg-white text-[#005a9c] shadow-[0_4px_12px_-6px_rgba(0,90,156,.5)] dark:bg-sky-500/20 dark:text-sky-200' : 'text-[#627fa5] hover:text-[#102755] dark:text-slate-400 dark:hover:text-slate-200')}
                >
                  {p.rotulo}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 xl:w-[340px]">
            <label>
              <span className={rotuloClasse}>De</span>
              <input type="date" value={de} max={hoje} onChange={(e) => { setDe(e.target.value); setPeriodo('personalizado'); }} className={campoClasse} />
            </label>
            <label>
              <span className={rotuloClasse}>Até</span>
              <input type="date" value={ate} max={hoje} onChange={(e) => { setAte(e.target.value); setPeriodo('personalizado'); }} className={campoClasse} />
            </label>
          </div>
        </div>
        {logs.length >= LIMITE && (
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
            <AlertTriangle className="mt-px h-4 w-4 shrink-0" />
            O período tem mais de {LIMITE.toLocaleString('pt-BR')} eventos; estão carregados os mais recentes. Reduza o período para auditar o restante.
          </p>
        )}
      </section>

      {/* Resumo (clicável) */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
        {cartoesResumo.map(({ rotulo, valor, icone: Icone, cor, acao: clicar, ativo }) => {
          const Tag = clicar ? 'button' : 'div';
          return (
            <Tag
              key={rotulo}
              {...(clicar ? { type: 'button' as const, onClick: clicar, 'aria-pressed': ativo } : {})}
              className={cn(
                'flex items-center gap-3 rounded-2xl border bg-white p-3 text-left shadow-[0_10px_24px_-20px_rgba(18,44,82,.5)] transition-all dark:bg-[#121826]',
                ativo ? 'border-[#0d6efd] ring-2 ring-[#0d6efd]/20 dark:border-sky-400' : 'border-[#dce4f0] dark:border-slate-800',
                clicar && 'hover:-translate-y-px hover:border-[#9fc9ed] dark:hover:border-slate-700'
              )}
            >
              <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', cor)}><Icone className="h-5 w-5" /></span>
              <span className="min-w-0">
                <span className="block text-xl font-extrabold leading-none tabular-nums text-[#102755] dark:text-slate-100">{isLoading ? '…' : valor.toLocaleString('pt-BR')}</span>
                <span className="mt-1 block truncate text-[11px] font-semibold text-[#627fa5] dark:text-slate-400">{rotulo}</span>
              </span>
            </Tag>
          );
        })}
      </div>

      {/* Filtros */}
      <section className="rounded-2xl border border-[#dce4f0] bg-white p-4 shadow-[0_12px_28px_-22px_rgba(18,44,82,.45)] dark:border-slate-800 dark:bg-[#121826]">
        <div className="flex gap-2">
          <div className="min-w-0 flex-1">
            <CampoComIcone icone={<Search className="h-4 w-4" />}>
              <input
                type="search"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar em tudo: operador, CPF, matrícula, nome, registro, IP…"
                className={cn(campoClasse, 'h-11 pl-10 text-base sm:text-sm')}
                aria-label="Buscar na auditoria"
              />
            </CampoComIcone>
          </div>
          <button
            type="button"
            onClick={() => setFiltrosAbertos((v) => !v)}
            aria-expanded={filtrosAbertos}
            className={cn('inline-flex h-11 shrink-0 items-center gap-2 rounded-xl border px-3.5 text-sm font-bold transition-colors lg:hidden', filtrosAbertos || qtdFiltrosAvancados ? 'border-[#0d6efd] bg-[#eaf3ff] text-[#0647c4] dark:border-sky-500/50 dark:bg-sky-500/10 dark:text-sky-200' : 'border-[#d4e0ee] bg-white text-[#37475e] dark:border-slate-700 dark:bg-[#0f1524] dark:text-slate-200')}
          >
            <SlidersHorizontal className="h-4 w-4" /> Filtros
            {qtdFiltrosAvancados > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#0d6efd] px-1 text-[10px] text-white">{qtdFiltrosAvancados}</span>}
          </button>
        </div>

        {/* Categorias */}
        <div className="mt-4">
          <p className={rotuloClasse}>Tipo de evento <span className="font-medium normal-case tracking-normal text-[#9aabc3]">· toque para combinar</span></p>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden">
            {(Object.keys(CATEGORIAS) as CategoriaId[]).map((id) => {
              const cat = CATEGORIAS[id];
              const Icone = cat.icone;
              const qtd = porCategoria.get(id) || 0;
              const ativo = categorias.has(id);
              if (!qtd && !ativo) return null;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={ativo}
                  onClick={() => alternarCategoria(id)}
                  className={cn(
                    'flex min-h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border py-1 pl-2.5 pr-1.5 text-xs font-bold transition-all active:scale-[.97]',
                    ativo
                      ? cn('border-transparent bg-gradient-to-b text-white shadow-[0_6px_16px_-8px_rgba(16,39,85,.6)]', cat.chipAtivo)
                      : 'border-[#dce4f0] bg-white text-[#4b6485] shadow-[0_1px_2px_rgba(16,39,85,.06)] hover:-translate-y-px hover:border-[#b9d3ee] dark:border-slate-800 dark:bg-[#0f1524] dark:text-slate-300'
                  )}
                >
                  <Icone className="h-3.5 w-3.5" />
                  {cat.rotulo}
                  <span className={cn('min-w-[1.6rem] rounded-lg px-1.5 py-0.5 text-center text-[11px] font-extrabold tabular-nums', ativo ? 'bg-white/90 text-[#102755]' : cat.cor)}>{qtd}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Filtros avançados: sempre visíveis no computador; recolhíveis no celular */}
        <div className={cn('mt-4 space-y-3 border-t border-[#e8eef6] pt-4 dark:border-slate-800', filtrosAbertos ? 'block' : 'hidden lg:block')}>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="min-w-0">
            <span className={rotuloClasse}><Activity className="h-3.5 w-3.5" /> Ação</span>
            <select value={acao} onChange={(e) => setAcao(e.target.value)} className={campoClasse}>
              <option value="">Todas as ações</option>
              {porAcao.map(([codigo, qtd]) => <option key={codigo} value={codigo}>{infoAcao(codigo).rotulo} ({qtd})</option>)}
            </select>
          </label>
          <label className="min-w-0">
            <span className={rotuloClasse}><User className="h-3.5 w-3.5" /> Operador</span>
            <select value={operador} onChange={(e) => setOperador(e.target.value)} className={campoClasse}>
              <option value="">Todos os operadores</option>
              {porOperador.map(([email, qtd]) => <option key={email} value={email}>{email} ({qtd})</option>)}
            </select>
          </label>
          <label className="min-w-0">
            <span className={rotuloClasse}><Database className="h-3.5 w-3.5" /> Entidade</span>
            <select value={tabela} onChange={(e) => setTabela(e.target.value)} className={campoClasse}>
              <option value="">Todas as entidades</option>
              {porTabela.filter(([t]) => t).map(([t, qtd]) => <option key={t} value={t}>{nomeTabela(t)} ({qtd})</option>)}
            </select>
          </label>
          <label className="min-w-0">
            <span className={rotuloClasse}><MonitorSmartphone className="h-3.5 w-3.5" /> Terminal / IP</span>
            <CampoComIcone icone={<MonitorSmartphone className="h-4 w-4" />}>
              <input value={terminal} onChange={(e) => setTerminal(e.target.value)} placeholder="Ex.: 192.168 ou Portaria" className={cn(campoClasse, 'pl-9')} />
            </CampoComIcone>
          </label>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Interruptor ativo={somenteSensiveis} onChange={() => setSomenteSensiveis((v) => !v)} icone={<ShieldAlert className="h-4 w-4" />} titulo="Somente sensíveis" dica="Exclusões, edições, usuários, CPF e biometria" tom="rosa" />
            <Interruptor ativo={somenteForaExpediente} onChange={() => setSomenteForaExpediente((v) => !v)} icone={<MoonStar className="h-4 w-4" />} titulo="Fora do expediente" dica="Antes das 7h, após as 19h e fins de semana" tom="indigo" />
          </div>
        </div>

        {/* Filtros ativos */}
        {ativos.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-[#e8eef6] pt-3 dark:border-slate-800">
            <span className="mr-1 text-[11px] font-bold uppercase tracking-wider text-[#627fa5] dark:text-slate-400">Filtrando por</span>
            {ativos.map((f) => (
              <span key={f.chave} className="inline-flex max-w-full items-center gap-1 rounded-full bg-[#eaf3ff] py-1 pl-2.5 pr-1 text-xs font-semibold text-[#0647c4] ring-1 ring-[#c5dcf7] dark:bg-sky-500/10 dark:text-sky-200 dark:ring-sky-500/30">
                <span className="truncate">{f.rotulo}</span>
                <button type="button" onClick={f.remover} className="grid h-5 w-5 place-items-center rounded-full hover:bg-[#0647c4]/10" aria-label={`Remover filtro ${f.rotulo}`}><X className="h-3 w-3" /></button>
              </span>
            ))}
            <button type="button" onClick={limparFiltros} className="ml-1 rounded-full px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10">Limpar tudo</button>
          </div>
        )}
      </section>

      {/* Resultados */}
      <section className="overflow-hidden rounded-2xl border border-[#dce4f0] bg-white shadow-[0_12px_28px_-22px_rgba(18,44,82,.45)] dark:border-slate-800 dark:bg-[#121826]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e8eef6] px-4 py-3 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-extrabold text-[#102755] dark:text-slate-100">Trilha de auditoria</h3>
            <p className="text-[11px] text-[#627fa5] dark:text-slate-400">
              {filtrados.length.toLocaleString('pt-BR')} de {logs.length.toLocaleString('pt-BR')} eventos · {formatarDia(de <= ate ? de : ate)} a {formatarDia(de <= ate ? ate : de)}
            </p>
          </div>
          <button type="button" onClick={() => setOrdem((o) => (o === 'desc' ? 'asc' : 'desc'))} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#d4e0ee] px-3 text-xs font-bold text-[#37475e] hover:border-[#9fc9ed] dark:border-slate-700 dark:text-slate-200">
            {ordem === 'desc' ? <ArrowDownWideNarrow className="h-4 w-4" /> : <ArrowUpNarrowWide className="h-4 w-4" />}
            {ordem === 'desc' ? 'Mais recentes primeiro' : 'Mais antigos primeiro'}
          </button>
        </div>

        {erro ? (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
            <p className="text-sm font-bold text-[#102755] dark:text-slate-100">Não foi possível carregar a auditoria</p>
            <p className="max-w-md text-xs text-[#627fa5] dark:text-slate-400">{erro}</p>
          </div>
        ) : isLoading ? (
          <div className="space-y-2 p-4" aria-busy="true">
            {Array.from({ length: 6 }, (_, i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-[#f0f4fa] dark:bg-slate-800/60" />)}
          </div>
        ) : !filtrados.length ? (
          <div className="flex flex-col items-center gap-3 px-4 py-14 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-[#eef4fb] text-[#627fa5] dark:bg-slate-800 dark:text-slate-400"><Search className="h-6 w-6" /></span>
            <div>
              <p className="text-sm font-bold text-[#102755] dark:text-slate-100">Nenhum evento encontrado</p>
              <p className="mt-1 text-xs text-[#627fa5] dark:text-slate-400">Ajuste os filtros ou amplie o período.</p>
            </div>
            {ativos.length > 0 && <button type="button" onClick={limparFiltros} className="rounded-xl border border-[#d4e0ee] px-3 py-2 text-xs font-bold text-[#37475e] dark:border-slate-700 dark:text-slate-200">Limpar filtros</button>}
          </div>
        ) : (
          <>
            {/* Celular: cartões */}
            <ul className="divide-y divide-[#eef2f8] md:hidden dark:divide-slate-800">
              {visiveis.map((log) => (
                <li key={log.id}>
                  <button type="button" onClick={() => setDetalhe(log)} className="w-full space-y-2 px-4 py-3 text-left active:bg-[#f6f9fd] dark:active:bg-slate-800/40">
                    <div className="flex items-start justify-between gap-2">
                      <BadgeAcao log={log} />
                      <span className="shrink-0 text-[11px] tabular-nums text-[#627fa5] dark:text-slate-400">
                        {foraDoExpediente(log.created_at) && <MoonStar className="mr-1 inline h-3 w-3 text-indigo-500" />}
                        {formatDateTime(log.created_at)}
                      </span>
                    </div>
                    <p className="truncate text-xs font-semibold text-[#102755] dark:text-slate-200">{log.usuario_email || 'sistema'}</p>
                    <ResumoDetalhes detalhes={log.detalhes} />
                  </button>
                </li>
              ))}
            </ul>

            {/* Computador: tabela */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f6f9fd] text-[10px] font-bold uppercase tracking-wider text-[#627fa5] dark:bg-[#0f1524] dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Data e hora</th>
                    <th className="px-4 py-3">Ação</th>
                    <th className="px-4 py-3">Operador</th>
                    <th className="px-4 py-3">Entidade</th>
                    <th className="px-4 py-3">Terminal / IP</th>
                    <th className="px-4 py-3">Detalhes</th>
                    <th className="px-2 py-3"><span className="sr-only">Abrir</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eef2f8] dark:divide-slate-800">
                  {visiveis.map((log) => (
                    <tr key={log.id} onClick={() => setDetalhe(log)} className="cursor-pointer transition-colors hover:bg-[#f6f9fd] dark:hover:bg-slate-800/30">
                      <td className="whitespace-nowrap px-4 py-3 tabular-nums text-[#37475e] dark:text-slate-300">
                        <span className="inline-flex items-center gap-1.5">
                          {foraDoExpediente(log.created_at) && <MoonStar className="h-3.5 w-3.5 text-indigo-500" aria-label="Fora do expediente" />}
                          {formatDateTime(log.created_at)}
                        </span>
                      </td>
                      <td className="max-w-[230px] px-4 py-3"><BadgeAcao log={log} /></td>
                      <td className="max-w-[220px] truncate px-4 py-3 font-semibold text-[#102755] dark:text-slate-200">{log.usuario_email || 'sistema'}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-[#4b6485] dark:text-slate-400">{nomeTabela(log.tabela)}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px] text-[#4b6485] dark:text-slate-400">{log.ip_origem || '—'}</td>
                      <td className="max-w-[360px] px-4 py-3"><ResumoDetalhes detalhes={log.detalhes} /></td>
                      <td className="px-2 py-3 text-[#9aabc3]"><Eye className="h-4 w-4" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {totalPaginas > 1 && (
              <div className="flex items-center justify-between gap-2 border-t border-[#e8eef6] px-4 py-3 text-xs dark:border-slate-800">
                <span className="text-[#627fa5] dark:text-slate-400">
                  {((paginaAtual - 1) * POR_PAGINA + 1).toLocaleString('pt-BR')}–{Math.min(paginaAtual * POR_PAGINA, filtrados.length).toLocaleString('pt-BR')} de {filtrados.length.toLocaleString('pt-BR')}
                </span>
                <div className="flex items-center gap-1">
                  <button type="button" disabled={paginaAtual === 1} onClick={() => setPagina(paginaAtual - 1)} className="grid h-9 w-9 place-items-center rounded-lg border border-[#d4e0ee] text-[#37475e] disabled:opacity-40 dark:border-slate-700 dark:text-slate-200" aria-label="Página anterior"><ChevronLeft className="h-4 w-4" /></button>
                  <span className="min-w-[64px] text-center font-bold tabular-nums text-[#102755] dark:text-slate-100">{paginaAtual} / {totalPaginas}</span>
                  <button type="button" disabled={paginaAtual === totalPaginas} onClick={() => setPagina(paginaAtual + 1)} className="grid h-9 w-9 place-items-center rounded-lg border border-[#d4e0ee] text-[#37475e] disabled:opacity-40 dark:border-slate-700 dark:text-slate-200" aria-label="Próxima página"><ChevronRight className="h-4 w-4" /></button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* Detalhe do evento */}
      <Modal
        isOpen={!!detalhe}
        onClose={() => setDetalhe(null)}
        title={detalhe ? infoAcao(detalhe.acao).rotulo : ''}
        description={detalhe ? `${formatDateTime(detalhe.created_at)} · ${detalhe.acao}` : ''}
        icon={<ShieldAlert className="h-6 w-6" />}
        maxWidth="2xl"
      >
        {detalhe && (
          <div className="space-y-4 px-5 pb-6 pt-4 sm:px-7">
            <div className="flex flex-wrap gap-2">
              <BadgeAcao log={detalhe} />
              {infoAcao(detalhe.acao).sensivel && <span className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-700 ring-1 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30"><ShieldAlert className="h-3.5 w-3.5" /> Ação sensível</span>}
              {foraDoExpediente(detalhe.created_at) && <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2 py-1 text-[11px] font-bold text-indigo-700 ring-1 ring-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-500/30"><MoonStar className="h-3.5 w-3.5" /> Fora do expediente</span>}
            </div>
            <dl className="grid gap-2 sm:grid-cols-2">
              {[
                ['Operador', detalhe.usuario_email || 'sistema'],
                ['Entidade', nomeTabela(detalhe.tabela)],
                ['Registro', detalhe.registro_id || '—'],
                ['Terminal / IP', detalhe.ip_origem || '—'],
              ].map(([rotulo, valor]) => (
                <div key={rotulo} className="rounded-xl border border-[#e1e9f4] bg-[#f8fbff] px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/60">
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-[#627fa5] dark:text-slate-400">{rotulo}</dt>
                  <dd className="mt-0.5 break-all text-sm font-semibold text-[#102755] dark:text-slate-100">{valor}</dd>
                </div>
              ))}
            </dl>
            {Object.keys(detalhe.detalhes || {}).length > 0 && (
              <div>
                <p className={rotuloClasse}>Dados do evento</p>
                <dl className="divide-y divide-[#eef2f8] overflow-hidden rounded-xl border border-[#e1e9f4] dark:divide-slate-800 dark:border-slate-800">
                  {Object.entries(detalhe.detalhes).map(([chave, valor]) => (
                    <div key={chave} className="flex gap-3 px-3 py-2 text-xs">
                      <dt className="w-36 shrink-0 font-semibold capitalize text-[#627fa5] dark:text-slate-400">{chave.replace(/_/g, ' ')}</dt>
                      <dd className="min-w-0 flex-1 break-all font-mono text-[#102755] dark:text-slate-200">{valorLegivel(valor)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
            <button type="button" onClick={copiarDetalhe} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#d4e0ee] px-3.5 text-xs font-bold text-[#37475e] hover:border-[#9fc9ed] dark:border-slate-700 dark:text-slate-200">
              {copiado ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              {copiado ? 'Copiado!' : 'Copiar registro completo (JSON)'}
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
};

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUp,
  BarChart3,
  BookOpen,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  CircleCheck,
  CornerDownRight,
  Info,
  Lock,
  Search,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
  TriangleAlert,
  User,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  ASSUNTOS,
  GUIAS,
  PERFIS,
  PERGUNTAS,
  SUGESTOES_BUSCA,
  TAREFAS_POR_PERFIL,
  TOPICOS_POPULARES,
  type Guia,
  type PerfilId,
  type Tarefa,
} from './conteudo';
import { buscarNoManual, normalizar, type ResultadoBusca } from './busca';
import { ICONES, Ilustracao, LivroAberto } from './Ilustracoes';

const ICONE_PERFIL: Record<PerfilId, React.ComponentType<{ className?: string }>> = {
  recepcionista: User,
  gestor: BarChart3,
  admin: ShieldCheck,
};

const TONS: Record<Tarefa['tom'], string> = {
  azul: 'bg-[#e6f0fd] text-[#0b5ed7] dark:bg-blue-950/60 dark:text-sky-300',
  verde: 'bg-[#e3f6ea] text-[#15803d] dark:bg-emerald-950/50 dark:text-emerald-300',
  roxo: 'bg-[#efe9fd] text-[#6d3fd6] dark:bg-violet-950/50 dark:text-violet-300',
  ambar: 'bg-[#fdf1df] text-[#c2700a] dark:bg-amber-950/50 dark:text-amber-300',
};

const cartao = 'rounded-2xl border border-[#dde7f3] bg-white shadow-[0_10px_30px_-22px_rgba(18,44,82,.45)] dark:border-slate-800 dark:bg-[#121826]';
const foco = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0d6efd] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900';

const perfilDoUsuario = (role?: string): PerfilId => (role === 'admin' || role === 'gestor' ? role : 'recepcionista');

const rolarAte = (elemento: HTMLElement | null) => {
  if (!elemento) return;
  const reduzir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  elemento.scrollIntoView({ behavior: reduzir ? 'auto' : 'smooth', block: 'start' });
};

export const ManualPage: React.FC = () => {
  const { user } = useAuth();
  const perfilInicial = perfilDoUsuario(user?.role);
  const [perfil, setPerfil] = useState<PerfilId>(perfilInicial);
  const [guiaId, setGuiaId] = useState(() => PERFIS.find((p) => p.id === perfilInicial)!.guiaInicial);
  const [perguntaAberta, setPerguntaAberta] = useState<string | null>(() => PERFIS.find((p) => p.id === perfilInicial)!.perguntaInicial);
  const [perguntaExtra, setPerguntaExtra] = useState<string | null>(null);
  const [filtroDuvidas, setFiltroDuvidas] = useState('');
  const [consulta, setConsulta] = useState('');
  const [consultaFeita, setConsultaFeita] = useState<string | null>(null);
  const [avaliacoes, setAvaliacoes] = useState<Record<string, 'sim' | 'nao'>>({});

  const topoRef = useRef<HTMLDivElement>(null);
  const guiaRef = useRef<HTMLElement>(null);
  const campoBuscaRef = useRef<HTMLInputElement>(null);

  const guia = GUIAS.find((item) => item.id === guiaId) ?? GUIAS[0];
  const tarefas = TAREFAS_POR_PERFIL[perfil];
  const resultados = useMemo(() => (consultaFeita ? buscarNoManual(consultaFeita) : []), [consultaFeita]);

  const perguntasDoPerfil = useMemo(() => {
    const lista = PERGUNTAS.filter((pergunta) => pergunta.perfis.includes(perfil) || pergunta.id === perguntaExtra);
    const termo = normalizar(filtroDuvidas);
    if (!termo) return lista;
    return lista.filter((pergunta) => normalizar(`${pergunta.pergunta} ${pergunta.resposta} ${pergunta.palavrasChave.join(' ')}`).includes(termo));
  }, [perfil, perguntaExtra, filtroDuvidas]);

  const assuntos = ASSUNTOS.map((id) => GUIAS.find((item) => item.id === id)).filter(
    (item): item is Guia => Boolean(item) && item!.perfis.includes(perfil) && item!.id !== guia.id
  );

  const abrirGuia = (id: string, rolar = true) => {
    setGuiaId(id);
    if (rolar) requestAnimationFrame(() => rolarAte(guiaRef.current));
  };

  const trocarPerfil = (id: PerfilId) => {
    const dados = PERFIS.find((p) => p.id === id)!;
    setPerfil(id);
    setGuiaId(dados.guiaInicial);
    setPerguntaAberta(dados.perguntaInicial);
    setPerguntaExtra(null);
    setFiltroDuvidas('');
  };

  const pesquisar = (event?: React.FormEvent) => {
    event?.preventDefault();
    setConsultaFeita(consulta.trim() ? consulta.trim() : null);
  };

  const limparPesquisa = () => {
    setConsulta('');
    setConsultaFeita(null);
    campoBuscaRef.current?.focus();
  };

  const abrirResultado = (resultado: ResultadoBusca) => {
    if (resultado.tipo === 'guia') {
      abrirGuia(resultado.id);
    } else {
      setFiltroDuvidas('');
      setPerguntaExtra(PERGUNTAS.find((p) => p.id === resultado.id)?.perfis.includes(perfil) ? null : resultado.id);
      setPerguntaAberta(resultado.id);
      requestAnimationFrame(() => rolarAte(document.getElementById(`pergunta-${resultado.id}`)));
    }
  };

  // Sincroniza o perfil inicial quando o usuário termina de carregar.
  useEffect(() => {
    if (user?.role) trocarPerfil(perfilDoUsuario(user.role));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);

  return (
    <div ref={topoRef} className="mx-auto max-w-6xl scroll-mt-24 space-y-5 pb-8">
      {/* 1. Abertura com busca */}
      <section
        aria-labelledby="manual-titulo"
        className="relative overflow-hidden rounded-3xl border border-[#d6e6f8] bg-[linear-gradient(120deg,#ffffff_0%,#f1f7ff_45%,#e3efff_100%)] px-5 py-6 shadow-[0_18px_40px_-30px_rgba(18,44,82,.5)] sm:px-8 sm:py-8 dark:border-slate-800 dark:bg-[linear-gradient(120deg,#0f172a_0%,#111c33_60%,#13284a_100%)]"
      >
        <LivroAberto className="pointer-events-none absolute right-4 top-1/2 hidden w-[240px] -translate-y-1/2 opacity-95 lg:block xl:right-6 xl:w-[250px]" />
        <div className="relative max-w-2xl lg:max-w-[calc(100%-250px)] xl:max-w-[calc(100%-270px)]">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-[#0b5ed7] shadow-sm ring-1 ring-[#d6e6f8] dark:bg-slate-800 dark:text-sky-300 dark:ring-slate-700">
              <BookOpen className="h-5 w-5" />
            </span>
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#0b5ed7] dark:text-sky-300">Manual de uso</span>
          </div>
          <h1 id="manual-titulo" className="mt-3 text-3xl font-extrabold tracking-tight text-[#0d1f45] sm:text-4xl dark:text-slate-50">Como podemos ajudar?</h1>
          <p className="mt-1.5 text-base text-[#52647d] dark:text-slate-300">Aprenda a usar o sistema, passo a passo.</p>

          <form role="search" onSubmit={pesquisar} className="mt-5">
            <label htmlFor="manual-busca" className="sr-only">Buscar no manual</label>
            <div className="flex items-center gap-2 rounded-2xl border border-[#d2e2f5] bg-white p-1.5 pl-4 shadow-[0_10px_24px_-18px_rgba(18,44,82,.55)] focus-within:border-[#0d6efd] focus-within:ring-2 focus-within:ring-[#0d6efd]/20 dark:border-slate-700 dark:bg-slate-900">
              <Search className="h-5 w-5 shrink-0 text-[#7a8ba3]" aria-hidden />
              <input
                id="manual-busca"
                ref={campoBuscaRef}
                type="search"
                value={consulta}
                onChange={(event) => {
                  setConsulta(event.target.value);
                  if (!event.target.value.trim()) setConsultaFeita(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') limparPesquisa();
                }}
                placeholder="Busque por entrada, crachá, visitante..."
                autoComplete="off"
                aria-controls="manual-resultados"
                className="min-h-11 w-full min-w-0 !border-0 !bg-transparent text-[15px] !shadow-none outline-none placeholder:text-[#8696ac] focus:ring-0 [&::-webkit-search-cancel-button]:hidden"
              />
              {consulta && (
                <button type="button" onClick={limparPesquisa} aria-label="Limpar pesquisa" className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[#7a8ba3] hover:bg-[#eef4fc] hover:text-[#0d1f45]', foco)}>
                  <X className="h-4 w-4" />
                </button>
              )}
              <button type="submit" className={cn('min-h-11 shrink-0 rounded-xl bg-[#0b5ed7] px-6 text-sm font-semibold text-white shadow-[0_8px_18px_-10px_rgba(11,94,215,.9)] transition-colors hover:bg-[#0a52bd] sm:px-9', foco)}>
                Buscar
              </button>
            </div>
          </form>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[13px] text-[#52647d] dark:text-slate-400">Tópicos mais procurados:</span>
            {TOPICOS_POPULARES.map((topico) => {
              const Icone = ICONES[topico.icone];
              return (
                <button
                  key={topico.guiaId}
                  type="button"
                  onClick={() => abrirGuia(topico.guiaId)}
                  className={cn('inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-full border border-[#d2e2f5] bg-white px-3 text-[13px] font-medium text-[#0b5ed7] transition-colors hover:border-[#0d6efd] hover:bg-[#f2f7ff] dark:border-slate-700 dark:bg-slate-900 dark:text-sky-300', foco)}
                >
                  <Icone className="h-4 w-4" /> {topico.rotulo}
                </button>
              );
            })}
          </div>
        </div>

        {consultaFeita && (
          <div id="manual-resultados" role="region" aria-live="polite" aria-label="Resultados da busca" className="relative mt-5 rounded-2xl border border-[#d6e6f8] bg-white p-3 sm:p-4 dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-2 flex items-center justify-between gap-3 px-1">
              <p className="text-sm text-[#52647d] dark:text-slate-300">
                {resultados.length
                  ? <><strong className="text-[#0d1f45] dark:text-slate-100">{resultados.length}</strong> {resultados.length === 1 ? 'resultado' : 'resultados'} para “{consultaFeita}”</>
                  : <>Nenhum resultado para “{consultaFeita}”.</>}
              </p>
              <button type="button" onClick={limparPesquisa} className={cn('inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-sm font-medium text-[#0b5ed7] hover:bg-[#f2f7ff] dark:text-sky-300', foco)}>
                <X className="h-4 w-4" /> Limpar
              </button>
            </div>
            {resultados.length > 0 ? (
              <ul className="max-h-80 space-y-1 overflow-y-auto">
                {resultados.map((resultado) => (
                  <li key={`${resultado.tipo}-${resultado.id}`}>
                    <button
                      type="button"
                      onClick={() => abrirResultado(resultado)}
                      className={cn('flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-[#f2f7ff] dark:hover:bg-slate-800', foco)}
                    >
                      <span className={cn('mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg', resultado.tipo === 'guia' ? 'bg-[#e6f0fd] text-[#0b5ed7]' : 'bg-[#fdf1df] text-[#c2700a]')}>
                        {resultado.tipo === 'guia' ? <BookOpen className="h-4 w-4" /> : <CircleHelp className="h-4 w-4" />}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-[#0d1f45] dark:text-slate-100">{resultado.titulo}</span>
                        <span className="block text-[11px] font-semibold uppercase tracking-wide text-[#7a8ba3]">{resultado.categoria}</span>
                        <span className="mt-0.5 block text-sm text-[#52647d] dark:text-slate-400">{resultado.trecho}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-1 pb-1 text-sm text-[#52647d] dark:text-slate-400">
                <p>Confira a grafia ou tente uma palavra mais simples:</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {SUGESTOES_BUSCA.map((sugestao) => (
                    <button
                      key={sugestao}
                      type="button"
                      onClick={() => {
                        setConsulta(sugestao);
                        setConsultaFeita(sugestao);
                      }}
                      className={cn('min-h-9 rounded-full border border-[#d2e2f5] bg-[#f6f9fe] px-3 text-sm font-medium text-[#0b5ed7] hover:border-[#0d6efd] dark:border-slate-700 dark:bg-slate-800 dark:text-sky-300', foco)}
                    >
                      {sugestao}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 2. Guias por perfil */}
      <section aria-labelledby="perfil-titulo" className={cn(cartao, 'flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between')}>
        <div className="flex min-w-0 items-center gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#e6f0fd] text-[#0b5ed7] dark:bg-blue-950/60 dark:text-sky-300"><Users className="h-6 w-6" /></span>
          <div>
            <h2 id="perfil-titulo" className="text-xl font-extrabold text-[#0d1f45] dark:text-slate-100">Um guia para cada perfil</h2>
            <p className="text-sm text-[#52647d] dark:text-slate-400">Escolha seu perfil para encontrar as orientações da sua rotina.</p>
          </div>
        </div>
        <div role="radiogroup" aria-label="Perfil para consulta" className="grid min-w-0 grid-cols-1 gap-1.5 rounded-2xl border border-[#dde7f3] p-1.5 sm:grid-cols-3 lg:max-w-[640px] lg:flex-1 dark:border-slate-800">
          {PERFIS.map((item) => {
            const Icone = ICONE_PERFIL[item.id];
            const ativo = perfil === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={ativo}
                onClick={() => trocarPerfil(item.id)}
                className={cn(
                  'flex min-h-14 min-w-0 items-center gap-3 rounded-xl px-3.5 py-2 text-left transition-colors',
                  ativo ? 'bg-[#0b5ed7] text-white shadow-[0_10px_20px_-12px_rgba(11,94,215,.9)]' : 'text-[#0d1f45] hover:bg-[#f2f7ff] dark:text-slate-200 dark:hover:bg-slate-800',
                  foco
                )}
              >
                <Icone className={cn('h-5 w-5 shrink-0', ativo ? 'text-white' : 'text-[#52647d] dark:text-slate-400')} />
                <span className="min-w-0">
                  <span className="block text-sm font-bold">{item.nome}</span>
                  <span className={cn('block text-xs leading-snug', ativo ? 'text-blue-100' : 'text-[#7a8ba3]')}>{item.resumo}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>
      <p className="sr-only" aria-live="polite">Mostrando orientações do perfil {PERFIS.find((p) => p.id === perfil)?.nome}. A escolha não altera as permissões da sua conta.</p>

      {/* 3. Atalhos para tarefas */}
      <nav aria-label="Tarefas do perfil" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {tarefas.map((tarefa) => {
          const Icone = ICONES[tarefa.icone];
          const ativo = tarefa.guiaId === guia.id;
          return (
            <button
              key={`${perfil}-${tarefa.titulo}`}
              type="button"
              onClick={() => abrirGuia(tarefa.guiaId)}
              aria-current={ativo ? 'true' : undefined}
              className={cn(
                cartao,
                'group flex items-start gap-3.5 p-4 text-left transition-all motion-safe:hover:-translate-y-0.5 hover:border-[#9cc3f5]',
                ativo && 'border-[#0d6efd] ring-1 ring-[#0d6efd] dark:border-sky-400 dark:ring-sky-400',
                foco
              )}
            >
              <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-xl', TONS[tarefa.tom])}><Icone className="h-5 w-5" /></span>
              <span className="min-w-0">
                <span className="block text-base font-bold text-[#0d1f45] dark:text-slate-100">{tarefa.titulo}</span>
                <span className="mt-0.5 block text-sm text-[#52647d] dark:text-slate-400">{tarefa.resumo}</span>
                <span className="mt-2 inline-flex items-center gap-1 whitespace-nowrap text-sm font-semibold text-[#0b5ed7] dark:text-sky-300">
                  {tarefa.acao} <ArrowRight className="h-4 w-4 motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5" />
                </span>
              </span>
            </button>
          );
        })}
      </nav>

      {/* 4. Guia + coluna lateral */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <GuiaPassoAPasso
          guia={guia}
          refSecao={guiaRef}
          avaliacao={avaliacoes[guia.id]}
          onAvaliar={(valor) => setAvaliacoes((atual) => ({ ...atual, [guia.id]: valor }))}
        />

        <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-2 xl:grid-cols-1">
          <PerguntasFrequentes
            perguntas={perguntasDoPerfil}
            filtro={filtroDuvidas}
            onFiltrar={setFiltroDuvidas}
            aberta={perguntaAberta}
            onAlternar={(id) => setPerguntaAberta((atual) => (atual === id ? null : id))}
            onAbrirGuia={abrirGuia}
          />

          <section aria-labelledby="assuntos-titulo" className={cn(cartao, 'p-4 sm:p-5')}>
            <h2 id="assuntos-titulo" className="flex items-center gap-2.5 text-lg font-extrabold text-[#0d1f45] dark:text-slate-100">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#e6f0fd] text-[#0b5ed7] dark:bg-blue-950/60 dark:text-sky-300"><BookOpen className="h-4 w-4" /></span>
              Explore outros assuntos
            </h2>
            <ul className="mt-3 space-y-2">
              {assuntos.map((item) => {
                const Icone = ICONES[item.icone];
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => abrirGuia(item.id)}
                      className={cn('flex min-h-11 w-full items-center gap-3 rounded-xl border border-[#e3eaf4] px-3 py-2 text-left text-sm font-medium text-[#0d1f45] transition-colors hover:border-[#9cc3f5] hover:bg-[#f6f9fe] dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800', foco)}
                    >
                      <Icone className="h-4 w-4 shrink-0 text-[#0b5ed7] dark:text-sky-300" />
                      <span className="flex-1">{item.titulo}</span>
                      {item.restricao && <Lock className="h-3.5 w-3.5 text-[#9aa9bd]" aria-label="Acesso restrito" />}
                      <ChevronRight className="h-4 w-4 text-[#0b5ed7] dark:text-sky-300" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </div>

      <footer className="flex flex-col gap-2 border-t border-[#dde7f3] pt-4 text-xs text-[#7a8ba3] sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
        <span>Manual do Sistema de Recepção • SMEDU Itaguaí</span>
        <button type="button" onClick={() => rolarAte(topoRef.current)} className={cn('inline-flex min-h-9 items-center gap-1 self-start rounded-lg px-2 font-semibold text-[#0b5ed7] hover:bg-[#f2f7ff] sm:self-auto dark:text-sky-300', foco)}>
          Voltar ao início <ArrowUp className="h-3.5 w-3.5" />
        </button>
      </footer>
    </div>
  );
};

/* ---------- Guia passo a passo ---------- */

const NOTA_ESTILO = {
  info: { classe: 'border-[#cfe1fb] bg-[#eef5ff] text-[#0b4fb3] dark:border-blue-500/30 dark:bg-blue-950/40 dark:text-sky-200', Icone: Info },
  aviso: { classe: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-200', Icone: TriangleAlert },
  sucesso: { classe: 'border-[#bfe8cd] bg-[#eefbf2] text-[#166534] dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-200', Icone: CircleCheck },
} as const;

const Nota: React.FC<{ tom: keyof typeof NOTA_ESTILO; children: React.ReactNode; className?: string }> = ({ tom, children, className }) => {
  const { classe, Icone } = NOTA_ESTILO[tom];
  return (
    <p className={cn('flex items-start gap-2 rounded-xl border px-3 py-2 text-sm', classe, className)}>
      <Icone className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> <span>{children}</span>
    </p>
  );
};

const GuiaPassoAPasso: React.FC<{
  guia: Guia;
  refSecao: React.RefObject<HTMLElement>;
  avaliacao?: 'sim' | 'nao';
  onAvaliar: (valor: 'sim' | 'nao') => void;
}> = ({ guia, refSecao, avaliacao, onAvaliar }) => {
  const Icone = ICONES[guia.icone];
  return (
    <section ref={refSecao} aria-labelledby="guia-titulo" className={cn(cartao, 'scroll-mt-24 p-5 sm:p-6')}>
      <div className="flex items-center gap-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#e6f0fd] text-[#0b5ed7] dark:bg-blue-950/60 dark:text-sky-300"><Icone className="h-4 w-4" /></span>
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#0b5ed7] dark:text-sky-300">Guia · {guia.categoria}</span>
      </div>
      <h2 id="guia-titulo" className="mt-3 text-2xl font-extrabold tracking-tight text-[#0d1f45] sm:text-[28px] dark:text-slate-50">{guia.titulo}</h2>
      <p className="mt-1 text-base text-[#52647d] dark:text-slate-400">{guia.descricao}</p>

      {guia.restricao && <Nota tom="aviso" className="mt-4"><strong>Acesso restrito:</strong> {guia.restricao}</Nota>}

      <dl className="mt-5 grid grid-cols-1 gap-x-4 gap-y-1 rounded-2xl bg-[#f6f9fe] px-4 py-3 text-sm sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:gap-y-2.5 dark:bg-slate-900">
        <dt className="pt-0.5 text-xs font-bold uppercase tracking-wide text-[#7a8ba3]">Para que serve</dt>
        <dd className="mb-2 text-[#37475e] sm:mb-0 dark:text-slate-300">{guia.paraQueServe}</dd>
        <dt className="pt-0.5 text-xs font-bold uppercase tracking-wide text-[#7a8ba3]">Antes de começar</dt>
        <dd className="mb-2 sm:mb-0">
          <ul className="space-y-0.5 text-[#37475e] dark:text-slate-300">
            {guia.antesDeComecar.map((item) => (
              <li key={item} className="flex gap-2"><span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0b5ed7]" />{item}</li>
            ))}
          </ul>
        </dd>
        <dt className="pt-0.5 text-xs font-bold uppercase tracking-wide text-[#7a8ba3]">Onde acessar</dt>
        <dd>
          <Link to={guia.ondeAcessar.rota} className={cn('inline-flex items-center gap-1 rounded font-semibold text-[#0b5ed7] underline-offset-2 hover:underline dark:text-sky-300', foco)}>
            {guia.ondeAcessar.rotulo} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </dd>
      </dl>

      <ol className="mt-6">
        {guia.passos.map((passo, indice) => {
          const ultimo = indice === guia.passos.length - 1;
          return (
            <li key={passo.titulo} className="relative flex gap-4 pb-6 last:pb-0">
              {!ultimo && <span aria-hidden className="absolute left-[17px] top-10 h-[calc(100%-2.5rem)] w-0.5 bg-[#dbe7f6] dark:bg-slate-700" />}
              <span className="relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#0b5ed7] text-sm font-bold text-white shadow-[0_6px_14px_-6px_rgba(11,94,215,.9)]" aria-hidden>
                {indice + 1}
              </span>
              <div className="min-w-0 flex-1 pt-1">
                <h3 className="text-base font-bold text-[#0d1f45] dark:text-slate-100"><span className="sr-only">Passo {indice + 1}: </span>{passo.titulo}</h3>
                <p className="mt-0.5 text-sm leading-relaxed text-[#52647d] dark:text-slate-400">{passo.texto}</p>
                {passo.ilustracao && <div className="mt-3"><Ilustracao id={passo.ilustracao} /></div>}
                {passo.nota && <Nota tom={passo.nota.tom} className="mt-3 inline-flex">{passo.nota.texto}</Nota>}
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-6 space-y-3">
        <Nota tom="sucesso"><strong>Como saber que deu certo:</strong> {guia.concluido}</Nota>
        {guia.dicaFinal && <Nota tom="sucesso">{guia.dicaFinal}</Nota>}
      </div>

      {guia.problemas.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-extrabold text-[#0d1f45] dark:text-slate-100">Problemas comuns</h3>
          <ul className="mt-2 divide-y divide-[#e8eef6] rounded-2xl border border-[#e3eaf4] dark:divide-slate-800 dark:border-slate-800">
            {guia.problemas.map((item) => (
              <li key={item.problema} className="flex gap-3 px-4 py-3 text-sm">
                <CornerDownRight className="mt-0.5 h-4 w-4 shrink-0 text-[#c2700a]" aria-hidden />
                <span>
                  <span className="block font-semibold text-[#0d1f45] dark:text-slate-100">{item.problema}</span>
                  <span className="block text-[#52647d] dark:text-slate-400">{item.solucao}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-[#e8eef6] pt-4 text-sm text-[#52647d] dark:border-slate-800 dark:text-slate-400">
        {avaliacao ? (
          <p role="status" className="font-medium text-[#15803d] dark:text-emerald-300">Obrigado pelo retorno!</p>
        ) : (
          <>
            <span className="mr-1">Este guia ajudou?</span>
            {(['sim', 'nao'] as const).map((valor) => (
              <button
                key={valor}
                type="button"
                onClick={() => onAvaliar(valor)}
                className={cn('inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#d2e2f5] px-3 font-medium text-[#0d1f45] hover:border-[#0d6efd] hover:bg-[#f2f7ff] dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800', foco)}
              >
                {valor === 'sim' ? <ThumbsUp className="h-4 w-4" /> : <ThumbsDown className="h-4 w-4" />} {valor === 'sim' ? 'Sim' : 'Não'}
              </button>
            ))}
          </>
        )}
      </div>
    </section>
  );
};

/* ---------- Perguntas frequentes ---------- */

const PerguntasFrequentes: React.FC<{
  perguntas: typeof PERGUNTAS;
  filtro: string;
  onFiltrar: (valor: string) => void;
  aberta: string | null;
  onAlternar: (id: string) => void;
  onAbrirGuia: (id: string) => void;
}> = ({ perguntas, filtro, onFiltrar, aberta, onAlternar, onAbrirGuia }) => {
  const base = useId();
  return (
    <section aria-labelledby={`${base}-titulo`} className={cn(cartao, 'p-4 sm:p-5')}>
      <h2 id={`${base}-titulo`} className="flex items-center gap-2.5 text-lg font-extrabold text-[#0d1f45] dark:text-slate-100">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-[#0b5ed7] text-white"><CircleHelp className="h-4 w-4" /></span>
        Perguntas frequentes
      </h2>
      <div className="relative mt-3">
        <label htmlFor={`${base}-filtro`} className="sr-only">Filtrar dúvidas</label>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a8ba3]" aria-hidden />
        <input
          id={`${base}-filtro`}
          type="search"
          value={filtro}
          onChange={(event) => onFiltrar(event.target.value)}
          placeholder="Filtrar dúvidas..."
          className="min-h-11 w-full rounded-xl border border-[#d2e2f5] bg-white pl-9 pr-3 text-sm text-[#0d1f45] placeholder:text-[#8696ac] focus:border-[#0d6efd] focus:outline-none focus:ring-2 focus:ring-[#0d6efd]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
      </div>

      <ul className="mt-3 space-y-2">
        {perguntas.map((pergunta) => {
          const expandida = aberta === pergunta.id;
          const idPainel = `${base}-${pergunta.id}`;
          return (
            <li key={pergunta.id} id={`pergunta-${pergunta.id}`} className={cn('scroll-mt-24 overflow-hidden rounded-xl border transition-colors', expandida ? 'border-[#9cc3f5] bg-[#f2f7ff] dark:border-sky-500/40 dark:bg-slate-900' : 'border-[#e3eaf4] dark:border-slate-800')}>
              <h3>
                <button
                  type="button"
                  aria-expanded={expandida}
                  aria-controls={idPainel}
                  onClick={() => onAlternar(pergunta.id)}
                  className={cn('flex min-h-11 w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-sm font-semibold', expandida ? 'text-[#0b5ed7] dark:text-sky-300' : 'text-[#0d1f45] hover:bg-[#f6f9fe] dark:text-slate-200 dark:hover:bg-slate-800', foco, 'focus-visible:ring-inset focus-visible:ring-offset-0')}
                >
                  {pergunta.pergunta}
                  <ChevronDown className={cn('h-4 w-4 shrink-0 motion-safe:transition-transform', expandida && 'rotate-180')} aria-hidden />
                </button>
              </h3>
              <div id={idPainel} role="region" aria-label={pergunta.pergunta} hidden={!expandida} className="space-y-2.5 px-3.5 pb-3.5 text-sm text-[#37475e] dark:text-slate-300">
                <p>{pergunta.resposta}</p>
                <div className="flex flex-wrap items-center gap-2">
                  {pergunta.aviso && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-200">
                      <TriangleAlert className="h-3.5 w-3.5" /> {pergunta.aviso}
                    </span>
                  )}
                  {pergunta.guiaId && (
                    <button type="button" onClick={() => onAbrirGuia(pergunta.guiaId!)} className={cn('inline-flex min-h-8 items-center gap-1 rounded-lg px-1.5 text-xs font-semibold text-[#0b5ed7] hover:underline dark:text-sky-300', foco)}>
                      Ver guia completo <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {perguntas.length === 0 && (
        <p className="mt-3 rounded-xl bg-[#f6f9fe] px-3 py-3 text-sm text-[#52647d] dark:bg-slate-900 dark:text-slate-400">
          Nenhuma dúvida encontrada. Tente outra palavra ou use a busca do topo.
        </p>
      )}
    </section>
  );
};

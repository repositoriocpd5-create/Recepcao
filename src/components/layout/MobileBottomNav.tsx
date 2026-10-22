import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { FileText, HelpCircle, BadgeCheck, BookOpen, Briefcase, Building2, Calendar, CheckCircle2, ChevronRight, Download, FileSpreadsheet, Home, LayoutDashboard, MoreHorizontal, ShieldCheck, Users, ArrowRightLeft, Phone, X } from 'lucide-react';
import { isInstallAvailable, openInstallSheet, usePwa } from '@/pwa/pwa';
import { useAuth } from '@/contexts/AuthContext';
import { useTecladoVirtual } from '@/hooks/useTecladoVirtual';
import { moduloDaRota, perfilCco } from '@/lib/modulos';

const primaryItems = [
  { label: 'Recepção', path: '/recepcao', icon: Home },
  { label: 'Visitantes', path: '/visitantes', icon: Users },
  { label: 'Ramais', path: '/ramais', icon: Phone },
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
];

// Cor do ícone de cada atalho em "Mais opções".
const TONS = {
  azul: 'bg-[#e6f1fb] text-[#005a9c] dark:bg-sky-500/15 dark:text-sky-300',
  verde: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
  indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300',
  ambar: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
  rosa: 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300',
  ciano: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300',
  violeta: 'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300',
  cinza: 'bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300',
};

export const MobileBottomNav = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);
  const pwa = usePwa();
  // Com o teclado aberto, o menu ficaria grudado em cima dele e esconderia o conteúdo.
  const tecladoAberto = useTecladoVirtual();
  const moreItems = [
    { label: 'Movimentações', path: '/movimentacoes', icon: ArrowRightLeft, tom: TONS.azul },
    { label: 'Servidores', path: '/servidores', icon: Briefcase, tom: TONS.indigo },
    { label: 'Autorizações', path: '/autorizacoes', icon: CheckCircle2, tom: TONS.verde },
    ...(user?.role === 'admin' ? [{ label: 'Agendamentos', path: '/agendamentos', icon: Calendar, tom: TONS.ambar }] : []),
    { label: 'Crachás', path: '/crachas', icon: BadgeCheck, tom: TONS.ciano },
    ...(user?.role === 'admin' ? [{ label: 'Relatórios & Auditoria', path: '/relatorios', icon: FileSpreadsheet, tom: TONS.violeta }] : []),
    { label: 'Departamentos & Setores', path: '/departamentos', icon: Building2, tom: TONS.azul },
    ...(user?.role === 'admin' ? [{ label: 'Administração', path: '/administracao', icon: ShieldCheck, tom: TONS.rosa }] : []),
    { label: 'Manual de Uso', path: '/manual', icon: BookOpen, tom: TONS.cinza },
  ];
  const isMoreActive = moreItems.some((item) => item.path === location.pathname);

  // Folha aberta: trava a rolagem da página e fecha no Esc.
  useEffect(() => {
    if (!moreOpen) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setMoreOpen(false); };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [moreOpen]);

  // Trocar de tela (inclusive pelos botões do menu inferior) fecha a folha.
  useEffect(() => setMoreOpen(false), [location.pathname]);

  if (tecladoAberto) return null;

  // CCO: poucos itens, todos visíveis (sem "Mais").
  if (moduloDaRota(location.pathname) === 'cco') {
    const perfil = perfilCco(user);
    const itensCco = [
      { label: perfil === 'unidade' ? 'Início' : 'Painel', path: '/cco', icon: Home, end: true },
      ...(perfil === 'unidade' ? [{ label: 'Ocorrências', path: '/cco/ocorrencias', icon: FileText, end: false }] : []),
      ...(user?.role === 'admin'
        ? [
            { label: 'Usuários', path: '/administracao', icon: ShieldCheck, end: false },
            { label: 'Auditoria', path: '/relatorios', icon: FileSpreadsheet, end: false },
          ]
        : []),
      { label: 'Ajuda', path: '/cco/ajuda', icon: HelpCircle, end: false },
    ];
    return (
      <nav aria-label="Navegação do CCO" className="fixed inset-x-0 bottom-0 z-50 flex min-h-[72px] items-start gap-1 border-t border-[#0a71bb] bg-[linear-gradient(160deg,#075fa7_0%,#005a9c_48%,#043c74_100%)] px-1.5 pb-[calc(8px+env(safe-area-inset-bottom))] pt-2 shadow-[0_-10px_24px_-14px_rgba(4,60,116,.6)] md:hidden">
        {itensCco.map(({ label, path, icon: Icon, end }) => (
          <NavLink key={path} to={path} end={end} className={({ isActive }) => `flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 text-[11px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${isActive ? 'bg-white text-[#005a9c] shadow-[0_8px_18px_-10px_rgba(0,0,0,.55)]' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}>
            <Icon className="h-5 w-5 shrink-0" /><span className="max-w-full truncate">{label}</span>
          </NavLink>
        ))}
      </nav>
    );
  }

  return (
    <>
      {/* Fundo: escurece e desfoca a tela, sem cobrir o menu inferior. */}
      <button
        type="button"
        tabIndex={-1}
        aria-label="Fechar mais opções"
        onClick={() => setMoreOpen(false)}
        className={`fixed inset-0 z-40 bg-[#041a36]/35 backdrop-blur-xl backdrop-saturate-[1.6] transition-opacity duration-300 md:hidden dark:bg-[#020617]/55 ${moreOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-label="Mais opções de navegação"
        aria-hidden={!moreOpen}
        className={`fixed inset-x-3 bottom-[calc(84px+env(safe-area-inset-bottom))] z-50 max-h-[calc(100dvh-140px)] origin-bottom overflow-y-auto overscroll-contain rounded-[28px] border border-white/70 bg-white/90 p-3 shadow-[0_30px_60px_-20px_rgba(4,30,64,.55),0_0_0_1px_rgba(8,43,87,.04)] backdrop-blur-2xl transition-all duration-300 ease-[cubic-bezier(.22,1,.36,1)] md:hidden dark:border-white/10 dark:bg-[#111827]/90 ${moreOpen ? 'translate-y-0 scale-100 opacity-100' : 'pointer-events-none translate-y-6 scale-[.97] opacity-0'}`}
      >
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-[#c9d6e8] dark:bg-slate-700" aria-hidden="true" />
        <div className="mb-3 flex items-center justify-between px-1">
          <div>
            <p className="text-[15px] font-extrabold text-[#0b2a55] dark:text-slate-100">Mais opções</p>
            <p className="text-[11px] text-[#68809f] dark:text-slate-400">Acesse as demais áreas do sistema</p>
          </div>
          <button
            type="button"
            onClick={() => setMoreOpen(false)}
            tabIndex={moreOpen ? 0 : -1}
            className="grid h-9 w-9 place-items-center rounded-full bg-[#eef4fb] text-[#526d91] transition-colors hover:bg-[#e1ebf7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#087ef5] dark:bg-slate-800 dark:text-slate-300"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {moreItems.map(({ label, path, icon: Icon, tom }, indice) => {
            const ativo = location.pathname === path;
            return (
              <button
                key={path}
                type="button"
                tabIndex={moreOpen ? 0 : -1}
                onClick={() => { navigate(path); setMoreOpen(false); }}
                // Os atalhos entram um após o outro.
                style={{ transitionDelay: moreOpen ? `${60 + indice * 25}ms` : '0ms' }}
                className={`flex min-h-[92px] flex-col items-center justify-center gap-2 rounded-2xl border px-1.5 py-3 text-center text-[11px] font-semibold leading-tight transition-all duration-300 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#087ef5] ${
                  moreOpen ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
                } ${
                  ativo
                    ? 'border-[#8cc8ff] bg-[#eaf4ff] text-[#005a9c] shadow-[0_10px_20px_-14px_rgba(8,119,201,.8)] dark:border-sky-500/50 dark:bg-sky-500/10 dark:text-sky-200'
                    : 'border-[#e6edf6] bg-white text-[#102d58] shadow-[0_6px_16px_-14px_rgba(8,43,87,.6)] hover:border-[#c5dcf3] dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200'
                }`}
              >
                <span className={`grid h-10 w-10 place-items-center rounded-xl ${tom}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="line-clamp-2">{label}</span>
              </button>
            );
          })}
        </div>

        {isInstallAvailable(pwa) && (
          <button
            type="button"
            tabIndex={moreOpen ? 0 : -1}
            onClick={() => { setMoreOpen(false); openInstallSheet(); }}
            className="mt-3 flex min-h-12 w-full items-center gap-3 rounded-2xl bg-gradient-to-r from-[#075fa7] to-[#043c74] px-3 text-left text-sm font-bold text-white shadow-[0_12px_24px_-14px_rgba(4,60,116,.9)] active:scale-[.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087ef5]"
          >
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/15"><Download className="h-4 w-4" /></span>
            <span className="flex-1">Instalar app no celular</span>
            <ChevronRight className="h-4 w-4 opacity-70" />
          </button>
        )}
      </section>

      <nav aria-label="Navegação principal" className="fixed inset-x-0 bottom-0 z-50 flex min-h-[72px] items-start gap-1 border-t border-[#0a71bb] bg-[linear-gradient(160deg,#075fa7_0%,#005a9c_48%,#043c74_100%)] px-1.5 pb-[calc(8px+env(safe-area-inset-bottom))] pt-2 shadow-[0_-10px_24px_-14px_rgba(4,60,116,.6)] md:hidden">
        {primaryItems.map(({ label, path, icon: Icon }) => (
          <NavLink key={path} to={path} className={({ isActive }) => `flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 text-[10px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${isActive && !moreOpen ? 'bg-white text-[#005a9c] shadow-[0_8px_18px_-10px_rgba(0,0,0,.55)]' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}>
            <Icon className="h-5 w-5 shrink-0" /><span className="max-w-full truncate">{label}</span>
          </NavLink>
        ))}
        <button aria-expanded={moreOpen} aria-haspopup="dialog" onClick={() => setMoreOpen((value) => !value)} className={`flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 text-[10px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${isMoreActive || moreOpen ? 'bg-white text-[#005a9c] shadow-[0_8px_18px_-10px_rgba(0,0,0,.55)]' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}>
          {moreOpen ? <X className="h-5 w-5 shrink-0" /> : <MoreHorizontal className="h-5 w-5 shrink-0" />}<span className="max-w-full truncate">{moreOpen ? 'Fechar' : 'Mais'}</span>
        </button>
      </nav>
    </>
  );
};

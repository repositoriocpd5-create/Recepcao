import React, { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  UserCheck,
  ArrowRightLeft,
  Users,
  Briefcase,
  CheckCircle2,
  Calendar,
  LayoutDashboard,
  Building2,
  ShieldCheck,
  ChevronRight,
  BadgeCheck,
  BookOpen,
  Phone,
  X,
  LogOut,
  Shield,
  Home,
  FileText,
  HelpCircle,
  ScrollText,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { cn } from '@/lib/utils';
import { ROTULO_PAPEL, moduloDaRota, perfilCco } from '@/lib/modulos';
import { SeletorModulo } from './SeletorModulo';

type ItemMenu = { name: string; path: string; icon: typeof Home; badge?: string; end?: boolean };
type SecaoMenu = { titulo: string; itens: ItemMenu[]; seta?: boolean };

/** Item do menu: no celular é maior (toque confortável); no computador segue compacto. */
const itemClass = (isActive: boolean, isCollapsed: boolean) =>
  cn(
    'flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all group md:rounded-lg md:py-2 md:text-xs',
    isCollapsed && 'md:justify-center md:px-2',
    isActive
      ? 'bg-white text-[#005a9c] border border-white font-bold shadow-[0_8px_18px_-10px_rgba(0,0,0,.55)]'
      : 'border border-transparent text-white/90 hover:text-white hover:bg-white/15 active:bg-white/20'
  );

export const Sidebar: React.FC<{ isOpen?: boolean; isCollapsed?: boolean; onClose?: () => void }> = ({
  isOpen,
  isCollapsed = false,
  onClose,
}) => {
  const { user, logout } = useAuth();
  const modulo = moduloDaRota(useLocation().pathname);

  // Celular com o menu aberto: trava a rolagem da página e fecha no Esc.
  useEffect(() => {
    if (!isOpen) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);

  const operationalNav = [
    { name: 'Recepção (Atendimento)', path: '/recepcao', icon: UserCheck, badge: 'Principal' },
    { name: 'Movimentações', path: '/movimentacoes', icon: ArrowRightLeft },
    { name: 'Ramais', path: '/ramais', icon: Phone },
    { name: 'Visitantes', path: '/visitantes', icon: Users },
    { name: 'Servidores', path: '/servidores', icon: Briefcase },
    { name: 'Autorizações', path: '/autorizacoes', icon: CheckCircle2 },
    // Agendamentos: somente administradores
    ...(user?.role === 'admin' ? [{ name: 'Agendamentos', path: '/agendamentos', icon: Calendar }] : []),
    { name: 'Crachás', path: '/crachas', icon: BadgeCheck },
    { name: 'Manual de Uso', path: '/manual', icon: BookOpen },
  ];

  const managementNav = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    // Log do sistema (antes "Relatórios & Auditoria"): somente administradores
    ...(user?.role === 'admin' ? [{ name: 'Log do sistema', path: '/log-do-sistema', icon: ScrollText }] : []),
    { name: 'Departamentos & Setores', path: '/departamentos', icon: Building2 },
    ...(user?.role === 'admin'
      ? [{ name: 'Administração', path: '/administracao', icon: ShieldCheck }]
      : []),
  ];

  // CCO — Central Controle Operacional: a unidade registra; equipe e admin acompanham no painel.
  const perfil = perfilCco(user);
  const secoesCco: SecaoMenu[] = [
    {
      titulo: 'Central Operacional',
      itens: [
        { name: perfil === 'unidade' ? 'Início' : 'Painel de ocorrências', path: '/cco', icon: Home, end: true },
        ...(perfil === 'unidade' ? [{ name: 'Minhas ocorrências', path: '/cco/ocorrencias', icon: FileText }] : []),
        { name: 'Ajuda', path: '/cco/ajuda', icon: HelpCircle },
      ],
    },
    ...(user?.role === 'admin'
      ? [{
          titulo: 'Gestão',
          seta: true,
          itens: [
            { name: 'Usuários e unidades', path: '/cco/usuarios', icon: ShieldCheck },
            { name: 'Log do sistema', path: '/cco/log', icon: ScrollText },
          ],
        }]
      : user?.role === 'cco_admin'
        ? [{ titulo: 'Gestão', itens: [{ name: 'Log do sistema', path: '/cco/log', icon: ScrollText }] }]
        : []),
  ];

  const secoes: SecaoMenu[] = modulo === 'cco'
    ? secoesCco
    : [
        { titulo: 'Operação da Recepção', itens: operationalNav },
        { titulo: 'Gestão & Controle', itens: managementNav, seta: true },
      ];

  return (
    <aside
      aria-label="Menu de navegação"
      className={cn(
        'bg-[linear-gradient(160deg,#075fa7_0%,#005a9c_48%,#043c74_100%)] border-r border-[#0a71bb] flex flex-col shrink-0 text-white dark:from-[#075fa7] dark:via-[#005a9c] dark:to-[#043c74] dark:border-[#0a71bb]',
        // Celular: gaveta de altura total, acima do cabeçalho e do menu inferior.
        'fixed inset-y-0 left-0 z-[60] w-[min(86vw,320px)] rounded-r-[28px] shadow-[18px_0_40px_-12px_rgba(4,30,64,.55)] transition-[transform,width] duration-300 ease-[cubic-bezier(.22,1,.36,1)]',
        // Computador: coluna fixa ao lado do conteúdo.
        'md:static md:z-auto md:w-[212px] md:min-h-[calc(100vh-65px)] md:rounded-none md:shadow-[8px_0_22px_-18px_rgba(18,44,82,.36)] md:duration-200',
        isCollapsed && 'md:w-[64px]',
        isOpen ? 'translate-x-0' : '-translate-x-[105%] md:translate-x-0'
      )}
    >
      {/* Cabeçalho da gaveta (só no celular) */}
      <div className="shrink-0 px-4 pb-4 pt-[calc(16px+env(safe-area-inset-top))] md:hidden">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white p-1.5 shadow-[0_6px_16px_-6px_rgba(0,0,0,.45)]">
            <img src="/assets/brasao_itaguai.png" alt="" className="h-full w-full object-contain" />
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="flex items-center gap-1.5 text-base">
              <span className="font-extrabold tracking-tight">SMEDU</span>
              <span aria-hidden="true" className="h-4 w-px bg-white/60" />
              <span className="font-light tracking-wide">{modulo === 'cco' ? 'CCO' : 'Recepção'}</span>
            </p>
            <p className="mt-0.5 truncate text-[11px] text-blue-100/80">Secretaria de Educação · Itaguaí</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/20 transition-colors hover:bg-white/20 active:bg-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {user && (
          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white/10 p-3 ring-1 ring-white/15 backdrop-blur-sm">
            <UserAvatar nome={user.nome_completo} className="h-11 w-11 text-sm ring-white/40" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{user.nome_completo}</p>
              <p className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-200 ring-1 ring-emerald-300/30">
                <Shield className="h-3 w-3" />{ROTULO_PAPEL[user.role] || user.role}
              </p>
            </div>
          </div>
        )}
        <SeletorModulo variante="azul" className="mt-3 flex w-full" onTrocar={onClose} />
      </div>
      <div aria-hidden="true" className="mx-4 h-px shrink-0 bg-gradient-to-r from-transparent via-white/25 to-transparent md:hidden" />

      <div className={cn('flex-1 space-y-6 overflow-y-auto overscroll-contain px-3 py-4 [scrollbar-width:none] md:p-3 md:[scrollbar-width:auto] [&::-webkit-scrollbar]:hidden md:[&::-webkit-scrollbar]:block', isCollapsed && 'md:px-2')}>
        {secoes.map((secao) => (
          <div key={secao.titulo}>
            {!isCollapsed && <div className="px-3 mb-2 text-[11px] font-bold tracking-wider text-blue-100/80 uppercase">
              {secao.titulo}
            </div>}
            <nav aria-label={secao.titulo} className="space-y-1">
              {secao.itens.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.end}
                    onClick={onClose}
                    title={isCollapsed ? item.name : undefined}
                    className={({ isActive }) => itemClass(isActive, isCollapsed)}
                  >
                    <div className="flex items-center gap-3 md:gap-2.5">
                      <Icon className="h-5 w-5 text-inherit md:h-4 md:w-4" />
                      {!isCollapsed && <span>{item.name}</span>}
                    </div>
                    {item.badge && !isCollapsed && (
                      <span className="text-[10px] bg-[#d9efff] text-[#005a9c] px-1.5 py-0.5 rounded border border-white/60">
                        {item.badge}
                      </span>
                    )}
                    {secao.seta && !isCollapsed && <ChevronRight className="w-3.5 h-3.5 text-blue-100/70 group-hover:text-white transition-colors" />}
                  </NavLink>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Rodapé institucional (computador, CCO) */}
      {modulo === 'cco' && !isCollapsed && (
        <div className="mx-4 hidden shrink-0 border-t border-white/20 py-4 text-[11px] font-bold tracking-wider text-blue-100/80 md:block">
          SMEDU <span aria-hidden="true">•</span> ITAGUAÍ
        </div>
      )}

      {/* Rodapé da gaveta (só no celular) */}
      <div className="shrink-0 border-t border-white/10 px-4 pb-[calc(16px+env(safe-area-inset-bottom))] pt-3 md:hidden">
        <button
          type="button"
          onClick={() => { onClose?.(); void logout(); }}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-white/10 text-sm font-semibold text-white ring-1 ring-white/15 transition-colors hover:bg-rose-500/25 hover:ring-rose-300/40 active:bg-rose-500/30"
        >
          <LogOut className="h-4 w-4" /> Sair do sistema
        </button>
      </div>
    </aside>
  );
};

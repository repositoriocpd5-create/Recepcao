import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  UserCheck,
  ArrowRightLeft,
  Users,
  Briefcase,
  CheckCircle2,
  Calendar,
  LayoutDashboard,
  FileSpreadsheet,
  Building2,
  ShieldCheck,
  ChevronRight,
  BadgeCheck,
  BookOpen,
  Phone,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

export const Sidebar: React.FC<{ isOpen?: boolean; isCollapsed?: boolean; onClose?: () => void }> = ({
  isOpen,
  isCollapsed = false,
  onClose,
}) => {
  const { user } = useAuth();
  const isAdminOrGestor = user?.role === 'admin' || user?.role === 'gestor';

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
    // Relatórios & Auditoria: somente administradores
    ...(user?.role === 'admin' ? [{ name: 'Relatórios & Auditoria', path: '/relatorios', icon: FileSpreadsheet }] : []),
    { name: 'Departamentos & Setores', path: '/departamentos', icon: Building2 },
    ...(user?.role === 'admin'
      ? [{ name: 'Administração', path: '/administracao', icon: ShieldCheck }]
      : []),
  ];

  return (
    <aside
      className={cn(
        'w-[212px] bg-[linear-gradient(160deg,#075fa7_0%,#005a9c_48%,#043c74_100%)] border-r border-[#0a71bb] shadow-[8px_0_22px_-18px_rgba(18,44,82,.36)] flex flex-col shrink-0 min-h-[calc(100vh-65px)] text-white dark:from-[#075fa7] dark:via-[#005a9c] dark:to-[#043c74] dark:border-[#0a71bb]',
        'fixed md:static top-[65px] bottom-0 left-0 z-30 transition-[transform,width] duration-200',
        isCollapsed && 'md:w-[64px]',
        isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      )}
    >
      <div className={cn('p-3 flex-1 space-y-6 overflow-y-auto', isCollapsed && 'md:px-2')}>
        {/* Seção Operacional */}
        <div>
          {!isCollapsed && <div className="px-3 mb-2 text-[11px] font-bold tracking-wider text-blue-100/80 uppercase">
            Operação da Recepção
          </div>}
          <nav className="space-y-1">
            {operationalNav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  title={isCollapsed ? item.name : undefined}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all group',
                      isCollapsed && 'md:justify-center md:px-2',
                      isActive
                        ? 'bg-white text-[#005a9c] border border-white font-bold shadow-[0_8px_18px_-10px_rgba(0,0,0,.55)]'
                        : 'text-white/90 hover:text-white hover:bg-white/15'
                    )
                  }
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 text-inherit" />
                    {!isCollapsed && <span>{item.name}</span>}
                  </div>
                  {item.badge && !isCollapsed && (
                    <span className="text-[10px] bg-[#d9efff] text-[#005a9c] px-1.5 py-0.5 rounded border border-white/60">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Seção de Gestão & Auditoria */}
        <div>
          {!isCollapsed && <div className="px-3 mb-2 text-[11px] font-bold tracking-wider text-blue-100/80 uppercase">
            Gestão & Controle
          </div>}
          <nav className="space-y-1">
            {managementNav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  title={isCollapsed ? item.name : undefined}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all group',
                      isCollapsed && 'md:justify-center md:px-2',
                      isActive
                        ? 'bg-white text-[#005a9c] border border-white font-bold shadow-[0_8px_18px_-10px_rgba(0,0,0,.55)]'
                        : 'text-white/90 hover:text-white hover:bg-white/15'
                    )
                  }
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 text-inherit" />
                    {!isCollapsed && <span>{item.name}</span>}
                  </div>
                  {!isCollapsed && <ChevronRight className="w-3.5 h-3.5 text-blue-100/70 group-hover:text-white transition-colors" />}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>

    </aside>
  );
};

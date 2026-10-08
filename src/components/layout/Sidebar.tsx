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
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

export const Sidebar: React.FC<{ isOpen?: boolean; onClose?: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const { user } = useAuth();
  const isAdminOrGestor = user?.role === 'admin' || user?.role === 'gestor';

  const operationalNav = [
    { name: 'Recepção (Atendimento)', path: '/recepcao', icon: UserCheck, badge: 'Principal' },
    { name: 'Movimentações', path: '/movimentacoes', icon: ArrowRightLeft },
    { name: 'Visitantes', path: '/visitantes', icon: Users },
    { name: 'Servidores', path: '/servidores', icon: Briefcase },
    { name: 'Autorizações', path: '/autorizacoes', icon: CheckCircle2 },
    { name: 'Agendamentos', path: '/agendamentos', icon: Calendar },
  ];

  const managementNav = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Relatórios & Auditoria', path: '/relatorios', icon: FileSpreadsheet },
    { name: 'Departamentos & Setores', path: '/departamentos', icon: Building2 },
    ...(user?.role === 'admin'
      ? [{ name: 'Administração', path: '/administracao', icon: ShieldCheck }]
      : []),
  ];

  return (
    <aside
      className={cn(
        'w-64 bg-[#0e121d] border-r border-slate-800/80 flex flex-col shrink-0 min-h-[calc(100vh-65px)]',
        'fixed lg:static top-[65px] bottom-0 left-0 z-30 transition-transform duration-200',
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}
    >
      <div className="p-4 flex-1 space-y-6 overflow-y-auto">
        {/* Seção Operacional */}
        <div>
          <div className="px-3 mb-2 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
            Operação da Recepção
          </div>
          <nav className="space-y-1">
            {operationalNav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all group',
                      isActive
                        ? 'bg-emerald-600/15 text-emerald-400 border border-emerald-500/30 font-semibold'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                    )
                  }
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 text-inherit" />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30">
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
          <div className="px-3 mb-2 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
            Gestão & Controle
          </div>
          <nav className="space-y-1">
            {managementNav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all group',
                      isActive
                        ? 'bg-emerald-600/15 text-emerald-400 border border-emerald-500/30 font-semibold'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                    )
                  }
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 text-inherit" />
                    <span>{item.name}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-colors" />
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Rodapé da sidebar com versão e ambiente */}
      <div className="p-3 border-t border-slate-800/80 bg-[#0a0d15] text-[11px] text-slate-400">
        <div className="flex items-center justify-between">
          <span className="font-mono">v1.0.0-homolog</span>
          <span className="text-emerald-500 font-medium">Build Homologado</span>
        </div>
        <p className="text-[10px] text-slate-400 mt-1">
          Segurança Supabase RLS ativa
        </p>
      </div>
    </aside>
  );
};

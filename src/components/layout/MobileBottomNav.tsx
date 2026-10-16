import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { BadgeCheck, BookOpen, Briefcase, Building2, Calendar, CheckCircle2, ChevronRight, FileSpreadsheet, Home, LayoutDashboard, MoreHorizontal, ShieldCheck, Users, ArrowRightLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const primaryItems = [
  { label: 'Recepção', path: '/recepcao', icon: Home },
  { label: 'Visitantes', path: '/visitantes', icon: Users },
  { label: 'Servidores', path: '/servidores', icon: Briefcase },
  { label: 'Crachás', path: '/crachas', icon: BadgeCheck },
];

export const MobileBottomNav = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreItems = [
    { label: 'Movimentações', path: '/movimentacoes', icon: ArrowRightLeft },
    { label: 'Autorizações', path: '/autorizacoes', icon: CheckCircle2 },
    { label: 'Agendamentos', path: '/agendamentos', icon: Calendar },
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Relatórios & Auditoria', path: '/relatorios', icon: FileSpreadsheet },
    { label: 'Departamentos & Setores', path: '/departamentos', icon: Building2 },
    ...(user?.role === 'admin' ? [{ label: 'Administração', path: '/administracao', icon: ShieldCheck }] : []),
    { label: 'Manual de Uso', path: '/manual', icon: BookOpen },
  ];
  const isMoreActive = moreItems.some((item) => item.path === location.pathname);

  return (
    <>
      {moreOpen && <button aria-label="Fechar menu mais" className="fixed inset-0 z-40 bg-[#082b57]/20 backdrop-blur-[1px] md:hidden" onClick={() => setMoreOpen(false)} />}
      {moreOpen && (
        <section role="dialog" aria-label="Mais opções de navegação" className="fixed inset-x-3 bottom-[calc(76px+env(safe-area-inset-bottom))] z-50 rounded-2xl border border-[#d7e6f6] bg-white p-2 shadow-[0_18px_42px_rgba(8,43,87,.22)] md:hidden">
          <p className="px-3 pb-2 pt-1 text-xs font-bold uppercase tracking-wider text-[#68809f]">Mais opções</p>
          {moreItems.map(({ label, path, icon: Icon }) => (
            <button key={path} onClick={() => { navigate(path); setMoreOpen(false); }} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-[#102d58] hover:bg-[#f4f9ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#087ef5]">
              <Icon className="h-5 w-5 text-[#075aa6]" /><span className="flex-1">{label}</span><ChevronRight className="h-4 w-4 text-[#68809f]" />
            </button>
          ))}
        </section>
      )}
      <nav aria-label="Navegação principal" className="fixed inset-x-0 bottom-0 z-50 flex min-h-[76px] items-start justify-around border-t border-[#d7e6f6] bg-white/95 px-1 pb-[calc(8px+env(safe-area-inset-bottom))] pt-2 backdrop-blur md:hidden">
        {primaryItems.map(({ label, path, icon: Icon }) => (
          <NavLink key={path} to={path} className={({ isActive }) => `flex min-h-11 min-w-[58px] flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10px] font-semibold transition-colors ${isActive ? 'text-[#087ef5]' : 'text-[#526d91]'}`}>
            {({ isActive }) => <><Icon className={`h-6 w-6 ${isActive ? 'fill-[#087ef5]/10' : ''}`} /><span>{label}</span></>}
          </NavLink>
        ))}
        <button aria-expanded={moreOpen} onClick={() => setMoreOpen((value) => !value)} className={`flex min-h-11 min-w-[58px] flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10px] font-semibold ${isMoreActive || moreOpen ? 'text-[#087ef5]' : 'text-[#526d91]'}`}>
          <MoreHorizontal className="h-6 w-6" /><span>Mais</span>
        </button>
      </nav>
    </>
  );
};

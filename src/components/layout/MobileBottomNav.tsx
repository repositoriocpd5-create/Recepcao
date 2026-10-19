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
        <section role="dialog" aria-label="Mais opções de navegação" className="fixed inset-x-3 bottom-[calc(80px+env(safe-area-inset-bottom))] z-50 rounded-2xl border border-[#d7e6f6] bg-white p-2 shadow-[0_18px_42px_rgba(8,43,87,.22)] md:hidden">
          <p className="px-3 pb-2 pt-1 text-xs font-bold uppercase tracking-wider text-[#68809f]">Mais opções</p>
          {moreItems.map(({ label, path, icon: Icon }) => (
            <button key={path} onClick={() => { navigate(path); setMoreOpen(false); }} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-[#102d58] hover:bg-[#f4f9ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#087ef5]">
              <Icon className="h-5 w-5 text-[#075aa6]" /><span className="flex-1">{label}</span><ChevronRight className="h-4 w-4 text-[#68809f]" />
            </button>
          ))}
        </section>
      )}
      <nav aria-label="Navegação principal" className="fixed inset-x-0 bottom-0 z-50 flex min-h-[72px] items-start gap-1 border-t border-[#0a71bb] bg-[linear-gradient(160deg,#075fa7_0%,#005a9c_48%,#043c74_100%)] px-1.5 pb-[calc(8px+env(safe-area-inset-bottom))] pt-2 shadow-[0_-10px_24px_-14px_rgba(4,60,116,.6)] md:hidden">
        {primaryItems.map(({ label, path, icon: Icon }) => (
          <NavLink key={path} to={path} className={({ isActive }) => `flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 text-[10px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${isActive ? 'bg-white text-[#005a9c] shadow-[0_8px_18px_-10px_rgba(0,0,0,.55)]' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}>
            <Icon className="h-5 w-5 shrink-0" /><span className="max-w-full truncate">{label}</span>
          </NavLink>
        ))}
        <button aria-expanded={moreOpen} onClick={() => setMoreOpen((value) => !value)} className={`flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 text-[10px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${isMoreActive || moreOpen ? 'bg-white text-[#005a9c] shadow-[0_8px_18px_-10px_rgba(0,0,0,.55)]' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}>
          <MoreHorizontal className="h-5 w-5 shrink-0" /><span className="max-w-full truncate">Mais</span>
        </button>
      </nav>
    </>
  );
};

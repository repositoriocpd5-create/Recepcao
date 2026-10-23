import React, { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { acessaCco, acessaRecepcao, lembrarModulo, moduloDaRota } from '@/lib/modulos';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { MobileBottomNav } from './MobileBottomNav';

export const AppLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem('smedu-sidebar-collapsed') === 'true'
  );

  const { user } = useAuth();
  const { pathname } = useLocation();
  // Guarda o módulo em uso: no próximo login, quem acessa os dois volta para ele.
  useEffect(() => {
    const modulo = moduloDaRota(pathname);
    if (modulo === 'cco' ? acessaCco(user) : acessaRecepcao(user)) lembrarModulo(user, modulo);
  }, [pathname, user]);

  const fecharMenu = useCallback(() => setMobileMenuOpen(false), []);

  const toggleSidebar = () => {
    setSidebarCollapsed((collapsed) => {
      localStorage.setItem('smedu-sidebar-collapsed', String(!collapsed));
      return !collapsed;
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[radial-gradient(circle_at_88%_74%,#e9f5ff_0,transparent_26%),linear-gradient(135deg,#f7fbff_0%,#eef6ff_100%)] text-[#152238] dark:bg-none dark:bg-[#0b0f19] dark:text-slate-100">
      <Navbar sidebarCollapsed={sidebarCollapsed} onToggleSidebar={toggleSidebar} onOpenMobileMenu={() => setMobileMenuOpen(true)} />

      <div className="flex flex-1 relative">
        <Sidebar
          isOpen={mobileMenuOpen}
          isCollapsed={sidebarCollapsed}
          onClose={fecharMenu}
        />

        {/* Backdrop para mobile */}
        <div
          aria-hidden="true"
          className={`fixed inset-0 z-[55] bg-[#04162e]/55 backdrop-blur-[2px] transition-opacity duration-300 md:hidden ${mobileMenuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
          onClick={() => setMobileMenuOpen(false)}
        />

        {/* Conteúdo principal */}
        <main className="min-w-0 flex-1 overflow-x-clip p-4 pb-28 md:pb-6 lg:px-7 lg:py-6">
          {/* Painel do CCO: tabela com muitas colunas, usa mais largura da tela. */}
          <div className={`mx-auto w-full min-w-0 ${pathname === '/cco' ? 'max-w-[1680px]' : 'max-w-[1240px]'}`}>
            <Outlet />
          </div>
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
};

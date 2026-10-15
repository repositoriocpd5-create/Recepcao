import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { Menu } from 'lucide-react';

export const AppLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem('smedu-sidebar-collapsed') === 'true'
  );

  const toggleSidebar = () => {
    setSidebarCollapsed((collapsed) => {
      localStorage.setItem('smedu-sidebar-collapsed', String(!collapsed));
      return !collapsed;
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[radial-gradient(circle_at_88%_74%,#e9f5ff_0,transparent_26%),linear-gradient(135deg,#f7fbff_0%,#eef6ff_100%)] text-[#152238] dark:bg-[#0b0f19] dark:text-slate-100">
      <Navbar sidebarCollapsed={sidebarCollapsed} onToggleSidebar={toggleSidebar} />

      {/* Barra de controle móvel para abrir menu */}
      <div className="lg:hidden flex items-center justify-between px-4 py-2 bg-white border-b border-[#dce4f0] text-xs dark:bg-[#101625] dark:border-slate-800">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="flex items-center gap-2 text-[#627289] hover:text-[#005a9c] dark:text-slate-300 dark:hover:text-white"
        >
          <Menu className="w-4 h-4" />
          <span>Menu de navegação</span>
        </button>
        <span className="text-slate-400">SMEDU Recepção</span>
      </div>

      <div className="flex flex-1 relative">
        <Sidebar
          isOpen={mobileMenuOpen}
          isCollapsed={sidebarCollapsed}
          onClose={() => setMobileMenuOpen(false)}
        />

        {/* Backdrop para mobile */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-20 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Conteúdo principal */}
        <main className="flex-1 p-4 lg:px-7 lg:py-6 overflow-x-hidden">
          <div className="max-w-[1240px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

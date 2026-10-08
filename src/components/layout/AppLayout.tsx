import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { Menu } from 'lucide-react';

export const AppLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0f19] text-slate-100">
      <Navbar />

      {/* Barra de controle móvel para abrir menu */}
      <div className="lg:hidden flex items-center justify-between px-4 py-2 bg-[#101625] border-b border-slate-800 text-xs">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="flex items-center gap-2 text-slate-300 hover:text-white"
        >
          <Menu className="w-4 h-4" />
          <span>Menu de navegação</span>
        </button>
        <span className="text-slate-400">SME Recepção</span>
      </div>

      <div className="flex flex-1 relative">
        <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

        {/* Backdrop para mobile */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-20 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Conteúdo principal */}
        <main className="flex-1 p-4 lg:p-8 overflow-x-hidden">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

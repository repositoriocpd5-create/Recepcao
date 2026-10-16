import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { MobileBottomNav } from './MobileBottomNav';

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
      <Navbar sidebarCollapsed={sidebarCollapsed} onToggleSidebar={toggleSidebar} onOpenMobileMenu={() => setMobileMenuOpen(true)} />

      <div className="flex flex-1 relative">
        <Sidebar
          isOpen={mobileMenuOpen}
          isCollapsed={sidebarCollapsed}
          onClose={() => setMobileMenuOpen(false)}
        />

        {/* Backdrop para mobile */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-20 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Conteúdo principal */}
        <main className="flex-1 overflow-x-hidden p-4 pb-28 md:pb-6 lg:px-7 lg:py-6">
          <div className="max-w-[1240px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
};

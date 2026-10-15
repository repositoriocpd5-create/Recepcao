import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, LogOut, Database, RefreshCw, Moon, Sun, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { UserRole } from '@/types';
import { resetTestData } from '@/services/dataService';

interface NavbarProps {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ sidebarCollapsed, onToggleSidebar }) => {
  const { user, logout, login, isSupabaseLive } = useAuth();
  const [theme, setTheme] = useState<'dark' | 'light'>(
    () => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'),
  );
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [profilePassword, setProfilePassword] = useState('');
  const [profileLoginError, setProfileLoginError] = useState('');
  const [isProfileLoginLoading, setIsProfileLoginLoading] = useState(false);

  const profileOptions: Record<UserRole, { label: string; email: string }> = {
    recepcionista: { label: 'Recepcionista', email: 'recepcionista.smedu@edu.itaguai.rj.gov.br' },
    admin: { label: 'Admin', email: 'cpdinfra@edu.itaguai.rj.gov.br' },
    gestor: { label: 'Gestor', email: 'cpdinfra@edu.itaguai.rj.gov.br' },
    atendente: { label: 'Atendente', email: '' },
  };

  const openProfileLogin = (role: UserRole) => {
    setSelectedRole(role);
    setProfilePassword('');
    setProfileLoginError('');
  };

  const handleProfileLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedRole || !profilePassword) return;
    if (!isSupabaseLive) {
      setProfileLoginError('Conecte o sistema ao Supabase para validar a senha deste perfil.');
      return;
    }
    if (selectedRole === 'gestor' && profileOptions.gestor.email === profileOptions.admin.email) {
      setProfileLoginError('O perfil Gestor precisa de um e-mail próprio no Supabase; o e-mail informado já está reservado ao perfil Admin.');
      return;
    }
    setIsProfileLoginLoading(true);
    setProfileLoginError('');
    try {
      await login(profileOptions[selectedRole].email, profilePassword, selectedRole);
      setSelectedRole(null);
      setProfilePassword('');
    } catch (error: any) {
      setProfileLoginError(error.message || 'Não foi possível validar a senha para este perfil.');
    } finally {
      setIsProfileLoginLoading(false);
    }
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = nextTheme;
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
    localStorage.setItem('sme-theme', nextTheme);
    setTheme(nextTheme);
  };

  const handleResetData = () => {
    if (confirm('Deseja restaurar os dados de teste para o estado inicial padrão?')) {
      resetTestData();
      window.location.reload();
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-[#dce4f0] px-4 lg:px-8 py-3 shadow-[0_2px_10px_rgba(18,44,82,.04)] dark:bg-[#0f1422]/95 dark:border-slate-800/80 dark:shadow-none">
      <div className="flex items-center justify-between gap-4">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="hidden lg:inline-flex p-2 rounded-lg border border-[#dce4f0] text-[#005a9c] hover:bg-[#edf5fc] transition-colors dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            title={sidebarCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
            aria-label={sidebarCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
          >
            {sidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-lg shadow-blue-950/20 border border-[#b9d9f3] overflow-hidden dark:bg-slate-800 dark:border-emerald-400/30 dark:shadow-emerald-950/40">
            <img
              src="/assets/brasao_itaguai.png"
              alt="Brasão do Município de Itaguaí"
              className="w-9 h-9 object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-extrabold tracking-wider text-[#071d41] uppercase dark:text-slate-100">
                SECRETARIA MUNICIPAL DE EDUCAÇÃO
              </h1>
              <span className="text-[10px] bg-[#edf5fc] text-[#005a9c] px-2 py-0.5 rounded font-mono border border-[#b9d9f3] dark:bg-slate-800 dark:text-emerald-400 dark:border-emerald-500/20">
                SMEDU
              </span>
            </div>
            <p className="text-xs text-[#627289] dark:text-slate-400">
              Sistema de Recepção e Controle de Acesso
            </p>
          </div>
        </div>

        {/* Status Pills and User actions */}
        <div className="flex items-center gap-3">
          {/* Supabase status indicator */}
          <div
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              isSupabaseLive
                ? 'bg-emerald-950/50 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-950/40 text-amber-300 border-amber-500/30'
            }`}
            title={
              isSupabaseLive
                ? 'Conectado ao Supabase PostgreSQL com RLS'
                : 'Ambiente de Testes / Modo Homologação com Armazenamento Local'
            }
          >
            <Database className="w-3.5 h-3.5" />
            <span>{isSupabaseLive ? 'Supabase Conectado' : 'Modo Homologação Ativo'}</span>
          </div>

          {/* Quick role switcher for testing */}
          {user && (
            <div className="hidden md:flex items-center gap-1 bg-[#151c2c] border border-slate-700/80 rounded-lg p-0.5 text-xs">
              <span className="px-2 text-slate-400 text-[11px]">Perfil teste:</span>
              {(['recepcionista', 'admin', 'gestor'] as UserRole[]).map((r) => (
                <button
                  key={r}
                  onClick={() => openProfileLogin(r)}
                  className={`px-2 py-0.5 rounded text-[11px] capitalize font-medium transition-colors ${
                    user.role === r
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {r}
                </button>
              ))}
              <button
                onClick={handleResetData}
                title="Restaurar dados de teste"
                className="px-1.5 py-0.5 text-slate-400 hover:text-amber-400 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
            aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
            className="theme-toggle p-2 rounded-lg border border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* User profile dropdown & logout */}
          {user && (
            <div className="flex items-center gap-3 pl-2 border-l border-slate-800">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-semibold text-slate-200">{user.nome_completo}</div>
                <div className="text-[11px] text-emerald-400 flex items-center justify-end gap-1">
                  <Shield className="w-3 h-3" />
                  <span className="capitalize">{user.role}</span>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                title="Encerrar sessão"
                className="text-slate-400 hover:text-rose-400 hover:bg-rose-950/30"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sair</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={Boolean(selectedRole)}
        onClose={() => setSelectedRole(null)}
        title={`Acessar perfil ${selectedRole ? profileOptions[selectedRole].label : ''}`}
        description="Informe a senha cadastrada para confirmar a troca de perfil."
        maxWidth="sm"
      >
        {selectedRole && (
          <form onSubmit={handleProfileLogin} className="space-y-4">
            <div className="rounded-lg border border-[#dce4f0] bg-[#f8fbff] p-3 text-xs text-[#52647d] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              <span className="block text-[10px] uppercase tracking-wide text-[#627289] dark:text-slate-400">Usuário</span>
              <strong>{profileOptions[selectedRole].email}</strong>
            </div>
            <Input
              label="Senha"
              type="password"
              value={profilePassword}
              onChange={(event) => setProfilePassword(event.target.value)}
              autoFocus
              required
            />
            {profileLoginError && <p className="rounded-lg border border-[#fecaca] bg-[#fef2f2] p-3 text-xs font-medium text-[#b91c1c] dark:border-rose-500/30 dark:bg-rose-950/30 dark:text-rose-200">{profileLoginError}</p>}
            <div className="flex justify-end gap-3 pt-1">
              <Button type="button" variant="outline" onClick={() => setSelectedRole(null)}>Cancelar</Button>
              <Button type="submit" variant="primary" isLoading={isProfileLoginLoading}>Confirmar acesso</Button>
            </div>
          </form>
        )}
      </Modal>
    </header>
  );
};

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, LogOut, RefreshCw, Moon, Sun, PanelLeftClose, PanelLeftOpen, Menu, UserRound, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { UserRole } from '@/types';
import { resetTestData } from '@/services/dataService';
import { ThemeToggle, useTheme } from './ThemeToggle';

interface NavbarProps {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onOpenMobileMenu: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ sidebarCollapsed, onToggleSidebar, onOpenMobileMenu }) => {
  const { user, logout, login, isSupabaseLive, switchDemoRole } = useAuth();
  const { theme, setTheme } = useTheme();
  const [isAccountOpen, setIsAccountOpen] = useState(false);

  // Painel de conta: Esc fecha e a página não rola por trás.
  useEffect(() => {
    if (!isAccountOpen) return;
    const closeOnEsc = (event: KeyboardEvent) => { if (event.key === 'Escape') setIsAccountOpen(false); };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEsc);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEsc);
    };
  }, [isAccountOpen]);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [profilePassword, setProfilePassword] = useState('');
  const [profileLoginError, setProfileLoginError] = useState('');
  const [isProfileLoginLoading, setIsProfileLoginLoading] = useState(false);

  const getRoleEmail = (role: UserRole, defaultEmail: string) => {
    try {
      const raw = localStorage.getItem('sme_admin_users');
      if (raw) {
        const users = JSON.parse(raw);
        const found = users.find((u: any) => u.role === role);
        if (found?.email) return found.email;
      }
    } catch {}
    return defaultEmail;
  };

  const profileOptions: Record<UserRole, { label: string; email: string }> = {
    recepcionista: { label: 'Recepcionista', email: getRoleEmail('recepcionista', 'recepcao@sme.gov.br') },
    admin: { label: 'Admin', email: getRoleEmail('admin', 'admin@sme.gov.br') },
    gestor: { label: 'Gestor', email: getRoleEmail('gestor', 'gestor@sme.gov.br') },
    atendente: { label: 'Atendente', email: getRoleEmail('atendente', '') },
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

  const handleResetData = () => {
    if (confirm('Deseja restaurar os dados de teste para o estado inicial padrão?')) {
      resetTestData();
      window.location.reload();
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-[#dce4f0] px-4 lg:px-8 py-3 shadow-[0_2px_10px_rgba(18,44,82,.04)] dark:bg-[#0f1422]/95 dark:border-slate-800/80 dark:shadow-none">
      <div className="md:hidden">
        <div className="flex items-center gap-2 min-[380px]:gap-3">
          <button type="button" onClick={onOpenMobileMenu} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[#d7e6f6] bg-white text-[#087ef5] shadow-sm" aria-label="Abrir menu de navegação"><Menu className="h-6 w-6" /></button>
          <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl border border-[#b9d9f3] bg-white shadow-sm max-[379px]:hidden"><img src="/assets/brasao_itaguai.png" alt="Brasão do Município de Itaguaí" className="h-9 w-9 object-contain" /></div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="flex items-start gap-1.5"><h1 className="text-[13px] font-extrabold leading-[1.05] tracking-wide text-[#082b57]">SECRETARIA MUNICIPAL<br />DE EDUCAÇÃO</h1><span className="mt-0.5 hidden rounded border border-[#b9d9f3] bg-[#edf5ff] px-1.5 py-0.5 text-[9px] font-bold text-[#087ef5] min-[420px]:inline">SMEDU</span></div>
            <p className="mt-1 truncate text-[11px] text-[#68809f]">Sistema de Recepção e Controle de Acesso</p>
          </div>
          <ThemeToggle size="sm" />
          <button type="button" onClick={() => setIsAccountOpen(true)} aria-haspopup="dialog" aria-expanded={isAccountOpen} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#e1f0ff] text-[#087ef5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#087ef5]" aria-label="Abrir conta e preferências" title="Conta e preferências"><UserRound className="h-6 w-6" /></button>
        </div>
      </div>

      <div className="hidden md:flex items-center justify-between gap-4">
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
          {/* Quick role switcher for testing */}
          {user && !isSupabaseLive && (
            <div className="hidden md:flex items-center gap-1 bg-[#151c2c] border border-slate-700/80 rounded-lg p-0.5 text-xs">
              <span className="px-2 text-slate-400 text-[11px]">Perfil teste:</span>
              {(['recepcionista', 'admin', 'gestor'] as UserRole[]).map((r) => (
                <button
                  key={r}
                  onClick={() => switchDemoRole(r)}
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

          <ThemeToggle size="sm" />

          {/* User profile dropdown & logout */}
          {user && (
            <div className="flex items-center gap-3 pl-2 border-l border-slate-800">
              <div className="text-right hidden sm:block" title={user.email}>
                <div className="text-xs font-semibold text-slate-200">{user.nome_completo}</div>
                <div className="text-[10px] text-slate-400 font-mono truncate max-w-[180px]">{user.email}</div>
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

      {/* Conta e preferências (smartphone) */}
      {isAccountOpen && createPortal(
        <div className="fixed inset-0 z-[60] md:hidden" role="dialog" aria-modal="true" aria-labelledby="conta-titulo">
          <button type="button" aria-label="Fechar conta e preferências" className="absolute inset-0 bg-[#082b57]/40 backdrop-blur-[2px]" onClick={() => setIsAccountOpen(false)} />
          <section className="absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-[#d7e6f6] bg-white px-4 pb-[calc(20px+env(safe-area-inset-bottom))] pt-3 shadow-[0_-18px_42px_rgba(8,43,87,.25)] dark:border-slate-800 dark:bg-[#0f1422]">
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-[#d7e6f6] dark:bg-slate-700" aria-hidden="true" />
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#e1f0ff] text-[#087ef5] dark:bg-blue-950/60 dark:text-sky-300"><UserRound className="h-6 w-6" /></span>
                <div className="min-w-0">
                  <h2 id="conta-titulo" className="truncate text-sm font-extrabold text-[#082b57] dark:text-slate-100">{user?.nome_completo || 'Operador SMEDU'}</h2>
                  <p className="truncate text-xs text-[#68809f] dark:text-slate-400">{user?.email}</p>
                  {user?.role && <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold capitalize text-[#16a34a] dark:text-emerald-400"><Shield className="h-3 w-3" />{user.role}</p>}
                </div>
              </div>
              <button type="button" onClick={() => setIsAccountOpen(false)} className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[#526d91] hover:bg-[#f2f7ff] dark:text-slate-400 dark:hover:bg-slate-800" aria-label="Fechar"><X className="h-5 w-5" /></button>
            </div>

            <div className="mt-5">
              <p id="aparencia-titulo" className="mb-2 text-xs font-bold uppercase tracking-wider text-[#68809f] dark:text-slate-400">Aparência</p>
              <div role="radiogroup" aria-labelledby="aparencia-titulo" className="grid grid-cols-2 gap-2 rounded-2xl border border-[#d7e6f6] bg-[#f4f9ff] p-1.5 dark:border-slate-800 dark:bg-[#0b0f19]">
                {([
                  { value: 'light', label: 'Claro', Icon: Sun, active: 'bg-white text-[#b45309] shadow-[0_6px_16px_-8px_rgba(245,158,11,.8)] ring-1 ring-[#f59e0b]/50' },
                  { value: 'dark', label: 'Escuro', Icon: Moon, active: 'bg-[#131b2e] text-[#bfdbfe] shadow-[0_6px_16px_-8px_rgba(59,130,246,.9)] ring-1 ring-[#3b82f6]/60' },
                ] as const).map(({ value, label, Icon, active }) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={theme === value}
                    onClick={() => setTheme(value)}
                    className={`flex min-h-12 items-center justify-center gap-2 rounded-xl text-sm font-bold motion-safe:transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#087ef5] ${theme === value ? active : 'text-[#526d91] hover:bg-white/70 dark:text-slate-400 dark:hover:bg-slate-800'}`}
                  >
                    <Icon className="h-5 w-5" />{label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-[#68809f] dark:text-slate-500">A preferência fica salva neste aparelho.</p>
            </div>

            <button type="button" onClick={() => { setIsAccountOpen(false); logout(); }} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#fecaca] bg-[#fef2f2] text-sm font-bold text-[#dc2626] hover:bg-[#fee2e2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#dc2626] dark:border-rose-500/30 dark:bg-rose-950/30 dark:text-rose-300">
              <LogOut className="h-4 w-4" />Sair do sistema
            </button>
          </section>
        </div>,
        document.body,
      )}

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

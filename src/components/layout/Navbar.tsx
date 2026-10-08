import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { BookOpen, Shield, LogOut, Database, UserCheck, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { UserRole } from '@/types';
import { resetTestData } from '@/services/dataService';

export const Navbar: React.FC = () => {
  const { user, logout, isSupabaseLive, switchDemoRole } = useAuth();

  const handleResetData = () => {
    if (confirm('Deseja restaurar os dados de teste para o estado inicial padrão?')) {
      resetTestData();
      window.location.reload();
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0f1422]/95 backdrop-blur border-b border-slate-800/80 px-4 lg:px-8 py-3">
      <div className="flex items-center justify-between gap-4">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-950/40 border border-emerald-400/30">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-extrabold tracking-wider text-slate-100 uppercase">
                SECRETARIA MUNICIPAL DE EDUCAÇÃO
              </h1>
              <span className="text-[10px] bg-slate-800 text-emerald-400 px-2 py-0.5 rounded font-mono border border-emerald-500/20">
                SME
              </span>
            </div>
            <p className="text-xs text-slate-400">
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
          {!isSupabaseLive && user && (
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
    </header>
  );
};

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { BookOpen, Lock, Mail, ArrowRight, Shield, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { UserRole } from '@/types';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isSupabaseLive, user } = useAuth();

  const [email, setEmail] = useState('recepcao@sme.gov.br');
  const [password, setPassword] = useState('sme123456');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Se já logado, redirecionar
  React.useEffect(() => {
    if (user) {
      navigate('/recepcao');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/recepcao');
    } catch (err: any) {
      setErrorMsg(err.message || 'Credenciais inválidas. Verifique o usuário e senha.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemo = async (role: UserRole) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      let demoEmail =
        role === 'admin'
          ? 'admin@sme.gov.br'
          : role === 'gestor'
          ? 'gestor@sme.gov.br'
          : 'recepcao@sme.gov.br';

      try {
        const raw = localStorage.getItem('sme_admin_users');
        if (raw) {
          const list = JSON.parse(raw);
          const found = list.find((u: any) => u.role === role);
          if (found?.email) demoEmail = found.email;
        }
      } catch {}

      await login(demoEmail, '', role);
      navigate('/recepcao');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070a11] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-72 h-72 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Header institucional oficial SME */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-xl shadow-emerald-950/50 border border-emerald-400/30 mb-2">
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-lg md:text-xl font-extrabold tracking-wider text-slate-100 uppercase">
            SECRETARIA MUNICIPAL DE EDUCAÇÃO
          </h1>
          <p className="text-xs text-slate-400">
            Sistema de Recepção e Controle de Acesso
          </p>
        </div>

        {/* Card de Login */}
        <div className="bg-[#101625] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/40">
          <div className="flex items-center justify-center gap-2 mb-6 pb-4 border-b border-slate-800">
            <Lock className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-slate-200">
              Acesso do operador / recepcionista
            </h2>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg bg-rose-950/50 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Usuário institucional"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ex: recepcao@sme.gov.br"
              icon={<Mail className="w-4 h-4" />}
              required
            />

            <Input
              label="Senha"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              icon={<Lock className="w-4 h-4" />}
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              isLoading={isLoading}
            >
              <span>Entrar no sistema</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </form>

          {/* Atalhos disponíveis somente quando não há conexão com o Supabase. */}
          {!isSupabaseLive && <div className="mt-6 pt-5 border-t border-slate-800/80">
            <div className="text-[11px] font-medium text-slate-400 mb-2.5 text-center">
              Ambiente de testes — Acesso rápido por perfil:
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemo('recepcionista')}
                className="py-1.5 px-2 text-xs rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-emerald-400 border border-slate-700/60 transition-colors"
              >
                Recepção
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('admin')}
                className="py-1.5 px-2 text-xs rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-blue-400 border border-slate-700/60 transition-colors"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('gestor')}
                className="py-1.5 px-2 text-xs rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-amber-400 border border-slate-700/60 transition-colors"
              >
                Gestor
              </button>
            </div>
          </div>}
        </div>

        {/* Rodapé e status de segurança */}
        <div className="text-center space-y-1 text-slate-400 text-xs">
          <div className="flex items-center justify-center gap-1.5 text-[11px]">
            <Shield className="w-3.5 h-3.5 text-emerald-500" />
            <span>PostgreSQL RLS & Autenticação Auditada</span>
          </div>
          <p className="text-[10px]">
            {isSupabaseLive ? 'Conectado ao Supabase' : 'Modo Homologação Fictício Ativo'}
          </p>
        </div>
      </div>
    </div>
  );
};

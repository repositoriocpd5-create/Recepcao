import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle, Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';
import { UserRole } from '@/types';

const inputClass =
  'h-10 w-full rounded-md border border-[#d1d5db] bg-white pl-9 pr-3 text-sm text-[#111827] placeholder:text-[#6b7280] ' +
  'transition-shadow focus:border-[#1366e8] focus:outline-none focus:ring-2 focus:ring-[#1366e8]/25 ' +
  'dark:border-slate-700 dark:bg-[#0f1422] dark:text-slate-100 dark:placeholder:text-slate-500';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isSupabaseLive, user } = useAuth();

  // Credenciais de exemplo só no modo de demonstração; com Supabase os campos começam vazios.
  const [email, setEmail] = useState(isSupabaseLive ? '' : 'recepcao@sme.gov.br');
  const [password, setPassword] = useState(isSupabaseLive ? '' : 'sme123456');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Se já logado, redirecionar
  React.useEffect(() => {
    if (user) navigate('/recepcao');
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);
    try {
      await login(email.trim(), password);
      navigate('/recepcao');
    } catch (err: any) {
      setErrorMsg(err.message || 'Credenciais inválidas. Verifique o e-mail e a senha.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemo = async (role: UserRole) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      let demoEmail = role === 'admin' ? 'admin@sme.gov.br' : role === 'gestor' ? 'gestor@sme.gov.br' : 'recepcao@sme.gov.br';
      try {
        const raw = localStorage.getItem('sme_admin_users');
        if (raw) {
          const found = JSON.parse(raw).find((u: any) => u.role === role);
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f3f4f6] p-4 dark:bg-[#0b0f19]">
      <main className="w-full max-w-[348px] overflow-hidden rounded-lg bg-white shadow-[0_14px_34px_-14px_rgba(16,24,40,.28)] dark:bg-[#121826] dark:shadow-black/50">
        {/* Identidade */}
        <header className="flex flex-col items-center gap-3 bg-[#1366e8] px-6 pb-7 pt-5 text-white">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-white p-1 shadow-[0_4px_12px_rgba(0,0,0,.18)] dark:bg-white">
            <img src="/assets/brasao_itaguai.png" alt="Brasão do Município de Itaguaí" className="h-10 w-10 object-contain" />
          </span>
          <h1 className="flex items-center gap-2 text-xl leading-none">
            <span className="font-extrabold tracking-tight">SMEDU</span>
            <span aria-hidden="true" className="h-6 w-px bg-white/90" />
            <span className="font-light tracking-wide">RECEPÇÃO</span>
          </h1>
        </header>

        {/* Formulário */}
        <div className="px-6 pb-6 pt-6">
          <h2 className="mb-5 text-center text-[15px] font-semibold text-[#1f2937] dark:text-slate-100">Acesso ao Sistema</h2>

          {errorMsg && (
            <div role="alert" className="mb-4 flex items-start gap-2 rounded-md border border-[#fecaca] bg-[#fef2f2] p-3 text-xs text-[#b91c1c] dark:border-rose-500/30 dark:bg-rose-950/40 dark:text-rose-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate={false}>
            <div>
              <label htmlFor="login-email" className="mb-1.5 block text-[11px] font-medium text-[#374151] dark:text-slate-300">E-mail</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" aria-hidden="true" />
                <input
                  id="login-email"
                  type="email"
                  inputMode="email"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seunome@edu.itaguai.rj.gov.br"
                  className={inputClass}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-senha" className="mb-1.5 block text-[11px] font-medium text-[#374151] dark:text-slate-300">Senha</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" aria-hidden="true" />
                <input
                  id="login-senha"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`${inputClass} pr-10`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-1 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded text-[#6b7280] hover:text-[#1366e8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1366e8]"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#1366e8] text-sm font-semibold text-white transition-colors hover:bg-[#0f57c9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1366e8] disabled:cursor-wait disabled:opacity-80"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isLoading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          {/* Atalhos disponíveis somente quando não há conexão com o Supabase. */}
          {!isSupabaseLive && (
            <div className="mt-5 border-t border-[#e5e7eb] pt-4 dark:border-slate-800">
              <p className="mb-2 text-center text-[11px] text-[#6b7280] dark:text-slate-400">Ambiente de testes — acesso rápido por perfil</p>
              <div className="grid grid-cols-3 gap-2">
                {([['recepcionista', 'Recepção'], ['admin', 'Admin'], ['gestor', 'Gestor']] as [UserRole, string][]).map(([role, label]) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => handleQuickDemo(role)}
                    className="h-8 rounded-md border border-[#d1d5db] text-xs font-medium text-[#1366e8] hover:bg-[#eff5ff] dark:border-slate-700 dark:text-sky-300 dark:hover:bg-slate-800"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <p className="mt-5 text-center text-[11px] text-[#6b7280] dark:text-slate-500">
        Secretaria Municipal de Educação de Itaguaí{!isSupabaseLive && ' · Modo de demonstração'}
      </p>
    </div>
  );
};

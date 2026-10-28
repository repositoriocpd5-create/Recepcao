import React from 'react';
import { Navigate } from 'react-router-dom';
import { ArrowRight, CalendarDays, ClipboardList, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { abrirSistemaExterno } from '@/lib/sso';
import { ROTULO_PAPEL, rotaInicial, sistemasExternosDoUsuario } from '@/lib/modulos';

/** Início de quem só tem acesso a sistemas externos (CPD_OS e/ou AgendaMKT). */
export const SistemasExternosPage: React.FC = () => {
  const { user, logout } = useAuth();
  const [aviso, setAviso] = React.useState<string | null>(null);
  if (!user) return <Navigate to="/login" replace />;
  const sistemas = sistemasExternosDoUsuario(user);
  if (!sistemas.length) return <Navigate to={rotaInicial(user)} replace />;
  const primeiroNome = user.nome_completo.split(' ')[0];

  return (
    <div className="flex min-h-screen flex-col bg-[linear-gradient(135deg,#f7fbff_0%,#eef6ff_100%)] text-[#152238] dark:bg-none dark:bg-[#0b0f19] dark:text-slate-100">
      <header className="flex items-center justify-between gap-3 px-4 pb-2 pt-[calc(16px+env(safe-area-inset-top))] sm:px-8">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl border border-[#b9d9f3] bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <img src="/assets/brasao_itaguai.png" alt="Brasão do Município de Itaguaí" className="h-9 w-9 object-contain" />
          </span>
          <p className="text-xs font-extrabold uppercase tracking-wider text-[#082b57] sm:text-sm dark:text-slate-100">Secretaria Municipal de Educação</p>
        </div>
        <ThemeToggle size="sm" />
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-8 sm:px-8">
        <p className="text-center text-sm font-semibold text-[#0b63ce] dark:text-sky-300">Olá, {primeiroNome} · {ROTULO_PAPEL[user.role] ?? user.role}</p>
        <h1 className="mt-2 text-center text-2xl font-extrabold text-[#0d2240] dark:text-slate-50">Seus sistemas</h1>

        {aviso && <p role="alert" className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-center text-sm font-semibold text-amber-800">{aviso}</p>}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {sistemas.map((sistema) => {
            const { id, rotulo, url, descricao } = sistema;
            const Icone = id === 'cpd_os' ? ClipboardList : CalendarDays;
            return (
              <button
                key={id}
                type="button"
                disabled={!url}
                onClick={() => void abrirSistemaExterno(sistema).then(setAviso)}
                className="flex flex-col rounded-3xl border border-[#dbe6f3] bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-[#9fc3ec] disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-[#121826]"
              >
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#e6f1fb] text-[#005a9c] dark:bg-sky-500/15 dark:text-sky-300"><Icone className="h-7 w-7" aria-hidden="true" /></span>
                <span className="mt-4 text-xl font-extrabold text-[#0d2240] dark:text-slate-50">{rotulo}</span>
                <span className="mt-1 text-sm text-[#3b4d68] dark:text-slate-300">{url ? descricao : 'Endereço ainda não configurado.'}</span>
                <span className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0b63ce] px-5 text-sm font-bold text-white">Abrir {rotulo} <ArrowRight className="h-4 w-4" aria-hidden="true" /></span>
              </button>
            );
          })}
        </div>

        <button type="button" onClick={() => void logout()} className="mx-auto mt-8 inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-[#5f7391] hover:text-rose-600 dark:text-slate-400">
          <LogOut className="h-4 w-4" aria-hidden="true" /> Sair
        </button>
      </main>
    </div>
  );
};

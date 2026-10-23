import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, Camera, LogOut, UserCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { Modulo, ROTA_DO_MODULO, ROTULO_PAPEL, acessaDoisModulos, lembrarModulo, rotaInicial } from '@/lib/modulos';
import { cn } from '@/lib/utils';

const OPCOES: {
  modulo: Modulo;
  titulo: string;
  sigla: string;
  descricao: string;
  itens: string[];
  icone: typeof Camera;
  tom: string;
}[] = [
  {
    modulo: 'recepcao',
    titulo: 'Recepção',
    sigla: 'Portaria da SMEDU',
    descricao: 'Entrada e saída de servidores e visitantes, crachás e autorizações.',
    itens: ['Balcão de atendimento', 'Visitantes e servidores', 'Crachás e ramais'],
    icone: UserCheck,
    tom: 'from-[#e6f1fb] to-white text-[#005a9c] dark:from-sky-500/15 dark:to-transparent dark:text-sky-300',
  },
  {
    modulo: 'cco',
    titulo: 'CCO',
    sigla: 'Central Controle Operacional',
    descricao: 'Ocorrências do monitoramento das câmeras das unidades escolares.',
    itens: ['Painel de ocorrências', 'Atendimento e responsáveis', 'Histórico e auditoria'],
    icone: Camera,
    tom: 'from-[#e8eefe] to-white text-[#0b63ce] dark:from-indigo-500/15 dark:to-transparent dark:text-indigo-300',
  },
];

/** Primeiro acesso de quem usa os dois módulos: escolhe por onde começar (depois vale o último usado). */
export const EscolherModuloPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return <Navigate to="/login" replace />;
  if (!acessaDoisModulos(user)) return <Navigate to={rotaInicial(user)} replace />;

  const escolher = (modulo: Modulo) => {
    lembrarModulo(user, modulo);
    navigate(ROTA_DO_MODULO[modulo], { replace: true });
  };
  const primeiroNome = user.nome_completo.split(' ')[0];

  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_88%_74%,#e9f5ff_0,transparent_26%),linear-gradient(135deg,#f7fbff_0%,#eef6ff_100%)] text-[#152238] dark:bg-none dark:bg-[#0b0f19] dark:text-slate-100">
      <header className="flex items-center justify-between gap-3 px-4 pb-2 pt-[calc(16px+env(safe-area-inset-top))] sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[#b9d9f3] bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <img src="/assets/brasao_itaguai.png" alt="Brasão do Município de Itaguaí" className="h-9 w-9 object-contain" />
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-xs font-extrabold uppercase tracking-wider text-[#082b57] sm:text-sm dark:text-slate-100">Secretaria Municipal de Educação</p>
            <p className="text-[11px] text-[#68809f] dark:text-slate-400">SMEDU · Itaguaí</p>
          </div>
        </div>
        <ThemeToggle size="sm" />
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-4 py-8 sm:px-8">
        <div className="text-center">
          <p className="text-sm font-semibold text-[#0b63ce] dark:text-sky-300">Olá, {primeiroNome}{ROTULO_PAPEL[user.role] && ROTULO_PAPEL[user.role] !== primeiroNome ? ` · ${ROTULO_PAPEL[user.role]}` : ''}</p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-[#0d2240] sm:text-[32px] dark:text-slate-50">Por onde você quer começar?</h1>
          <p className="mx-auto mt-2 max-w-xl text-[15px] text-[#4c6283] dark:text-slate-400">
            Seu usuário tem acesso aos dois módulos. Nos próximos acessos, o sistema abre direto no último que você usou — e você troca a qualquer momento pelo seletor no topo.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
          {OPCOES.map(({ modulo, titulo, sigla, descricao, itens, icone: Icone, tom }) => (
            <button
              key={modulo}
              type="button"
              onClick={() => escolher(modulo)}
              className="group flex flex-col rounded-3xl border border-[#dbe6f3] bg-white p-5 text-left shadow-[0_18px_40px_-28px_rgba(16,48,96,.55)] transition-all duration-200 hover:-translate-y-1 hover:border-[#9fc3ec] hover:shadow-[0_26px_50px_-28px_rgba(11,99,206,.6)] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-[#0b63ce] active:translate-y-0 sm:p-6 dark:border-slate-800 dark:bg-[#121826] dark:hover:border-sky-500/40"
            >
              <span className={cn('grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br ring-1 ring-[#d3e3f8] dark:ring-slate-700', tom)}>
                <Icone className="h-8 w-8" aria-hidden="true" />
              </span>
              <span className="mt-4 text-xl font-extrabold text-[#0d2240] dark:text-slate-50">{titulo}</span>
              <span className="text-[13px] font-semibold text-[#5f7391] dark:text-slate-400">{sigla}</span>
              <span className="mt-2 text-sm text-[#3b4d68] dark:text-slate-300">{descricao}</span>
              <ul className="mt-3 space-y-1 text-[13px] text-[#5f7391] dark:text-slate-400">
                {itens.map((item) => (
                  <li key={item} className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#0b63ce]/60" aria-hidden="true" />{item}</li>
                ))}
              </ul>
              <span className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#0b63ce] px-5 text-[15px] font-bold text-white transition-colors group-hover:bg-[#0a56b4]">
                Entrar {modulo === 'cco' ? 'no' : 'na'} {titulo} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => void logout()}
          className="mx-auto mt-8 inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-[#5f7391] hover:bg-white/70 hover:text-rose-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0b63ce] dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" /> Não é você? Sair
        </button>
      </main>
    </div>
  );
};

import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CalendarDays, Camera, ClipboardList, UserCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Modulo, acessaDoisModulos, moduloDaRota } from '@/lib/modulos';
import { cn } from '@/lib/utils';

const OPCOES: { modulo: Modulo; rotulo: string; destino: string; icone: typeof Camera }[] = [
  { modulo: 'recepcao', rotulo: 'Recepção', destino: '/recepcao', icone: UserCheck },
  { modulo: 'cco', rotulo: 'CCO', destino: '/cco', icone: Camera },
];

/** Sistemas externos do CPD. Endereços vêm do .env (VITE_CPD_OS_URL / VITE_AGENDA_MKT_URL); sem endereço, a chave fica desativada. */
const EXTERNOS: { rotulo: string; url: string; icone: typeof Camera }[] = [
  { rotulo: 'CPD_OS', url: import.meta.env.VITE_CPD_OS_URL ?? '', icone: ClipboardList },
  { rotulo: 'AgendaMKT', url: import.meta.env.VITE_AGENDA_MKT_URL ?? '', icone: CalendarDays },
];

/** Troca entre Recepção e CCO; só aparece para quem acessa os dois módulos. */
export const SeletorModulo: React.FC<{ variante?: 'claro' | 'azul'; className?: string; onTrocar?: () => void }> = ({
  variante = 'claro',
  className,
  onTrocar,
}) => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  if (!acessaDoisModulos(user)) return null;
  const atual = moduloDaRota(location.pathname);

  return (
    <div
      role="group"
      aria-label="Módulo do sistema"
      className={cn(
        'inline-flex shrink-0 rounded-xl p-1',
        variante === 'azul' ? 'bg-white/10 ring-1 ring-white/20' : 'border border-[#d7e6f6] bg-[#f2f7fd] dark:border-slate-700 dark:bg-slate-900',
        className,
      )}
    >
      {OPCOES.map(({ modulo, rotulo, destino, icone: Icone }) => {
        const ativo = atual === modulo;
        return (
          <button
            key={modulo}
            type="button"
            aria-pressed={ativo}
            onClick={() => {
              if (!ativo) navigate(destino);
              onTrocar?.();
            }}
            className={cn(
              'inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1',
              variante === 'azul'
                ? ativo ? 'bg-white text-[#005a9c] shadow focus-visible:outline-white' : 'text-white/85 hover:bg-white/10 focus-visible:outline-white'
                : ativo ? 'bg-white text-[#005a9c] shadow-sm ring-1 ring-[#cfe0f5] focus-visible:outline-[#087ef5] dark:bg-slate-700 dark:text-white dark:ring-slate-600' : 'text-[#526d91] hover:text-[#005a9c] focus-visible:outline-[#087ef5] dark:text-slate-400 dark:hover:text-slate-200',
            )}
          >
            <Icone className="h-3.5 w-3.5" aria-hidden="true" />
            {rotulo}
          </button>
        );
      })}
      {EXTERNOS.map(({ rotulo, url, icone: Icone }) => (
        <button
          key={rotulo}
          type="button"
          disabled={!url}
          title={url ? `Abrir ${rotulo}` : `${rotulo}: endereço ainda não configurado`}
          onClick={() => { window.open(url, '_blank', 'noopener,noreferrer'); onTrocar?.(); }}
          className={cn(
            'inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 disabled:cursor-not-allowed disabled:opacity-50',
            variante === 'azul' ? 'text-white/85 hover:bg-white/10 focus-visible:outline-white' : 'text-[#526d91] hover:text-[#005a9c] focus-visible:outline-[#087ef5] dark:text-slate-400 dark:hover:text-slate-200',
          )}
        >
          <Icone className="h-3.5 w-3.5" aria-hidden="true" />
          {rotulo}
        </button>
      ))}
    </div>
  );
};

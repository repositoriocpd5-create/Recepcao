import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, Camera, ChevronRight, UserRound } from 'lucide-react';
import { ReceptionClock } from '@/components/recepcao/ReceptionClock';
import { ROTULO_PAPEL } from '@/lib/modulos';
import { UserProfile } from '@/types';

interface Props {
  titulo: string;
  subtitulo: string;
  trilha?: string;
  user: UserProfile;
  unidadeNome?: string | null;
  icone?: React.ReactNode;
}

/** Cabeçalho das telas do CCO: título, unidade/usuário conectados e relógio de Brasília. */
export const CabecalhoCco: React.FC<Props> = ({ titulo, subtitulo, trilha, user, unidadeNome, icone }) => (
  <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
    <div className="min-w-0">
      <nav aria-label="Você está em" className="mb-3 flex items-center gap-1.5 text-[13px] text-[#5f7391] dark:text-slate-400">
        <Link to="/cco" className="rounded hover:text-[#0b63ce] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0b63ce]">Início</Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        <span aria-current={trilha ? undefined : 'page'} className={trilha ? '' : 'font-semibold text-[#0d2240] dark:text-slate-200'}>CCO</span>
        {trilha && (
          <>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            <span aria-current="page" className="font-semibold text-[#0d2240] dark:text-slate-200">{trilha}</span>
          </>
        )}
      </nav>
      <div className="flex items-start gap-4">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#e3eefc] text-[#0b63ce] ring-1 ring-[#cfe0f7] sm:h-[72px] sm:w-[72px] dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/20">
          {icone ?? <Camera className="h-7 w-7 sm:h-9 sm:w-9" aria-hidden="true" />}
        </span>
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-[#0d2240] sm:text-[28px] dark:text-slate-50">{titulo}</h1>
          <p className="mt-1 max-w-2xl text-[15px] text-[#4c6283] dark:text-slate-400">{subtitulo}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px]">
            {unidadeNome && (
              <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-white px-3 py-1 font-bold text-[#0b4fa3] ring-1 ring-[#d3e3f8] dark:bg-slate-900 dark:text-sky-200 dark:ring-slate-700">
                <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{unidadeNome}</span>
              </span>
            )}
            <span className="inline-flex max-w-full items-center gap-1.5 text-[#5f7391] dark:text-slate-400">
              <UserRound className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">
                Conectado como <strong className="font-semibold text-[#3b4d68] dark:text-slate-200">{user.nome_completo}</strong>
                {' · '}{user.role === 'unidade_escolar' && user.cargo ? user.cargo : ROTULO_PAPEL[user.role]}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
    <div className="hidden shrink-0 sm:block lg:pt-1">
      <ReceptionClock />
    </div>
  </header>
);

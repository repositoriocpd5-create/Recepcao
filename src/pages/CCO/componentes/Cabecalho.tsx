import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Camera, ChevronRight, School, UserRound } from 'lucide-react';
import { ROTULO_PAPEL } from '@/lib/modulos';
import { UserProfile } from '@/types';

const FUSO = 'America/Sao_Paulo';

const lerRelogio = (agora: Date) => {
  const partes = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, day: '2-digit', month: 'short', weekday: 'long' }).formatToParts(agora);
  const parte = (tipo: Intl.DateTimeFormatPartTypes) => partes.find((p) => p.type === tipo)?.value ?? '';
  return {
    dia: parte('day'),
    mes: parte('month').replace('.', '').slice(0, 3).toLocaleUpperCase('pt-BR'),
    semana: parte('weekday').toLocaleUpperCase('pt-BR'),
    hora: new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(agora),
  };
};

/** Data e hora de Brasília, atualizadas na virada de cada minuto. */
const RelogioCco: React.FC = () => {
  const [relogio, setRelogio] = useState(() => lerRelogio(new Date()));
  useEffect(() => {
    let intervalo: number | undefined;
    const atualizar = () => setRelogio(lerRelogio(new Date()));
    const inicio = window.setTimeout(() => {
      atualizar();
      intervalo = window.setInterval(atualizar, 60_000);
    }, 60_000 - (Date.now() % 60_000));
    return () => {
      window.clearTimeout(inicio);
      if (intervalo) window.clearInterval(intervalo);
    };
  }, []);
  return (
    <section
      aria-label="Data e hora atuais de Brasília"
      className="flex h-[114px] overflow-hidden rounded-2xl border border-[#dce4f0] bg-white shadow-[0_12px_28px_-16px_rgba(18,44,82,.45)] dark:border-slate-700 dark:bg-[#121826]"
    >
      <div className="flex w-[134px] flex-col items-center justify-center bg-[linear-gradient(160deg,#0f3a66_0%,#071f3b_100%)] px-3 text-center leading-none text-white">
        <span className="text-[40px] font-extrabold tracking-[-0.04em]">{relogio.dia}</span>
        <span className="mt-1 text-[17px] font-bold tracking-[0.04em]">{relogio.mes}</span>
        <span className="mt-2 whitespace-nowrap text-[13px] font-medium tracking-[0.02em] text-white/90">{relogio.semana}</span>
      </div>
      <div className="flex w-[172px] flex-col items-center justify-center px-4 text-center">
        <time dateTime={relogio.hora} className="text-[46px] font-extrabold leading-none tracking-[-0.04em] text-[#0d2240] dark:text-slate-50">{relogio.hora}</time>
        <span className="mt-2 text-[13px] text-[#4c6283] dark:text-slate-400">Horário de Brasília</span>
      </div>
    </section>
  );
};

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
      <nav aria-label="Você está em" className="mb-3 flex items-center gap-1.5 text-[13px] text-[#5f7391] sm:text-[15px] dark:text-slate-400">
        <Link to="/cco" className="rounded text-[#0b63ce] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0b63ce]">Início</Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        <span aria-current={trilha ? undefined : 'page'} className={trilha ? '' : 'font-bold text-[#0d2240] dark:text-slate-200'}>CCO</span>
        {trilha && (
          <>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            <span aria-current="page" className="font-semibold text-[#0d2240] dark:text-slate-200">{trilha}</span>
          </>
        )}
      </nav>
      <div className="flex items-start gap-4">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(160deg,#1d7bf0_0%,#0b5fd0_100%)] text-white shadow-[0_12px_24px_-12px_rgba(11,99,206,.9)] sm:h-[80px] sm:w-[80px]">
          {icone ?? <Camera className="h-7 w-7 sm:h-9 sm:w-9" aria-hidden="true" />}
        </span>
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-[#0d2240] sm:text-[34px] sm:leading-tight dark:text-slate-50">{titulo}</h1>
          <p className="mt-1 max-w-2xl text-[15px] text-[#4c6283] sm:text-[17px] dark:text-slate-400">{subtitulo}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] sm:text-[15px]">
            {unidadeNome && (
              <span className="inline-flex max-w-full items-center gap-2 rounded-full bg-white px-4 py-1.5 font-bold uppercase text-[#0b5fd0] shadow-[0_4px_12px_-8px_rgba(16,48,96,.5)] ring-1 ring-[#dbe6f4] dark:bg-slate-900 dark:text-sky-200 dark:ring-slate-700">
                <School className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{unidadeNome}</span>
              </span>
            )}
            {unidadeNome && <span className="hidden h-6 w-px bg-[#d3deec] sm:block dark:bg-slate-700" aria-hidden="true" />}
            <span className="inline-flex max-w-full items-center gap-2 text-[#4c6283] dark:text-slate-400">
              <UserRound className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">
                <strong className="font-semibold text-[#3b4d68] dark:text-slate-200">{user.nome_completo}</strong>
                {' · '}{user.role === 'unidade_escolar' && user.cargo ? user.cargo : ROTULO_PAPEL[user.role]}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
    <div className="hidden shrink-0 sm:block lg:pt-1">
      <RelogioCco />
    </div>
  </header>
);

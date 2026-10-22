import React from 'react';
import { Camera, ChevronRight, FileText, MoonStar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SITUACOES, descreverHorario, formatarData } from '@/services/ccoService';
import { CcoOcorrencia } from '@/types';
import { SituacaoBadge } from './ui';

interface Props {
  ocorrencias: CcoOcorrencia[];
  onAbrir: (ocorrencia: CcoOcorrencia) => void;
  /** Painel da equipe: mostra a unidade e o responsável. */
  mostrarUnidade?: boolean;
  vazio?: React.ReactNode;
  /** Ação rápida ao lado da linha (ex.: registrar andamento no painel da equipe). */
  acaoLinha?: (ocorrencia: CcoOcorrencia) => React.ReactNode;
}

export const ListaVazia: React.FC<{ titulo: string; texto?: string }> = ({ titulo, texto }) => (
  <div className="flex flex-col items-center gap-3 px-4 py-10 text-center sm:flex-row sm:justify-center sm:text-left">
    <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-[#eef4fb] text-[#4c6283] dark:bg-slate-800 dark:text-slate-400">
      <FileText className="h-7 w-7" aria-hidden="true" />
    </span>
    <div>
      <p className="text-[15px] font-semibold text-[#3b4d68] dark:text-slate-200">{titulo}</p>
      {texto && <p className="mt-0.5 text-sm text-[#5f7391] dark:text-slate-400">{texto}</p>}
    </div>
  </div>
);

/** Lista de ocorrências: tabela no computador, cartões no celular. */
export const ListaOcorrencias: React.FC<Props> = ({ ocorrencias, onAbrir, mostrarUnidade, vazio, acaoLinha }) => {
  if (!ocorrencias.length) return <>{vazio ?? <ListaVazia titulo="Nenhuma ocorrência registrada." />}</>;

  const colunas = mostrarUnidade
    ? 'lg:grid-cols-[150px_150px_minmax(0,1.1fr)_minmax(0,1.6fr)_150px_20px]'
    : 'lg:grid-cols-[150px_170px_minmax(0,1fr)_150px_20px]';

  return (
    <div>
      <div
        aria-hidden="true"
        className={cn('hidden gap-4 border-b border-[#e6edf6] px-4 pb-2 text-[11px] font-bold uppercase tracking-wider text-[#6b7f9b] lg:grid sm:px-6 dark:border-slate-800 dark:text-slate-500', colunas, acaoLinha && 'lg:pr-[176px]')}
      >
        <span>Protocolo</span>
        <span>Data e horário</span>
        {mostrarUnidade && <span>Unidade</span>}
        <span>Resumo</span>
        <span>Situação</span>
        <span />
      </div>
      <ul className="divide-y divide-[#edf2f8] dark:divide-slate-800">
        {ocorrencias.map((oc) => (
          <li key={oc.id} className={cn(acaoLinha && 'flex items-center')}>
            <button
              type="button"
              onClick={() => onAbrir(oc)}
              aria-label={`Abrir ocorrência ${oc.protocolo}, ${formatarData(oc.data_ocorrencia)}, situação ${SITUACOES[oc.situacao].rotulo}`}
              className={cn(
                'group grid w-full min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 px-4 py-3.5 text-left transition-colors hover:bg-[#f5f9fe] focus-visible:bg-[#f5f9fe] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#0b63ce] sm:px-6 lg:gap-4 dark:hover:bg-slate-800/40 dark:focus-visible:bg-slate-800/40',
                colunas,
              )}
            >
              <span className="min-w-0 font-mono text-[13px] font-bold text-[#0b4fa3] dark:text-sky-300">{oc.protocolo}</span>
              <span className="lg:hidden"><SituacaoBadge situacao={oc.situacao} /></span>

              <span className="col-span-2 flex flex-wrap items-center gap-x-1.5 text-[13px] text-[#3b4d68] lg:col-span-1 lg:block dark:text-slate-300">
                <span className="font-semibold">{formatarData(oc.data_ocorrencia)}</span>
                <span className="text-[#5f7391] lg:block dark:text-slate-400">
                  {descreverHorario(oc).replace(' (dia seguinte)', '')}
                  {oc.termina_dia_seguinte && <MoonStar className="ml-1 inline h-3.5 w-3.5 text-indigo-500" aria-label="termina no dia seguinte" />}
                </span>
              </span>

              {mostrarUnidade && (
                <span className="col-span-2 min-w-0 lg:col-span-1">
                  <span className="block truncate text-[13px] font-semibold text-[#10233f] dark:text-slate-100" title={oc.unidade_nome}>{oc.unidade_nome}</span>
                  <span className="block truncate text-xs text-[#5f7391] dark:text-slate-400">
                    {oc.responsavel_nome ? `Resp.: ${oc.responsavel_nome}` : 'Sem responsável'}
                  </span>
                </span>
              )}

              <span className="col-span-2 flex min-w-0 items-start gap-1.5 lg:col-span-1">
                <span className="line-clamp-2 text-sm text-[#10233f] dark:text-slate-200">{oc.descricao}</span>
                {oc.foto_path && <Camera className="mt-0.5 h-4 w-4 shrink-0 text-[#6b7f9b]" aria-label="com foto" />}
              </span>

              <span className="hidden lg:block"><SituacaoBadge situacao={oc.situacao} /></span>
              <ChevronRight className="hidden h-5 w-5 text-[#9aaac0] transition-transform group-hover:translate-x-0.5 group-hover:text-[#0b63ce] lg:block" aria-hidden="true" />
            </button>
            {acaoLinha && <div className="flex w-[52px] shrink-0 justify-center pr-3 lg:w-[176px] lg:pr-6">{acaoLinha(oc)}</div>}
          </li>
        ))}
      </ul>
    </div>
  );
};

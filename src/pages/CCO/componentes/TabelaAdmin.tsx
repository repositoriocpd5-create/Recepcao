import React from 'react';
import { AlertTriangle, Camera, CheckCircle2, ClipboardList, Eye, Image as ImageIcon, MessageSquarePlus, MoonStar, Sparkles, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IMPORTANCIAS, Importancia, PessoasDasUnidades, descreverHorario, formatarData, formatarDataHora, importanciaDe } from '@/services/ccoService';
import { CcoOcorrencia } from '@/types';
import { ParadaBadge, SituacaoBadge } from './ui';
import type { Densidade } from './DensidadeTabela';

export const ESTILO_IMPORTANCIA: Record<Importancia, string> = {
  alta: 'bg-rose-600 text-white ring-rose-600',
  media: 'bg-amber-100 text-amber-900 ring-amber-300 dark:bg-amber-500/20 dark:text-amber-100 dark:ring-amber-500/40',
  baixa: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
};

export const ImportanciaBadge: React.FC<{ oc: CcoOcorrencia; className?: string }> = ({ oc, className }) => {
  const { nivel, motivo } = importanciaDe(oc);
  return (
    <span
      title={motivo}
      className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ring-1', ESTILO_IMPORTANCIA[nivel], className)}
    >
      {nivel === 'alta' && <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />}
      {IMPORTANCIAS[nivel].rotulo}
      <span className="sr-only">: {motivo}</span>
    </span>
  );
};

/** "há 5 min", "há 3 h", "há 2 dias". */
const haQuanto = (iso: string) => {
  const minutos = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.round(horas / 24);
  return `há ${dias} ${dias === 1 ? 'dia' : 'dias'}`;
};

interface Props {
  ocorrencias: CcoOcorrencia[];
  pessoas?: PessoasDasUnidades;
  onAbrir: (oc: CcoOcorrencia) => void;
  onAndamento: (oc: CcoOcorrencia) => void;
  onExcluir?: (oc: CcoOcorrencia) => void;
  densidade?: Densidade;
}

const th = 'px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-[#6b7f9b] dark:text-slate-500';
const TD: Record<Densidade, string> = {
  padrao: 'px-3 py-3 align-top',
  regular: 'px-3 py-2 align-top',
  compacto: 'px-3 py-1 align-middle',
};

const Nova: React.FC = () => (
  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0b63ce] dark:text-sky-300">
    <span className="h-1.5 w-1.5 rounded-full bg-[#0b63ce]" aria-hidden="true" /> Nova
  </span>
);

/**
 * Painel do administrador: tabela completa (direção, quem registrou, importância, visualização…).
 * Densidade: padrão (tudo, 2 linhas de resumo), regular (2 linhas por registro) e compacto (1 linha;
 * o que sai da vista continua no tooltip da linha).
 */
export const TabelaAdmin: React.FC<Props> = ({ ocorrencias, pessoas, onAbrir, onAndamento, onExcluir, densidade = 'padrao' }) => {
  const td = TD[densidade];
  const compacto = densidade === 'compacto';
  const padrao = densidade === 'padrao';
  const tamanhoBotao = compacto ? 'h-7 w-7' : 'h-9 w-9';

  return (
    <div className="relative overflow-x-auto">
      <table className="w-full min-w-[1080px] table-fixed border-collapse text-[13px]">
        <caption className="sr-only">Ocorrências das unidades, com importância, direção da unidade, quem registrou e situação</caption>
        <colgroup>
          <col className="w-[120px]" />
          <col className={compacto ? 'w-[225px]' : 'w-[150px]'} />
          <col className="w-[15%]" />
          <col className="w-[13%]" />
          <col />
          <col className="w-[170px]" />
          <col className={compacto ? 'w-[80px]' : 'w-[96px]'} />
        </colgroup>
        <thead className="border-b border-[#e6edf6] dark:border-slate-800">
          <tr>
            <th scope="col" className={cn(th, 'pl-4 sm:pl-6')}>Importância</th>
            <th scope="col" className={th}>Ocorrência</th>
            <th scope="col" className={th}>Unidade{compacto ? '' : ' e direção'}</th>
            <th scope="col" className={th}>Registrado por</th>
            <th scope="col" className={th}>{compacto ? 'Resumo' : 'Tipo e resumo'}</th>
            <th scope="col" className={th}>Situação</th>
            <th scope="col" className={cn(th, 'pr-4 text-right sm:pr-6')}><span className="sr-only">Ações</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#edf2f8] dark:divide-slate-800">
          {ocorrencias.map((oc) => {
            const direcao = pessoas?.direcao[oc.unidade_id];
            const cargoAutor = oc.criado_por ? pessoas?.cargos[oc.criado_por] : null;
            const grave = importanciaDe(oc).nivel === 'alta';
            const camera = oc.tipo_registro === 'camera';
            const textoDirecao = direcao ? `${direcao.nome}${direcao.cargo ? ` · ${direcao.cargo}` : ''}` : 'Direção não cadastrada';
            return (
              <tr
                key={oc.id}
                onClick={() => onAbrir(oc)}
                className={cn('cursor-pointer transition-colors hover:bg-[#f5f9fe] dark:hover:bg-slate-800/40', grave && 'bg-rose-50/60 hover:bg-rose-50 dark:bg-rose-950/15')}
              >
                <td className={cn(td, 'pl-4 sm:pl-6')}>
                  <ImportanciaBadge oc={oc} className={compacto ? 'py-0.5' : undefined} />
                  {grave && oc.ia_origem === 'ia' && !compacto && (
                    <span className={cn('flex items-center gap-1 text-[11px] font-semibold text-rose-700 dark:text-rose-300', padrao ? 'mt-1' : 'mt-0.5')}><Sparkles className="h-3 w-3" aria-hidden="true" /> IA</span>
                  )}
                </td>
                <td className={td}>
                  {/* O protocolo é o botão da linha: teclado e leitor de tela abrem por aqui. */}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onAbrir(oc); }}
                    className="rounded font-mono text-[13px] font-bold text-[#0b4fa3] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b63ce] dark:text-sky-300"
                  >
                    {oc.protocolo}
                  </button>
                  {compacto ? (
                    <span className="ml-2 whitespace-nowrap font-semibold text-[#10233f] dark:text-slate-200" title={descreverHorario(oc)}>{formatarData(oc.data_ocorrencia)}</span>
                  ) : (
                    <>
                      <span className="mt-0.5 block font-semibold text-[#10233f] dark:text-slate-200">
                        {formatarData(oc.data_ocorrencia)}
                        {!padrao && <span className="font-normal text-[#5f7391] dark:text-slate-400"> · {descreverHorario(oc).replace(' (dia seguinte)', '')}</span>}
                      </span>
                      {padrao && (
                        <span className="block text-[#5f7391] dark:text-slate-400">
                          {descreverHorario(oc).replace(' (dia seguinte)', '')}
                          {oc.termina_dia_seguinte && <MoonStar className="ml-1 inline h-3.5 w-3.5 text-indigo-500" aria-label="termina no dia seguinte" />}
                        </span>
                      )}
                    </>
                  )}
                </td>
                <td className={td}>
                  <span
                    className={cn('block font-bold text-[#10233f] dark:text-slate-100', !padrao && 'truncate')}
                    title={compacto ? `${oc.unidade_nome} — ${textoDirecao}` : oc.unidade_nome}
                  >
                    {oc.unidade_nome}
                  </span>
                  {!compacto && (
                    <span className={cn('mt-0.5 block text-[#5f7391] dark:text-slate-400', !padrao && 'truncate')}>
                      {direcao ? <><span className="font-semibold text-[#3b4d68] dark:text-slate-300">{direcao.nome}</span>{padrao && direcao.cargo ? ` · ${direcao.cargo}` : ''}</> : 'Direção não cadastrada'}
                    </span>
                  )}
                </td>
                <td className={td}>
                  <span
                    className={cn('block font-semibold text-[#10233f] dark:text-slate-200', !padrao && 'truncate')}
                    title={compacto ? `${oc.criado_por_nome || '—'}${cargoAutor ? ` · ${cargoAutor}` : ''} — ${formatarDataHora(oc.created_at)}` : undefined}
                  >
                    {oc.criado_por_nome || '—'}
                  </span>
                  {padrao && cargoAutor && <span className="block text-[#5f7391] dark:text-slate-400">{cargoAutor}</span>}
                  {!compacto && <span className={cn('block text-[11px] text-[#8a9bb3] dark:text-slate-500', padrao && 'mt-0.5')} title={formatarDataHora(oc.created_at)}>{haQuanto(oc.created_at)}</span>}
                </td>
                <td className={td}>
                  {compacto ? (
                    <span className="flex min-w-0 items-center gap-1.5" title={oc.descricao}>
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-[#eef4fc] text-[#0b4fa3] dark:bg-sky-500/15 dark:text-sky-200" title={camera ? `Câmera · ${oc.tipo_problema || 'problema'}` : 'Ocorrência'}>
                        {camera ? <Camera className="h-3 w-3" aria-hidden="true" /> : <ClipboardList className="h-3 w-3" aria-hidden="true" />}
                        <span className="sr-only">{camera ? 'Câmera' : 'Ocorrência'}</span>
                      </span>
                      <span className="truncate text-[#10233f] dark:text-slate-200">{oc.descricao}</span>
                      {oc.foto_path && <ImageIcon className="h-3.5 w-3.5 shrink-0 text-[#6b7f9b]" aria-label="com foto" />}
                    </span>
                  ) : (
                    <>
                      <span className="inline-flex items-center gap-1 rounded-md bg-[#eef4fc] px-1.5 py-0.5 text-[11px] font-bold text-[#0b4fa3] dark:bg-sky-500/15 dark:text-sky-200">
                        {camera ? <Camera className="h-3 w-3" aria-hidden="true" /> : <ClipboardList className="h-3 w-3" aria-hidden="true" />}
                        {camera ? `Câmera · ${oc.tipo_problema || 'problema'}` : 'Ocorrência'}
                      </span>
                      {padrao && camera && oc.cameras?.length ? <span className="mt-0.5 block truncate text-[11px] text-[#5f7391] dark:text-slate-400" title={oc.cameras.join(', ')}>{oc.cameras.join(', ')}</span> : null}
                      <span className={cn('mt-1 text-[#10233f] dark:text-slate-200', padrao ? 'line-clamp-2' : 'block truncate')} title={padrao ? undefined : oc.descricao}>
                        {oc.descricao}
                        {oc.foto_path && <ImageIcon className="ml-1 inline h-3.5 w-3.5 text-[#6b7f9b]" aria-label="com foto" />}
                      </span>
                    </>
                  )}
                </td>
                <td className={td}>
                  {compacto ? (
                    <span
                      className="flex items-center gap-2"
                      title={`${oc.responsavel_nome ? `Resp.: ${oc.responsavel_nome}` : 'Sem responsável'}${oc.visualizada_em ? ` · Visualizada em ${formatarDataHora(oc.visualizada_em)}` : ''}`}
                    >
                      <SituacaoBadge situacao={oc.situacao} />
                      {!oc.visualizada_em && <Nova />}
                    </span>
                  ) : (
                    <>
                      <SituacaoBadge situacao={oc.situacao} />
                      <ParadaBadge oc={oc} somenteAlerta className="mt-1 !text-[11px] !px-2 !py-0.5" />
                      <span className="mt-1 block truncate text-[#5f7391] dark:text-slate-400" title={oc.responsavel_nome || undefined}>
                        {oc.responsavel_nome ? `Resp.: ${oc.responsavel_nome}` : 'Sem responsável'}
                      </span>
                      {oc.visualizada_em ? (
                        padrao && <span className="mt-0.5 flex items-center gap-1 text-[11px] text-[#8a9bb3] dark:text-slate-500" title={`Visualizada em ${formatarDataHora(oc.visualizada_em)}`}><Eye className="h-3 w-3" aria-hidden="true" /> Visualizada</span>
                      ) : (
                        <span className="mt-0.5 flex"><Nova /></span>
                      )}
                    </>
                  )}
                </td>
                <td className={cn(td, 'pr-4 sm:pr-6')}>
                  <div className="flex items-center justify-end gap-1">
                    {oc.situacao === 'concluida' ? (
                      <span className={cn('grid place-items-center text-green-700 dark:text-green-400', tamanhoBotao)} title="Ocorrência finalizada">
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" /><span className="sr-only">Finalizada</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onAndamento(oc); }}
                        title={`Adicionar andamento à ${oc.protocolo}`}
                        aria-label={`Adicionar andamento à ocorrência ${oc.protocolo}`}
                        className={cn('grid place-items-center rounded-lg border border-[#b9cfe9] bg-white text-[#0b4fa3] hover:bg-[#f0f6fe] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b63ce] dark:border-slate-700 dark:bg-slate-900 dark:text-sky-200', tamanhoBotao)}
                      >
                        <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
                      </button>
                    )}
                    {onExcluir && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onExcluir(oc); }}
                        title={`Excluir ${oc.protocolo}`}
                        aria-label={`Excluir a ocorrência ${oc.protocolo}`}
                        className={cn('grid place-items-center rounded-lg text-[#8a9bb3] hover:bg-rose-50 hover:text-rose-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600 dark:hover:bg-rose-950/30', tamanhoBotao)}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

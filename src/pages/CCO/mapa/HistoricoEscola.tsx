import React, { useMemo } from 'react';
import { ChevronRight, History, School } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { IMPORTANCIAS, formatarData, importanciaDe } from '@/services/ccoService';
import { CcoOcorrencia } from '@/types';
import { SituacaoBadge } from '../componentes/ui';
import { ImportanciaBadge } from '../componentes/TabelaAdmin';

interface Props {
  /** Escola cujo histórico será mostrado; null mantém o modal fechado. */
  escola: { id: string; nome: string } | null;
  /** Todas as ocorrências visíveis (de qualquer escola); o filtro por escola é feito aqui. */
  ocorrencias: CcoOcorrencia[];
  onAbrir: (oc: CcoOcorrencia) => void;
  onFechar: () => void;
}

const Linha: React.FC<{ oc: CcoOcorrencia; onAbrir: (oc: CcoOcorrencia) => void }> = ({ oc, onAbrir }) => (
  <li>
    <button
      type="button"
      onClick={() => onAbrir(oc)}
      className="flex w-full items-start gap-3 rounded-xl border border-[#dbe5f1] bg-white p-3 text-left transition-colors hover:border-[#a9c1de] hover:bg-[#f5f9fe] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b63ce] dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800/60"
    >
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[13px] font-bold text-[#0b4fa3] dark:text-sky-300">{oc.protocolo}</span>
          <ImportanciaBadge oc={oc} />
          <SituacaoBadge situacao={oc.situacao} />
        </span>
        <span className="mt-1.5 line-clamp-2 block text-sm text-[#10233f] dark:text-slate-200">{oc.descricao}</span>
        <span className="mt-1 block text-xs text-[#5f7391] dark:text-slate-400">
          {formatarData(oc.data_ocorrencia)}
          {oc.responsavel_nome ? ` · Resp.: ${oc.responsavel_nome}` : ' · Sem responsável'}
        </span>
      </span>
      <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-[#9aaac0]" aria-hidden="true" />
    </button>
  </li>
);

/** Todas as ocorrências de uma escola: as em aberto (mais urgente primeiro) e o histórico já solucionado. */
export const HistoricoEscola: React.FC<Props> = ({ escola, ocorrencias, onAbrir, onFechar }) => {
  const { abertas, solucionadas } = useMemo(() => {
    const daEscola = escola ? ocorrencias.filter((oc) => oc.unidade_id === escola.id) : [];
    return {
      abertas: daEscola
        .filter((oc) => oc.situacao !== 'concluida')
        .sort((a, b) => IMPORTANCIAS[importanciaDe(a).nivel].ordem - IMPORTANCIAS[importanciaDe(b).nivel].ordem || a.created_at.localeCompare(b.created_at)),
      solucionadas: daEscola.filter((oc) => oc.situacao === 'concluida').sort((a, b) => b.created_at.localeCompare(a.created_at)),
    };
  }, [escola, ocorrencias]);

  return (
    <Modal
      isOpen={Boolean(escola)}
      onClose={onFechar}
      title={escola?.nome ?? ''}
      description={`${abertas.length} em aberto · ${solucionadas.length} solucionada${solucionadas.length === 1 ? '' : 's'}`}
      icon={<School className="h-6 w-6" aria-hidden="true" />}
      maxWidth="2xl"
    >
      <div className="space-y-5">
        <section aria-label="Ocorrências em aberto">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#6b7f9b] dark:text-slate-500">
            Em aberto ({abertas.length}) <span className="font-medium normal-case tracking-normal">— escolha uma para abrir</span>
          </h3>
          {abertas.length ? (
            <ul className="space-y-2">{abertas.map((oc) => <Linha key={oc.id} oc={oc} onAbrir={onAbrir} />)}</ul>
          ) : (
            <p className="rounded-xl bg-[#f5f8fc] px-3 py-3 text-sm text-[#5f7391] dark:bg-slate-800/60 dark:text-slate-400">Nenhuma ocorrência em aberto nesta escola.</p>
          )}
        </section>

        {solucionadas.length > 0 && (
          <section aria-label="Histórico de ocorrências solucionadas">
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#6b7f9b] dark:text-slate-500">
              <History className="h-3.5 w-3.5" aria-hidden="true" /> Histórico — solucionadas ({solucionadas.length})
            </h3>
            <ul className="space-y-2">{solucionadas.map((oc) => <Linha key={oc.id} oc={oc} onAbrir={onAbrir} />)}</ul>
          </section>
        )}
      </div>
    </Modal>
  );
};

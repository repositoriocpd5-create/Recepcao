import React, { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import { ccoService, formatarData } from '@/services/ccoService';
import { CcoOcorrencia, UserProfile } from '@/types';
import { Campo, caixaCampo } from './campos';
import { SituacaoBadge, botaoPrimario, botaoSecundario } from './ui';

interface Props {
  oc: CcoOcorrencia | null;
  user: UserProfile;
  onFechar: () => void;
  onExcluida: (oc: CcoOcorrencia) => void;
}

/** Exclusão definitiva (só administrador): exige o motivo e a digitação do protocolo. */
export const ExcluirOcorrencia: React.FC<Props> = ({ oc, user, onFechar, onExcluida }) => {
  const [motivo, setMotivo] = useState('');
  const [protocolo, setProtocolo] = useState('');
  const [erroMotivo, setErroMotivo] = useState('');
  const [erro, setErro] = useState('');
  const [excluindo, setExcluindo] = useState(false);

  useEffect(() => {
    setMotivo('');
    setProtocolo('');
    setErroMotivo('');
    setErro('');
  }, [oc?.id]);

  if (!oc) return null;
  const protocoloConfere = protocolo.trim().toUpperCase() === oc.protocolo.toUpperCase();

  const excluir = async (e: React.FormEvent) => {
    e.preventDefault();
    if (excluindo) return;
    if (motivo.trim().length < 5) {
      setErroMotivo('Informe o motivo da exclusão (pelo menos 5 caracteres).');
      document.getElementById('cco-motivo-exclusao')?.focus();
      return;
    }
    if (!protocoloConfere) return;
    setExcluindo(true);
    setErro('');
    try {
      await ccoService.excluirOcorrencia(user, oc.id, motivo);
      onExcluida(oc);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível excluir.');
    } finally {
      setExcluindo(false);
    }
  };

  return (
    <Modal isOpen onClose={() => !excluindo && onFechar()} title="Excluir ocorrência" description="Somente o administrador pode excluir." maxWidth="md" icon={<Trash2 className="h-6 w-6 text-rose-600" />}>
      <form onSubmit={excluir} noValidate className="space-y-4">
        <div className="rounded-xl border border-[#e2eaf4] p-3 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-bold text-[#0b4fa3] dark:text-sky-300">{oc.protocolo}</span>
            <SituacaoBadge situacao={oc.situacao} />
          </div>
          <p className="mt-1 text-sm font-semibold text-[#10233f] dark:text-slate-100">{oc.unidade_nome}</p>
          <p className="mt-0.5 line-clamp-2 text-[13px] text-[#5f7391] dark:text-slate-400">{formatarData(oc.data_ocorrencia)} · {oc.descricao}</p>
        </div>

        <p role="note" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-[13px] text-rose-800 dark:border-rose-500/30 dark:bg-rose-950/30 dark:text-rose-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Esta ação <strong>não pode ser desfeita</strong>. A ocorrência, o histórico e a foto serão apagados para a unidade e para a equipe. Uma cópia fica guardada na auditoria, com o motivo.</span>
        </p>

        <Campo id="cco-motivo-exclusao" rotulo="Motivo da exclusão" obrigatorio erro={erroMotivo || null}>
          <textarea
            id="cco-motivo-exclusao"
            autoFocus
            value={motivo}
            onChange={(e) => { setMotivo(e.target.value); setErroMotivo(''); }}
            rows={3}
            maxLength={1000}
            placeholder="Ex.: registro duplicado da CCO-2026-000002; teste; enviado por engano."
            aria-invalid={Boolean(erroMotivo)}
            className={cn(caixaCampo(erroMotivo), 'resize-y py-2.5')}
          />
        </Campo>

        <Campo id="cco-confirma-protocolo" rotulo={`Para confirmar, digite ${oc.protocolo}`}>
          <input
            id="cco-confirma-protocolo"
            value={protocolo}
            onChange={(e) => setProtocolo(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            placeholder={oc.protocolo}
            className={cn(caixaCampo(), 'font-mono uppercase')}
          />
        </Campo>

        {erro && <p role="alert" className="text-sm font-semibold text-rose-600 dark:text-rose-400">{erro}</p>}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" disabled={excluindo} onClick={onFechar} className={botaoSecundario}>Cancelar</button>
          <button
            type="submit"
            disabled={excluindo || !protocoloConfere}
            className={cn(botaoPrimario, 'bg-rose-600 shadow-none hover:bg-rose-700 focus-visible:outline-rose-600')}
          >
            {excluindo ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Trash2 className="h-4 w-4" aria-hidden="true" />}
            {excluindo ? 'Excluindo…' : 'Excluir definitivamente'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

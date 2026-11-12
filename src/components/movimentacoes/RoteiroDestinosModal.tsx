import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Departamento, DestinoVisita, Movimentacao, Servidor, Setor } from '@/types';
import { formatDateTime } from '@/lib/utils';

interface RoteiroDestinosModalProps {
  movimentacao: Movimentacao | null;
  onClose: () => void;
  departamentos: Departamento[];
  setores: Setor[];
  servidores: Servidor[];
}

// Lista os setores/departamentos pelos quais a pessoa irá passar na movimentação.
export const RoteiroDestinosModal: React.FC<RoteiroDestinosModalProps> = ({
  movimentacao, onClose, departamentos, setores, servidores,
}) => {
  // Destinos em ordem; registros antigos sem roteiro usam o destino principal.
  const paradas: DestinoVisita[] = movimentacao
    ? (movimentacao.destinos?.length
        ? [...movimentacao.destinos].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
        : [{
            departamento_destino_id: movimentacao.departamento_destino_id,
            setor_destino_id: movimentacao.setor_destino_id,
            servidor_destino_id: movimentacao.servidor_destino_id,
          }]
      ).map((dest) => ({
        ...dest,
        departamento_destino: dest.departamento_destino || departamentos.find((d) => d.id === dest.departamento_destino_id),
        setor_destino: dest.setor_destino || setores.find((s) => s.id === dest.setor_destino_id),
        servidor_destino: dest.servidor_destino || (dest.servidor_destino_id ? servidores.find((s) => s.id === dest.servidor_destino_id) : undefined),
      }))
    : [];

  return (
    <Modal
      isOpen={Boolean(movimentacao)}
      onClose={onClose}
      title="Roteiro de destinos"
      description="Setores e departamentos pelos quais a pessoa irá passar, na ordem registrada."
      maxWidth="lg"
    >
      {movimentacao && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-[#f8fbff] border border-[#dce4f0] p-4 dark:bg-slate-900 dark:border-slate-800">
            <div>
              <div className="font-bold text-[#152238] dark:text-slate-100">{movimentacao.servidor?.nome || movimentacao.visitante?.nome || 'Não identificado'}</div>
              <div className="text-xs text-[#627289] dark:text-slate-400 capitalize">
                {movimentacao.tipo_pessoa} · Crachá <span className="font-mono font-bold">{movimentacao.cracha_numero || 'S/C'}</span> · Entrada {formatDateTime(movimentacao.data_hora_entrada)}
              </div>
            </div>
            <Badge variant="neutral">{paradas.length} destino{paradas.length === 1 ? '' : 's'}</Badge>
          </div>

          <ol className="max-h-[50vh] overflow-y-auto space-y-2">
            {paradas.map((dest, index) => (
              <li key={dest.id || `${dest.setor_destino_id}-${index}`} className="flex items-start gap-3 rounded-xl border border-[#dce4f0] p-3 dark:border-slate-800">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#e8f7ee] text-xs font-bold text-[#16a34a] dark:bg-emerald-950/60 dark:text-emerald-300">{index + 1}</span>
                <div className="min-w-0 text-xs">
                  <div className="font-semibold text-[#152238] dark:text-slate-100">
                    {dest.departamento_destino ? `${dest.departamento_destino.sigla} - ${dest.departamento_destino.nome}` : 'SMEDU'}
                  </div>
                  <div className="text-[#37475e] dark:text-slate-300">Setor: {dest.setor_destino?.nome || 'Geral'}</div>
                  {dest.servidor_destino && <div className="text-[10px] text-[#627289] dark:text-slate-400">Resp: {dest.servidor_destino.nome}</div>}
                </div>
              </li>
            ))}
          </ol>

          {movimentacao.motivo && (
            <div className="text-xs text-[#627289] dark:text-slate-400"><span className="font-semibold">Motivo:</span> {movimentacao.motivo}</div>
          )}
          <div className="flex justify-end"><Button variant="outline" onClick={onClose}>Fechar</Button></div>
        </div>
      )}
    </Modal>
  );
};

// Clique na linha da tabela, ignorando cliques em botões e links dentro dela.
export const isRowBackgroundClick = (event: React.MouseEvent) =>
  !(event.target as HTMLElement).closest('button, a, input');

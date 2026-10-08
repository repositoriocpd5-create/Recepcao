import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle2, XCircle, Clock, ShieldCheck, RefreshCw, User } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { dataService } from '@/services/dataService';
import { Autorizacao } from '@/types';
import { formatDateTime } from '@/lib/utils';

export const AutorizacoesPage: React.FC = () => {
  const { user } = useAuth();
  const [autorizacoes, setAutorizacoes] = useState<Autorizacao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'todos' | 'pendente' | 'autorizado' | 'recusado'>('pendente');

  // Modal de resposta
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAut, setSelectedAut] = useState<Autorizacao | null>(null);
  const [decisao, setDecisao] = useState<boolean>(true);
  const [observacao, setObservacao] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const carregarAutorizacoes = async () => {
    setIsLoading(true);
    try {
      const data = await dataService.getAutorizacoes();
      setAutorizacoes(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    carregarAutorizacoes();
  }, []);

  const abrirModalResposta = (aut: Autorizacao, aprovar: boolean) => {
    setSelectedAut(aut);
    setDecisao(aprovar);
    setObservacao(aprovar ? 'Acesso liberado pelo responsável' : 'Atendimento não autorizado no momento');
    setIsModalOpen(true);
  };

  const handleConfirmarResposta = async () => {
    if (!selectedAut) return;
    setIsSubmitting(true);
    try {
      await dataService.responderAutorizacao(selectedAut.id, decisao, observacao, user);
      setIsModalOpen(false);
      setSelectedAut(null);
      await carregarAutorizacoes();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtradas = autorizacoes.filter((a) => {
    if (statusFilter === 'todos') return true;
    return a.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-100">Fila de Autorizações de Acesso</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Controle de liberação para setores de segurança restrita e gabinetes
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={carregarAutorizacoes} isLoading={isLoading}>
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Atualizar Fila</span>
        </Button>
      </div>

      {/* Filtros de status */}
      <div className="flex items-center gap-2 bg-[#101625] p-1 rounded-lg border border-slate-800 max-w-md text-xs">
        {(['pendente', 'autorizado', 'recusado', 'todos'] as const).map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`flex-1 py-1.5 px-3 rounded-md font-medium capitalize transition-colors ${
              statusFilter === st
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Grid de Autorizações */}
      {filtradas.length === 0 ? (
        <Card className="py-12 text-center text-slate-400 text-sm">
          Nenhuma solicitação de autorização encontrada com o filtro selecionado.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtradas.map((aut) => {
            const visitanteNome = aut.movimentacao?.visitante?.nome || 'Visitante';
            const cracha = aut.movimentacao?.cracha_numero || 'S/C';
            const motivo = aut.movimentacao?.motivo || 'Atendimento';
            const destino = aut.servidor_solicitado?.nome || 'Setor Responsável';

            return (
              <Card key={aut.id} className="border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-emerald-400" />
                      <span className="font-bold text-slate-100 text-sm">{visitanteNome}</span>
                    </div>
                    <Badge
                      variant={
                        aut.status === 'pendente'
                          ? 'warning'
                          : aut.status === 'autorizado'
                          ? 'success'
                          : 'danger'
                      }
                    >
                      {aut.status.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="py-3 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span className="text-slate-400">Crachá Provisório:</span>
                      <span className="font-mono text-emerald-400 font-bold">{cracha}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span className="text-slate-400">Solicitado Para:</span>
                      <span className="font-semibold">{destino}</span>
                    </div>
                    <div className="text-slate-300">
                      <span className="text-slate-400 block text-[11px]">Motivo:</span>
                      <span className="text-slate-200">{motivo}</span>
                    </div>
                    {aut.resposta_observacao && (
                      <div className="p-2 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
                        <span className="text-slate-400 font-medium">Despacho: </span>
                        {aut.resposta_observacao}
                      </div>
                    )}
                    <div className="text-[11px] text-slate-400 flex items-center gap-1 pt-1">
                      <Clock className="w-3 h-3" />
                      <span>Solicitado em: {formatDateTime(aut.created_at)}</span>
                    </div>
                  </div>
                </div>

                {aut.status === 'pendente' && (
                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => abrirModalResposta(aut, false)}
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Recusar</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="success"
                      onClick={() => abrirModalResposta(aut, true)}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Autorizar Entrada</span>
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Despacho */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={decisao ? 'Autorizar Entrada no Setor' : 'Recusar Entrada'}
        description="Registre a decisão oficial da portaria ou chefia do setor"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <Input
            label="Justificativa / Observação do Despacho"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            required
          />

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant={decisao ? 'success' : 'danger'}
              onClick={handleConfirmarResposta}
              isLoading={isSubmitting}
            >
              Confirmar Decisão
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

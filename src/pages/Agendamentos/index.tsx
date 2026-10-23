import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Clock, Search, RefreshCw, UserCheck } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { dataService } from '@/services/dataService';
import { Agendamento, Departamento, Setor, Servidor, Visitante } from '@/types';
import { formatDateTime } from '@/lib/utils';

export const AgendamentosPage: React.FC = () => {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [servidores, setServidores] = useState<Servidor[]>([]);
  const [visitantes, setVisitantes] = useState<Visitante[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [visId, setVisId] = useState('');
  const [depId, setDepId] = useState('');
  const [setorId, setSetorId] = useState('');
  const [servidorDestinoId, setServidorDestinoId] = useState('');
  const [dataHora, setDataHora] = useState('');
  const [motivo, setMotivo] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const carregarDados = async () => {
    setIsLoading(true);
    try {
      const [ags, deps, sets, servs, vis] = await Promise.all([
        dataService.getAgendamentos(),
        dataService.getDepartamentos(),
        dataService.getSetores(),
        dataService.getServidores(),
        dataService.getVisitantes(),
      ]);
      setAgendamentos(ags);
      setDepartamentos(deps);
      setSetores(sets);
      setServidores(servs);
      setVisitantes(vis);
      if (deps.length > 0) setDepId(deps[0].id);
      if (vis.length > 0) setVisId(vis[0].id);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const handleCriar = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await dataService.criarAgendamento({
        visitante_id: visId,
        departamento_id: depId,
        setor_id: setorId || setores.find((s) => s.departamento_id === depId)?.id,
        servidor_destino_id: servidorDestinoId || undefined,
        data_hora_prevista: dataHora || new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        motivo,
        observacoes,
      });
      setIsModalOpen(false);
      setMotivo('');
      setObservacoes('');
      await carregarDados();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-500/30">
              <Calendar className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-100">Agendamentos e Audiências da SMEDU</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Programação prévia de reuniões, perícias, comissões e atendimentos
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={carregarDados} isLoading={isLoading}>
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Atualizar</span>
          </Button>
          <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4" />
            <span>Novo Agendamento</span>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <span>Lista de Agendamentos</span>
            <Badge variant="neutral">{agendamentos.length}</Badge>
          </CardTitle>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#151c2d] text-slate-400 border-b border-slate-800 uppercase font-mono text-[10px]">
              <tr>
                <th className="py-3 px-4">Pessoa / Visitante</th>
                <th className="py-3 px-4">Data e Horário Previsto</th>
                <th className="py-3 px-4">Destino (Dep/Setor)</th>
                <th className="py-3 px-4">Servidor Anfitrião</th>
                <th className="py-3 px-4">Motivo do Agendamento</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {agendamentos.map((ag) => (
                <tr key={ag.id} className="hover:bg-slate-800/20">
                  <td className="py-3 px-4 font-semibold text-slate-100">
                    {ag.visitante?.nome || 'Não identificado'}
                  </td>
                  <td className="py-3 px-4 font-mono text-emerald-400 font-medium">
                    {formatDateTime(ag.data_hora_prevista)}
                  </td>
                  <td className="py-3 px-4 text-slate-300">
                    {ag.departamento?.sigla} - {ag.setor?.nome}
                  </td>
                  <td className="py-3 px-4 text-slate-300">
                    {ag.servidor_destino?.nome || 'Balcão do Setor'}
                  </td>
                  <td className="py-3 px-4 text-slate-300 max-w-xs truncate">{ag.motivo}</td>
                  <td className="py-3 px-4">
                    <Badge variant={ag.status === 'agendado' ? 'info' : 'success'}>
                      {ag.status.toUpperCase()}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Novo Agendamento */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Novo Agendamento Institucional"
        description="Cadastre a previsão de atendimento na Secretaria"
      >
        <form onSubmit={handleCriar} className="space-y-4">
          <Select
            label="Visitante *"
            value={visId}
            onChange={(e) => setVisId(e.target.value)}
            options={visitantes.map((v) => ({
              value: v.id,
              label: `${v.nome} (CPF: ${v.cpf})`,
            }))}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Departamento *"
              value={depId}
              onChange={(e) => setDepId(e.target.value)}
              options={departamentos.map((d) => ({
                value: d.id,
                label: `${d.sigla} - ${d.nome}`,
              }))}
              required
            />
            <Select
              label="Setor"
              value={setorId}
              onChange={(e) => setSetorId(e.target.value)}
              options={setores
                .filter((s) => s.departamento_id === depId)
                .map((s) => ({ value: s.id, label: s.nome }))}
            />
          </div>

          <Select
            label="Servidor Responsável (Opcional)"
            value={servidorDestinoId}
            onChange={(e) => setServidorDestinoId(e.target.value)}
            options={[
              { value: '', label: 'Sem servidor específico' },
              ...servidores.map((s) => ({ value: s.id, label: `${s.nome} (${s.cargo})` })),
            ]}
          />

          <Input
            label="Data e Hora Prevista *"
            type="datetime-local"
            value={dataHora}
            onChange={(e) => setDataHora(e.target.value)}
            required
          />

          <Input
            label="Motivo *"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ex: Audiência com chefia, esclarecimento de dúvidas"
            required
          />

          <Input
            label="Observações / Documentação Exigida"
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            placeholder="Ex: Trazer documentos comprobatórios"
          />

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Agendar Atendimento
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowRightLeft,
  Search,
  Filter,
  LogOut,
  RefreshCw,
  Clock,
  CheckCircle,
  FileDown,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { dataService } from '@/services/dataService';
import { Movimentacao } from '@/types';
import { formatDateTime } from '@/lib/utils';

export const MovimentacoesPage: React.FC = () => {
  const { user } = useAuth();
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'no_predio' | 'finalizado' | 'pendente_autorizacao'>('todos');
  const [tipoFilter, setTipoFilter] = useState<'todos' | 'servidor' | 'visitante'>('todos');

  // Modal de saída
  const [isSaidaModalOpen, setIsSaidaModalOpen] = useState(false);
  const [movimentacaoParaSaida, setMovimentacaoParaSaida] = useState<Movimentacao | null>(null);
  const [saidaObs, setSaidaObs] = useState('');
  const [isSubmittingSaida, setIsSubmittingSaida] = useState(false);

  const carregarMovimentacoes = async () => {
    setIsLoading(true);
    try {
      const data = await dataService.getMovimentacoes();
      setMovimentacoes(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    carregarMovimentacoes();
  }, []);

  const handleConfirmarSaida = async () => {
    if (!movimentacaoParaSaida) return;
    setIsSubmittingSaida(true);
    try {
      await dataService.registrarSaida(movimentacaoParaSaida.id, user, saidaObs);
      setIsSaidaModalOpen(false);
      setMovimentacaoParaSaida(null);
      setSaidaObs('');
      await carregarMovimentacoes();
    } catch (err: any) {
      alert(`Falha ao registrar saída: ${err.message}`);
    } finally {
      setIsSubmittingSaida(false);
    }
  };

  // Filtragem dos registros
  const filtradas = movimentacoes.filter((m) => {
    const nome = (m.servidor?.nome || m.visitante?.nome || '').toLowerCase();
    const cracha = (m.cracha_numero || '').toLowerCase();
    const doc = (m.servidor?.matricula || m.visitante?.cpf || '').toLowerCase();
    const termo = searchTerm.toLowerCase();

    const matchesSearch = nome.includes(termo) || cracha.includes(termo) || doc.includes(termo);
    const matchesStatus = statusFilter === 'todos' || m.status === statusFilter;
    const matchesTipo = tipoFilter === 'todos' || m.tipo_pessoa === tipoFilter;

    return matchesSearch && matchesStatus && matchesTipo;
  });

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-500/30">
              <ArrowRightLeft className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-100">Controle de Movimentações</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Histórico completo e rastreabilidade de acessos na Secretaria Municipal de Educação
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={carregarMovimentacoes} isLoading={isLoading}>
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Atualizar</span>
        </Button>
      </div>

      {/* Barra de Filtros */}
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            placeholder="Buscar por nome, crachá ou documento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />

          {/* Filtro por Status */}
          <div className="flex items-center gap-1 bg-[#101625] p-1 rounded-lg border border-slate-800 text-xs">
            {(['todos', 'no_predio', 'finalizado', 'pendente_autorizacao'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`flex-1 py-1.5 px-2 rounded-md font-medium capitalize transition-colors ${
                  statusFilter === st
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st === 'no_predio' ? 'No Prédio' : st === 'pendente_autorizacao' ? 'Pendente' : st}
              </button>
            ))}
          </div>

          {/* Filtro por Tipo de Pessoa */}
          <div className="flex items-center gap-1 bg-[#101625] p-1 rounded-lg border border-slate-800 text-xs">
            {(['todos', 'servidor', 'visitante'] as const).map((tp) => (
              <button
                key={tp}
                onClick={() => setTipoFilter(tp)}
                className={`flex-1 py-1.5 px-2 rounded-md font-medium capitalize transition-colors ${
                  tipoFilter === tp
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tp}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Tabela de Movimentações */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <CardTitle>
              <span>Registros Encontrados</span>
              <Badge variant="neutral">{filtradas.length}</Badge>
            </CardTitle>
          </div>
        </CardHeader>

        {filtradas.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            Nenhuma movimentação localizada com os filtros informados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#151c2d] text-slate-400 border-b border-slate-800 uppercase font-mono text-[10px]">
                <tr>
                  <th className="py-3 px-4">Pessoa / Tipo</th>
                  <th className="py-3 px-4">Documento</th>
                  <th className="py-3 px-4">Crachá</th>
                  <th className="py-3 px-4">Destino (Dep/Setor)</th>
                  <th className="py-3 px-4">Motivo Declarado</th>
                  <th className="py-3 px-4">Horário Entrada</th>
                  <th className="py-3 px-4">Horário Saída</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtradas.map((m) => {
                  const nome = m.servidor?.nome || m.visitante?.nome || 'Não identificado';
                  const doc = m.servidor?.matricula || m.visitante?.cpf || '-';
                  const dep = m.departamento_destino?.sigla || 'SME';
                  const setor = m.setor_destino?.sigla || 'Geral';

                  return (
                    <tr key={m.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-100">
                        <div>{nome}</div>
                        <div className="text-[10px] text-slate-400 capitalize">{m.tipo_pessoa}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">{doc}</td>
                      <td className="py-3 px-4">
                        <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-emerald-400 font-bold border border-emerald-500/20">
                          {m.cracha_numero || 'S/C'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-200">
                        <div>{dep} - {setor}</div>
                        {m.servidor_destino && (
                          <div className="text-[10px] text-slate-400">
                            Resp: {m.servidor_destino.nome}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-300 max-w-xs truncate" title={m.motivo}>
                        {m.motivo}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">
                        {formatDateTime(m.data_hora_entrada)}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">
                        {m.data_hora_saida ? formatDateTime(m.data_hora_saida) : 'Em aberto'}
                      </td>
                      <td className="py-3 px-4">
                        {m.status === 'no_predio' ? (
                          <Badge variant="success">No Prédio</Badge>
                        ) : m.status === 'pendente_autorizacao' ? (
                          <Badge variant="warning">Pendente</Badge>
                        ) : (
                          <Badge variant="neutral">Finalizado</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {m.status === 'no_predio' && (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => {
                              setMovimentacaoParaSaida(m);
                              setIsSaidaModalOpen(true);
                            }}
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Saída</span>
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal de Saída */}
      <Modal
        isOpen={isSaidaModalOpen}
        onClose={() => setIsSaidaModalOpen(false)}
        title="Registrar Saída"
        description="Confirme o recolhimento do crachá e a liberação"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-xs">
            <span className="text-slate-400">Pessoa:</span>
            <div className="font-bold text-slate-100 text-sm">
              {movimentacaoParaSaida?.servidor?.nome ||
                movimentacaoParaSaida?.visitante?.nome}
            </div>
            <div className="text-slate-400 mt-1">
              Crachá:{' '}
              <span className="font-mono text-emerald-400 font-bold">
                {movimentacaoParaSaida?.cracha_numero || 'S/C'}
              </span>
            </div>
          </div>

          <Input
            label="Observações da Saída"
            value={saidaObs}
            onChange={(e) => setSaidaObs(e.target.value)}
            placeholder="Ex: Saída regular"
          />

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setIsSaidaModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleConfirmarSaida} isLoading={isSubmittingSaida}>
              <LogOut className="w-4 h-4" />
              <span>Confirmar Saída</span>
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

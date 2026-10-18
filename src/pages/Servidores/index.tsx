import React, { useState, useEffect } from 'react';
import { ArrowDown, ArrowUp, Briefcase, Search, Plus, Edit2, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { dataService } from '@/services/dataService';
import { Servidor, Departamento, Setor } from '@/types';

export const ServidoresPage: React.FC = () => {
  const [servidores, setServidores] = useState<Servidor[]>([]);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDep, setSelectedDep] = useState('todos');
  const [selectedCargo, setSelectedCargo] = useState('todos');
  const [selectedLotacao, setSelectedLotacao] = useState('todos');
  const [sortColumn, setSortColumn] = useState<'nome' | 'matricula' | 'cargo' | 'lotacao' | 'status'>('nome');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Modal de edição / criação
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [matricula, setMatricula] = useState('');
  const [cargo, setCargo] = useState('');
  const [lotacao, setLotacao] = useState('');
  const [depId, setDepId] = useState('');
  const [setorId, setSetorId] = useState('');
  const [ramal, setRamal] = useState('');
  const [status, setStatus] = useState<'ativo' | 'afastado' | 'ferias' | 'inativo'>('ativo');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const carregarDados = async () => {
    setIsLoading(true);
    try {
      const [servs, deps, sets] = await Promise.all([
        dataService.getServidores(),
        dataService.getDepartamentos(),
        dataService.getSetores(),
      ]);
      setServidores(servs);
      setDepartamentos(deps);
      setSetores(sets);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const abrirModalNovo = () => {
    setEditId(null);
    setNome('');
    setMatricula(`SME-${Math.floor(100000 + Math.random() * 900000)}`);
    setCargo('');
    setLotacao('');
    setDepId('');
    setSetorId('');
    setRamal('');
    setStatus('ativo');
    setIsModalOpen(true);
  };

  const abrirModalEditar = (s: Servidor) => {
    setEditId(s.id);
    setNome(s.nome);
    setMatricula(s.matricula);
    setCargo(s.cargo);
    setLotacao(s.lotacao || '');
    setDepId(s.departamento_id || '');
    setSetorId(s.setor_id || '');
    setRamal(s.ramal || '');
    setStatus(s.status);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await dataService.salvarServidor({
        id: editId || undefined,
        nome: nome.trim(),
        matricula: matricula.trim(),
        cargo: cargo.trim(),
        lotacao: lotacao.trim(),
        departamento_id: depId || (null as any),
        setor_id: depId && setorId ? setorId : (null as any),
        ramal: ramal.trim(),
        status,
      });
      setIsModalOpen(false);
      await carregarDados();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtrados = servidores.filter((s) => {
    const termo = searchTerm.toLowerCase();
    const matchesSearch =
      s.nome.toLowerCase().includes(termo) ||
      s.matricula.toLowerCase().includes(termo) ||
      (s.lotacao || '').toLowerCase().includes(termo);
    const matchesDep = selectedDep === 'todos' || s.departamento_id === selectedDep;
    const matchesCargo = selectedCargo === 'todos' || s.cargo === selectedCargo;
    const matchesLotacao = selectedLotacao === 'todos' || s.lotacao === selectedLotacao;
    return matchesSearch && matchesDep && matchesCargo && matchesLotacao;
  });

  const cargosDisponiveis = Array.from(new Set(servidores.map((servidor) => servidor.cargo).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  
  // Lotações oficiais cadastradas exclusivamente a partir do campo 'lotacao' do quadro de servidores
  const lotacoesCadastradas = Array.from(
    new Set(
      servidores
        .map((servidor) => (servidor.lotacao || '').trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b, 'pt-BR'));

  // Opções para o select no modal (assegura inclusão da lotação atual mesmo se ainda não constar na lista)
  const lotacoesSelectOptions = Array.from(
    new Set([
      ...lotacoesCadastradas,
      ...(lotacao.trim() ? [lotacao.trim()] : []),
    ])
  ).sort((a, b) => a.localeCompare(b, 'pt-BR'));

  const servidoresOrdenados = [...filtrados].sort((a, b) => {
    const valueFor = (servidor: Servidor) => {
      switch (sortColumn) {
        case 'nome': return servidor.nome;
        case 'matricula': return servidor.matricula;
        case 'cargo': return servidor.cargo;
        case 'lotacao': return servidor.lotacao || `${servidor.departamento?.sigla || 'SMEDU'} ${servidor.setor?.sigla || ''}`;
        case 'status': return servidor.status;
      }
    };
    const comparison = valueFor(a).localeCompare(valueFor(b), 'pt-BR');
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const toggleSort = (column: typeof sortColumn) => {
    if (column === sortColumn) setSortDirection((direction) => direction === 'asc' ? 'desc' : 'asc');
    else { setSortColumn(column); setSortDirection('asc'); }
  };

  const renderSortHeader = (column: typeof sortColumn, label: string) => (
    <th className="py-3 px-4">
      <button type="button" onClick={() => toggleSort(column)} className="inline-flex items-center gap-1 transition-colors hover:text-emerald-400" aria-label={`Ordenar por ${label}`}>
        {label}
        {sortColumn === column && (sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
      </button>
    </th>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-500/30">
              <Briefcase className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-100">Quadro de Servidores da SMEDU</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Gestão do corpo funcional, lotações e consulta de matrícula
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={carregarDados} isLoading={isLoading}>
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Atualizar</span>
          </Button>
          <Button variant="primary" size="sm" onClick={abrirModalNovo}>
            <Plus className="w-4 h-4" />
            <span>Cadastrar Servidor</span>
          </Button>
        </div>
      </div>

      <Card>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Input
            placeholder="Buscar por nome, matrícula ou CPF..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />

          <Select
            value={selectedDep}
            onChange={(e) => setSelectedDep(e.target.value)}
            options={[
              { value: 'todos', label: 'Todos os Departamentos' },
              ...departamentos.map((d) => ({ value: d.id, label: `${d.sigla} - ${d.nome}` })),
            ]}
          />

          <Select
            value={selectedCargo}
            onChange={(e) => setSelectedCargo(e.target.value)}
            options={[
              { value: 'todos', label: 'Todos os Cargos / Funções' },
              ...cargosDisponiveis.map((cargoDisponivel) => ({ value: cargoDisponivel, label: cargoDisponivel })),
            ]}
          />

          <Select
            value={selectedLotacao}
            onChange={(e) => setSelectedLotacao(e.target.value)}
            options={[
              { value: 'todos', label: 'Todas as Lotações Cadastradas' },
              ...lotacoesCadastradas.map((lotacaoCadastrada) => ({ value: lotacaoCadastrada, label: lotacaoCadastrada })),
            ]}
          />
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <span>Servidores Cadastrados</span>
            <Badge variant="neutral">{filtrados.length}</Badge>
          </CardTitle>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#151c2d] text-slate-400 border-b border-slate-800 uppercase font-mono text-[10px]">
              <tr>
                {renderSortHeader('nome', 'Nome do Servidor')}
                {renderSortHeader('matricula', 'Matrícula')}
                {renderSortHeader('cargo', 'Cargo / Função')}
                {renderSortHeader('lotacao', 'Lotação (Dep/Setor)')}
                {renderSortHeader('status', 'Status')}
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {servidoresOrdenados.map((s) => (
                <tr key={s.id} className="hover:bg-slate-800/20 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-100">{s.nome}</td>
                  <td className="py-3 px-4 font-mono text-emerald-400 font-bold">{s.matricula}</td>
                  <td className="py-3 px-4 text-slate-300">{s.cargo}</td>
                  <td className="py-3 px-4 text-slate-200">
                    {s.lotacao || `${s.departamento?.sigla || 'SMEDU'}${s.setor ? ` (${s.setor.sigla})` : ''}`}
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={s.status === 'ativo' ? 'success' : 'warning'}>
                      {s.status.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => abrirModalEditar(s)}
                      className="text-slate-400 hover:text-emerald-400"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editId ? 'Editar Servidor' : 'Cadastrar Servidor'}
        description="Dados funcionais e lotação oficial do servidor"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Matrícula Institucional *" value={matricula} onChange={(e) => setMatricula(e.target.value)} required />
            <Input label="Nome *" value={nome} onChange={(e) => setNome(e.target.value)} required />
          </div>

          <Input label="Cargo Oficial *" value={cargo} onChange={(e) => setCargo(e.target.value)} required />
          <Select
            label="Lotação *"
            value={lotacao}
            onChange={(e) => setLotacao(e.target.value)}
            options={[
              { value: '', label: 'Selecione a lotação cadastrada...' },
              ...lotacoesSelectOptions.map((item) => ({ value: item, label: item })),
            ]}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Departamento (Sede / Opcional)"
              value={depId}
              onChange={(e) => {
                setDepId(e.target.value);
                setSetorId('');
              }}
              options={[
                { value: '', label: 'Sem departamento (Lotação escolar / externa)' },
                ...departamentos.map((d) => ({ value: d.id, label: `${d.sigla} - ${d.nome}` })),
              ]}
            />
            <Select
              label="Setor Específico (Opcional)"
              value={setorId}
              onChange={(e) => setSetorId(e.target.value)}
              disabled={!depId}
              options={[
                { value: '', label: depId ? 'Geral / Gabinete do Dep.' : 'Selecione um departamento primeiro' },
                ...setores
                  .filter((st) => st.departamento_id === depId)
                  .map((st) => ({ value: st.id, label: st.nome })),
              ]}
            />
          </div>

          <Input label="Ramal" value={ramal} onChange={(e) => setRamal(e.target.value)} placeholder="Ex.: 1001" />

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Salvar Servidor
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

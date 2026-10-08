import React, { useState, useEffect } from 'react';
import { Briefcase, Search, Plus, Edit2, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { dataService, formatCpf } from '@/services/dataService';
import { Servidor, Departamento, Setor } from '@/types';

export const ServidoresPage: React.FC = () => {
  const [servidores, setServidores] = useState<Servidor[]>([]);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDep, setSelectedDep] = useState('todos');

  // Modal de edição / criação
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [matricula, setMatricula] = useState('');
  const [cpf, setCpf] = useState('');
  const [cargo, setCargo] = useState('');
  const [depId, setDepId] = useState('');
  const [setorId, setSetorId] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
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
      if (deps.length > 0 && !depId) setDepId(deps[0].id);
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
    setCpf('');
    setCargo('');
    setDepId(departamentos[0]?.id || '');
    setSetorId('');
    setEmail('');
    setTelefone('');
    setStatus('ativo');
    setIsModalOpen(true);
  };

  const abrirModalEditar = (s: Servidor) => {
    setEditId(s.id);
    setNome(s.nome);
    setMatricula(s.matricula);
    setCpf(s.cpf);
    setCargo(s.cargo);
    setDepId(s.departamento_id);
    setSetorId(s.setor_id || '');
    setEmail(s.email || '');
    setTelefone(s.telefone || '');
    setStatus(s.status);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await dataService.salvarServidor({
        id: editId || undefined,
        nome,
        matricula,
        cpf,
        cargo,
        departamento_id: depId,
        setor_id: setorId || undefined,
        email,
        telefone,
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
      s.cpf.includes(termo);
    const matchesDep = selectedDep === 'todos' || s.departamento_id === selectedDep;
    return matchesSearch && matchesDep;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-500/30">
              <Briefcase className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-100">Quadro de Servidores da SME</h2>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                <th className="py-3 px-4">Nome do Servidor</th>
                <th className="py-3 px-4">Matrícula</th>
                <th className="py-3 px-4">CPF</th>
                <th className="py-3 px-4">Cargo / Função</th>
                <th className="py-3 px-4">Lotação (Dep/Setor)</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtrados.map((s) => (
                <tr key={s.id} className="hover:bg-slate-800/20 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-100">{s.nome}</td>
                  <td className="py-3 px-4 font-mono text-emerald-400 font-bold">{s.matricula}</td>
                  <td className="py-3 px-4 font-mono text-slate-400">{s.cpf}</td>
                  <td className="py-3 px-4 text-slate-300">{s.cargo}</td>
                  <td className="py-3 px-4 text-slate-200">
                    {s.departamento?.sigla || 'SME'} {s.setor ? `(${s.setor.sigla})` : ''}
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
          <Input label="Nome Completo *" value={nome} onChange={(e) => setNome(e.target.value)} required />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Matrícula Institucional *" value={matricula} onChange={(e) => setMatricula(e.target.value)} required />
            <Input label="CPF *" value={cpf} onChange={(e) => setCpf(formatCpf(e.target.value))} placeholder="000.000.000-00" maxLength={14} required />
          </div>

          <Input label="Cargo Oficial *" value={cargo} onChange={(e) => setCargo(e.target.value)} required />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Departamento *"
              value={depId}
              onChange={(e) => setDepId(e.target.value)}
              options={departamentos.map((d) => ({ value: d.id, label: `${d.sigla} - ${d.nome}` }))}
              required
            />
            <Select
              label="Setor Específico"
              value={setorId}
              onChange={(e) => setSetorId(e.target.value)}
              options={[
                { value: '', label: 'Geral / Gabinete do Dep.' },
                ...setores
                  .filter((st) => st.departamento_id === depId)
                  .map((st) => ({ value: st.id, label: `${st.sigla} - ${st.nome}` })),
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Telefone / Ramal" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
            <Input label="E-mail Institucional" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

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

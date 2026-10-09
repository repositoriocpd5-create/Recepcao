import React, { useState, useEffect } from 'react';
import { Building2, Plus, Phone, MapPin, Pencil, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { dataService } from '@/services/dataService';
import { Departamento, Setor } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

export const DepartamentosPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal Novo Setor
  const [isSetorModalOpen, setIsSetorModalOpen] = useState(false);
  const [isDepartamentoModalOpen, setIsDepartamentoModalOpen] = useState(false);
  const [editingSetor, setEditingSetor] = useState<Setor | null>(null);
  const [editingDepartamento, setEditingDepartamento] = useState<Departamento | null>(null);
  const [departamentoNome, setDepartamentoNome] = useState('');
  const [departamentoSigla, setDepartamentoSigla] = useState('');
  const [departamentoDescricao, setDepartamentoDescricao] = useState('');
  const [departamentoResponsavel, setDepartamentoResponsavel] = useState('');
  const [departamentoRamal, setDepartamentoRamal] = useState('');
  const [departamentoLocalizacao, setDepartamentoLocalizacao] = useState('');
  const [setorNome, setSetorNome] = useState('');
  const [setorSigla, setSetorSigla] = useState('');
  const [setorDepId, setSetorDepId] = useState('');
  const [setorResp, setSetorResp] = useState('');
  const [setorRamal, setSetorRamal] = useState('');
  const [setorSala, setSetorSala] = useState('');
  const [setorRequerAut, setSetorRequerAut] = useState(false);

  const carregarDados = async () => {
    setIsLoading(true);
    try {
      const [deps, sets] = await Promise.all([
        dataService.getDepartamentos(),
        dataService.getSetores(),
      ]);
      setDepartamentos(deps);
      setSetores(sets);
      if (deps.length > 0 && !setorDepId) setSetorDepId(deps[0].id);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const limparFormularioSetor = () => {
    setEditingSetor(null);
    setSetorNome('');
    setSetorSigla('');
    setSetorResp('');
    setSetorRamal('');
    setSetorSala('');
    setSetorRequerAut(false);
  };

  const abrirNovoSetor = () => {
    limparFormularioSetor();
    setIsSetorModalOpen(true);
  };

  const abrirEdicaoSetor = (setor: Setor) => {
    setEditingSetor(setor);
    setSetorNome(setor.nome);
    setSetorSigla(setor.sigla);
    setSetorDepId(setor.departamento_id);
    setSetorResp(setor.responsavel || '');
    setSetorRamal(setor.ramal || '');
    setSetorSala(setor.sala || '');
    setSetorRequerAut(setor.requer_autorizacao);
    setIsSetorModalOpen(true);
  };

  const handleSalvarSetor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await dataService.salvarSetor({
        id: editingSetor?.id,
        departamento_id: setorDepId,
        nome: setorNome,
        sigla: setorSigla.toUpperCase(),
        responsavel: setorResp,
        ramal: setorRamal,
        sala: setorSala,
        requer_autorizacao: setorRequerAut,
        ativo: editingSetor?.ativo ?? true,
      });
      setIsSetorModalOpen(false);
      limparFormularioSetor();
      await carregarDados();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    }
  };

  const abrirNovoDepartamento = () => {
    setEditingDepartamento(null);
    setDepartamentoNome('');
    setDepartamentoSigla('');
    setDepartamentoDescricao('');
    setDepartamentoResponsavel('');
    setDepartamentoRamal('');
    setDepartamentoLocalizacao('');
    setIsDepartamentoModalOpen(true);
  };

  const abrirEdicaoDepartamento = (departamento: Departamento) => {
    setEditingDepartamento(departamento);
    setDepartamentoNome(departamento.nome);
    setDepartamentoSigla(departamento.sigla);
    setDepartamentoDescricao(departamento.descricao || '');
    setDepartamentoResponsavel(departamento.responsavel || '');
    setDepartamentoRamal(departamento.ramal || '');
    setDepartamentoLocalizacao(departamento.localizacao || '');
    setIsDepartamentoModalOpen(true);
  };

  const handleSalvarDepartamento = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await dataService.salvarDepartamento({
        id: editingDepartamento?.id,
        nome: departamentoNome,
        sigla: departamentoSigla.toUpperCase(),
        descricao: departamentoDescricao,
        responsavel: departamentoResponsavel,
        ramal: departamentoRamal,
        localizacao: departamentoLocalizacao,
        ativo: editingDepartamento?.ativo ?? true,
      });
      setIsDepartamentoModalOpen(false);
      await carregarDados();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    }
  };

  const excluirSetor = async (setor: Setor) => {
    if (!confirm(`Excluir o setor "${setor.nome}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await dataService.excluirSetor(setor.id);
      await carregarDados();
    } catch (err: any) {
      alert(`Não foi possível excluir o setor: ${err.message}`);
    }
  };

  const excluirDepartamento = async (departamento: Departamento) => {
    if (!confirm(`Excluir o departamento "${departamento.nome}"? Remova os setores vinculados antes de continuar.`)) return;
    try {
      await dataService.excluirDepartamento(departamento.id);
      await carregarDados();
    } catch (err: any) {
      alert(`Não foi possível excluir o departamento: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#dce4f0] dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#edf5fc] text-[#005a9c] border border-[#b9d9f3] dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-500/30">
              <Building2 className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-[#152238] dark:text-slate-100">Estrutura de Departamentos & Setores</h2>
          </div>
          <p className="text-xs text-[#627289] dark:text-slate-400 mt-1">
            Organograma funcional, ramais, salas e regras de exigência de autorização de acesso
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={abrirNovoDepartamento}>
              <Plus className="w-4 h-4" />
              <span>Departamento</span>
            </Button>
            <Button variant="primary" size="sm" onClick={abrirNovoSetor}>
              <Plus className="w-4 h-4" />
              <span>Novo Setor</span>
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {departamentos.map((dep) => {
          const setoresDoDep = setores.filter((s) => s.departamento_id === dep.id);

          return (
            <Card key={dep.id} className="border-[#dce4f0] dark:border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#dce4f0] dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="font-mono bg-[#edf5fc] px-2 py-0.5 rounded text-[#005a9c] font-bold border border-[#b9d9f3] text-xs dark:bg-slate-800 dark:text-emerald-400 dark:border-emerald-500/20">
                      {dep.sigla}
                    </span>
                    <h3 className="font-bold text-[#152238] text-sm dark:text-slate-100">{dep.nome}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="neutral">{setoresDoDep.length} setores</Badge>
                    {isAdmin && (
                      <>
                        <button
                          type="button"
                          onClick={() => abrirEdicaoDepartamento(dep)}
                          className="p-1 text-[#627289] hover:text-[#005a9c] rounded transition-colors"
                          title="Editar departamento"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => excluirDepartamento(dep)}
                          className="p-1 text-[#627289] hover:text-rose-600 rounded transition-colors"
                          title="Excluir departamento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="py-2.5 text-xs text-[#627289] dark:text-slate-400 space-y-1">
                  <p>{dep.descricao}</p>
                  <div className="flex items-center gap-4 text-[#52647d] pt-1 dark:text-slate-300">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      {dep.localizacao || 'Sede SMEDU'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      Ramal: {dep.ramal || '-'}
                    </span>
                  </div>
                </div>

                {/* Lista de Setores */}
                <div className="mt-3 pt-3 border-t border-[#dce4f0] dark:border-slate-800/80">
                  <span className="text-[11px] font-bold text-[#627289] uppercase tracking-wider block mb-2 dark:text-slate-400">
                    Setores Vinculados:
                  </span>
                  <div className="space-y-2">
                    {setoresDoDep.map((setor) => (
                      <div
                        key={setor.id}
                        className="p-2.5 rounded-lg bg-[#f8fbff] border border-[#dce4f0] flex items-center justify-between text-xs transition-colors hover:border-[#b9d9f3] dark:bg-[#0e1320] dark:border-slate-800/80"
                      >
                        <div>
                          <div className="font-semibold text-[#152238] dark:text-slate-200">
                            {setor.sigla} — {setor.nome}
                          </div>
                          <div className="text-[11px] text-[#627289] dark:text-slate-400">
                            {setor.sala ? `${setor.sala} • ` : ''}
                            Resp: {setor.responsavel || 'Não informado'}
                            {setor.ramal ? ` • Ramal: ${setor.ramal}` : ''}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          {setor.requer_autorizacao ? (
                            <Badge variant="warning" title="Requer autorização prévia para entrada">
                              Requer Autorização
                            </Badge>
                          ) : (
                            <Badge variant="neutral">Livre Acesso</Badge>
                          )}
                          {isAdmin && (
                            <>
                              <button
                                type="button"
                                onClick={() => abrirEdicaoSetor(setor)}
                                className="p-1 text-[#627289] hover:text-[#005a9c] rounded transition-colors"
                                title="Editar setor"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => excluirSetor(setor)}
                                className="p-1 text-[#627289] hover:text-rose-600 rounded transition-colors"
                                title="Excluir setor"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Modal
        isOpen={isDepartamentoModalOpen}
        onClose={() => setIsDepartamentoModalOpen(false)}
        title={editingDepartamento ? 'Editar Departamento' : 'Cadastrar Departamento'}
        description="Defina a estrutura institucional e os dados de contato"
      >
        <form onSubmit={handleSalvarDepartamento} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Nome do Departamento *" value={departamentoNome} onChange={(e) => setDepartamentoNome(e.target.value)} required />
            <Input label="Sigla *" value={departamentoSigla} onChange={(e) => setDepartamentoSigla(e.target.value)} required />
          </div>
          <Input label="Descrição" value={departamentoDescricao} onChange={(e) => setDepartamentoDescricao(e.target.value)} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Responsável" value={departamentoResponsavel} onChange={(e) => setDepartamentoResponsavel(e.target.value)} />
            <Input label="Ramal" value={departamentoRamal} onChange={(e) => setDepartamentoRamal(e.target.value)} />
          </div>
          <Input label="Localização" value={departamentoLocalizacao} onChange={(e) => setDepartamentoLocalizacao(e.target.value)} />
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#dce4f0] dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsDepartamentoModalOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="primary">{editingDepartamento ? 'Salvar alterações' : 'Cadastrar departamento'}</Button>
          </div>
        </form>
      </Modal>

      {/* Modal de Setor */}
      <Modal
        isOpen={isSetorModalOpen}
        onClose={() => setIsSetorModalOpen(false)}
        title={editingSetor ? 'Editar Setor' : 'Cadastrar Novo Setor'}
        description="Adicione ou atualize um setor e defina suas regras de acesso"
      >
        <form onSubmit={handleSalvarSetor} className="space-y-4">
          <Select
            label="Departamento Vinculado *"
            value={setorDepId}
            onChange={(e) => setSetorDepId(e.target.value)}
            options={departamentos.map((d) => ({
              value: d.id,
              label: `${d.sigla} - ${d.nome}`,
            }))}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Nome do Setor *"
              value={setorNome}
              onChange={(e) => setSetorNome(e.target.value)}
              placeholder="Ex: Gestão Financeira"
              required
            />
            <Input
              label="Sigla *"
              value={setorSigla}
              onChange={(e) => setSetorSigla(e.target.value)}
              placeholder="Ex: GEFIN"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Responsável / Chefe do Setor"
              value={setorResp}
              onChange={(e) => setSetorResp(e.target.value)}
              placeholder="Ex: João da Silva"
            />
            <Input
              label="Ramal / Telefone"
              value={setorRamal}
              onChange={(e) => setSetorRamal(e.target.value)}
              placeholder="Ex: 1044"
            />
          </div>

          <Input
            label="Sala / Localização Física"
            value={setorSala}
            onChange={(e) => setSetorSala(e.target.value)}
            placeholder="Ex: Sala 202 - Ala Leste"
          />

          {/* Toggle de autorização obrigatória */}
          <div className="p-3 bg-[#f8fbff] rounded-lg border border-[#dce4f0] flex items-center justify-between dark:bg-slate-900 dark:border-slate-800">
            <div>
              <span className="font-semibold text-xs text-[#152238] block dark:text-slate-200">
                Exigir Autorização Prévia da Portaria
              </span>
              <span className="text-[11px] text-[#627289] dark:text-slate-400">
                Se ativado, qualquer entrada para este setor exigirá aprovação formal
              </span>
            </div>
            <input
              type="checkbox"
              checked={setorRequerAut}
              onChange={(e) => setSetorRequerAut(e.target.checked)}
              className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#dce4f0] dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsSetorModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary">{editingSetor ? 'Salvar alterações' : 'Salvar Setor'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

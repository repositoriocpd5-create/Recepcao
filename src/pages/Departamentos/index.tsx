import React, { useState, useEffect } from 'react';
import { Building2, Plus, Phone, MapPin, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { dataService } from '@/services/dataService';
import { Departamento, Setor } from '@/types';

export const DepartamentosPage: React.FC = () => {
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal Novo Setor
  const [isSetorModalOpen, setIsSetorModalOpen] = useState(false);
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

  const handleCriarSetor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const novo: Setor = {
        id: `s-${Date.now()}`,
        departamento_id: setorDepId,
        nome: setorNome,
        sigla: setorSigla.toUpperCase(),
        responsavel: setorResp,
        ramal: setorRamal,
        sala: setorSala,
        requer_autorizacao: setorRequerAut,
        ativo: true,
      };
      const listaAtual = await dataService.getSetores();
      listaAtual.push(novo);
      localStorage.setItem('sme_setores', JSON.stringify(listaAtual));
      setIsSetorModalOpen(false);
      setSetorNome('');
      setSetorSigla('');
      setSetorResp('');
      setSetorRamal('');
      setSetorSala('');
      setSetorRequerAut(false);
      await carregarDados();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-500/30">
              <Building2 className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-100">Estrutura de Departamentos & Setores</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Organograma funcional, ramais, salas e regras de exigência de autorização de acesso
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={() => setIsSetorModalOpen(true)}>
          <Plus className="w-4 h-4" />
          <span>Novo Setor</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {departamentos.map((dep) => {
          const setoresDoDep = setores.filter((s) => s.departamento_id === dep.id);

          return (
            <Card key={dep.id} className="border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-emerald-400 font-bold border border-emerald-500/20 text-xs">
                      {dep.sigla}
                    </span>
                    <h3 className="font-bold text-slate-100 text-sm">{dep.nome}</h3>
                  </div>
                  <Badge variant="neutral">{setoresDoDep.length} setores</Badge>
                </div>

                <div className="py-2.5 text-xs text-slate-400 space-y-1">
                  <p>{dep.descricao}</p>
                  <div className="flex items-center gap-4 text-slate-300 pt-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      {dep.localizacao || 'Sede SME'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      Ramal: {dep.ramal || '-'}
                    </span>
                  </div>
                </div>

                {/* Lista de Setores */}
                <div className="mt-3 pt-3 border-t border-slate-800/80">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Setores Vinculados:
                  </span>
                  <div className="space-y-2">
                    {setoresDoDep.map((setor) => (
                      <div
                        key={setor.id}
                        className="p-2.5 rounded-lg bg-[#0e1320] border border-slate-800/80 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-semibold text-slate-200">
                            {setor.sigla} — {setor.nome}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {setor.sala ? `${setor.sala} • ` : ''}
                            Resp: {setor.responsavel || 'Não informado'}
                            {setor.ramal ? ` • Ramal: ${setor.ramal}` : ''}
                          </div>
                        </div>

                        <div>
                          {setor.requer_autorizacao ? (
                            <Badge variant="warning" title="Requer autorização prévia para entrada">
                              Requer Autorização
                            </Badge>
                          ) : (
                            <Badge variant="neutral">Livre Acesso</Badge>
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

      {/* Modal Novo Setor */}
      <Modal
        isOpen={isSetorModalOpen}
        onClose={() => setIsSetorModalOpen(false)}
        title="Cadastrar Novo Setor"
        description="Adicione um novo setor ao organograma e defina regras de acesso"
      >
        <form onSubmit={handleCriarSetor} className="space-y-4">
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
          <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between">
            <div>
              <span className="font-semibold text-xs text-slate-200 block">
                Exigir Autorização Prévia da Portaria
              </span>
              <span className="text-[11px] text-slate-400">
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

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsSetorModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary">
              Salvar Setor
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

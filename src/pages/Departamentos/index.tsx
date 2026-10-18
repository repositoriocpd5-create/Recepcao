import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Phone,
  MapPin,
  Pencil,
  Trash2,
  ShieldAlert,
  ShieldCheck,
  Search,
  X,
  Loader2,
  CheckCircle2,
  SlidersHorizontal,
  FolderTree,
  AlertTriangle,
  Users
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { dataService } from '@/services/dataService';
import { Departamento, Setor } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { pessoasPorSetor } from '@/services/estruturaImportada';
import { cn } from '@/lib/utils';

export const DepartamentosPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || !user;
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Estados de controle rápido de autorização e UX
  const [loadingSetorId, setLoadingSetorId] = useState<string | null>(null);
  const [filtroAutorizacao, setFiltroAutorizacao] = useState<'todos' | 'requer' | 'livre'>('todos');
  const [buscaTermo, setBuscaTermo] = useState('');
  const [toastNotificacao, setToastNotificacao] = useState<{ tipo: 'sucesso' | 'info'; texto: string } | null>(null);

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

  // Alternância rápida da regra 'Requer Autorização' diretamente no card do setor
  const handleToggleRequerAutorizacao = async (setor: Setor) => {
    if (!isAdmin) return;
    const novoStatus = !setor.requer_autorizacao;
    setLoadingSetorId(setor.id);

    // Atualização otimista imediata na interface
    setSetores((atuais) =>
      atuais.map((s) => (s.id === setor.id ? { ...s, requer_autorizacao: novoStatus } : s))
    );

    try {
      await dataService.salvarSetor({
        id: setor.id,
        departamento_id: setor.departamento_id,
        nome: setor.nome,
        sigla: setor.sigla,
        requer_autorizacao: novoStatus,
      });

      setToastNotificacao({
        tipo: novoStatus ? 'sucesso' : 'info',
        texto: novoStatus
          ? `O setor "${setor.nome}" agora EXIGE autorização formal na portaria.`
          : `O setor "${setor.nome}" foi alterado para LIVRE ACESSO na portaria.`,
      });
    } catch (err: any) {
      // Reverter alteração otimista em caso de falha
      setSetores((atuais) =>
        atuais.map((s) => (s.id === setor.id ? { ...s, requer_autorizacao: !novoStatus } : s))
      );
      alert(`Não foi possível atualizar a regra do setor: ${err.message}`);
    } finally {
      setLoadingSetorId(null);
    }
  };

  // Dispensar notificação toast automaticamente após 4 segundos
  useEffect(() => {
    if (!toastNotificacao) return;
    const timer = window.setTimeout(() => setToastNotificacao(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toastNotificacao]);

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

  // Métricas para a barra superior
  const totalSetores = setores.length;
  const totalRequerAut = setores.filter((s) => s.requer_autorizacao).length;
  const totalLivreAcesso = setores.filter((s) => !s.requer_autorizacao).length;

  // Filtragem de setores por busca e tipo de regra
  const termoNorm = buscaTermo.trim().toLocaleLowerCase('pt-BR');
  const filtrarSetores = (listaSetores: Setor[]) => {
    return listaSetores.filter((setor) => {
      // Filtro de autorização
      if (filtroAutorizacao === 'requer' && !setor.requer_autorizacao) return false;
      if (filtroAutorizacao === 'livre' && setor.requer_autorizacao) return false;

      // Filtro de busca textual
      if (!termoNorm) return true;
      const textoCompleto = `${setor.nome} ${setor.sigla || ''} ${setor.sala || ''} ${setor.ramal || ''}`.toLocaleLowerCase('pt-BR');
      return textoCompleto.includes(termoNorm);
    });
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#dce4f0] dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#0d6efd] to-[#0854c7] text-white shadow-md shadow-blue-500/20">
              <Building2 className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl font-extrabold text-[#0d1f45] dark:text-slate-100 leading-tight">
                Estrutura de Departamentos & Setores
              </h2>
              <p className="text-xs text-[#627289] dark:text-slate-400 mt-0.5">
                Organograma institucional, ramais, salas e controle de autorização prévia de acesso
              </p>
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={abrirNovoDepartamento} className="rounded-xl">
              <Plus className="w-4 h-4" />
              <span>Departamento</span>
            </Button>
            <Button variant="primary" size="sm" onClick={abrirNovoSetor} className="rounded-xl shadow-sm">
              <Plus className="w-4 h-4" />
              <span>Novo Setor</span>
            </Button>
          </div>
        )}
      </div>

      {/* PAINEL DE MÉTRICAS & CONTROLE DE ACESSO (UX/UI COM FORÇA TOTAL) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Departamentos */}
        <div className="rounded-2xl border border-[#dce4f0] bg-white p-3.5 sm:p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#627289] dark:text-slate-400">Departamentos</span>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Building2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#0d1f45] dark:text-slate-100">{departamentos.length}</span>
            <span className="text-xs text-[#627289] dark:text-slate-400">unidades</span>
          </div>
        </div>

        {/* Card 2: Total Setores */}
        <div className="rounded-2xl border border-[#dce4f0] bg-white p-3.5 sm:p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#627289] dark:text-slate-400">Total de Setores</span>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <FolderTree className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#0d1f45] dark:text-slate-100">{totalSetores}</span>
            <span className="text-xs text-[#627289] dark:text-slate-400">setores cadastrados</span>
          </div>
        </div>

        {/* Card 3: Requer Autorização */}
        <div
          onClick={() => setFiltroAutorizacao(filtroAutorizacao === 'requer' ? 'todos' : 'requer')}
          className={cn(
            'rounded-2xl border p-3.5 sm:p-4 transition-all duration-200 cursor-pointer shadow-xs select-none',
            filtroAutorizacao === 'requer'
              ? 'border-amber-400 bg-amber-50/70 ring-2 ring-amber-400/30 dark:bg-amber-950/40 dark:border-amber-500'
              : 'border-[#dce4f0] bg-white hover:border-amber-300 hover:bg-amber-50/30 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:bg-slate-800/60'
          )}
          title="Clique para filtrar apenas setores com autorização prévia"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              Requer Autorização
            </span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-900 dark:text-amber-200">{totalRequerAut}</span>
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">exigem confirmação</span>
          </div>
        </div>

        {/* Card 4: Livre Acesso */}
        <div
          onClick={() => setFiltroAutorizacao(filtroAutorizacao === 'livre' ? 'todos' : 'livre')}
          className={cn(
            'rounded-2xl border p-3.5 sm:p-4 transition-all duration-200 cursor-pointer shadow-xs select-none',
            filtroAutorizacao === 'livre'
              ? 'border-emerald-400 bg-emerald-50/70 ring-2 ring-emerald-400/30 dark:bg-emerald-950/40 dark:border-emerald-500'
              : 'border-[#dce4f0] bg-white hover:border-emerald-300 hover:bg-emerald-50/30 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:bg-slate-800/60'
          )}
          title="Clique para filtrar apenas setores de livre acesso"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Livre Acesso
            </span>
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-900 dark:text-emerald-200">{totalLivreAcesso}</span>
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">acesso direto</span>
          </div>
        </div>
      </div>

      {/* BARRA DE PESQUISA & FILTROS EM PÍLULA */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-[#dce4f0] bg-white p-2.5 sm:p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8696ac]" />
          <input
            type="text"
            value={buscaTermo}
            onChange={(e) => setBuscaTermo(e.target.value)}
            placeholder="Filtrar setores por nome, sala ou ramal..."
            className="w-full min-h-10 rounded-xl border border-[#dce4f0] bg-[#f8fbff] pl-9 pr-9 text-xs text-[#0d1f45] placeholder-[#8696ac] transition-colors focus:border-[#0d6efd] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0d6efd]/20 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          />
          {buscaTermo && (
            <button
              type="button"
              onClick={() => setBuscaTermo('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8696ac] hover:text-[#0d1f45] dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setFiltroAutorizacao('todos')}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0',
              filtroAutorizacao === 'todos'
                ? 'bg-[#0d6efd] text-white shadow-xs'
                : 'bg-[#f4f7fc] text-[#52647d] hover:bg-[#e8f1fc] dark:bg-slate-800 dark:text-slate-300'
            )}
          >
            Todos ({totalSetores})
          </button>
          <button
            type="button"
            onClick={() => setFiltroAutorizacao('requer')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0',
              filtroAutorizacao === 'requer'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100/80 border border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-500/30'
            )}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Requer Autorização ({totalRequerAut})
          </button>
          <button
            type="button"
            onClick={() => setFiltroAutorizacao('livre')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0',
              filtroAutorizacao === 'livre'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100/80 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-500/30'
            )}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Livre Acesso ({totalLivreAcesso})
          </button>
        </div>
      </div>

      {/* GRADE DOS DEPARTAMENTOS & SETORES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {departamentos.map((dep) => {
          const todosDoDep = setores.filter((s) => s.departamento_id === dep.id);
          const setoresDoDep = filtrarSetores(todosDoDep);

          return (
            <Card key={dep.id} className="border-[#dce4f0] dark:border-slate-800 flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md transition-shadow">
              <div>
                {/* Topo do Departamento */}
                <div className="flex items-center justify-between pb-3 border-b border-[#dce4f0] dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono bg-[#edf5fc] px-2.5 py-1 rounded-xl text-[#005a9c] font-black border border-[#b9d9f3] text-xs shadow-xs dark:bg-slate-800 dark:text-emerald-400 dark:border-emerald-500/20">
                      {dep.sigla}
                    </span>
                    <h3 className="font-extrabold text-[#0d1f45] text-base dark:text-slate-100">{dep.nome}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="neutral">
                      {setoresDoDep.length} {setoresDoDep.length === 1 ? 'setor' : 'setores'}
                    </Badge>
                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => abrirEdicaoDepartamento(dep)}
                          className="p-1.5 text-[#627289] hover:text-[#005a9c] hover:bg-[#edf5fc] rounded-lg transition-colors dark:hover:bg-slate-800"
                          title="Editar departamento"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => excluirDepartamento(dep)}
                          className="p-1.5 text-[#627289] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors dark:hover:bg-rose-950/40"
                          title="Excluir departamento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Descrição e Contatos do Departamento */}
                <div className="py-2.5 text-xs text-[#627289] dark:text-slate-400 space-y-1">
                  {dep.descricao && <p>{dep.descricao}</p>}
                  <div className="flex flex-wrap items-center gap-4 text-[#52647d] pt-1 dark:text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#0d6efd]" />
                      {dep.localizacao || 'Sede SMEDU'}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-[#0d6efd]" />
                      Ramal: <strong>{dep.ramal || '-'}</strong>
                    </span>
                  </div>
                </div>

                {/* LISTAGEM DOS SETORES COM O RECURSO 'REQUER AUTORIZAÇÃO' EM CADA UM */}
                <div className="mt-3 pt-3 border-t border-[#dce4f0] dark:border-slate-800/80">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[11px] font-extrabold text-[#627289] uppercase tracking-wider block dark:text-slate-400">
                      Setores Vinculados:
                    </span>
                    {isAdmin && (
                      <span className="text-[10px] text-[#0877d1] font-semibold dark:text-sky-300">
                        ⚡ Clique na opção do setor para alternar regra
                      </span>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    {setoresDoDep.map((setor) => {
                      const pessoas = pessoasPorSetor.get(setor.nome) || [];
                      const isAtualizando = loadingSetorId === setor.id;

                      return (
                        <div
                          key={setor.id}
                          className={cn(
                            'group relative rounded-xl border p-3 text-xs transition-all duration-200',
                            setor.requer_autorizacao
                              ? 'border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-500/[0.08] via-amber-500/[0.03] to-white border-[#dce4f0] shadow-xs hover:border-amber-300 dark:from-amber-950/20 dark:to-slate-900 dark:border-slate-800'
                              : 'border-l-4 border-l-emerald-500/50 bg-[#f8fbff] border-[#dce4f0] hover:border-[#b9d9f3] dark:bg-[#0e1320] dark:border-slate-800/80'
                          )}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                            {/* Nome do Setor e Sigla */}
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-extrabold text-sm text-[#0d1f45] dark:text-slate-100 group-hover:text-[#0b5ed7] transition-colors">
                                  {setor.nome}
                                </span>
                                {setor.sigla && (
                                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#e8f1fc] text-[#005a9c] font-bold border border-[#b9d9f3] dark:bg-slate-800 dark:text-sky-300 dark:border-slate-700">
                                    {setor.sigla}
                                  </span>
                                )}
                              </div>

                              {/* Metadados: sala, pessoas, ramal */}
                              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#627289] dark:text-slate-400">
                                {setor.sala && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3 text-slate-400" />
                                    {setor.sala}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Users className="w-3 h-3 text-slate-400" />
                                  {pessoas.length} {pessoas.length === 1 ? 'pessoa vinculada' : 'pessoas vinculadas'}
                                </span>
                                {setor.ramal && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="w-3 h-3 text-slate-400" />
                                    Ramal: {setor.ramal}
                                  </span>
                                )}
                              </div>

                              {pessoas.length > 0 && (
                                <div className="mt-1.5 text-[10px] text-[#68809f] line-clamp-1 dark:text-slate-400">
                                  {pessoas.join(' • ')}
                                </div>
                              )}
                            </div>

                            {/* CONTROLE RÁPIDO DO ADMINISTRADOR: 'REQUER AUTORIZAÇÃO' / 'LIVRE ACESSO' */}
                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                              {isAdmin ? (
                                <button
                                  type="button"
                                  onClick={() => handleToggleRequerAutorizacao(setor)}
                                  disabled={isAtualizando}
                                  className={cn(
                                    'group/btn relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer border select-none',
                                    setor.requer_autorizacao
                                      ? 'bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-amber-500/20 text-amber-800 border-amber-300 shadow-[0_2px_8px_rgba(245,158,11,0.25)] hover:border-amber-400 hover:shadow-[0_4px_14px_rgba(245,158,11,0.35)] hover:scale-[1.02] dark:from-amber-950/70 dark:to-orange-950/50 dark:text-amber-200 dark:border-amber-500/40'
                                      : 'bg-white hover:bg-emerald-50 text-[#52647d] hover:text-emerald-700 border-[#dce4f0] hover:border-emerald-300 shadow-2xs hover:scale-[1.02] dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800 dark:hover:border-emerald-500/40 dark:hover:text-emerald-300'
                                  )}
                                  title={
                                    setor.requer_autorizacao
                                      ? 'Clique para liberar o acesso sem autorização prévia'
                                      : 'Clique para exigir autorização formal prévia da portaria'
                                  }
                                >
                                  <span className={cn(
                                    'relative flex h-2 w-2 rounded-full shrink-0',
                                    setor.requer_autorizacao ? 'bg-amber-500' : 'bg-emerald-500'
                                  )}>
                                    {setor.requer_autorizacao && (
                                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                                    )}
                                  </span>

                                  {isAtualizando ? (
                                    <span className="flex items-center gap-1.5 text-xs text-[#0877d1]">
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando...
                                    </span>
                                  ) : setor.requer_autorizacao ? (
                                    <span className="flex items-center gap-1.5">
                                      <ShieldAlert className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                      <span>Requer Autorização</span>
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1.5">
                                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                      <span>Livre Acesso</span>
                                    </span>
                                  )}
                                </button>
                              ) : (
                                setor.requer_autorizacao ? (
                                  <Badge variant="warning">
                                    <ShieldAlert className="w-3 h-3 mr-1 inline" /> Requer Autorização
                                  </Badge>
                                ) : (
                                  <Badge variant="neutral">
                                    <ShieldCheck className="w-3 h-3 mr-1 inline" /> Livre Acesso
                                  </Badge>
                                )
                              )}

                              {isAdmin && (
                                <div className="flex items-center gap-1 border-l border-[#dce4f0] pl-2 dark:border-slate-800">
                                  <button
                                    type="button"
                                    onClick={() => abrirEdicaoSetor(setor)}
                                    className="p-1.5 text-[#627289] hover:text-[#005a9c] hover:bg-[#edf5fc] rounded-lg transition-colors dark:hover:bg-slate-800"
                                    title="Editar detalhes do setor"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => excluirSetor(setor)}
                                    className="p-1.5 text-[#627289] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors dark:hover:bg-rose-950/40"
                                    title="Excluir setor"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {setoresDoDep.length === 0 && (
                      <div className="rounded-xl border border-dashed border-[#dce4f0] bg-[#f8fbff] p-4 text-center text-xs text-[#627289] dark:border-slate-800 dark:bg-slate-900/40">
                        {buscaTermo || filtroAutorizacao !== 'todos'
                          ? 'Nenhum setor encontrado para os filtros aplicados neste departamento.'
                          : 'Nenhum setor vinculado a este departamento.'}
                      </div>
                    )}
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

          {/* Card Interativo com UX/UI com Força Total para 'Requer Autorização' */}
          <div
            onClick={() => setSetorRequerAut(!setorRequerAut)}
            className={cn(
              'p-4 rounded-2xl border-2 transition-all duration-200 cursor-pointer select-none',
              setorRequerAut
                ? 'bg-amber-50/90 border-amber-400 shadow-xs shadow-amber-200/50 dark:bg-amber-950/40 dark:border-amber-500/60'
                : 'bg-[#f8fbff] border-emerald-300/80 hover:border-emerald-400 dark:bg-slate-900/60 dark:border-slate-800'
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center transition-colors',
                    setorRequerAut
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                  )}
                >
                  {setorRequerAut ? (
                    <ShieldAlert className="w-5 h-5" />
                  ) : (
                    <ShieldCheck className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-xs text-[#0d1f45] dark:text-slate-100">
                      Regra de Acesso: Requer Autorização
                    </span>
                    <span
                      className={cn(
                        'text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border',
                        setorRequerAut
                          ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-700'
                          : 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-700'
                      )}
                    >
                      {setorRequerAut ? 'Exigência Ativa' : 'Livre Acesso'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#52647d] dark:text-slate-400 mt-0.5">
                    {setorRequerAut
                      ? 'Visitantes precisarão de liberação prévia do setor para registrar a entrada na portaria.'
                      : 'Entrada liberada diretamente sem necessidade de triagem formal ou autorização.'}
                  </p>
                </div>
              </div>

              {/* iOS Switch customizado */}
              <div
                className={cn(
                  'w-12 h-6.5 rounded-full p-1 transition-colors duration-200 ease-in-out shrink-0 flex items-center',
                  setorRequerAut ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'
                )}
              >
                <div
                  className={cn(
                    'bg-white w-4.5 h-4.5 rounded-full shadow-md transform transition-transform duration-200 ease-in-out',
                    setorRequerAut ? 'translate-x-5.5' : 'translate-x-0'
                  )}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#dce4f0] dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsSetorModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary">{editingSetor ? 'Salvar alterações' : 'Salvar Setor'}</Button>
          </div>
        </form>
      </Modal>

      {/* Toast flutuante de Notificação com Micro-animação */}
      {toastNotificacao && (
        <div
          className={cn(
            'fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border animate-in slide-in-from-bottom-5 duration-300',
            toastNotificacao.tipo === 'sucesso'
              ? 'bg-slate-900 text-white border-slate-800 dark:bg-white dark:text-slate-900'
              : 'bg-rose-900 text-white border-rose-800'
          )}
        >
          <div
            className={cn(
              'w-8 h-8 rounded-xl flex items-center justify-center shrink-0',
              toastNotificacao.tipo === 'sucesso' ? 'bg-[#005a9c] text-white' : 'bg-rose-600 text-white'
            )}
          >
            <ShieldAlert className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold">{toastNotificacao.texto}</span>
          <button
            type="button"
            onClick={() => setToastNotificacao(null)}
            className="text-xs opacity-70 hover:opacity-100 ml-2 font-black"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

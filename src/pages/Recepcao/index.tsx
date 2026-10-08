import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  UserCheck,
  Users,
  Briefcase,
  Search,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  Clock,
  Building,
  ShieldAlert,
  LogOut,
  UserPlus,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import {
  dataService,
  formatCpf,
  sanitizeNumbers,
} from '@/services/dataService';
import {
  Servidor,
  Visitante,
  Departamento,
  Setor,
  Movimentacao,
  ConsultaServidorResultado,
  ConsultaVisitanteResultado,
} from '@/types';
import { formatDateTime, formatTime } from '@/lib/utils';

export const RecepcaoPage: React.FC = () => {
  const { user } = useAuth();

  // Estados de consulta rápida
  const [activeTab, setActiveTab] = useState<'servidor' | 'visitante'>('servidor');
  const [matriculaInput, setMatriculaInput] = useState('');
  const [cpfInput, setCpfInput] = useState('');
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [searchFeedback, setSearchFeedback] = useState<{
    type: 'success' | 'error' | 'warning' | null;
    message: string;
  }>({ type: null, message: '' });

  // Resultados de consulta
  const [servidorResultado, setServidorResultado] = useState<ConsultaServidorResultado | null>(null);
  const [visitanteResultado, setVisitanteResultado] = useState<ConsultaVisitanteResultado | null>(null);

  // Departamentos e setores para destino
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [todosServidores, setTodosServidores] = useState<Servidor[]>([]);

  // Pessoas no prédio em tempo real
  const [pessoasNoPredio, setPessoasNoPredio] = useState<Movimentacao[]>([]);
  const [isLoadingPredio, setIsLoadingPredio] = useState(false);

  // Modais
  const [isEntradaModalOpen, setIsEntradaModalOpen] = useState(false);
  const [isNovoVisitanteModalOpen, setIsNovoVisitanteModalOpen] = useState(false);
  const [isSaidaModalOpen, setIsSaidaModalOpen] = useState(false);
  const [movimentacaoParaSaida, setMovimentacaoParaSaida] = useState<Movimentacao | null>(null);

  // Formulário de Registro de Entrada
  const [formDestinoDepId, setFormDestinoDepId] = useState('');
  const [formDestinoSetorId, setFormDestinoSetorId] = useState('');
  const [formServidorDestinoId, setFormServidorDestinoId] = useState('');
  const [formCracha, setFormCracha] = useState('');
  const [formMotivo, setFormMotivo] = useState('Atendimento institucional');
  const [formObservacoes, setFormObservacoes] = useState('');
  const [isSubmittingEntrada, setIsSubmittingEntrada] = useState(false);

  // Formulário de Cadastro de Visitante
  const [novoVisNome, setNovoVisNome] = useState('');
  const [novoVisCpf, setNovoVisCpf] = useState('');
  const [novoVisRg, setNovoVisRg] = useState('');
  const [novoVisTelefone, setNovoVisTelefone] = useState('');
  const [novoVisEmpresa, setNovoVisEmpresa] = useState('');
  const [novoVisObservacoes, setNovoVisObservacoes] = useState('');
  const [isSubmittingVisitante, setIsSubmittingVisitante] = useState(false);

  // Observações ao registrar saída
  const [saidaObs, setSaidaObs] = useState('');
  const [isSubmittingSaida, setIsSubmittingSaida] = useState(false);

  // Carregar dados de estrutura e pessoas no prédio
  const carregarDadosIniciais = async () => {
    setIsLoadingPredio(true);
    try {
      const [deps, sets, servs, movs] = await Promise.all([
        dataService.getDepartamentos(),
        dataService.getSetores(),
        dataService.getServidores(),
        dataService.getMovimentacoes(),
      ]);
      setDepartamentos(deps);
      setSetores(sets);
      setTodosServidores(servs);
      setPessoasNoPredio(movs.filter((m) => m.status === 'no_predio' || m.status === 'pendente_autorizacao'));

      if (deps.length > 0 && !formDestinoDepId) {
        setFormDestinoDepId(deps[0].id);
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setIsLoadingPredio(false);
    }
  };

  useEffect(() => {
    carregarDadosIniciais();
  }, []);

  // Setores filtrados pelo departamento selecionado
  const setoresFiltrados = setores.filter((s) => s.departamento_id === formDestinoDepId);

  useEffect(() => {
    if (setoresFiltrados.length > 0) {
      setFormDestinoSetorId(setoresFiltrados[0].id);
    } else {
      setFormDestinoSetorId('');
    }
  }, [formDestinoDepId]);

  // Consulta de Servidor por Matrícula
  const handleConsultarMatricula = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!matriculaInput.trim()) return;

    setIsLoadingSearch(true);
    setSearchFeedback({ type: null, message: '' });
    setServidorResultado(null);

    try {
      const res = await dataService.consultarServidorPorMatricula(matriculaInput, user);
      setServidorResultado(res);

      if (!res.encontrado) {
        setSearchFeedback({
          type: 'error',
          message: `Nenhum servidor encontrado com a matrícula "${matriculaInput.toUpperCase()}".`,
        });
      } else if (res.no_predio) {
        setSearchFeedback({
          type: 'warning',
          message: `Atenção: O servidor ${res.servidor?.nome} já está registrado como PRESENTE no prédio.`,
        });
      } else {
        setSearchFeedback({
          type: 'success',
          message: `Servidor localizado: ${res.servidor?.nome} (${res.servidor?.cargo}).`,
        });
      }
    } catch (err: any) {
      setSearchFeedback({ type: 'error', message: err.message });
    } finally {
      setIsLoadingSearch(false);
    }
  };

  // Consulta de Visitante por CPF
  const handleConsultarCpf = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const raw = sanitizeNumbers(cpfInput);
    if (!raw) return;

    setIsLoadingSearch(true);
    setSearchFeedback({ type: null, message: '' });
    setVisitanteResultado(null);

    try {
      const res = await dataService.consultarVisitantePorCpf(cpfInput, user);
      setVisitanteResultado(res);

      if (!res.encontrado) {
        setSearchFeedback({
          type: 'warning',
          message: `CPF não localizado. Clique no botão abaixo para realizar o cadastro rápido.`,
        });
        setNovoVisCpf(formatCpf(cpfInput));
      } else if (res.no_predio) {
        setSearchFeedback({
          type: 'warning',
          message: `Atenção: O visitante ${res.visitante?.nome} já está com entrada em andamento no prédio.`,
        });
      } else {
        setSearchFeedback({
          type: 'success',
          message: `Visitante cadastrado: ${res.visitante?.nome}.`,
        });
      }
    } catch (err: any) {
      setSearchFeedback({ type: 'error', message: err.message });
    } finally {
      setIsLoadingSearch(false);
    }
  };

  // Abrir modal de entrada para Servidor ou Visitante
  const handleIniciarEntrada = () => {
    setFormCracha(`CR-${Math.floor(10 + Math.random() * 90)}`);
    setFormMotivo('Atendimento institucional');
    setFormObservacoes('');
    setIsEntradaModalOpen(true);
  };

  // Confirmar Entrada Atômica
  const handleConfirmarEntrada = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingEntrada(true);

    try {
      const setorEscolhido = setores.find((s) => s.id === formDestinoSetorId);
      const requerAutorizacao = setorEscolhido?.requer_autorizacao || false;

      const pessoaId =
        activeTab === 'servidor'
          ? servidorResultado?.servidor?.id
          : visitanteResultado?.visitante?.id;

      if (!pessoaId) throw new Error('Identificação da pessoa é obrigatória.');

      await dataService.registrarEntrada(
        {
          tipo_pessoa: activeTab,
          pessoa_id: pessoaId,
          departamento_destino_id: formDestinoDepId,
          setor_destino_id: formDestinoSetorId,
          servidor_destino_id: formServidorDestinoId || undefined,
          cracha_numero: formCracha,
          motivo: formMotivo,
          requer_autorizacao: requerAutorizacao,
          observacoes: formObservacoes,
        },
        user
      );

      setIsEntradaModalOpen(false);
      setSearchFeedback({
        type: 'success',
        message: requerAutorizacao
          ? 'Entrada registrada com solicitação de autorização enviada ao setor.'
          : 'Entrada registrada com sucesso! Crachá atribuído.',
      });

      // Resetar resultados e atualizar lista
      setServidorResultado(null);
      setVisitanteResultado(null);
      setMatriculaInput('');
      setCpfInput('');
      await carregarDadosIniciais();
    } catch (err: any) {
      alert(`Falha no registro: ${err.message}`);
    } finally {
      setIsSubmittingEntrada(false);
    }
  };

  // Cadastrar Novo Visitante
  const handleCadastrarVisitante = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingVisitante(true);
    try {
      const novo = await dataService.cadastrarOuAtualizarVisitante(
        {
          nome: novoVisNome,
          cpf: novoVisCpf,
          rg: novoVisRg,
          telefone: novoVisTelefone,
          empresa_orgao: novoVisEmpresa,
          observacoes: novoVisObservacoes,
        },
        user
      );

      setIsNovoVisitanteModalOpen(false);
      setVisitanteResultado({
        encontrado: true,
        visitante: novo,
        no_predio: false,
      });
      setSearchFeedback({
        type: 'success',
        message: `Visitante "${novo.nome}" cadastrado com sucesso! Prossiga com o registro de entrada.`,
      });
      // Limpar formulário de visitante
      setNovoVisNome('');
      setNovoVisRg('');
      setNovoVisTelefone('');
      setNovoVisEmpresa('');
      setNovoVisObservacoes('');
    } catch (err: any) {
      alert(`Falha ao cadastrar: ${err.message}`);
    } finally {
      setIsSubmittingVisitante(false);
    }
  };

  // Registrar Saída Atômica
  const handleConfirmarSaida = async () => {
    if (!movimentacaoParaSaida) return;
    setIsSubmittingSaida(true);
    try {
      await dataService.registrarSaida(movimentacaoParaSaida.id, user, saidaObs);
      setIsSaidaModalOpen(false);
      setMovimentacaoParaSaida(null);
      setSaidaObs('');
      setSearchFeedback({
        type: 'success',
        message: 'Saída registrada com sucesso! Crachá liberado para o inventário.',
      });
      if (servidorResultado) handleConsultarMatricula();
      if (visitanteResultado) handleConsultarCpf();
      await carregarDadosIniciais();
    } catch (err: any) {
      alert(`Erro ao registrar saída: ${err.message}`);
    } finally {
      setIsSubmittingSaida(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Cabeçalho de Recepção e Indicadores Rápidos */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-500/30">
              <UserCheck className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-100">Balcão da Recepção Central</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Controle de fluxo presencial da Secretaria Municipal de Educação
          </p>
        </div>

        {/* Indicadores de fluxo imediato */}
        <div className="flex items-center gap-3">
          <div className="bg-[#121826] border border-slate-800 rounded-xl px-4 py-2 flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <div className="text-[11px] text-slate-400">Presentes no prédio</div>
              <div className="text-sm font-bold text-slate-100">{pessoasNoPredio.length} pessoas</div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={carregarDadosIniciais}
            isLoading={isLoadingPredio}
            title="Atualizar dados em tempo real"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* 2. Seleção do Fluxo Principal (Servidor x Visitante) conforme Screenshot 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card Servidor */}
        <div
          onClick={() => {
            setActiveTab('servidor');
            setSearchFeedback({ type: null, message: '' });
          }}
          className={`cursor-pointer rounded-2xl p-6 border transition-all text-center space-y-3 ${
            activeTab === 'servidor'
              ? 'bg-[#131b2e] border-emerald-500 shadow-xl shadow-emerald-950/20 ring-1 ring-emerald-500/50'
              : 'bg-[#101625] border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="w-12 h-12 mx-auto rounded-xl bg-blue-950/60 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100 uppercase tracking-wider">Servidor</h3>
            <p className="text-xs text-slate-400 mt-0.5">Identificar por matrícula</p>
          </div>
          <div className="text-xs text-emerald-400 font-semibold pt-1">
            {activeTab === 'servidor' ? '● Modo Ativo' : 'Selecionar'}
          </div>
        </div>

        {/* Card Visitante */}
        <div
          onClick={() => {
            setActiveTab('visitante');
            setSearchFeedback({ type: null, message: '' });
          }}
          className={`cursor-pointer rounded-2xl p-6 border transition-all text-center space-y-3 ${
            activeTab === 'visitante'
              ? 'bg-[#131b2e] border-emerald-500 shadow-xl shadow-emerald-950/20 ring-1 ring-emerald-500/50'
              : 'bg-[#101625] border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="w-12 h-12 mx-auto rounded-xl bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100 uppercase tracking-wider">Visitante</h3>
            <p className="text-xs text-slate-400 mt-0.5">Identificar por CPF</p>
          </div>
          <div className="text-xs text-emerald-400 font-semibold pt-1">
            {activeTab === 'visitante' ? '● Modo Ativo' : 'Selecionar'}
          </div>
        </div>
      </div>

      {/* 3. Área de Consulta e Identificação */}
      <Card className="border-slate-800">
        <CardHeader>
          <div>
            <CardTitle>
              {activeTab === 'servidor' ? 'Consulta de Servidor' : 'Consulta de Visitante'}
            </CardTitle>
            <CardDescription>
              {activeTab === 'servidor'
                ? 'Informe o número da matrícula institucional para verificar registro e lotação'
                : 'Informe o CPF do visitante para consulta auditada e controle de histórico'}
            </CardDescription>
          </div>
        </CardHeader>

        {/* Barra de Busca */}
        <div className="space-y-4">
          {activeTab === 'servidor' ? (
            <form onSubmit={handleConsultarMatricula} className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Input
                  placeholder="Ex: SME-100201 ou SME-200781"
                  value={matriculaInput}
                  onChange={(e) => setMatriculaInput(e.target.value)}
                  icon={<Search className="w-4 h-4" />}
                  autoFocus
                />
              </div>
              <Button type="submit" variant="primary" isLoading={isLoadingSearch}>
                <Search className="w-4 h-4" />
                <span>Consultar Matrícula</span>
              </Button>
            </form>
          ) : (
            <form onSubmit={handleConsultarCpf} className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Input
                  placeholder="000.000.000-00"
                  value={cpfInput}
                  onChange={(e) => setCpfInput(formatCpf(e.target.value))}
                  icon={<Search className="w-4 h-4" />}
                  maxLength={14}
                  autoFocus
                />
              </div>
              <Button type="submit" variant="primary" isLoading={isLoadingSearch}>
                <Search className="w-4 h-4" />
                <span>Consultar CPF</span>
              </Button>
            </form>
          )}

          {/* Feedback de mensagem */}
          {searchFeedback.message && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center justify-between border ${
                searchFeedback.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                  : searchFeedback.type === 'warning'
                  ? 'bg-amber-950/40 border-amber-500/30 text-amber-300'
                  : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
              }`}
            >
              <div className="flex items-center gap-2">
                {searchFeedback.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                {searchFeedback.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                {searchFeedback.type === 'error' && <ShieldAlert className="w-4 h-4 text-rose-400" />}
                <span>{searchFeedback.message}</span>
              </div>

              {activeTab === 'visitante' &&
                !visitanteResultado?.encontrado &&
                searchFeedback.type === 'warning' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setNovoVisCpf(formatCpf(cpfInput));
                      setIsNovoVisitanteModalOpen(true);
                    }}
                    className="border-amber-500/40 text-amber-300 hover:bg-amber-900/40 shrink-0 ml-2"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Cadastrar Visitante Agora</span>
                  </Button>
                )}
            </div>
          )}

          {/* Resultado: Card de Servidor Encontrado */}
          {servidorResultado?.encontrado && servidorResultado.servidor && (
            <div className="mt-4 p-5 rounded-xl bg-[#0e1422] border border-slate-700/80 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-900/40 border border-blue-500/30 flex items-center justify-center font-bold text-blue-400 text-lg">
                    {servidorResultado.servidor.nome.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-100">
                      {servidorResultado.servidor.nome}
                    </h4>
                    <p className="text-xs text-slate-400">
                      Matrícula:{' '}
                      <span className="font-mono text-emerald-400 font-semibold">
                        {servidorResultado.servidor.matricula}
                      </span>{' '}
                      • CPF: {servidorResultado.servidor.cpf}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={servidorResultado.no_predio ? 'warning' : 'success'}>
                    {servidorResultado.no_predio ? '● Presente no Prédio' : '● Fora do Prédio'}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-[#141b2d] p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Cargo:</span>
                  <span className="font-semibold text-slate-200">{servidorResultado.servidor.cargo}</span>
                </div>
                <div className="bg-[#141b2d] p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Lotação / Departamento:</span>
                  <span className="font-semibold text-slate-200">
                    {servidorResultado.servidor.departamento?.sigla || 'SME'} -{' '}
                    {servidorResultado.servidor.setor?.sigla || 'Geral'}
                  </span>
                </div>
                <div className="bg-[#141b2d] p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Contato:</span>
                  <span className="font-semibold text-slate-200">
                    {servidorResultado.servidor.telefone || servidorResultado.servidor.email || 'Não informado'}
                  </span>
                </div>
              </div>

              {/* Ações operacionais do Servidor */}
              <div className="flex items-center justify-end gap-3 pt-2">
                {servidorResultado.no_predio && servidorResultado.movimentacao_atual ? (
                  <Button
                    variant="danger"
                    onClick={() => {
                      setMovimentacaoParaSaida(servidorResultado.movimentacao_atual!);
                      setIsSaidaModalOpen(true);
                    }}
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Registrar Saída do Servidor</span>
                  </Button>
                ) : (
                  <Button variant="primary" onClick={handleIniciarEntrada}>
                    <span>Iniciar Registro de Entrada</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Resultado: Card de Visitante Encontrado */}
          {visitanteResultado?.encontrado && visitanteResultado.visitante && (
            <div className="mt-4 p-5 rounded-xl bg-[#0e1422] border border-slate-700/80 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-900/40 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400 text-lg">
                    {visitanteResultado.visitante.nome.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-100">
                      {visitanteResultado.visitante.nome}
                    </h4>
                    <p className="text-xs text-slate-400">
                      CPF: <span className="font-mono text-emerald-400 font-semibold">{visitanteResultado.visitante.cpf}</span>
                      {visitanteResultado.visitante.rg && ` • RG: ${visitanteResultado.visitante.rg}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={visitanteResultado.no_predio ? 'warning' : 'success'}>
                    {visitanteResultado.no_predio ? '● Entrada em Andamento' : '● Apto para Entrada'}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-[#141b2d] p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Empresa / Vínculo:</span>
                  <span className="font-semibold text-slate-200">
                    {visitanteResultado.visitante.empresa_orgao || 'Cidadão / Particular'}
                  </span>
                </div>
                <div className="bg-[#141b2d] p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Telefone:</span>
                  <span className="font-semibold text-slate-200">
                    {visitanteResultado.visitante.telefone || 'Não cadastrado'}
                  </span>
                </div>
                <div className="bg-[#141b2d] p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Observação permanente:</span>
                  <span className="font-semibold text-slate-200 truncate block">
                    {visitanteResultado.visitante.observacoes || 'Nenhuma ressalva'}
                  </span>
                </div>
              </div>

              {/* Histórico recente de visitas */}
              {visitanteResultado.historico_recente && visitanteResultado.historico_recente.length > 0 && (
                <div className="p-3 bg-[#111726] rounded-lg border border-slate-800/80 text-xs">
                  <span className="text-slate-400 font-medium block mb-1">Últimas visitas na SME:</span>
                  <div className="space-y-1">
                    {visitanteResultado.historico_recente.slice(0, 3).map((h) => (
                      <div key={h.id} className="flex items-center justify-between text-slate-300">
                        <span>
                          {formatDateTime(h.data_hora_entrada)} → {h.departamento}/{h.setor} ({h.motivo})
                        </span>
                        <span className="text-slate-400">{h.data_hora_saida ? 'Saída registrada' : 'Em andamento'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ações operacionais do Visitante */}
              <div className="flex items-center justify-end gap-3 pt-2">
                {visitanteResultado.no_predio && visitanteResultado.movimentacao_atual ? (
                  <Button
                    variant="danger"
                    onClick={() => {
                      setMovimentacaoParaSaida(visitanteResultado.movimentacao_atual!);
                      setIsSaidaModalOpen(true);
                    }}
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Registrar Saída do Visitante</span>
                  </Button>
                ) : (
                  <Button variant="primary" onClick={handleIniciarEntrada}>
                    <span>Iniciar Registro de Entrada</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* 4. Rastreabilidade e Fluxo no Prédio (Quem está no prédio agora) */}
      <Card className="border-slate-800">
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <div>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <span>Presentes no Prédio em Tempo Real</span>
                  <Badge variant="success">{pessoasNoPredio.length} ativos</Badge>
                </div>
              </CardTitle>
              <CardDescription>
                Listagem ao vivo de servidores e visitantes com entrada autorizada e crachá ativo
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={carregarDadosIniciais}>
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Atualizar</span>
            </Button>
          </div>
        </CardHeader>

        {pessoasNoPredio.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-sm">
            Nenhuma pessoa registrada com movimentação aberta no momento.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#151c2d] text-slate-400 border-b border-slate-800 uppercase font-mono text-[10px]">
                <tr>
                  <th className="py-3 px-4">Pessoa / Tipo</th>
                  <th className="py-3 px-4">Crachá</th>
                  <th className="py-3 px-4">Destino / Setor</th>
                  <th className="py-3 px-4">Motivo</th>
                  <th className="py-3 px-4">Horário Entrada</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {pessoasNoPredio.map((m) => {
                  const nome = m.servidor?.nome || m.visitante?.nome || 'Não identificado';
                  const doc = m.servidor?.matricula || m.visitante?.cpf || '-';
                  const dep = m.departamento_destino?.sigla || 'SME';
                  const setor = m.setor_destino?.sigla || 'Geral';

                  return (
                    <tr key={m.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-100">{nome}</div>
                        <div className="text-slate-400 text-[11px] flex items-center gap-1">
                          <span className="capitalize">{m.tipo_pessoa}</span> • {doc}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-emerald-400 border border-emerald-500/20 font-bold">
                          {m.cracha_numero || 'S/C'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-200 font-medium">{dep} - {setor}</div>
                        {m.servidor_destino && (
                          <div className="text-[11px] text-slate-400">
                            Aos cuidados de: {m.servidor_destino.nome}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-300 max-w-xs truncate">
                        {m.motivo}
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-mono">
                        {formatTime(m.data_hora_entrada)}
                      </td>
                      <td className="py-3 px-4">
                        {m.status === 'pendente_autorizacao' ? (
                          <Badge variant="warning">Aguardando Autorização</Badge>
                        ) : (
                          <Badge variant="success">No Prédio</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* MODAL 1: Registro Atômico de Entrada */}
      <Modal
        isOpen={isEntradaModalOpen}
        onClose={() => setIsEntradaModalOpen(false)}
        title="Registro de Entrada e Acesso"
        description="Defina o destino institucional, crachá e valide requisitos de autorização"
      >
        <form onSubmit={handleConfirmarEntrada} className="space-y-4">
          <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 text-xs">
            <span className="text-slate-400">Identificação:</span>
            <div className="text-slate-100 font-bold text-sm mt-0.5">
              {activeTab === 'servidor'
                ? servidorResultado?.servidor?.nome
                : visitanteResultado?.visitante?.nome}
            </div>
            <div className="text-emerald-400 font-mono text-[11px]">
              {activeTab === 'servidor'
                ? `Matrícula: ${servidorResultado?.servidor?.matricula}`
                : `CPF: ${visitanteResultado?.visitante?.cpf}`}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Departamento de Destino"
              value={formDestinoDepId}
              onChange={(e) => setFormDestinoDepId(e.target.value)}
              options={departamentos.map((d) => ({
                value: d.id,
                label: `${d.sigla} - ${d.nome}`,
              }))}
              required
            />

            <Select
              label="Setor Específico"
              value={formDestinoSetorId}
              onChange={(e) => setFormDestinoSetorId(e.target.value)}
              options={setoresFiltrados.map((s) => ({
                value: s.id,
                label: `${s.sigla} - ${s.nome}${s.requer_autorizacao ? ' (Requer Autorização)' : ''}`,
              }))}
              required
            />
          </div>

          {/* Servidor anfitrião / destino */}
          <Select
            label="Servidor / Responsável a ser procurado (Opcional)"
            value={formServidorDestinoId}
            onChange={(e) => setFormServidorDestinoId(e.target.value)}
            options={[
              { value: '', label: 'Nenhum servidor específico (Atendimento no balcão do setor)' },
              ...todosServidores.map((s) => ({
                value: s.id,
                label: `${s.nome} (${s.cargo})`,
              })),
            ]}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Número do Crachá / Tag de Identificação"
              value={formCracha}
              onChange={(e) => setFormCracha(e.target.value)}
              placeholder="Ex: CR-015"
              required
            />

            <Input
              label="Motivo do Acesso"
              value={formMotivo}
              onChange={(e) => setFormMotivo(e.target.value)}
              placeholder="Ex: Reunião pedagógica, entrega de documento..."
              required
            />
          </div>

          <Input
            label="Observações / Pertences declarados (Notebook, volumes...)"
            value={formObservacoes}
            onChange={(e) => setFormObservacoes(e.target.value)}
            placeholder="Ex: Portando pasta com documentos e notebook Dell"
          />

          {setores.find((s) => s.id === formDestinoSetorId)?.requer_autorizacao && (
            <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
              <span>
                <strong>Atenção:</strong> Este setor requer autorização formal prévia. A entrada ficará
                como "Pendente de Autorização" até a liberação pelo responsável.
              </span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEntradaModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmittingEntrada}>
              <CheckCircle className="w-4 h-4" />
              <span>Registrar Entrada Atômica</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Cadastro Rápido de Visitante */}
      <Modal
        isOpen={isNovoVisitanteModalOpen}
        onClose={() => setIsNovoVisitanteModalOpen(false)}
        title="Cadastro de Novo Visitante"
        description="Cadastre os dados pessoais do visitante em conformidade com a LGPD"
      >
        <form onSubmit={handleCadastrarVisitante} className="space-y-4">
          <Input
            label="Nome Completo *"
            value={novoVisNome}
            onChange={(e) => setNovoVisNome(e.target.value)}
            placeholder="Ex: Maria das Graças Oliveira"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="CPF *"
              value={novoVisCpf}
              onChange={(e) => setNovoVisCpf(formatCpf(e.target.value))}
              placeholder="000.000.000-00"
              maxLength={14}
              required
            />

            <Input
              label="RG / Documento Oficial"
              value={novoVisRg}
              onChange={(e) => setNovoVisRg(e.target.value)}
              placeholder="Ex: 12.345.678-9 SSP/SP"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Telefone / Celular *"
              value={novoVisTelefone}
              onChange={(e) => setNovoVisTelefone(e.target.value)}
              placeholder="(11) 99999-9999"
              required
            />

            <Input
              label="Empresa / Instituição / Vínculo"
              value={novoVisEmpresa}
              onChange={(e) => setNovoVisEmpresa(e.target.value)}
              placeholder="Ex: Fornecedor, Pai de Aluno, Particular..."
            />
          </div>

          <Input
            label="Observações Adicionais"
            value={novoVisObservacoes}
            onChange={(e) => setNovoVisObservacoes(e.target.value)}
            placeholder="Ex: Necessidade especial de mobilidade, etc."
          />

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsNovoVisitanteModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmittingVisitante}>
              <UserPlus className="w-4 h-4" />
              <span>Salvar e Prosseguir</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: Registro Atômico de Saída */}
      <Modal
        isOpen={isSaidaModalOpen}
        onClose={() => setIsSaidaModalOpen(false)}
        title="Registrar Saída do Prédio"
        description="Confirme o recolhimento do crachá e a liberação da movimentação"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-xs">
            <span className="text-slate-400">Pessoa:</span>
            <div className="font-bold text-slate-100 text-sm">
              {movimentacaoParaSaida?.servidor?.nome ||
                movimentacaoParaSaida?.visitante?.nome ||
                'Pessoa no prédio'}
            </div>
            <div className="text-slate-400 mt-1">
              Crachá:{' '}
              <span className="font-mono text-emerald-400 font-bold">
                {movimentacaoParaSaida?.cracha_numero || 'Sem crachá'}
              </span>
            </div>
            <div className="text-slate-400 text-[11px] mt-0.5">
              Entrada: {formatDateTime(movimentacaoParaSaida?.data_hora_entrada)}
            </div>
          </div>

          <Input
            label="Observações da Saída (Opcional)"
            value={saidaObs}
            onChange={(e) => setSaidaObs(e.target.value)}
            placeholder="Ex: Crachá devolvido em perfeito estado"
          />

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setIsSaidaModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmarSaida}
              isLoading={isSubmittingSaida}
            >
              <LogOut className="w-4 h-4" />
              <span>Confirmar Saída</span>
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

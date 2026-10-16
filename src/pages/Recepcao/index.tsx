import React, { useState, useEffect, useRef } from 'react';
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
  ChevronRight,
  Fingerprint,
  QrCode,
  Barcode,
  Camera,
  FileDown,
  Plus,
  Trash2,
  CircleHelp,
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
  DestinoVisita,
  ConsultaServidorResultado,
  ConsultaVisitanteResultado,
} from '@/types';
import { formatDateTime, formatTime } from '@/lib/utils';
import { biometricProvider, isBiometricAgentConfigured, DeviceStatus, IdentificationMethod } from '@/services/identification';
import { generateInstitutionalPdf } from '@/services/pdfService';
import { ReceptionClock } from '@/components/recepcao/ReceptionClock';
import { BarcodeCameraScanner } from '@/components/recepcao/BarcodeCameraScanner';

export const RecepcaoPage: React.FC = () => {
  const { user } = useAuth();
  // Os dados da pessoa identificada pertencem ao fluxo modal, não ao painel fixo.
  const showInlineIdentificationResult = false;

  // Estados de consulta rápida
  const [activeTab, setActiveTab] = useState<'servidor' | 'visitante'>('servidor');
  const [identificationMethod, setIdentificationMethod] = useState<IdentificationMethod>('matricula');
  const [matriculaInput, setMatriculaInput] = useState('');
  const [cpfInput, setCpfInput] = useState('');
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [searchFeedback, setSearchFeedback] = useState<{
    type: 'success' | 'error' | 'warning' | null;
    message: string;
  }>({ type: null, message: '' });
  const [biometricStatus, setBiometricStatus] = useState<DeviceStatus>('nao_configurado');
  const [biometricFeedback, setBiometricFeedback] = useState('');
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);
  const [qrToken, setQrToken] = useState('');
  const [qrFeedback, setQrFeedback] = useState<{ valid: boolean; message: string } | null>(null);
  const [isQrLoading, setIsQrLoading] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [barcodeFeedback, setBarcodeFeedback] = useState<{ valid: boolean; message: string } | null>(null);
  const [isBarcodeLoading, setIsBarcodeLoading] = useState(false);
  const [isBarcodeReturnModalOpen, setIsBarcodeReturnModalOpen] = useState(false);
  const [returnBarcodeInput, setReturnBarcodeInput] = useState('');
  const [cameraTarget, setCameraTarget] = useState<'entrada' | 'devolucao' | null>(null);
  const [returnBarcodeFeedback, setReturnBarcodeFeedback] = useState<{ valid: boolean; message: string } | null>(null);
  const [isReturningBadge, setIsReturningBadge] = useState(false);
  const returnBarcodeInputRef = useRef<HTMLInputElement>(null);

  // Resultados de consulta
  const [servidorResultado, setServidorResultado] = useState<ConsultaServidorResultado | null>(null);
  const [visitanteResultado, setVisitanteResultado] = useState<ConsultaVisitanteResultado | null>(null);

  // Departamentos e setores para destino
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [todosServidores, setTodosServidores] = useState<Servidor[]>([]);
  const [vinculosServidorSetor, setVinculosServidorSetor] = useState<Array<{ servidor_id: string; setor_id: string }>>([]);

  // Pessoas no prédio em tempo real
  const [pessoasNoPredio, setPessoasNoPredio] = useState<Movimentacao[]>([]);
  const [isLoadingPredio, setIsLoadingPredio] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Modais
  const [isIdentificationModalOpen, setIsIdentificationModalOpen] = useState(false);
  const [isPersonDetailsModalOpen, setIsPersonDetailsModalOpen] = useState(false);
  const [isEntradaModalOpen, setIsEntradaModalOpen] = useState(false);
  const [isNovoVisitanteModalOpen, setIsNovoVisitanteModalOpen] = useState(false);
  const [isNovoServidorModalOpen, setIsNovoServidorModalOpen] = useState(false);
  const [isSaidaModalOpen, setIsSaidaModalOpen] = useState(false);
  const [movimentacaoParaSaida, setMovimentacaoParaSaida] = useState<Movimentacao | null>(null);

  // Formulário de Registro de Entrada
  const [formDestinoDepId, setFormDestinoDepId] = useState('');
  const [formDestinoSetorId, setFormDestinoSetorId] = useState('');
  const [formServidorDestinoId, setFormServidorDestinoId] = useState('');
  const [formServidorDestinoBusca, setFormServidorDestinoBusca] = useState('');
  const [isServidorDestinoBuscaOpen, setIsServidorDestinoBuscaOpen] = useState(false);
  const [formCracha, setFormCracha] = useState('');
  const [formCrachaFeedback, setFormCrachaFeedback] = useState<string | null>(null);
  const [formMotivo, setFormMotivo] = useState('Atendimento institucional');
  const [formObservacoes, setFormObservacoes] = useState('');
  const [isSubmittingEntrada, setIsSubmittingEntrada] = useState(false);
  const [destinosVisita, setDestinosVisita] = useState<DestinoVisita[]>([{ departamento_destino_id: '', setor_destino_id: '' }]);
  const [isShortcutHelpOpen, setIsShortcutHelpOpen] = useState(false);

  // Formulário de Cadastro de Visitante
  const [novoVisNome, setNovoVisNome] = useState('');
  const [novoVisCpf, setNovoVisCpf] = useState('');
  const [novoVisRg, setNovoVisRg] = useState('');
  const [novoVisTelefone, setNovoVisTelefone] = useState('');
  const [novoVisEmpresa, setNovoVisEmpresa] = useState('');
  const [novoVisObservacoes, setNovoVisObservacoes] = useState('');
  const [isSubmittingVisitante, setIsSubmittingVisitante] = useState(false);

  // Cadastro rápido de servidor não localizado
  const [novoServNome, setNovoServNome] = useState('');
  const [novoServCargo, setNovoServCargo] = useState('Servidor visitante');
  const [novoServLotacao, setNovoServLotacao] = useState('');
  const [novoServDepartamentoId, setNovoServDepartamentoId] = useState('');
  const [novoServSetorId, setNovoServSetorId] = useState('');
  const [novoServRamal, setNovoServRamal] = useState('');
  const [isSubmittingServidor, setIsSubmittingServidor] = useState(false);

  // Observações ao registrar saída
  const [saidaObs, setSaidaObs] = useState('');
  const [crachaDevolvido, setCrachaDevolvido] = useState(true);
  const [isSubmittingSaida, setIsSubmittingSaida] = useState(false);

  // Carregar dados de estrutura e pessoas no prédio
  const carregarDadosIniciais = async () => {
    setIsLoadingPredio(true);
    try {
      const resultados = await Promise.allSettled([
        dataService.getDepartamentos(),
        dataService.getSetores(),
        dataService.getServidores(),
        dataService.getMovimentacoes(),
        dataService.getServidorSetorVinculos(),
      ]);

      const [depsResultado, setoresResultado, servidoresResultado, movimentacoesResultado, vinculosResultado] = resultados;
      if (depsResultado.status === 'fulfilled') {
        setDepartamentos(depsResultado.value);
        if (depsResultado.value.length > 0 && !formDestinoDepId) {
          setFormDestinoDepId(depsResultado.value[0].id);
        }
      } else {
        console.error('Erro ao carregar departamentos:', depsResultado.reason);
      }

      if (setoresResultado.status === 'fulfilled') {
        setSetores(setoresResultado.value);
      } else {
        console.error('Erro ao carregar setores:', setoresResultado.reason);
      }

      if (servidoresResultado.status === 'fulfilled') {
        setTodosServidores(servidoresResultado.value);
      } else {
        console.error('Erro ao carregar servidores:', servidoresResultado.reason);
      }

      if (movimentacoesResultado.status === 'fulfilled') {
        setPessoasNoPredio(movimentacoesResultado.value.filter((m) => m.status === 'no_predio' || m.status === 'pendente_autorizacao'));
      } else {
        console.error('Erro ao carregar movimentações:', movimentacoesResultado.reason);
      }
      if (vinculosResultado.status === 'fulfilled') setVinculosServidorSetor(vinculosResultado.value);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setIsLoadingPredio(false);
    }
  };

  const handleGerarPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      await generateInstitutionalPdf({
        title: 'Balcão da Recepção Central',
        subtitle: `Pessoas presentes no prédio: ${pessoasNoPredio.length} · Emitido em ${new Date().toLocaleString('pt-BR')}`,
        columns: ['Pessoa', 'Tipo', 'Documento', 'Crachá', 'Destino', 'Motivo', 'Entrada', 'Status'],
        rows: pessoasNoPredio.map((item) => [
          item.servidor?.nome || item.visitante?.nome || 'Não identificado',
          item.tipo_pessoa,
          item.servidor?.matricula || item.visitante?.cpf || '—',
          item.cracha_numero || 'S/C',
          `${item.departamento_destino?.sigla || 'SMEDU'} - ${item.setor_destino?.nome || 'Geral'}`,
          item.motivo,
          formatDateTime(item.data_hora_entrada),
          item.status === 'pendente_autorizacao' ? 'Pendente' : 'No prédio',
        ]),
        filename: 'balcao-recepcao',
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  useEffect(() => {
    carregarDadosIniciais();
  }, []);

  useEffect(() => {
    if (identificationMethod !== 'biometria') return;
    let active = true;
    biometricProvider.getDeviceStatus().then((status) => {
      if (active) setBiometricStatus(status);
    });
    return () => { active = false; };
  }, [identificationMethod]);

  useEffect(() => {
    if (!isBarcodeReturnModalOpen || returnBarcodeFeedback?.valid) return;
    const focusTimer = window.setTimeout(() => returnBarcodeInputRef.current?.focus(), 0);
    return () => window.clearTimeout(focusTimer);
  }, [isBarcodeReturnModalOpen, returnBarcodeFeedback?.valid]);

  const biometricLabel: Record<DeviceStatus, string> = {
    nao_configurado: 'Leitor não configurado',
    desconectado: 'Leitor desconectado',
    conectado: 'Leitor disponível',
    aguardando_leitura: 'Aguardando leitura',
    processando: 'Processando leitura',
    identificado: 'Pessoa identificada',
    nao_encontrado: 'Digital não localizada',
    falha_comunicacao: 'Agente indisponível',
  };

  const handleBiometricIdentification = async () => {
    setIsBiometricLoading(true);
    setBiometricFeedback('');
    try {
      const result = await biometricProvider.startIdentification();
      setBiometricFeedback(result.message);
      setBiometricStatus(await biometricProvider.getDeviceStatus());
    } finally {
      setIsBiometricLoading(false);
    }
  };

  const handleValidateQr = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsQrLoading(true);
    setQrFeedback(null);
    try {
      const result = await dataService.validarCredencialQr(qrToken);
      setQrFeedback({
        valid: result.valida,
        message: result.valida
          ? 'Credencial válida. Confirme a identificação e o destino antes de registrar a entrada.'
          : result.motivo || 'Credencial QR inválida, expirada ou revogada.',
      });
    } catch (err: any) {
      setQrFeedback({ valid: false, message: err.message || 'Não foi possível validar a credencial.' });
    } finally {
      setIsQrLoading(false);
    }
  };

  // Setores e responsáveis filtrados pelo destino selecionado.
  const setoresFiltrados = setores.filter((s) => s.departamento_id === formDestinoDepId);
  const servidoresDestinoFiltrados = todosServidores.filter((servidor) => {
    const texto = formServidorDestinoBusca.trim().toLocaleLowerCase('pt-BR');
    const pertenceAoDestino = servidor.setor_id === formDestinoSetorId ||
      vinculosServidorSetor.some((vinculo) => vinculo.servidor_id === servidor.id && vinculo.setor_id === formDestinoSetorId);
    return pertenceAoDestino && (!texto || `${servidor.nome} ${servidor.matricula} ${servidor.cargo}`.toLocaleLowerCase('pt-BR').includes(texto));
  });

  useEffect(() => {
    setFormDestinoSetorId('');
  }, [formDestinoDepId]);

  useEffect(() => {
    setFormServidorDestinoId('');
    setFormServidorDestinoBusca('');
    setIsServidorDestinoBuscaOpen(false);
  }, [formDestinoDepId, formDestinoSetorId]);

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
      if (res.encontrado) {
        setIsIdentificationModalOpen(false);
        setIsPersonDetailsModalOpen(true);
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
      if (res.encontrado) {
        setIsIdentificationModalOpen(false);
        setIsPersonDetailsModalOpen(true);
      }
    } catch (err: any) {
      setSearchFeedback({ type: 'error', message: err.message });
    } finally {
      setIsLoadingSearch(false);
    }
  };

  // Abrir modal de entrada para Servidor ou Visitante
  const handleIniciarEntrada = (crachaNumero = '') => {
    void carregarDadosIniciais();
    setFormCracha(crachaNumero);
    setFormCrachaFeedback(null);
    setFormDestinoDepId('');
    setFormDestinoSetorId('');
    setFormServidorDestinoId('');
    setFormServidorDestinoBusca('');
    setFormMotivo('Atendimento institucional');
    setFormObservacoes('');
    setDestinosVisita([{ departamento_destino_id: '', setor_destino_id: '' }]);
    setIsEntradaModalOpen(true);
  };

  const validarCrachaParaEntrada = async (): Promise<boolean> => {
    const numero = formCracha.trim().toUpperCase();
    if (!numero) {
      setFormCrachaFeedback(null);
      return true;
    }
    const cracha = (await dataService.getCrachas()).find((item) => item.numero === numero);
    if (!cracha) {
      setFormCrachaFeedback(`O código ${numero} não está cadastrado no inventário de crachás.`);
      return false;
    }
    if (!cracha.ativo || cracha.situacao !== 'disponivel') {
      setFormCrachaFeedback(`O crachá ${cracha.numero} está ${cracha.situacao.replace('_', ' ')} e não pode ser atribuído.`);
      return false;
    }
    setFormCrachaFeedback(`Crachá ${cracha.numero} disponível para vinculação.`);
    return true;
  };

  const handleBarcodeRead = async (event: React.FormEvent) => {
    event.preventDefault();
    const barcode = barcodeInput.trim().toUpperCase();
    if (!barcode) return;
    setIsBarcodeLoading(true);
    setBarcodeFeedback(null);
    try {
      const cracha = (await dataService.getCrachas()).find((item) => item.numero === barcode && item.ativo);
      if (!cracha) throw new Error('Crachá não localizado ou inativo. Confira o código de barras impresso.');

      if (cracha.situacao === 'disponivel') {
        const pessoaIdentificada = Boolean(servidorResultado?.servidor || visitanteResultado?.visitante);
        setBarcodeFeedback({
          valid: true,
          message: pessoaIdentificada
            ? `Crachá ${cracha.numero} disponível. Abra o registro para atribuí-lo temporariamente.`
            : `Crachá ${cracha.numero} disponível. Identifique a pessoa por matrícula ou CPF para registrar a entrada.`,
        });
        if (pessoaIdentificada) handleIniciarEntrada(cracha.numero);
      } else if (cracha.situacao === 'em_uso') {
        const movimentos = await dataService.getMovimentacoes();
        const movimentoAberto = movimentos.find((item) =>
          item.cracha_numero === cracha.numero && (item.status === 'no_predio' || item.status === 'pendente_autorizacao')
        );
        if (!movimentoAberto) throw new Error('O crachá está em uso, mas não há movimentação aberta associada. Verifique o inventário.');
        await dataService.registrarSaida(
          movimentoAberto.id,
          user,
          `Saída e devolução do crachá ${cracha.numero} registradas por leitura de código de barras.`,
          true
        );
        setBarcodeFeedback({ valid: true, message: `Saída registrada. O crachá ${cracha.numero} foi baixado e está disponível para nova atribuição.` });
        await carregarDadosIniciais();
      } else {
        throw new Error(`O crachá ${cracha.numero} não está disponível (${cracha.situacao.replace('_', ' ')}).`);
      }
      setBarcodeInput('');
    } catch (err: any) {
      setBarcodeFeedback({ valid: false, message: err.message || 'Não foi possível processar o código de barras.' });
    } finally {
      setIsBarcodeLoading(false);
    }
  };

  const handleQuickBarcodeReturn = async (event: React.FormEvent) => {
    event.preventDefault();
    const barcode = returnBarcodeInput.trim().toUpperCase();
    if (!barcode) return;
    setIsReturningBadge(true);
    setReturnBarcodeFeedback(null);
    try {
      const cracha = (await dataService.getCrachas()).find((item) => item.numero === barcode && item.ativo);
      if (!cracha) throw new Error('Crachá não localizado. Confira o código de barras lido.');
      if (cracha.situacao !== 'em_uso') {
        throw new Error(cracha.situacao === 'disponivel'
          ? `O crachá ${cracha.numero} já está disponível no inventário.`
          : `O crachá ${cracha.numero} não pode ser devolvido neste momento (${cracha.situacao.replace('_', ' ')}).`);
      }
      const movimentoAberto = (await dataService.getMovimentacoes()).find((item) =>
        item.cracha_numero === cracha.numero && (item.status === 'no_predio' || item.status === 'pendente_autorizacao')
      );
      if (!movimentoAberto) throw new Error('Não há uma entrada em andamento vinculada a este crachá.');

      await dataService.registrarSaida(
        movimentoAberto.id,
        user,
        `Saída e devolução do crachá ${cracha.numero} registradas por leitura rápida.`,
        true
      );
      setReturnBarcodeInput('');
      setReturnBarcodeFeedback({ valid: true, message: `Saída registrada com sucesso. O crachá ${cracha.numero} já está disponível para nova atribuição.` });
      await carregarDadosIniciais();
    } catch (err: any) {
      setReturnBarcodeFeedback({ valid: false, message: err.message || 'Não foi possível registrar a devolução.' });
    } finally {
      setIsReturningBadge(false);
    }
  };

  const atualizarDestinoVisita = (index: number, alteracoes: Partial<DestinoVisita>) => {
    setDestinosVisita((atuais) => atuais.map((destino, atual) => {
      if (atual !== index) return destino;
      const proximo = { ...destino, ...alteracoes };
      if ('departamento_destino_id' in alteracoes) {
        proximo.setor_destino_id = '';
        proximo.servidor_destino_id = undefined;
      }
      return proximo;
    }));
  };

  const adicionarDestinoVisita = () => {
    if (destinosVisita.length < 10) {
      setDestinosVisita((atuais) => [...atuais, { departamento_destino_id: '', setor_destino_id: '' }]);
    }
  };

  // Confirmar Entrada Atômica
  const handleConfirmarEntrada = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingEntrada(true);

    try {
      if (!(await validarCrachaParaEntrada())) return;
      const destinos = activeTab === 'visitante'
        ? destinosVisita
        : [{ departamento_destino_id: formDestinoDepId, setor_destino_id: formDestinoSetorId, servidor_destino_id: formServidorDestinoId || undefined }];
      if (!destinos.length || destinos.some((destino) => !destino.departamento_destino_id || !destino.setor_destino_id)) {
        throw new Error('Selecione o departamento e o setor de cada destino da visita.');
      }
      const setorEscolhido = setores.find((s) => s.id === destinos[0].setor_destino_id);
      const requerAutorizacao = destinos.some((destino) => setores.find((s) => s.id === destino.setor_destino_id)?.requer_autorizacao);

      const pessoaId =
        activeTab === 'servidor'
          ? servidorResultado?.servidor?.id
          : visitanteResultado?.visitante?.id;

      if (!pessoaId) throw new Error('Identificação da pessoa é obrigatória.');

      await dataService.registrarEntrada(
        {
          tipo_pessoa: activeTab,
          pessoa_id: pessoaId,
          departamento_destino_id: destinos[0].departamento_destino_id,
          setor_destino_id: destinos[0].setor_destino_id,
          servidor_destino_id: destinos[0].servidor_destino_id,
          cracha_numero: formCracha.trim().toUpperCase(),
          motivo: formMotivo,
          requer_autorizacao: requerAutorizacao,
          observacoes: formObservacoes,
          destinos,
        },
        user
      );

      setIsEntradaModalOpen(false);
      setSearchFeedback({
        type: 'success',
        message: requerAutorizacao
          ? 'Entrada registrada com solicitação de autorização enviada ao setor.'
          : `Entrada registrada com sucesso! ${destinos.length > 1 ? `${destinos.length} destinos vinculados.` : 'Crachá atribuído.'}`,
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
      // O cadastro é apenas a primeira etapa: encaminha diretamente para a confirmação da pessoa.
      setIsIdentificationModalOpen(false);
      setIsPersonDetailsModalOpen(true);
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

  const abrirCadastroServidor = () => {
    setNovoServNome('');
    setNovoServCargo('Servidor visitante');
    setNovoServLotacao('');
    setNovoServDepartamentoId(departamentos[0]?.id || '');
    setNovoServSetorId('');
    setNovoServRamal('');
    setIsNovoServidorModalOpen(true);
  };

  const handleCadastrarServidor = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmittingServidor(true);
    try {
      const servidor = await dataService.salvarServidor({
        nome: novoServNome.trim(),
        matricula: matriculaInput.trim().toUpperCase(),
        cargo: novoServCargo.trim(),
        lotacao: novoServLotacao.trim(),
        departamento_id: novoServDepartamentoId,
        setor_id: novoServSetorId || undefined,
        ramal: novoServRamal.trim() || undefined,
        status: 'ativo',
      });
      setServidorResultado({ encontrado: true, servidor, no_predio: false });
      setIsNovoServidorModalOpen(false);
      setIsIdentificationModalOpen(false);
      setIsPersonDetailsModalOpen(true);
      setSearchFeedback({ type: 'success', message: `Servidor ${servidor.nome} cadastrado com sucesso.` });
      await carregarDadosIniciais();
    } catch (err: any) {
      alert(`Falha ao cadastrar servidor: ${err.message}`);
    } finally {
      setIsSubmittingServidor(false);
    }
  };

  // Registrar Saída Atômica
  const handleConfirmarSaida = async () => {
    if (!movimentacaoParaSaida) return;
    setIsSubmittingSaida(true);
    try {
      await dataService.registrarSaida(movimentacaoParaSaida.id, user, saidaObs, crachaDevolvido);
      setIsSaidaModalOpen(false);
      setMovimentacaoParaSaida(null);
      setSaidaObs('');
      setCrachaDevolvido(true);
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

  useEffect(() => {
    const handleKeyboardShortcut = (event: KeyboardEvent) => {
      const element = event.target as HTMLElement | null;
      const isTyping = element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement || element?.isContentEditable;
      if (isTyping || !event.altKey || event.ctrlKey || event.metaKey) return;

      const key = event.code;
      // Alguns navegadores/teclados interceptam Alt+S; Alt+1 é o atalho alternativo equivalente.
      if (key === 'KeyS' || key === 'Digit1' || event.key.toLocaleLowerCase('pt-BR') === 's') {
        event.preventDefault();
        setActiveTab('servidor'); setIdentificationMethod('matricula'); setSearchFeedback({ type: null, message: '' }); setIsIdentificationModalOpen(true);
      } else if (key === 'KeyV') {
        event.preventDefault();
        setActiveTab('visitante'); setIdentificationMethod('cpf'); setSearchFeedback({ type: null, message: '' }); setIsIdentificationModalOpen(true);
      } else if (key === 'KeyD') {
        event.preventDefault();
        setReturnBarcodeInput(''); setReturnBarcodeFeedback(null); setIsBarcodeReturnModalOpen(true);
      } else if (key === 'KeyA') {
        event.preventDefault();
        void carregarDadosIniciais();
      } else if (key === 'KeyP') {
        event.preventDefault();
        void handleGerarPdf();
      } else if (key === 'Slash' && event.shiftKey) {
        event.preventDefault();
        setIsShortcutHelpOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyboardShortcut, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyboardShortcut, { capture: true });
  }, [isGeneratingPdf, isLoadingPredio, pessoasNoPredio]);

  return (
    <div className="space-y-5">
      <div className="hidden md:flex items-center gap-1.5 text-[11px] text-[#7b8ca4] dark:text-slate-500">
        <span>Início</span><ChevronRight className="w-3 h-3" /><span>Recepção</span><ChevronRight className="w-3 h-3" /><span className="text-[#005a9c] dark:text-emerald-400">Balcão da Recepção Central</span>
      </div>
      {/* 1. Cabeçalho de Recepção */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
        <div className="order-2 md:order-1">
          <div className="flex items-center gap-2">
            <span className="p-3 rounded-2xl bg-[#dcfce7] text-[#16a34a] border border-[#ccefd8] shadow-sm dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-500/30">
              <UserCheck className="w-6 h-6" />
            </span>
            <h2 className="text-2xl font-extrabold tracking-tight text-[#102755] dark:text-slate-100">Balcão da Recepção Central</h2>
          </div>
          <p className="text-sm text-[#627289] dark:text-slate-400 mt-1">
            Controle de fluxo presencial da Secretaria Municipal de Educação
          </p>
        </div>

        <div className="order-1 md:order-2"><ReceptionClock /></div>
      </div>

      {/* Indicadores de fluxo imediato */}
      <div className="hidden flex-wrap items-center justify-end gap-3 md:flex">
          <div className="bg-white border border-[#dce4f0] rounded-2xl px-5 py-3 flex items-center gap-4 shadow-[0_12px_24px_-18px_rgba(18,44,82,.35)] dark:bg-[#121826] dark:border-slate-800">
            <div className="p-2.5 rounded-2xl bg-[#edf5fc] text-[#0877c9] dark:bg-blue-950/60 dark:text-blue-400"><Users className="w-5 h-5" /></div>
            <div>
              <div className="text-[11px] text-slate-400">Presentes no prédio</div>
              <div className="text-sm font-extrabold text-[#102755] dark:text-slate-100">{pessoasNoPredio.length} pessoas</div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleGerarPdf} isLoading={isGeneratingPdf} title="Gerar relatório em PDF">
            <FileDown className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Gerar PDF</span>
            <kbd className="hidden xl:inline rounded border border-current/20 px-1 font-mono text-[10px] opacity-70">Alt P</kbd>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={carregarDadosIniciais}
            isLoading={isLoadingPredio}
            title="Atualizar dados em tempo real"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="sr-only">Atualizar</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsShortcutHelpOpen(true)} title="Ver atalhos do teclado (Alt + ?)">
            <CircleHelp className="w-4 h-4" />
            <span className="sr-only">Ver atalhos do teclado</span>
          </Button>
      </div>

      {/* 2. Seleção do fluxo principal: a identificação é o único passo nesta tela. */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Card Servidor */}
        <div
          onClick={() => {
            setActiveTab('servidor');
            setIdentificationMethod('matricula');
            setSearchFeedback({ type: null, message: '' });
            setIsIdentificationModalOpen(true);
          }}
          title="Identificar servidor — atalhos Alt + S ou Alt + 1"
          className={`group relative flex min-h-[156px] min-w-0 cursor-pointer items-center gap-5 overflow-hidden rounded-[20px] border p-5 text-left transition-all duration-200 sm:min-h-[128px] lg:p-6 ${
            identificationMethod === 'matricula'
              ? 'bg-[linear-gradient(135deg,#eff8ff_0%,#fff_66%,#e2f1ff_100%)] border-[#8cc8ff] shadow-[0_18px_32px_-20px_rgba(8,119,201,.65)] dark:bg-[#131b2e] dark:border-emerald-500 dark:shadow-emerald-950/20 dark:ring-1 dark:ring-emerald-500/50'
              : 'bg-white border-[#dce4f0] hover:border-[#72afe5] hover:-translate-y-0.5 hover:shadow-[0_16px_28px_-22px_rgba(8,119,201,.65)] dark:bg-[#101625] dark:border-slate-800 dark:hover:border-slate-700'
          }`}
        >
          <div className="relative z-10 flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-[#c5e0fa] bg-[#dcecff] text-[#1677e8] shadow-sm dark:border-blue-500/30 dark:bg-blue-950/60 dark:text-blue-400">
            <Briefcase className="w-8 h-8" />
          </div>
          <div className="relative z-10 min-w-0 flex-1">
            <h3 className="text-lg font-extrabold text-[#102755] uppercase tracking-wide dark:text-slate-100">Servidor</h3>
            <p className="text-sm font-medium text-[#173b70] dark:text-slate-400 mt-0.5">Identificar por matrícula</p>
            <p className="text-xs text-[#627fa5] dark:text-slate-400 mt-1">Registro de entrada e saída de servidores <kbd className="ml-1 rounded border border-[#b9d9f3] bg-white/70 px-1 font-mono text-[10px] text-[#0877d1]">Alt S / 1</kbd></p>
          </div>
          <div className={`absolute bottom-5 right-5 z-10 shrink-0 ${identificationMethod === 'matricula' ? 'top-5 text-[10px] rounded-full bg-[#dcfce7] px-2.5 py-1 text-emerald-600' : 'grid h-12 w-12 place-items-center rounded-full bg-[#087ef5] text-white shadow-md transition-transform group-hover:translate-x-1'}`}>
            {identificationMethod === 'matricula' ? '● Modo ativo' : <><ArrowRight className="w-5 h-5" aria-label="Selecionar servidor" /><span className="sr-only">Alt S</span></>}
          </div>
        </div>

        {/* Card Visitante */}
        <div
          onClick={() => {
            setActiveTab('visitante');
            setIdentificationMethod('cpf');
            setSearchFeedback({ type: null, message: '' });
            setIsIdentificationModalOpen(true);
          }}
          title="Identificar visitante — atalho Alt + V"
          className={`group relative flex min-h-[156px] min-w-0 cursor-pointer items-center gap-5 overflow-hidden rounded-[20px] border p-5 text-left transition-all duration-200 sm:min-h-[128px] lg:p-6 ${
            identificationMethod === 'cpf'
              ? 'bg-[linear-gradient(135deg,#effdf5_0%,#fff_66%,#dcfce7_100%)] border-[#a7ebc3] shadow-[0_18px_32px_-20px_rgba(22,163,74,.48)] dark:bg-[#131b2e] dark:border-emerald-500 dark:shadow-emerald-950/20 dark:ring-1 dark:ring-emerald-500/50'
              : 'bg-white border-[#dce4f0] hover:border-[#7fd6a5] hover:-translate-y-0.5 hover:shadow-[0_16px_28px_-22px_rgba(22,163,74,.6)] dark:bg-[#101625] dark:border-slate-800 dark:hover:border-slate-700'
          }`}
        >
          <div className="relative z-10 w-20 h-20 shrink-0 rounded-2xl bg-[#e8f8ee] border border-[#ccefd8] flex items-center justify-center text-[#16a34a] shadow-sm dark:bg-emerald-950/60 dark:border-emerald-500/30 dark:text-emerald-400">
            <Users className="w-8 h-8" />
          </div>
          <div className="relative z-10 min-w-0 flex-1">
            <h3 className="text-lg font-extrabold text-[#102755] uppercase tracking-wide dark:text-slate-100">Visitante</h3>
            <p className="text-sm font-medium text-[#173b70] dark:text-slate-400 mt-0.5">Identificar por CPF</p>
            <p className="text-xs text-[#627fa5] dark:text-slate-400 mt-1">Registro de entrada e saída de visitantes <kbd className="ml-1 rounded border border-[#bfe7ce] bg-white/70 px-1 font-mono text-[10px] text-[#16964a]">Alt V</kbd></p>
          </div>
          <div className={`absolute bottom-5 right-5 z-10 shrink-0 ${identificationMethod === 'cpf' ? 'top-5 text-[10px] rounded-full bg-[#dcfce7] px-2.5 py-1 text-emerald-600' : 'grid h-12 w-12 place-items-center rounded-full bg-[#00a65a] text-white shadow-md transition-transform group-hover:translate-x-1'}`}>
            {identificationMethod === 'cpf' ? '● Modo ativo' : <><ArrowRight className="w-5 h-5" aria-label="Selecionar visitante" /><span className="sr-only">Alt V</span></>}
          </div>
        </div>
      </div>

      {/* 3. Pessoa identificada — a consulta ocorre no modal flutuante. */}
      <div className="space-y-4">
          {activeTab === 'servidor' ? (
            <form onSubmit={handleConsultarMatricula} className="hidden">
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
            <form onSubmit={handleConsultarCpf} className="hidden">
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
              className={`hidden p-3 rounded-lg text-xs flex items-center justify-between border ${
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
          {showInlineIdentificationResult && servidorResultado?.encontrado && servidorResultado.servidor && (
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
                    {servidorResultado.servidor.departamento?.sigla || 'SMEDU'} -{' '}
                    {servidorResultado.servidor.setor?.nome || 'Geral'}
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
                  <Button variant="primary" onClick={() => handleIniciarEntrada()}>
                    <span>Iniciar Registro de Entrada</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Resultado: Card de Visitante Encontrado */}
          {showInlineIdentificationResult && visitanteResultado?.encontrado && visitanteResultado.visitante && (
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
                  <span className="text-slate-400 font-medium block mb-1">Últimas visitas na SMEDU:</span>
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
                  <Button variant="primary" onClick={() => handleIniciarEntrada()}>
                    <span>Iniciar Registro de Entrada</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          )}
      </div>

      {/* 4. Rastreabilidade e Fluxo no Prédio (Quem está no prédio agora) */}
      <Card className="rounded-2xl border-[#dce8f5] p-4 sm:p-5 shadow-[0_18px_36px_-26px_rgba(18,44,82,.36)]">
        <CardHeader className="mb-4 flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#edf5ff] text-[#0877d1]"><Users className="w-5 h-5" /></span>
            <div>
              <CardTitle className="text-[15px] font-extrabold text-[#102755]"><span>Presentes no Prédio em Tempo Real</span><Badge variant="success">{pessoasNoPredio.length} ativos</Badge></CardTitle>
              <CardDescription>Listagem ao vivo de servidores e visitantes com entrada autorizada e crachá ativo</CardDescription>
            </div>
          </div>
          <div className="flex w-full items-center justify-end gap-3 sm:w-auto">
            <Button variant="outline" size="sm" onClick={carregarDadosIniciais} title="Atualizar lista — atalho Alt + A"><RefreshCw className="w-3.5 h-3.5" /><span>Atualizar</span><kbd className="hidden xl:inline rounded border border-current/20 px-1 font-mono text-[10px] opacity-70">Alt A</kbd></Button>
            <Button
              variant="danger"
              size="md"
              className="min-h-11 rounded-xl px-4 text-white shadow-[0_10px_20px_-10px_rgba(225,29,72,.65)] hover:shadow-[0_14px_24px_-10px_rgba(225,29,72,.75)]"
              title="Devolução rápida de crachá — atalho Alt + D"
              onClick={() => {
                setReturnBarcodeInput('');
                setReturnBarcodeFeedback(null);
                setIsBarcodeReturnModalOpen(true);
              }}
            >
              <span className="flex w-6 h-6 items-center justify-center rounded-lg bg-white/20"><Barcode className="w-4 h-4" /></span>
              <span className="flex flex-col items-start leading-tight"><strong>Devolução rápida</strong><small className="text-[10px] font-medium opacity-80">Ler crachá e registrar saída · Alt D</small></span>
            </Button>
          </div>
        </CardHeader>

        {pessoasNoPredio.length === 0 ? (
          <div className="min-h-[208px] rounded-xl border border-dashed border-[#d7e6f5] bg-[linear-gradient(180deg,#fff_0%,#f8fbff_100%)] px-6 py-8 text-center">
            <span className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-[#e8f3ff] text-[#5f9df2] shadow-inner"><Briefcase className="w-8 h-8" /></span>
            <p className="text-sm font-semibold text-[#5f7599]">Nenhuma pessoa registrada com movimentação aberta no momento.</p>
            <p className="mt-1 text-xs text-[#8aa0bd]">Assim que houver registros de entrada, eles serão exibidos aqui em tempo real.</p>
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
                  const dep = m.departamento_destino?.sigla || 'SMEDU';
                  const setor = m.setor_destino?.nome || 'Geral';

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

      <BarcodeCameraScanner
        isOpen={cameraTarget !== null}
        onClose={() => setCameraTarget(null)}
        onDetected={(value) => {
          if (cameraTarget === 'entrada') {
            setFormCracha(value);
            setFormCrachaFeedback(null);
          } else if (cameraTarget === 'devolucao') {
            setReturnBarcodeInput(value);
            setReturnBarcodeFeedback(null);
          }
          setCameraTarget(null);
        }}
      />
      <Modal
        isOpen={isBarcodeReturnModalOpen}
        onClose={() => { if (!cameraTarget && !isReturningBadge) setIsBarcodeReturnModalOpen(false); }}
        title="Devolução rápida de crachá"
        description="Leia ou digite o código e confirme a devolução antes de registrar a saída."
        maxWidth="md"
      >
        <form onSubmit={handleQuickBarcodeReturn} className="space-y-4">
          <div className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] p-3 flex items-start gap-3 dark:border-emerald-500/30 dark:bg-emerald-950/30">
            <span className="p-2 rounded-lg bg-white text-[#16a34a] dark:bg-emerald-900/50"><Barcode className="w-5 h-5" /></span>
            <div className="text-xs text-[#166534] dark:text-emerald-200"><strong>Confirmação obrigatória.</strong> A leitura apenas preenche o código. A saída e a liberação do crachá acontecem somente após selecionar Registrar devolução.</div>
          </div>
          {!returnBarcodeFeedback?.valid && (
            <Input
              ref={returnBarcodeInputRef}
              label="Código de barras do crachá devolvido"
              value={returnBarcodeInput}
              onChange={(event) => setReturnBarcodeInput(event.target.value)}
              placeholder="Aproxime o leitor ou digite o código"
              icon={<Barcode className="w-4 h-4" />}
              autoFocus
            />
          )}
          {!returnBarcodeFeedback?.valid && <Button type="button" variant="outline" className="min-h-11" onClick={() => setCameraTarget('devolucao')} disabled={isReturningBadge}><Camera className="w-4 h-4" /> Ler com câmera do celular</Button>}
          {returnBarcodeFeedback && (
            <div className={`rounded-xl border-2 p-4 text-sm font-semibold ${returnBarcodeFeedback.valid ? 'border-[#86efac] bg-[#f0fdf4] text-[#166534] dark:border-emerald-500/40 dark:bg-emerald-950/30 dark:text-emerald-200' : 'animate-pulse border-[#f87171] bg-[#fef2f2] text-[#b91c1c] shadow-[0_0_0_3px_rgba(248,113,113,.12)] dark:border-rose-500/50 dark:bg-rose-950/30 dark:text-rose-200'}`}>
              {returnBarcodeFeedback.message}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={() => setIsBarcodeReturnModalOpen(false)}>
              {returnBarcodeFeedback?.valid ? 'Concluir' : 'Fechar'}
            </Button>
            {!returnBarcodeFeedback?.valid && (
              <Button type="submit" variant="danger" isLoading={isReturningBadge}><Barcode className="w-4 h-4" /> Registrar devolução</Button>
            )}
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isIdentificationModalOpen}
        onClose={() => setIsIdentificationModalOpen(false)}
        title={activeTab === 'servidor' ? 'Identificar servidor' : 'Identificar visitante'}
        description={activeTab === 'servidor'
          ? 'Informe a matrícula institucional para iniciar o atendimento.'
          : 'Informe o CPF do visitante para consultar o cadastro.'}
        maxWidth="md"
      >
        {activeTab === 'servidor' ? (
          <form onSubmit={handleConsultarMatricula} className="space-y-4">
            <Input
              label="Matrícula"
              placeholder="Ex.: SME-100201 ou SME-200781"
              value={matriculaInput}
              onChange={(event) => setMatriculaInput(event.target.value)}
              icon={<Search className="w-4 h-4" />}
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setIsIdentificationModalOpen(false)}>Cancelar</Button>
              <Button type="submit" variant="primary" isLoading={isLoadingSearch}><Search className="w-4 h-4" /> Consultar matrícula</Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleConsultarCpf} className="space-y-4">
            <Input
              label="CPF"
              placeholder="000.000.000-00"
              value={cpfInput}
              onChange={(event) => setCpfInput(formatCpf(event.target.value))}
              icon={<Search className="w-4 h-4" />}
              maxLength={14}
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setIsIdentificationModalOpen(false)}>Cancelar</Button>
              <Button type="submit" variant="primary" isLoading={isLoadingSearch}><Search className="w-4 h-4" /> Consultar CPF</Button>
            </div>
          </form>
        )}

        {searchFeedback.message && (
          <div className={`mt-4 p-3 rounded-lg text-xs border ${
            searchFeedback.type === 'warning'
              ? 'bg-[#fffbeb] border-[#fde68a] text-[#92400e] dark:bg-amber-950/40 dark:border-amber-500/30 dark:text-amber-300'
              : 'bg-[#fef2f2] border-[#fecaca] text-[#b91c1c] dark:bg-rose-950/40 dark:border-rose-500/30 dark:text-rose-300'
          }`}>
            <div className="flex items-center gap-2">
              {searchFeedback.type === 'warning' ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <ShieldAlert className="w-4 h-4 shrink-0" />}
              <span>{searchFeedback.message}</span>
            </div>
            {activeTab === 'visitante' && !visitanteResultado?.encontrado && searchFeedback.type === 'warning' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setNovoVisCpf(formatCpf(cpfInput));
                  setIsIdentificationModalOpen(false);
                  setIsNovoVisitanteModalOpen(true);
                }}
                className="mt-3"
              >
                <UserPlus className="w-3.5 h-3.5" /> Cadastrar visitante
              </Button>
            )}
            {activeTab === 'servidor' && !servidorResultado?.encontrado && searchFeedback.type === 'error' && (
              <Button
                size="sm"
                variant="outline"
                onClick={abrirCadastroServidor}
                className="mt-3"
              >
                <UserPlus className="w-3.5 h-3.5" /> Cadastrar servidor
              </Button>
            )}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isNovoServidorModalOpen}
        onClose={() => setIsNovoServidorModalOpen(false)}
        title="Cadastrar servidor"
        description="Cadastre o servidor não localizado para continuar o atendimento. A matrícula informada será mantida."
        maxWidth="lg"
      >
        <form onSubmit={handleCadastrarServidor} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Matrícula *" value={matriculaInput.trim().toUpperCase()} disabled />
            <Input label="Nome *" value={novoServNome} onChange={(event) => setNovoServNome(event.target.value)} required autoFocus />
          </div>
          <Input label="Cargo *" value={novoServCargo} onChange={(event) => setNovoServCargo(event.target.value)} required />
          <Input label="Lotação *" value={novoServLotacao} onChange={(event) => setNovoServLotacao(event.target.value)} required />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Departamento *"
              value={novoServDepartamentoId}
              onChange={(event) => { setNovoServDepartamentoId(event.target.value); setNovoServSetorId(''); }}
              options={departamentos.map((item) => ({ value: item.id, label: `${item.sigla} - ${item.nome}` }))}
              required
            />
            <Select
              label="Setor"
              value={novoServSetorId}
              onChange={(event) => setNovoServSetorId(event.target.value)}
              options={[{ value: '', label: 'Sem setor específico' }, ...setores.filter((item) => item.departamento_id === novoServDepartamentoId).map((item) => ({ value: item.id, label: item.nome }))]}
            />
          </div>
          <Input label="Ramal" value={novoServRamal} onChange={(event) => setNovoServRamal(event.target.value)} placeholder="Ex.: 1001" />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsNovoServidorModalOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="primary" isLoading={isSubmittingServidor}><UserPlus className="w-4 h-4" /> Salvar e continuar</Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isPersonDetailsModalOpen}
        onClose={() => {
          setIsPersonDetailsModalOpen(false);
          setServidorResultado(null);
          setVisitanteResultado(null);
          setSearchFeedback({ type: null, message: '' });
        }}
        title="Pessoa identificada"
        description="Confirme os dados antes de iniciar o registro de entrada ou saída."
        maxWidth="xl"
      >
        {activeTab === 'servidor' && servidorResultado?.encontrado && servidorResultado.servidor && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#dce4f0] dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#edf5fc] border border-[#c9e1f6] flex items-center justify-center font-bold text-[#0877c9] text-lg dark:bg-blue-950/60 dark:border-blue-500/30 dark:text-blue-400">
                  {servidorResultado.servidor.nome.charAt(0)}
                </div>
                <div>
                  <h4 className="text-base font-bold text-[#152238] dark:text-slate-100">{servidorResultado.servidor.nome}</h4>
                  <p className="text-xs text-[#627289] dark:text-slate-400">Matrícula: <span className="font-mono font-semibold">{servidorResultado.servidor.matricula}</span> · CPF: {servidorResultado.servidor.cpf}</p>
                </div>
              </div>
              <Badge variant={servidorResultado.no_predio ? 'warning' : 'success'}>{servidorResultado.no_predio ? '● Presente no prédio' : '● Apto para entrada'}</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-[#f8fbff] p-3 rounded-lg border border-[#dce4f0] dark:bg-slate-900 dark:border-slate-800"><span className="text-[#627289] dark:text-slate-400 block text-[11px]">Cargo</span><span className="font-semibold text-[#152238] dark:text-slate-100">{servidorResultado.servidor.cargo}</span></div>
              <div className="bg-[#f8fbff] p-3 rounded-lg border border-[#dce4f0] dark:bg-slate-900 dark:border-slate-800"><span className="text-[#627289] dark:text-slate-400 block text-[11px]">Lotação</span><span className="font-semibold text-[#152238] dark:text-slate-100">{servidorResultado.servidor.departamento?.sigla || 'SMEDU'} - {servidorResultado.servidor.setor?.nome || 'Geral'}</span></div>
              <div className="bg-[#f8fbff] p-3 rounded-lg border border-[#dce4f0] dark:bg-slate-900 dark:border-slate-800"><span className="text-[#627289] dark:text-slate-400 block text-[11px]">Contato</span><span className="font-semibold text-[#152238] dark:text-slate-100">{servidorResultado.servidor.telefone || servidorResultado.servidor.email || 'Não informado'}</span></div>
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <Button variant="outline" onClick={() => setIsPersonDetailsModalOpen(false)}>Fechar</Button>
              {servidorResultado.no_predio && servidorResultado.movimentacao_atual ? (
                <Button variant="danger" onClick={() => { setIsPersonDetailsModalOpen(false); setMovimentacaoParaSaida(servidorResultado.movimentacao_atual!); setIsSaidaModalOpen(true); }}><LogOut className="w-4 h-4" /> Registrar saída</Button>
              ) : (
                <Button variant="primary" onClick={() => { setIsPersonDetailsModalOpen(false); handleIniciarEntrada(); }}>Iniciar registro de entrada <ArrowRight className="w-4 h-4" /></Button>
              )}
            </div>
          </div>
        )}

        {activeTab === 'visitante' && visitanteResultado?.encontrado && visitanteResultado.visitante && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#dce4f0] dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#e8f7ee] border border-[#ccefd8] flex items-center justify-center font-bold text-[#16a34a] text-lg dark:bg-emerald-950/60 dark:border-emerald-500/30 dark:text-emerald-400">
                  {visitanteResultado.visitante.nome.charAt(0)}
                </div>
                <div>
                  <h4 className="text-base font-bold text-[#152238] dark:text-slate-100">{visitanteResultado.visitante.nome}</h4>
                  <p className="text-xs text-[#627289] dark:text-slate-400">CPF: <span className="font-mono font-semibold">{visitanteResultado.visitante.cpf}</span>{visitanteResultado.visitante.rg && ` · RG: ${visitanteResultado.visitante.rg}`}</p>
                </div>
              </div>
              <Badge variant={visitanteResultado.no_predio ? 'warning' : 'success'}>{visitanteResultado.no_predio ? '● Entrada em andamento' : '● Apto para entrada'}</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-[#f8fbff] p-3 rounded-lg border border-[#dce4f0] dark:bg-slate-900 dark:border-slate-800"><span className="text-[#627289] dark:text-slate-400 block text-[11px]">Empresa / vínculo</span><span className="font-semibold text-[#152238] dark:text-slate-100">{visitanteResultado.visitante.empresa_orgao || 'Cidadão / Particular'}</span></div>
              <div className="bg-[#f8fbff] p-3 rounded-lg border border-[#dce4f0] dark:bg-slate-900 dark:border-slate-800"><span className="text-[#627289] dark:text-slate-400 block text-[11px]">Telefone</span><span className="font-semibold text-[#152238] dark:text-slate-100">{visitanteResultado.visitante.telefone || 'Não cadastrado'}</span></div>
              <div className="bg-[#f8fbff] p-3 rounded-lg border border-[#dce4f0] dark:bg-slate-900 dark:border-slate-800"><span className="text-[#627289] dark:text-slate-400 block text-[11px]">Observação permanente</span><span className="font-semibold text-[#152238] dark:text-slate-100">{visitanteResultado.visitante.observacoes || 'Nenhuma ressalva'}</span></div>
            </div>
            {visitanteResultado.historico_recente && visitanteResultado.historico_recente.length > 0 && (
              <div className="p-3 bg-[#f8fbff] rounded-lg border border-[#dce4f0] text-xs dark:bg-slate-900 dark:border-slate-800">
                <span className="text-[#627289] dark:text-slate-400 font-medium block mb-1">Últimas visitas na SMEDU</span>
                {visitanteResultado.historico_recente.slice(0, 3).map((item) => <div key={item.id} className="flex justify-between gap-3 text-[#37475e] dark:text-slate-300"><span>{formatDateTime(item.data_hora_entrada)} → {item.departamento}/{item.setor} ({item.motivo})</span><span className="shrink-0">{item.data_hora_saida ? 'Saída registrada' : 'Em andamento'}</span></div>)}
              </div>
            )}
            <div className="flex justify-end gap-3 pt-1">
              <Button variant="outline" onClick={() => setIsPersonDetailsModalOpen(false)}>Fechar</Button>
              {visitanteResultado.no_predio && visitanteResultado.movimentacao_atual ? (
                <Button variant="danger" onClick={() => { setIsPersonDetailsModalOpen(false); setMovimentacaoParaSaida(visitanteResultado.movimentacao_atual!); setIsSaidaModalOpen(true); }}><LogOut className="w-4 h-4" /> Registrar saída</Button>
              ) : (
                <Button variant="primary" onClick={() => { setIsPersonDetailsModalOpen(false); handleIniciarEntrada(); }}>Iniciar registro de entrada <ArrowRight className="w-4 h-4" /></Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isShortcutHelpOpen}
        onClose={() => setIsShortcutHelpOpen(false)}
        title="Atalhos de teclado"
        description="Use estes atalhos para operar a recepção sem depender do mouse."
        maxWidth="sm"
      >
        <div className="space-y-2">
          {[['Alt + S ou Alt + 1', 'Identificar servidor'], ['Alt + V', 'Identificar visitante'], ['Alt + D', 'Abrir devolução rápida'], ['Alt + A', 'Atualizar dados'], ['Alt + P', 'Gerar PDF'], ['Esc', 'Fechar o modal atual']].map(([shortcut, action]) => (
            <div key={shortcut} className="flex items-center justify-between rounded-xl border border-[#dce4f0] bg-[#f8fbff] px-3 py-2.5 text-sm dark:border-slate-800 dark:bg-slate-900">
              <span className="text-[#37475e] dark:text-slate-200">{action}</span>
              <kbd className="rounded-md border border-[#b9d9f3] bg-white px-2 py-1 font-mono text-xs font-semibold text-[#0877d1] dark:bg-slate-800 dark:border-slate-700">{shortcut}</kbd>
            </div>
          ))}
          <p className="pt-2 text-xs text-[#627289] dark:text-slate-400">Os atalhos ficam suspensos enquanto você preenche um campo, para não interferir na digitação.</p>
        </div>
      </Modal>

      {/* MODAL 1: Registro Atômico de Entrada */}
      <Modal
        isOpen={isEntradaModalOpen}
        onClose={() => setIsEntradaModalOpen(false)}
        title="Entrada em Andamento"
        description="Confirme o destino e anexe o crachá temporário entregue à pessoa identificada"
      >
        <form onSubmit={handleConfirmarEntrada} className="space-y-4">
          <div className="p-3 bg-[#edf5fc] rounded-xl border border-[#c9e1f6] text-xs dark:bg-slate-900/80 dark:border-slate-800">
            <span className="text-slate-400">Identificação:</span>
            <div className="text-[#152238] font-bold text-sm mt-0.5 dark:text-slate-100">
              {activeTab === 'servidor'
                ? servidorResultado?.servidor?.nome
                : visitanteResultado?.visitante?.nome}
            </div>
            <div className="text-[#16a34a] font-mono text-[11px] dark:text-emerald-400">
              {activeTab === 'servidor'
                ? `Matrícula: ${servidorResultado?.servidor?.matricula}`
                : `CPF: ${visitanteResultado?.visitante?.cpf}`}
            </div>
          </div>

          <div>
            <Input
              label="Crachá temporário / código de barras"
              value={formCracha}
              onChange={(e) => {
                setFormCracha(e.target.value);
                setFormCrachaFeedback(null);
              }}
              onBlur={() => { void validarCrachaParaEntrada(); }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void validarCrachaParaEntrada();
                }
              }}
              placeholder="Leia ou digite o código do crachá VISITANTE"
              icon={<Barcode className="w-4 h-4" />}
              autoFocus
            />
            <p className="mt-1 text-[11px] text-[#627289] dark:text-slate-400">
              O leitor USB preenche este campo automaticamente. Deixe em branco somente se não houver entrega de crachá.
            </p>
            <Button type="button" size="sm" variant="outline" className="mt-2 min-h-11" onClick={() => setCameraTarget('entrada')}><Camera className="w-4 h-4" /> Ler com câmera do celular</Button>
            {formCrachaFeedback && (
              <p className={`mt-1 text-[11px] font-medium ${formCrachaFeedback.includes('disponível') ? 'text-[#16a34a] dark:text-emerald-300' : 'text-[#dc2626] dark:text-rose-300'}`}>
                {formCrachaFeedback}
              </p>
            )}
          </div>

          {activeTab === 'visitante' && <section className="space-y-3 border-t border-[#dce4f0] pt-4">
            <div className="flex justify-between"><div><h3 className="font-bold text-[#102755]">Destinos da visita (até 10)</h3><p className="text-xs text-[#627289]">Selecione os departamentos e setores que serão visitados.</p></div><Badge variant="neutral">{destinosVisita.length}/10</Badge></div>
            {destinosVisita.map((destino, index) => <div key={index} className="rounded-xl border border-[#d6e6f7] bg-[#f8fbff] p-3 space-y-3"><div className="flex justify-between font-bold text-sm"><span>Destino {index + 1}</span>{destinosVisita.length > 1 && <button type="button" onClick={() => setDestinosVisita((items) => items.filter((_, itemIndex) => itemIndex !== index))} className="text-rose-500"><Trash2 className="w-4 h-4" /></button>}</div><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><Select label="Departamento de destino" value={destino.departamento_destino_id} onChange={(event) => atualizarDestinoVisita(index, { departamento_destino_id: event.target.value })} options={[{ value: '', label: 'Selecionar departamento' }, ...departamentos.map((item) => ({ value: item.id, label: `${item.sigla} - ${item.nome}` }))]} required /><Select label="Setor específico" value={destino.setor_destino_id} onChange={(event) => atualizarDestinoVisita(index, { setor_destino_id: event.target.value })} options={[{ value: '', label: 'Selecionar setor' }, ...setores.filter((item) => item.departamento_id === destino.departamento_destino_id).map((item) => ({ value: item.id, label: item.nome }))]} disabled={!destino.departamento_destino_id} required /></div></div>)}
            {destinosVisita.length < 10 && <button type="button" onClick={adicionarDestinoVisita} className="flex w-full justify-center gap-2 rounded-xl border border-dashed border-[#52a6fb] py-2 text-sm font-semibold text-[#0877d1]"><Plus className="w-4 h-4" />Adicionar outro destino</button>}
          </section>}
          <div className={activeTab === 'visitante' ? 'hidden' : 'grid grid-cols-1 sm:grid-cols-2 gap-3'}>
            <Select
              label="Departamento de Destino"
              value={formDestinoSetorId}
              onChange={(e) => {
                const setor = setores.find((item) => item.id === e.target.value);
                setFormDestinoSetorId(e.target.value);
                setFormDestinoDepId(setor?.departamento_id || '');
                setFormServidorDestinoId('');
              }}
              options={[
                { value: '', label: 'Selecione o departamento' },
                ...setores.map((s) => ({
                  value: s.id,
                  label: `${s.sigla} - ${s.nome}`,
                })),
              ]}
              required
            />

            <Select
              label="Diretor/Servidor"
              value={formServidorDestinoId}
              onChange={(e) => setFormServidorDestinoId(e.target.value)}
              options={[
                { value: '', label: formDestinoSetorId ? 'Selecione o diretor/servidor' : 'Selecione primeiro o departamento' },
                ...servidoresDestinoFiltrados.map((servidor) => ({
                  value: servidor.id,
                  label: `${servidor.nome} — ${servidor.cargo}`,
                })),
              ]}
              disabled={!formDestinoSetorId}
            />
          </div>

          {/* Servidor anfitrião / destino */}
          <div className="hidden">
            <Input
              label="Servidor / Responsável a ser procurado (Opcional)"
              value={formServidorDestinoBusca}
              onFocus={() => setIsServidorDestinoBuscaOpen(Boolean(formDestinoDepId && formDestinoSetorId))}
              onChange={(event) => {
                setFormServidorDestinoBusca(event.target.value);
                setFormServidorDestinoId('');
                setIsServidorDestinoBuscaOpen(true);
              }}
              placeholder={formDestinoDepId && formDestinoSetorId ? 'Buscar responsável na lotação selecionada' : 'Selecione departamento e setor primeiro'}
              icon={<Search className="w-4 h-4" />}
              disabled={!formDestinoDepId || !formDestinoSetorId}
            />
            {isServidorDestinoBuscaOpen && formDestinoDepId && formDestinoSetorId && (
              <div className="absolute z-30 top-full mt-1 w-full max-h-48 overflow-y-auto rounded-xl border border-[#c9d9ed] bg-white p-1.5 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                <button
                  type="button"
                  className="w-full rounded-lg px-3 py-2 text-left text-xs text-[#627289] hover:bg-[#edf5fc] dark:text-slate-300 dark:hover:bg-slate-800"
                  onClick={() => {
                    setFormServidorDestinoId('');
                    setFormServidorDestinoBusca('');
                    setIsServidorDestinoBuscaOpen(false);
                  }}
                >
                  Nenhum servidor específico — atendimento no balcão do setor
                </button>
                {servidoresDestinoFiltrados.map((servidor) => (
                  <button
                    type="button"
                    key={servidor.id}
                    className="w-full rounded-lg px-3 py-2 text-left hover:bg-[#edf5fc] dark:hover:bg-slate-800"
                    onClick={() => {
                      setFormServidorDestinoId(servidor.id);
                      setFormServidorDestinoBusca(`${servidor.nome} — ${servidor.cargo}`);
                      setIsServidorDestinoBuscaOpen(false);
                    }}
                  >
                    <span className="block text-sm font-semibold text-[#152238] dark:text-slate-100">{servidor.nome}</span>
                    <span className="block text-[11px] text-[#627289] dark:text-slate-400">{servidor.cargo} · Matrícula {servidor.matricula}</span>
                  </button>
                ))}
                {servidoresDestinoFiltrados.length === 0 && (
                  <p className="px-3 py-2 text-xs text-[#627289] dark:text-slate-400">Nenhum servidor encontrado nesta lotação.</p>
                )}
              </div>
            )}
          </div>

          <Input
            label="Motivo do Acesso"
            value={formMotivo}
            onChange={(e) => setFormMotivo(e.target.value)}
            placeholder="Ex: Reunião pedagógica, entrega de documento..."
            required
          />

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

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#dce4f0] dark:border-slate-800">
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

          {movimentacaoParaSaida?.cracha_numero && (
            <label className="flex items-center gap-3 p-3 rounded-lg bg-[#f8fbff] border border-[#dce4f0] text-xs text-[#152238] dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200">
              <input
                type="checkbox"
                checked={crachaDevolvido}
                onChange={(event) => setCrachaDevolvido(event.target.checked)}
                className="w-4 h-4 accent-[#005a9c]"
              />
              <span><strong>Confirmo a devolução do crachá.</strong><br /><span className="text-[#627289] dark:text-slate-400">Se desmarcado, o crachá seguirá em uso como pendência operacional.</span></span>
            </label>
          )}

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

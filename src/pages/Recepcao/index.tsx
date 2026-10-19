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
  LogIn,
  User,
  CheckCircle2,
  Phone,
  Building2,
  ShieldCheck,
  PhoneCall,
  MessageSquare,
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
  ServidorSetorVinculo,
  Movimentacao,
  DestinoVisita,
  ConsultaServidorResultado,
  ConsultaVisitanteResultado,
} from '@/types';
import { cn, formatDateTime, formatTime } from '@/lib/utils';
import { biometricProvider, isBiometricAgentConfigured, DeviceStatus, IdentificationMethod } from '@/services/identification';
import { generateInstitutionalPdf } from '@/services/pdfService';
import { ReceptionClock } from '@/components/recepcao/ReceptionClock';
import { BarcodeCameraScanner } from '@/components/recepcao/BarcodeCameraScanner';
import { RoteiroDestinosModal, isRowBackgroundClick } from '@/components/movimentacoes/RoteiroDestinosModal';

interface FichaPessoaIdentificadaProps {
  nome: string;
  documentos: string;
  status: { texto: string; tom: 'sucesso' | 'alerta' };
  dados: Array<{ icone: React.ReactNode; rotulo: string; valor: string }>;
  extra?: React.ReactNode;
  acoes: React.ReactNode;
}

// Conteúdo do modal "Pessoa identificada" (servidor ou visitante).
export const FichaPessoaIdentificada: React.FC<FichaPessoaIdentificadaProps> = ({ nome, documentos, status, dados, extra, acoes }) => (
  <>
    <div className="space-y-6 px-5 pb-6 pt-6 sm:px-7">
      <div className="flex flex-col gap-4 rounded-2xl border border-[#dce6f3] bg-white p-5 shadow-[0_10px_30px_-18px_rgba(18,44,82,.35)] sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex min-w-0 items-center gap-5">
          <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#1e8bff] to-[#0644c8] text-4xl font-extrabold text-white shadow-[0_0_0_4px_#e6f1fd] dark:shadow-[0_0_0_4px_rgba(30,64,120,.5)]">
            {nome.charAt(0)}
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#627289] dark:text-slate-400">Identificação</span>
            <h4 className="truncate text-2xl font-extrabold leading-tight text-[#0d1f45] dark:text-slate-100">{nome}</h4>
            <p className="mt-0.5 text-base text-[#627289] dark:text-slate-400">{documentos}</p>
          </div>
        </div>
        <span className={cn(
          'inline-flex shrink-0 items-center gap-2 self-start rounded-full border px-4 py-2 text-sm font-semibold sm:self-center',
          status.tom === 'sucesso'
            ? 'border-[#bfe8cd] bg-[#eefbf2] text-[#15803d] dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300'
            : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-300'
        )}>
          {status.tom === 'sucesso' ? <CheckCircle2 className="h-5 w-5 fill-[#16a34a] text-white" /> : <Clock className="h-5 w-5" />}
          {status.texto}
        </span>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-extrabold text-[#0d1f45] dark:text-slate-100">Dados cadastrais</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {dados.map((item) => (
            <div key={item.rotulo} className="flex gap-3.5 rounded-2xl border border-[#dce6f3] bg-[#fbfdff] p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#e9f2fd] text-[#0b5ed7] dark:bg-slate-800 dark:text-sky-300">{item.icone}</div>
              <div className="min-w-0">
                <span className="block text-xs text-[#627289] dark:text-slate-400">{item.rotulo}</span>
                <span className="block break-words text-base font-bold leading-snug text-[#0d1f45] dark:text-slate-100">{item.valor}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      {extra}
    </div>
    <div className="flex justify-end gap-3 border-t border-[#e3eaf4] px-5 py-5 sm:px-7 dark:border-slate-800">{acoes}</div>
  </>
);

const MOTIVOS_ACESSO = [
  'Atendimento institucional',
  'Reunião',
  'Entrega de documentos',
  'Visita técnica',
  'Prestação de serviço',
  'Outro',
];

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
  const [vinculosServidorSetor, setVinculosServidorSetor] = useState<ServidorSetorVinculo[]>([]);

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
  const [routeMovement, setRouteMovement] = useState<Movimentacao | null>(null);

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
  const [isAutorizacaoModalOpen, setIsAutorizacaoModalOpen] = useState(false);
  const [autorizacaoMeio, setAutorizacaoMeio] = useState('');
  // Map de confirmações individuais: chave = servidor_destino_id (ou índice), valor = true/false
  const [autorizacoesIndividuais, setAutorizacoesIndividuais] = useState<Record<string, boolean>>({});
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
          item.destinos && item.destinos.length > 1
            ? item.destinos.map((d) => `${d.departamento_destino?.sigla || ''} - ${d.setor_destino?.nome || ''}`).filter(Boolean).join(', ')
            : `${item.departamento_destino?.sigla || 'SMEDU'} - ${item.setor_destino?.nome || 'Geral'}`,
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
  const normalizarNomeSetor = (nome?: string) => (nome || '').trim().toLocaleUpperCase('pt-BR');
  const setoresDestinoOpcoes = Array.from(
    setores
      .filter((setor) => setor.ativo !== false)
      .reduce((mapa, setor) => {
        const chave = normalizarNomeSetor(setor.nome);
        if (!mapa.has(chave)) mapa.set(chave, setor);
        return mapa;
      }, new Map<string, Setor>())
      .values(),
  ).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  // Retorna os servidores lotados ou vinculados ao setor informado
  const obterServidoresPorSetor = (setorId?: string) => {
    if (!setorId) return [];
    const setorDestino = setores.find((s) => s.id === setorId);
    const idsSetores = new Set(
      setorDestino
        ? setores.filter((s) => normalizarNomeSetor(s.nome) === normalizarNomeSetor(setorDestino.nome)).map((s) => s.id)
        : [setorId]
    );
    return todosServidores.filter((servidor) => {
      return idsSetores.has(servidor.setor_id || '') ||
        vinculosServidorSetor.some((vinculo) => vinculo.servidor_id === servidor.id && idsSetores.has(vinculo.setor_id));
    });
  };

  // Verifica se o servidor no setor informado exige autorização formal prévia
  const servidorExigeAutorizacaoNoSetor = (setorId?: string, servidorId?: string) => {
    if (!servidorId || !setorId) return false;
    const setorDestino = setores.find((s) => s.id === setorId);
    const idsSetores = new Set(
      setorDestino
        ? setores.filter((s) => normalizarNomeSetor(s.nome) === normalizarNomeSetor(setorDestino.nome)).map((s) => s.id)
        : [setorId]
    );
    return vinculosServidorSetor.some(
      (vinculo) => vinculo.servidor_id === servidorId && idsSetores.has(vinculo.setor_id) && vinculo.requer_autorizacao
    );
  };

  // Resumo de destinos que exigem autorização formal prévia
  const destinosComAutorizacaoRequerida = destinosVisita.filter((d) =>
    Boolean(d.setor_destino_id && d.servidor_destino_id && servidorExigeAutorizacaoNoSetor(d.setor_destino_id, d.servidor_destino_id))
  );
  const destinoRequerAutorizacao = destinosComAutorizacaoRequerida.length > 0;
  const primeiroDestinoAut = destinosComAutorizacaoRequerida[0];
  const servidorDestinoSelecionado = primeiroDestinoAut
    ? todosServidores.find((s) => s.id === primeiroDestinoAut.servidor_destino_id)
    : todosServidores.find((s) => s.id === destinosVisita[0]?.servidor_destino_id);
  const setorDestinoSelecionado = primeiroDestinoAut
    ? setores.find((s) => s.id === primeiroDestinoAut.setor_destino_id)
    : setores.find((s) => s.id === destinosVisita[0]?.setor_destino_id);


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
      if ('setor_destino_id' in alteracoes) {
        const setor = setores.find((item) => item.id === alteracoes.setor_destino_id);
        proximo.departamento_destino_id = setor?.departamento_id || '';
        proximo.servidor_destino_id = '';
      }
      return proximo;
    }));
  };

  const adicionarDestinoVisita = () => {
    if (destinosVisita.length < 10) {
      setDestinosVisita((atuais) => [...atuais, { departamento_destino_id: '', setor_destino_id: '', servidor_destino_id: '' }]);
    }
  };

  const removerDestinoVisita = (index: number) => {
    if (destinosVisita.length > 1) {
      setDestinosVisita((atuais) => atuais.filter((_, itemIndex) => itemIndex !== index));
    }
  };

  // Confirmar Entrada Atômica
  // Responsável que exige autorização prévia: a recepção confirma a autorização antes de registrar.
  const handleConfirmarEntrada = async (e: React.FormEvent) => {
    e.preventDefault();
    if (destinoRequerAutorizacao) {
      setIsSubmittingEntrada(true);
      try {
        if (!(await validarCrachaParaEntrada())) return;
        setAutorizacaoMeio('');
        setAutorizacoesIndividuais({});
        setIsAutorizacaoModalOpen(true);
      } finally {
        setIsSubmittingEntrada(false);
      }
      return;
    }
    await registrarEntrada(null);
  };

  const registrarEntrada = async (autorizacao: { situacao: 'confirmada'; meio: string } | { situacao: 'pendente' } | null) => {
    setIsSubmittingEntrada(true);

    try {
      if (!(await validarCrachaParaEntrada())) return;
      const destinosValidos = destinosVisita
        .filter((d) => Boolean(d.setor_destino_id))
        .map((d) => ({
          ...d,
          departamento_destino_id: d.departamento_destino_id || setores.find((s) => s.id === d.setor_destino_id)?.departamento_id || '',
          servidor_destino_id: d.servidor_destino_id || undefined,
        }));

      if (!destinosValidos.length) {
        throw new Error('Selecione pelo menos um departamento de destino para a visita.');
      }

      const requerAutorizacao = destinoRequerAutorizacao && autorizacao?.situacao !== 'confirmada';
      const nomesResponsaveisAut = destinosComAutorizacaoRequerida
        .map((d) => todosServidores.find((s) => s.id === d.servidor_destino_id)?.nome)
        .filter(Boolean)
        .join(', ');

      const registroAutorizacao = autorizacao?.situacao === 'confirmada'
        ? `[Autorização prévia] ${nomesResponsaveisAut || 'Responsável'} autorizou a visita (${autorizacao.meio}). Confirmado por ${user?.nome_completo || user?.email || 'recepção'} às ${formatTime(new Date().toISOString())}.`
        : '';
      const observacoes = [formObservacoes.trim(), registroAutorizacao].filter(Boolean).join('\n');

      const pessoaId =
        activeTab === 'servidor'
          ? servidorResultado?.servidor?.id
          : visitanteResultado?.visitante?.id;

      if (!pessoaId) throw new Error('Identificação da pessoa é obrigatória.');

      await dataService.registrarEntrada(
        {
          tipo_pessoa: activeTab,
          pessoa_id: pessoaId,
          departamento_destino_id: destinosValidos[0].departamento_destino_id,
          setor_destino_id: destinosValidos[0].setor_destino_id,
          servidor_destino_id: destinosValidos[0].servidor_destino_id,
          cracha_numero: formCracha.trim().toUpperCase(),
          motivo: formMotivo,
          requer_autorizacao: requerAutorizacao,
          observacoes,
          destinos: destinosValidos,
        },
        user
      );

      setIsAutorizacaoModalOpen(false);
      setIsEntradaModalOpen(false);
      setSearchFeedback({
        type: 'success',
        message: autorizacao?.situacao === 'confirmada'
          ? `Entrada registrada com autorização de ${nomesResponsaveisAut || 'responsável'}.`
          : requerAutorizacao
          ? 'Entrada registrada com solicitação de autorização enviada ao setor.'
          : `Entrada registrada com sucesso! ${destinosValidos.length > 1 ? `${destinosValidos.length} departamentos vinculados à visita.` : 'Crachá atribuído.'}`,
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
              ? 'bg-[linear-gradient(135deg,#eff8ff_0%,#fff_66%,#e2f1ff_100%)] dark:bg-none border-[#8cc8ff] shadow-[0_18px_32px_-20px_rgba(8,119,201,.65)] dark:bg-[#131b2e] dark:border-emerald-500 dark:shadow-emerald-950/20 dark:ring-1 dark:ring-emerald-500/50'
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
              ? 'bg-[linear-gradient(135deg,#effdf5_0%,#fff_66%,#dcfce7_100%)] dark:bg-none border-[#a7ebc3] shadow-[0_18px_32px_-20px_rgba(22,163,74,.48)] dark:bg-[#131b2e] dark:border-emerald-500 dark:shadow-emerald-950/20 dark:ring-1 dark:ring-emerald-500/50'
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
          <div className="min-h-[208px] rounded-xl border border-dashed border-[#d7e6f5] bg-[linear-gradient(180deg,#fff_0%,#f8fbff_100%)] px-6 py-8 text-center dark:bg-none dark:bg-[#101625] dark:border-slate-700">
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
                    <tr
                      key={m.id}
                      onClick={(event) => { if (isRowBackgroundClick(event)) setRouteMovement(m); }}
                      className="hover:bg-slate-800/30 transition-colors cursor-pointer"
                      title="Ver setores/departamentos do roteiro"
                    >
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
                        {m.destinos && m.destinos.length > 1 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            <span
                              className="inline-flex items-center gap-1 rounded bg-[#0d6efd]/15 px-2 py-0.5 text-[10px] font-semibold text-sky-400 border border-[#0d6efd]/30"
                              title={m.destinos.map((d, i) => `${i + 1}. ${d.departamento_destino?.sigla || 'Dep'} - ${d.setor_destino?.nome || 'Setor'}${d.servidor_destino ? ` (${d.servidor_destino.nome})` : ''}`).join('\n')}
                            >
                              <Building2 className="w-3 h-3 text-sky-400" />
                              +{m.destinos.length - 1} {m.destinos.length - 1 === 1 ? 'outro departamento' : 'outros departamentos'}
                            </span>
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
      <RoteiroDestinosModal
        movimentacao={routeMovement}
        onClose={() => setRouteMovement(null)}
        departamentos={departamentos}
        setores={setores}
        servidores={todosServidores}
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
        description="Confirme os dados para iniciar o registro."
        icon={<User className="w-7 h-7" />}
        maxWidth="3xl"
        variant="destaque"
      >
        {activeTab === 'servidor' && servidorResultado?.encontrado && servidorResultado.servidor && (
          <FichaPessoaIdentificada
            nome={servidorResultado.servidor.nome}
            documentos={`Matrícula: ${servidorResultado.servidor.matricula}  •  CPF: ${servidorResultado.servidor.cpf || '—'}`}
            status={servidorResultado.no_predio ? { texto: 'Presente no prédio', tom: 'alerta' } : { texto: 'Apto para entrada', tom: 'sucesso' }}
            dados={[
              { icone: <Briefcase className="w-5 h-5" />, rotulo: 'Cargo', valor: servidorResultado.servidor.cargo || 'Não informado' },
              { icone: <Building2 className="w-5 h-5" />, rotulo: 'Lotação', valor: `${servidorResultado.servidor.departamento?.sigla || 'SMEDU'} - ${servidorResultado.servidor.setor?.nome || 'Geral'}` },
              { icone: <Phone className="w-5 h-5" />, rotulo: 'Contato', valor: servidorResultado.servidor.telefone || servidorResultado.servidor.email || 'Não informado' },
            ]}
            acoes={<>
              <Button variant="outline" className="min-h-12 rounded-xl px-7" onClick={() => setIsPersonDetailsModalOpen(false)}>Fechar</Button>
              {servidorResultado.no_predio && servidorResultado.movimentacao_atual ? (
                <Button variant="danger" className="min-h-12 rounded-xl px-7" onClick={() => { setIsPersonDetailsModalOpen(false); setMovimentacaoParaSaida(servidorResultado.movimentacao_atual!); setIsSaidaModalOpen(true); }}><LogOut className="w-4 h-4" /> Registrar saída</Button>
              ) : (
                <Button variant="primary" className="min-h-12 rounded-xl border-0 bg-gradient-to-r from-[#0d6efd] to-[#0647c4] px-7 font-semibold shadow-[0_12px_24px_-10px_rgba(13,110,253,.7)] hover:from-[#2a7fff] hover:to-[#0b52d6]" onClick={() => { setIsPersonDetailsModalOpen(false); handleIniciarEntrada(); }}>Iniciar registro de entrada <ArrowRight className="w-5 h-5" /></Button>
              )}
            </>}
          />
        )}

        {activeTab === 'visitante' && visitanteResultado?.encontrado && visitanteResultado.visitante && (
          <FichaPessoaIdentificada
            nome={visitanteResultado.visitante.nome}
            documentos={`CPF: ${visitanteResultado.visitante.cpf}${visitanteResultado.visitante.rg ? `  •  RG: ${visitanteResultado.visitante.rg}` : ''}`}
            status={visitanteResultado.no_predio ? { texto: 'Entrada em andamento', tom: 'alerta' } : { texto: 'Apto para entrada', tom: 'sucesso' }}
            dados={[
              { icone: <Briefcase className="w-5 h-5" />, rotulo: 'Empresa / vínculo', valor: visitanteResultado.visitante.empresa_orgao || 'Cidadão / Particular' },
              { icone: <Phone className="w-5 h-5" />, rotulo: 'Telefone', valor: visitanteResultado.visitante.telefone || 'Não cadastrado' },
              { icone: <CircleHelp className="w-5 h-5" />, rotulo: 'Observação permanente', valor: visitanteResultado.visitante.observacoes || 'Nenhuma ressalva' },
            ]}
            extra={visitanteResultado.historico_recente && visitanteResultado.historico_recente.length > 0 && (
              <div className="rounded-2xl border border-[#dce6f3] bg-[#fbfdff] p-4 text-xs dark:border-slate-800 dark:bg-slate-900">
                <span className="mb-1 block font-medium text-[#627289] dark:text-slate-400">Últimas visitas na SMEDU</span>
                {visitanteResultado.historico_recente.slice(0, 3).map((item) => <div key={item.id} className="flex justify-between gap-3 text-[#37475e] dark:text-slate-300"><span>{formatDateTime(item.data_hora_entrada)} → {item.departamento}/{item.setor} ({item.motivo})</span><span className="shrink-0">{item.data_hora_saida ? 'Saída registrada' : 'Em andamento'}</span></div>)}
              </div>
            )}
            acoes={<>
              <Button variant="outline" className="min-h-12 rounded-xl px-7" onClick={() => setIsPersonDetailsModalOpen(false)}>Fechar</Button>
              {visitanteResultado.no_predio && visitanteResultado.movimentacao_atual ? (
                <Button variant="danger" className="min-h-12 rounded-xl px-7" onClick={() => { setIsPersonDetailsModalOpen(false); setMovimentacaoParaSaida(visitanteResultado.movimentacao_atual!); setIsSaidaModalOpen(true); }}><LogOut className="w-4 h-4" /> Registrar saída</Button>
              ) : (
                <Button variant="primary" className="min-h-12 rounded-xl border-0 bg-gradient-to-r from-[#0d6efd] to-[#0647c4] px-7 font-semibold shadow-[0_12px_24px_-10px_rgba(13,110,253,.7)] hover:from-[#2a7fff] hover:to-[#0b52d6]" onClick={() => { setIsPersonDetailsModalOpen(false); handleIniciarEntrada(); }}>Iniciar registro de entrada <ArrowRight className="w-5 h-5" /></Button>
              )}
            </>}
          />
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
        isOpen={isEntradaModalOpen && !isAutorizacaoModalOpen}
        onClose={() => setIsEntradaModalOpen(false)}
        title="Entrada em andamento"
        description="Confirme o destino e vincule o crachá entregue."
        icon={<LogIn className="w-6 h-6" />}
        maxWidth="3xl"
      >
        <form onSubmit={handleConfirmarEntrada} className="space-y-3 sm:space-y-3.5">
          <div className="flex items-center gap-3.5 rounded-2xl border border-[#c9e1f6] bg-[#edf5fc] px-4 py-3 dark:border-slate-800 dark:bg-slate-900/80">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#dcebf9] text-[#0b6bbf] dark:bg-slate-800 dark:text-sky-300">
              <User className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-xs text-[#627289] dark:text-slate-400">Pessoa identificada</span>
              <div className="truncate text-base font-extrabold leading-tight text-[#102755] dark:text-slate-100">
                {activeTab === 'servidor'
                  ? servidorResultado?.servidor?.nome
                  : visitanteResultado?.visitante?.nome}
              </div>
              <div className="text-sm text-[#627289] dark:text-slate-400">
                {activeTab === 'servidor'
                  ? <>Matrícula: <span className="ml-1">{servidorResultado?.servidor?.matricula}</span></>
                  : <>CPF: <span className="ml-1">{visitanteResultado?.visitante?.cpf}</span></>}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <h3 className="text-base font-extrabold text-[#102755] dark:text-slate-100">Crachá temporário</h3>
              <span className="text-xs text-[#627289] dark:text-slate-400">Opcional</span>
            </div>
            <div className="flex gap-2">
              <Input
                aria-label="Crachá temporário"
                className="min-h-11 rounded-xl"
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
                placeholder="Leia ou digite o código do crachá"
                icon={<Barcode className="w-5 h-5" />}
                autoFocus
              />
              <Button type="button" size="sm" variant="outline" className="min-h-11 shrink-0 rounded-xl" onClick={() => setCameraTarget('entrada')} aria-label="Ler com a câmera"><Camera className="w-4 h-4" /><span className="hidden sm:inline">Ler com a câmera</span></Button>
            </div>
            <p className="text-xs text-[#627289] dark:text-slate-400">
              O leitor USB preenche este campo automaticamente. Deixe em branco se não houver entrega de crachá.
            </p>
            {formCrachaFeedback && (
              <p className={`text-xs font-medium ${formCrachaFeedback.includes('disponível') ? 'text-[#16a34a] dark:text-emerald-300' : 'text-[#dc2626] dark:text-rose-300'}`}>
                {formCrachaFeedback}
              </p>
            )}
          </div>

          {/* Seção de Destinos da Visita (até 10 departamentos) */}
          <section className="space-y-3 border-t border-[#dce4f0] pt-4 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-[#102755] dark:text-slate-100 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-[#0d6efd]" />
                  Destino e atendimento
                </h3>
                <p className="text-xs text-[#627289] dark:text-slate-400">
                  A visita pode percorrer até 10 departamentos no prédio.
                </p>
              </div>
              <Badge variant={destinosVisita.length >= 10 ? 'warning' : 'neutral'}>
                {destinosVisita.length}/10 departamentos
              </Badge>
            </div>

            <div className="space-y-3">
              {destinosVisita.map((destino, index) => {
                const servidoresDoDestino = obterServidoresPorSetor(destino.setor_destino_id);
                const exigeAut = servidorExigeAutorizacaoNoSetor(destino.setor_destino_id, destino.servidor_destino_id);

                return (
                  <div
                    key={index}
                    className="relative rounded-2xl border border-[#d6e6f7] bg-[#f8fbff] p-3.5 space-y-3 dark:border-slate-800 dark:bg-slate-900/60 transition-all shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#e3effc] text-xs font-bold text-[#0877d1] dark:bg-slate-800 dark:text-sky-300">
                          {index + 1}
                        </span>
                        <span className="text-xs font-bold uppercase tracking-wider text-[#102755] dark:text-slate-200">
                          Destino {index + 1} {index === 0 && <span className="text-[10px] font-normal text-[#627289] dark:text-slate-400">(Principal)</span>}
                        </span>
                      </div>
                      {destinosVisita.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removerDestinoVisita(index)}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                          title="Remover este destino"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remover</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Select
                        label="Departamento de destino"
                        className="min-h-11 rounded-xl"
                        value={destino.setor_destino_id}
                        onChange={(event) => atualizarDestinoVisita(index, { setor_destino_id: event.target.value })}
                        options={[
                          { value: '', label: 'Selecione o departamento' },
                          ...setoresDestinoOpcoes.map((s) => ({
                            value: s.id,
                            label: `${s.sigla} - ${s.nome}`,
                          })),
                        ]}
                        required
                      />

                      <Select
                        label="Diretor / Servidor"
                        className={`min-h-11 rounded-xl${exigeAut ? ' select-perigo' : ''}`}
                        value={destino.servidor_destino_id || ''}
                        onChange={(event) => atualizarDestinoVisita(index, { servidor_destino_id: event.target.value })}
                        options={[
                          {
                            value: '',
                            label: destino.setor_destino_id ? 'Selecione uma pessoa (opcional)' : 'Selecione primeiro o departamento',
                          },
                          ...servidoresDoDestino.map((servidor) => ({
                            value: servidor.id,
                            label: `${servidor.nome} — ${servidor.cargo}`,
                            destaque: servidorExigeAutorizacaoNoSetor(destino.setor_destino_id, servidor.id) ? ('perigo' as const) : undefined,
                          })),
                        ]}
                        disabled={!destino.setor_destino_id}
                      />
                    </div>

                    {exigeAut && (
                      <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                        <span>Este responsável exige autorização formal prévia da portaria.</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {destinosVisita.length < 10 ? (
              <button
                type="button"
                onClick={adicionarDestinoVisita}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#52a6fb] bg-[#f0f7ff] py-2.5 text-sm font-semibold text-[#0877d1] hover:bg-[#e4f1ff] transition-colors dark:border-slate-700 dark:bg-slate-900/50 dark:text-sky-400"
              >
                <Plus className="w-4 h-4" />
                Adicionar outro departamento ({destinosVisita.length}/10)
              </button>
            ) : (
              <p className="text-center text-xs text-[#627289] dark:text-slate-400">
                Limite máximo de 10 departamentos atingido para esta visita.
              </p>
            )}
          </section>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select
              label="Motivo do acesso"
              className="min-h-11 rounded-xl"
              value={formMotivo}
              onChange={(e) => setFormMotivo(e.target.value)}
              options={Array.from(new Set([formMotivo, ...MOTIVOS_ACESSO])).map((motivo) => ({ value: motivo, label: motivo }))}
              required
            />

            <div className="space-y-1.5">
              <label htmlFor="observacoes-entrada" className="flex items-baseline gap-2 text-xs font-medium text-slate-300">
                Observações / Pertences declarados
                <span className="font-normal text-[#627289] dark:text-slate-400">Opcional</span>
              </label>
              <textarea
                id="observacoes-entrada"
                rows={1}
                value={formObservacoes}
                onChange={(e) => setFormObservacoes(e.target.value)}
                placeholder="Ex.: pasta e notebook Dell"
                className="block min-h-11 w-full resize-y rounded-xl border border-slate-700/80 bg-[#121826] px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 transition-colors focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
          </div>

          {destinoRequerAutorizacao && (
            <div className="px-3 py-2 rounded-lg bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
              <span>
                <strong>Atenção:</strong> Há responsável(is) nos destinos selecionados que exige(m) autorização formal prévia. Na próxima etapa, confirme que a visita foi autorizada; sem confirmação, a entrada ficará "Pendente de Autorização".
              </span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#dce4f0] dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              className="min-h-11 rounded-xl px-6"
              onClick={() => setIsEntradaModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary" className="min-h-11 rounded-xl px-6" isLoading={isSubmittingEntrada}>
              {destinoRequerAutorizacao
                ? <><ShieldCheck className="w-5 h-5" /><span>Confirmar autorização</span></>
                : <><LogIn className="w-5 h-5" /><span>Registrar entrada</span></>}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 1b: Confirmação de autorização prévia do responsável */}
      <Modal
        isOpen={isAutorizacaoModalOpen}
        onClose={() => setIsAutorizacaoModalOpen(false)}
        title="Autorização do responsável"
        description="Confirme com o responsável antes de liberar a entrada."
        icon={<ShieldCheck className="w-7 h-7" />}
        maxWidth="3xl"
        variant="destaque"
      >
        {(() => {
          const pessoaNome = (activeTab === 'servidor' ? servidorResultado?.servidor?.nome : visitanteResultado?.visitante?.nome) || 'Pessoa identificada';
          const responsavelNome = servidorDestinoSelecionado?.nome || 'Responsável';
          const setorDestino = setores.find((s) => s.id === formDestinoSetorId);
          const ramal = servidorDestinoSelecionado?.ramal || setorDestino?.ramal;
          const meios = [
            { valor: 'por ramal/telefone', rotulo: 'Ramal / telefone', icone: <PhoneCall className="w-5 h-5" /> },
            { valor: 'presencialmente', rotulo: 'Presencialmente', icone: <UserCheck className="w-5 h-5" /> },
            { valor: 'por mensagem/e-mail', rotulo: 'Mensagem / e-mail', icone: <MessageSquare className="w-5 h-5" /> },
          ];
          // Monta lista de destinatários que exigem autorização
          const destinatariosComAut = destinosComAutorizacaoRequerida.map((d, idx) => {
            const srv = todosServidores.find((s) => s.id === d.servidor_destino_id);
            const setor = setores.find((s) => s.id === d.setor_destino_id);
            const chave = d.servidor_destino_id || `destino-${idx}`;
            return { srv, setor, idx, chave };
          });

          // Há responsáveis com autorizacao? Usa confirmações individuais; caso contrário, usa estado legado
          const temMultiplos = destinatariosComAut.length > 0;
          const todasConfirmadas = temMultiplos
            ? destinatariosComAut.every(({ chave }) => Boolean(autorizacoesIndividuais[chave]))
            : Boolean(autorizacoesIndividuais['__unico__']);
          const podeConfirmar = Boolean(autorizacaoMeio) && todasConfirmadas;

          const toggleConfirmacao = (chave: string) => {
            setAutorizacoesIndividuais((prev) => ({ ...prev, [chave]: !prev[chave] }));
          };

          return (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (podeConfirmar) void registrarEntrada({ situacao: 'confirmada', meio: autorizacaoMeio });
              }}
            >
              <div className="space-y-5 px-5 pb-6 pt-6 sm:px-7">
                {/* Quem visita → quem autoriza (cabeçalho resumo) */}
                <div className="grid grid-cols-1 items-center gap-3 rounded-2xl border border-[#dce6f3] bg-white p-4 shadow-[0_10px_30px_-18px_rgba(18,44,82,.35)] sm:grid-cols-[1fr_auto_1fr] dark:border-slate-800 dark:bg-slate-900/60">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#1e8bff] to-[#0644c8] text-xl font-extrabold text-white">{pessoaNome.charAt(0)}</div>
                    <div className="min-w-0">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#627289] dark:text-slate-400">Visitante</span>
                      <p className="truncate text-sm font-extrabold text-[#0d1f45] dark:text-slate-100">{pessoaNome}</p>
                    </div>
                  </div>
                  <ArrowRight className="mx-auto hidden h-5 w-5 text-[#9fb2cc] sm:block" aria-hidden />
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#fdecec] text-xl font-extrabold text-[#dc2626] dark:bg-rose-950/50 dark:text-rose-300">{responsavelNome.charAt(0)}</div>
                    <div className="min-w-0">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#dc2626] dark:text-rose-300">Autoriza a visita</span>
                      <p className="truncate text-sm font-extrabold text-[#0d1f45] dark:text-slate-100">{responsavelNome}</p>
                      <p className="truncate text-xs text-[#627289] dark:text-slate-400">{servidorDestinoSelecionado?.cargo || setorDestino?.nome}</p>
                    </div>
                  </div>
                </div>

                {/* Como falar com o responsável principal */}
                <div className="flex flex-wrap gap-2 text-sm">
                  <span className="inline-flex items-center gap-2 rounded-full border border-[#dce6f3] bg-[#f6f9fe] px-3 py-1.5 text-[#37475e] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"><PhoneCall className="h-4 w-4 text-[#0b5ed7]" />Ramal: <strong>{ramal || 'não informado'}</strong></span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-[#dce6f3] bg-[#f6f9fe] px-3 py-1.5 text-[#37475e] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"><Building2 className="h-4 w-4 text-[#0b5ed7]" />{setorDestino ? `${setorDestino.sigla} · ${setorDestino.sala || 'sala não informada'}` : 'Setor não informado'}</span>
                </div>

                {/* ─── BLOCO DE CONFIRMAÇÕES INDIVIDUAIS POR RESPONSÁVEL (1 a 10) ─── */}
                {/* Meio da autorização */}
                <fieldset>
                  <legend className="mb-2 text-sm font-extrabold text-[#0d1f45] dark:text-slate-100">Como a autorização foi obtida?</legend>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {meios.map((meio) => {
                      const ativo = autorizacaoMeio === meio.valor;
                      return (
                        <label
                          key={meio.valor}
                          className={cn(
                            'flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#0d6efd]/40',
                            ativo
                              ? 'border-[#0d6efd] bg-[#eef5ff] text-[#0647c4] ring-2 ring-[#0d6efd]/25 dark:bg-blue-950/50 dark:text-sky-300'
                              : 'border-[#dce6f3] bg-white text-[#37475e] hover:border-[#9cc3f5] hover:bg-[#f6f9fe] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                          )}
                        >
                          <input type="radio" name="autorizacao-meio" value={meio.valor} checked={ativo} onChange={() => setAutorizacaoMeio(meio.valor)} className="sr-only" />
                          <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-lg', ativo ? 'bg-[#0d6efd] text-white' : 'bg-[#e9f2fd] text-[#0b5ed7] dark:bg-slate-800 dark:text-sky-300')}>{meio.icone}</span>
                          {meio.rotulo}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                {/* Confirmações individuais por responsável */}
                {temMultiplos ? (
                  <div className="rounded-2xl border-2 border-amber-300/80 bg-amber-50/60 p-4 dark:border-amber-500/40 dark:bg-amber-950/20">
                    {/* Cabeçalho do bloco */}
                    <div className="mb-4 flex items-center gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white shadow-xs">
                        <ShieldAlert className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-extrabold uppercase tracking-wider text-amber-900 dark:text-amber-200">
                          {destinatariosComAut.length === 1
                            ? 'Atenção: 1 responsável exige autorização formal'
                            : `Atenção: ${destinatariosComAut.length} responsáveis exigem autorização formal`}
                        </p>
                        <p className="text-[11px] text-amber-700 dark:text-amber-400">
                          Confirme individualmente cada responsável antes de liberar a entrada.
                        </p>
                      </div>
                      {/* Contador de confirmações */}
                      <span className={cn(
                        'ml-auto shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-extrabold border transition-colors',
                        todasConfirmadas
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-700'
                          : 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-700'
                      )}>
                        <CheckCircle2 className="h-3 w-3" />
                        {destinatariosComAut.filter(({ chave }) => autorizacoesIndividuais[chave]).length}/{destinatariosComAut.length}
                      </span>
                    </div>

                    {/* Cards de confirmação individual */}
                    <div className="space-y-3">
                      {destinatariosComAut.map(({ srv, setor, idx, chave }) => {
                        const confirmado = Boolean(autorizacoesIndividuais[chave]);
                        return (
                          <label
                            key={chave}
                            htmlFor={`conf-${chave}`}
                            className={cn(
                              'flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-3.5 transition-all duration-150 select-none',
                              confirmado
                                ? 'border-emerald-400 bg-emerald-50 shadow-xs shadow-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-500/60'
                                : 'border-amber-200 bg-white hover:border-amber-400 hover:bg-amber-50/60 dark:border-amber-700/40 dark:bg-slate-900/50 dark:hover:border-amber-500/60'
                            )}
                          >
                            {/* Checkbox estilizado */}
                            <div className="mt-0.5 shrink-0">
                              <input
                                id={`conf-${chave}`}
                                type="checkbox"
                                checked={confirmado}
                                onChange={() => toggleConfirmacao(chave)}
                                className="sr-only"
                              />
                              <div className={cn(
                                'w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all',
                                confirmado
                                  ? 'bg-emerald-500 border-emerald-500'
                                  : 'bg-white border-amber-400 dark:bg-slate-900 dark:border-amber-600'
                              )}>
                                {confirmado && (
                                  <svg viewBox="0 0 12 10" fill="none" className="w-3 h-3">
                                    <path d="M1 5l3.5 3.5L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                )}
                              </div>
                            </div>

                            {/* Avatar */}
                            <div className={cn(
                              'grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-extrabold text-white shadow-xs transition-all',
                              confirmado
                                ? 'bg-gradient-to-br from-emerald-400 to-emerald-600'
                                : 'bg-gradient-to-br from-amber-400 to-orange-500'
                            )}>
                              {srv ? srv.nome.charAt(0) : '?'}
                            </div>

                            {/* Dados do responsável */}
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-xs font-extrabold text-[#0d1f45] dark:text-slate-100">
                                  {srv?.nome || 'Responsável não identificado'}
                                </p>
                                {(srv?.ramal || setor?.ramal) && (
                                  <span className={cn(
                                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border',
                                    confirmado
                                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700'
                                      : 'bg-amber-100/70 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700/40'
                                  )}>
                                    <PhoneCall className="h-2.5 w-2.5" />
                                    {srv?.ramal || setor?.ramal}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-[#627289] dark:text-slate-400 mt-0.5">
                                {srv?.cargo || '—'}{setor ? ` · ${setor.sigla}` : ''}
                              </p>
                              {/* Texto de confirmação */}
                              <p className={cn(
                                'text-[11px] font-semibold mt-1.5 transition-colors',
                                confirmado ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-500'
                              )}>
                                {confirmado
                                  ? `✓ Confirmado — ${srv?.nome || 'Responsável'} autorizou a entrada de ${pessoaNome}.`
                                  : `Confirmo que ${srv?.nome || 'Responsável'} autorizou a entrada de ${pessoaNome}.`}
                              </p>
                            </div>

                            {/* Badge de status */}
                            <div className="shrink-0 self-center">
                              {confirmado ? (
                                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-700">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Confirmado
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-extrabold bg-amber-100/70 text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-700/50">
                                  <ShieldAlert className="h-3 w-3 text-amber-600" />
                                  Pendente
                                </span>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* Caso sem múltiplos — checkbox único legado */
                  <label
                    className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-4 transition-colors',
                      autorizacoesIndividuais['__unico__']
                        ? 'border-[#16a34a] bg-[#eefbf2] dark:bg-emerald-950/40'
                        : 'border-dashed border-[#c8d9ec] bg-[#fbfdff] hover:border-[#9cc3f5] dark:border-slate-700 dark:bg-slate-900'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(autorizacoesIndividuais['__unico__'])}
                      onChange={() => toggleConfirmacao('__unico__')}
                      className="mt-0.5 h-5 w-5 shrink-0 accent-[#16a34a]"
                    />
                    <span className="text-sm leading-relaxed text-[#37475e] dark:text-slate-300">
                      Confirmo que <strong className="text-[#0d1f45] dark:text-slate-100">{responsavelNome}</strong> autorizou a entrada de{' '}
                      <strong className="text-[#0d1f45] dark:text-slate-100">{pessoaNome}</strong>.
                      <span className="mt-1 block text-xs text-[#627289] dark:text-slate-400">
                        A confirmação fica registrada na entrada com seu nome e o horário.
                      </span>
                    </span>
                  </label>
                )}
                {/* ─── FIM DO BLOCO DE CONFIRMAÇÕES ─── */}
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-[#e3eaf4] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7 dark:border-slate-800">
                <button
                  type="button"
                  disabled={isSubmittingEntrada}
                  onClick={() => void registrarEntrada({ situacao: 'pendente' })}
                  className="inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3 text-sm font-semibold text-[#b45309] transition-colors hover:bg-amber-50 disabled:opacity-50 dark:text-amber-300 dark:hover:bg-amber-950/40"
                >
                  <Clock className="h-4 w-4" /> Sem resposta? Deixar pendente
                </button>
                <div className="flex gap-3">
                  <Button type="button" variant="outline" className="min-h-12 flex-1 rounded-xl px-6 sm:flex-none" onClick={() => setIsAutorizacaoModalOpen(false)}>Voltar</Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={!podeConfirmar}
                    isLoading={isSubmittingEntrada}
                    className="min-h-12 flex-1 rounded-xl border-0 bg-gradient-to-r from-[#0d6efd] to-[#0647c4] px-6 font-semibold shadow-[0_12px_24px_-10px_rgba(13,110,253,.7)] sm:flex-none"
                  >
                    <ShieldCheck className="h-5 w-5" /> Confirmar entrada
                  </Button>
                </div>
              </div>
            </form>
          );
        })()}
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

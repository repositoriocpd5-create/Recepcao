import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CalendarDays, Cctv, Check, ChevronDown, ClipboardList, Clock, Loader2, MapPin, MoonStar, Pencil, Plus, RotateCcw, Save, Send, ShieldCheck, Wrench, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  TIPOS_PROBLEMA_CAMERA,
  agoraBrasilia,
  ccoService,
  formatarData,
  hojeBrasilia,
  novoIdentificador,
  prepararFoto,
  validarFoto,
} from '@/services/ccoService';
import { CcoOcorrencia, CcoTipoRegistro, UserProfile } from '@/types';
import { Campo, CampoHora, MensagemErro, caixaCampo, horaValida } from './campos';
import { CampoFoto, FotoSelecionada } from './CampoFoto';
import { SeletorCameras, SeletorLocais } from './SeletorCameras';
import { Cartao, Confirmacao, IconeTitulo, botaoPrimario, botaoSecundario } from './ui';

const DESCRICAO_MIN = 10;
const DESCRICAO_MAX = 4000;
const ORIENTACAO = 'Descreva o que aconteceu, o local ou a câmera envolvida e outras informações que ajudem no atendimento.';
const ORIENTACAO_CAMERA = 'Ex.: a câmera do portão principal ficou sem imagem durante o período informado.';

type CampoId = 'cameras' | 'tipoProblema' | 'data' | 'horaInicio' | 'horaFim' | 'descricao' | 'foto';
type Erros = Partial<Record<CampoId, string>>;
type Estado = 'parado' | 'enviando' | 'sucesso' | 'erro';

const ORDEM_CAMPOS: CampoId[] = ['cameras', 'tipoProblema', 'data', 'horaInicio', 'horaFim', 'descricao', 'foto'];
const ID_CAMPO: Record<CampoId, string> = {
  cameras: 'cco-cameras',
  tipoProblema: 'cco-tipo-outro',
  data: 'cco-data',
  horaInicio: 'cco-hora-inicio',
  horaFim: 'cco-hora-fim',
  descricao: 'cco-descricao',
  foto: 'cco-foto',
};

const diaSeguinteDe = (data: string) => {
  const d = new Date(`${data}T12:00:00`);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};

const OUTRO = 'Outro';
const TIPO_MAX = 80;
const CHAVE_TIPOS = 'sme_cco_tipos_problema';

/** Tipos criados pela unidade em "Outro": ficam neste navegador e passam a aparecer na lista. */
const lerTiposExtras = (): string[] => {
  try {
    const lista = JSON.parse(localStorage.getItem(CHAVE_TIPOS) || '[]');
    return Array.isArray(lista) ? lista.filter((t): t is string => typeof t === 'string' && Boolean(t.trim())).slice(0, 30) : [];
  } catch {
    return [];
  }
};

const gravarTiposExtras = (lista: string[]) => {
  try { localStorage.setItem(CHAVE_TIPOS, JSON.stringify(lista)); } catch {}
};

const normalizarTipo = (texto: string) => texto.trim().replace(/\s+/g, ' ').slice(0, TIPO_MAX);

/** "20:30" → minutos do dia. */
const minutos = (hora: string) => Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3, 5));

const formatarDuracao = (total: number) => {
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${String(m).padStart(2, '0')} min` : `${h} h`;
};

/** Cada tipo tem cor própria (azul = ocorrência, âmbar = câmera de segurança) para não confundir os dois. */
const TIPOS: {
  valor: CcoTipoRegistro;
  titulo: string;
  texto: string;
  icone: React.ReactNode;
  cor: { ativo: string; inativo: string; icone: string; iconeAtivo: string; radio: string };
}[] = [
  {
    valor: 'ocorrencia',
    titulo: 'Registrar uma ocorrência',
    texto: 'Comunique um fato ocorrido na unidade escolar.',
    icone: <ClipboardList className="h-7 w-7" aria-hidden="true" />,
    cor: {
      ativo: 'border-[#3b8cf0] bg-[#f3f8ff] dark:border-sky-500 dark:bg-sky-500/10',
      inativo: 'hover:border-[#9cc3f2]',
      icone: 'bg-[#e6f0fc] text-[#0b63ce] dark:bg-sky-500/15 dark:text-sky-300',
      iconeAtivo: 'bg-[#0b63ce] text-white dark:bg-sky-500 dark:text-white',
      radio: 'accent-[#0b63ce]',
    },
  },
  {
    valor: 'camera',
    titulo: 'Relatar problema em câmera(s)',
    texto: 'Informe falhas em uma ou mais câmeras de segurança.',
    icone: (
      <span className="relative inline-block" aria-hidden="true">
        <Cctv className="h-8 w-8" />
        <Wrench className="absolute -bottom-1 -right-2 h-[18px] w-[18px] rounded-full bg-white p-px text-[#b45309] dark:bg-[#121826] dark:text-amber-300" />
      </span>
    ),
    cor: {
      ativo: 'border-[#f59e0b] bg-[#fffbeb] dark:border-amber-500 dark:bg-amber-500/10',
      inativo: 'hover:border-[#fcd34d]',
      icone: 'bg-[#fef3c7] text-[#b45309] dark:bg-amber-500/15 dark:text-amber-300',
      iconeAtivo: 'bg-[#d97706] text-white dark:bg-amber-500 dark:text-white',
      radio: 'accent-[#d97706]',
    },
  },
];

interface Props {
  user: UserProfile;
  unidadeId: string;
  unidadeNome?: string;
  onRegistrada: (ocorrencia: CcoOcorrencia) => void;
  /** Ocorrência que a unidade está corrigindo (antes de o administrador visualizar). */
  edicao?: CcoOcorrencia;
  onEditada?: (ocorrencia: CcoOcorrencia) => void;
  onCancelarEdicao?: () => void;
}

export const FormularioOcorrencia: React.FC<Props> = ({ user, unidadeId, unidadeNome, onRegistrada, edicao, onEditada, onCancelarEdicao }) => {
  const [data, setData] = useState(() => edicao?.data_ocorrencia ?? hojeBrasilia());
  const [horaInicio, setHoraInicio] = useState(() => edicao?.hora_inicio.slice(0, 5) ?? '');
  const [horaFim, setHoraFim] = useState(() => edicao?.hora_fim?.slice(0, 5) ?? '');
  const [emAndamento, setEmAndamento] = useState(() => edicao?.em_andamento ?? false);
  const [diaSeguinte, setDiaSeguinte] = useState(() => edicao?.termina_dia_seguinte ?? false);
  const [descricao, setDescricao] = useState(() => edicao?.descricao ?? '');
  const [tipoRegistro, setTipoRegistro] = useState<CcoTipoRegistro>(() => edicao?.tipo_registro ?? 'ocorrencia');
  const [cameras, setCameras] = useState<string[]>(() => edicao?.cameras ?? []);
  const [locais, setLocais] = useState<string[]>(() => edicao?.locais ?? []);
  const [tipoProblema, setTipoProblema] = useState(() => edicao?.tipo_problema || TIPOS_PROBLEMA_CAMERA[0]);
  const [tiposExtras, setTiposExtras] = useState<string[]>(lerTiposExtras);
  const [novoTipo, setNovoTipo] = useState('');
  // O tipo gravado pode ter sido criado em outro navegador: entra na lista para continuar selecionado.
  const tipoGravado = edicao?.tipo_problema;
  const opcoesTipo = [
    ...TIPOS_PROBLEMA_CAMERA.filter((t) => t !== OUTRO),
    ...tiposExtras,
    ...(tipoGravado && !TIPOS_PROBLEMA_CAMERA.includes(tipoGravado) && !tiposExtras.includes(tipoGravado) ? [tipoGravado] : []),
    OUTRO,
  ];

  /** Inclui o tipo digitado na lista (sem repetir) e já o deixa selecionado. */
  const adicionarTipo = (texto = novoTipo): string | null => {
    const nome = normalizarTipo(texto);
    if (!nome) return null;
    const igual = opcoesTipo.find((t) => t.toLocaleLowerCase('pt-BR') === nome.toLocaleLowerCase('pt-BR'));
    if (igual && igual !== OUTRO) {
      setTipoProblema(igual);
    } else if (!igual) {
      const lista = [...tiposExtras, nome];
      setTiposExtras(lista);
      gravarTiposExtras(lista);
      setTipoProblema(nome);
    } else {
      return null;
    }
    setNovoTipo('');
    if (erros.tipoProblema) setErros((atual) => ({ ...atual, tipoProblema: undefined }));
    return igual && igual !== OUTRO ? igual : nome;
  };
  const [foto, setFoto] = useState<FotoSelecionada | null>(null);
  // Na edição, false = manter a foto que já está gravada.
  const [fotoAlterada, setFotoAlterada] = useState(false);
  const [processandoFoto, setProcessandoFoto] = useState(false);
  const [erros, setErros] = useState<Erros>({});
  const [estado, setEstado] = useState<Estado>('parado');
  const [mensagemEnvio, setMensagemEnvio] = useState('');
  const [perguntarDiaSeguinte, setPerguntarDiaSeguinte] = useState(false);
  const [confirmarLimpar, setConfirmarLimpar] = useState(false);
  // Trava contra clique duplo e identificador do envio (repetir o mesmo envio não duplica).
  const enviando = useRef(false);
  const idEnvio = useRef<string | null>(null);
  const formulario = useRef<HTMLFormElement>(null);

  const camera = tipoRegistro === 'camera';
  const temDados = Boolean(horaInicio || horaFim || emAndamento || descricao.trim() || foto || cameras.length || locais.length || data !== hojeBrasilia());
  const duracao =
    !emAndamento && horaValida(horaInicio) && horaValida(horaFim)
      ? (minutos(horaFim) - minutos(horaInicio) + 1440) % 1440
      : null;

  // Libera a memória da prévia da foto.
  useEffect(() => () => { if (foto) URL.revokeObjectURL(foto.url); }, [foto]);

  // Edição: leva a pessoa até o formulário.
  useEffect(() => {
    if (edicao) formulario.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [edicao]);

  // Edição: mostra a foto atual como prévia.
  useEffect(() => {
    if (!edicao?.foto_path) return;
    let ativo = true;
    setProcessandoFoto(true);
    ccoService
      .urlFoto(edicao.foto_path)
      .then(async (url) => {
        if (!url) return;
        const blob = await (await fetch(url)).blob();
        if (ativo) setFoto({ nome: 'Foto atual', blob, url: URL.createObjectURL(blob) });
      })
      .catch(() => {})
      .finally(() => { if (ativo) setProcessandoFoto(false); });
    return () => { ativo = false; };
  }, [edicao?.foto_path]);

  /** Qualquer alteração depois de um envio com erro vira um novo envio. */
  const alterou = (campo?: CampoId) => {
    idEnvio.current = null;
    if (estado === 'erro' || estado === 'sucesso') setEstado('parado');
    if (campo && erros[campo]) setErros((atual) => ({ ...atual, [campo]: undefined }));
  };

  const mudarHoraInicio = (valor: string) => { setHoraInicio(valor); setDiaSeguinte(false); alterou('horaInicio'); };
  const mudarHoraFim = (valor: string) => { setHoraFim(valor); setDiaSeguinte(false); alterou('horaFim'); };

  const receberFoto = async (arquivo: File) => {
    alterou('foto');
    setFotoAlterada(true);
    const problema = validarFoto(arquivo);
    if (problema) {
      setErros((atual) => ({ ...atual, foto: problema }));
      return;
    }
    setProcessandoFoto(true);
    try {
      const blob = await prepararFoto(arquivo);
      setFoto({ nome: arquivo.name || 'foto.jpg', blob, url: URL.createObjectURL(blob) });
    } catch (err) {
      setErros((atual) => ({ ...atual, foto: err instanceof Error ? err.message : 'Não foi possível ler a foto.' }));
    } finally {
      setProcessandoFoto(false);
    }
  };

  const validar = (): Erros => {
    const novos: Erros = {};
    if (camera && !cameras.length) novos.cameras = 'Selecione pelo menos uma câmera.';
    if (camera && tipoProblema === OUTRO && !normalizarTipo(novoTipo)) novos.tipoProblema = 'Digite o tipo de problema e toque em Adicionar.';
    const hoje = hojeBrasilia();
    const agora = agoraBrasilia();
    if (!data) novos.data = 'Informe a data da ocorrência.';
    else if (data > hoje) novos.data = 'A data não pode ser futura.';

    if (!horaInicio) novos.horaInicio = 'Informe o horário inicial.';
    else if (!horaValida(horaInicio)) novos.horaInicio = 'Horário inválido. Use o formato 24 h, por exemplo 08:30 ou 14:05.';
    else if (data === hoje && horaInicio > agora) novos.horaInicio = 'Este horário ainda não chegou.';

    if (!emAndamento) {
      if (!horaFim) novos.horaFim = 'Informe o horário final ou marque “Ocorrência em andamento”.';
      else if (!horaValida(horaFim)) novos.horaFim = 'Horário inválido. Use o formato 24 h, por exemplo 17:45.';
      else if (data === hoje && (diaSeguinte || horaFim > agora) && !novos.horaInicio) {
        novos.horaFim = 'Este horário ainda não chegou. Se a ocorrência continua, marque “Ocorrência em andamento”.';
      }
    }

    const texto = descricao.trim();
    if (!texto) novos.descricao = camera ? 'Explique a falha identificada.' : 'Descreva o que aconteceu.';
    else if (texto.length < DESCRICAO_MIN) novos.descricao = `Descreva com pelo menos ${DESCRICAO_MIN} caracteres.`;
    else if (texto.length > DESCRICAO_MAX) novos.descricao = `A descrição pode ter até ${DESCRICAO_MAX} caracteres.`;
    return novos;
  };

  const focarPrimeiroErro = (lista: Erros) => {
    const primeiro = ORDEM_CAMPOS.find((campo) => lista[campo]);
    if (!primeiro) return;
    const elemento = document.getElementById(ID_CAMPO[primeiro]);
    elemento?.focus();
    elemento?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  };

  const limpar = () => {
    if (foto) URL.revokeObjectURL(foto.url);
    setData(hojeBrasilia());
    setHoraInicio('');
    setHoraFim('');
    setEmAndamento(false);
    setDiaSeguinte(false);
    setDescricao('');
    setCameras([]);
    setLocais([]);
    setTipoProblema(TIPOS_PROBLEMA_CAMERA[0]);
    setNovoTipo('');
    setFoto(null);
    setErros({});
    setMensagemEnvio('');
    idEnvio.current = null;
  };

  const enviar = async (terminaDiaSeguinte: boolean) => {
    if (enviando.current) return;
    // "Outro" com texto digitado e sem tocar em Adicionar: inclui o tipo agora.
    const tipoFinal = camera && tipoProblema === OUTRO ? adicionarTipo() : tipoProblema;
    if (camera && !tipoFinal) return;
    enviando.current = true;
    idEnvio.current ??= novoIdentificador();
    setEstado('enviando');
    setMensagemEnvio('');
    try {
      if (edicao) {
        const editada = await ccoService.editarOcorrencia(user, edicao.id, {
          data_ocorrencia: data,
          hora_inicio: horaInicio,
          hora_fim: emAndamento ? null : horaFim,
          em_andamento: emAndamento,
          termina_dia_seguinte: !emAndamento && terminaDiaSeguinte,
          descricao: descricao.trim(),
          tipo_registro: tipoRegistro,
          cameras: camera ? cameras : null,
          tipo_problema: camera ? tipoFinal : null,
          locais: camera || !locais.length ? null : locais,
          alterar_foto: fotoAlterada,
          foto: fotoAlterada ? foto?.blob ?? null : null,
        });
        setEstado('sucesso');
        onEditada?.(editada);
        return;
      }
      const ocorrencia = await ccoService.registrarOcorrencia(user, {
        client_request_id: idEnvio.current,
        unidade_id: unidadeId,
        data_ocorrencia: data,
        hora_inicio: horaInicio,
        hora_fim: emAndamento ? null : horaFim,
        em_andamento: emAndamento,
        termina_dia_seguinte: !emAndamento && terminaDiaSeguinte,
        descricao: descricao.trim(),
        tipo_registro: tipoRegistro,
        cameras: camera ? cameras : null,
        tipo_problema: camera ? tipoFinal : null,
        locais: camera || !locais.length ? null : locais,
        foto: foto?.blob ?? null,
      });
      // Só limpa depois de confirmado que os dados foram salvos.
      limpar();
      setEstado('sucesso');
      onRegistrada(ocorrencia);
      window.setTimeout(() => setEstado((atual) => (atual === 'sucesso' ? 'parado' : atual)), 3000);
    } catch (err) {
      setEstado('erro');
      setMensagemEnvio(err instanceof Error ? err.message : edicao ? 'Não foi possível salvar as alterações.' : camera ? 'Não foi possível enviar o relato.' : 'Não foi possível registrar a ocorrência.');
    } finally {
      enviando.current = false;
    }
  };

  const aoEnviar = (e: React.FormEvent) => {
    e.preventDefault();
    if (enviando.current || processandoFoto) return;
    const novos = validar();
    setErros(novos);
    if (Object.values(novos).some(Boolean)) {
      setEstado('parado');
      focarPrimeiroErro(novos);
      return;
    }
    if (!emAndamento && horaFim < horaInicio && !diaSeguinte) {
      setPerguntarDiaSeguinte(true);
      return;
    }
    void enviar(!emAndamento && horaFim < horaInicio);
  };

  const ocupado = estado === 'enviando';
  const caracteres = descricao.trim().length;

  return (
    <Cartao aria-labelledby="cco-form-titulo">
      <form ref={formulario} onSubmit={aoEnviar} noValidate className="px-4 pb-5 pt-5 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-4">
            <IconeTitulo className="h-14 w-14 rounded-2xl ring-0">
              {edicao ? <Pencil className="h-7 w-7" aria-hidden="true" /> : <ClipboardList className="h-7 w-7" aria-hidden="true" />}
            </IconeTitulo>
            <div className="min-w-0">
              <h2 id="cco-form-titulo" className="text-2xl font-extrabold tracking-tight text-[#0d2240] dark:text-slate-100">
                {edicao ? `Editar registro ${edicao.protocolo}` : 'Novo registro'}
              </h2>
              <p className="mt-0.5 text-[15px] text-[#5f7391] dark:text-slate-400">
                {edicao ? 'Você pode corrigir os dados até o administrador visualizar a ocorrência.' : 'Escolha o tipo de registro para continuar.'}
              </p>
            </div>
          </div>
          <p className="pt-1 text-sm text-[#3b4d68] dark:text-slate-400"><span className="text-rose-500" aria-hidden="true">*</span> Campos obrigatórios</p>
        </div>

        <fieldset className="mt-4">
          <legend className="sr-only">Tipo de registro</legend>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {TIPOS.map((tipo) => {
              const ativo = tipoRegistro === tipo.valor;
              return (
                <label
                  key={tipo.valor}
                  className={cn(
                    'flex min-h-[88px] cursor-pointer items-center gap-4 rounded-xl border-2 px-4 py-3 transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#0b63ce]',
                    ativo
                      ? tipo.cor.ativo
                      : cn('border-[#dbe6f3] bg-white dark:border-slate-700 dark:bg-transparent', tipo.cor.inativo),
                    ocupado && 'cursor-not-allowed opacity-70',
                  )}
                >
                  <input
                    type="radio"
                    name="cco-tipo-registro"
                    value={tipo.valor}
                    checked={ativo}
                    disabled={ocupado}
                    onChange={() => {
                      setTipoRegistro(tipo.valor);
                      alterou();
                      if (erros.cameras) setErros((atual) => ({ ...atual, cameras: undefined }));
                    }}
                    className={cn('h-6 w-6 shrink-0 cursor-pointer focus-visible:outline-none', tipo.cor.radio)}
                  />
                  <span className={cn('grid h-16 w-16 shrink-0 place-items-center rounded-full transition-colors', ativo ? tipo.cor.iconeAtivo : tipo.cor.icone)}>
                    {tipo.icone}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-lg font-bold text-[#0d2240] dark:text-slate-100">{tipo.titulo}</span>
                    <span className="block text-[15px] text-[#5f7391] dark:text-slate-400">{tipo.texto}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {camera && (
          <section aria-labelledby="cco-detalhes-titulo" className="mt-5">
            <h3 id="cco-detalhes-titulo" className="text-lg font-extrabold text-[#0d2240] dark:text-slate-100">Detalhes do problema</h3>
            <div className="mt-2 grid grid-cols-1 gap-x-5 gap-y-4 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="min-w-0">
                <label htmlFor={ID_CAMPO.cameras} className="block text-[15px] font-bold text-[#10233f] dark:text-slate-200">
                  Câmera(s) com problema<span className="ml-0.5 text-rose-500" aria-hidden="true">*</span>
                </label>
                <p className="mb-1.5 text-[13px] text-[#5f7391] dark:text-slate-400">Selecione uma ou mais câmeras</p>
                <SeletorCameras
                  id={ID_CAMPO.cameras}
                  valor={cameras}
                  disabled={ocupado}
                  erro={erros.cameras}
                  onChange={(lista) => { setCameras(lista); alterou('cameras'); }}
                />
                <MensagemErro id={`${ID_CAMPO.cameras}-erro`}>{erros.cameras}</MensagemErro>
              </div>
              <div className="min-w-0 lg:pt-[22px]">
                <label htmlFor="cco-tipo-problema" className="mb-1.5 block text-[15px] font-bold text-[#10233f] dark:text-slate-200">Tipo de problema</label>
                <div className="relative">
                  <select
                    id="cco-tipo-problema"
                    value={tipoProblema}
                    disabled={ocupado}
                    onChange={(e) => { setTipoProblema(e.target.value); alterou(); }}
                    className={cn(caixaCampo(), 'min-h-[52px] cursor-pointer appearance-none pr-12')}
                  >
                    {opcoesTipo.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#10233f] dark:text-slate-300" aria-hidden="true" />
                </div>
                {tipoProblema === OUTRO && (
                  <div className="mt-2">
                    <label htmlFor={ID_CAMPO.tipoProblema} className="mb-1 block text-[13px] font-semibold text-[#3b4d68] dark:text-slate-300">
                      Novo tipo de problema<span className="ml-0.5 text-rose-500" aria-hidden="true">*</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        id={ID_CAMPO.tipoProblema}
                        value={novoTipo}
                        maxLength={TIPO_MAX}
                        disabled={ocupado}
                        autoFocus
                        onChange={(e) => {
                          setNovoTipo(e.target.value);
                          alterou('tipoProblema');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            adicionarTipo();
                          }
                        }}
                        placeholder="Ex.: Imagem embaçada"
                        aria-invalid={Boolean(erros.tipoProblema)}
                        aria-describedby={erros.tipoProblema ? `${ID_CAMPO.tipoProblema}-erro` : undefined}
                        className={cn(caixaCampo(erros.tipoProblema), 'min-w-0 flex-1')}
                      />
                      <button
                        type="button"
                        disabled={ocupado || !normalizarTipo(novoTipo)}
                        onClick={() => adicionarTipo()}
                        className="inline-flex min-h-12 shrink-0 items-center gap-1.5 rounded-xl bg-[#0b63ce] px-4 text-sm font-bold text-white hover:bg-[#0a56b4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b63ce] disabled:opacity-50"
                      >
                        <Plus className="h-4 w-4" aria-hidden="true" /> Adicionar
                      </button>
                    </div>
                    <MensagemErro id={`${ID_CAMPO.tipoProblema}-erro`}>{erros.tipoProblema}</MensagemErro>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        <fieldset className="mt-4 rounded-2xl border border-[#dbe6f3] bg-[#f3f8fe] px-4 py-4 sm:px-5 dark:border-slate-800 dark:bg-slate-900/40">
          <legend className="sr-only">Quando aconteceu</legend>
          <p className="flex items-center gap-3 text-lg font-extrabold text-[#0d2240] dark:text-slate-100" aria-hidden="true">
            <Clock className="h-6 w-6 text-[#0b63ce] dark:text-sky-300" /> Quando aconteceu
          </p>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="flex flex-1 flex-wrap items-start gap-x-5 gap-y-3">
              <Campo id={ID_CAMPO.data} rotulo="Data" obrigatorio erro={erros.data} className="w-full sm:w-[190px]">
                <input
                  id={ID_CAMPO.data}
                  type="date"
                  value={data}
                  max={hojeBrasilia()}
                  disabled={ocupado}
                  onChange={(e) => { setData(e.target.value); alterou('data'); }}
                  aria-invalid={Boolean(erros.data)}
                  aria-describedby={erros.data ? `${ID_CAMPO.data}-erro` : undefined}
                  className={cn(caixaCampo(erros.data), 'font-medium')}
                />
              </Campo>
              <Campo id={ID_CAMPO.horaInicio} rotulo="Horário inicial" obrigatorio erro={erros.horaInicio} className="w-[calc(50%-10px)] sm:w-[134px]">
                <CampoHora id={ID_CAMPO.horaInicio} valor={horaInicio} onChange={mudarHoraInicio} erro={erros.horaInicio} disabled={ocupado} rotuloAgora="Usar o horário atual no horário inicial" />
              </Campo>
              <Campo id={ID_CAMPO.horaFim} rotulo="Horário final" obrigatorio={!emAndamento} erro={erros.horaFim} className="w-[calc(50%-10px)] sm:w-[134px]">
                <CampoHora
                  id={ID_CAMPO.horaFim}
                  valor={emAndamento ? '' : horaFim}
                  onChange={mudarHoraFim}
                  erro={erros.horaFim}
                  disabled={ocupado || emAndamento}
                  rotuloAgora="Usar o horário atual no horário final"
                />
              </Campo>
              <p className="flex min-h-12 items-center gap-2 text-[15px] text-[#3b4d68] sm:mt-[26px] dark:text-slate-300" aria-live="polite">
                <Clock className="h-5 w-5 text-[#3b4d68] dark:text-slate-400" aria-hidden="true" />
                {emAndamento ? 'Em andamento' : `Duração: ${duracao === null ? '—' : formatarDuracao(duracao)}`}
              </p>
              {!camera && (
                <div className="w-full min-w-0 xl:w-auto xl:min-w-[260px] xl:flex-1">
                  <label htmlFor="cco-locais" className="mb-1.5 flex items-center gap-1.5 text-[15px] font-bold text-[#10233f] dark:text-slate-200">
                    <MapPin className="h-4 w-4 text-[#0b63ce] dark:text-sky-300" aria-hidden="true" /> Local da ocorrência
                    <span className="text-xs font-semibold text-[#5f7391] dark:text-slate-400">(opcional)</span>
                  </label>
                  <SeletorLocais id="cco-locais" valor={locais} disabled={ocupado} onChange={setLocais} />
                </div>
              )}
            </div>
            <span className="hidden w-px self-stretch bg-[#d3deec] lg:block dark:bg-slate-700" aria-hidden="true" />
            <label className="flex cursor-pointer select-none items-center gap-4 lg:w-[300px] lg:pl-4">
              <button
                type="button"
                role="switch"
                aria-labelledby="cco-andamento-rotulo"
                aria-checked={emAndamento}
                disabled={ocupado}
                onClick={() => {
                  setEmAndamento((atual) => !atual);
                  setDiaSeguinte(false);
                  alterou('horaFim');
                }}
                className={cn(
                  'relative h-9 w-16 shrink-0 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b63ce] disabled:opacity-60',
                  emAndamento ? 'bg-[#0b63ce]' : 'bg-[#d5dde8] dark:bg-slate-700',
                )}
              >
                <span className={cn('absolute left-1 top-1 h-7 w-7 rounded-full bg-white shadow transition-transform', emAndamento && 'translate-x-7')} />
              </button>
              <span>
                <span id="cco-andamento-rotulo" className="block text-[15px] font-bold text-[#0d2240] dark:text-slate-100">{camera ? 'Problema em andamento' : 'Ocorrência em andamento'}</span>
                <span className="block text-[13px] text-[#5f7391] dark:text-slate-400">{camera ? 'Ative se a falha persistir.' : 'Ative se a ocorrência continua.'}</span>
              </span>
            </label>
          </div>
          {diaSeguinte && !emAndamento && (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
              <MoonStar className="h-3.5 w-3.5" aria-hidden="true" />
              Termina no dia seguinte ({formatarData(diaSeguinteDe(data))})
              <button type="button" onClick={() => setDiaSeguinte(false)} className="ml-1 rounded px-1 underline underline-offset-2 hover:text-indigo-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600">
                desfazer
              </button>
            </p>
          )}
        </fieldset>

        <div className="mt-5 grid grid-cols-1 gap-x-6 gap-y-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            <label htmlFor={ID_CAMPO.descricao} className="block text-lg font-extrabold text-[#0d2240] dark:text-slate-100">
              {camera ? 'Descrição do problema' : 'Descrição da ocorrência'}<span className="ml-0.5 text-rose-500" aria-hidden="true">*</span>
            </label>
            <p className="mb-2 text-[13px] text-[#5f7391] dark:text-slate-400">
              {camera ? 'Explique a falha identificada nas câmeras selecionadas.' : 'Conte o que aconteceu, o local e o que mais ajudar no atendimento.'}
            </p>
            <textarea
              id={ID_CAMPO.descricao}
              value={descricao}
              disabled={ocupado}
              onChange={(e) => { setDescricao(e.target.value); alterou('descricao'); }}
              placeholder={camera ? ORIENTACAO_CAMERA : ORIENTACAO}
              rows={6}
              maxLength={DESCRICAO_MAX}
              aria-invalid={Boolean(erros.descricao)}
              aria-describedby={`${ID_CAMPO.descricao}-contador${erros.descricao ? ` ${ID_CAMPO.descricao}-erro` : ''}`}
              className={cn(caixaCampo(erros.descricao), 'min-h-[168px] resize-y py-3 leading-relaxed', !erros.descricao && 'border-[#3b8cf0]/70')}
            />
            <MensagemErro id={`${ID_CAMPO.descricao}-erro`}>{erros.descricao}</MensagemErro>
            <p id={`${ID_CAMPO.descricao}-contador`} className="mt-1 text-right text-[13px] tabular-nums text-[#5f7391] dark:text-slate-500">
              {caracteres ? `${caracteres.toLocaleString('pt-BR')} de 4.000 caracteres` : 'Até 4.000 caracteres'}
            </p>
          </div>

          <div className="min-w-0">
            <p className="mb-2 flex items-center gap-2.5" id={`${ID_CAMPO.foto}-rotulo`}>
              <span className="text-lg font-extrabold text-[#0d2240] dark:text-slate-100">Foto</span>
              <span className="rounded-full bg-[#e8f1fd] px-2.5 py-0.5 text-[13px] text-[#3b4d68] dark:bg-slate-800 dark:text-slate-300">Opcional</span>
            </p>
            <CampoFoto
              id={ID_CAMPO.foto}
              foto={foto}
              processando={processandoFoto}
              erro={erros.foto}
              disabled={ocupado}
              onArquivo={receberFoto}
              onRemover={() => {
                if (foto) URL.revokeObjectURL(foto.url);
                setFoto(null);
                setFotoAlterada(true);
                alterou('foto');
              }}
            />
          </div>
        </div>

        {estado === 'erro' && mensagemEnvio && (
          <div role="alert" className="mt-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-950/30 dark:text-rose-200">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-bold">{edicao ? 'As alterações não foram salvas.' : camera ? 'O relato não foi enviado.' : 'A ocorrência não foi registrada.'}</p>
              <p className="mt-0.5">{mensagemEnvio}</p>
              <p className="mt-1 text-rose-700/80 dark:text-rose-300/80">Os dados continuam no formulário. Confira e tente novamente.</p>
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-col gap-4 border-t border-[#e6edf6] pt-4 md:flex-row md:items-center md:justify-between dark:border-slate-800">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#eef4fc] text-[#0b63ce] dark:bg-slate-800 dark:text-sky-300">
              <ShieldCheck className="h-6 w-6" aria-hidden="true" />
            </span>
            <p className="text-sm text-[#5f7391] dark:text-slate-400">
              <strong className="block font-bold text-[#0d2240] dark:text-slate-100">Confira os dados antes de enviar.</strong>
              Registro vinculado à sua unidade escolar.
            </p>
          </div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={ocupado}
              onClick={() => (edicao ? onCancelarEdicao?.() : temDados ? setConfirmarLimpar(true) : limpar())}
              className={cn(botaoSecundario, 'w-full sm:w-auto sm:min-w-[140px]')}
            >
              {edicao ? <><X className="h-4 w-4" aria-hidden="true" /> Cancelar edição</> : <><RotateCcw className="h-4 w-4" aria-hidden="true" /> Limpar</>}
            </button>
            <button
              type="submit"
              disabled={ocupado || processandoFoto}
              aria-busy={ocupado}
              className={cn(
                botaoPrimario,
                'w-full sm:w-auto sm:min-w-[200px]',
                estado === 'sucesso' && 'bg-green-600 hover:bg-green-600 shadow-[0_10px_20px_-12px_rgba(5,150,105,.9)]',
                estado === 'erro' && 'bg-rose-600 hover:bg-rose-700 shadow-none',
              )}
            >
              {estado === 'enviando' ? (
                <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> {edicao ? 'Salvando…' : 'Enviando…'}</>
              ) : estado === 'sucesso' ? (
                <><Check className="h-4 w-4" aria-hidden="true" /> {edicao ? 'Alterações salvas' : camera ? 'Relato enviado' : 'Ocorrência registrada'}</>
              ) : estado === 'erro' ? (
                <><RotateCcw className="h-4 w-4" aria-hidden="true" /> Tentar novamente</>
              ) : (
                edicao
                  ? <><Save className="h-4 w-4" aria-hidden="true" /> Salvar alterações</>
                  : <><Send className="h-4 w-4" aria-hidden="true" /> {camera ? 'Enviar relato' : 'Enviar ocorrência'}</>
              )}
            </button>
          </div>
        </div>
        <p className="sr-only" aria-live="polite">
          {estado === 'enviando' ? 'Enviando o registro.' : estado === 'sucesso' ? 'Registro enviado.' : ''}
        </p>
      </form>

      <Confirmacao
        aberta={perguntarDiaSeguinte}
        titulo="A ocorrência terminou no dia seguinte?"
        mensagem={
          <>
            O horário final (<strong>{horaFim}</strong>) é menor que o inicial (<strong>{horaInicio}</strong>).
            {' '}Confirme se a ocorrência começou em {formatarData(data)} e terminou em <strong>{formatarData(diaSeguinteDe(data))}</strong>.
          </>
        }
        confirmar="Sim, terminou no dia seguinte"
        cancelar="Não, corrigir o horário"
        onFechar={() => setPerguntarDiaSeguinte(false)}
        onCancelar={() => {
          setPerguntarDiaSeguinte(false);
          setErros((atual) => ({ ...atual, horaFim: 'O horário final não pode ser anterior ao inicial no mesmo dia.' }));
          window.setTimeout(() => document.getElementById(ID_CAMPO.horaFim)?.focus(), 50);
        }}
        onConfirmar={() => {
          setPerguntarDiaSeguinte(false);
          setDiaSeguinte(true);
          // Termina amanhã, mas a data é hoje: o horário final ainda não chegou.
          if (data === hojeBrasilia()) {
            setErros((atual) => ({ ...atual, horaFim: 'Este horário ainda não chegou. Se a ocorrência continua, marque “Ocorrência em andamento”.' }));
            return;
          }
          void enviar(true);
        }}
      />

      <Confirmacao
        aberta={confirmarLimpar}
        titulo="Limpar o formulário?"
        mensagem="Os dados preenchidos e a foto anexada serão descartados. Esta ação não pode ser desfeita."
        confirmar="Limpar formulário"
        cancelar="Continuar preenchendo"
        perigo
        onCancelar={() => setConfirmarLimpar(false)}
        onConfirmar={() => {
          setConfirmarLimpar(false);
          limpar();
          setEstado('parado');
        }}
      />
    </Cartao>
  );
};

import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  FileText,
  ImageOff,
  Loader2,
  MessageSquare,
  MoonStar,
  Pencil,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Save,
  UserRound,
  Trash2,
  History,
  ChevronDown,
  MapPin,
  ExternalLink,
  Camera,
  Maximize2,
  Navigation,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import { perfilCco } from '@/lib/modulos';
import {
  ORDEM_SITUACOES,
  SITUACOES,
  ccoService,
  descreverEvento,
  descreverHorario,
  formatarData,
  formatarDataHora,
  gravidadeDe,
  motivoSemEdicao,
} from '@/services/ccoService';
import { SUGESTAO_IMAGENS, primeiroNome } from '@/lib/gravidadeCco';
import { CcoHistorico, CcoOcorrencia, CcoSituacao, UserProfile } from '@/types';
import { Campo, CampoHora, caixaCampo, completarHora, horaValida } from './campos';
import { Carregando, ESTILO_SITUACAO, SituacaoBadge, botaoPrimario } from './ui';
import { Atendimento, formatarVisita } from './Atendimento';
import { useUnidade } from '../hooks';
import { LOCALIZACOES_UNIDADES } from '@/services/localizacoesUnidades';

/**
 * Nome da unidade e, ao lado, a localização do Mapa da Rede: bairro e link para o ponto exato
 * no Google Maps (o mesmo do mapa). O endereço de rua não é exibido porque a base de ruas
 * disponível é imprecisa em Itaguaí.
 */
const UnidadeComEndereco: React.FC<{ oc: CcoOcorrencia }> = ({ oc }) => {
  const unidade = useUnidade(oc.unidade_id);
  const padrao = LOCALIZACOES_UNIDADES[unidade.data?.nome ?? oc.unidade_nome];
  const bairro = unidade.data?.bairro ?? padrao?.bairro ?? null;
  const lat = unidade.data?.latitude ?? padrao?.lat;
  const lng = unidade.data?.longitude ?? padrao?.lng;
  const link = unidade.data?.mapa_url ?? padrao?.mapa_url ?? (lat != null && lng != null ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}` : null);
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
      <span className="font-semibold">{oc.unidade_nome}</span>
      {(bairro || link) && (
        <>
          <span aria-hidden="true" className="text-[#b6c3d4] dark:text-slate-600">·</span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-[#0b63ce] dark:text-sky-300" aria-hidden="true" />
            {bairro ? `${bairro}, Itaguaí - RJ` : 'Itaguaí - RJ'}
          </span>
          {link && (
            <a
              href={link}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-[#0b63ce] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0b63ce] dark:text-sky-300"
            >
              Ver no mapa <ExternalLink className="h-3 w-3" aria-hidden="true" />
              <span className="sr-only">(abre o Google Maps em outra aba)</span>
            </a>
          )}
        </>
      )}
    </span>
  );
};

/**
 * Exibe a imagem da fachada da escola obtida via Google Street View (ou cadastro).
 * Inclui badges com gradiente e glassmorphism, indicador do Street View, link para abrir no Maps,
 * e suporte a ampliação em modal em alta resolução.
 */
const FotoFachadaUnidade: React.FC<{ oc: CcoOcorrencia }> = ({ oc }) => {
  const unidade = useUnidade(oc.unidade_id);
  const padrao = LOCALIZACOES_UNIDADES[unidade.data?.nome ?? oc.unidade_nome];
  const fotoUrl = unidade.data?.foto_url ?? padrao?.foto_url ?? null;
  const bairro = unidade.data?.bairro ?? padrao?.bairro ?? null;
  const endereco = unidade.data?.endereco ?? padrao?.endereco ?? null;
  const lat = unidade.data?.latitude ?? padrao?.lat;
  const lng = unidade.data?.longitude ?? padrao?.lng;
  const link = unidade.data?.mapa_url ?? padrao?.mapa_url ?? (lat != null && lng != null ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}` : null);

  const [ampliada, setAmpliada] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [falha, setFalha] = useState(false);

  if (!fotoUrl || falha) return null;

  return (
    <>
      <section
        aria-label="Fachada da unidade escolar"
        className="group relative overflow-hidden rounded-2xl border border-[#cfe0f5] bg-[#0c1a30] shadow-[0_12px_28px_-16px_rgba(16,48,96,0.35)] transition-all hover:border-[#9fc3ec] dark:border-slate-800 dark:bg-[#0b101c]"
      >
        <div className="relative aspect-[16/7.5] w-full overflow-hidden sm:aspect-[21/8.5]">
          {carregando && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
              <Loader2 className="h-6 w-6 animate-spin text-sky-400" />
            </div>
          )}
          <img
            src={fotoUrl}
            alt={`Fachada da escola ${oc.unidade_nome}`}
            onLoad={() => setCarregando(false)}
            onError={() => { setCarregando(false); setFalha(true); }}
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />

          {/* Gradiente escuro para legibilidade */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/40" />

          {/* Barra superior de informações e ações */}
          <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/60 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm backdrop-blur-md">
              <Camera className="h-3 w-3 text-sky-400" aria-hidden="true" />
              Fachada escolar · Google Street View
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setAmpliada(true)}
                title="Ampliar visualização da fachada"
                className="grid h-7 w-7 place-items-center rounded-lg border border-white/20 bg-black/60 text-white backdrop-blur-md transition-colors hover:bg-black/90 hover:text-sky-300"
              >
                <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="sr-only">Ampliar imagem</span>
              </button>
              {link && (
                <a
                  href={link}
                  target="_blank"
                  rel="noreferrer"
                  title="Abrir no Google Maps"
                  className="inline-flex h-7 items-center gap-1 rounded-lg border border-white/20 bg-[#0b63ce]/90 px-2.5 text-[11px] font-bold text-white shadow-sm backdrop-blur-md transition-colors hover:bg-[#0b63ce]"
                >
                  <Navigation className="h-3 w-3" aria-hidden="true" />
                  Ver no Maps
                </a>
              )}
            </div>
          </div>

          {/* Barra inferior: Nome e endereço com clique para ampliar */}
          <button
            type="button"
            onClick={() => setAmpliada(true)}
            className="absolute inset-x-0 bottom-0 block p-3.5 text-left transition-opacity hover:opacity-95"
          >
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-sky-300 drop-shadow">
              Unidade Escolar
            </p>
            <p className="text-base font-extrabold leading-tight text-white drop-shadow-md sm:text-lg">
              {oc.unidade_nome}
            </p>
            {(endereco || bairro) && (
              <p className="mt-0.5 line-clamp-1 text-xs text-slate-200/90 drop-shadow">
                {endereco || `${bairro}, Itaguaí - RJ`}
              </p>
            )}
          </button>
        </div>
      </section>

      {/* Modal de ampliação em tela cheia com alta resolução */}
      <Modal
        isOpen={ampliada}
        onClose={() => setAmpliada(false)}
        title={`Fachada · ${oc.unidade_nome}`}
        description={endereco || (bairro ? `${bairro}, Itaguaí - RJ` : 'Itaguaí - RJ')}
        maxWidth="5xl"
        icon={<Building2 className="h-6 w-6 text-[#0b63ce]" />}
      >
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-2xl border border-[#cfe0f5] bg-black dark:border-slate-800">
            <img
              src={fotoUrl}
              alt={`Fachada da escola ${oc.unidade_nome}`}
              className="max-h-[75vh] w-full object-contain"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <span className="flex items-center gap-1.5 text-xs text-[#5f7391] dark:text-slate-400">
              <Camera className="h-4 w-4 text-[#0b63ce]" aria-hidden="true" />
              Imagem capturada pelo Google Street View
            </span>
            {link && (
              <a
                href={link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0b63ce] underline underline-offset-2 hover:text-[#094ca0] dark:text-sky-300"
              >
                Explorar arredores no Google Maps <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
};


interface Props {
  ocorrenciaId: string | null;
  user: UserProfile;
  onFechar: () => void;
  /** Aberto pela ação "Andamento" da lista: leva o foco ao campo do andamento. */
  focarAndamento?: boolean;
  /** Só administrador: pede ao painel para abrir a confirmação de exclusão. */
  onExcluir?: (oc: CcoOcorrencia) => void;
}

const Dado: React.FC<{ icone: typeof Clock; rotulo: string; children: React.ReactNode }> = ({ icone: Icone, rotulo, children }) => (
  <div className="flex min-w-0 items-start gap-2.5">
    <Icone className="mt-0.5 h-4 w-4 shrink-0 text-[#6b7f9b] dark:text-slate-500" aria-hidden="true" />
    <div className="min-w-0">
      <dt className="text-[11px] font-bold uppercase tracking-wider text-[#6b7f9b] dark:text-slate-500">{rotulo}</dt>
      <dd className="mt-0.5 break-words text-sm font-semibold text-[#10233f] dark:text-slate-100">{children}</dd>
    </div>
  </div>
);

const Titulo: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="mb-2.5 text-xs font-extrabold uppercase tracking-wider text-[#4c6283] dark:text-slate-400">{children}</h3>
);

const ICONE_HISTORICO: Record<CcoHistorico['tipo'], typeof Clock> = {
  registro: FileText,
  situacao: CheckCircle2,
  responsavel: UserRound,
  observacao: MessageSquare,
  termino: Clock,
  andamento: MessageSquare,
  solucao: CheckCircle2,
  reabertura: RotateCcw,
  edicao: Pencil,
};

/** Textos livres do histórico: aparecem em destaque, com o tipo escrito. */
const ROTULO_TEXTO: Partial<Record<CcoHistorico['tipo'], string>> = {
  observacao: 'Andamento',
  andamento: 'Andamento',
  solucao: 'Solução',
  reabertura: 'Motivo da reabertura',
};

const CHAVE_HISTORICO_ABERTO = 'cco-historico-aberto';

/**
 * Histórico recolhível: fechado mostra quantos registros há e o último; ao clicar no título
 * ele se expande para baixo (animação suave). A escolha fica lembrada neste aparelho.
 */
const HistoricoRecolhivel: React.FC<{ eventos: CcoHistorico[]; carregando: boolean }> = ({ eventos, carregando }) => {
  const [aberto, setAberto] = useState(() => {
    try { return localStorage.getItem(CHAVE_HISTORICO_ABERTO) === 'sim'; } catch { return false; }
  });
  const alternar = () => {
    setAberto((atual) => {
      try { localStorage.setItem(CHAVE_HISTORICO_ABERTO, atual ? 'nao' : 'sim'); } catch { /* sem armazenamento */ }
      return !atual;
    });
  };
  const ultimo = eventos[eventos.length - 1];
  const idConteudo = 'cco-historico-conteudo';

  return (
    <section className="rounded-2xl border border-[#e2eaf4] bg-white dark:border-slate-800 dark:bg-transparent">
      <h3>
        <button
          type="button"
          onClick={alternar}
          aria-expanded={aberto}
          aria-controls={idConteudo}
          className="group flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors hover:bg-[#f5f9fe] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b63ce] dark:hover:bg-slate-800/50"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#eaf2fd] text-[#0b63ce] dark:bg-sky-500/10 dark:text-sky-300">
            <History className="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#4c6283] dark:text-slate-300">Histórico de atendimento</span>
              {!carregando && (
                <span className="rounded-full bg-[#eef4fb] px-2 py-0.5 text-[11px] font-bold tabular-nums text-[#3b4d68] dark:bg-slate-800 dark:text-slate-300">
                  {eventos.length} {eventos.length === 1 ? 'registro' : 'registros'}
                </span>
              )}
            </span>
            {/* Fechado: prévia do último movimento, para saber se vale abrir. */}
            {!aberto && ultimo && (
              <span className="mt-0.5 block truncate text-[13px] text-[#5f7391] dark:text-slate-400">
                Último: {descreverEvento(ultimo)} · {formatarDataHora(ultimo.created_at)}
              </span>
            )}
          </span>
          <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-[#0b63ce] dark:text-sky-300">
            <span className="hidden sm:inline">{aberto ? 'Recolher' : 'Ver tudo'}</span>
            <ChevronDown className={cn('h-5 w-5 transition-transform duration-300 motion-reduce:transition-none', aberto && 'rotate-180')} aria-hidden="true" />
          </span>
        </button>
      </h3>
      {/* grid-rows 0fr → 1fr anima a altura real do conteúdo. */}
      <div
        id={idConteudo}
        className={cn('grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none', aberto ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}
        // Fechado: fora da navegação por teclado e leitores de tela (React 18 não tipa "inert").
        {...((aberto ? {} : { inert: "" }) as React.HTMLAttributes<HTMLDivElement>)}
      >
        <div className="overflow-hidden">
          <div className={cn('px-4 pb-4 pt-1 transition-opacity duration-300 motion-reduce:transition-none', aberto ? 'opacity-100' : 'opacity-0')}>
            {carregando ? <Carregando texto="Carregando o histórico…" /> : <Historico eventos={eventos} />}
          </div>
        </div>
      </div>
    </section>
  );
};

const Historico: React.FC<{ eventos: CcoHistorico[] }> = ({ eventos }) => (
  <ol className="relative ml-3 space-y-4 border-l-2 border-[#e2eaf4] pl-5 dark:border-slate-800">
    {eventos.map((evento) => {
      const Icone = ICONE_HISTORICO[evento.tipo];
      const cor = evento.situacao_nova ? ESTILO_SITUACAO[evento.situacao_nova].ponto : evento.tipo === 'solucao' ? 'bg-green-600' : 'bg-[#6b7f9b]';
      return (
        <li key={evento.id} className="relative">
          <span className={cn('absolute -left-[31px] top-0 grid h-5 w-5 place-items-center rounded-full text-white ring-4 ring-white dark:ring-[#121826]', cor)}>
            <Icone className="h-3 w-3" aria-hidden="true" />
          </span>
          {ROTULO_TEXTO[evento.tipo] ? (
            <div className={cn('rounded-lg px-3 py-2', evento.tipo === 'solucao' ? 'bg-green-50 ring-1 ring-green-200 dark:bg-green-950/20 dark:ring-green-500/30' : 'bg-[#f5f8fc] dark:bg-slate-800/60')}>
              <p className={cn('text-[11px] font-bold uppercase tracking-wider', evento.tipo === 'solucao' ? 'text-green-800 dark:text-green-300' : 'text-[#6b7f9b] dark:text-slate-400')}>{ROTULO_TEXTO[evento.tipo]}</p>
              <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-[#10233f] dark:text-slate-200">{evento.descricao}</p>
            </div>
          ) : (
            <p className="text-sm text-[#10233f] dark:text-slate-200">{descreverEvento(evento)}</p>
          )}
          <p className="mt-1 text-xs text-[#6b7f9b] dark:text-slate-500">
            {formatarDataHora(evento.created_at)}{evento.autor_nome ? ` · ${evento.autor_nome}` : ''}
          </p>
        </li>
      );
    })}
  </ol>
);

/** Unidade (ou equipe) informa o fim de uma ocorrência que estava em andamento. */
const InformarTermino: React.FC<{ oc: CcoOcorrencia; user: UserProfile; onSalvo: () => void }> = ({ oc, user, onSalvo }) => {
  const [hora, setHora] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [confirmarDia, setConfirmarDia] = useState(false);

  const salvar = async (diaSeguinte: boolean) => {
    setSalvando(true);
    setErro('');
    try {
      await ccoService.informarTermino(user, oc.id, hora, diaSeguinte);
      onSalvo();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  };

  const aoSalvar = (e: React.FormEvent) => {
    e.preventDefault();
    const valor = completarHora(hora);
    setHora(valor);
    if (!horaValida(valor)) return setErro('Informe o horário final no formato 24 h, por exemplo 17:45.');
    if (valor < oc.hora_inicio.slice(0, 5) && !confirmarDia) return setConfirmarDia(true);
    void salvar(valor < oc.hora_inicio.slice(0, 5));
  };

  return (
    <form onSubmit={aoSalvar} className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 dark:border-amber-500/30 dark:bg-amber-950/20">
      <p className="text-sm font-bold text-amber-900 dark:text-amber-200">Ocorrência em andamento</p>
      <p className="mt-0.5 text-xs text-amber-800/90 dark:text-amber-200/80">Quando terminar, informe o horário final.</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-start">
        <div className="sm:w-40">
          <Campo id="cco-termino" rotulo="Horário final" erro={erro || null}>
            <CampoHora id="cco-termino" valor={hora} onChange={(v) => { setHora(v); setErro(''); setConfirmarDia(false); }} erro={erro || null} disabled={salvando} />
          </Campo>
        </div>
        <button type="submit" disabled={salvando} className={cn(botaoPrimario, 'sm:mt-[26px]')}>
          {salvando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
          {confirmarDia ? 'Confirmar: terminou no dia seguinte' : 'Salvar horário final'}
        </button>
      </div>
      {confirmarDia && (
        <p role="alert" className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-indigo-800 dark:text-indigo-200">
          <MoonStar className="h-3.5 w-3.5" aria-hidden="true" />
          {hora} é anterior ao início ({oc.hora_inicio.slice(0, 5)}). Se terminou no dia seguinte, clique em confirmar; senão, corrija o horário.
        </p>
      )}
    </form>
  );
};

const FotoOcorrencia: React.FC<{ caminho: string }> = ({ caminho }) => {
  const [ampliada, setAmpliada] = useState(false);
  const url = useQuery({ queryKey: ['cco', 'foto', caminho], queryFn: () => ccoService.urlFoto(caminho), staleTime: 20 * 60_000 });
  if (url.isLoading) return <Carregando texto="Carregando a foto…" />;
  if (!url.data) {
    return (
      <p className="flex items-center gap-2 rounded-xl bg-[#f5f8fc] p-3 text-sm text-[#5f7391] dark:bg-slate-800/60 dark:text-slate-400">
        <ImageOff className="h-4 w-4" aria-hidden="true" /> {url.error instanceof Error ? url.error.message : 'Foto indisponível.'}
      </p>
    );
  }
  return (
    <>
      <button type="button" onClick={() => setAmpliada(!ampliada)} className="block w-full overflow-hidden rounded-xl bg-[#e6eef8] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-[#0b63ce] dark:bg-slate-800" aria-label={ampliada ? 'Reduzir a foto' : 'Ampliar a foto'}>
        <img src={url.data} alt="Foto enviada pela unidade" className={cn('w-full object-contain transition-all', ampliada ? 'max-h-[75vh]' : 'max-h-72')} />
      </button>
      <a href={url.data} target="_blank" rel="noreferrer" className="mt-1.5 inline-block text-xs font-bold text-[#0b63ce] underline underline-offset-2 dark:text-sky-300">
        Abrir a foto em outra aba
      </a>
    </>
  );
};

export const DetalheOcorrencia: React.FC<Props> = ({ ocorrenciaId, user, onFechar, focarAndamento, onExcluir }) => {
  const queryClient = useQueryClient();
  const [copiado, setCopiado] = useState(false);
  const perfil = perfilCco(user);
  const equipe = perfil === 'admin' || perfil === 'equipe';

  const ocorrencia = useQuery({
    queryKey: ['cco', 'ocorrencia', ocorrenciaId],
    queryFn: () => ccoService.obterOcorrencia(user, ocorrenciaId!),
    enabled: Boolean(ocorrenciaId),
    refetchInterval: 30_000,
  });
  const historico = useQuery({
    queryKey: ['cco', 'historico', ocorrenciaId],
    queryFn: () => ccoService.listarHistorico(ocorrenciaId!),
    enabled: Boolean(ocorrenciaId),
    refetchInterval: 30_000,
  });

  const atualizar = () => queryClient.invalidateQueries({ queryKey: ['cco'] });
  const oc = ocorrencia.data;

  // O administrador abriu a ocorrência: a unidade deixa de poder editar.
  const pendenteVisualizacao = perfil === 'admin' && oc && !oc.visualizada_em ? oc.id : null;
  useEffect(() => {
    if (!pendenteVisualizacao) return;
    ccoService.marcarVisualizada(user, pendenteVisualizacao).then(() => void atualizar()).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendenteVisualizacao]);

  const semEdicao = oc && perfil === 'unidade' ? motivoSemEdicao(user, oc) : null;

  // Equipe/admin: se a análise de gravidade ainda não rodou (ou falhou no envio), pede agora.
  const semAnalise = equipe && oc && !oc.ia_analisada_em ? oc.id : null;
  useEffect(() => {
    if (!semAnalise) return;
    ccoService.analisarGravidade(semAnalise).then(() => void atualizar()).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semAnalise]);
  const gravidade = oc && equipe ? gravidadeDe(oc) : null;

  const copiar = async () => {
    if (!oc) return;
    try {
      await navigator.clipboard.writeText(oc.protocolo);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {}
  };

  const secaoHistorico = (
    <HistoricoRecolhivel carregando={historico.isLoading} eventos={historico.data || []} />
  );

  return (
    <Modal
      isOpen={Boolean(ocorrenciaId)}
      onClose={onFechar}
      title={oc ? `Ocorrência ${oc.protocolo}` : 'Ocorrência'}
      description={oc ? <UnidadeComEndereco oc={oc} /> : undefined}
      icon={<FileText className="h-6 w-6" />}
      maxWidth="6xl"
    >
      {ocorrencia.isLoading ? (
        <Carregando />
      ) : ocorrencia.error ? (
        <p role="alert" className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-200">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" /> {(ocorrencia.error as Error).message}
        </p>
      ) : !oc ? (
        <p className="py-6 text-center text-sm text-[#5f7391] dark:text-slate-400">Ocorrência não encontrada ou sem permissão de acesso.</p>
      ) : (
        // Computador: duas colunas lado a lado, do topo — dados à esquerda e atendimento (ou histórico) à direita —
        // para a janela caber na tela sem rolagem.
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <div className="min-w-0 space-y-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <SituacaoBadge situacao={oc.situacao} className="px-3 py-1.5 text-[13px]" />
            <span className="text-xs text-[#5f7391] dark:text-slate-400">{SITUACOES[oc.situacao].descricao}</span>
            <button type="button" onClick={copiar} className="ml-auto inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold text-[#0b63ce] hover:bg-[#eaf2fd] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0b63ce] dark:text-sky-300 dark:hover:bg-slate-800">
              {copiado ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
              {copiado ? 'Copiado' : 'Copiar protocolo'}
            </button>
          </div>

          {gravidade?.grave && (
            <section role="alert" className="rounded-2xl border border-rose-300 bg-rose-50 p-3 dark:border-rose-500/40 dark:bg-rose-950/30">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-rose-600 text-white" aria-hidden="true">
                  <ShieldAlert className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-[15px] font-extrabold text-rose-900 dark:text-rose-100">
                    Caso grave{gravidade.categoria ? `: ${gravidade.categoria}` : ''}
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-bold text-rose-700 ring-1 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-200 dark:ring-rose-500/30">
                      <Sparkles className="h-3 w-3" aria-hidden="true" /> {gravidade.origem === 'ia' ? 'Sugestão da IA' : 'Alerta automático'}
                    </span>
                  </p>
                  <p className="mt-0.5 text-[13px] font-semibold leading-snug text-rose-900 dark:text-rose-100">
                    {primeiroNome(user.nome_completo) && <strong className="font-extrabold">Ei {primeiroNome(user.nome_completo)}! </strong>}
                    {SUGESTAO_IMAGENS}
                  </p>
                  <p className="mt-1 text-xs text-rose-800/90 dark:text-rose-200/80">
                    Período: {formatarData(oc.data_ocorrencia)}, {descreverHorario(oc)}
                    {oc.cameras?.length ? ` · Câmeras: ${oc.cameras.join(', ')}` : ''}.
                    {gravidade.motivo ? ` ${gravidade.motivo}` : ''}
                  </p>
                </div>
              </div>
            </section>
          )}

          <FotoFachadaUnidade oc={oc} />

          <dl className="grid grid-cols-1 gap-3 rounded-2xl border border-[#e2eaf4] p-3 sm:grid-cols-3 dark:border-slate-800">
            <Dado icone={CalendarDays} rotulo="Data da ocorrência">{formatarData(oc.data_ocorrencia)}</Dado>
            <Dado icone={Clock} rotulo="Horário">{descreverHorario(oc)}</Dado>
            <Dado icone={Building2} rotulo="Unidade escolar">{oc.unidade_nome}</Dado>
            {oc.locais?.length ? <Dado icone={MapPin} rotulo="Local da ocorrência">{oc.locais.join(', ')}</Dado> : null}
            <Dado icone={UserRound} rotulo="Responsável no CCO">{oc.responsavel_nome || 'Ainda não definido'}</Dado>
            {oc.visita_data && (
              <Dado icone={CalendarClock} rotulo="Visita presencial">
                {formatarVisita(oc.visita_data, oc.visita_hora)}
              </Dado>
            )}
            <Dado icone={FileText} rotulo="Registrada em">
              {formatarDataHora(oc.created_at)}
              {oc.criado_por_nome && <span className="block text-xs font-medium text-[#5f7391] dark:text-slate-400">por {oc.criado_por_nome}</span>}
            </Dado>
          </dl>

          {perfil === 'unidade' && (
            !semEdicao ? (
              <div className="flex flex-col gap-3 rounded-2xl border border-[#cfe0f7] bg-[#f3f8ff] p-3.5 sm:flex-row sm:items-center sm:justify-between dark:border-sky-500/30 dark:bg-sky-500/10">
                <p className="text-sm text-[#3b4d68] dark:text-slate-300">
                  <strong className="block text-[#0d2240] dark:text-slate-100">Ainda não visualizada pelo administrador.</strong>
                  Você pode corrigir os dados até o administrador abrir a ocorrência.
                </p>
                <Link to={`/cco?editar=${oc.id}`} className={cn(botaoPrimario, 'min-h-11 shrink-0')}>
                  <Pencil className="h-4 w-4" aria-hidden="true" /> Editar ocorrência
                </Link>
              </div>
            ) : oc.visualizada_em ? (
              <p className="flex items-center gap-2 rounded-xl bg-[#f5f8fc] px-3.5 py-2.5 text-[13px] text-[#4c6283] dark:bg-slate-800/60 dark:text-slate-300">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                Visualizada pelo administrador em {formatarDataHora(oc.visualizada_em)}. Não pode mais ser editada.
              </p>
            ) : null
          )}

          {oc.em_andamento && <InformarTermino oc={oc} user={user} onSalvo={atualizar} />}

          {oc.tipo_registro === 'camera' && (
            <section>
              <Titulo>Problema em câmera · {oc.tipo_problema}</Titulo>
              <ul className="flex flex-wrap gap-2">
                {(oc.cameras || []).map((c) => (
                  <li key={c} className="rounded-full bg-[#e6f0fc] px-3 py-1 text-sm text-[#1f3557] dark:bg-sky-500/15 dark:text-sky-100">{c}</li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <Titulo>Descrição</Titulo>
            <p className="max-h-60 overflow-y-auto whitespace-pre-wrap break-words rounded-xl border border-rose-200 border-l-4 border-l-rose-500 bg-rose-50 p-3.5 text-base font-medium leading-relaxed text-[#3b0d17] dark:border-rose-500/30 dark:border-l-rose-400 dark:bg-rose-950/30 dark:text-rose-50">{oc.descricao}</p>
          </section>

          {oc.foto_path && (
            <section>
              <Titulo>Foto</Titulo>
              <FotoOcorrencia caminho={oc.foto_path} />
            </section>
          )}

          {equipe && secaoHistorico}

          </div>

          {/* Equipe: o formulário de atendimento ocupa a coluna da direita; unidade: o histórico. */}
          <div className="min-w-0 space-y-4">
            {equipe ? <Atendimento oc={oc} user={user} focarAndamento={focarAndamento} onSalvo={() => void atualizar()} /> : secaoHistorico}
            {perfil === 'admin' && onExcluir && (
            <div className="flex flex-col gap-2 border-t border-[#e6edf6] pt-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
              <p className="text-xs text-[#6b7f9b] dark:text-slate-500">Administração: excluir apaga a ocorrência para todos e guarda uma cópia na auditoria.</p>
              <button
                type="button"
                onClick={() => onExcluir(oc)}
                className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-rose-200 px-3.5 text-sm font-bold text-rose-700 transition-colors hover:bg-rose-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-950/30"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" /> Excluir ocorrência
              </button>
            </div>
          )}
          </div>
        </div>
      )}
    </Modal>
  );
};

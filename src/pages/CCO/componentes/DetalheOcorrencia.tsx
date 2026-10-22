import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Building2,
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
  Save,
  UserRound,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import { perfilCco } from '@/lib/modulos';
import {
  ORDEM_SITUACOES,
  SITUACOES,
  ccoService,
  descreverHorario,
  formatarData,
  formatarDataHora,
} from '@/services/ccoService';
import { CcoHistorico, CcoOcorrencia, CcoSituacao, UserProfile } from '@/types';
import { Campo, CampoHora, caixaCampo, completarHora, horaValida } from './campos';
import { Carregando, ESTILO_SITUACAO, SituacaoBadge, botaoPrimario } from './ui';

interface Props {
  ocorrenciaId: string | null;
  user: UserProfile;
  onFechar: () => void;
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
};

const Historico: React.FC<{ eventos: CcoHistorico[] }> = ({ eventos }) => (
  <ol className="relative ml-3 space-y-4 border-l-2 border-[#e2eaf4] pl-5 dark:border-slate-800">
    {eventos.map((evento) => {
      const Icone = ICONE_HISTORICO[evento.tipo];
      const cor = evento.situacao_nova ? ESTILO_SITUACAO[evento.situacao_nova].ponto : 'bg-[#6b7f9b]';
      return (
        <li key={evento.id} className="relative">
          <span className={cn('absolute -left-[31px] top-0 grid h-5 w-5 place-items-center rounded-full text-white ring-4 ring-white dark:ring-[#121826]', cor)}>
            <Icone className="h-3 w-3" aria-hidden="true" />
          </span>
          <p className={cn('text-sm text-[#10233f] dark:text-slate-200', evento.tipo === 'observacao' && 'whitespace-pre-wrap rounded-lg bg-[#f5f8fc] px-3 py-2 dark:bg-slate-800/60')}>
            {evento.descricao}
          </p>
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

/** Painel de atendimento (equipe CCO e administrador). */
const Atendimento: React.FC<{ oc: CcoOcorrencia; user: UserProfile; onSalvo: (oc: CcoOcorrencia) => void }> = ({ oc, user, onSalvo }) => {
  const [situacao, setSituacao] = useState<CcoSituacao>(oc.situacao);
  const [responsavel, setResponsavel] = useState(oc.responsavel_id || '');
  const [observacao, setObservacao] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);
  const equipe = useQuery({ queryKey: ['cco', 'equipe'], queryFn: () => ccoService.listarEquipe(), staleTime: 5 * 60_000 });

  useEffect(() => {
    setSituacao(oc.situacao);
    setResponsavel(oc.responsavel_id || '');
  }, [oc.situacao, oc.responsavel_id]);

  const alterado = situacao !== oc.situacao || responsavel !== (oc.responsavel_id || '') || observacao.trim().length > 0;

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alterado || salvando) return;
    setSalvando(true);
    setMensagem(null);
    try {
      const atualizada = await ccoService.atualizarOcorrencia(user, oc.id, {
        situacao: situacao !== oc.situacao ? situacao : undefined,
        responsavel_id: responsavel !== (oc.responsavel_id || '') ? responsavel || null : undefined,
        observacao: observacao.trim() || undefined,
      });
      setObservacao('');
      setMensagem({ tipo: 'ok', texto: 'Atendimento atualizado.' });
      onSalvo(atualizada);
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err instanceof Error ? err.message : 'Não foi possível salvar.' });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <form onSubmit={salvar} className="space-y-4 rounded-2xl border border-[#d3e3f8] bg-[#f6faff] p-4 dark:border-slate-700 dark:bg-slate-900/40">
      <Titulo>Atendimento do CCO</Titulo>
      <fieldset>
        <legend className="mb-1.5 block text-sm font-bold text-[#10233f] dark:text-slate-200">Situação</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ORDEM_SITUACOES.map((valor) => {
            const ativo = situacao === valor;
            return (
              <label
                key={valor}
                className={cn(
                  'flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border px-2 text-center text-[13px] font-bold transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#0b63ce]',
                  ativo ? cn('ring-1', ESTILO_SITUACAO[valor].classe, 'border-transparent') : 'border-[#cfdbea] bg-white text-[#3b4d68] hover:border-[#a9c1de] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300',
                )}
              >
                <input type="radio" name="cco-situacao" value={valor} checked={ativo} onChange={() => setSituacao(valor)} className="sr-only" />
                <span className={cn('h-2.5 w-2.5 rounded-full', ESTILO_SITUACAO[valor].ponto)} aria-hidden="true" />
                {SITUACOES[valor].rotulo}
              </label>
            );
          })}
        </div>
      </fieldset>

      <Campo id="cco-responsavel" rotulo="Responsável pelo atendimento">
        <select
          id="cco-responsavel"
          value={responsavel}
          onChange={(e) => setResponsavel(e.target.value)}
          className={caixaCampo()}
        >
          <option value="">Sem responsável</option>
          {(equipe.data || []).map((membro) => (
            <option key={membro.id} value={membro.id}>{membro.nome_completo}{membro.id === user.id ? ' (você)' : ''}</option>
          ))}
          {oc.responsavel_id && !equipe.data?.some((m) => m.id === oc.responsavel_id) && (
            <option value={oc.responsavel_id}>{oc.responsavel_nome}</option>
          )}
        </select>
        {!oc.responsavel_id && responsavel !== user.id && equipe.data?.some((m) => m.id === user.id) && (
          <button type="button" onClick={() => setResponsavel(user.id)} className="mt-1.5 text-xs font-bold text-[#0b63ce] underline underline-offset-2 hover:text-[#0a56b4] dark:text-sky-300">
            Assumir este atendimento
          </button>
        )}
      </Campo>

      <Campo id="cco-observacao" rotulo="Observação" ajuda="Fica no histórico e é visível para a unidade escolar.">
        <textarea
          id="cco-observacao"
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Ex.: imagens conferidas; Guarda Municipal acionada."
          className={cn(caixaCampo(), 'resize-y py-2.5')}
        />
      </Campo>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p aria-live="polite" className={cn('text-sm font-semibold', mensagem?.tipo === 'erro' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400')}>
          {mensagem?.texto}
        </p>
        <button type="submit" disabled={!alterado || salvando} className={botaoPrimario}>
          {salvando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
          {salvando ? 'Salvando…' : 'Salvar atendimento'}
        </button>
      </div>
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

export const DetalheOcorrencia: React.FC<Props> = ({ ocorrenciaId, user, onFechar }) => {
  const queryClient = useQueryClient();
  const [copiado, setCopiado] = useState(false);
  const perfil = perfilCco(user);
  const equipe = perfil === 'admin' || perfil === 'equipe';

  const ocorrencia = useQuery({
    queryKey: ['cco', 'ocorrencia', ocorrenciaId],
    queryFn: () => ccoService.obterOcorrencia(user, ocorrenciaId!),
    enabled: Boolean(ocorrenciaId),
  });
  const historico = useQuery({
    queryKey: ['cco', 'historico', ocorrenciaId],
    queryFn: () => ccoService.listarHistorico(ocorrenciaId!),
    enabled: Boolean(ocorrenciaId),
  });

  const atualizar = () => queryClient.invalidateQueries({ queryKey: ['cco'] });
  const oc = ocorrencia.data;

  const copiar = async () => {
    if (!oc) return;
    try {
      await navigator.clipboard.writeText(oc.protocolo);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {}
  };

  return (
    <Modal
      isOpen={Boolean(ocorrenciaId)}
      onClose={onFechar}
      title={oc ? `Ocorrência ${oc.protocolo}` : 'Ocorrência'}
      description={oc ? oc.unidade_nome : undefined}
      icon={<FileText className="h-6 w-6" />}
      maxWidth="2xl"
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
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <SituacaoBadge situacao={oc.situacao} className="px-3 py-1.5 text-[13px]" />
            <span className="text-xs text-[#5f7391] dark:text-slate-400">{SITUACOES[oc.situacao].descricao}</span>
            <button type="button" onClick={copiar} className="ml-auto inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold text-[#0b63ce] hover:bg-[#eaf2fd] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0b63ce] dark:text-sky-300 dark:hover:bg-slate-800">
              {copiado ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
              {copiado ? 'Copiado' : 'Copiar protocolo'}
            </button>
          </div>

          <dl className="grid grid-cols-1 gap-4 rounded-2xl border border-[#e2eaf4] p-4 sm:grid-cols-2 dark:border-slate-800">
            <Dado icone={CalendarDays} rotulo="Data da ocorrência">{formatarData(oc.data_ocorrencia)}</Dado>
            <Dado icone={Clock} rotulo="Horário">{descreverHorario(oc)}</Dado>
            <Dado icone={Building2} rotulo="Unidade escolar">{oc.unidade_nome}</Dado>
            <Dado icone={UserRound} rotulo="Responsável no CCO">{oc.responsavel_nome || 'Ainda não definido'}</Dado>
            <Dado icone={FileText} rotulo="Registrada em">
              {formatarDataHora(oc.created_at)}
              {oc.criado_por_nome && <span className="block text-xs font-medium text-[#5f7391] dark:text-slate-400">por {oc.criado_por_nome}</span>}
            </Dado>
          </dl>

          {oc.em_andamento && <InformarTermino oc={oc} user={user} onSalvo={atualizar} />}

          <section>
            <Titulo>Descrição</Titulo>
            <p className="whitespace-pre-wrap break-words rounded-xl bg-[#f5f8fc] p-3.5 text-[15px] leading-relaxed text-[#10233f] dark:bg-slate-800/60 dark:text-slate-100">{oc.descricao}</p>
          </section>

          {oc.foto_path && (
            <section>
              <Titulo>Foto</Titulo>
              <FotoOcorrencia caminho={oc.foto_path} />
            </section>
          )}

          {equipe && <Atendimento oc={oc} user={user} onSalvo={() => void atualizar()} />}

          <section>
            <Titulo>Histórico de atendimento</Titulo>
            {historico.isLoading ? <Carregando texto="Carregando o histórico…" /> : <Historico eventos={historico.data || []} />}
          </section>
        </div>
      )}
    </Modal>
  );
};

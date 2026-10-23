import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarClock, CheckCircle2, Loader2, Lock, MessageSquarePlus, RotateCcw, Undo2, X } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import { perfilCco } from '@/lib/modulos';
import { SITUACOES, ccoService, hojeBrasilia } from '@/services/ccoService';
import { CcoOcorrencia, CcoSituacao, UserProfile } from '@/types';
import { Campo, caixaCampo } from './campos';
import { ESTILO_SITUACAO, botaoPrimario, botaoSecundario } from './ui';

const TEXTO_MINIMO = 5;
const SUGESTOES_SOLUCAO = [
  'Imagens verificadas; nenhuma irregularidade confirmada.',
  'Guarda Municipal acionada; situação normalizada.',
  'Câmera ajustada pela manutenção; imagem normalizada.',
];
const VISITA_MAX_DIAS = 180;

const somarDias = (iso: string, dias: number) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
};

const proximoDiaUtil = (iso: string) => {
  let d = somarDias(iso, 1);
  while ([0, 6].includes(new Date(`${d}T12:00:00`).getDay())) d = somarDias(d, 1);
  return d;
};

/** "quinta-feira, 24/10/2026 às 09:00" */
export const formatarVisita = (data: string, hora?: string | null) => {
  const dia = new Date(`${data}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
  return `${dia.charAt(0).toLocaleUpperCase('pt-BR')}${dia.slice(1)}${hora ? ` às ${hora.slice(0, 5)}` : ''}`;
};

/** Situações que um andamento pode definir (registrada é a inicial; solucionada é pela finalização). */
const SITUACOES_ANDAMENTO: CcoSituacao[] = ['em_analise', 'em_atendimento'];

interface Props {
  oc: CcoOcorrencia;
  user: UserProfile;
  focarAndamento?: boolean;
  onSalvo: (oc: CcoOcorrencia) => void;
}

const Aviso: React.FC<{ mensagem: { tipo: 'ok' | 'erro'; texto: string } | null }> = ({ mensagem }) => (
  <p aria-live="polite" className={cn('text-sm font-semibold', mensagem?.tipo === 'erro' ? 'text-rose-600 dark:text-rose-400' : 'text-green-700 dark:text-green-400')}>
    {mensagem?.texto}
  </p>
);

/** Equipe CCO e administrador: registrar andamentos, finalizar e (só admin) reabrir. */
export const Atendimento: React.FC<Props> = ({ oc, user, focarAndamento, onSalvo }) => {
  const admin = perfilCco(user) === 'admin';
  const finalizada = oc.situacao === 'concluida';
  const equipe = useQuery({ queryKey: ['cco', 'equipe'], queryFn: () => ccoService.listarEquipe(), staleTime: 5 * 60_000 });
  const campoAndamento = useRef<HTMLTextAreaElement>(null);

  // Andamento
  const [texto, setTexto] = useState('');
  const [situacao, setSituacao] = useState<CcoSituacao | ''>('');
  const [responsavel, setResponsavel] = useState(oc.responsavel_id || '');
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);
  const [erroTexto, setErroTexto] = useState('');

  // Visita presencial à unidade (quando não dá para verificar as imagens remotamente)
  const hoje = hojeBrasilia();
  const [visitaAberta, setVisitaAberta] = useState(false);
  const [visitaData, setVisitaData] = useState('');
  const [visitaHora, setVisitaHora] = useState('');
  const [cancelarVisita, setCancelarVisita] = useState(false);
  const [erroVisita, setErroVisita] = useState('');

  // Finalizar / reabrir
  const [modal, setModal] = useState<'finalizar' | 'reabrir' | null>(null);
  const [textoModal, setTextoModal] = useState('');
  const [situacaoReabrir, setSituacaoReabrir] = useState<CcoSituacao>('em_atendimento');
  const [erroModal, setErroModal] = useState('');
  const [salvandoModal, setSalvandoModal] = useState(false);

  useEffect(() => setResponsavel(oc.responsavel_id || ''), [oc.responsavel_id]);

  useEffect(() => {
    if (!focarAndamento || finalizada) return;
    const t = window.setTimeout(() => {
      campoAndamento.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      campoAndamento.current?.focus({ preventScroll: true });
    }, 250);
    return () => window.clearTimeout(t);
  }, [focarAndamento, finalizada, oc.id]);

  const trocouResponsavel = responsavel !== (oc.responsavel_id || '');
  const trocouSituacao = Boolean(situacao) && situacao !== oc.situacao;
  const horaVisitaAtual = oc.visita_hora?.slice(0, 5) || '';
  const trocouVisita = visitaAberta && Boolean(visitaData) && (visitaData !== oc.visita_data || visitaHora !== horaVisitaAtual);
  const temAlgo = texto.trim().length > 0 || trocouResponsavel || trocouSituacao || trocouVisita || (cancelarVisita && Boolean(oc.visita_data));

  const abrirVisita = () => {
    setVisitaAberta(true);
    setCancelarVisita(false);
    setVisitaData(oc.visita_data || '');
    setVisitaHora(horaVisitaAtual);
    setErroVisita('');
    setMensagem(null);
    window.setTimeout(() => document.getElementById('cco-visita-data')?.focus(), 0);
  };

  const fecharVisita = () => {
    setVisitaAberta(false);
    setVisitaData('');
    setVisitaHora('');
    setErroVisita('');
  };

  const registrarAndamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (salvando) return;
    const t = texto.trim();
    if (!temAlgo) {
      setErroTexto('Descreva o andamento.');
      campoAndamento.current?.focus();
      return;
    }
    if (t && t.length < TEXTO_MINIMO) {
      setErroTexto(`Escreva pelo menos ${TEXTO_MINIMO} caracteres.`);
      campoAndamento.current?.focus();
      return;
    }
    if (visitaAberta && !visitaData) {
      setErroVisita('Escolha a data da visita ou desative o agendamento.');
      document.getElementById('cco-visita-data')?.focus();
      return;
    }
    if (trocouVisita && visitaData < hoje) {
      setErroVisita('A data da visita não pode estar no passado.');
      document.getElementById('cco-visita-data')?.focus();
      return;
    }
    setSalvando(true);
    setMensagem(null);
    try {
      const atualizada = await ccoService.atualizarOcorrencia(user, oc.id, {
        situacao: trocouSituacao ? (situacao as CcoSituacao) : undefined,
        responsavel_id: trocouResponsavel ? responsavel || null : undefined,
        observacao: t || undefined,
        visita: trocouVisita ? { data: visitaData, hora: visitaHora || null } : undefined,
        remover_visita: cancelarVisita && Boolean(oc.visita_data) ? true : undefined,
      });
      setTexto('');
      setSituacao('');
      setCancelarVisita(false);
      fecharVisita();
      setMensagem({
        tipo: 'ok',
        texto: trocouVisita
          ? `Visita agendada para ${formatarVisita(visitaData, visitaHora)}. A unidade já pode vê-la no histórico.`
          : cancelarVisita ? 'Visita cancelada. A unidade já pode ver no histórico.' : 'Andamento registrado. A unidade já pode vê-lo no histórico.',
      });
      onSalvo(atualizada);
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err instanceof Error ? err.message : 'Não foi possível registrar.' });
    } finally {
      setSalvando(false);
    }
  };

  const abrirModal = (tipo: 'finalizar' | 'reabrir') => {
    setModal(tipo);
    setTextoModal('');
    setErroModal('');
    setSituacaoReabrir('em_atendimento');
  };

  const confirmarModal = async () => {
    const t = textoModal.trim();
    if (t.length < TEXTO_MINIMO) {
      setErroModal(modal === 'finalizar' ? 'Descreva a solução (pelo menos 5 caracteres).' : 'Informe o motivo da reabertura (pelo menos 5 caracteres).');
      document.getElementById('cco-texto-modal')?.focus();
      return;
    }
    setSalvandoModal(true);
    setErroModal('');
    try {
      const atualizada = await ccoService.atualizarOcorrencia(user, oc.id, modal === 'finalizar'
        ? { situacao: 'concluida', observacao: t, responsavel_id: oc.responsavel_id ? undefined : user.id }
        : { situacao: situacaoReabrir, observacao: t });
      setMensagem({ tipo: 'ok', texto: modal === 'finalizar' ? 'Ocorrência finalizada. A unidade já vê a situação Solucionada.' : 'Ocorrência reaberta.' });
      setModal(null);
      onSalvo(atualizada);
    } catch (err) {
      setErroModal(err instanceof Error ? err.message : 'Não foi possível salvar.');
    } finally {
      setSalvandoModal(false);
    }
  };

  const titulo = 'mb-2.5 text-xs font-extrabold uppercase tracking-wider text-[#4c6283] dark:text-slate-400';

  return (
    <section aria-label="Atendimento do CCO" className="space-y-3">
      {finalizada ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-green-500/30 dark:bg-green-950/20">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" aria-hidden="true" />
            <div>
              <p className="font-bold text-green-900 dark:text-green-200">Ocorrência finalizada como Solucionada</p>
              <p className="mt-0.5 flex items-center gap-1 text-[13px] text-green-800/90 dark:text-green-200/80">
                <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                {admin ? 'Novos andamentos ficam bloqueados. Reabra se precisar continuar o atendimento.' : 'Novos andamentos ficam bloqueados. Só o administrador pode reabrir.'}
              </p>
            </div>
          </div>
          {admin && (
            <button type="button" onClick={() => abrirModal('reabrir')} className={cn(botaoSecundario, 'min-h-11 shrink-0 px-4 text-sm')}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> Reabrir ocorrência
            </button>
          )}
        </div>
      ) : (
        <form onSubmit={registrarAndamento} noValidate className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/30 dark:bg-emerald-950/20">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className={cn(titulo, 'mb-0')}>Registrar andamento</h3>
            <button type="submit" disabled={salvando} className={cn(botaoPrimario, 'min-h-11 px-4 text-sm')}>
              {salvando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />}
              {salvando ? 'Registrando…' : 'Adicionar andamento'}
            </button>
          </div>

          <Campo id="cco-andamento" rotulo="O que foi feito" erro={erroTexto || null} ajuda="Fica no histórico com seu nome, data e hora, e é visível para a unidade escolar.">
            <textarea
              ref={campoAndamento}
              id="cco-andamento"
              value={texto}
              onChange={(e) => { setTexto(e.target.value); setErroTexto(''); setMensagem(null); }}
              rows={3}
              maxLength={2000}
              placeholder="Ex.: imagens da câmera 04 conferidas; equipe de ronda informada."
              aria-invalid={Boolean(erroTexto)}
              className={cn(caixaCampo(erroTexto), 'resize-y py-2.5')}
            />
          </Campo>

          {/* Visita presencial à unidade */}
          <div className="rounded-xl border border-indigo-200 bg-white p-3 dark:border-indigo-500/30 dark:bg-slate-900/60">
            {oc.visita_data && !visitaAberta ? (
              <div className="flex flex-col gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"><CalendarClock className="h-5 w-5" aria-hidden="true" /></span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">Visita presencial agendada</p>
                    <p className={cn('text-sm font-bold text-[#10233f] dark:text-slate-100', cancelarVisita && 'line-through opacity-60')}>{formatarVisita(oc.visita_data, oc.visita_hora)}</p>
                    {cancelarVisita && <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">O cancelamento será registrado ao adicionar o andamento.</p>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pl-[52px]">
                  {cancelarVisita ? (
                    <button type="button" onClick={() => setCancelarVisita(false)} className={cn(botaoSecundario, 'min-h-10 px-3 text-xs')}>
                      <Undo2 className="h-4 w-4" aria-hidden="true" /> Desfazer
                    </button>
                  ) : (
                    <>
                      <button type="button" onClick={abrirVisita} className={cn(botaoSecundario, 'min-h-10 px-3 text-xs')}>
                        <CalendarClock className="h-4 w-4" aria-hidden="true" /> Reagendar
                      </button>
                      <button type="button" onClick={() => { setCancelarVisita(true); setMensagem(null); }} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 text-xs font-bold text-rose-700 hover:bg-rose-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-600 dark:border-rose-500/30 dark:bg-transparent dark:text-rose-300">
                        <X className="h-4 w-4" aria-hidden="true" /> Cancelar visita
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <>
                <label className="flex cursor-pointer select-none items-start gap-3">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={visitaAberta}
                    aria-labelledby="cco-visita-rotulo"
                    aria-describedby="cco-visita-ajuda"
                    onClick={() => (visitaAberta ? fecharVisita() : abrirVisita())}
                    className={cn(
                      'relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600',
                      visitaAberta ? 'bg-indigo-600' : 'bg-[#d5dde8] dark:bg-slate-700',
                    )}
                  >
                    <span className={cn('absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform', visitaAberta && 'translate-x-5')} />
                  </button>
                  <span className="min-w-0">
                    <span id="cco-visita-rotulo" className="flex items-center gap-1.5 text-sm font-bold text-[#10233f] dark:text-slate-100">
                      <CalendarClock className="h-4 w-4 text-indigo-600 dark:text-indigo-300" aria-hidden="true" />
                      {oc.visita_data ? 'Reagendar visita presencial' : 'Agendar visita presencial à unidade'}
                    </span>
                    <span id="cco-visita-ajuda" className="block text-xs text-[#5f7391] dark:text-slate-400">Use quando não for possível verificar as imagens remotamente. A unidade vê a data no histórico.</span>
                  </span>
                </label>

                {visitaAberta && (
                  <div className="mt-3 space-y-2.5 border-t border-indigo-100 pt-3 dark:border-indigo-500/20">
                    <div className="flex flex-wrap gap-1.5" aria-label="Atalhos de data">
                      {[
                        { rotulo: 'Hoje', valor: hoje },
                        { rotulo: 'Amanhã', valor: somarDias(hoje, 1) },
                        { rotulo: 'Próximo dia útil', valor: proximoDiaUtil(hoje) },
                      ].map((atalho) => (
                        <button
                          key={atalho.rotulo}
                          type="button"
                          onClick={() => { setVisitaData(atalho.valor); setErroVisita(''); }}
                          aria-pressed={visitaData === atalho.valor}
                          className={cn(
                            'min-h-9 rounded-full border px-3 text-xs font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600',
                            visitaData === atalho.valor
                              ? 'border-indigo-600 bg-indigo-600 text-white'
                              : 'border-[#cfdbea] bg-white text-[#3b4d68] hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300',
                          )}
                        >
                          {atalho.rotulo}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_150px]">
                      <Campo id="cco-visita-data" rotulo="Data da visita" obrigatorio erro={erroVisita || null}>
                        <input
                          id="cco-visita-data"
                          type="date"
                          value={visitaData}
                          min={hoje}
                          max={somarDias(hoje, VISITA_MAX_DIAS)}
                          onChange={(e) => { setVisitaData(e.target.value); setErroVisita(''); }}
                          aria-invalid={Boolean(erroVisita)}
                          className={cn(caixaCampo(erroVisita), 'font-medium')}
                        />
                      </Campo>
                      <Campo id="cco-visita-hora" rotulo="Horário (opcional)">
                        <input id="cco-visita-hora" type="time" value={visitaHora} onChange={(e) => setVisitaHora(e.target.value)} className={cn(caixaCampo(), 'font-medium')} />
                      </Campo>
                    </div>
                    {visitaData && !erroVisita && (
                      <p className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300" aria-live="polite">
                        <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" /> {formatarVisita(visitaData, visitaHora)}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          <fieldset>
            <legend className="mb-1.5 block text-sm font-bold text-[#10233f] dark:text-slate-200">Situação após o andamento</legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {(['', ...SITUACOES_ANDAMENTO] as (CcoSituacao | '')[]).map((valor) => {
                const ativo = situacao === valor;
                const rotulo = valor === '' ? `Manter (${SITUACOES[oc.situacao].rotulo})` : SITUACOES[valor].rotulo;
                return (
                  <label
                    key={valor || 'manter'}
                    className={cn(
                      'flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border px-2 text-center text-[13px] font-bold transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#0b63ce]',
                      ativo
                        ? valor ? cn('border-transparent ring-1', ESTILO_SITUACAO[valor].classe) : 'border-[#0b63ce] bg-[#eaf3ff] text-[#0b4fa3] dark:bg-sky-500/10 dark:text-sky-200'
                        : 'border-[#cfdbea] bg-white text-[#3b4d68] hover:border-[#a9c1de] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300',
                    )}
                  >
                    <input type="radio" name="cco-situacao-andamento" checked={ativo} onChange={() => setSituacao(valor)} className="sr-only" />
                    {valor && <span className={cn('h-2.5 w-2.5 rounded-full', ESTILO_SITUACAO[valor].ponto)} aria-hidden="true" />}
                    {rotulo}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <Campo id="cco-responsavel" rotulo="Responsável pelo atendimento">
            <select id="cco-responsavel" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} className={caixaCampo()}>
              <option value="">Sem responsável</option>
              {(equipe.data || []).map((membro) => (
                <option key={membro.id} value={membro.id}>{membro.nome_completo}{membro.id === user.id ? ' (você)' : ''}</option>
              ))}
              {oc.responsavel_id && !equipe.data?.some((m) => m.id === oc.responsavel_id) && (
                <option value={oc.responsavel_id}>{oc.responsavel_nome}</option>
              )}
            </select>
            {responsavel !== user.id && equipe.data?.some((m) => m.id === user.id) && (
              <button type="button" onClick={() => setResponsavel(user.id)} className="mt-1.5 text-xs font-bold text-[#0b63ce] underline underline-offset-2 hover:text-[#0a56b4] dark:text-sky-300">
                Assumir como responsável
              </button>
            )}
          </Campo>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Aviso mensagem={mensagem} />
            <button
              type="button"
              onClick={() => abrirModal('finalizar')}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-green-600 px-4 text-sm font-bold text-white shadow-[0_10px_20px_-12px_rgba(22,163,74,.9)] transition-colors hover:bg-green-700 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:ml-auto"
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Finalizar ocorrência
            </button>
          </div>
        </form>
      )}
      {finalizada && mensagem && <Aviso mensagem={mensagem} />}

      <Modal
        isOpen={modal !== null}
        onClose={() => !salvandoModal && setModal(null)}
        title={modal === 'finalizar' ? 'Finalizar ocorrência' : 'Reabrir ocorrência'}
        description={`${oc.protocolo} · ${oc.unidade_nome}`}
        maxWidth="md"
        icon={modal === 'finalizar' ? <CheckCircle2 className="h-6 w-6 text-green-600" /> : <RotateCcw className="h-6 w-6" />}
      >
        <div className="space-y-4">
          <p className="text-sm text-[#3b4d68] dark:text-slate-300">
            {modal === 'finalizar' ? (
              <>A unidade passa a ver a situação <strong>Solucionada</strong>, e novos andamentos ficam bloqueados.{!oc.responsavel_id && ' Você ficará como responsável pelo atendimento.'}</>
            ) : (
              <>A ocorrência volta para o atendimento e a unidade vê a nova situação. O motivo fica no histórico.</>
            )}
          </p>
          {modal === 'reabrir' && (
            <fieldset className="grid grid-cols-2 gap-2">
              <legend className="mb-1.5 text-sm font-bold text-[#10233f] dark:text-slate-200">Voltar para</legend>
              {SITUACOES_ANDAMENTO.map((valor) => (
                <label key={valor} className={cn('flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border text-[13px] font-bold focus-within:outline focus-within:outline-2 focus-within:outline-[#0b63ce]', situacaoReabrir === valor ? cn('border-transparent ring-1', ESTILO_SITUACAO[valor].classe) : 'border-[#cfdbea] bg-white text-[#3b4d68] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300')}>
                  <input type="radio" name="cco-reabrir" checked={situacaoReabrir === valor} onChange={() => setSituacaoReabrir(valor)} className="sr-only" />
                  {SITUACOES[valor].rotulo}
                </label>
              ))}
            </fieldset>
          )}
          <Campo id="cco-texto-modal" rotulo={modal === 'finalizar' ? 'Solução aplicada' : 'Motivo da reabertura'} obrigatorio erro={erroModal || null}>
            <textarea
              id="cco-texto-modal"
              autoFocus
              value={textoModal}
              onChange={(e) => { setTextoModal(e.target.value); setErroModal(''); }}
              rows={3}
              maxLength={2000}
              placeholder={modal === 'finalizar' ? 'Descreva como a ocorrência foi resolvida.' : 'Ex.: a unidade informou que o problema voltou.'}
              aria-invalid={Boolean(erroModal)}
              className={cn(caixaCampo(erroModal), 'resize-y py-2.5')}
            />
          </Campo>
          {modal === 'finalizar' && (
            <div>
              <p className="mb-1.5 text-xs font-semibold text-[#5f7391] dark:text-slate-400">Sugestões (toque para usar)</p>
              <div className="flex flex-wrap gap-1.5">
                {SUGESTOES_SOLUCAO.map((sugestao) => (
                  <button key={sugestao} type="button" onClick={() => { setTextoModal(sugestao); setErroModal(''); }} className="rounded-full border border-[#cfdbea] bg-white px-3 py-1.5 text-left text-xs font-semibold text-[#3b4d68] hover:border-green-400 hover:bg-green-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                    {sugestao}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" disabled={salvandoModal} onClick={() => setModal(null)} className={botaoSecundario}>Cancelar</button>
            <button
              type="button"
              disabled={salvandoModal}
              onClick={() => void confirmarModal()}
              className={cn(botaoPrimario, modal === 'finalizar' && 'bg-green-600 hover:bg-green-700 focus-visible:outline-green-600')}
            >
              {salvandoModal ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : modal === 'finalizar' ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <RotateCcw className="h-4 w-4" aria-hidden="true" />}
              {salvandoModal ? 'Salvando…' : modal === 'finalizar' ? 'Finalizar como Solucionada' : 'Reabrir ocorrência'}
            </button>
          </div>
        </div>
      </Modal>
    </section>
  );
};

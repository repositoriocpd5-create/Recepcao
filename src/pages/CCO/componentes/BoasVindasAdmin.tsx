import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, CheckCircle2, ChevronRight, ClipboardList, EyeOff, LayoutDashboard, ShieldCheck, Sparkles, Timer } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import { primeiroNome } from '@/lib/gravidadeCco';
import { gravidadeDe, hojeBrasilia, importanciaDe } from '@/services/ccoService';
import { CcoOcorrencia, UserProfile } from '@/types';
import { botaoPrimario, botaoSecundario } from './ui';

const FUSO = 'America/Sao_Paulo';
const chaveVisto = (userId: string) => `sme-cco-boas-vindas-${userId}`;

const saudacao = () => {
  const hora = Number(new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, hour: '2-digit', hour12: false }).format(new Date()));
  return hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
};

const dataPorExtenso = () => {
  const texto = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, weekday: 'long', day: '2-digit', month: 'long' }).format(new Date());
  return texto.charAt(0).toLocaleUpperCase('pt-BR') + texto.slice(1);
};

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

interface Props {
  user: UserProfile;
  ocorrencias: CcoOcorrencia[];
  carregando: boolean;
  onAbrir: (id: string) => void;
}

/** Boas-vindas do administrador do CCO: resumo do dia, uma vez por dia. */
export const BoasVindasAdmin: React.FC<Props> = ({ user, ocorrencias, carregando, onAbrir }) => {
  const hoje = hojeBrasilia();
  const [aberto, setAberto] = useState(false);

  // Abre uma vez por dia, quando os dados já chegaram.
  useEffect(() => {
    if (carregando) return;
    let visto = '';
    try { visto = localStorage.getItem(chaveVisto(user.id)) || ''; } catch { /* sem armazenamento: mostra */ }
    if (visto !== hoje) setAberto(true);
  }, [carregando, hoje, user.id]);

  const fechar = () => {
    try { localStorage.setItem(chaveVisto(user.id), hoje); } catch { /* sem armazenamento */ }
    setAberto(false);
  };

  const resumo = useMemo(() => {
    const abertas = ocorrencias.filter((oc) => oc.situacao !== 'concluida');
    const naoVisualizadas = ocorrencias.filter((oc) => !oc.visualizada_em && oc.situacao === 'registrada');
    const graves = abertas.filter((oc) => gravidadeDe(oc).grave);
    const emAtendimento = abertas.filter((oc) => oc.situacao === 'em_analise' || oc.situacao === 'em_atendimento');
    const visitasHoje = abertas.filter((oc) => oc.visita_data === hoje);
    const registradasHoje = ocorrencias.filter((oc) => oc.created_at && new Intl.DateTimeFormat('en-CA', { timeZone: FUSO }).format(new Date(oc.created_at)) === hoje);
    const prioridades = [...abertas]
      .map((oc) => ({ oc, imp: importanciaDe(oc), grave: gravidadeDe(oc) }))
      .filter(({ imp, grave }) => grave.grave || imp.nivel !== 'baixa')
      .sort((a, b) => Number(b.grave.grave) - Number(a.grave.grave)
        || ({ alta: 0, media: 1, baixa: 2 }[a.imp.nivel] - { alta: 0, media: 1, baixa: 2 }[b.imp.nivel])
        || b.oc.created_at.localeCompare(a.oc.created_at))
      .slice(0, 3);
    return { abertas, naoVisualizadas, graves, emAtendimento, visitasHoje, registradasHoje, prioridades };
  }, [ocorrencias, hoje]);

  const pendencias = resumo.graves.length + resumo.naoVisualizadas.length + resumo.visitasHoje.length;
  const nome = primeiroNome(user.nome_completo);

  const mensagem = resumo.graves.length
    ? `Há ${plural(resumo.graves.length, 'caso grave', 'casos graves')} em aberto. Priorize a extração das imagens das câmeras e o contato com a unidade — as gravações costumam ser sobrescritas em poucos dias.`
    : resumo.naoVisualizadas.length
      ? `${plural(resumo.naoVisualizadas.length, 'ocorrência aguarda', 'ocorrências aguardam')} a sua primeira leitura. Ao abrir, a unidade é avisada de que o CCO recebeu o registro.`
      : resumo.visitasHoje.length
        ? `${plural(resumo.visitasHoje.length, 'visita presencial está agendada', 'visitas presenciais estão agendadas')} para hoje. Confirme a equipe e os horários com as unidades.`
        : resumo.abertas.length
          ? `Nenhuma pendência urgente. Que tal acompanhar as ${plural(resumo.abertas.length, 'ocorrência em aberto', 'ocorrências em aberto')} e registrar os andamentos?`
          : 'Tudo em dia: nenhuma ocorrência em aberto. Um bom momento para revisar câmeras com falha e organizar a semana.';

  const indicadores = [
    { rotulo: 'Não visualizadas', valor: resumo.naoVisualizadas.length, Icone: EyeOff, cor: 'text-[#0b63ce] bg-[#eaf3ff] dark:bg-sky-500/15 dark:text-sky-300' },
    { rotulo: 'Casos graves', valor: resumo.graves.length, Icone: AlertTriangle, cor: 'text-rose-700 bg-rose-50 dark:bg-rose-500/15 dark:text-rose-300' },
    { rotulo: 'Em andamento', valor: resumo.emAtendimento.length, Icone: Timer, cor: 'text-amber-700 bg-amber-50 dark:bg-amber-500/15 dark:text-amber-300' },
    { rotulo: 'Visitas hoje', valor: resumo.visitasHoje.length, Icone: CalendarClock, cor: 'text-indigo-700 bg-indigo-50 dark:bg-indigo-500/15 dark:text-indigo-300' },
  ];

  return (
    <Modal isOpen={aberto} onClose={fechar} title={`${saudacao()}${nome ? `, ${nome}` : ''}!`} description={`${dataPorExtenso()} · Central Controle Operacional`} icon={<ShieldCheck className="h-6 w-6" />} maxWidth="lg">
      <div className="space-y-4">
        <p
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1',
            pendencias ? 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:ring-amber-500/30' : 'bg-green-50 text-green-800 ring-green-200 dark:bg-green-500/15 dark:text-green-200 dark:ring-green-500/30',
          )}
        >
          {pendencias ? <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" /> : <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />}
          {pendencias ? `${plural(pendencias, 'item pede', 'itens pedem')} sua atenção` : 'Tudo em dia'}
          {resumo.registradasHoje.length > 0 && <span className="font-semibold opacity-80">· {plural(resumo.registradasHoje.length, 'registro', 'registros')} hoje</span>}
        </p>

        <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {indicadores.map(({ rotulo, valor, Icone, cor }) => (
            <div key={rotulo} className="rounded-2xl border border-[#e2eaf4] bg-white p-3 dark:border-slate-800 dark:bg-slate-900/60">
              <span className={cn('mb-2 grid h-8 w-8 place-items-center rounded-lg', cor)}><Icone className="h-4 w-4" aria-hidden="true" /></span>
              <dd className="text-2xl font-extrabold leading-none text-[#0d2240] dark:text-slate-100">{valor}</dd>
              <dt className="mt-1 text-xs font-semibold text-[#5f7391] dark:text-slate-400">{rotulo}</dt>
            </div>
          ))}
        </dl>

        <div className="flex items-start gap-3 rounded-2xl border border-[#cfe0f7] bg-[#f3f8ff] p-3.5 dark:border-sky-500/30 dark:bg-sky-500/10">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-[#0b63ce] dark:text-sky-300" aria-hidden="true" />
          <div>
            <p className="text-sm font-extrabold text-[#0d2240] dark:text-slate-100">Mensagem do dia</p>
            <p className="mt-0.5 text-sm leading-relaxed text-[#3b4d68] dark:text-slate-300">{mensagem}</p>
          </div>
        </div>

        {resumo.prioridades.length > 0 && (
          <section aria-labelledby="cco-prioridades">
            <h3 id="cco-prioridades" className="mb-2 text-xs font-extrabold uppercase tracking-wider text-[#4c6283] dark:text-slate-400">Prioridades</h3>
            <ul className="divide-y divide-[#e6edf6] overflow-hidden rounded-2xl border border-[#e2eaf4] dark:divide-slate-800 dark:border-slate-800">
              {resumo.prioridades.map(({ oc, imp, grave }) => (
                <li key={oc.id}>
                  <button
                    type="button"
                    onClick={() => { fechar(); onAbrir(oc.id); }}
                    className="flex w-full items-center gap-3 bg-white px-3.5 py-3 text-left hover:bg-[#f5f9ff] focus-visible:bg-[#f5f9ff] focus-visible:outline-none dark:bg-slate-900/40 dark:hover:bg-slate-800"
                  >
                    <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', grave.grave ? 'bg-rose-600' : imp.nivel === 'alta' ? 'bg-rose-500' : imp.nivel === 'media' ? 'bg-amber-500' : 'bg-slate-400')} aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-[#0d2240] dark:text-slate-100">
                        {oc.unidade_nome} <span className="font-mono text-xs font-semibold text-[#5f7391] dark:text-slate-400">· {oc.protocolo}</span>
                      </span>
                      <span className="block truncate text-xs text-[#5f7391] dark:text-slate-400">
                        {grave.grave ? `Caso grave${grave.categoria ? `: ${grave.categoria}` : ''}` : imp.motivo}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-[#8a9bb3]" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="flex flex-col-reverse gap-2 border-t border-[#e6edf6] pt-4 sm:flex-row sm:justify-end dark:border-slate-800">
          <button type="button" onClick={fechar} className={cn(botaoSecundario, 'w-full sm:w-auto')}>Fechar</button>
          <button type="button" onClick={fechar} className={cn(botaoPrimario, 'w-full sm:w-auto')} autoFocus>
            <LayoutDashboard className="h-4 w-4" aria-hidden="true" /> Ver ocorrências
          </button>
        </div>
      </div>
    </Modal>
  );
};

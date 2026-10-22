import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Camera,
  CheckCircle2,
  ClipboardList,
  Copy,
  Eye,
  FileText,
  HelpCircle,
  LifeBuoy,
  Lock,
  Plus,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { perfilCco } from '@/lib/modulos';
import { ORDEM_SITUACOES, SITUACOES, formatarData } from '@/services/ccoService';
import { CcoOcorrencia, UserProfile } from '@/types';
import { CabecalhoCco } from './componentes/Cabecalho';
import { DetalheOcorrencia } from './componentes/DetalheOcorrencia';
import { BarraFiltros, useFiltros } from './componentes/Filtros';
import { FormularioOcorrencia } from './componentes/FormularioOcorrencia';
import { ListaOcorrencias, ListaVazia } from './componentes/ListaOcorrencias';
import { Carregando, Cartao, IconeTitulo, SituacaoBadge, botaoPrimario, botaoSecundario } from './componentes/ui';
import { Modal } from '@/components/ui/Modal';
import { useDetalheNaUrl, useOcorrencias, useUnidade } from './hooks';
import { PainelEquipe } from './PainelEquipe';

const SemUnidade: React.FC = () => (
  <Cartao className="flex items-start gap-3 p-5">
    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
    <div>
      <p className="font-bold text-[#0d2240] dark:text-slate-100">Seu usuário ainda não está vinculado a uma unidade escolar.</p>
      <p className="mt-1 text-sm text-[#5f7391] dark:text-slate-400">Peça ao administrador do sistema para vincular sua conta à unidade. Depois, entre novamente.</p>
    </div>
  </Cartao>
);

const ErroLista: React.FC<{ erro: unknown }> = ({ erro }) => (
  <p role="alert" className="m-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-700 sm:m-6 dark:bg-rose-950/30 dark:text-rose-200">
    <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" /> {erro instanceof Error ? erro.message : 'Não foi possível carregar as ocorrências.'}
  </p>
);

/** Confirmação após o envio: protocolo em destaque e atalho para a ocorrência. */
const Registrada: React.FC<{ ocorrencia: CcoOcorrencia | null; onVer: () => void; onFechar: () => void }> = ({ ocorrencia, onVer, onFechar }) => {
  const [copiado, setCopiado] = useState(false);
  if (!ocorrencia) return null;
  return (
    <Modal isOpen onClose={onFechar} title="Ocorrência registrada" description="O CCO já recebeu o seu registro." maxWidth="md" icon={<CheckCircle2 className="h-6 w-6 text-green-600" />}>
      <div className="space-y-5">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center dark:border-emerald-500/30 dark:bg-emerald-950/20">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">Protocolo</p>
          <p className="mt-1 font-mono text-2xl font-extrabold tracking-wide text-emerald-900 dark:text-emerald-100">{ocorrencia.protocolo}</p>
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(ocorrencia.protocolo);
                setCopiado(true);
              } catch {}
            }}
            className="mt-2 inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700 dark:text-emerald-200 dark:hover:bg-emerald-900/40"
          >
            <Copy className="h-3.5 w-3.5" aria-hidden="true" /> {copiado ? 'Protocolo copiado' : 'Copiar protocolo'}
          </button>
        </div>
        <p className="text-sm text-[#3b4d68] dark:text-slate-300">
          Ocorrência de {formatarData(ocorrencia.data_ocorrencia)} registrada como <SituacaoBadge situacao={ocorrencia.situacao} className="align-middle" />.
          Acompanhe o atendimento em <strong>Minhas ocorrências</strong>.
        </p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onFechar} className={botaoSecundario}><Plus className="h-4 w-4" aria-hidden="true" /> Registrar outra</button>
          <button type="button" autoFocus onClick={onVer} className={botaoPrimario}><Eye className="h-4 w-4" aria-hidden="true" /> Ver ocorrência</button>
        </div>
      </div>
    </Modal>
  );
};

const InicioUnidade: React.FC<{ user: UserProfile }> = ({ user }) => {
  const queryClient = useQueryClient();
  const unidade = useUnidade(user.unidade_id);
  const ocorrencias = useOcorrencias(user);
  const detalhe = useDetalheNaUrl();
  const [registrada, setRegistrada] = useState<CcoOcorrencia | null>(null);

  return (
    <div className="space-y-5">
      <CabecalhoCco
        titulo="Central Controle Operacional"
        subtitulo="Registre e acompanhe ocorrências relacionadas ao monitoramento da sua unidade escolar."
        user={user}
        unidadeNome={unidade.data?.nome}
      />

      {!user.unidade_id ? (
        <SemUnidade />
      ) : (
        <FormularioOcorrencia
          user={user}
          unidadeId={user.unidade_id}
          unidadeNome={unidade.data?.nome}
          onRegistrada={(oc) => {
            setRegistrada(oc);
            void queryClient.invalidateQueries({ queryKey: ['cco'] });
          }}
        />
      )}

      <Cartao aria-labelledby="cco-minhas-titulo">
        <div className="flex items-center justify-between gap-3 border-b border-[#e6edf6] px-4 py-4 sm:px-6 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <IconeTitulo className="h-10 w-10"><FileText className="h-5 w-5" aria-hidden="true" /></IconeTitulo>
            <h2 id="cco-minhas-titulo" className="text-lg font-extrabold text-[#0d2240] dark:text-slate-100">Minhas ocorrências</h2>
          </div>
          <Link to="/cco/ocorrencias" className="inline-flex min-h-10 shrink-0 items-center whitespace-nowrap gap-1.5 rounded-lg px-2 text-sm font-bold text-[#0b63ce] hover:bg-[#eaf2fd] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0b63ce] dark:text-sky-300 dark:hover:bg-slate-800">
            Ver todas <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        {ocorrencias.isLoading ? (
          <Carregando texto="Carregando as ocorrências…" />
        ) : ocorrencias.error ? (
          <ErroLista erro={ocorrencias.error} />
        ) : (
          <ListaOcorrencias ocorrencias={(ocorrencias.data || []).slice(0, 5)} onAbrir={(oc) => detalhe.abrir(oc.id)} />
        )}
      </Cartao>

      <Registrada
        ocorrencia={registrada}
        onFechar={() => setRegistrada(null)}
        onVer={() => {
          const id = registrada?.id;
          setRegistrada(null);
          if (id) detalhe.abrir(id);
        }}
      />
      <DetalheOcorrencia ocorrenciaId={detalhe.id} user={user} onFechar={detalhe.fechar} />
    </div>
  );
};

/** Início do CCO: a unidade registra; equipe e administrador acompanham no painel. */
export const CcoInicioPage: React.FC = () => {
  const { user } = useAuth();
  if (!user) return null;
  return perfilCco(user) === 'unidade' ? <InicioUnidade user={user} /> : <PainelEquipe user={user} />;
};

export const CcoOcorrenciasPage: React.FC = () => {
  const { user } = useAuth();
  const ocorrencias = useOcorrencias(user!);
  const unidade = useUnidade(user?.unidade_id);
  const { filtros, mudar, limpar, filtradas, contagem, totalSemSituacao, ativos } = useFiltros(ocorrencias.data || []);
  const detalhe = useDetalheNaUrl();
  if (!user) return null;
  if (perfilCco(user) !== 'unidade') return <Navigate to="/cco" replace />;

  return (
    <div className="space-y-5">
      <CabecalhoCco
        titulo="Minhas ocorrências"
        subtitulo="Acompanhe a situação e o histórico de atendimento das ocorrências da sua unidade."
        trilha="Minhas ocorrências"
        user={user}
        unidadeNome={unidade.data?.nome}
        icone={<FileText className="h-7 w-7 sm:h-9 sm:w-9" aria-hidden="true" />}
      />
      <Cartao>
        <div className="border-b border-[#e6edf6] px-4 py-4 sm:px-6 dark:border-slate-800">
          <BarraFiltros filtros={filtros} mudar={mudar} limpar={limpar} contagem={contagem} total={totalSemSituacao} ativos={ativos} />
        </div>
        {ocorrencias.isLoading ? (
          <Carregando texto="Carregando as ocorrências…" />
        ) : ocorrencias.error ? (
          <ErroLista erro={ocorrencias.error} />
        ) : (
          <div className="pt-2">
            <ListaOcorrencias
              ocorrencias={filtradas}
              onAbrir={(oc) => detalhe.abrir(oc.id)}
              vazio={
                ativos ? (
                  <ListaVazia titulo="Nenhuma ocorrência com estes filtros." texto="Ajuste ou limpe os filtros." />
                ) : (
                  <div className="pb-6">
                    <ListaVazia titulo="Nenhuma ocorrência registrada." texto="As ocorrências que a sua unidade registrar aparecem aqui." />
                    <div className="flex justify-center">
                      <Link to="/cco" className={botaoPrimario}><ClipboardList className="h-4 w-4" aria-hidden="true" /> Registrar ocorrência</Link>
                    </div>
                  </div>
                )
              }
            />
          </div>
        )}
      </Cartao>
      <DetalheOcorrencia ocorrenciaId={detalhe.id} user={user} onFechar={detalhe.fechar} />
    </div>
  );
};

const Topico: React.FC<{ icone: typeof Camera; titulo: string; children: React.ReactNode }> = ({ icone: Icone, titulo, children }) => (
  <Cartao className="p-5">
    <div className="flex items-start gap-3">
      <IconeTitulo className="h-10 w-10"><Icone className="h-5 w-5" aria-hidden="true" /></IconeTitulo>
      <div className="min-w-0">
        <h2 className="text-base font-extrabold text-[#0d2240] dark:text-slate-100">{titulo}</h2>
        <div className="mt-1.5 space-y-2 text-sm leading-relaxed text-[#3b4d68] dark:text-slate-300">{children}</div>
      </div>
    </div>
  </Cartao>
);

export const CcoAjudaPage: React.FC = () => {
  const { user } = useAuth();
  const unidade = useUnidade(user?.unidade_id);
  if (!user) return null;
  const equipe = perfilCco(user) !== 'unidade';
  return (
    <div className="space-y-5">
      <CabecalhoCco
        titulo="Ajuda do CCO"
        subtitulo="Como registrar e acompanhar as ocorrências do monitoramento das câmeras."
        trilha="Ajuda"
        user={user}
        unidadeNome={unidade.data?.nome}
        icone={<HelpCircle className="h-7 w-7 sm:h-9 sm:w-9" aria-hidden="true" />}
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Topico icone={ClipboardList} titulo="Como registrar uma ocorrência">
          <ol className="list-decimal space-y-1 pl-4">
            <li>Confira a <strong>data</strong> (já vem com o dia de hoje).</li>
            <li>Informe o <strong>horário inicial</strong> e o <strong>final</strong>, no formato 24 h (ex.: 14:30). O botão do relógio preenche o horário atual.</li>
            <li>Se ainda está acontecendo, marque <strong>Ocorrência em andamento</strong> e informe o fim depois, no detalhe da ocorrência.</li>
            <li>Descreva o que aconteceu, o local ou a câmera envolvida e o que mais ajudar no atendimento.</li>
            <li>Se puder, anexe uma foto. Toque em <strong>Registrar ocorrência</strong> e guarde o protocolo.</li>
          </ol>
        </Topico>
        <Topico icone={CheckCircle2} titulo="O que significa cada situação">
          <ul className="space-y-2">
            {ORDEM_SITUACOES.map((s) => (
              <li key={s} className="flex flex-wrap items-center gap-2"><SituacaoBadge situacao={s} /> <span>{SITUACOES[s].descricao}</span></li>
            ))}
          </ul>
        </Topico>
        <Topico icone={Camera} titulo="Fotos">
          <p>No celular, use <strong>Tirar foto</strong> ou <strong>Escolher da galeria</strong>. No computador, arraste a imagem para a área da foto.</p>
          <p>Formatos JPG, PNG ou WEBP, até 10 MB. A foto é reduzida antes do envio e a localização gravada pela câmera é removida.</p>
        </Topico>
        <Topico icone={Lock} titulo="Privacidade e segurança">
          <p>Cada unidade vê apenas as próprias ocorrências e fotos. As fotos ficam em armazenamento privado e só abrem por um link temporário.</p>
          <p>Registro, mudanças de situação, responsável e observações ficam no histórico e na auditoria do sistema, com autor e horário.</p>
        </Topico>
        {equipe && (
          <Topico icone={Building2} titulo="Para a equipe do CCO">
            <p>No painel, filtre por unidade, período e situação. Abra a ocorrência para definir o responsável, mudar a situação e registrar observações — tudo fica visível para a unidade no histórico.</p>
            <p>O painel se atualiza sozinho a cada minuto.</p>
          </Topico>
        )}
        <Topico icone={LifeBuoy} titulo="Problemas para enviar?">
          <p>Se a internet cair durante o envio, os dados continuam no formulário: toque em <strong>Tentar novamente</strong>. O sistema não duplica o registro.</p>
          <p>Em caso de emergência, não espere pelo sistema: acione a Guarda Municipal ou a Polícia Militar (190).</p>
        </Topico>
      </div>
    </div>
  );
};

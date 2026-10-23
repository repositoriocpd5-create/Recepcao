import React, { useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Copy,
  Eye,
  FileText,
  Lock,
  Pencil,
  Plus,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { perfilCco } from '@/lib/modulos';
import { ccoService, formatarData, motivoSemEdicao, podeEditar } from '@/services/ccoService';
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
    <Modal isOpen onClose={onFechar} title={ocorrencia.tipo_registro === 'camera' ? 'Relato enviado' : 'Ocorrência registrada'} description="O CCO já recebeu o seu registro." maxWidth="md" icon={<CheckCircle2 className="h-6 w-6 text-green-600" />}>
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

/** Ação da linha em "Minhas ocorrências": editar enquanto o administrador não visualizou. */
const acaoEditar = (user: UserProfile) => (oc: CcoOcorrencia) =>
  podeEditar(user, oc) ? (
    <Link
      to={`/cco?editar=${oc.id}`}
      aria-label={`Editar ocorrência ${oc.protocolo}`}
      title="Editar (ainda não visualizada pelo administrador)"
      className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-[#b9cfe9] px-3 text-sm font-bold text-[#0b4fa3] transition-colors hover:bg-[#f0f6fe] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b63ce] dark:border-slate-700 dark:text-sky-200 dark:hover:bg-slate-800"
    >
      <Pencil className="h-4 w-4" aria-hidden="true" /> Editar
    </Link>
  ) : (
    <span title={motivoSemEdicao(user, oc) ?? undefined} className="inline-flex items-center gap-1 text-xs text-[#8a9bb3] dark:text-slate-500">
      <Lock className="h-4 w-4" aria-hidden="true" />
      <span className="sr-only">{motivoSemEdicao(user, oc)}</span>
    </span>
  );

const InicioUnidade: React.FC<{ user: UserProfile }> = ({ user }) => {
  const queryClient = useQueryClient();
  const unidade = useUnidade(user.unidade_id);
  const ocorrencias = useOcorrencias(user);
  const detalhe = useDetalheNaUrl();
  const [registrada, setRegistrada] = useState<CcoOcorrencia | null>(null);
  const [salva, setSalva] = useState<CcoOcorrencia | null>(null);
  const [params, setParams] = useSearchParams();
  const editarId = params.get('editar');
  const emEdicao = useQuery({
    queryKey: ['cco', 'ocorrencia', editarId],
    queryFn: () => ccoService.obterOcorrencia(user, editarId!),
    enabled: Boolean(editarId),
    // Não recarrega no meio da edição; o banco confere de novo ao salvar.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
  const sairDaEdicao = () => setParams((atual) => { atual.delete('editar'); return atual; }, { replace: true });
  const edicao = editarId && emEdicao.data && podeEditar(user, emEdicao.data) ? emEdicao.data : undefined;
  const bloqueioEdicao = editarId && emEdicao.isFetched && !edicao
    ? (emEdicao.data ? motivoSemEdicao(user, emEdicao.data) : 'Ocorrência não encontrada.')
    : null;

  return (
    <div className="space-y-5">
      <CabecalhoCco
        titulo="Central Controle Operacional"
        subtitulo="Registre ocorrências e informe problemas nas câmeras da sua unidade."
        user={user}
        unidadeNome={unidade.data?.nome}
      />

      {!user.unidade_id ? (
        <SemUnidade />
      ) : editarId && emEdicao.isLoading ? (
        <Cartao><Carregando texto="Abrindo a ocorrência para edição…" /></Cartao>
      ) : (
        <>
          {bloqueioEdicao && (
            <Cartao className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p role="alert" className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-200">
                <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {bloqueioEdicao}
              </p>
              <button type="button" onClick={sairDaEdicao} className={botaoSecundario}>Fazer um novo registro</button>
            </Cartao>
          )}
          {!bloqueioEdicao && (
            <FormularioOcorrencia
              key={edicao?.id ?? 'novo'}
              user={user}
              unidadeId={user.unidade_id}
              unidadeNome={unidade.data?.nome}
              edicao={edicao}
              onCancelarEdicao={sairDaEdicao}
              onEditada={(oc) => {
                setSalva(oc);
                sairDaEdicao();
                void queryClient.invalidateQueries({ queryKey: ['cco'] });
              }}
              onRegistrada={(oc) => {
                setRegistrada(oc);
                void queryClient.invalidateQueries({ queryKey: ['cco'] });
              }}
            />
          )}
        </>
      )}

      {salva && (
        <p role="status" className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-950/20 dark:text-emerald-200">
          <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" /> Alterações da ocorrência {salva.protocolo} salvas.
          <button type="button" onClick={() => setSalva(null)} className="ml-auto rounded-lg px-2 py-1 text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/40">Fechar</button>
        </p>
      )}

      <Cartao aria-labelledby="cco-minhas-titulo">
        <div className="flex items-center justify-between gap-3 border-b border-[#e6edf6] px-4 py-4 sm:px-6 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <IconeTitulo className="h-10 w-10"><FileText className="h-5 w-5" aria-hidden="true" /></IconeTitulo>
            <h2 id="cco-minhas-titulo" className="text-lg font-extrabold text-[#0d2240] dark:text-slate-100">Meus registros</h2>
          </div>
          <Link to="/cco/ocorrencias" className="inline-flex min-h-10 shrink-0 items-center whitespace-nowrap gap-1.5 rounded-lg px-2 text-sm font-bold text-[#0b63ce] hover:bg-[#eaf2fd] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0b63ce] dark:text-sky-300 dark:hover:bg-slate-800">
            Ver todos <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        {ocorrencias.isLoading ? (
          <Carregando texto="Carregando as ocorrências…" />
        ) : ocorrencias.error ? (
          <ErroLista erro={ocorrencias.error} />
        ) : (
          <ListaOcorrencias
            ocorrencias={(ocorrencias.data || []).slice(0, 5)}
            onAbrir={(oc) => detalhe.abrir(oc.id)}
            acaoLinha={acaoEditar(user)}
            acaoCompacta
            mostrarVisualizacao
            vazio={<ListaVazia titulo="Nenhum registro enviado" texto="Suas ocorrências e relatos de problemas aparecerão aqui." />}
          />
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
              acaoLinha={acaoEditar(user)}
              acaoCompacta
              mostrarVisualizacao
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

export { CcoAjudaPage } from './Ajuda';

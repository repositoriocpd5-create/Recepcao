import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowRight, Bell, Camera, CheckCircle2, ClipboardList, Clock, School } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { perfilCco } from '@/lib/modulos';
import { cn } from '@/lib/utils';
import { ccoService, formatarData, formatarDataHora, gravidadeDe } from '@/services/ccoService';
import { CcoOcorrencia } from '@/types';
import { tocarSomAlerta, useTempoRealCco } from '@/pages/CCO/tempoReal';

const MAX_LISTA = 8;

/** Ocorrências que o administrador ainda não abriu (as finalizadas não contam). */
const novasDe = (lista: CcoOcorrencia[]) =>
  lista
    .filter((oc) => !oc.visualizada_em && oc.situacao !== 'concluida')
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

/**
 * Sininho do CCO:
 * - Administrador e equipe: avisa novas ocorrências de escolas com bipe duplo e casos graves em vermelho.
 * - Usuário comum (unidade escolar): avisa com bipe suave e notificação quando o administrador atualiza ocorrências da sua escola.
 */
export const SinoCco: React.FC<{ className?: string }> = ({ className }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [aberto, setAberto] = useState(false);
  const [aviso, setAviso] = useState('');
  const [tocou, setTocou] = useState(false);
  const [atualizadasIds, setAtualizadasIds] = useState<string[]>([]);
  const raiz = useRef<HTMLDivElement>(null);
  const idPainel = useId();
  const conhecidas = useRef<Set<string> | null>(null);
  const perfil = user ? perfilCco(user) : null;
  const isEquipeAdmin = perfil === 'admin' || perfil === 'equipe';
  const isUnidade = perfil === 'unidade';
  const ativo = isEquipeAdmin || isUnidade;

  // Consulta das ocorrências com atualização periódica e em tempo real.
  const ocorrencias = useQuery({
    queryKey: ['cco', 'ocorrencias', user?.id],
    queryFn: () => ccoService.listarOcorrencias(user!),
    enabled: ativo,
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  // Admin/equipe: novas ocorrências não visualizadas.
  const novas = isEquipeAdmin ? novasDe(ocorrencias.data || []) : [];
  const graves = novas.filter((oc) => gravidadeDe(oc).grave);
  const ordenadasAdmin = [...graves, ...novas.filter((oc) => !graves.includes(oc))].slice(0, MAX_LISTA);

  // Unidade: ocorrências recentes da própria escola.
  const listaUnidade = isUnidade ? (ocorrencias.data || []).slice(0, MAX_LISTA) : [];

  // Chegou ocorrência nova (admin/equipe): balança o sino e toca som.
  useEffect(() => {
    if (!isEquipeAdmin || !ocorrencias.data) return;
    const ids = new Set(novas.map((oc) => oc.id));
    const anteriores = conhecidas.current;
    conhecidas.current = ids;
    if (!anteriores) return;
    const chegaram = novas.filter((oc) => !anteriores.has(oc.id));
    if (!chegaram.length) return;
    setTocou(true);
    window.setTimeout(() => setTocou(false), 1600);
    setAviso(chegaram.length === 1 ? `Nova ocorrência de ${chegaram[0].unidade_nome}.` : `${chegaram.length} novas ocorrências.`);
    tocarSomAlerta('nova');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ocorrencias.data, isEquipeAdmin]);

  // Tempo real para avisar a unidade escolar quando o administrador atualizar uma ocorrência.
  const aoAtualizada = useCallback((oc: CcoOcorrencia) => {
    if (!isUnidade || !user?.unidade_id || oc.unidade_id !== user.unidade_id) return;
    setTocou(true);
    window.setTimeout(() => setTocou(false), 1600);
    setAtualizadasIds((prev) => [oc.id, ...prev.filter((id) => id !== oc.id)].slice(0, 5));
    setAviso(`A ocorrência ${oc.protocolo} foi atualizada pelo administrador.`);
    tocarSomAlerta('atualizacao');
  }, [isUnidade, user?.unidade_id]);

  useTempoRealCco(undefined, aoAtualizada);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => { if (!raiz.current?.contains(e.target as Node)) setAberto(false); };
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') setAberto(false); };
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('mousedown', fora);
      document.removeEventListener('keydown', tecla);
    };
  }, [aberto]);

  if (!ativo) return null;

  const abrir = (oc: CcoOcorrencia) => {
    setAberto(false);
    setAtualizadasIds((prev) => prev.filter((id) => id !== oc.id));
    navigate(`/cco?ocorrencia=${oc.id}`);
  };

  const total = isEquipeAdmin ? novas.length : atualizadasIds.length;
  const rotulo = isEquipeAdmin
    ? (total ? `Notificações: ${total} ${total === 1 ? 'nova ocorrência' : 'novas ocorrências'}${graves.length ? `, ${graves.length} grave${graves.length > 1 ? 's' : ''}` : ''}` : 'Notificações: nenhuma ocorrência nova')
    : (total ? `Notificações: ${total} ocorrência${total > 1 ? 's atualizadas' : ' atualizada'} pelo administrador` : 'Notificações CCO');

  return (
    <div ref={raiz} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-label={rotulo}
        title={rotulo}
        aria-expanded={aberto}
        aria-controls={idPainel}
        className="relative grid h-10 w-10 place-items-center rounded-xl border border-[#dce4f0] bg-white text-[#0b4fa3] transition-colors hover:bg-[#edf5fc] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087ef5] dark:border-slate-700 dark:bg-slate-900 dark:text-sky-200 dark:hover:bg-slate-800"
      >
        <Bell className={cn('h-5 w-5', tocou && 'motion-safe:animate-[cco-sino_0.8s_ease-in-out_2]')} aria-hidden="true" />
        {total > 0 && (
          <span
            aria-hidden="true"
            className={cn(
              'absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] font-bold leading-none text-white ring-2 ring-white dark:ring-[#0f1422]',
              isEquipeAdmin && graves.length ? 'bg-rose-600' : 'bg-[#0b63ce]',
            )}
          >
            {total > 99 ? '99+' : total}
          </span>
        )}
      </button>
      <p className="sr-only" aria-live="polite">{aviso}</p>

      {aberto && (
        <div
          id={idPainel}
          className="absolute right-0 top-full z-50 mt-2 w-[min(400px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-[#dce4f0] bg-white text-left shadow-[0_24px_48px_-20px_rgba(16,48,96,.55)] dark:border-slate-700 dark:bg-[#121826]"
        >
          <div className="flex items-center justify-between gap-2 border-b border-[#e6edf6] px-4 py-3 dark:border-slate-800">
            <p className="text-sm font-extrabold text-[#0d2240] dark:text-slate-100">
              {isEquipeAdmin ? 'Novas ocorrências' : 'Ocorrências da sua unidade'}
            </p>
            <span className="text-xs text-[#5f7391] dark:text-slate-400">
              {isEquipeAdmin
                ? (total ? `${total} sem visualização` : 'Tudo em dia')
                : (atualizadasIds.length ? `${atualizadasIds.length} atualizada${atualizadasIds.length > 1 ? 's' : ''}` : 'CCO ativo')}
            </span>
          </div>

          {/* Lista de Admin/Equipe */}
          {isEquipeAdmin && (
            !total ? (
              <p className="px-4 py-8 text-center text-sm text-[#5f7391] dark:text-slate-400">Nenhuma ocorrência nova. Quando uma unidade registrar, ela aparece aqui.</p>
            ) : (
              <ul className="max-h-[min(460px,70vh)] divide-y divide-[#edf2f8] overflow-y-auto dark:divide-slate-800">
                {ordenadasAdmin.map((oc) => {
                  const gravidade = gravidadeDe(oc);
                  const camera = oc.tipo_registro === 'camera';
                  return (
                    <li key={oc.id}>
                      <button
                        type="button"
                        onClick={() => abrir(oc)}
                        className={cn(
                          'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#0b63ce]',
                          gravidade.grave ? 'bg-rose-50/70 hover:bg-rose-50 dark:bg-rose-950/20 dark:hover:bg-rose-950/30' : 'hover:bg-[#f5f9fe] dark:hover:bg-slate-800/50',
                        )}
                      >
                        <span
                          className={cn(
                            'mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full',
                            gravidade.grave ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200' : 'bg-[#e8f1fd] text-[#0b63ce] dark:bg-sky-500/10 dark:text-sky-300',
                          )}
                          aria-hidden="true"
                        >
                          {gravidade.grave ? <AlertTriangle className="h-4 w-4" /> : camera ? <Camera className="h-4 w-4" /> : <ClipboardList className="h-4 w-4" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5 text-sm font-bold text-[#0d2240] dark:text-slate-100">
                            <School className="h-3.5 w-3.5 shrink-0 text-[#5f7391]" aria-hidden="true" />
                            <span className="truncate">{oc.unidade_nome}</span>
                          </span>
                          <span className="mt-0.5 block text-xs text-[#5f7391] dark:text-slate-400">
                            {oc.protocolo} · {camera ? `Câmera: ${oc.tipo_problema || 'problema'}` : 'Ocorrência'} · {formatarData(oc.data_ocorrencia)}
                          </span>
                          <span className="mt-1 line-clamp-2 block text-[13px] text-[#3b4d68] dark:text-slate-300">{oc.descricao}</span>
                          {gravidade.grave && (
                            <span className="mt-1.5 block rounded-lg bg-rose-100 px-2 py-1.5 text-xs font-semibold text-rose-800 dark:bg-rose-500/15 dark:text-rose-200">
                              Caso grave{gravidade.categoria ? ` · ${gravidade.categoria}` : ''}: extraia as imagens das câmeras e guarde na nuvem.
                            </span>
                          )}
                          <span className="mt-1 block text-[11px] text-[#8a9bb3] dark:text-slate-500">Registrada em {formatarDataHora(oc.created_at)}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )
          )}

          {/* Lista da Unidade Escolar (usuário comum) */}
          {isUnidade && (
            !listaUnidade.length ? (
              <p className="px-4 py-8 text-center text-sm text-[#5f7391] dark:text-slate-400">Nenhuma ocorrência registrada por esta unidade escolar ainda.</p>
            ) : (
              <ul className="max-h-[min(460px,70vh)] divide-y divide-[#edf2f8] overflow-y-auto dark:divide-slate-800">
                {listaUnidade.map((oc) => {
                  const foiAtualizada = atualizadasIds.includes(oc.id);
                  return (
                    <li key={oc.id}>
                      <button
                        type="button"
                        onClick={() => abrir(oc)}
                        className={cn(
                          'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#0b63ce]',
                          foiAtualizada ? 'bg-sky-50/80 hover:bg-sky-100/70 dark:bg-sky-950/20' : 'hover:bg-[#f5f9fe] dark:hover:bg-slate-800/50',
                        )}
                      >
                        <span
                          className={cn(
                            'mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full',
                            foiAtualizada ? 'bg-[#0b63ce] text-white' : 'bg-[#e8f1fd] text-[#0b63ce] dark:bg-sky-500/10 dark:text-sky-300',
                          )}
                          aria-hidden="true"
                        >
                          {oc.situacao === 'concluida' ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5 text-sm font-bold text-[#0d2240] dark:text-slate-100">
                            <span>{oc.protocolo}</span>
                            {foiAtualizada && (
                              <span className="rounded-full bg-sky-600 px-1.5 py-0.5 text-[10px] font-extrabold text-white">
                                Atualizada
                              </span>
                            )}
                          </span>
                          <span className="mt-0.5 block text-xs text-[#5f7391] dark:text-slate-400">
                            Situação: <strong className="capitalize text-[#0d2240] dark:text-slate-200">{oc.situacao}</strong> · {formatarData(oc.data_ocorrencia)}
                          </span>
                          <span className="mt-1 line-clamp-2 block text-[13px] text-[#3b4d68] dark:text-slate-300">{oc.descricao}</span>
                          {oc.visualizada_em && (
                            <span className="mt-1 block text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                              ✓ Visualizada pela administração do CCO
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )
          )}

          <button
            type="button"
            onClick={() => { setAberto(false); navigate('/cco'); }}
            className="flex w-full items-center justify-center gap-1.5 border-t border-[#e6edf6] px-4 py-3 text-sm font-bold text-[#0b63ce] hover:bg-[#f5f9fe] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#0b63ce] dark:border-slate-800 dark:text-sky-300 dark:hover:bg-slate-800/50"
          >
            Ver todas as ocorrências <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
};

import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { ccoService } from '@/services/ccoService';
import { UserProfile } from '@/types';

export const useOcorrencias = (user: UserProfile, opcoes: { atualizarSozinho?: boolean } = {}) =>
  useQuery({
    queryKey: ['cco', 'ocorrencias', user.id],
    queryFn: () => ccoService.listarOcorrencias(user),
    staleTime: 30_000,
    // Painel da equipe: novas ocorrências aparecem sem recarregar a página.
    refetchInterval: opcoes.atualizarSozinho ? 60_000 : false,
  });

export const useUnidade = (id?: string | null) =>
  useQuery({
    queryKey: ['cco', 'unidade', id],
    queryFn: () => ccoService.getUnidade(id),
    enabled: Boolean(id),
    staleTime: 10 * 60_000,
  });

/** O detalhe aberto fica na URL (?ocorrencia=…): o botão Voltar fecha e o link pode ser compartilhado. */
export const useDetalheNaUrl = () => {
  const [params, setParams] = useSearchParams();
  const id = params.get('ocorrencia');
  const abrir = useCallback((novo: string) => setParams((atual) => { atual.set('ocorrencia', novo); return atual; }), [setParams]);
  const fechar = useCallback(() => setParams((atual) => { atual.delete('ocorrencia'); return atual; }, { replace: true }), [setParams]);
  return { id, abrir, fechar };
};

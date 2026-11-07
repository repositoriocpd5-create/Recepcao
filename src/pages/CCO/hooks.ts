import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { ccoService } from '@/services/ccoService';
import { UserProfile } from '@/types';

export const useOcorrencias = (user: UserProfile, opcoes: { atualizarSozinho?: boolean } = {}) =>
  useQuery({
    queryKey: ['cco', 'ocorrencias', user.id],
    queryFn: () => ccoService.listarOcorrencias(user),
    staleTime: 15_000,
    // Novas ocorrências (equipe) e mudanças de situação (escola) aparecem sem recarregar:
    // atualiza de tempos em tempos e sempre que a pessoa volta para a aba.
    refetchInterval: opcoes.atualizarSozinho ? 60_000 : 30_000,
    refetchOnWindowFocus: true,
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
  const acao = params.get('acao');
  const abrir = useCallback((novo: string, novaAcao?: 'andamento') => setParams((atual) => {
    atual.set('ocorrencia', novo);
    if (novaAcao) atual.set('acao', novaAcao); else atual.delete('acao');
    return atual;
  }), [setParams]);
  const fechar = useCallback(() => setParams((atual) => { atual.delete('ocorrencia'); atual.delete('acao'); return atual; }, { replace: true }), [setParams]);
  return { id, acao, abrir, fechar };
};

import type { CcoSituacao } from '@/types';

/** Sugestão de "Situação após o andamento": só pré-seleciona; quem registra confirma ou troca. */
export interface SugestaoSituacao {
  /** null = manter a situação atual. */
  situacao: Extract<CcoSituacao, 'em_analise' | 'em_atendimento'> | null;
  motivo: string;
  origem: 'jev' | 'ia' | 'palavras';
}

// Mesma regra da Edge Function cco-sugerir-situacao (reserva sem IA).
const ATENDIMENTO = /\b(acionad\w*|enviad\w*|desloc\w*|ronda|guarda municipal|gm|policia\w*|pm|viatura\w*|tecnic\w*|manutenc\w*|visita\w*|no local|in loco|substitu\w*|consert\w*|repar\w*|troca\w*|providenc\w*|encaminhad\w*|equipe (foi|esta|seguiu)|a caminho)\b/;
const ANALISE = /\b(verific\w*|confer\w*|analis\w*|aguard\w*|solicit\w*|imagens?|grava\w*|camera\w*|contato|levantament\w*|apurand\w*|checand\w*|averigu\w*)\b/;

export const sugerirSituacaoPorPalavras = (texto: string, atual: CcoSituacao): SugestaoSituacao => {
  const limpo = texto.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[̀-ͯ]/g, '');
  let sugestao: SugestaoSituacao;
  if (ATENDIMENTO.test(limpo)) sugestao = { situacao: 'em_atendimento', motivo: 'O texto descreve uma ação em campo (equipe, ronda, polícia, manutenção ou visita).', origem: 'palavras' };
  else if (ANALISE.test(limpo)) sugestao = { situacao: 'em_analise', motivo: 'O texto descreve verificação de imagens ou levantamento de informações.', origem: 'palavras' };
  else sugestao = { situacao: null, motivo: 'O texto não indica mudança de situação.', origem: 'palavras' };
  return sugestao.situacao === atual ? { ...sugestao, situacao: null } : sugestao;
};

export const ROTULO_ORIGEM_SUGESTAO: Record<SugestaoSituacao['origem'], string> = {
  jev: 'Sugestão da IA JEV',
  ia: 'Sugestão da IA',
  palavras: 'Sugestão automática',
};

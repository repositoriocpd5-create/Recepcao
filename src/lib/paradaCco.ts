import { CcoOcorrencia } from '@/types';

const FUSO = 'America/Sao_Paulo';
const formatoDia = new Intl.DateTimeFormat('en-CA', { timeZone: FUSO });

/** Dias de calendário (fuso de Brasília) entre um instante ISO e agora. */
export const diasDesde = (iso?: string | null, agora: Date = new Date()): number => {
  if (!iso) return 0;
  const alvo = new Date(iso);
  if (Number.isNaN(alvo.getTime())) return 0;
  const [a, m, d] = formatoDia.format(alvo).split('-').map(Number);
  const [a2, m2, d2] = formatoDia.format(agora).split('-').map(Number);
  return Math.max(0, Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a, m - 1, d)) / 86_400_000));
};

export const LIMITE_SEM_ATUALIZACAO = 5;
export const LIMITE_AGUARDANDO = 10;

export type TomParada = 'critico' | 'atencao' | 'ok';

export interface Parada {
  tom: TomParada;
  /** 'sem_atualizacao' | 'aguardando' | 'ultima' */
  tipo: 'sem_atualizacao' | 'aguardando' | 'ultima';
  dias: number;
  /** Texto curto, ex.: "Sem atualização há 6 dias". */
  texto: string;
  /** Dias desde o cadastro e desde a última atualização. */
  diasAberta: number;
  diasSemAtualizar: number;
}

const diasTxt = (n: number) => (n === 1 ? '1 dia' : `${n} dias`);

/** Estado de andamento de uma ocorrência em aberto; null quando concluída. */
export const paradaDe = (oc: CcoOcorrencia, agora: Date = new Date()): Parada | null => {
  if (oc.situacao === 'concluida') return null;
  const diasAberta = diasDesde(oc.created_at, agora);
  const diasSemAtualizar = diasDesde(oc.updated_at || oc.created_at, agora);
  const base = { diasAberta, diasSemAtualizar };

  if (diasSemAtualizar >= LIMITE_SEM_ATUALIZACAO) {
    return { ...base, tom: 'critico', tipo: 'sem_atualizacao', dias: diasSemAtualizar, texto: `Sem atualização há ${diasTxt(diasSemAtualizar)}` };
  }
  if (diasAberta >= LIMITE_AGUARDANDO) {
    return { ...base, tom: 'atencao', tipo: 'aguardando', dias: diasAberta, texto: `Aguardando resolução há ${diasTxt(diasAberta)}` };
  }
  return {
    ...base, tom: 'ok', tipo: 'ultima', dias: diasSemAtualizar,
    texto: diasSemAtualizar === 0 ? 'Atualizada hoje' : `Última atualização há ${diasTxt(diasSemAtualizar)}`,
  };
};

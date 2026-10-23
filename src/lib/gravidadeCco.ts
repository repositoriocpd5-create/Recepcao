/**
 * Reserva da análise de gravidade do CCO: palavras-chave em português.
 * A análise principal é da IA (Edge Function cco-analisar-ocorrencia); esta lista é usada no
 * modo demonstração e enquanto a IA não respondeu. A Edge Function tem uma cópia desta lista.
 */

export interface ResultadoGravidade {
  grave: boolean;
  categoria: string | null;
  motivo: string | null;
}

const CATEGORIAS: { categoria: string; termos: RegExp }[] = [
  { categoria: 'Roubo ou furto', termos: /\b(roub\w*|furt\w*|assalt\w*|arromb\w*|levaram|subtra\w*)\b/ },
  { categoria: 'Invasão', termos: /\b(invas\w*|invadi\w*|pulou o muro|pularam o muro|escal\w* o muro|cadeado (rompido|quebrado|cortado|arrombado))\b/ },
  { categoria: 'Violência ou briga', termos: /\b(violen\w*|agred\w*|agress\w*|brig\w*|espanc\w*|soco\w*|chute\w*|lesao|ferid\w*|sangr\w*)\b/ },
  { categoria: 'Abuso ou assédio', termos: /\b(abus\w*|assedi\w*|estupr\w*|importun\w*|molest\w*)\b/ },
  { categoria: 'Ameaça ou arma', termos: /\b(amea\w*|arma\w*|faca\w*|revolver|pistola|tiro\w*|disparo\w*|baleado)\b/ },
  { categoria: 'Drogas', termos: /\b(drog\w*|trafic\w*|entorpecent\w*)\b/ },
  { categoria: 'Vandalismo ou incêndio', termos: /\b(vandal\w*|depred\w*|incendi\w*|pichac\w*|quebraram)\b/ },
  { categoria: 'Sequestro ou desaparecimento', termos: /\b(sequestr\w*|desaparec\w*)\b/ },
];

const normalizar = (texto: string) =>
  texto.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[̀-ͯ]/g, '');

export function classificarPorPalavras(texto: string): ResultadoGravidade {
  const limpo = normalizar(texto);
  const achadas = CATEGORIAS.filter((c) => c.termos.test(limpo)).map((c) => c.categoria);
  if (!achadas.length) return { grave: false, categoria: null, motivo: null };
  return {
    grave: true,
    categoria: achadas.join(' · '),
    motivo: 'O texto menciona termos ligados a crime ou violência.',
  };
}

/** Texto da sugestão mostrada ao administrador quando o caso é grave. */
/** Primeiro nome para a saudação do alerta ("Wesley Pinheiro…" → "Wesley"; "cpdinfra" → "Cpdinfra"). */
export const primeiroNome = (nome?: string | null) => {
  const primeiro = (nome || '').trim().split(/\s+/)[0] || '';
  return primeiro ? primeiro.charAt(0).toLocaleUpperCase('pt-BR') + primeiro.slice(1).toLocaleLowerCase('pt-BR') : '';
};

export const SUGESTAO_IMAGENS =
  'Extraia agora as imagens das câmeras do período informado e guarde uma cópia na nuvem para averiguação posterior. ' +
  'As gravações costumam ser sobrescritas em poucos dias e podem ser pedidas pela polícia, pelo Conselho Tutelar ou pela Justiça.';

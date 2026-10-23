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
  { categoria: 'Violência ou briga', termos: /\b(violen\w*|agred\w*|agress\w*|brig\w*|espanc\w*|soco\w*|chute\w*|lesao|ferid\w*|sangr\w*|enforc\w*|estrangul\w*|esganad\w*|apert\w* o pescoco|compressao do pescoco|esfaque\w*|canivete|estilete|objeto cortante)\b/ },
  { categoria: 'Abuso ou assédio', termos: /\b(abus\w*|assedi\w*|estupr\w*|importun\w*|molest\w*|ato libidinoso|toques? indevidos?)\b/ },
  { categoria: 'Ameaça ou arma', termos: /\b(amea\w*|arma\w*|faca\w*|revolver|pistola|tiro\w*|disparo\w*|baleado|simulacro)\b/ },
  { categoria: 'Drogas', termos: /\b(drog\w*|trafic\w*|entorpecent\w*)\b/ },
  { categoria: 'Vandalismo ou incêndio', termos: /\b(vandal\w*|depred\w*|incendi\w*|pichac\w*|quebraram)\b/ },
  { categoria: 'Sequestro ou desaparecimento', termos: /\b(sequestr\w*|desaparec\w*|evadiu da (escola|unidade)|fug\w* da (escola|unidade)|saiu da (escola|unidade) sem autoriza\w*|(aluno|aluna|crianca|estudante) nao (foi )?(localizad\w*|encontrad\w*)|nao (foi )?(localizad\w*|encontrad\w*) (o|a) (aluno|aluna|crianca|estudante)|retirad\w* por pessoa nao autorizada|tentativa de retirada|tent\w* (levar|retirar|pegar) (o|a) (aluno|aluna|crianca|estudante))\b/ },
  { categoria: 'Acidente ou lesão grave', termos: /\b(bat\w* (com )?a cabeca|batida na cabeca|traumatismo|queda de altura|ca\w* (da|de|do|na|no) (escada|altura|telhado|muro|janela|brinquedo|arquibancada|laje|arvore)|atingid\w* por|esmag\w*|fratur\w*|quebr\w* (o|a|um|uma) (braco|perna|osso|clavicula|punho|tornozelo|pe|mao|dedo|dente|nariz)|(lesao|machucad\w*|ferimento) (no|na) (pescoco|coluna|olho|olhos)|corte profundo|sangramento|(perd\w*|quebr\w*)\b.{0,20}\bdentes?|dente (quebrado|caiu|arrancado)|queimadura\w*|se queimou|queimou (a|o|as|os) (mao|maos|braco|bracos|pe|pes|rosto|perna|pernas|pele|boca)|choque eletrico|eletrocut\w*|atropel\w*|acidente (no|com o|do|de) (transporte|onibus|van)|afog\w*|submers\w*|ficou pres\w* (no|na|em|entre)|prend\w* (o|a) (dedo|mao|pe|cabeca|braco|perna)|mordid\w*|mordeu|mordida|picad\w*|escorpiao|cobra (picou|mordeu))\b/ },
  { categoria: 'Emergência de saúde', termos: /\b(desmai\w*|perd\w* a consciencia|inconscien\w*|desacordad\w*|convuls\w*|falta de ar|dificuldade\b.{0,15}\b(para|de) respirar|nao conseguia respirar|parou de respirar|engasg\w*|incha\w*\b.{0,25}\b(rosto|boca|lingua|labio|labios|garganta)|anafila\w*|dor (forte|intensa) no peito|dor no peito|dor abdominal (forte|intensa)|(vomit\w*|vomito) (com )?sangue|confus\w* (mental|repentina)|desorienta\w*|nao respond\w* ao ser chamad\w*|nao reag\w*)\b/ },
  { categoria: 'Intoxicação ou ingestão perigosa', termos: /\b(intoxica\w*|envenen\w*|overdose|(ingeriu|ingest\w*|engoliu|bebeu|tomou)\b.{0,40}\b(produto|remedio\w*|medicament\w*|comprimido\w*|pilha|bateria|moeda|ima|objeto|veneno|agua sanitaria|alvejante|desinfetante)|embriag\w*|alcoolizad\w*|bebida alcoolica|vazamento de gas|inal\w* (fumaca|gas)|expost\w* a (fumaca|gas))\b/ },
  { categoria: 'Autoagressão ou risco de suicídio', termos: /\b(autoagress\w*|automutil\w*|auto lesao|autolesao|se cort\w*|cortes nos (bracos|pulsos)|suicid\w*|tirar a propria vida|se matar|quer(ia)? morrer|tentou se matar)\b/ },
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
    motivo: 'O texto menciona termos ligados a crime, violência ou risco à saúde e à integridade física.',
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

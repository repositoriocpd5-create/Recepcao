/**
 * Destaque automático (negrito) de nomes de pessoas e horários em textos de ocorrência.
 * Nome = palavras com inicial maiúscula logo depois de um tratamento ou parentesco
 * ("Sra. Eliana", "aluno Lucas Gabriel", "mãe Maria"); depois, o mesmo nome é destacado onde aparecer.
 */
export interface PalavraDestacada {
  texto: string;
  negrito: boolean;
}

const GATILHOS = new Set([
  'sr', 'sra', 'srª', 'srta', 'dr', 'dra', 'prof', 'profa', 'dona', 'seu',
  'senhor', 'senhora', 'aluno', 'aluna', 'professor', 'professora', 'diretor', 'diretora',
  'coordenador', 'coordenadora', 'servidor', 'servidora', 'funcionário', 'funcionária',
  'mãe', 'pai', 'responsável', 'avó', 'avô', 'vovó', 'vovô', 'tio', 'tia', 'sr.', 'sra.',
]);
const ABREVIATURAS = new Set(['sr', 'sra', 'srª', 'srta', 'dr', 'dra', 'prof', 'profa']);
const CONECTORES = new Set(['de', 'da', 'do', 'dos', 'das', 'e']);
const PONTUACAO_FINAL = /[.,;:!?)”"]$/;
const HORARIO = /^\d{1,2}(h\d{0,2}|:\d{2}h?)$/i;

const nucleo = (palavra: string) => palavra.replace(/^[("“'¿¡]+/, '').replace(/[.,;:!?)”"']+$/, '');
const maiuscula = (palavra: string) => /^\p{Lu}/u.test(nucleo(palavra));

export function destacarNomesEHorarios(paragrafo: string): PalavraDestacada[] {
  const palavras = paragrafo.split(/\s+/).filter(Boolean);
  const negrito = palavras.map(() => false);
  const nomes = new Set<string>();

  palavras.forEach((palavra, i) => {
    const chave = nucleo(palavra).toLocaleLowerCase('pt-BR');
    if (HORARIO.test(nucleo(palavra))) negrito[i] = true;
    if (!GATILHOS.has(chave)) return;
    // "aluno." termina a frase; "Sra." é abreviatura e continua.
    if (PONTUACAO_FINAL.test(palavra) && !(ABREVIATURAS.has(chave) && palavra.endsWith('.') && !/[,;:]$/.test(palavra))) return;
    let j = i + 1;
    while (j < palavras.length) {
      const atual = palavras[j];
      const ehConector = CONECTORES.has(nucleo(atual).toLocaleLowerCase('pt-BR'));
      if (maiuscula(atual)) {
        negrito[j] = true;
        const n = nucleo(atual).toLocaleLowerCase('pt-BR');
        if (n.length >= 3) nomes.add(n);
        if (PONTUACAO_FINAL.test(atual)) break;
        j += 1;
      } else if (ehConector && j + 1 < palavras.length && maiuscula(palavras[j + 1]) && !PONTUACAO_FINAL.test(atual)) {
        negrito[j] = true;
        j += 1;
      } else {
        break;
      }
    }
  });

  palavras.forEach((palavra, i) => {
    if (nomes.has(nucleo(palavra).toLocaleLowerCase('pt-BR'))) negrito[i] = true;
  });

  return palavras.map((texto, i) => ({ texto, negrito: negrito[i] }));
}

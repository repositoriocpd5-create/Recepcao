import { GUIAS, PERGUNTAS, type Guia, type Pergunta } from './conteudo';

export interface ResultadoBusca {
  tipo: 'guia' | 'pergunta';
  id: string;
  titulo: string;
  categoria: string;
  trecho: string;
  pontos: number;
}

/** Minúsculas, sem acentos e com espaços simples. */
export const normalizar = (texto: string) =>
  texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

const textoDoGuia = (guia: Guia) => [
  guia.paraQueServe,
  ...guia.antesDeComecar,
  ...guia.passos.flatMap((passo) => [passo.titulo, passo.texto, passo.nota?.texto ?? '']),
  guia.concluido,
  ...guia.problemas.flatMap((item) => [item.problema, item.solucao]),
].join(' ');

/** Trecho curto ao redor do primeiro termo encontrado. */
const extrairTrecho = (fonte: string, termos: string[], padrao: string) => {
  const normal = normalizar(fonte);
  const posicao = termos.map((termo) => normal.indexOf(termo)).filter((indice) => indice >= 0).sort((a, b) => a - b)[0];
  if (posicao === undefined) return padrao;
  const inicio = Math.max(0, posicao - 40);
  const fim = Math.min(fonte.length, posicao + 110);
  return `${inicio > 0 ? '…' : ''}${fonte.slice(inicio, fim).trim()}${fim < fonte.length ? '…' : ''}`;
};

const pontuar = (termos: string[], campos: Array<[string, number]>) =>
  termos.reduce((total, termo) => {
    const melhor = Math.max(0, ...campos.map(([texto, peso]) => (normalizar(texto).includes(termo) ? peso : 0)));
    return melhor === 0 ? Number.NaN : total + melhor;
  }, 0);

export function buscarNoManual(consulta: string, guias: Guia[] = GUIAS, perguntas: Pergunta[] = PERGUNTAS): ResultadoBusca[] {
  const termos = normalizar(consulta).split(' ').filter((termo) => termo.length >= 2);
  if (!termos.length) return [];

  const resultados: ResultadoBusca[] = [];

  for (const guia of guias) {
    const corpo = textoDoGuia(guia);
    const pontos = pontuar(termos, [
      [guia.titulo, 6],
      [guia.palavrasChave.join(' '), 5],
      [`${guia.categoria} ${guia.descricao}`, 3],
      [corpo, 1],
    ]);
    if (!Number.isNaN(pontos)) {
      resultados.push({ tipo: 'guia', id: guia.id, titulo: guia.titulo, categoria: `Guia · ${guia.categoria}`, trecho: extrairTrecho(corpo, termos, guia.descricao), pontos });
    }
  }

  for (const pergunta of perguntas) {
    const pontos = pontuar(termos, [
      [pergunta.pergunta, 5],
      [pergunta.palavrasChave.join(' '), 4],
      [`${pergunta.resposta} ${pergunta.aviso ?? ''}`, 2],
    ]);
    if (!Number.isNaN(pontos)) {
      resultados.push({ tipo: 'pergunta', id: pergunta.id, titulo: pergunta.pergunta, categoria: 'Pergunta frequente', trecho: pergunta.resposta, pontos });
    }
  }

  return resultados.sort((a, b) => b.pontos - a.pontos);
}

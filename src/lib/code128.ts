/** Código de barras Code 128 (conjunto C para números de tamanho par, B nos demais casos). */
const PADROES = [
  '212222','222122','222221','121223','121322','131222','122213','122312','132212','221213','221312','231212','112232','122132','122231','113222',
  '123122','123221','223211','221132','221231','213212','223112','312131','311222','321122','321221','312212','322112','322211','212123','212321',
  '232121','111323','131123','131321','112313','132113','132311','211313','231113','231311','112133','112331','132131','113123','113321','133121',
  '313121','211331','231131','213113','213311','213131','311123','311321','331121','312113','312311','332111','314111','221411','431111','111224',
  '111422','121124','121421','141122','141221','112214','112412','122114','122411','142112','142211','241211','221114','413111','241112','134111',
  '111242','121142','121241','114212','124112','124211','411212','421112','421211','212141','214121','412121','111143','111341','131141','114113',
  '114311','411113','411311','113141','114131','311141','411131','211412','211214','211232','2331112',
];

/** Larguras alternadas (barra, espaço, barra…) em módulos, já com início, dígito verificador e fim. */
export function code128(texto: string): number[] {
  const apenasDigitos = /^\d+$/.test(texto) && texto.length % 2 === 0;
  const valores: number[] = [];
  if (apenasDigitos) {
    valores.push(105);
    for (let i = 0; i < texto.length; i += 2) valores.push(Number(texto.slice(i, i + 2)));
  } else {
    valores.push(104);
    for (const c of texto) {
      const v = c.charCodeAt(0) - 32;
      if (v < 0 || v > 94) throw new Error('Caractere não suportado no código de barras.');
      valores.push(v);
    }
  }
  const soma = valores.reduce((acc, v, i) => acc + v * (i === 0 ? 1 : i), 0);
  valores.push(soma % 103, 106);
  return valores.flatMap((v) => [...PADROES[v]].map(Number));
}

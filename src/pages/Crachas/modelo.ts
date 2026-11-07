import { Cracha, CrachaModelo } from '@/types';

export const MODELO_PADRAO: CrachaModelo = {
  logo: null,
  linha1: 'Secretaria Municipal de',
  linha2: 'Educação de Itaguaí',
  rotulo: 'VISITANTE',
  corPrimaria: '#0a2d6e',
  corSecundaria: '#1583e0',
  prefixo: '89631245',
  digitosNumero: 4,
  mostrarNumero: true,
  fonteTexto: 'moderna',
  fonteFaixa: 'arialblack',
  tamTexto: 100,
  tamFaixa: 100,
  tamCodigo: 100,
  textoApresente: 'Apresente este código à recepção',
  textoDevolva: 'Devolva este crachá à recepção ao sair.',
};

export const PALETAS = [
  { nome: 'Azul institucional', primaria: '#0a2d6e', secundaria: '#1583e0' },
  { nome: 'Verde', primaria: '#0b5d3b', secundaria: '#2fb36b' },
  { nome: 'Vinho', primaria: '#7a1530', secundaria: '#e0476a' },
  { nome: 'Laranja', primaria: '#8a3b00', secundaria: '#f08a1c' },
  { nome: 'Roxo', primaria: '#3b1d7a', secundaria: '#8b5cf6' },
  { nome: 'Grafite', primaria: '#1f2937', secundaria: '#64748b' },
];

/** Fontes instaladas na maioria dos computadores (o PDF/PNG usa as fontes do aparelho que gera). */
export const FONTES: Record<string, { nome: string; css: string }> = {
  moderna: { nome: 'Moderna (Segoe UI)', css: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif" },
  arial: { nome: 'Arial', css: 'Arial, Helvetica, sans-serif' },
  verdana: { nome: 'Verdana (larga)', css: 'Verdana, Geneva, sans-serif' },
  trebuchet: { nome: 'Trebuchet MS', css: "'Trebuchet MS', Tahoma, sans-serif" },
  georgia: { nome: 'Georgia (serifada)', css: "Georgia, 'Times New Roman', serif" },
  times: { nome: 'Times New Roman', css: "'Times New Roman', Times, serif" },
  impacto: { nome: 'Impacto (forte)', css: "Impact, 'Arial Narrow Bold', 'Arial Black', sans-serif" },
  arialblack: { nome: 'Arial Black', css: "'Arial Black', 'Arial Bold', Arial, sans-serif" },
  courier: { nome: 'Courier New (máquina)', css: "'Courier New', Courier, monospace" },
};

export const cssFonte = (chave: string) => (FONTES[chave] ?? FONTES.moderna).css;

export const mesclarModelo = (parcial: Partial<CrachaModelo> | null | undefined): CrachaModelo => ({ ...MODELO_PADRAO, ...(parcial ?? {}) });

/** Código de barras do crachá: prefixo + número com zeros à esquerda (termina sempre no número). */
export const codigoDoCracha = (m: CrachaModelo, numero: number) =>
  `${m.prefixo.replace(/\D/g, '')}${String(numero).padStart(Math.max(1, m.digitosNumero), '0')}`;

export const legendaDoCracha = (m: CrachaModelo, numero: number) => `${m.rotulo.trim().toUpperCase()} ${numero}`;

/** Separa "VISITANTE 11" em rótulo e número (para reimprimir crachás já cadastrados). */
export function partesDaLegenda(descricao: string | undefined, modelo: CrachaModelo): { rotulo: string; numero: string } {
  const m = /^(.*?)\s*(\d+)\s*$/.exec((descricao || '').trim());
  return m && m[1] ? { rotulo: m[1].toUpperCase(), numero: String(Number(m[2])) } : { rotulo: (descricao || modelo.rotulo).trim().toUpperCase(), numero: '' };
}

/** Próximo número livre para o rótulo atual (reaproveita números vagos). */
export function proximoNumeroLivre(crachas: Cracha[], modelo: CrachaModelo): number {
  const rotulo = modelo.rotulo.trim().toUpperCase();
  const usados = new Set(
    crachas
      .map((c) => { const p = partesDaLegenda(c.descricao, modelo); return p.rotulo === rotulo && p.numero ? Number(p.numero) : null; })
      .filter((n): n is number => n !== null),
  );
  let n = 1;
  while (usados.has(n)) n += 1;
  return n;
}

export interface DadosCracha {
  rotulo: string;
  numero: string;
  codigo: string;
}

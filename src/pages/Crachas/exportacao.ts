import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { jsPDF } from 'jspdf';
import { CrachaModelo } from '@/types';
import { ALTURA, CrachaArte, LARGURA } from './CrachaArte';
import { DadosCracha } from './modelo';

const BRASAO_PADRAO = '/assets/brasao_itaguai.png';

const blobParaDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(String(leitor.result));
    leitor.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
    leitor.readAsDataURL(blob);
  });

/** Logo do modelo (ou o brasão padrão) como data URL, pronta para ser embutida no SVG exportado. */
export async function resolverLogo(modelo: CrachaModelo): Promise<string> {
  if (modelo.logo) return modelo.logo;
  const resposta = await fetch(BRASAO_PADRAO);
  if (!resposta.ok) throw new Error('Não foi possível carregar o brasão padrão.');
  return blobParaDataUrl(await resposta.blob());
}

/** Reduz a imagem enviada (mantendo a transparência) para caber no modelo sem pesar no banco. */
export async function prepararLogo(arquivo: File, maxLado = 520): Promise<string> {
  if (!/^image\/(png|jpe?g|webp|svg\+xml)$/.test(arquivo.type)) throw new Error('Use uma imagem PNG, JPG, WebP ou SVG.');
  if (arquivo.size > 8 * 1024 * 1024) throw new Error('A imagem é grande demais (máximo 8 MB).');
  const url = await blobParaDataUrl(arquivo);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Não foi possível abrir a imagem.'));
    el.src = url;
  });
  const escala = Math.min(1, maxLado / Math.max(img.naturalWidth || maxLado, img.naturalHeight || maxLado));
  const largura = Math.max(1, Math.round((img.naturalWidth || maxLado) * escala));
  const altura = Math.max(1, Math.round((img.naturalHeight || maxLado) * escala));
  const canvas = document.createElement('canvas');
  canvas.width = largura;
  canvas.height = altura;
  canvas.getContext('2d')!.drawImage(img, 0, 0, largura, altura);
  return canvas.toDataURL('image/png');
}

export const svgDoCracha = (lado: 'frente' | 'verso', modelo: CrachaModelo, dados: DadosCracha, logo: string) =>
  renderToStaticMarkup(React.createElement(CrachaArte, { lado, modelo, dados, logo, idBase: `x${lado[0]}` }))
    .replace('width="100%"', `width="${LARGURA}" height="${ALTURA}"`);

/** SVG → PNG (data URL) na largura pedida. */
export async function svgParaPng(svg: string, largura = 648): Promise<string> {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Não foi possível desenhar o crachá.'));
      el.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = largura;
    canvas.height = Math.round((largura * ALTURA) / LARGURA);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function baixarArquivo(url: string, nome: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.click();
}

const CARTAO_W = 54;
const CARTAO_H = 86;
const COLUNAS = 3;
const LINHAS = 3;
const FOLGA = 6;

/**
 * PDF A4 com 9 crachás de 54 × 86 mm por folha (3 × 3). Com verso, cada folha de frentes é seguida pela
 * folha de versos com as colunas espelhadas, para imprimir frente e verso (virar pela borda longa).
 */
export async function gerarPdfCrachas(modelo: CrachaModelo, lista: DadosCracha[], comVerso: boolean): Promise<jsPDF> {
  const logo = await resolverLogo(modelo);
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const margemX = (210 - (COLUNAS * CARTAO_W + (COLUNAS - 1) * FOLGA)) / 2;
  const margemY = (297 - (LINHAS * CARTAO_H + (LINHAS - 1) * FOLGA)) / 2;
  const porFolha = COLUNAS * LINHAS;

  for (let inicio = 0; inicio < lista.length; inicio += porFolha) {
    const grupo = lista.slice(inicio, inicio + porFolha);
    const lados: ('frente' | 'verso')[] = comVerso ? ['frente', 'verso'] : ['frente'];
    for (const lado of lados) {
      if (inicio > 0 || lado === 'verso') pdf.addPage();
      for (let i = 0; i < grupo.length; i += 1) {
        const linha = Math.floor(i / COLUNAS);
        const coluna = lado === 'verso' ? COLUNAS - 1 - (i % COLUNAS) : i % COLUNAS;
        const png = await svgParaPng(svgDoCracha(lado, modelo, grupo[i], logo), 648);
        pdf.addImage(png, 'PNG', margemX + coluna * (CARTAO_W + FOLGA), margemY + linha * (CARTAO_H + FOLGA), CARTAO_W, CARTAO_H);
      }
    }
  }
  return pdf;
}

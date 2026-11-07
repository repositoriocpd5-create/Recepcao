import React from 'react';
import QRCode from 'qrcode';
import { code128 } from '@/lib/code128';
import { CrachaModelo } from '@/types';
import { DadosCracha, cssFonte } from './modelo';

export const LARGURA = 640;
export const ALTURA = 1020;
/** Largura máxima: se o texto estimado passar dela, o navegador comprime as letras para caber. */
const caber = (texto: string, tamanho: number, max: number, razao = 0.55) => (texto.length * tamanho * razao > max ? max : undefined);

/** Barras do Code 128 desenhadas como retângulos dentro da área informada. */
const Barras: React.FC<{ valor: string; x: number; y: number; w: number; h: number }> = ({ valor, x, y, w, h }) => {
  const mods = code128(valor);
  const un = w / mods.reduce((a, b) => a + b, 0);
  let pos = x;
  const retas: React.ReactNode[] = [];
  mods.forEach((m, i) => {
    if (i % 2 === 0) retas.push(<rect key={i} x={pos} y={y} width={m * un} height={h} fill="#000" shapeRendering="crispEdges" />);
    pos += m * un;
  });
  return <>{retas}</>;
};

const Qr: React.FC<{ valor: string; x: number; y: number; tam: number }> = ({ valor, x, y, tam }) => {
  const qr = QRCode.create(valor, { errorCorrectionLevel: 'M' });
  const n = qr.modules.size;
  const un = tam / n;
  const celulas: React.ReactNode[] = [];
  for (let r = 0; r < n; r += 1) {
    for (let c = 0; c < n; c += 1) {
      if (qr.modules.get(r, c)) celulas.push(<rect key={`${r}-${c}`} x={x + c * un} y={y + r * un} width={un + 0.4} height={un + 0.4} fill="#000" shapeRendering="crispEdges" />);
    }
  }
  return <>{celulas}</>;
};

interface Props {
  lado: 'frente' | 'verso';
  modelo: CrachaModelo;
  dados: DadosCracha;
  /** Logo já resolvida (data URL) — necessária para exportar em imagem/PDF. */
  logo: string;
  idBase?: string;
}

/** Arte do crachá em SVG (640 × 1020, proporção 54 × 86 mm): serve para a prévia, impressão, PNG e PDF. */
export const CrachaArte: React.FC<Props> = ({ lado, modelo, dados, logo, idBase = 'cr' }) => {
  const { corPrimaria: P, corSecundaria: S } = modelo;
  const rotulo = dados.rotulo.toUpperCase();
  const comNumero = Boolean(dados.numero) && modelo.mostrarNumero;
  const FONTE = cssFonte(modelo.fonteTexto);
  const FONTE_FORTE = cssFonte(modelo.fonteFaixa);
  const kt = (modelo.tamTexto || 100) / 100;
  const kf = (modelo.tamFaixa || 100) / 100;
  const kc = (modelo.tamCodigo || 100) / 100;

  const Furo = (
    <g>
      <rect x={210} y={34} width={220} height={38} rx={19} fill="#dfe6ef" />
      <rect x={216} y={38} width={208} height={30} rx={15} fill="#9aa8bb" />
    </g>
  );

  const Defs = (
    <defs>
      <linearGradient id={`${idBase}-p`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={P} /><stop offset="1" stopColor={S} stopOpacity=".9" /></linearGradient>
      <linearGradient id={`${idBase}-s`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor={S} /><stop offset="1" stopColor={P} /></linearGradient>
      <clipPath id={`${idBase}-c`}><rect width={LARGURA} height={ALTURA} rx={40} /></clipPath>
    </defs>
  );

  const Contorno = <rect x={1.5} y={1.5} width={LARGURA - 3} height={ALTURA - 3} rx={39} fill="none" stroke="#c9d3e0" strokeWidth={3} />;

  if (lado === 'frente') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${LARGURA} ${ALTURA}`} width="100%" role="img" aria-label={`Frente do crachá ${dados.rotulo} ${dados.numero}`} fontFamily={FONTE}>
        {Defs}
        <g clipPath={`url(#${idBase}-c)`}>
          <rect width={LARGURA} height={ALTURA} fill="#ffffff" />
          {Furo}
          <image href={logo} x={225} y={92} width={190} height={232} preserveAspectRatio="xMidYMid meet" />
          <line x1={26} x2={86} y1={384} y2={384} stroke={P} strokeWidth={3} />
          <line x1={554} x2={614} y1={384} y2={384} stroke={P} strokeWidth={3} />
          <text x={320} y={398} textAnchor="middle" fontSize={36 * kt} fill={P} textLength={caber(modelo.linha1, 36 * kt, 440)} lengthAdjust="spacingAndGlyphs">{modelo.linha1}</text>
          <text x={320} y={462} textAnchor="middle" fontSize={54 * kt} fontWeight={800} fill={P} textLength={caber(modelo.linha2, 54 * kt, 580, 0.58)} lengthAdjust="spacingAndGlyphs">{modelo.linha2}</text>
          <rect x={44} y={490} width={552} height={6} rx={3} fill={S} opacity={0.55} />
          <rect x={16} y={522} width={608} height={comNumero ? 190 : 160} rx={22} fill={`url(#${idBase}-p)`} />
          <text x={320} y={comNumero ? 632 : 636} textAnchor="middle" fontSize={118 * kf} fontWeight={900} fontFamily={FONTE_FORTE} fill="#fff"
            textLength={caber(rotulo, 118 * kf, 560, 0.6)} lengthAdjust="spacingAndGlyphs">{rotulo}</text>
          {comNumero && <text x={320} y={690} textAnchor="middle" fontSize={44 * Math.min(kf, 1.1)} fontWeight={800} fill="#fff" opacity={0.92} letterSpacing={4}>Nº {dados.numero}</text>}
          <path d="M0 740 C 160 690, 300 770, 460 730 S 600 700, 640 716 L640 1020 L0 1020 Z" fill={`url(#${idBase}-s)`} />
          <path d="M0 780 C 180 740, 320 810, 480 770 S 610 750, 640 760 L640 1020 L0 1020 Z" fill="#fff" opacity={0.16} />
          <rect x={44} y={790} width={552} height={196} rx={26} fill="#fff" />
          <Barras valor={dados.codigo} x={72} y={808} w={496} h={118} />
          <text x={320} y={968} textAnchor="middle" fontSize={44 * kc} fontWeight={600} fill="#111" letterSpacing={3} textLength={caber(dados.codigo, 44 * kc, 500, 0.7)} lengthAdjust="spacingAndGlyphs">{dados.codigo}</text>
        </g>
        {Contorno}
      </svg>
    );
  }

  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${LARGURA} ${ALTURA}`} width="100%" role="img" aria-label={`Verso do crachá ${dados.rotulo} ${dados.numero}`} fontFamily={FONTE}>
      {Defs}
      <g clipPath={`url(#${idBase}-c)`}>
        <rect width={LARGURA} height={ALTURA} fill="#eef4fb" />
        <polygon points="0,0 330,0 0,330" fill={`url(#${idBase}-p)`} />
        <polygon points="0,0 230,0 0,230" fill={P} opacity={0.85} />
        <polygon points="640,1020 640,700 320,1020" fill={`url(#${idBase}-p)`} />
        <polygon points="640,1020 640,820 420,1020" fill={S} opacity={0.75} />
        {Furo}
        <image href={logo} x={245} y={92} width={150} height={182} preserveAspectRatio="xMidYMid meet" />
        <text x={320} y={330} textAnchor="middle" fontSize={32 * kt} fontWeight={700} fill={P} textLength={caber(modelo.linha1, 32 * kt, 500)} lengthAdjust="spacingAndGlyphs">{modelo.linha1.toUpperCase()}</text>
        <text x={320} y={392} textAnchor="middle" fontSize={54 * kt} fontWeight={900} fill={P} textLength={caber(modelo.linha2, 54 * kt, 580, 0.6)} lengthAdjust="spacingAndGlyphs">{modelo.linha2.toUpperCase()}</text>
        <rect x={100} y={408} width={440} height={4} fill={S} />
        <rect x={50} y={428} width={540} height={86} rx={16} fill={P} />
        <text x={320} y={494} textAnchor="middle" fontSize={64 * kf} fontWeight={900} fontFamily={FONTE_FORTE} fill="#fff"
          textLength={caber(rotulo, 64 * kf, 500, 0.6)} lengthAdjust="spacingAndGlyphs">{rotulo}</text>
        <text x={320} y={556} textAnchor="middle" fontSize={26 * kt} fontWeight={800} fill={P}>IDENTIFICAÇÃO DO CRACHÁ{comNumero ? ` · Nº ${dados.numero}` : ''}</text>
        <rect x={110} y={574} width={420} height={330} rx={20} fill="#fff" stroke="#d3deec" strokeWidth={2} />
        <Qr valor={dados.codigo} x={180} y={588} tam={280} />
        <text x={320} y={894} textAnchor="middle" fontSize={23 * kt} fontWeight={700} fill="#33415a" textLength={caber(modelo.textoApresente, 23 * kt, 390)} lengthAdjust="spacingAndGlyphs">{modelo.textoApresente}</text>
        <rect x={40} y={924} width={560} height={80} rx={14} fill="#fff" opacity={0.94} />
        <text x={320} y={956} textAnchor="middle" fontSize={32 * kc} fontWeight={800} fill={P} letterSpacing={3} textLength={caber(dados.codigo, 32 * kc, 520, 0.7)} lengthAdjust="spacingAndGlyphs">{dados.codigo}</text>
        <text x={320} y={988} textAnchor="middle" fontSize={22 * kt} fontWeight={600} fill="#33415a" textLength={caber(modelo.textoDevolva, 22 * kt, 520)} lengthAdjust="spacingAndGlyphs">{modelo.textoDevolva}</text>
      </g>
      {Contorno}
    </svg>
  );
};

import type { jsPDF } from 'jspdf';
import { CcoHistorico, CcoOcorrencia } from '@/types';
import { SITUACOES, descreverEvento, descreverHorario, formatarData, formatarDataHora, gravidadeDe } from '@/services/ccoService';
import { SUGESTAO_IMAGENS } from '@/lib/gravidadeCco';

type RGB = [number, number, number];

const AZUL_ESCURO: RGB = [7, 29, 65];
const AZUL_ESCURO_FIM: RGB = [17, 56, 130];
const AZUL: RGB = [11, 99, 206];
const CINZA: RGB = [98, 114, 137];
const LINHA: RGB = [223, 230, 240];
const FUNDO_SUAVE: RGB = [244, 249, 255];
const VERMELHO: RGB = [185, 28, 28];
const VERMELHO_FUNDO: RGB = [253, 242, 242];
const ROSA_TEXTO: RGB = [59, 13, 23];
const ROSA_FUNDO: RGB = [254, 244, 245];
const BARRA_ROSA: RGB = [225, 90, 105];

const MARGEM = 14;
const LARGURA = 182;
const RODAPE_Y = 282;

const COR_SITUACAO: Record<string, RGB> = {
  registrada: [2, 132, 199],
  em_analise: [217, 119, 6],
  em_atendimento: [124, 58, 237],
  concluida: [5, 122, 85],
};

const carregarBrasao = async (): Promise<string | null> => {
  try {
    const resposta = await fetch('/assets/brasao_itaguai.png');
    if (!resposta.ok) return null;
    const blob = await resposta.blob();
    return await new Promise((resolve, reject) => {
      const leitor = new FileReader();
      leitor.onload = () => resolve(String(leitor.result));
      leitor.onerror = reject;
      leitor.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

/** jsPDF não tem degradê: faixas finas lado a lado simulam o véu azul do cabeçalho. */
const faixaDegrade = (doc: jsPDF, x: number, y: number, largura: number, altura: number, de: RGB, ate: RGB) => {
  const passos = 90;
  const passo = largura / passos;
  for (let i = 0; i < passos; i += 1) {
    const t = i / (passos - 1);
    doc.setFillColor(
      Math.round(de[0] + (ate[0] - de[0]) * t),
      Math.round(de[1] + (ate[1] - de[1]) * t),
      Math.round(de[2] + (ate[2] - de[2]) * t),
    );
    doc.rect(x + i * passo, y, passo + 0.3, altura, 'F');
  }
};

const ROTULO_TEXTO: Partial<Record<CcoHistorico['tipo'], string>> = {  observacao: 'Andamento',
  andamento: 'Andamento',
  solucao: 'Solução',
  reabertura: 'Motivo da reabertura',
};

const textoDoEvento = (evento: CcoHistorico) => {
  const rotulo = ROTULO_TEXTO[evento.tipo];
  return rotulo ? `${rotulo}: ${evento.descricao ?? ''}`.trim() : descreverEvento(evento);
};

const corDoEvento = (evento: CcoHistorico): RGB => {
  if (evento.situacao_nova) return COR_SITUACAO[evento.situacao_nova] ?? CINZA;
  if (evento.tipo === 'solucao') return [5, 122, 85];
  if (evento.tipo === 'reabertura') return [217, 119, 6];
  return [107, 127, 155];
};

const formatarVisita = (data: string, hora?: string | null) => {
  const dia = new Date(`${data}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return hora ? `${dia} às ${hora.slice(0, 5)}` : dia;
};

interface Opcoes {
  ocorrencia: CcoOcorrencia;
  historico: CcoHistorico[];
  emitidoPor: string;
}

/**
 * Ficha da ocorrência pronta para impressão (A4 retrato): identificação no cabeçalho,
 * dados do registro em grade, descrição destacada e a linha do tempo do atendimento.
 */
export async function gerarPdfDetalhe({ ocorrencia, historico, emitidoPor }: Opcoes): Promise<Blob> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const brasao = await carregarBrasao();
  const emitidoEm = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' });
  const situacao = SITUACOES[ocorrencia.situacao];
  const corSituacao = COR_SITUACAO[ocorrencia.situacao] ?? CINZA;
  const gravidade = gravidadeDe(ocorrencia);
  const titulo = ocorrencia.tipo_registro === 'camera' ? 'Relato de problema em câmera' : 'Registro de ocorrência';

  doc.setProperties({
    title: `Ocorrência ${ocorrencia.protocolo}`,
    subject: `${titulo} · ${ocorrencia.unidade_nome}`,
    author: 'Secretaria Municipal de Educação de Itaguaí',
    creator: 'SMEDU · CCO',
  });

  // ── Cabeçalho institucional ─────────────────────────────────────────────
  faixaDegrade(doc, 0, 0, 210, 38, AZUL_ESCURO, AZUL_ESCURO_FIM);

  if (brasao) doc.addImage(brasao, 'PNG', MARGEM, 8.5, 13, 16);

  const xTexto = brasao ? MARGEM + 18 : MARGEM;
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setCharSpace(0.5);
  doc.text('PREFEITURA MUNICIPAL DE ITAGUAÍ', xTexto, 13.5);
  doc.setCharSpace(0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(186, 214, 245);
  doc.text('SECRETARIA MUNICIPAL DE EDUCAÇÃO', xTexto, 18.5);
  doc.text('CCO | Gabinete da Educação', xTexto, 22.8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.6);
  doc.setTextColor(150, 190, 235);
  doc.text('PROTOCOLO', 196, 11.5, { align: 'right' });
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text(ocorrencia.protocolo, 196, 18.5, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(186, 214, 245);
  doc.text(titulo, 196, 24, { align: 'right' });

  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.4);
  doc.line(MARGEM, 27.5, 196, 27.5);

  doc.setFontSize(7.2);
  doc.setTextColor(186, 214, 245);
  doc.text(ocorrencia.unidade_nome, MARGEM, 33.5);

  // ── Cartão de situação (sobreposto à faixa) ─────────────────────────────
  const cartaoY = 32;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...LINHA);
  doc.setLineWidth(0.35);
  doc.roundedRect(MARGEM, cartaoY, LARGURA, 17, 2.5, 2.5, 'FD');

  doc.setFillColor(...corSituacao);
  doc.circle(MARGEM + 6, cartaoY + 8.5, 1.9, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...corSituacao);
  doc.text(situacao.rotulo, MARGEM + 11, cartaoY + 7.4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.4);
  doc.setTextColor(...CINZA);
  doc.text(situacao.descricao, MARGEM + 11, cartaoY + 12.2);

  doc.setFontSize(6.4);
  doc.setTextColor(...CINZA);
  doc.text('EMITIDO EM', 196 - 3, cartaoY + 6, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...AZUL_ESCURO);
  doc.text(emitidoEm, 196 - 3, cartaoY + 10.6, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.4);
  doc.setTextColor(...CINZA);
  doc.text(`por ${emitidoPor}`, 196 - 3, cartaoY + 14.4, { align: 'right' });

  let y = cartaoY + 17 + 8;

  // ── Alerta de caso grave ────────────────────────────────────────────────
  if (gravidade.grave) {
    // A fonte precisa estar definida ANTES de quebrar o texto, senão a medição usa outra fonte.
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setCharSpace(0);
    const linhas = doc.splitTextToSize(
      `${SUGESTAO_IMAGENS}${gravidade.motivo ? ` ${gravidade.motivo}` : ''}`.trim(),
      LARGURA - 14,
    ) as string[];
    const altura = 12 + linhas.length * 3.5;
    doc.setFillColor(...VERMELHO_FUNDO);
    doc.setDrawColor(...VERMELHO);
    doc.setLineWidth(0.4);
    doc.roundedRect(MARGEM, y, LARGURA, altura, 2.5, 2.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.6);
    doc.setTextColor(...VERMELHO);
    doc.text(`CASO GRAVE${gravidade.categoria ? ` · ${gravidade.categoria}` : ''}`, MARGEM + 5, y + 5.4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.text(linhas, MARGEM + 5, y + 10);
    y += altura + 7;
  }

  const secao = (texto: string) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.6);
    doc.setTextColor(...AZUL);
    doc.setCharSpace(0.4);
    doc.text(texto.toUpperCase(), MARGEM, y);
    doc.setCharSpace(0);
    doc.setDrawColor(...LINHA);
    doc.setLineWidth(0.3);
    doc.line(MARGEM, y + 2.2, 196, y + 2.2);
    y += 6.5;
  };

  const margemPagina = { top: 22, left: MARGEM, right: MARGEM, bottom: 24 };

  /** Cabeçalho compacto nas páginas seguintes, para a folha solta continuar identificada. */
  const cabecalhoDeContinuacao = (pagina: number) => {
    if (pagina <= 1) return;
    faixaDegrade(doc, 0, 0, 210, 12, AZUL_ESCURO, AZUL_ESCURO_FIM);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.4);
    doc.setTextColor(255, 255, 255);
    doc.text(`Ocorrência ${ocorrencia.protocolo}`, MARGEM, 7.6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(186, 214, 245);
    doc.text('CCO | Gabinete da Educação', 196, 7.6, { align: 'right' });
  };

  // ── Dados do registro ───────────────────────────────────────────────────
  secao('Dados do registro');

  const par = (rotuloA: string, valorA: string) => [rotuloA, valorA];
  const dados: string[][] = [
    [...par('Data da ocorrência', formatarData(ocorrencia.data_ocorrencia)), ...par('Horário', descreverHorario(ocorrencia))],
    [...par('Unidade escolar', ocorrencia.unidade_nome), ...par('Local da ocorrência', ocorrencia.locais?.length ? ocorrencia.locais.join(', ') : '—')],
    [...par('Responsável no CCO', ocorrencia.responsavel_nome || 'Ainda não definido'), ...par('Registrada em', formatarDataHora(ocorrencia.created_at))],
  ];
  if (ocorrencia.tipo_registro === 'camera') {
    dados.push([...par('Câmeras', ocorrencia.cameras?.join(', ') || '—'), ...par('Tipo de problema', ocorrencia.tipo_problema || '—')]);
  }
  if (ocorrencia.visita_data) {
    dados.push([...par('Visita presencial', formatarVisita(ocorrencia.visita_data, ocorrencia.visita_hora)), ...par('Registrada por', ocorrencia.criado_por_nome || 'Não informado')]);
  } else {
    dados.push([...par('Registrada por', ocorrencia.criado_por_nome || 'Não informado'), '', '']);
  }

  autoTable(doc, {
    startY: y,
    body: dados,
    theme: 'plain',
    margin: margemPagina,
    styles: {
      font: 'helvetica',
      fontSize: 8.6,
      cellPadding: { top: 2.1, right: 3, bottom: 2.1, left: 0 },
      overflow: 'linebreak',
      valign: 'top',
      textColor: AZUL_ESCURO,
    },
    columnStyles: {
      0: { cellWidth: 25, fontStyle: 'bold', fontSize: 7.4, textColor: CINZA },
      1: { cellWidth: 62 },
      2: { cellWidth: 25, fontStyle: 'bold', fontSize: 7.4, textColor: CINZA },
      3: { cellWidth: 70 },
    },
    didDrawPage: (dado) => cabecalhoDeContinuacao(dado.pageNumber),
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 9;

  // ── Descrição ───────────────────────────────────────────────────────────
  secao('Descrição');

  autoTable(doc, {
    startY: y,
    body: [[ocorrencia.descricao]],
    theme: 'grid',
    margin: margemPagina,
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: { top: 3.6, right: 4, bottom: 3.6, left: 6 },
      overflow: 'linebreak',
      valign: 'top',
      textColor: ROSA_TEXTO,
      fillColor: ROSA_FUNDO,
    },
    tableLineColor: LINHA,
    tableLineWidth: 0.3,
    didDrawCell: (dado) => {
      // Barra vermelha de destaque, como a borda lateral da descrição na tela.
      if (dado.section !== 'body' || dado.column.index !== 0) return;
      doc.setFillColor(...BARRA_ROSA);
      doc.rect(dado.cell.x, dado.cell.y, 1.4, dado.cell.height, 'F');
    },
    didDrawPage: (dado) => cabecalhoDeContinuacao(dado.pageNumber),
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 9;

  // ── Histórico do atendimento ────────────────────────────────────────────
  if (historico.length) {
    secao('Histórico de atendimento');

    const eventos = historico;
    autoTable(doc, {
      startY: y,
      head: [['Quando', 'Movimento']],
      body: eventos.map((evento) => {
        const [data, hora] = formatarDataHora(evento.created_at).split(' às ');
        return [`${data}\n${hora ?? ''}${evento.autor_nome ? `\n${evento.autor_nome}` : ''}`, textoDoEvento(evento)];
      }),
      theme: 'grid',
      margin: margemPagina,
      styles: {
        font: 'helvetica',
        fontSize: 8,
        cellPadding: { top: 2.2, right: 3, bottom: 2.2, left: 2.4 },
        overflow: 'linebreak',
        valign: 'top',
        textColor: AZUL_ESCURO,
        lineColor: LINHA,
        lineWidth: 0.2,
      },
      headStyles: { fillColor: [240, 246, 253], textColor: CINZA, fontStyle: 'bold', fontSize: 6.8, lineWidth: 0.2, lineColor: LINHA },
      columnStyles: {
        0: { cellWidth: 34, cellPadding: { top: 2.2, right: 2.4, bottom: 2.2, left: 7 }, fontSize: 7.2, textColor: CINZA },
        1: { cellWidth: 148 },
      },
      didParseCell: (dado) => {
        if (dado.section === 'body' && dado.column.index === 1) {
          const evento = eventos[dado.row.index];
          if (evento?.tipo === 'solucao') dado.cell.styles.textColor = [5, 100, 70];
          if (evento?.tipo === 'reabertura') dado.cell.styles.textColor = [150, 80, 5];
        }
      },
      didDrawCell: (dado) => {
        if (dado.section !== 'body' || dado.column.index !== 0) return;
        const evento = eventos[dado.row.index];
        if (!evento) return;
        doc.setFillColor(...corDoEvento(evento));
        doc.circle(dado.cell.x + 3, dado.cell.y + 4.4, 1.3, 'F');
      },
      didDrawPage: (dado) => cabecalhoDeContinuacao(dado.pageNumber),
    });
  }

  // ── Rodapé em todas as páginas ──────────────────────────────────────────
  const paginas = doc.getNumberOfPages();
  for (let pagina = 1; pagina <= paginas; pagina += 1) {
    doc.setPage(pagina);
    doc.setDrawColor(...LINHA);
    doc.setLineWidth(0.3);
    doc.line(MARGEM, RODAPE_Y, 196, RODAPE_Y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(...CINZA);
    doc.text('Documento de uso interno da SMEDU. Contém informações de unidade escolar: compartilhe apenas com quem precisa.', MARGEM, RODAPE_Y + 4.4);
    doc.setFont('helvetica', 'bold');
    doc.text(`${ocorrencia.protocolo} · Página ${pagina} de ${paginas}`, 196, RODAPE_Y + 4.4, { align: 'right' });
  }

  return doc.output('blob');
}

/** Abre o PDF em nova aba para impressão; se o navegador bloquear a janela, baixa o arquivo. */
export async function abrirPdfEmNovaAba(gerar: () => Promise<Blob>, nomeArquivo: string): Promise<void> {
  const janela = window.open('about:blank', '_blank');
  if (janela) janela.opener = null;
  try {
    const url = URL.createObjectURL(await gerar());
    if (janela && !janela.closed) {
      janela.location.replace(url);
    } else {
      const link = document.createElement('a');
      link.href = url;
      link.download = nomeArquivo;
      link.click();
    }
    window.setTimeout(() => URL.revokeObjectURL(url), 300_000);
  } catch (erro) {
    janela?.close();
    throw erro;
  }
}

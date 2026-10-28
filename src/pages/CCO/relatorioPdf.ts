import { CcoOcorrencia, UserProfile } from '@/types';
import {
  IMPORTANCIAS,
  Importancia,
  PessoasDasUnidades,
  SITUACOES,
  descreverHorario,
  formatarData,
  importanciaDe,
} from '@/services/ccoService';
import { dataService } from '@/services/dataService';

/** Casos por página: fixo, para o relatório ter sempre 15 por folha (a última pode ter menos). */
export const CASOS_POR_PAGINA = 15;

interface Opcoes {
  ocorrencias: CcoOcorrencia[];
  user: UserProfile;
  pessoas?: PessoasDasUnidades;
  /** Texto curto dos filtros usados na tela (ex.: "Situação: Registrada · Importância: Alta"). */
  filtros: string;
  /** Administrador: inclui direção da unidade e importância. */
  completo: boolean;
}

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

/** Corta o texto num limite de caracteres, sem partir palavra no meio quando possível. */
const resumir = (texto: string, limite: number) => {
  const limpo = texto.replace(/\s+/g, ' ').trim();
  if (limpo.length <= limite) return limpo;
  const corte = limpo.slice(0, limite);
  const espaco = corte.lastIndexOf(' ');
  return `${(espaco > limite * 0.6 ? corte.slice(0, espaco) : corte).trim()}…`;
};

const COR_IMPORTANCIA: Record<Importancia, [number, number, number]> = {
  alta: [254, 226, 226],
  media: [254, 243, 199],
  baixa: [241, 245, 249],
};

/**
 * Relatório das ocorrências do CCO em PDF (A4 paisagem), com o brasão de Itaguaí.
 * Cada página tem 15 casos: os textos longos são resumidos para nenhuma linha empurrar casos para a página seguinte.
 */
export async function gerarRelatorioCcoPdf({ ocorrencias, user, pessoas, filtros, completo }: Opcoes): Promise<void> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const brasao = await carregarBrasao();
  const largura = doc.internal.pageSize.getWidth();
  const altura = doc.internal.pageSize.getHeight();
  const emitidoEm = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' });
  const totalPaginas = Math.max(1, Math.ceil(ocorrencias.length / CASOS_POR_PAGINA));

  const contagem = (Object.keys(SITUACOES) as (keyof typeof SITUACOES)[])
    .map((s) => `${SITUACOES[s].rotulo}: ${ocorrencias.filter((oc) => oc.situacao === s).length}`)
    .join(' · ');
  const contagemImportancia = completo
    ? (Object.keys(IMPORTANCIAS) as Importancia[]).map((n) => `${IMPORTANCIAS[n].rotulo}: ${ocorrencias.filter((oc) => importanciaDe(oc).nivel === n).length}`).join(' · ')
    : '';

  const cabecalho = (pagina: number) => {
    if (brasao) doc.addImage(brasao, 'PNG', 12, 8, 13, 16);
    const x = brasao ? 29 : 12;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(7, 29, 65);
    doc.text('PREFEITURA MUNICIPAL DE ITAGUAÍ · SECRETARIA MUNICIPAL DE EDUCAÇÃO', x, 13);
    doc.setFontSize(10.5);
    doc.setTextColor(11, 79, 163);
    doc.text('Central Controle Operacional (CCO) — Relatório de ocorrências', x, 18.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(82, 100, 125);
    doc.text(`Emitido em ${emitidoEm} por ${user.nome_completo} · ${ocorrencias.length} ocorrência(s) · Página ${pagina} de ${totalPaginas}`, x, 23);
    doc.text(resumir(`Filtros: ${filtros || 'nenhum'}  |  ${contagem}${contagemImportancia ? `  |  Importância — ${contagemImportancia}` : ''}`, 230), x, 27);
    doc.setDrawColor(0, 90, 156);
    doc.setLineWidth(0.5);
    doc.line(12, 30, largura - 12, 30);
  };

  const rodape = () => {
    doc.setDrawColor(220, 228, 240);
    doc.setLineWidth(0.2);
    doc.line(12, altura - 10, largura - 12, altura - 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(98, 114, 137);
    doc.text('Documento de uso interno da SMEDU. Contém informações das unidades escolares: compartilhe apenas com quem precisa.', 12, altura - 6);
    doc.text('SMEDU · Itaguaí', largura - 12, altura - 6, { align: 'right' });
  };

  const colunas = completo
    ? ['Nº', 'Protocolo', 'Data e horário', 'Unidade', 'Direção', 'Registrado por', 'Tipo', 'Resumo', 'Importância', 'Situação', 'Status', 'Responsável']
    : ['Nº', 'Protocolo', 'Data e horário', 'Unidade', 'Registrado por', 'Tipo', 'Resumo', 'Situação', 'Status', 'Responsável'];

  /** Status do acompanhamento: se o administrador já abriu, se foi finalizada e se o fato ainda acontece. */
  const status = (oc: CcoOcorrencia) => {
    const base = oc.situacao === 'concluida' ? 'Finalizada' : oc.visualizada_em ? 'Visualizada' : 'Nova';
    return oc.em_andamento && oc.situacao !== 'concluida' ? `${base}\nfato em andamento` : base;
  };

  const linha = (oc: CcoOcorrencia, indice: number): string[] => {
    const tipo = oc.tipo_registro === 'camera' ? resumir(`Câmera: ${oc.tipo_problema || 'problema'}`, 34) : 'Ocorrência';
    const direcao = pessoas?.direcao[oc.unidade_id];
    const comum = {
      n: String(indice + 1),
      protocolo: oc.protocolo,
      quando: `${formatarData(oc.data_ocorrencia)}\n${resumir(descreverHorario(oc), 24)}`,
      unidade: resumir(oc.unidade_nome, 44),
      autor: resumir(oc.criado_por_nome || '—', 30),
      resumo: resumir(oc.descricao, completo ? 90 : 135),
      situacao: SITUACOES[oc.situacao].rotulo,
      status: status(oc),
      responsavel: resumir(oc.responsavel_nome || '—', 26),
    };
    return completo
      ? [comum.n, comum.protocolo, comum.quando, comum.unidade, resumir(direcao?.nome || 'Não cadastrada', 32), comum.autor, tipo, comum.resumo, IMPORTANCIAS[importanciaDe(oc).nivel].rotulo, comum.situacao, comum.status, comum.responsavel]
      : [comum.n, comum.protocolo, comum.quando, comum.unidade, comum.autor, tipo, comum.resumo, comum.situacao, comum.status, comum.responsavel];
  };

  const larguras: Record<number, { cellWidth: number }> = completo
    ? { 0: { cellWidth: 7 }, 1: { cellWidth: 23 }, 2: { cellWidth: 21 }, 3: { cellWidth: 30 }, 4: { cellWidth: 25 }, 5: { cellWidth: 23 }, 6: { cellWidth: 20 }, 8: { cellWidth: 18.5 }, 9: { cellWidth: 19 }, 10: { cellWidth: 20 }, 11: { cellWidth: 21 } }
    : { 0: { cellWidth: 8 }, 1: { cellWidth: 25 }, 2: { cellWidth: 23 }, 3: { cellWidth: 36 }, 4: { cellWidth: 27 }, 5: { cellWidth: 23 }, 7: { cellWidth: 21 }, 8: { cellWidth: 21 }, 9: { cellWidth: 24 } };
  const colunaImportancia = completo ? 8 : -1;
  const colunaStatus = completo ? 10 : 8;

  for (let pagina = 0; pagina < totalPaginas; pagina += 1) {
    if (pagina > 0) doc.addPage();
    cabecalho(pagina + 1);
    const inicio = pagina * CASOS_POR_PAGINA;
    const casos = ocorrencias.slice(inicio, inicio + CASOS_POR_PAGINA);
    autoTable(doc, {
      startY: 33,
      head: [colunas],
      body: casos.length ? casos.map((oc, i) => linha(oc, inicio + i)) : [[{ content: 'Nenhuma ocorrência com os filtros usados.', colSpan: colunas.length }]],
      theme: 'grid',
      margin: { left: 12, right: 12, bottom: 12 },
      // Cada página é montada à parte, com 15 casos: a tabela não continua sozinha na folha seguinte.
      pageBreak: 'avoid',
      rowPageBreak: 'avoid',
      styles: { font: 'helvetica', fontSize: 6.8, cellPadding: 1.4, textColor: [21, 34, 56], valign: 'middle', overflow: 'linebreak', minCellHeight: 8.4, lineColor: [220, 228, 240], lineWidth: 0.15 },
      headStyles: { fillColor: [0, 90, 156], textColor: 255, fontStyle: 'bold', fontSize: 7, minCellHeight: 7 },
      alternateRowStyles: { fillColor: [248, 251, 255] },
      columnStyles: { ...larguras, 1: { ...larguras[1], fontStyle: 'bold', textColor: [11, 79, 163] } },
      didParseCell: (dado) => {
        if (dado.section === 'body' && dado.column.index === colunaStatus && String(dado.cell.raw).startsWith('Nova')) {
          dado.cell.styles.fontStyle = 'bold';
          dado.cell.styles.textColor = [11, 99, 206];
        }
        if (dado.section !== 'body' || dado.column.index !== colunaImportancia) return;
        const oc = casos[dado.row.index];
        if (!oc) return;
        const nivel = importanciaDe(oc).nivel;
        dado.cell.styles.fillColor = COR_IMPORTANCIA[nivel];
        dado.cell.styles.fontStyle = 'bold';
        if (nivel === 'alta') dado.cell.styles.textColor = [185, 28, 28];
      },
    });
    rodape();
  }

  const hoje = new Date().toISOString().slice(0, 10);
  doc.save(`CCO_ocorrencias_${hoje}.pdf`);

  await dataService.registrarLogAuditoria({
    usuario_email: user.email,
    acao: 'CCO_RELATORIO_PDF',
    tabela: 'cco_ocorrencias',
    detalhes: { quantidade: ocorrencias.length, paginas: totalPaginas, filtros: filtros || 'nenhum' },
  });
}

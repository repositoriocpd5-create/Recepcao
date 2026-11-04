import { CcoOcorrencia } from '@/types';
import { SITUACOES, descreverHorario, formatarData } from '@/services/ccoService';

type RGB = [number, number, number];
const AZUL_ESCURO: RGB = [7, 29, 65];
const CINZA: RGB = [82, 100, 125];
const LINHA: RGB = [220, 228, 240];

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

export async function gerarPdfOcorrencia(ocorrencia: CcoOcorrencia): Promise<Blob> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const brasao = await carregarBrasao();
  doc.setProperties({ title: `Ocorrência ${ocorrencia.protocolo}`, creator: 'SMEDU' });
  if (brasao) doc.addImage(brasao, 'PNG', 14, 10, 13, 16);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...AZUL_ESCURO);
  doc.text('SECRETARIA MUNICIPAL DE EDUCAÇÃO', brasao ? 31 : 14, 16);
  doc.setFontSize(10);
  doc.text('CCO — Comprovante de registro', brasao ? 31 : 14, 23);
  const linhas = [
    ['Protocolo', ocorrencia.protocolo],
    ['Unidade escolar', ocorrencia.unidade_nome],
    ['Tipo de registro', ocorrencia.tipo_registro === 'camera' ? 'Problema em câmera' : 'Ocorrência'],
    ['Data da ocorrência', formatarData(ocorrencia.data_ocorrencia)],
    ['Horário aproximado', descreverHorario(ocorrencia)],
    ['Situação', SITUACOES[ocorrencia.situacao].rotulo],
    ['Registrado por', ocorrencia.criado_por_nome || ocorrencia.criado_por_email || 'Não informado'],
    ...(ocorrencia.locais?.length ? [['Local da ocorrência', ocorrencia.locais.join(', ')]] : []),
    ...(ocorrencia.cameras?.length ? [['Câmeras', ocorrencia.cameras.join(', ')]] : []),
    ...(ocorrencia.tipo_problema ? [['Tipo de problema', ocorrencia.tipo_problema]] : []),
    ['Descrição', ocorrencia.descricao],
  ];
  autoTable(doc, {
    startY: 34,
    body: linhas,
    theme: 'grid',
    margin: { top: 15, left: 14, right: 14, bottom: 22 },
    styles: { font: 'helvetica', fontSize: 10, cellPadding: 3, overflow: 'linebreak', valign: 'top', lineColor: LINHA },
    columnStyles: { 0: { cellWidth: 42, fontStyle: 'bold', fillColor: [243, 248, 254], textColor: AZUL_ESCURO } },
  });
  const paginas = doc.getNumberOfPages();
  for (let pagina = 1; pagina <= paginas; pagina += 1) {
    doc.setPage(pagina);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...CINZA);
    doc.text(`Protocolo ${ocorrencia.protocolo} · Página ${pagina} de ${paginas}`, 14, 282);
    doc.text('Uso interno. Acompanhe o atendimento em Minhas ocorrências.', 14, 287);
  }
  doc.autoPrint();
  return doc.output('blob');
}

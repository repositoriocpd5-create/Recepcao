export interface PdfReportData {
  title: string;
  subtitle?: string;
  columns: string[];
  rows: Array<Array<string | number>>;
  filename: string;
}

const loadCrestAsDataUrl = async (): Promise<string | null> => {
  try {
    const response = await fetch('/assets/brasao_itaguai.png');
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

export const generateInstitutionalPdf = async ({ title, subtitle, columns, rows, filename }: PdfReportData): Promise<void> => {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const document = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const crest = await loadCrestAsDataUrl();

  if (crest) document.addImage(crest, 'PNG', 14, 10, 17, 20);
  document.setTextColor(7, 29, 65);
  document.setFont('helvetica', 'bold');
  document.setFontSize(14);
  document.text('SECRETARIA MUNICIPAL DE EDUCAÇÃO', crest ? 35 : 14, 16);
  document.setFont('helvetica', 'normal');
  document.setFontSize(9);
  document.setTextColor(82, 100, 125);
  document.text('Sistema de Recepção e Controle de Acesso — SMEDU', crest ? 35 : 14, 21);
  document.setDrawColor(220, 228, 240);
  document.line(14, 34, 283, 34);

  document.setTextColor(21, 34, 56);
  document.setFont('helvetica', 'bold');
  document.setFontSize(13);
  document.text(title, 14, 43);
  document.setFont('helvetica', 'normal');
  document.setFontSize(8);
  document.setTextColor(98, 114, 137);
  document.text(subtitle || `Emitido em ${new Date().toLocaleString('pt-BR')}`, 14, 48);

  autoTable(document, {
    startY: 54,
    head: [columns],
    body: rows.length ? rows : [['Nenhum registro encontrado']],
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 7.5, cellPadding: 2.5, textColor: [21, 34, 56] },
    headStyles: { fillColor: [0, 90, 156], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 251, 255] },
    margin: { left: 14, right: 14 },
    didDrawPage: () => {
      const page = document.getCurrentPageInfo().pageNumber;
      document.setFontSize(7);
      document.setTextColor(98, 114, 137);
      document.text(`SMEDU · Relatório institucional · Página ${page}`, 14, 202);
    },
  });

  document.save(`${filename}.pdf`);
};

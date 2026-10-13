/**
 * Turns a report from duezyReports.js into a PDF and downloads it. Browser only.
 * jsPDF is loaded on demand so it never weighs down the main app bundle.
 */

const SWAPS = [[/[\u2212\u2013\u2014]/g, '-'], [/\u2192/g, '->'], [/[\u2018\u2019]/g, "'"], [/[\u201C\u201D]/g, '"'], [/\u2026/g, '...']];

/** The built-in PDF fonts only cover Latin-1, so swap common symbols and drop the rest (e.g. emoji). */
export function pdfText(value) {
  let s = value === null || value === undefined ? '' : String(value);
  SWAPS.forEach(([re, to]) => { s = s.replace(re, to); });
  return s.replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, '');
}

const INDIGO = [79, 70, 229];
const MUTED = [100, 116, 139];
const INK = [15, 23, 42];

/** meta = { leagueName, scope, preparedBy, preparedOn, fileName } */
export async function downloadReportPdf(report, meta) {
  const [{ jsPDF }, autoTableModule] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const autoTable = autoTableModule.default || autoTableModule.autoTable;
  const landscape = report.columns.length > 6;
  const doc = new jsPDF({ orientation: landscape ? 'landscape' : 'portrait', unit: 'pt', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 40;

  doc.setTextColor(...INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(pdfText(report.title), M, M + 8);
  doc.setFontSize(10);
  doc.setTextColor(...INDIGO);
  doc.text('Duezy', pageW - M, M + 8, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text(pdfText([meta.leagueName, meta.scope].filter(Boolean).join(' - ')), M, M + 28);
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  const sub = [report.range, `Prepared ${meta.preparedOn}${meta.preparedBy ? ` by ${meta.preparedBy}` : ''}`].filter(Boolean).join('   |   ');
  doc.text(pdfText(sub), M, M + 44);

  autoTable(doc, {
    startY: M + 58,
    margin: { left: M, right: M },
    theme: 'plain',
    head: [report.summary.map((s) => pdfText(s.label))],
    body: [report.summary.map((s) => pdfText(s.value))],
    headStyles: { fontSize: 8, textColor: MUTED, fontStyle: 'normal', cellPadding: { top: 6, bottom: 0, left: 8, right: 8 } },
    bodyStyles: { fontSize: 14, textColor: INK, fontStyle: 'bold', cellPadding: { top: 2, bottom: 8, left: 8, right: 8 } },
    tableLineColor: [226, 232, 240],
    tableLineWidth: 0.75,
  });

  const columnStyles = {};
  report.columns.forEach((c, i) => { if (c.align === 'right') columnStyles[i] = { halign: 'right' }; });
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 14,
    margin: { left: M, right: M, bottom: 44 },
    head: [report.columns.map((c) => pdfText(c.label))],
    body: report.rows.length ? report.rows.map((r) => r.map(pdfText)) : [[{ content: pdfText(report.empty), colSpan: report.columns.length }]],
    theme: 'striped',
    styles: { fontSize: landscape ? 8 : 9, cellPadding: 4, textColor: INK, overflow: 'linebreak' },
    headStyles: { fillColor: INDIGO, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 255] },
    columnStyles,
  });

  if (report.note) {
    const y = Math.min(doc.lastAutoTable.finalY + 18, pageH - 50);
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text(doc.splitTextToSize(pdfText(report.note), pageW - M * 2), M, y);
  }

  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p += 1) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(pdfText(`${meta.leagueName} - ${report.title}`), M, pageH - 22);
    doc.text(`Page ${p} of ${pages}`, pageW - M, pageH - 22, { align: 'right' });
  }

  doc.save(meta.fileName);
}

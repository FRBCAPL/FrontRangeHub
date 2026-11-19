/**
 * Shopping list → printable PDF. jsPDF loads on demand so it stays out of the main bundle.
 * Layout mirrors the plain-text copy list: one block per supplier/group, ticked rows left out.
 */

import { buyLabel, shoppingText, tickOf } from './itemsureShoppingList.js';

const SWAPS = [
  [/[\u2212\u2013\u2014]/g, '-'],
  [/\u2192/g, '->'],
  [/[\u2018\u2019]/g, "'"],
  [/[\u201C\u201D]/g, '"'],
  [/\u2026/g, '...'],
];

/** Built-in PDF fonts are Latin-1; swap common symbols and drop the rest. */
export function pdfText(value) {
  let s = value === null || value === undefined ? '' : String(value);
  SWAPS.forEach(([re, to]) => {
    s = s.replace(re, to);
  });
  return s.replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, '');
}

/** Rows left to buy, grouped like the on-screen list. */
export function shoppingPdfSections(groups, ticked = new Set()) {
  return groups
    .map((g) => {
      const rows = g.rows
        .filter((r) => !ticked.has(tickOf(r)))
        .map((r) => ({
          name: r.name,
          amount: r.extra ? r.amount || '' : buyLabel(r),
        }));
      return rows.length ? { label: g.label, rows } : null;
    })
    .filter(Boolean);
}

function fileStamp(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Builds and downloads a shopping-list PDF.
 * `meta` = { businessName?, preparedOn? }. Returns { empty: true } when nothing is left to buy.
 */
export async function downloadShoppingListPdf(groups, ticked = new Set(), meta = {}) {
  const sections = shoppingPdfSections(groups, ticked);
  if (!sections.length) {
    // Same empty case as copy: everything ticked, or no rows.
    if (!shoppingText(groups, ticked)) return { empty: true };
    return { empty: true };
  }

  const [{ jsPDF }, autoTableModule] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const autoTable = autoTableModule.default || autoTableModule.autoTable;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();
  const M = 40;
  const pine = [45, 90, 70];
  const muted = [100, 116, 139];
  const ink = [30, 41, 36];
  const preparedOn = meta.preparedOn || new Date().toLocaleString();
  const business = meta.businessName || 'ItemSure';

  doc.setTextColor(...ink);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(pdfText('Shopping list'), M, M + 8);
  doc.setFontSize(10);
  doc.setTextColor(...pine);
  doc.text(pdfText('ItemSure'), pageW - M, M + 8, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...ink);
  doc.text(pdfText(business), M, M + 28);
  doc.setFontSize(9);
  doc.setTextColor(...muted);
  doc.text(pdfText(`Prepared ${preparedOn}`), M, M + 44);

  let y = M + 58;
  for (const section of sections) {
    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M, bottom: 44 },
      head: [[pdfText(section.label), 'Amount']],
      body: section.rows.map((r) => [pdfText(r.name), pdfText(r.amount)]),
      theme: 'striped',
      styles: { fontSize: 10, cellPadding: 5, textColor: ink, overflow: 'linebreak' },
      headStyles: { fillColor: pine, textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 248, 246] },
      columnStyles: { 1: { halign: 'right', cellWidth: 110 } },
    });
    y = doc.lastAutoTable.finalY + 16;
  }

  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p += 1) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(...muted);
    doc.text(pdfText(`Page ${p} of ${pages}`), pageW - M, doc.internal.pageSize.getHeight() - 20, { align: 'right' });
  }

  const safeName = pdfText(business).replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') || 'shopping-list';
  doc.save(`ItemSure-${safeName}-${fileStamp()}.pdf`);
  return { empty: false };
}

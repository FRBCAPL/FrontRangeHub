/**
 * Minimal single/multi-page text PDF builder (no dependencies).
 * Uses Helvetica + WinAnsi-safe ASCII for broad viewer support.
 */

function pdfEscape(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

/** Map common punctuation; replace other non-ASCII with "?". */
export function toPdfSafeText(value) {
  return String(value ?? '')
    .replace(/\u2013|\u2014/g, '-')
    .replace(/\u2018|\u2019/g, "'")
    .replace(/\u201C|\u201D/g, '"')
    .replace(/\u2026/g, '...')
    .replace(/\u00A0/g, ' ')
    .replace(/[^\x20-\x7E]/g, '?');
}

function wrapLine(text, maxChars) {
  const raw = toPdfSafeText(text);
  if (raw.length <= maxChars) return [raw || ' '];
  const words = raw.split(/\s+/);
  const lines = [];
  let cur = '';
  for (const word of words) {
    if (!word) continue;
    if (!cur) {
      if (word.length <= maxChars) {
        cur = word;
      } else {
        for (let i = 0; i < word.length; i += maxChars) {
          lines.push(word.slice(i, i + maxChars));
        }
      }
      continue;
    }
    if (`${cur} ${word}`.length <= maxChars) {
      cur = `${cur} ${word}`;
    } else {
      lines.push(cur);
      if (word.length <= maxChars) {
        cur = word;
      } else {
        for (let i = 0; i < word.length; i += maxChars) {
          const piece = word.slice(i, i + maxChars);
          if (i + maxChars < word.length) lines.push(piece);
          else cur = piece;
        }
      }
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [' '];
}

/**
 * @param {string[]} lines
 * @param {{ title?: string, fontSize?: number, maxChars?: number }} [options]
 * @returns {Uint8Array}
 */
export function buildSimpleTextPdf(lines = [], options = {}) {
  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 50;
  const fontSize = Number(options.fontSize) || 11;
  const lineHeight = Math.round(fontSize * 1.35);
  const maxChars = Number(options.maxChars) || 90;
  const topY = pageHeight - margin;
  const bottomY = margin;

  const wrapped = [];
  for (const line of lines) {
    wrapped.push(...wrapLine(line, maxChars));
  }
  if (!wrapped.length) wrapped.push(' ');

  const pages = [];
  let pageLines = [];
  let y = topY;
  for (const line of wrapped) {
    if (y - lineHeight < bottomY && pageLines.length) {
      pages.push(pageLines);
      pageLines = [];
      y = topY;
    }
    pageLines.push(line);
    y -= lineHeight;
  }
  if (pageLines.length) pages.push(pageLines);

  const objects = [];
  const addObj = (body) => {
    objects.push(body);
    return objects.length;
  };

  const fontId = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const contentIds = [];
  for (const page of pages) {
    const ops = ['BT', `/F1 ${fontSize} Tf`, `${margin} ${topY} Td`];
    page.forEach((line, idx) => {
      const text = `(${pdfEscape(line)}) Tj`;
      if (idx === 0) ops.push(text);
      else ops.push(`0 -${lineHeight} Td ${text}`);
    });
    ops.push('ET');
    const stream = ops.join('\n');
    contentIds.push(
      addObj(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`)
    );
  }

  const pageIds = [];
  for (const contentId of contentIds) {
    pageIds.push(
      addObj(
        `<< /Type /Page /Parent 0 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] ` +
          `/Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> >>`
      )
    );
  }

  const kids = pageIds.map((id) => `${id} 0 R`).join(' ');
  const pagesId = addObj(`<< /Type /Pages /Kids [ ${kids} ] /Count ${pageIds.length} >>`);

  // Patch parent refs now that pagesId is known
  for (let i = 0; i < pageIds.length; i += 1) {
    const id = pageIds[i];
    objects[id - 1] = objects[id - 1].replace('/Parent 0 0 R', `/Parent ${pagesId} 0 R`);
  }

  const catalogId = addObj(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (let i = 0; i < objects.length; i += 1) {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\n`;
  pdf += `startxref\n${xrefStart}\n%%EOF`;

  const out = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i += 1) out[i] = pdf.charCodeAt(i) & 0xff;
  return out;
}

export function downloadPdfBytes(bytes, filename) {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || 'document.pdf';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

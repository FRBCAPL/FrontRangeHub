/**
 * Shared download helpers for Estate Vault HTML report previews.
 */

import { buildSimpleTextPdf, downloadPdfBytes, toPdfSafeText } from './estateSimplePdf.js';

function safeBaseName(name, fallback = 'estate-report') {
  return String(name || fallback)
    .replace(/[^\w.-]+/g, '_')
    .slice(0, 60);
}

/** Turn an HTML document into printable plain-text lines for the simple PDF builder. */
export function htmlDocumentToPlainLines(html) {
  let text = String(html || '');
  text = text.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  text = text.replace(/<style[\s\S]*?<\/style>/gi, ' ');
  text = text.replace(/<\/(p|div|h[1-6]|tr|li|table|section|article|header|footer)>/gi, '\n');
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/td>/gi, '\t');
  text = text.replace(/<[^>]+>/g, ' ');
  text = text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'");
  text = text.replace(/[ \t]+\n/g, '\n').replace(/\n[ \t]+/g, '\n');
  text = text.replace(/[ \t]{2,}/g, ' ');
  text = text.replace(/\n{3,}/g, '\n\n');
  return text
    .split('\n')
    .map((line) => toPdfSafeText(line).trimEnd())
    .filter((line, i, arr) => line.length > 0 || (i > 0 && arr[i - 1].length > 0));
}

export function downloadHtmlFile(html, filename) {
  try {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'report.html';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    return { success: true };
  } catch (error) {
    return { success: false, error: error?.message || 'Could not download HTML.' };
  }
}

/** Best-effort text PDF from HTML preview content (no external deps). */
export function downloadHtmlReportAsPdf(html, filename) {
  try {
    const lines = htmlDocumentToPlainLines(html);
    const bytes = buildSimpleTextPdf(lines.length ? lines : ['(Empty report)'], {
      fontSize: 10,
      maxChars: 95
    });
    downloadPdfBytes(bytes, filename || 'report.pdf');
    return { success: true };
  } catch (error) {
    return { success: false, error: error?.message || 'Could not download PDF.' };
  }
}

export function reportFileBase(name) {
  return safeBaseName(name);
}

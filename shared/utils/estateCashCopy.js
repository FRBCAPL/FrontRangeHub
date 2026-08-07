/**
 * Shared Cash available reconciliation copy — one source for UI + printable reports.
 * Use \n for line breaks; UI and HTML helpers honor them.
 */

export const CASH_AVAILABLE_RECONCILIATION =
  'Cash on hand is estate money in checking or savings accounts\n' +
  '(ones marked Include in Cash on hand).\n' +
  'It is held for proper estate administration — bills, claims, and distributions — not personal use.\n' +
  'Sales and auction bids are tracked separately — \nthey only change Cash on hand after you deposit the money into one of those accounts.';

export function escapeHtmlCash(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Paragraph for HTML exports. */
export function cashAvailableHintHtml(className = 'muted') {
  const cls = String(className || '').trim();
  const attr = cls ? ` class="${escapeHtmlCash(cls)}"` : '';
  const body = escapeHtmlCash(CASH_AVAILABLE_RECONCILIATION).replace(/\n/g, '<br />');
  return `<p${attr}>${body}</p>`;
}

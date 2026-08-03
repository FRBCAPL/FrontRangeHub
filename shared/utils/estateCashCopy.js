/**
 * Shared Cash available reconciliation copy — one source for UI + printable reports.
 */

export const CASH_AVAILABLE_RECONCILIATION =
  'Cash available is Estate Vault’s operational estimate from recorded fund accounts plus paid auction proceeds not yet deposited. Verify against current bank statements, including distributions recorded outside the funds-transaction list.';

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
  return `<p${attr}>${escapeHtmlCash(CASH_AVAILABLE_RECONCILIATION)}</p>`;
}

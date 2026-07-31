/**
 * Gift & residual supporting schedule — documentation sketch, not legal advice.
 */

import { APP_NAME, formatEstateDisplayDate } from './estateInventoryConstants.js';
import { formatMoney } from './estateFinance.js';
import { ESTATE_SUPPORTING_DOCS_LABEL } from './estateCompleteness.js';

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {object} params
 * @param {object} [params.settings]
 * @param {Array}  [params.items]
 * @param {object} [params.finance]
 * @param {Array}  [params.heirs]
 */
export function buildGiftResidualSchedule({
  settings = {},
  items = [],
  finance = null,
  heirs = [],
  generatedAt = new Date().toISOString()
} = {}) {
  const specificGifts = (items || [])
    .filter(
      (item) =>
        item.is_memorandum_asset ||
        item.assigned_beneficiary ||
        String(item.legal_status || '') === 'claimed_memorandum'
    )
    .map((item) => ({
      id: item.id,
      name: item.name,
      beneficiary: item.assigned_beneficiary || '—',
      estimatedValue: Number(item.estimated_value) || 0,
      legalStatus: item.legal_status,
      isMemorandum: Boolean(item.is_memorandum_asset)
    }));

  const residualHeirs = (heirs || []).filter(
    (person) => person.access_tier !== 'memorandum'
  );

  const netDistributable =
    finance?.netDistributable != null
      ? Number(finance.netDistributable)
      : finance?.ending?.estateBalance != null
        ? Number(finance.ending.estateBalance)
        : null;

  return {
    version: 1,
    title: 'Gift & residual schedule (supporting)',
    label: ESTATE_SUPPORTING_DOCS_LABEL,
    disclaimer:
      'Documentation aid for counsel review. Not a will substitute, not legal advice, and not a court filing.',
    estateName: settings.estate_name || finance?.estateName || 'Estate',
    caseNumber: settings.case_number || finance?.caseNumber || null,
    courtCaseNumber: settings.court_case_number || finance?.courtCaseNumber || null,
    generatedAt,
    generatedLabel: formatEstateDisplayDate(generatedAt) || generatedAt.slice(0, 10),
    instruments: {
      willReference: settings.will_reference || null,
      memorandumReference: settings.memorandum_reference || null,
      residualNotes: settings.residual_notes || null,
      equalizationNotes: settings.equalization_notes || null
    },
    specificGifts,
    residual: {
      heirs: residualHeirs.map((person) => ({
        name: person.display_name || person.name || person.sibling_key,
        tier: person.access_tier || 'residual'
      })),
      netDistributableSketch: netDistributable,
      notes: settings.residual_notes || null
    },
    appName: APP_NAME
  };
}

export function buildGiftResidualScheduleHtml(model) {
  const gifts = (model.specificGifts || [])
    .map(
      (g) => `
      <tr>
        <td>${esc(g.name)}</td>
        <td>${esc(g.beneficiary)}</td>
        <td>${esc(formatMoney(g.estimatedValue))}</td>
        <td>${esc(g.legalStatus || '—')}</td>
      </tr>`
    )
    .join('');

  const heirs = (model.residual?.heirs || [])
    .map((h) => `<li>${esc(h.name)} <span class="muted">(${esc(h.tier)})</span></li>`)
    .join('');

  const inst = model.instruments || {};

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${esc(model.title)} — ${esc(model.estateName)}</title>
  <style>
    body { font-family: Georgia, "Times New Roman", serif; margin: 2rem; color: #1a1a1a; max-width: 48rem; }
    h1 { font-size: 1.35rem; margin: 0 0 0.35rem; }
    h2 { font-size: 1.05rem; margin: 1.4rem 0 0.5rem; }
    .meta, .muted { color: #555; font-size: 0.9rem; }
    .banner { background: #f6f4ef; border: 1px solid #ddd; padding: 0.65rem 0.8rem; margin: 0.8rem 0 1rem; font-size: 0.88rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.92rem; }
    th, td { border-bottom: 1px solid #ddd; text-align: left; padding: 0.4rem 0.3rem; }
    th { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.04em; color: #666; }
    ul { padding-left: 1.2rem; }
  </style>
</head>
<body>
  <h1>${esc(model.title)}</h1>
  <p class="meta">${esc(model.estateName)} · Case ${esc(model.courtCaseNumber || model.caseNumber || '—')} · ${esc(model.generatedLabel)}</p>
  <div class="banner">${esc(model.label)} ${esc(model.disclaimer)}</div>

  <h2>Governing instruments (as recorded)</h2>
  <p><strong>Will / Letters ref:</strong> ${esc(inst.willReference || 'Not recorded in Estate Vault')}</p>
  <p><strong>Memorandum ref:</strong> ${esc(inst.memorandumReference || 'Not recorded')}</p>
  <p><strong>Equalization notes:</strong> ${esc(inst.equalizationNotes || '—')}</p>

  <h2>Specific gifts / memorandum items</h2>
  <table>
    <thead><tr><th>Item</th><th>Beneficiary</th><th>Est. value</th><th>Status</th></tr></thead>
    <tbody>${gifts || '<tr><td colspan="4">No memorandum / assigned gifts on the inventory.</td></tr>'}</tbody>
  </table>

  <h2>Residual sketch</h2>
  <p><strong>Net distributable (live snapshot):</strong> ${
    model.residual?.netDistributableSketch != null
      ? esc(formatMoney(model.residual.netDistributableSketch))
      : '—'
  }</p>
  <p><strong>Residual notes:</strong> ${esc(model.residual?.notes || '—')}</p>
  <ul>${heirs || '<li>No residual heirs on file</li>'}</ul>
  <p class="muted">Generated by ${esc(model.appName || APP_NAME)} for counsel review.</p>
</body>
</html>`;
}

export function openGiftResidualSchedule(model) {
  const html = buildGiftResidualScheduleHtml(model);
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    return true;
  }
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `gift-residual-schedule-${model.caseNumber || 'export'}.html`;
  a.click();
  URL.revokeObjectURL(url);
  return false;
}

export default {
  buildGiftResidualSchedule,
  buildGiftResidualScheduleHtml,
  openGiftResidualSchedule
};

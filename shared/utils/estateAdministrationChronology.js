/**
 * Administration chronology — supporting timeline from activity + milestones.
 * Client composition; does not require perfect historical backfill.
 */

import { formatEstateDisplayDate } from './estateInventoryConstants.js';
import { ESTATE_SUPPORTING_DOCS_LABEL } from './estateCompleteness.js';

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function sortKey(isoOrDate) {
  const t = new Date(isoOrDate || 0).getTime();
  return Number.isFinite(t) ? t : 0;
}

/**
 * @param {object} params
 * @param {object} [params.settings]
 * @param {Array}  [params.activity]
 * @param {Array}  [params.distributions]
 * @param {Array}  [params.familyUpdates]
 * @param {object} [params.inventoryCert] { completedAt }
 */
export function buildAdministrationChronology({
  settings = {},
  activity = [],
  distributions = [],
  familyUpdates = [],
  inventoryCert = null,
  generatedAt = new Date().toISOString()
} = {}) {
  const events = [];

  const push = (entry) => {
    if (!entry?.at && !entry?.date) return;
    events.push({
      id: entry.id || `${entry.kind}-${entry.at || entry.date}-${events.length}`,
      kind: entry.kind,
      label: entry.label,
      detail: entry.detail || null,
      at: entry.at || null,
      date: entry.date || (entry.at ? String(entry.at).slice(0, 10) : null),
      dateLabel:
        formatEstateDisplayDate(entry.date || entry.at) ||
        entry.date ||
        entry.at ||
        '—'
    });
  };

  if (settings.letters_issued_at) {
    push({
      kind: 'letters',
      label: 'Letters issued',
      date: settings.letters_issued_at,
      detail: 'Personal Representative Letters date on file'
    });
  }
  if (settings.inventory_completed_at || inventoryCert?.completedAt) {
    push({
      kind: 'inventory',
      label: 'Inventory certified',
      at: settings.inventory_completed_at || inventoryCert.completedAt,
      detail: 'PR marked inventory complete'
    });
  }
  if (settings.probate_window_end_date) {
    push({
      kind: 'claims',
      label: 'Claims / probate window end',
      date: settings.probate_window_end_date
    });
  }
  if (settings.closed_at) {
    push({
      kind: 'close',
      label: 'Estate closed for records',
      at: settings.closed_at,
      detail: settings.close_reason || null
    });
  }

  (distributions || []).forEach((row) => {
    if (row.status === 'finalized') {
      push({
        kind: 'distribution',
        label: `Distribution finalized (${row.classification || 'partial'})`,
        at: row.finalized_at,
        date: row.distribution_date,
        detail: row.notes || null,
        id: `dist-${row.id}`
      });
    }
    if (row.status === 'void' || row.voided_at) {
      push({
        kind: 'distribution_void',
        label: 'Distribution voided',
        at: row.voided_at,
        detail: row.void_reason || null,
        id: `void-${row.id}`
      });
    }
  });

  (familyUpdates || []).forEach((row) => {
    push({
      kind: 'family_update',
      label: `Family Update #${row.update_number || ''}`.trim(),
      at: row.published_at,
      detail: row.title || null,
      id: `fu-${row.id}`
    });
  });

  const currentCloseMs = settings.closed_at
    ? new Date(settings.closed_at).getTime()
    : NaN;

  (activity || []).forEach((row) => {
    const type = String(row.event_type || '').toLowerCase();
    if (
      !type ||
      type === 'pr_sign_in' ||
      type === 'heir_login' ||
      type === 'helper_login' ||
      type === 'estate_open'
    ) {
      return;
    }
    // Dedupe only the activity row that matches the current settings close
    // (CL-07). Keep prior close history when the estate is closed again (NEW-01).
    if (type === 'estate_closed' && Number.isFinite(currentCloseMs)) {
      const activityMs = new Date(row.created_at || 0).getTime();
      if (Number.isFinite(activityMs) && Math.abs(activityMs - currentCloseMs) <= 5000) {
        return;
      }
    }
    push({
      kind: `activity_${type}`,
      label: row.summary || type.replace(/_/g, ' '),
      at: row.created_at,
      detail:
        type === 'decision_note' && row.metadata?.note
          ? String(row.metadata.note)
          : type === 'date_correction'
            ? `${row.metadata?.field || 'date'}: ${row.metadata?.old_value || '—'} → ${row.metadata?.new_value || '—'}`
            : type === 'estate_closed' && row.metadata?.reason
              ? String(row.metadata.reason)
              : null,
      id: `act-${row.id}`
    });
  });

  events.sort((a, b) => sortKey(a.at || a.date) - sortKey(b.at || b.date));

  return {
    version: 1,
    title: 'Administration chronology (supporting)',
    label: ESTATE_SUPPORTING_DOCS_LABEL,
    estateName: settings.estate_name || 'Estate',
    caseNumber: settings.case_number || null,
    courtCaseNumber: settings.court_case_number || null,
    generatedAt,
    eventCount: events.length,
    events
  };
}

export function buildAdministrationChronologyHtml(model) {
  const rows = (model.events || [])
    .map(
      (ev) => `
      <tr>
        <td>${esc(ev.dateLabel)}</td>
        <td>${esc(ev.label)}</td>
        <td>${esc(ev.detail || '—')}</td>
      </tr>`
    )
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${esc(model.title)} — ${esc(model.estateName)}</title>
  <style>
    body { font-family: Georgia, "Times New Roman", serif; margin: 2rem; color: #1a1a1a; }
    h1 { font-size: 1.4rem; margin: 0 0 0.35rem; }
    .meta { color: #555; font-size: 0.9rem; margin-bottom: 1.25rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.92rem; }
    th, td { border-bottom: 1px solid #ddd; text-align: left; padding: 0.45rem 0.35rem; vertical-align: top; }
    th { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; color: #666; }
    .banner { background: #f6f4ef; border: 1px solid #ddd; padding: 0.65rem 0.8rem; margin-bottom: 1rem; font-size: 0.88rem; }
  </style>
</head>
<body>
  <h1>${esc(model.title)}</h1>
  <p class="meta">${esc(model.estateName)} · Case ${esc(model.courtCaseNumber || model.caseNumber || '—')}</p>
  <div class="banner">${esc(model.label)}</div>
  <table>
    <thead><tr><th>Date</th><th>Event</th><th>Detail</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="3">No chronology events recorded yet.</td></tr>'}</tbody>
  </table>
</body>
</html>`;
}

export function openAdministrationChronology(model) {
  const html = buildAdministrationChronologyHtml(model);
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
  a.download = `estate-chronology-${model.caseNumber || 'export'}.html`;
  a.click();
  URL.revokeObjectURL(url);
  return false;
}

export default {
  buildAdministrationChronology,
  buildAdministrationChronologyHtml,
  openAdministrationChronology
};

/**
 * Standalone decision-notes export for the full documentation records pack.
 */

import { APP_NAME } from './estateInventoryConstants.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildDecisionNotesJson({
  caseNumber,
  estateName,
  notes = [],
  generatedAt
}) {
  return JSON.stringify(
    {
      export_kind: 'decision_notes',
      note: 'Supporting decision / explanation notes. Not a court filing.',
      estate_name: estateName || 'Estate',
      case_number: caseNumber || 'estate',
      generated_at: generatedAt || new Date().toISOString(),
      note_count: (notes || []).length,
      notes: (notes || []).map((row) => ({
        id: row.id,
        created_at: row.created_at,
        actor_name: row.actor_name || row.actor || null,
        actor_role: row.actor_role || null,
        summary: row.summary || row.title || null,
        detail:
          row.metadata?.note || row.detail || row.message || row.body || null,
        event_type: row.event_type || 'decision_note',
        metadata: row.metadata || null
      }))
    },
    null,
    2
  );
}

export function buildDecisionNotesHtml({
  caseNumber,
  estateName,
  notes = [],
  generatedAt
}) {
  const rows = (notes || [])
    .map((row) => {
      const when = row.created_at
        ? new Date(row.created_at).toLocaleString()
        : '—';
      const who = row.actor_name || row.actor || '—';
      const summary = row.summary || row.title || 'Decision note';
      const detail = row.metadata?.note || row.detail || row.message || row.body || '';
      return `<tr>
        <td>${escapeHtml(when)}</td>
        <td>${escapeHtml(who)}</td>
        <td><strong>${escapeHtml(summary)}</strong>${
          detail
            ? `<div style="margin-top:0.35rem;color:#444;white-space:pre-wrap">${escapeHtml(detail)}</div>`
            : ''
        }</td>
      </tr>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(APP_NAME)} — Decision notes</title>
  <style>
    body { font-family: Georgia, "Times New Roman", serif; color: #1c1917; margin: 1.5rem; background: #fafaf9; }
    h1 { font-size: 1.45rem; margin: 0 0 0.25rem; }
    .meta { color: #57534e; font-size: 0.9rem; margin-bottom: 1.25rem; }
    table { width: 100%; border-collapse: collapse; background: #fff; }
    th, td { border: 1px solid #e7e5e4; padding: 0.55rem 0.6rem; text-align: left; vertical-align: top; font-size: 0.9rem; }
    th { background: #f5f5f4; font-family: system-ui, sans-serif; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.04em; }
  </style>
</head>
<body>
  <h1>Decision / explanation notes</h1>
  <p class="meta">${escapeHtml(estateName || 'Estate')} · Case ${escapeHtml(caseNumber || 'estate')} · Generated ${escapeHtml(generatedAt || '')} · ${(notes || []).length} note(s) · Supporting record — not a filing</p>
  <table>
    <thead><tr><th>When</th><th>By</th><th>Note</th></tr></thead>
    <tbody>
      ${rows || '<tr><td colspan="3">No decision notes recorded.</td></tr>'}
    </tbody>
  </table>
</body>
</html>`;
}

export default {
  buildDecisionNotesHtml,
  buildDecisionNotesJson
};

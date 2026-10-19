import React from 'react';
import { nameOf } from './showdownView.js';
import { formatCents } from '../v3/showdownV3Rules.js';

const ACTION_TEXT = {
  create: 'Event created',
  details: 'Event details changed',
  settings: 'Settings changed',
  'change-format': 'Format changed',
  'add-player': 'Player added',
  'remove-player': 'Player removed',
  'edit-player': 'Player edited',
  start: 'Qualifying started',
  'assign-table': 'Match put on a table',
  'move-table': 'Match moved to another table',
  'unassign-table': 'Match taken off its table',
  hold: 'Match put on hold',
  release: 'Match released from hold',
  result: 'Result recorded',
  forfeit: 'Forfeit recorded',
  'correct-result': 'Result corrected',
  'correct-forfeit': 'Result corrected to a forfeit',
  withdraw: 'Player withdrew',
  reinstate: 'Withdrawal undone',
  'lock-qualifying': 'Qualifying locked',
  'reopen-qualifying': 'Qualifying reopened',
  'shootout-lag': 'Shootout starter recorded',
  'shootout-rack': 'Shootout game recorded',
  'shootout-undo': 'Shootout game undone',
  'shootout-decided': 'Shootout decided',
  'reopen-shootout': 'Shootout reopened',
  'draw-bracket': 'Bracket drawn',
  'redraw-bracket': 'Bracket redrawn',
  'confirm-bracket': 'Bracket confirmed',
  'undo-from': 'Playoff results undone',
  complete: 'Event completed',
  'auto-result': 'Automatic playoff result',
  'phone-approve': 'Phone score approved',
  'phone-reject': 'Phone score rejected',
  'v3-interrupt': 'Event interrupted and settled',
  'v3-abandon': 'Voluntary abandonment recorded',
  'v3-adjustment': 'Payout adjustment',
};

/** Extra V3 detail: voluntary classification, settlement amounts and adjustments. */
function v3DetailText(a) {
  const d = a.detail || {};
  const parts = [];
  if (typeof d.voluntary === 'boolean') parts.push(d.voluntary ? 'voluntary' : 'involuntary');
  if (a.action === 'v3-adjustment') parts.push(`${formatCents(d.amountCents)} from the remainder: ${d.reason}`);
  if (a.action === 'v3-interrupt' || a.action === 'v3-abandon') {
    if (d.recipients?.length) parts.push(`remainder split among ${d.recipients.length} eligible player${d.recipients.length === 1 ? '' : 's'}`);
    if (d.unresolvedCents) parts.push(`${formatCents(d.unresolvedCents)} unresolved for review`);
    if (d.unawardedCents) parts.push(`${formatCents(d.unawardedCents)} not awarded`);
    if (!d.recipients?.length && !d.unresolvedCents && !d.unawardedCents) parts.push('no remainder');
  }
  return parts.join(' \u00b7 ');
}

const AUTO_RESULT_TEXT = {
  walkover: 'walkover (player withdrew)',
  'double-forfeit': 'double forfeit (both withdrew)',
  'admin-bye': 'administrative bye (opponent position empty)',
  'champion-walkover': 'Champion by Walkover (opponent position empty)',
  empty: 'empty (both positions empty)',
  vacated: 'vacated (withdrawn player, opponent position empty)',
};

function affectedText(state, ids = []) {
  return ids.map((id) => (state.players.some((p) => p.id === id) ? nameOf(state, id) : id)).join(', ');
}

function when(at) {
  const d = new Date(at);
  return Number.isNaN(d.getTime()) ? at : d.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit' });
}

/** Every operator action, newest first: who, when, what, and which records it touched. */
export default function ShowdownAuditLog({ state }) {
  const entries = [...(state.audit || [])].reverse();
  return (
    <section className="sd-panel" aria-label="Audit log">
      <h3>Audit log</h3>
      <p className="sd-note">{entries.length} entries. Corrections show what changed from and to.</p>
      <ol className="sd-audit">
        {entries.map((a, i) => (
          <li key={`${a.at}-${i}`}>
            <span className="sd-audit-when">{when(a.at)}</span>
            <strong>{ACTION_TEXT[a.action] || a.action}</strong>
            {a.affected?.length ? <span className="sd-audit-what">{affectedText(state, a.affected)}</span> : null}
            {a.detail?.from ? (
              <span className="sd-audit-what">
                from {a.detail.from.result} {a.detail.from.score1 ?? ''}–{a.detail.from.score2 ?? ''} to {a.detail.to.result} {a.detail.to.score1 ?? ''}–{a.detail.to.score2 ?? ''}
              </span>
            ) : null}
            {a.action === 'change-format' ? <span className="sd-audit-what">V{a.detail?.from} to V{a.detail?.to}</span> : null}
            {a.action === 'create' && a.detail?.formatConfirmed ? <span className="sd-audit-what">format V{a.detail.payoutVersion} confirmed</span> : null}
            {a.action === 'auto-result' ? <span className="sd-audit-what">{a.detail?.matchId}: {AUTO_RESULT_TEXT[a.detail?.result] || a.detail?.result}</span> : null}
            {v3DetailText(a) ? <span className="sd-audit-what">{v3DetailText(a)}</span> : null}
            <span className="sd-audit-by">{a.by || 'operator'}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

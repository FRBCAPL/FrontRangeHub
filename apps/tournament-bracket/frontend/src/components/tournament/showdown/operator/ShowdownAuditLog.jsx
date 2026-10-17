import React from 'react';
import { nameOf } from './showdownView.js';

const ACTION_TEXT = {
  create: 'Event created',
  details: 'Event details changed',
  settings: 'Settings changed',
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
  'shootout-lag': 'Shootout lag recorded',
  'shootout-rack': 'Shootout rack recorded',
  'shootout-undo': 'Shootout rack undone',
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
};

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
            {a.action === 'auto-result' ? <span className="sd-audit-what">{a.detail?.matchId}: {AUTO_RESULT_TEXT[a.detail?.result] || a.detail?.result}</span> : null}
            <span className="sd-audit-by">{a.by || 'operator'}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

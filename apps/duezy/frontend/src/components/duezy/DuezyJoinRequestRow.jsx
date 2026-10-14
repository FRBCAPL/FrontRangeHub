import React, { useState } from 'react';

const when = (iso) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

/** One waiting sign-up: who, which division (changeable), Approve or Decline. */
export default function DuezyJoinRequestRow({ request, divisions, taken, onApprove, onDecline }) {
  const [divisionId, setDivisionId] = useState(request.division_id || (divisions.length === 1 ? divisions[0].id : ''));
  const [busy, setBusy] = useState('');
  const needsDivision = divisions.length > 1 && !divisionId;

  const run = async (kind, fn) => {
    setBusy(kind);
    try { await fn(); } finally { setBusy(''); }
  };

  return (
    <li className="dz-join-req">
      <div className="dz-join-req-head">
        <strong>{request.name}</strong>
        <small className="dz-muted">signed up {when(request.created_at)}</small>
      </div>
      <p className="dz-small">
        {request.captain} · {request.contact}
        {request.players?.length ? <span className="dz-muted"> · players: {request.players.join(', ')}</span> : null}
      </p>
      {request.note ? <p className="dz-small dz-muted">“{request.note}”</p> : null}
      {taken ? <p className="dz-small dz-join-warn">⚠ A team named {request.name} is already in the league.</p> : null}
      <div className="dz-join-req-actions">
        {divisions.length > 1 ? (
          <select value={divisionId} onChange={(e) => setDivisionId(e.target.value)} aria-label={`Division for ${request.name}`}>
            <option value="">Pick a division…</option>
            {divisions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        ) : null}
        <button type="button" className="dz-btn dz-btn--primary dz-btn--sm" disabled={Boolean(busy) || needsDivision}
          onClick={() => run('approve', () => onApprove(request, divisionId || null))}>
          {busy === 'approve' ? 'Adding…' : 'Approve'}
        </button>
        <button type="button" className="dz-link dz-small" disabled={Boolean(busy)}
          onClick={() => run('decline', () => onDecline(request))}>
          {busy === 'decline' ? 'Removing…' : 'Decline'}
        </button>
      </div>
    </li>
  );
}

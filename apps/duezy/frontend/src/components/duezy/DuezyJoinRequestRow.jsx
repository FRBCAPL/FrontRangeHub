import React, { useState } from 'react';

const when = (iso) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

/** What approving a "this is my team" sign-up will change, so nothing is overwritten by surprise. */
function ClaimNote({ team, request }) {
  if (team === 'missing') {
    return <p className="dz-small dz-join-warn">⚠ {request.name} isn’t in the league anymore. Decline this one, or add the team again first.</p>;
  }
  const was = [team.captain, team.contact].filter(Boolean).join(' · ');
  const now = [request.captain, request.contact].join(' · ');
  if (was === now) {
    return (
      <p className="dz-small dz-join-claim">
        🔁 Already in the league. Keeps {team.captain} as captain
        {request.players?.length ? ' and adds any new players.' : '.'}
      </p>
    );
  }
  return (
    <p className="dz-small dz-join-claim">
      🔁 Already in the league. Approving sets the captain to <strong>{now}</strong>
      {was && was !== now ? <span className="dz-muted"> (now {was})</span> : null}
      {request.players?.length ? ' and adds any new players.' : '.'}
    </p>
  );
}

/** One waiting sign-up: who, which division (changeable for new teams), Approve or Decline. */
export default function DuezyJoinRequestRow({ request, divisions, claimed = null, taken, onApprove, onDecline }) {
  const [divisionId, setDivisionId] = useState(request.division_id || (divisions.length === 1 ? divisions[0].id : ''));
  const [busy, setBusy] = useState('');
  const needsDivision = !claimed && divisions.length > 1 && !divisionId;

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
      {claimed ? <ClaimNote team={claimed} request={request} /> : null}
      {taken ? <p className="dz-small dz-join-warn">⚠ A team named {request.name} is already in the league.</p> : null}
      <div className="dz-join-req-actions">
        {!claimed && divisions.length > 1 ? (
          <select value={divisionId} onChange={(e) => setDivisionId(e.target.value)} aria-label={`Division for ${request.name}`}>
            <option value="">Pick a division…</option>
            {divisions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        ) : null}
        <button type="button" className="dz-btn dz-btn--primary dz-btn--sm" disabled={Boolean(busy) || needsDivision || claimed === 'missing'}
          onClick={() => run('approve', () => onApprove(request, divisionId || null))}>
          {busy === 'approve' ? 'Saving…' : claimed ? 'Approve & update team' : 'Approve'}
        </button>
        <button type="button" className="dz-link dz-small" disabled={Boolean(busy)}
          onClick={() => run('decline', () => onDecline(request))}>
          {busy === 'decline' ? 'Removing…' : 'Decline'}
        </button>
      </div>
    </li>
  );
}

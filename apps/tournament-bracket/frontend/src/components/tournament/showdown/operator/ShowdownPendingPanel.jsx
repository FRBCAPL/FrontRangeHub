import React, { useState } from 'react';

function Row({ p, onApprove, onReject }) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  return (
    <li className={`sd-pending-row${p.problem ? ' has-problem' : ''}`}>
      <div>
        <strong>{p.label}</strong>{' \u00b7 '}{p.p1Name} {p.score1}{'\u2013'}{p.score2} {p.p2Name}
        <small>{p.submittedName ? ` sent by ${p.submittedName}` : ' sent from a phone'}</small>
        {p.problem ? <p className="sd-error">{p.problem} It can only be rejected.</p> : null}
      </div>
      {p.recorded ? <span className="sd-ok">Recorded. Confirming once the cloud save finishes.</span> : rejecting ? (
        <div className="sd-btn-row">
          <input className="sd-input" value={reason} maxLength={200} placeholder="Reason (optional)" onChange={(e) => setReason(e.target.value)} aria-label="Reason for rejecting" />
          <button type="button" className="tb-btn-new" onClick={() => setRejecting(false)}>Back</button>
          <button type="button" className="sd-btn sd-btn-danger" onClick={() => onReject(p, reason)}>Reject score</button>
        </div>
      ) : (
        <div className="sd-btn-row">
          <button type="button" className="sd-btn sd-btn-primary" disabled={Boolean(p.problem)} onClick={() => onApprove(p)}>Approve</button>
          <button type="button" className="sd-btn sd-btn-warn" onClick={() => setRejecting(true)}>Reject</button>
        </div>
      )}
    </li>
  );
}

/** Phone scores waiting for the operator. Nothing counts until it is approved here. */
export default function ShowdownPendingPanel({ items, error, onApprove, onReject }) {
  if (!items.length && !error) return null;
  return (
    <section className="sd-panel sd-pending" aria-label="Phone scores waiting">
      <h3>Phone scores waiting ({items.length})</h3>
      <p className="sd-note">Approving records the score exactly like entering it here. Rejecting leaves the match open.</p>
      {error ? <p className="sd-error" role="alert">{error}</p> : null}
      <ul className="sd-pending-list">
        {items.map((p) => <Row key={p.id} p={p} onApprove={onApprove} onReject={onReject} />)}
      </ul>
    </section>
  );
}

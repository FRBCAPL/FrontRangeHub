import React, { useState } from 'react';
import CashClimbV3Dialog from './CashClimbV3Dialog.jsx';
import { money } from './cashClimbV3View.js';

const SIDE = { 'tablet-only': 'Only on this tablet', 'cloud-only': 'Only in the cloud', different: 'Different results' };

/**
 * Two copies disagree. Shows the differing results and earnings; nothing is merged. Using the cloud copy
 * archives this tablet's copy on the device and, when the tablet has results the cloud lacks, needs the
 * operator to confirm they may have to be entered again. The tablet copy can replace the cloud copy only
 * when neither has started.
 */
export default function CashClimbV3ConflictDialog({ conflict, onUseCloud, onUseTablet, onClose }) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [problem, setProblem] = useState('');
  const [busy, setBusy] = useState(false);
  const d = conflict.differences;

  const useCloud = () => {
    const r = onUseCloud({ acknowledged });
    if (!r.ok) setProblem(r.problem);
  };
  const useTablet = async () => {
    setBusy(true);
    const r = await onUseTablet();
    setBusy(false);
    if (!r.ok) setProblem(r.problem);
  };

  return (
    <CashClimbV3Dialog title="Two copies of this tournament disagree" onClose={onClose} busy={busy}>
      <p className="cc-setup-note">
        Another device saved changes this tablet did not have, and this tablet has changes the cloud does not have.
        Sending is paused. Both copies are kept until you choose.
      </p>
      {d.setupOnly ? <p className="cc-setup-note">Neither copy has started. Their setups differ.</p> : null}
      {d.matches.length ? (
        <>
          <h4>Results that differ</h4>
          <table className="ccv3-table ccv3-conflict-table">
            <thead><tr><th>Match</th><th>This tablet</th><th>Cloud</th><th /></tr></thead>
            <tbody>
              {d.matches.map((m) => (
                <tr key={m.id}><td>{m.label}</td><td>{m.tablet.text}</td><td>{m.cloud.text}</td><td>{SIDE[m.side]}</td></tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}
      {d.earnings.length ? (
        <>
          <h4>Earnings that differ</h4>
          <table className="ccv3-table ccv3-conflict-table">
            <thead><tr><th>Player</th><th>This tablet</th><th>Cloud</th></tr></thead>
            <tbody>
              {d.earnings.map((e) => <tr key={e.playerId}><td>{e.name}</td><td>{money(e.tabletCents)}</td><td>{money(e.cloudCents)}</td></tr>)}
            </tbody>
          </table>
        </>
      ) : null}
      {d.tabletSettlementOnly ? <p className="cc-setup-note">This tablet settled the tournament; the cloud copy has a different settlement or none.</p> : null}
      {d.needsAcknowledgment ? (
        <label className="ccv3-ack">
          <input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} />
          {' '}I understand that results only on this tablet will not be in the cloud copy and may need to be entered again.
          This tablet&rsquo;s copy is archived on this device, not deleted.
        </label>
      ) : null}
      {problem ? <p className="ccv3-problems" role="alert">{problem}</p> : null}
      <div className="form-actions">
        <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>Decide later</button>
        {d.setupOnly ? <button type="button" className="btn-secondary" onClick={useTablet} disabled={busy}>Use this tablet&rsquo;s setup</button> : null}
        <button type="button" className="btn-primary" onClick={useCloud} disabled={busy || (d.needsAcknowledgment && !acknowledged)}>Use the cloud copy</button>
      </div>
    </CashClimbV3Dialog>
  );
}

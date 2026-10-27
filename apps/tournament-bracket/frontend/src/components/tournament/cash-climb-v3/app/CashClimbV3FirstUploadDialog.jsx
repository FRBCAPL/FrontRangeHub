import React, { useState } from 'react';
import { cashClimbV3Shape } from '../cashClimbV3Bracket.js';
import CashClimbV3Dialog from './CashClimbV3Dialog.jsx';
import CashClimbV3Payouts from './CashClimbV3Payouts.jsx';
import { firstUploadSummary, UPLOAD_DESTINATION } from './cashClimbV3FirstUpload.js';
import { money } from './cashClimbV3View.js';

/**
 * Review before the first upload of a tournament saved on this tablet before cloud saving was in use.
 * Shows what will be sent and where; nothing is sent until the operator confirms. The record is sent
 * exactly as saved (same id, same locked payout).
 */
export default function CashClimbV3FirstUploadDialog({ record, mode, onApprove, onClose }) {
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const s = firstUploadSummary(record);
  const destination = UPLOAD_DESTINATION[mode] || 'Cloud';

  const approve = async () => {
    setBusy(true);
    await onApprove();
    setBusy(false);
  };

  return (
    <CashClimbV3Dialog title="Review before the first upload" onClose={onClose} busy={busy}>
      <p className="cc-setup-note">
        This tournament was saved on this tablet before cloud saving was in use. It will not be sent until you review it and approve.
      </p>
      <dl className="ccv3-facts">
        <dt>Destination</dt><dd><strong>{destination}</strong></dd>
        <dt>Tournament</dt><dd>{s.name}</dd>
        <dt>Date</dt><dd>{s.date || 'Not set'}</dd>
        <dt>Status</dt><dd>{s.statusText}</dd>
        <dt>Results posted</dt><dd>{s.resultsPosted} of {s.matchCount} matches</dd>
        <dt>Settlement</dt><dd>{s.settled ? 'Settled' : 'Not settled'}</dd>
        <dt>Earnings recorded</dt><dd>{money(s.earnedCents)}</dd>
        <dt>Prize pool</dt><dd>{money(s.prizePoolCents)}</dd>
        <dt>Payout</dt><dd>{s.payoutLocked ? 'Locked at start' : 'Not locked yet (still in setup)'} • {s.optimizerId}</dd>
      </dl>
      <h4>Entrants ({s.entrants.length})</h4>
      <p className="cc-setup-note">{s.entrants.join(', ')}</p>
      <CashClimbV3Payouts payout={record.payout} shape={cashClimbV3Shape(record.players.length)} locked={s.payoutLocked} />
      <label className="ccv3-ack">
        <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
        {' '}I reviewed this tournament and want to upload it to the {destination.toLowerCase()}.
      </label>
      <div className="form-actions">
        <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>Not now</button>
        <button type="button" className="btn-primary" onClick={approve} disabled={busy || !checked}>{busy ? 'Uploading…' : 'Approve and upload'}</button>
      </div>
    </CashClimbV3Dialog>
  );
}

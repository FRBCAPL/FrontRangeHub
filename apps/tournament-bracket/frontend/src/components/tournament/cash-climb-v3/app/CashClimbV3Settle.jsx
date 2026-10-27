import React, { useState } from 'react';
import { settlementStatus } from '../cashClimbV3Settlement.js';
import { previewCashClimbV3Settlement } from './cashClimbV3Play.js';
import { entryLabel } from './cashClimbV3Earnings.js';
import { money, playerNameOf } from './cashClimbV3View.js';
import CashClimbV3Dialog from './CashClimbV3Dialog.jsx';

const BASIS = { forfeit: 'forfeit', walkover: 'walkover', withdrawal: 'withdrawal', completed: 'winning the championship' };

export function settlementLines(record, settlement) {
  const name = playerNameOf(record);
  const lines = [];
  if (settlement.championId) lines.push(`Champion: ${name(settlement.championId)} (by ${BASIS[settlement.championBasis] || settlement.championBasis}).`);
  else lines.push('There is no champion: no player survived the championship.');
  if (settlement.runnerUpId) lines.push(`Runner-up: ${name(settlement.runnerUpId)}.`);
  if (settlement.mode === 'normal') lines.push(`Unawarded money of ${money(settlement.finalistBonusCents)} is paid to the finalists as bonuses (champion 80%, runner-up 20%).`);
  else lines.push(`Exceptional settlement: payouts already earned stand, there are no finalist bonuses, and ${money(settlement.operatorRetainedCents)} of unawarded money is retained by the operator.`);
  return lines;
}

/** Settlement panel: final breakdown before confirming, then the settled result (read-only). */
export default function CashClimbV3Settle({ record, onSettle }) {
  const [preview, setPreview] = useState(null);
  const [problems, setProblems] = useState([]);
  const [busy, setBusy] = useState(false);
  const name = playerNameOf(record);

  if (record.event.settlement) {
    return (
      <section className="ccv3-settle" aria-label="Settlement">
        <h4>Final result</h4>
        {settlementLines(record, record.event.settlement).map((l) => <p key={l} className="cc-setup-note">{l}</p>)}
      </section>
    );
  }
  const status = settlementStatus(record.event);
  if (!status.ready) return null;

  const review = () => {
    const p = previewCashClimbV3Settlement(record);
    if (p.status !== 'ok') { setProblems(p.problems); return; }
    setProblems([]);
    setPreview(p);
  };
  const confirm = () => {
    if (busy) return;
    setBusy(true);
    const r = onSettle();
    if (r.status !== 'ok') { setProblems(r.problems); setBusy(false); }
  };
  const totals = preview ? Object.entries(preview.summary.earnedByPlayer).sort((a, b) => b[1] - a[1]) : [];

  return (
    <section className="ccv3-settle" aria-label="Settlement">
      <h4>Every match is resolved</h4>
      <p className="cc-setup-note">Review the final payouts and settle the tournament. Settling is final and makes the tournament read-only.</p>
      <button type="button" className="btn-primary" onClick={review}>Review final payouts</button>
      {problems.length && !preview ? <ul className="ccv3-problems" role="alert">{problems.map((p) => <li key={p}>{p}</li>)}</ul> : null}
      {preview ? (
        <CashClimbV3Dialog title="Final payouts" onClose={() => setPreview(null)} busy={busy}>
          {settlementLines(record, preview.settlement).map((l) => <p key={l} className="cc-setup-note">{l}</p>)}
          {preview.entries.length ? (
            <ul className="ccv3-entries">
              {preview.entries.map((e) => <li key={e.key}><span>{name(e.playerId)}: {entryLabel(e.type)}</span><strong>{money(e.cents)}</strong></li>)}
            </ul>
          ) : null}
          <h4>Final totals</h4>
          <ul className="ccv3-entries">
            {totals.map(([id, cents]) => <li key={id}><span>{name(id)}</span><strong>{money(cents)}</strong></li>)}
            <li className="ccv3-total"><span>Paid to players</span><strong>{money(preview.summary.earnedCents)}</strong></li>
            {preview.summary.operatorRetainedCents ? <li><span>Retained by the operator</span><strong>{money(preview.summary.operatorRetainedCents)}</strong></li> : null}
            <li><span>Prize pool</span><strong>{money(preview.summary.prizePoolCents)}</strong></li>
          </ul>
          {problems.length ? <ul className="ccv3-problems" role="alert">{problems.map((p) => <li key={p}>{p}</li>)}</ul> : null}
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setPreview(null)} disabled={busy}>Cancel</button>
            <button type="button" className="btn-primary" onClick={confirm} disabled={busy}>{busy ? 'Settling…' : 'Settle tournament'}</button>
          </div>
        </CashClimbV3Dialog>
      ) : null}
    </section>
  );
}

import React, { useState } from 'react';
import { isUnitMultiple, unitText, V3_UNIT_CENTS } from '../../v3/showdownV3Rules.js';

function draftProblem(playerId, amountCents, reason, unit) {
  if (!playerId) return 'Pick the player the adjustment is for.';
  if (!amountCents || !isUnitMultiple(amountCents, unit)) return `Enter a non-zero amount in ${unitText(unit)} steps.`;
  if (!reason.trim()) return 'Every adjustment needs a reason for the audit log.';
  return '';
}

/**
 * Audited payout adjustments after settlement. They come out of the undistributed remainder only (the
 * champion bonus or split, unawarded or unresolved money); earned pay is never reduced this way.
 */
export default function ShowdownV3Adjustments({ view, players, error = '', onAdjust }) {
  const [playerId, setPlayerId] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const unit = view.unitCents || V3_UNIT_CENTS;
  const amountCents = Math.round(Number(amount) * 100);
  const problem = draftProblem(playerId, Number.isFinite(amountCents) ? amountCents : 0, reason, unit);
  const submit = () => {
    if (onAdjust({ playerId, amountCents, reason: reason.trim() })) { setAmount(''); setReason(''); }
  };

  return (
    <section className="sd-panel" aria-label="Payout adjustments">
      <h3>Payout adjustments</h3>
      <p className="sd-note">
        An adjustment is paid out of the money not yet earned by play: the champion bonus or split, unawarded money, or unresolved money.
        It lowers that amount by the same sum, so the pool is never exceeded. Earned pay cannot be reduced here; correct the result instead.
        A negative amount only takes back an earlier adjustment to the same player.
      </p>
      <p><strong>Available for adjustments:</strong> {view.available}</p>
      {view.adjustments.length ? (
        <table className="sd-table">
          <thead><tr><th>Player</th><th>Amount</th><th>Reason</th><th>By</th></tr></thead>
          <tbody>
            {view.adjustments.map((a) => (
              <tr key={a.id}><td>{a.name}</td><td>{a.amount}</td><td>{a.reason}</td><td>{a.by}</td></tr>
            ))}
          </tbody>
        </table>
      ) : <p className="sd-note">No adjustments recorded.</p>}
      <div className="sd-v3-adjust-form">
        <label className="sd-field">
          Player
          <select value={playerId} onChange={(e) => setPlayerId(e.target.value)}>
            <option value="">Choose a player</option>
            {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label className="sd-field">
          Amount ($, {unit}&cent; steps)
          <input type="number" step={unit / 100} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <label className="sd-field">
          Reason
          <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} />
        </label>
      </div>
      {amount && problem ? <p className="sd-note" aria-live="polite">{problem}</p> : null}
      {error ? <p className="sd-error" role="alert">{error}</p> : null}
      <button type="button" className="sd-btn sd-btn-primary" disabled={Boolean(problem)} onClick={submit}>Record adjustment</button>
    </section>
  );
}

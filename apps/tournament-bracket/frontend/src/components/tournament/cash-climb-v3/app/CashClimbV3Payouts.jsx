import React from 'react';
import { championshipSplit } from '../cashClimbV3Championship.js';

const dollars = (n) => `$${Number(n).toLocaleString()}`;

/**
 * Display only. `payout` comes from the engine (a preview, or a saved record's locked payout); this
 * component never calculates payouts. `shape` is the bracket shape for round names and match counts.
 */
export default function CashClimbV3Payouts({ payout, shape, locked = false, title }) {
  if (!payout || !shape) return null;
  const last = payout.ladder.length - 1;
  const split = championshipSplit(payout.ladder[last]);
  return (
    <section className="ccv3-payouts" aria-label="Payouts">
      <h4>{title || (locked ? 'Locked payouts' : 'Payout preview')}</h4>
      <p className="cc-setup-note">Prize pool {dollars(payout.prizePoolCents / 100)}</p>
      <table className="ccv3-table">
        <thead><tr><th>Stage</th><th>Matches</th><th>Per match</th></tr></thead>
        <tbody>
          {shape.preliminaryMatches > 0 ? (
            <tr><td>Preliminary round (shared by score)</td><td>{shape.preliminaryMatches}</td><td>{dollars(payout.reserves.preliminaryDollars)}</td></tr>
          ) : null}
          <tr><td>Opening round (shared by score)</td><td>{shape.mainOpeningMatches}</td><td>{dollars(payout.reserves.mainDollars)}</td></tr>
          {shape.laterRounds.map((r, i) => (
            <tr key={r.label}>
              <td>{i === last ? 'Championship allocation' : `${r.label} win`}</td>
              <td>{r.matches}</td>
              <td>{dollars(payout.ladder[i])}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="cc-setup-note">
        Championship: champion {dollars(split.champion)}, runner-up {dollars(split.runnerUp)}. Any prize money left unawarded at
        the end is added for the two finalists, 80/20.
      </p>
      {locked ? <p className="cc-setup-note ccv3-muted">Calculated by {payout.optimizerId}. Saved payouts are never recalculated.</p> : null}
    </section>
  );
}

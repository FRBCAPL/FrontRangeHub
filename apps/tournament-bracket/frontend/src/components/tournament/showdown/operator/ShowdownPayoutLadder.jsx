import React from 'react';
import { money } from './showdownView.js';
import { PayoutEstimateWarning, PayoutNotes } from './ShowdownPayoutNotes.jsx';

/** The payout schedule: every line item, count, amount and total. Always adds up to the pool. */
export default function ShowdownPayoutLadder({ ladder, title = 'Payout schedule', locked = false }) {
  if (!ladder) return null;
  const v2 = ladder.payoutVersion === 2;
  const heading = ladder.estimate ? `${title} (${v2 ? 'provisional' : 'estimate'})` : title;
  return (
    <section className="sd-panel" aria-label={heading}>
      <h3>{heading}{locked && !ladder.estimate ? <span className="sd-tag">Locked</span> : null}</h3>
      <PayoutEstimateWarning ladder={ladder} />
      <div className="sd-table-wrap">
        <table className="sd-table">
          <thead>
            <tr><th>Payout</th><th className="sd-num">Count</th><th className="sd-num">Each</th><th className="sd-num">Total</th></tr>
          </thead>
          <tbody>
            {ladder.rows.map((r) => (
              <tr key={r.key}>
                <td>{r.label}</td>
                <td className="sd-num">{r.count}</td>
                <td className="sd-num">{r.each === null ? 'varies' : money(r.each)}</td>
                <td className="sd-num">{money(r.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr><td colSpan={3}>Total paid out</td><td className="sd-num">{money(ladder.total)}</td></tr>
            <tr><td colSpan={3}>Prize pool</td><td className="sd-num">{money(ladder.pool)}</td></tr>
          </tfoot>
        </table>
      </div>
      <PayoutNotes ladder={ladder} />
    </section>
  );
}

import React from 'react';
import { money } from './showdownView.js';

/** The payout schedule: every line item, count, amount and total. Always adds up to the pool. */
export default function ShowdownPayoutLadder({ ladder, title = 'Payout schedule', locked = false }) {
  if (!ladder) return null;
  const heading = ladder.estimate ? `${title} (estimate)` : title;
  return (
    <section className="sd-panel" aria-label={heading}>
      <h3>{heading}{locked && !ladder.estimate ? <span className="sd-tag">Locked</span> : null}</h3>
      {ladder.estimate ? (
        <p className="sd-warn">
          Estimate only. Top-ups and the playoff payouts lock when qualifying ends, because they depend on how many
          qualifying wins the qualifiers have. This estimate assumes {ladder.twoWin} qualifier{ladder.twoWin === 1 ? '' : 's'} went 2&ndash;0 and the rest 1&ndash;1.
        </p>
      ) : null}
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
      <p className="sd-note">
        Each qualifying win pays {money(ladder.q)}, and players keep it whether or not they qualify. Each of the {ladder.qualifiers} qualifiers
        is topped up to the {money(ladder.entryFee)} entry fee. The rest of the pool ({money(ladder.budget)}) pays playoff wins
        {ladder.byes ? ` and ${ladder.byes} quarterfinal bye${ladder.byes === 1 ? '' : 's'} (half a quarterfinal win each)` : ''}.
        The championship includes any rounding remainder{ladder.finalRemainder ? ` (${money(ladder.finalRemainder)})` : ''}.
        {ladder.doubleForfeitShift ? ` Qualifying double forfeits moved ${money(ladder.doubleForfeitShift)} to the championship.` : ''}
      </p>
    </section>
  );
}

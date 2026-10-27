import React, { useState } from 'react';
import { financialSummary, playerEarnings } from './cashClimbV3Earnings.js';
import { money } from './cashClimbV3View.js';

/** Financial summary and player earnings, read from the engine ledger. Display only. */
export default function CashClimbV3Money({ record }) {
  const [open, setOpen] = useState(null);
  const lines = financialSummary(record);
  const players = playerEarnings(record);
  const live = record.status === 'in-progress';
  return (
    <section className="ccv3-money" aria-label="Money">
      <h4>Financial summary</h4>
      <table className="ccv3-table">
        <tbody>
          {lines.map((l) => (
            <tr key={l.key}>
              <td>{l.label}{l.note ? <div className="ccv3-muted">{l.note}</div> : null}</td>
              <td>{money(l.cents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h4>Player earnings</h4>
      <p className="cc-setup-note ccv3-muted">Earned amounts are posted and final. {live ? '"Possible next" is what the player\'s next match is scheduled to pay; it is not earned yet.' : ''}</p>
      <table className="ccv3-table ccv3-earnings">
        <thead><tr><th>Player</th><th>Earned</th></tr></thead>
        <tbody>
          {players.map((p) => (
            <React.Fragment key={p.id}>
              <tr>
                <td>
                  <button type="button" className="ccv3-link" aria-expanded={open === p.id} onClick={() => setOpen(open === p.id ? null : p.id)}>
                    {p.name}
                  </button>
                  {live ? <span className="ccv3-muted">{p.next ? ' · still playing' : p.alive ? ' · champion (settlement pending)' : ' · out'}</span> : null}
                  {p.next ? <div className="ccv3-muted">Possible next ({p.next.title}): {p.next.possible}</div> : null}
                </td>
                <td>{money(p.totalCents)}</td>
              </tr>
              {open === p.id ? (
                <tr className="ccv3-earnings-detail">
                  <td colSpan={2}>
                    {p.byMatch.length ? (
                      <ul className="ccv3-entries">
                        {p.byMatch.map((e) => <li key={e.key}><span>{e.title}: {e.label}</span><strong>{money(e.cents)}</strong></li>)}
                        <li className="ccv3-total"><span>Total earned</span><strong>{money(p.totalCents)}</strong></li>
                      </ul>
                    ) : <span className="ccv3-muted">Nothing earned yet.</span>}
                  </td>
                </tr>
              ) : null}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </section>
  );
}

import React from 'react';
import ShowdownPayoutLadder from './ShowdownPayoutLadder.jsx';
import { money } from './showdownView.js';

function PlayerTag({ p }) {
  if (p.withdrawn) return <small> (withdrew)</small>;
  if (p.hasBye) return <small className="sd-tag">Bye</small>;
  if (p.qualified) return <small className="sd-tag">Playoffs</small>;
  return null;
}

/** Payout ladder, each player's earnings step by step, and paid vs. remaining. */
export default function ShowdownMoney({ view, status }) {
  const v = view;
  return (
    <>
      <section className="sd-panel" aria-label="Prize pool">
        <div className="cc-stat-row">
          <div className="cc-stat"><span>Prize pool</span><strong>{money(v.pool)}</strong></div>
          <div className="cc-stat"><span>Qualifying win pays</span><strong>{money(v.q)}</strong></div>
          <div className="cc-stat"><span>Paid so far</span><strong>{money(v.paid)}</strong></div>
          <div className="cc-stat"><span>Still to be won</span><strong>{money(v.remaining)}</strong></div>
          {v.locked ? <div className="cc-stat"><span>Championship</span><strong>{money(v.championship)}</strong></div> : null}
        </div>
        {v.locked ? (
          <p className="sd-note">
            Qualifying paid {money(v.qualifyingPaid)}. Qualifier top-ups {money(v.topUps)}. Playoff budget {money(v.playoffBudget)}.
          </p>
        ) : (
          <p className="sd-note">Top-ups and playoff payouts lock when qualifying ends.</p>
        )}
        {v.doubleForfeits ? (
          <p className="sd-note">{v.doubleForfeits} qualifying double forfeit{v.doubleForfeits === 1 ? '' : 's'}: that payout was added to the championship.</p>
        ) : null}
        {v.playoffTransfers.length ? (
          <p className="sd-note">
            Playoff payouts nobody won, added to the championship: {v.playoffTransfers.map((t) => `${t.label} (${money(t.amount)})`).join(', ')}.
          </p>
        ) : null}
        {status === 'completed' || v.remaining === 0 ? (
          v.reconciled
            ? <p className="sd-ok">Reconciled: {money(v.paid)} paid of {money(v.pool)}. Every dollar is accounted for.</p>
            : <p className="sd-error">Does not reconcile yet: {v.reconciliationMessage}</p>
        ) : null}
      </section>
      <ShowdownPayoutLadder ladder={v.ladder} title="Payout ladder" locked={v.locked} />
      <section className="sd-panel" aria-label="Player earnings">
        <h3>Player earnings</h3>
        <p className="sd-note">
          Earnings are worked out from recorded results, so a correction can never pay twice. Every qualifier has at least
          the {money(v.entryFee)} entry fee before the playoffs start.
        </p>
        <div className="sd-table-wrap">
          <table className="sd-table sd-earnings">
            <thead>
              <tr>
                <th>Player</th>
                <th className="sd-num">Qualifying</th>
                <th className="sd-num">Top-up</th>
                <th className="sd-num">Before playoffs</th>
                <th className="sd-num">Bye</th>
                <th className="sd-num">Playoffs</th>
                <th className="sd-num">Total</th>
              </tr>
            </thead>
            <tbody>
              {v.players.map((p) => (
                <tr key={p.playerId} className={p.withdrawn ? 'is-withdrawn' : ''}>
                  <td>{p.name} <PlayerTag p={p} /></td>
                  <td className="sd-num">{money(p.qualifying)}</td>
                  <td className="sd-num">{p.topUp ? money(p.topUp) : '\u2014'}</td>
                  <td className="sd-num">{money(p.beforePlayoffs)}</td>
                  <td className="sd-num">{p.hasBye ? money(p.bye) : '\u2014'}</td>
                  <td className="sd-num">{money(p.playoff)}</td>
                  <td className="sd-num"><strong>{money(p.total)}</strong></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr><td colSpan={6}>Total paid</td><td className="sd-num">{money(v.paid)}</td></tr>
            </tfoot>
          </table>
        </div>
      </section>
    </>
  );
}

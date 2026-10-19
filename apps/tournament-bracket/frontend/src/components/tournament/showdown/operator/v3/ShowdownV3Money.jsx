import React from 'react';
import ShowdownV3PlanPanel from './ShowdownV3PlanPanel.jsx';

function Tag({ p }) {
  if (p.withdrawn) return <small> (withdrew)</small>;
  if (p.hasBye) return <small className="sd-tag">Bye</small>;
  if (p.qualified) return <small className="sd-tag">Playoffs</small>;
  return null;
}

/** Where every cent of the pool stands right now. */
export function ShowdownV3Reconciliation({ v }) {
  return (
    <section className="sd-panel" aria-label="Payout reconciliation">
      <div className="sd-panel-head">
        <h3>Payout reconciliation</h3>
        <span className="sd-progress">{v.outcomeLabel}</span>
      </div>
      <div className="cc-stat-row">
        <div className="cc-stat"><span>Entry pool</span><strong>{v.pool}</strong></div>
        <div className="cc-stat"><span>Earned by players</span><strong>{v.paid}</strong></div>
        {v.heldCents ? <div className="cc-stat"><span>Still to be won</span><strong>{v.held}</strong></div> : null}
        {v.unresolvedCents ? <div className="cc-stat"><span>Unresolved</span><strong>{v.unresolved}</strong></div> : null}
        {v.unawardedCents ? <div className="cc-stat"><span>Not awarded</span><strong>{v.unawarded}</strong></div> : null}
      </div>
      <p className="sd-note">
        Qualifying games paid {v.qualifyingPaid} of the {v.qualifyingReserve} reserved. Playoff games paid {v.playoffGamesPaid} of the {v.playoffGameReserve} reserved.
        {v.heldCents ? ' Money not yet won stays in the pool until the event ends.' : ''}
      </p>
      {v.recipients.length ? <p className="sd-note">Remainder paid to: {v.recipients.join(', ')}.</p> : null}
      {v.disclosures.map((d) => <p key={d} className="sd-warn">{d}</p>)}
      {v.pendingApproval.includes('abandonment-retention') ? <p className="sd-warn">Operator retention is not approved: the unawarded amount must not be kept or paid out until it is.</p> : null}
      {v.reconciled
        ? <p className="sd-ok">Reconciled: every cent of the {v.pool} pool is accounted for.</p>
        : <p className="sd-error" role="alert">Does not reconcile: {v.problems[0]}</p>}
    </section>
  );
}

/** V3 earnings by kind for every player, the reconciliation and the locked plan. */
export default function ShowdownV3Money({ view }) {
  const v = view;
  return (
    <>
      <ShowdownV3Reconciliation v={v} />
      <section className="sd-panel" aria-label="Player earnings">
        <h3>Player earnings</h3>
        <p className="sd-note">
          Earnings are worked out from recorded results, so a correction can never pay twice. Credits are administrative
          (games credited for a forfeit) and are shown apart from games actually won.
        </p>
        {v.credits.length ? <ul className="sd-note-list" aria-label="Administrative credits">{v.credits.map((c) => <li key={c.matchId}>{c.text}</li>)}</ul> : null}
        <div className="sd-table-wrap">
          <table className="sd-table sd-earnings">
            <thead>
              <tr>
                <th>Player</th>
                <th className="sd-num">Qualifying games</th>
                <th className="sd-num">Credits</th>
                <th className="sd-num">Playoff games</th>
                <th className="sd-num">Match wins</th>
                <th className="sd-num">Bye</th>
                <th className="sd-num">Adjustments</th>
                <th className="sd-num">Bonus / split</th>
                <th className="sd-num">Total</th>
              </tr>
            </thead>
            <tbody>
              {v.players.map((p) => (
                <tr key={p.playerId} className={p.withdrawn ? 'is-withdrawn' : ''}>
                  <td>{p.name} <Tag p={p} /></td>
                  <td className="sd-num">{p.qualifying}</td>
                  <td className="sd-num">{p.credit}</td>
                  <td className="sd-num">{p.playoffGames}</td>
                  <td className="sd-num">{p.matchWins}</td>
                  <td className="sd-num">{p.bye}</td>
                  <td className="sd-num">{p.adjustment}</td>
                  <td className="sd-num">{p.settlement}</td>
                  <td className="sd-num"><strong>{p.total}</strong></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr><td colSpan={8}>Earned by players</td><td className="sd-num">{v.paid}</td></tr>
            </tfoot>
          </table>
        </div>
      </section>
      <ShowdownV3PlanPanel view={v.plan} locked />
    </>
  );
}

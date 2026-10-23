import React from 'react';
import ShowdownV3PlanEscalating from './ShowdownV3PlanEscalating.jsx';

/**
 * A V3 payout plan. `locked` false: the preview shown before the start (what the start will lock).
 * `locked` true: the plan saved at the start, read-only — its financial terms can never be edited.
 */
export default function ShowdownV3PlanPanel({ view, problems = [], locked = false }) {
  const v = view;
  return (
    <section className="sd-panel sd-v3-plan" aria-label="V3 payout plan">
      <div className="sd-panel-head">
        <h3>{locked ? 'Locked V3 payout plan' : 'Proposed V3 payout plan'}</h3>
        <span className="sd-progress">{locked ? 'Locked at the start \u00b7 cannot be edited' : 'Preview \u00b7 locks when qualifying starts'}</span>
      </div>
      {problems.length ? (
        <ul className="sd-problems" aria-label="Payout plan problems">
          {problems.map((p) => <li key={p}>{p}</li>)}
        </ul>
      ) : null}
      {v?.escalating ? <ShowdownV3PlanEscalating v={v} /> : null}
      {v && !v.escalating ? (
        <>
          <div className="cc-stat-row">
            <div className="cc-stat"><span>Entry pool</span><strong>{v.pool}</strong></div>
            {v.equalRate ? (
              <div className="cc-stat"><span>Every game won</span><strong>{v.rates.game}</strong></div>
            ) : (
              <>
                <div className="cc-stat"><span>Round 1 game win</span><strong>{v.rates.r1}</strong></div>
                <div className="cc-stat"><span>Round 2 game win</span><strong>{v.rates.r2}</strong></div>
                <div className="cc-stat"><span>Playoff game win</span><strong>{v.rates.playoff}</strong></div>
              </>
            )}
            <div className="cc-stat"><span>Championship win</span><strong>{v.championship}</strong></div>
          </div>
          <p className="sd-note">
            {v.entrants} entrants at {v.entryFee}. Qualifying: {v.qualifyingGames} games per match, all played, ties allowed.
            Playoffs: {v.qualifiers} players, race to {v.playoffRaceTo}.
            {v.equalRate ? ' Every game won pays the same rate in qualifying and in the playoffs; match wins pay the bonuses below.' : ' Every game won pays its rate; match wins pay the bonuses below.'}
          </p>

          <h4>Where the pool goes</h4>
          <div className="sd-table-wrap">
            <table className="sd-table">
              <thead><tr><th>Allocation</th><th className="sd-num">Amount</th><th className="sd-num">Share</th></tr></thead>
              <tbody>
                {v.allocation.map((a) => (
                  <tr key={a.key}><td>{a.label}</td><td className="sd-num">{a.amount}</td><td className="sd-num">{a.pct}%</td></tr>
                ))}
              </tbody>
              <tfoot><tr><td>Entry pool</td><td className="sd-num">{v.pool}</td><td className="sd-num">100%</td></tr></tfoot>
            </table>
          </div>

          <h4>Match-win bonuses</h4>
          <div className="sd-table-wrap">
            <table className="sd-table">
              <thead><tr><th>Round</th><th className="sd-num">Matches</th><th className="sd-num">Each win</th><th className="sd-num">Total</th></tr></thead>
              <tbody>
                {v.rounds.map((r) => (
                  <tr key={r.key}><td>{r.label}</td><td className="sd-num">{r.matches}</td><td className="sd-num">{r.each}</td><td className="sd-num">{r.total}</td></tr>
                ))}
                {v.bye ? (
                  <tr><td>Quarterfinal bye</td><td className="sd-num">{v.bye.count}</td><td className="sd-num">{v.bye.each}</td><td className="sd-num">{v.bye.total}</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <p className="sd-note">{v.tierHeading}: {v.tierText}</p>
          <ul className="sd-note-list" aria-label="Payout order checks">
            {v.checks.map((c) => <li key={c.label} className={c.ok ? 'sd-ok' : 'sd-warn'}>{c.ok ? 'Guaranteed: ' : 'Not guaranteed: '}{c.label.toLowerCase()}</li>)}
          </ul>
          {v.scope ? <p className="sd-note">{v.scope}</p> : null}
          {v.warnings.length ? (
            <div className="sd-warn" role="status">
              <strong>Payout-order warnings</strong>
              <ul>{v.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
            </div>
          ) : null}
          <p className="sd-note">{v.remainderText}</p>
        </>
      ) : null}
    </section>
  );
}

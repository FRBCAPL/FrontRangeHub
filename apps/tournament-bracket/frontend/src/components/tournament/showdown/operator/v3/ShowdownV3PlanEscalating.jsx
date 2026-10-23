import React from 'react';

function checkText(c) {
  if (c.hard) return `Always (hard rule): ${c.label.toLowerCase()}`;
  return `${c.ok ? 'Guaranteed' : 'Not guaranteed'}: ${c.label.toLowerCase()}`;
}

/** Body of an escalating (D10) V3 payout plan: game values by stage, bye credit, Champion Fund and guarantees. */
export default function ShowdownV3PlanEscalating({ v }) {
  return (
    <>
      <div className="cc-stat-row">
        <div className="cc-stat"><span>Entry pool</span><strong>{v.pool}</strong></div>
        <div className="cc-stat"><span>Qualifying game</span><strong>{v.rates.qualifying}</strong></div>
        {v.stages.map((s) => <div key={s.key} className="cc-stat"><span>{s.label} game</span><strong>{s.rate}</strong></div>)}
        <div className="cc-stat"><span>Starting Champion Fund</span><strong>{v.championFund.start}</strong></div>
      </div>
      <p className="sd-note">{v.summary}</p>
      <p className="sd-note">
        {v.entrants} entrants at {v.entryFee}. Qualifying: {v.qualifyingGames} games per match, all played, ties allowed.
        Playoffs: {v.qualifiers} players, race to {v.playoffRaceTo}. Each playoff stage pays at least {v.stepPct}% more per game than the one before. There are no match-win bonuses.
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

      <h4>Game values by stage</h4>
      <div className="sd-table-wrap">
        <table className="sd-table">
          <thead><tr><th>Stage</th><th className="sd-num">Matches</th><th className="sd-num">Each game won</th><th className="sd-num">Reserved</th></tr></thead>
          <tbody>
            <tr><td>Qualifying</td><td className="sd-num">{v.entrants}</td><td className="sd-num">{v.rates.qualifying}</td><td className="sd-num">{v.allocation[0].amount}</td></tr>
            {v.stages.map((s) => (
              <tr key={s.key}><td>{s.label}</td><td className="sd-num">{s.matches}</td><td className="sd-num">{s.rate}</td><td className="sd-num">{s.reserve}</td></tr>
            ))}
            {v.bye ? (
              <tr><td>Opening-round bye credit (not a game won)</td><td className="sd-num">{v.bye.count}</td><td className="sd-num">{v.bye.each}</td><td className="sd-num">{v.bye.total}</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {v.bye ? <p className="sd-note">A bye credit is {v.byeRule}.</p> : null}

      <p className="sd-note">{v.tierHeading}: {v.tierText}</p>
      <ul className="sd-note-list" aria-label="Payout order checks">
        {v.checks.map((c) => <li key={c.label} className={c.ok ? 'sd-ok' : 'sd-warn'}>{checkText(c)}</li>)}
      </ul>
      {v.scope ? <p className="sd-note">{v.scope}</p> : null}
      <p className="sd-note">{v.remainderText}</p>
    </>
  );
}

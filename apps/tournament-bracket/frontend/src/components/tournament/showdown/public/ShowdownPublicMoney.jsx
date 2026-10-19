import React from 'react';
import ShowdownPayoutLadder from '../operator/ShowdownPayoutLadder.jsx';
import { moneyView, resultsView } from '../operator/showdownBoardView.js';
import { money } from '../operator/showdownView.js';
import ShowdownEarningsTableV2 from '../operator/ShowdownEarningsTableV2.jsx';
import { championBonusText } from '../operator/ShowdownMoneyV2.jsx';

/** Pool, payout schedule and earnings so far. */
function PublicMoneyV2({ v, earners }) {
  return (
    <>
      <section className="sd-panel" aria-label="Prize pool">
        <div className="cc-stat-row">
          <div className="cc-stat"><span>Prize pool</span><strong>{money(v.pool)}</strong></div>
          <div className="cc-stat"><span>Qualifying win pays</span><strong>{money(v.q)}</strong></div>
          <div className="cc-stat"><span>Each game won pays</span><strong>{money(1)}</strong></div>
          <div className="cc-stat"><span>Paid so far</span><strong>{money(v.paid)}</strong></div>
          {v.locked ? <div className="cc-stat"><span>Championship win</span><strong>{money(v.championship)}</strong></div> : null}
        </div>
        {v.locked ? <p className="sd-note">{championBonusText(v)}</p> : null}
      </section>
      <ShowdownPayoutLadder ladder={v.ladder} title="Payout schedule" locked={v.locked} />
      <section className="sd-panel" aria-label="Earnings">
        <h3>Earnings</h3>
        {earners.length ? <ShowdownEarningsTableV2 players={earners} paid={v.paid} label="Earnings" /> : <p className="sd-note">No money won yet.</p>}
      </section>
    </>
  );
}

export function ShowdownPublicMoney({ event }) {
  const v = moneyView(event);
  if (v.payoutVersion !== 1 && v.payoutVersion !== 2) return <section className="sd-panel" aria-label="Prize pool"><p className="sd-note">Money for this event needs a newer version of the app.</p></section>;
  const earners = v.players.filter((p) => p.total > 0);
  if (v.payoutVersion === 2) return <PublicMoneyV2 v={v} earners={earners} />;
  return (
    <>
      <section className="sd-panel" aria-label="Prize pool">
        <div className="cc-stat-row">
          <div className="cc-stat"><span>Prize pool</span><strong>{money(v.pool)}</strong></div>
          <div className="cc-stat"><span>Qualifying win pays</span><strong>{money(v.q)}</strong></div>
          <div className="cc-stat"><span>Paid so far</span><strong>{money(v.paid)}</strong></div>
          {v.locked ? <div className="cc-stat"><span>Championship</span><strong>{money(v.championship)}</strong></div> : null}
        </div>
      </section>
      <ShowdownPayoutLadder ladder={v.ladder} title="Payout schedule" locked={v.locked} />
      <section className="sd-panel" aria-label="Earnings">
        <h3>Earnings</h3>
        {earners.length ? (
          <div className="sd-table-wrap">
            <table className="sd-table">
              <thead><tr><th>Player</th><th className="sd-num">Qualifying</th><th className="sd-num">Top-up</th><th className="sd-num">Bye</th><th className="sd-num">Playoffs</th><th className="sd-num">Total</th></tr></thead>
              <tbody>
                {earners.map((p) => (
                  <tr key={p.playerId}>
                    <td>{p.name}</td>
                    <td className="sd-num">{money(p.qualifying)}</td>
                    <td className="sd-num">{money(p.topUp)}</td>
                    <td className="sd-num">{money(p.bye)}</td>
                    <td className="sd-num">{money(p.playoff)}</td>
                    <td className="sd-num"><strong>{money(p.total)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="sd-note">No money won yet.</p>}
      </section>
    </>
  );
}

/** Champion and final standings (or standings so far). */
export function ShowdownPublicResults({ event }) {
  const v = resultsView(event);
  const champion = event.status === 'completed' ? v.rows.find((r) => r.place === 1) : null;
  return (
    <section className="sd-panel" aria-label="Final standings">
      {champion ? (
        <div className="sd-pub-champion">
          <small>{champion.stage}</small>
          <strong>{champion.name}</strong>
          <span>{money(champion.earnings)}</span>
          {v.bonusAwarded && v.championBonus ? <small>Includes a {money(v.championBonus)} champion bonus</small> : null}
        </div>
      ) : null}
      {v.championship.status === 'unresolved' ? <p className="sd-warn">Championship unresolved. The director will resolve it.</p> : null}
      <h3>{event.status === 'completed' ? 'Final standings' : 'Standings so far'}</h3>
      <div className="sd-table-wrap">
        <table className="sd-table">
          <thead><tr><th>Place</th><th>Player</th><th>Finish</th><th className="sd-num">Earnings</th></tr></thead>
          <tbody>
            {v.rows.map((r) => (
              <tr key={r.playerId} className={r.place === 1 && champion ? 'is-champion' : ''}>
                <td>{r.placeLabel || '\u2014'}</td>
                <td>{r.name}</td>
                <td>{r.stage}</td>
                <td className="sd-num">{money(r.earnings)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

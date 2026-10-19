import React from 'react';
import ShowdownPayoutLadder from './ShowdownPayoutLadder.jsx';
import ShowdownEarningsTableV2 from './ShowdownEarningsTableV2.jsx';
import { money } from './showdownView.js';

function PlayerTag({ p }) {
  if (p.withdrawn) return <small> (withdrew)</small>;
  if (p.hasBye) return <small className="sd-tag">Bye</small>;
  if (p.qualified) return <small className="sd-tag">Playoffs</small>;
  return null;
}

/** Champion bonus line: held until valid completion, then paid to the champion. */
export function championBonusText(v) {
  if (!v.locked) return '';
  if (v.bonusAwarded) return `Champion bonus paid: ${money(v.championBonus)} (unused playoff game reserve and unawarded match-win payouts).`;
  return `Champion bonus held: ${money(v.championBonus)} so far (${money(v.unusedReserve)} unused playoff game reserve`
    + `${v.championBonus - v.unusedReserve ? ` + ${money(v.championBonus - v.unusedReserve)} unawarded match-win payouts` : ''}). It is paid to the champion when the event is completed.`;
}

/** V2 payout summary for the operator. */
export default function ShowdownMoneyV2({ view, status }) {
  const v = view;
  return (
    <>
      <section className="sd-panel" aria-label="Prize pool">
        <div className="cc-stat-row">
          <div className="cc-stat"><span>Prize pool</span><strong>{money(v.pool)}</strong></div>
          <div className="cc-stat"><span>Qualifying win pays</span><strong>{money(v.q)}</strong></div>
          <div className="cc-stat"><span>Each game won pays</span><strong>{money(1)}</strong></div>
          <div className="cc-stat"><span>Paid so far</span><strong>{money(v.paid)}</strong></div>
          <div className="cc-stat"><span>Still to be won</span><strong>{money(v.remaining)}</strong></div>
          {v.locked ? <div className="cc-stat"><span>Championship win</span><strong>{money(v.championship)}</strong></div> : null}
        </div>
        {v.locked ? (
          <p className="sd-note">
            Qualifying wins {money(v.qualifyingPaid)}. Qualifying games won {money(v.qualifyingRacksPaid)}. Playoff game reserve {money(v.rackReserve)}
            ({money(v.playoffRacksPaid)} paid so far). Playoff budget {money(v.playoffBudget)}.
          </p>
        ) : (
          <p className="sd-note">Games won and qualifying wins are paid as they are recorded. Playoff payouts lock when qualifying ends.</p>
        )}
        {v.locked ? <p className="sd-note">{championBonusText(v)}</p> : null}
        {v.doubleForfeits ? (
          <p className="sd-note">{v.doubleForfeits} qualifying double forfeit{v.doubleForfeits === 1 ? '' : 's'}: that win pay goes to the champion bonus.</p>
        ) : null}
        {v.playoffTransfers.length ? (
          <p className="sd-note">
            Playoff payouts nobody won, added to the champion bonus: {v.playoffTransfers.map((t) => `${t.label} (${money(t.amount)})`).join(', ')}.
          </p>
        ) : null}
        <p className="sd-note">Forfeits and walkovers pay no per-game money. Games played before a forfeit cannot be recorded, so they are not paid.</p>
        {status === 'completed' || v.remaining === 0 ? (
          v.reconciled && v.bonusAwarded
            ? <p className="sd-ok">Reconciled: {money(v.paid)} paid of {money(v.pool)}. Every dollar is accounted for.</p>
            : <p className={v.reconciled ? 'sd-note' : 'sd-error'}>{v.reconciled ? 'Reconciles once the event is completed.' : `Does not reconcile yet: ${v.reconciliationMessage}`}</p>
        ) : null}
      </section>
      <ShowdownPayoutLadder ladder={v.ladder} title="Payout ladder" locked={v.locked} />
      <section className="sd-panel" aria-label="Player earnings">
        <h3>Player earnings</h3>
        <p className="sd-note">Earnings are worked out from recorded results, so a correction can never pay twice.</p>
        <ShowdownEarningsTableV2 players={v.players} paid={v.paid} tag={(p) => <PlayerTag p={p} />} />
      </section>
    </>
  );
}

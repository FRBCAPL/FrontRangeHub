import React from 'react';
import { formatMoney } from './breakAndRunEngine.js';

export default function BreakAndRunPotBoard({ snapshot, gameName }) {
  if (!snapshot) return null;
  return (
    <section className="bnr-board" aria-label="Pot">
      <p className="bnr-kicker">{gameName} · Remaining pot continues</p>
      <p className="bnr-pot">{formatMoney(snapshot.currentPot)}</p>
      <p className="bnr-sub">
        in the pot · payable {formatMoney(snapshot.payablePot)} after reserve
      </p>
      <p className="bnr-split">
        Seed {formatMoney(snapshot.startingSeed)} (one-time)
        {' · '}
        Entries {formatMoney(snapshot.entryFees)}
        {' · '}
        Reserve {formatMoney(snapshot.reserve)}
      </p>
      <div className="bnr-stats">
        <div>
          <span>Per ball</span>
          <strong>{formatMoney(snapshot.perBall)}</strong>
        </div>
        <div>
          <span>Called early 10</span>
          <strong>{formatMoney(snapshot.earlyTenPays)}</strong>
        </div>
        <div>
          <span>Clear the rack</span>
          <strong>{formatMoney(snapshot.fullRunPays)}</strong>
        </div>
        <div>
          <span>Paid out</span>
          <strong>{formatMoney(snapshot.totalPaidOut)}</strong>
        </div>
      </div>
    </section>
  );
}

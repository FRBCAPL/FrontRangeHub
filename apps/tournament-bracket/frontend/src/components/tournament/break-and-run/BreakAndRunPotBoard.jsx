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
        Reserve {formatMoney(snapshot.reserve)}
      </p>
      <div className="bnr-money-row" aria-label="Fees collected">
        <div>
          <span>Entry fees collected</span>
          <strong>{formatMoney(snapshot.entryFees)}</strong>
        </div>
        <div>
          <span>Admin fees</span>
          <strong>{formatMoney(snapshot.adminFees)}</strong>
        </div>
        <div>
          <span>Entries</span>
          <strong>{snapshot.buyInCount ?? 0}</strong>
        </div>
      </div>
      <p className="bnr-money-note">
        Admin is $1 of each $10 entry and $2 of each $20 — held out of the pot (not paid on balls).
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

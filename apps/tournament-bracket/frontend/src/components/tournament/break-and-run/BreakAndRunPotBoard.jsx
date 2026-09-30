import React from 'react';
import { formatMoney } from './breakAndRunEngine.js';
import './BreakAndRunOperator.css';

function rateChips(snapshot, called) {
  return called
    ? [
      ['Called ball', snapshot.normalBall],
      ['Lucky ball', snapshot.luckyBall],
      ['Early 10 bonus', snapshot.earlyTenPays],
      ['Final 10 wins', snapshot.finalTenPays, true],
    ]
    : [
      ['Per ball', snapshot.perBall],
      ['Called early 10', snapshot.earlyTenPays],
      ['Clear the rack', snapshot.fullRunPays, true],
    ];
}

/** Compact pot strip: what can be won + the live ball values. Bookkeeping goes in `children`. */
export default function BreakAndRunPotBoard({ snapshot, onTopUpSeed, children }) {
  if (!snapshot) return null;
  const called = snapshot.payoutMode === 'called-ball';
  const headline = called ? snapshot.payablePot : snapshot.currentPot;
  const subline = called
    ? 'Balls pay pot ÷ 10 · Final 10 wins it all'
    : `Payable ${formatMoney(snapshot.payablePot)} after reserve`;

  return (
    <section className="bnr-pot-strip" aria-label="Pot">
      <div className="bnr-pot-strip-head">
        <span className="bnr-pot-strip-label">In the pot</span>
        <strong className="bnr-pot-strip-amount">{formatMoney(headline)}</strong>
        <span className="bnr-pot-strip-sub">{subline}</span>
      </div>
      {called && snapshot.seedTopUpNeeded > 0 && onTopUpSeed ? (
        <div className="bnr-seed-alert" role="status">
          <span>Pot is under $100.</span>
          <button type="button" className="tb-btn-new" onClick={onTopUpSeed}>
            Add {formatMoney(snapshot.seedTopUpNeeded)} seed
          </button>
        </div>
      ) : null}
      <ul className={`bnr-rate-chips${called ? ' is-four' : ''}`}>
        {rateChips(snapshot, called).map(([label, value, highlight]) => (
          <li key={label} className={highlight ? 'is-highlight' : undefined}>
            <span>{label}</span>
            <strong>{formatMoney(value)}</strong>
          </li>
        ))}
      </ul>
      {children}
    </section>
  );
}

import React from 'react';
import { formatMoney } from './breakAndRunEngine.js';
import { formatTurnDate } from './breakAndRunTurns.js';

function turnDetail(turn) {
  if (turn.scratchOnBreak || turn.outcome === 'scratch-break') return 'Scratch on the break';
  if (turn.busted || turn.outcome === 'bust') {
    const balls = turn.payableBalls ?? turn.ballsMade;
    return balls > 0
      ? `Bust · ${balls} ball${balls === 1 ? '' : 's'} at risk forfeited`
      : 'Bust · continued and missed';
  }
  const balls = turn.payableBalls ?? turn.ballsMade;
  const bits = [`Cash out · ${balls} payable ball${balls === 1 ? '' : 's'}`];
  if (turn.earlyTen) bits.push('called early 10 (2×)');
  return bits.join(' · ');
}

export default function BreakAndRunTurns({ turns = [] }) {
  return (
    <section className="bnr-turns" aria-label="Player turns">
      <div className="bnr-section-head">
        <h2>Turns</h2>
      </div>
      {!turns.length ? (
        <p className="cc-setup-note">
          Each turn records cash out, bust, or scratch on the break. Bust pays $0 even if balls were made. Remaining money stays in the pot.
        </p>
      ) : (
        <ol>
          {turns.map((turn) => (
            <li key={turn.id}>
              <div>
                <strong>{turn.playerName}</strong>
                <span>
                  {formatTurnDate(turn.date)}
                  {' · '}
                  {turn.isRebuyTurn || turn.attempt > 1
                    ? `Rebuy #${Math.max(1, (turn.attempt || 1) - 1)}`
                    : 'First try'}
                  {' · '}
                  {turnDetail(turn)}
                </span>
              </div>
              <em className={turn.amountWon > 0 ? 'bnr-in' : 'bnr-out'}>
                {turn.amountWon > 0 ? formatMoney(turn.amountWon) : 'No payout'}
              </em>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

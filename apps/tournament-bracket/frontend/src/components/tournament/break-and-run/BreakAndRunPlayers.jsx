import React from 'react';
import { formatMoney } from './breakAndRunEngine.js';
import { playerDayStatus, systemTurnDate } from './breakAndRunTurns.js';

function entryLabel(player) {
  return player?.entryKind === 'member' || player?.entryKind === 'tournament' || player?.entryKind === 'usapl'
    ? 'Member / tournament'
    : 'Open';
}

function turnBlurb(turn) {
  if (!turn) return '';
  if (turn.scratchOnBreak || turn.outcome === 'scratch-break') return 'scratch on the break · no payout';
  if (turn.busted || turn.outcome === 'bust') {
    const balls = turn.payableBalls ?? turn.ballsMade;
    return balls > 0
      ? `bust · ${balls} at risk forfeited · no payout`
      : 'bust · no payout';
  }
  const balls = turn.payableBalls ?? turn.ballsMade;
  const bits = [`cash out · ${balls} payable ball${balls === 1 ? '' : 's'}`];
  if (turn.earlyTen) bits.push('called early 10');
  bits.push(turn.amountWon > 0 ? `won ${formatMoney(turn.amountWon)}` : 'no payout');
  return bits.join(' · ');
}

function todayLine(status) {
  if (!status.first) return 'No turn yet today';
  const first = turnBlurb(status.first);
  if (status.rebuyTurn) return `${first} · rebuy ${turnBlurb(status.rebuyTurn)}`;
  if (status.rebuyGranted && status.canTurn) return `${first} · one rebuy today`;
  return first;
}

export default function BreakAndRunPlayers({
  tournament,
  live,
  onRecord,
  onAdd,
}) {
  const today = systemTurnDate();
  const players = tournament?.players || [];
  return (
    <section className="bnr-players" aria-label="Players">
      <div className="bnr-section-head">
        <h2>Players</h2>
        {live && onAdd ? (
          <button type="button" className="tb-btn-new" onClick={onAdd}>Add player</button>
        ) : null}
      </div>
      {!players.length ? (
        <p className="cc-setup-note">No players yet. Add someone and their entry goes into the pot.</p>
      ) : (
        <ul>
          {players.map((p) => {
            const day = playerDayStatus(tournament, p.id, today);
            return (
              <li key={p.id}>
                <div>
                  <strong>{p.name}</strong>
                  <span>
                    {entryLabel(p)}
                    {' · '}
                    {p.buyIns} entr{p.buyIns === 1 ? 'y' : 'ies'}
                    {' · '}
                    in {formatMoney(p.paidIn)}
                    {' · '}
                    won {formatMoney(p.won)}
                  </span>
                  <span>{todayLine(day)}</span>
                </div>
                {live ? (
                  <div className="bnr-row-actions">
                    <button
                      type="button"
                      className="tb-btn-new"
                      onClick={() => onRecord?.(p)}
                      disabled={!day.canTurn}
                    >
                      {day.isRebuyTurn ? 'Record rebuy turn' : 'Record turn'}
                    </button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

import React from 'react';
import { formatMoney } from './breakAndRunEngine.js';
import { playerDayStatus, systemTurnDate } from './breakAndRunTurns.js';

function entryLabel(player) {
  return player?.entryKind === 'member' || player?.entryKind === 'tournament' || player?.entryKind === 'usapl'
    ? 'Member / tournament'
    : 'Open';
}

function playerFee(tournament, player) {
  const kind = String(player?.entryKind || '').toLowerCase();
  const member = kind === 'member' || kind === 'tournament' || kind === 'usapl';
  return member
    ? Number(tournament?.memberFee ?? tournament?.tournamentFee) || 0
    : Number(tournament?.openFee) || 0;
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

function statusLine(status, fee) {
  if (status.sessionDone) {
    return `${turnBlurb(status.last)} · done for this session`;
  }
  if (!status.last) return 'No turns yet';
  const last = turnBlurb(status.last);
  if (status.needsRebuyPay && fee > 0) {
    return `${last} · rebuy available · ${formatMoney(fee)}`;
  }
  if (status.isRebuyTurn && status.canTurn && status.rebuyPaid) {
    return `${last} · rebuy paid · record the try`;
  }
  if (status.reason) return `${last} · ${status.reason}`;
  return last;
}

export default function BreakAndRunPlayers({
  tournament,
  live,
  onRecord,
  onPayRebuy,
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
            const fee = playerFee(tournament, p);
            const showPayRebuy = live && day.needsRebuyPay && fee > 0;
            const showRecordRebuy = live && day.canTurn && day.isRebuyTurn && (day.rebuyPaid || fee <= 0);
            const showRecord = live && day.canTurn && !day.isRebuyTurn;
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
                  <span>{statusLine(day, fee)}</span>
                </div>
                {live ? (
                  <div className="bnr-row-actions">
                    {showPayRebuy ? (
                      <button
                        type="button"
                        className="tb-btn-new"
                        onClick={() => onPayRebuy?.(p)}
                      >
                        Rebuy {formatMoney(fee)}
                      </button>
                    ) : null}
                    {showRecordRebuy ? (
                      <button
                        type="button"
                        className="tb-btn-new"
                        onClick={() => onRecord?.(p)}
                      >
                        Record rebuy try
                      </button>
                    ) : null}
                    {showRecord ? (
                      <button
                        type="button"
                        className="tb-btn-new"
                        onClick={() => onRecord?.(p)}
                      >
                        Record turn
                      </button>
                    ) : null}
                    {!day.canTurn && !showPayRebuy ? (
                      <button type="button" className="tb-btn-new" disabled>
                        {day.sessionDone ? 'Done this session' : 'Unavailable'}
                      </button>
                    ) : null}
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

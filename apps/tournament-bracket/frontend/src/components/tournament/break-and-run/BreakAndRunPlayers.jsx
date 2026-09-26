import React from 'react';
import { formatMoney, sessionPlayerIdList } from './breakAndRunEngine.js';
import { currentSession, playerDayStatus, systemTurnDate } from './breakAndRunTurns.js';

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
  if (!status.last) return 'Ready for a turn';
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

/** Active session list: carried forward + bought into this session only. */
export default function BreakAndRunPlayers({
  tournament,
  live,
  onRecord,
  onPayRebuy,
  onAdd,
}) {
  const today = systemTurnDate();
  const session = currentSession(tournament);
  const sessionOpen = session?.status === 'open';
  const enrolledIds = new Set(sessionPlayerIdList(tournament));
  const sessionPlayers = (tournament?.players || []).filter((p) => enrolledIds.has(String(p.id)));

  return (
    <section className="bnr-players" aria-label="This session">
      <div className="bnr-section-head">
        <h2>This session</h2>
        {live && sessionOpen && onAdd ? (
          <button type="button" className="tb-btn-new" onClick={onAdd}>Add player</button>
        ) : null}
      </div>
      {!sessionOpen ? (
        <p className="cc-setup-note">
          Start a session to play. Carried-forward players load automatically; everyone else joins with Add player.
        </p>
      ) : !sessionPlayers.length ? (
        <p className="cc-setup-note">
          No one in this session yet. Add a player to buy in, or pick someone from the pot roster.
        </p>
      ) : (
        <ul>
          {sessionPlayers.map((p) => {
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

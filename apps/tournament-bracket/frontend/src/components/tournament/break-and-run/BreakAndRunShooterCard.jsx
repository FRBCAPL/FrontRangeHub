import React from 'react';
import { attemptLiveView, formatMoney, isAttemptStarted, previewTurn } from './breakAndRunEngine.js';
import BreakAndRunTallyPanel from './BreakAndRunTallyPanel.jsx';
import { buildTableLineup } from './breakAndRunTable.js';
import { playerDayStatus, systemTurnDate } from './breakAndRunTurns.js';
import { playerFee } from './BreakAndRunPlayers.jsx';
import './BreakAndRunOperator.css';

function pickShooter(tournament, lineup) {
  const lockId = tournament.attemptLock?.playerId;
  if (lockId) {
    const locked = lineup.eligible.find((p) => p.id === String(lockId));
    if (locked) return { shooter: locked, chosen: true };
  }
  if (lineup.atTable) return { shooter: lineup.atTable, chosen: true };
  return { shooter: lineup.eligible[0] || null, chosen: false };
}

/** The live loop: who is shooting, start their attempt, record the result, who is next. */
export default function BreakAndRunShooterCard({
  tournament,
  calledMode,
  sessionOpen,
  onStartSession,
  onAddPlayer,
  onPick,
  onStartAttempt,
  onCancelAttempt,
  onAdjustTally,
  onSaveTurn,
  onPayRebuy,
  onRecord,
}) {
  if (!sessionOpen) {
    return (
      <section className="bnr-shooter is-idle" aria-label="At the table">
        <p className="bnr-shooter-kicker">No session running</p>
        <p className="bnr-shooter-hint">Start a session to open the table. The pot carries over from last time.</p>
        <div className="bnr-shooter-actions">
          <button type="button" className="bnr-op-btn is-go" onClick={onStartSession}>Start session</button>
        </div>
      </section>
    );
  }

  const lineup = buildTableLineup(tournament);
  const { shooter, chosen } = pickShooter(tournament, lineup);

  if (!shooter) {
    return (
      <section className="bnr-shooter is-idle" aria-label="At the table">
        <p className="bnr-shooter-kicker">At the table</p>
        <p className="bnr-shooter-name">No active buy ins</p>
        <p className="bnr-shooter-hint">Add a player or take a rebuy to open the table.</p>
        <div className="bnr-shooter-actions">
          <button type="button" className="bnr-op-btn is-go" onClick={onAddPlayer}>Add player</button>
        </div>
      </section>
    );
  }

  const player = tournament.players.find((p) => String(p.id) === shooter.id);
  const day = playerDayStatus(tournament, shooter.id, systemTurnDate());
  const fee = playerFee(tournament, player);
  const needsRebuy = day.needsRebuyPay && fee > 0;
  const started = calledMode && isAttemptStarted(tournament, shooter.id);
  const payable = previewTurn(tournament, shooter.id, { outcome: 'bust' }).payablePot;
  const upNext = lineup.eligible.filter((p) => p.id !== shooter.id);
  const lockedByOther = Boolean(tournament.attemptLock) && !started;

  return (
    <section className={`bnr-shooter${started ? ' is-shooting' : ''}`} aria-label="At the table">
      <p className="bnr-shooter-kicker">{chosen ? 'At the table' : 'Next up'}</p>
      <p className="bnr-shooter-name">{shooter.name}</p>
      <p className="bnr-shooter-sub">
        {shooter.isRebuy ? `Rebuy · try #${shooter.attempt}` : 'First try'}
      </p>

      {started ? (
        <>
          <p className="bnr-shooter-status is-live">Shooting · playing for {formatMoney(payable)}</p>
          <BreakAndRunTallyPanel
            key={tournament.attemptLock?.startedAt}
            tournament={tournament}
            playerId={shooter.id}
            playerName={shooter.name}
            live={attemptLiveView(tournament)}
            onAdjust={onAdjustTally}
            onSave={onSaveTurn}
          />
        </>
      ) : needsRebuy ? (
        <p className="bnr-shooter-status">Take the {formatMoney(fee)} rebuy before they break.</p>
      ) : calledMode ? (
        <p className="bnr-shooter-status">
          Tap Start attempt as they break — locks {formatMoney(payable)} for this try.
        </p>
      ) : null}

      <div className="bnr-shooter-actions">
        {needsRebuy ? (
          <button type="button" className="bnr-op-btn is-go" onClick={() => onPayRebuy(shooter.id)}>
            Take rebuy {formatMoney(fee)}
          </button>
        ) : null}
        {calledMode && !started && !needsRebuy ? (
          <button type="button" className="bnr-op-btn is-go" onClick={() => onStartAttempt(shooter.id)}>
            Start attempt · lock pot
          </button>
        ) : null}
        {started ? (
          <>
            <button type="button" className="bnr-op-btn is-quiet" onClick={() => onRecord(player)}>
              Use full form
            </button>
            <button type="button" className="bnr-op-btn is-quiet" onClick={onCancelAttempt}>
              Cancel start
            </button>
          </>
        ) : (
          <button
            type="button"
            className={`bnr-op-btn${calledMode ? '' : ' is-go'}`}
            onClick={() => onRecord(player)}
          >
            Record turn
          </button>
        )}
      </div>

      {upNext.length ? (
        <div className="bnr-shooter-next">
          <p className="bnr-shooter-next-label">
            Up next{started ? '' : ' · tap to put at the table'}
          </p>
          <ol>
            {upNext.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onPick(p.id)}
                  disabled={started || lockedByOther}
                  title={started ? 'Finish or cancel the current attempt first' : `Put ${p.name} at the table`}
                >
                  {p.name}
                  {p.isRebuy ? <small>rebuy</small> : null}
                </button>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </section>
  );
}

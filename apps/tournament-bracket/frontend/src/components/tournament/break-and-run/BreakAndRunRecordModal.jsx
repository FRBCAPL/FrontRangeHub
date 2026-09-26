import React, { useEffect, useState } from 'react';
import { formatMoney, previewTurn, sessionPlayerIdList } from './breakAndRunEngine.js';
import { canTakeTurn, playerDayStatus, systemTurnDate } from './breakAndRunTurns.js';
import './BreakAndRun.css';

export default function BreakAndRunRecordModal({
  tournament,
  playerId: initialPlayerId,
  onSubmit,
  onCancel,
  onAtTableChange,
}) {
  const today = systemTurnDate();
  const [playerId, setPlayerId] = useState(initialPlayerId || tournament?.players?.[0]?.id || '');
  const [outcome, setOutcome] = useState('cash-out');
  const [payableBalls, setPayableBalls] = useState('0');
  const [earlyTen, setEarlyTen] = useState(false);
  const [bustBalls, setBustBalls] = useState('0');

  useEffect(() => {
    const enrolled = sessionPlayerIdList(tournament).map(String);
    const preferred = initialPlayerId && enrolled.includes(String(initialPlayerId))
      ? String(initialPlayerId)
      : (enrolled[0] || tournament?.players?.[0]?.id || '');
    setPlayerId(preferred);
    setOutcome('cash-out');
    setPayableBalls('0');
    setEarlyTen(false);
    setBustBalls('0');
  }, [tournament?.id, tournament?.sessionPlayerIds, initialPlayerId]);

  if (!tournament) return null;

  const enrolledIds = new Set(sessionPlayerIdList(tournament));
  const sessionPlayers = (tournament.players || []).filter((p) => enrolledIds.has(String(p.id)));
  const selectable = sessionPlayers.length ? sessionPlayers : (tournament.players || []);

  const scratchOnBreak = outcome === 'scratch-break';
  const busted = outcome === 'bust';
  const balls = scratchOnBreak
    ? 0
    : busted
      ? Math.max(0, Math.min(tournament.ballCount, Math.round(Number(bustBalls) || 0)))
      : Math.max(0, Math.min(tournament.ballCount, Math.round(Number(payableBalls) || 0)));
  const calledTen = scratchOnBreak || busted ? false : earlyTen;
  const preview = previewTurn(tournament, playerId, {
    payableBalls: balls,
    earlyTen: calledTen,
    outcome,
  });
  const gate = canTakeTurn(tournament, playerId);
  const day = playerDayStatus(tournament, playerId, today);

  const handleOutcome = (next) => {
    setOutcome(next);
    if (next === 'scratch-break') setEarlyTen(false);
    if (next === 'bust') setEarlyTen(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!playerId) {
      alert('Pick a player.');
      return;
    }
    if (!gate.ok) {
      alert(gate.reason);
      return;
    }
    if (outcome === 'cash-out' && balls < 1 && !calledTen) {
      alert('Cash out needs at least one payable ball (or a called early 10). Use Bust or Scratch on the break for $0.');
      return;
    }
    onSubmit(playerId, {
      payableBalls: balls,
      earlyTen: calledTen,
      outcome,
      scratchOnBreak,
      busted,
    });
  };

  let previewLine = 'No payout';
  if (scratchOnBreak) previewLine = 'Scratch on the break · $0';
  else if (busted) {
    previewLine = balls > 0
      ? `Bust · ${balls} ball${balls === 1 ? '' : 's'} at risk forfeited · $0`
      : 'Bust · $0';
  } else if (preview.payout > 0) {
    previewLine = `Cash out · pays ${formatMoney(preview.payout)}`;
  }

  return (
    <div className="cc-modal-overlay" onClick={onCancel} role="dialog" aria-modal="true" aria-labelledby="bnr-run-title">
      <form
        className="cc-modal cc-edit-modal bnr-record-modal"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <header className="bnr-record-head">
          <h3 id="bnr-run-title">{gate.isRebuyTurn ? 'Record rebuy try' : 'Record turn'}</h3>
          <p className="cc-modal-meta">
            {today} · {formatMoney(preview.perBall)} per ball
            {preview.reserve > 0 ? ` · reserve ${formatMoney(preview.reserve)}` : ''}
            {preview.rebuyFee ? ` · rebuy ${formatMoney(preview.rebuyFee)} already in pot` : ''}
            {' · press your luck: cash out or continue'}
          </p>
        </header>

        <div className="bnr-record-body">
          <label>
            Player
            <select
              value={playerId}
              onChange={(e) => {
                const id = e.target.value;
                setPlayerId(id);
                onAtTableChange?.(id);
              }}
            >
              {selectable.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
        {gate.isRebuyTurn ? (
          <p className="cc-modal-meta">
            Rebuy is paid. Recording this attempt for {today} (today’s date).
          </p>
        ) : null}
          {day.first && !gate.ok ? (
            <p className="cc-modal-meta">{day.reason}</p>
          ) : null}

          <fieldset className="bnr-outcome-fieldset">
            <legend>How did the run end?</legend>

            <div className={`bnr-outcome-card${outcome === 'cash-out' ? ' is-selected' : ''}`}>
              <label className="cc-winner-pick bnr-outcome-pick">
                <input
                  type="radio"
                  name="bnr-outcome"
                  checked={outcome === 'cash-out'}
                  onChange={() => handleOutcome('cash-out')}
                />
                <span>
                  <strong>Cash out</strong>
                  <span className="cc-modal-meta">Paid for payable balls earned (and early 10 if that ended the run). Ends play for this session.</span>
                </span>
              </label>
              {outcome === 'cash-out' ? (
                <div className="bnr-outcome-fields">
                  <div className="bnr-outcome-cash-row">
                    <label className="bnr-outcome-balls">
                      Payable balls
                      <input
                        type="number"
                        min="0"
                        max={tournament.ballCount}
                        step="1"
                        value={payableBalls}
                        onChange={(e) => setPayableBalls(e.target.value)}
                      />
                    </label>
                    <label className="cc-winner-pick bnr-outcome-early-ten">
                      <input
                        type="checkbox"
                        checked={calledTen}
                        onChange={(e) => setEarlyTen(e.target.checked)}
                      />
                      Called early 10 (2×)
                    </label>
                  </div>
                  <p className="cc-modal-meta">
                    Break + called balls. Do not count a called early 10 in the ball count.
                  </p>
                </div>
              ) : null}
            </div>

            <div className={`bnr-outcome-card${outcome === 'bust' ? ' is-selected' : ''}`}>
              <label className="cc-winner-pick bnr-outcome-pick">
                <input
                  type="radio"
                  name="bnr-outcome"
                  checked={outcome === 'bust'}
                  onChange={() => handleOutcome('bust')}
                />
                <span>
                  <strong>Bust — continued and missed</strong>
                  <span className="cc-modal-meta">Kept shooting after making balls, then missed/scratched/fouled. $0 even if balls were made.</span>
                </span>
              </label>
              {outcome === 'bust' ? (
                <div className="bnr-outcome-fields">
                  <label className="bnr-outcome-balls">
                    Balls at risk (optional)
                    <input
                      type="number"
                      min="0"
                      max={tournament.ballCount}
                      step="1"
                      value={bustBalls}
                      onChange={(e) => setBustBalls(e.target.value)}
                    />
                  </label>
                  <p className="cc-modal-meta">
                    History only · does not pay. Bust pays $0 so they may rebuy again.
                  </p>
                </div>
              ) : null}
            </div>

            <div className={`bnr-outcome-card${outcome === 'scratch-break' ? ' is-selected' : ''}`}>
              <label className="cc-winner-pick bnr-outcome-pick">
                <input
                  type="radio"
                  name="bnr-outcome"
                  checked={outcome === 'scratch-break'}
                  onChange={() => handleOutcome('scratch-break')}
                />
                <span>
                  <strong>Scratch on the break</strong>
                  <span className="cc-modal-meta">Attempt over immediately. $0.</span>
                </span>
              </label>
            </div>
          </fieldset>

          <p className="cc-modal-meta bnr-record-preview">
            {previewLine}
            {' · '}
            pot after {formatMoney(preview.potAfter)}
            {busted && balls > 0 ? ' · $0 · may rebuy' : ''}
          </p>
        </div>

        <div className="form-actions bnr-record-actions">
          <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={!gate.ok}>Save turn</button>
        </div>
      </form>
    </div>
  );
}

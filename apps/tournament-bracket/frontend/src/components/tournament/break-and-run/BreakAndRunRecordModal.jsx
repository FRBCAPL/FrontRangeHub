import React, { useEffect, useState } from 'react';
import { formatMoney, previewTurn } from './breakAndRunEngine.js';
import { canTakeTurn, playerDayStatus, systemTurnDate } from './breakAndRunTurns.js';

const OUTCOMES = [
  {
    id: 'cash-out',
    label: 'Cash out',
    hint: 'Paid for payable balls earned (and early 10 if that ended the run).',
  },
  {
    id: 'bust',
    label: 'Bust — continued and missed',
    hint: 'Kept shooting after making balls, then missed/scratched/fouled. $0 even if balls were made.',
  },
  {
    id: 'scratch-break',
    label: 'Scratch on the break',
    hint: 'Attempt over immediately. $0.',
  },
];

export default function BreakAndRunRecordModal({ tournament, playerId: initialPlayerId, onSubmit, onCancel }) {
  const today = systemTurnDate();
  const [playerId, setPlayerId] = useState(initialPlayerId || tournament?.players?.[0]?.id || '');
  const [outcome, setOutcome] = useState('cash-out');
  const [payableBalls, setPayableBalls] = useState('0');
  const [earlyTen, setEarlyTen] = useState(false);

  useEffect(() => {
    setPlayerId(initialPlayerId || tournament?.players?.[0]?.id || '');
    setOutcome('cash-out');
    setPayableBalls('0');
    setEarlyTen(false);
  }, [tournament?.id, initialPlayerId]);

  if (!tournament) return null;

  const scratchOnBreak = outcome === 'scratch-break';
  const busted = outcome === 'bust';
  const balls = scratchOnBreak
    ? 0
    : Math.max(0, Math.min(tournament.ballCount, Math.round(Number(payableBalls) || 0)));
  const calledTen = scratchOnBreak || busted ? false : earlyTen;
  const preview = previewTurn(tournament, playerId, {
    payableBalls: balls,
    earlyTen: calledTen,
    outcome,
  });
  const gate = canTakeTurn(tournament, playerId, today);
  const day = playerDayStatus(tournament, playerId, today);

  const handleOutcome = (next) => {
    setOutcome(next);
    if (next === 'scratch-break') {
      setPayableBalls('0');
      setEarlyTen(false);
    }
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
      <form className="cc-modal cc-edit-modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h3 id="bnr-run-title">{gate.isRebuyTurn ? 'Record rebuy turn' : 'Record turn'}</h3>
        <p className="cc-modal-meta">
          {today} · {formatMoney(preview.perBall)} per ball
          {preview.reserve > 0 ? ` · reserve ${formatMoney(preview.reserve)}` : ''}
          {preview.rebuyFee ? ` · rebuy ${formatMoney(preview.rebuyFee)} goes in first` : ''}
          {' · press your luck: cash out or continue'}
        </p>
        <label>
          Player
          <select value={playerId} onChange={(e) => setPlayerId(e.target.value)}>
            {tournament.players.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>
        {gate.isRebuyTurn ? (
          <p className="cc-modal-meta">Zero payable balls on the first attempt, so this is their one rebuy for {today}.</p>
        ) : null}
        {day.first && !gate.ok ? (
          <p className="cc-modal-meta">{day.reason}</p>
        ) : null}

        <fieldset className="bnr-outcome-fieldset">
          <legend>How did the run end?</legend>
          {OUTCOMES.map((opt) => (
            <label key={opt.id} className="cc-winner-pick">
              <input
                type="radio"
                name="bnr-outcome"
                checked={outcome === opt.id}
                onChange={() => handleOutcome(opt.id)}
              />
              <span>
                <strong>{opt.label}</strong>
                <span className="cc-modal-meta">{opt.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>

        {!scratchOnBreak ? (
          <>
            <label>
              {busted ? 'Payable balls made before the miss (history only)' : 'Payable balls (break + called)'}
              <input
                type="number"
                min="0"
                max={tournament.ballCount}
                step="1"
                value={payableBalls}
                onChange={(e) => setPayableBalls(e.target.value)}
              />
            </label>
            <p className="cc-modal-meta">
              {busted
                ? 'Optional. Does not pay — shows what was at risk when they continued and missed.'
                : 'Count balls pocketed on the break and legally called balls. Do not count a called early 10 here.'}
            </p>
          </>
        ) : null}

        {outcome === 'cash-out' ? (
          <label className="cc-winner-pick">
            <input
              type="checkbox"
              checked={calledTen}
              onChange={(e) => setEarlyTen(e.target.checked)}
            />
            Called early 10-ball ended the run (2× per ball, paid with cash-out)
          </label>
        ) : null}

        <p className="cc-modal-meta">
          {previewLine}
          {' · '}
          pot after {formatMoney(preview.potAfter)}
          {busted && balls > 0 ? ' · rebuy blocked (earned a payable ball)' : ''}
        </p>
        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={!gate.ok}>Save turn</button>
        </div>
      </form>
    </div>
  );
}

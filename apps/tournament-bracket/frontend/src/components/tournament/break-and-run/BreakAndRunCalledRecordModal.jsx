import React, { useEffect, useState } from 'react';
import { formatMoney, previewTurn, sessionPlayerIdList } from './breakAndRunEngine.js';
import { canTakeTurn, playerDayStatus, systemTurnDate } from './breakAndRunTurns.js';
import { BallsStep, BreakStep, EndStep, SummaryStep } from './BreakAndRunRecordSteps.jsx';
import './BreakAndRun.css';
import './BreakAndRunWizard.css';

const EMPTY_COUNTS = { breakBalls: 0, calledBalls: 0, extraBalls: 0 };
const STEP_LABELS = [
  ['break', 'Break'],
  ['end', 'Result'],
  ['balls', 'Balls'],
  ['summary', 'Save'],
];

const needsBalls = (outcome) => outcome === 'cash-out' || outcome === 'early-ten';

export default function BreakAndRunCalledRecordModal({
  tournament,
  playerId: initialPlayerId,
  onSubmit,
  onCancel,
  onAtTableChange,
}) {
  const today = systemTurnDate();
  const [playerId, setPlayerId] = useState(initialPlayerId || tournament?.players?.[0]?.id || '');
  const [step, setStep] = useState('break');
  const [breakResult, setBreakResult] = useState('');
  const [outcome, setOutcome] = useState('');
  const [counts, setCounts] = useState(EMPTY_COUNTS);

  useEffect(() => {
    const enrolled = sessionPlayerIdList(tournament).map(String);
    const preferred = initialPlayerId && enrolled.includes(String(initialPlayerId))
      ? String(initialPlayerId)
      : (enrolled[0] || tournament?.players?.[0]?.id || '');
    setPlayerId(preferred);
    setStep('break');
    setBreakResult('');
    setOutcome('');
    setCounts(EMPTY_COUNTS);
  }, [tournament?.id, tournament?.sessionPlayerIds, initialPlayerId]);

  if (!tournament) return null;

  const enrolledIds = new Set(sessionPlayerIdList(tournament));
  const sessionPlayers = (tournament.players || []).filter((p) => enrolledIds.has(String(p.id)));
  const selectable = sessionPlayers.length ? sessionPlayers : (tournament.players || []);
  const player = selectable.find((p) => String(p.id) === String(playerId));

  const scratch = breakResult === 'scratch';
  const finalOutcome = scratch ? 'scratch-break' : (outcome || 'cash-out');
  const details = scratch
    ? { outcome: finalOutcome, ...EMPTY_COUNTS }
    : {
      outcome: finalOutcome,
      breakBalls: counts.breakBalls,
      calledBalls: needsBalls(finalOutcome) ? counts.calledBalls : 0,
      extraBalls: needsBalls(finalOutcome) ? counts.extraBalls : 0,
    };
  const preview = previewTurn(tournament, playerId, details);
  const gate = canTakeTurn(tournament, playerId);
  const day = playerDayStatus(tournament, playerId, today);

  const cashOutEmpty = finalOutcome === 'cash-out' && preview.bank <= 0;
  const lockOwnerId = tournament.attemptLock?.playerId;
  const lockOwner = lockOwnerId && String(lockOwnerId) !== String(playerId)
    ? (tournament.players || []).find((p) => String(p.id) === String(lockOwnerId))
    : null;
  const notStartedWarning = preview.attemptStarted
    ? ''
    : `No attempt was started for ${player?.name || 'this player'} — payout uses the pot as it is now.${
      lockOwner ? ` Saving also ends ${lockOwner.name}'s started attempt.` : ''}`;
  const canAdvance = {
    break: Boolean(breakResult),
    end: Boolean(outcome),
    balls: !preview.error && !cashOutEmpty,
    summary: gate.ok && !preview.error && !cashOutEmpty,
  }[step];

  const goNext = () => {
    if (step === 'break') setStep(scratch ? 'summary' : 'end');
    else if (step === 'end') setStep(needsBalls(outcome) ? 'balls' : 'summary');
    else if (step === 'balls') setStep('summary');
  };

  const goBack = () => {
    if (step === 'end') setStep('break');
    else if (step === 'balls') setStep('end');
    else if (step === 'summary') {
      if (scratch) setStep('break');
      else setStep(needsBalls(outcome) ? 'balls' : 'end');
    }
  };

  const handleBreakResult = (value) => {
    setBreakResult(value);
    if (value === 'scratch') {
      setCounts(EMPTY_COUNTS);
      setStep('summary');
    }
  };

  const handleOutcome = (value) => {
    setOutcome(value);
    setStep(needsBalls(value) ? 'balls' : 'summary');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (step !== 'summary') {
      if (canAdvance) goNext();
      return;
    }
    if (!playerId) return alert('Pick a player.');
    if (!gate.ok) return alert(gate.reason);
    if (preview.error) return alert(preview.error);
    if (cashOutEmpty) return alert('A $0 bank cannot cash out. Go back and record the balls, or choose Missed or fouled.');
    if (notStartedWarning && !window.confirm(`${notStartedWarning}\n\nSave this turn anyway?`)) return undefined;
    return onSubmit(playerId, details);
  };

  const skipped = (key) => key === 'balls' && (scratch || (outcome && !needsBalls(outcome)))
    || (key === 'end' && scratch);

  return (
    <div className="cc-modal-overlay" onClick={onCancel} role="dialog" aria-modal="true" aria-labelledby="bnr-run-title">
      <form
        className="cc-modal cc-edit-modal bnr-record-modal bnr-wizard"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <header className="bnr-record-head">
          <h3 id="bnr-run-title">{gate.isRebuyTurn ? 'Record rebuy try' : 'Record turn'}</h3>
          <label className="bnr-wizard-player">
            <span className="bnr-rules-sr-only">Player</span>
            <select
              value={playerId}
              onChange={(e) => {
                setPlayerId(e.target.value);
                onAtTableChange?.(e.target.value);
              }}
            >
              {selectable.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
          <p className="cc-modal-meta">
            Called {formatMoney(preview.normalBall)} · lucky {formatMoney(preview.luckyBall)}
            {` · payable ${formatMoney(preview.payablePot)}`}
            {preview.rebuyFee ? ` · rebuy ${formatMoney(preview.rebuyFee)} in pot` : ''}
          </p>
          {!gate.ok ? <p className="cc-modal-meta bnr-record-error">{day.reason || gate.reason}</p> : null}
          {gate.ok && notStartedWarning ? (
            <p className="cc-modal-meta bnr-record-warning">{notStartedWarning}</p>
          ) : null}
          <ol className="bnr-wizard-steps" aria-label="Steps">
            {STEP_LABELS.map(([key, label]) => (
              <li
                key={key}
                className={[
                  key === step ? 'is-current' : '',
                  skipped(key) ? 'is-skipped' : '',
                ].filter(Boolean).join(' ')}
              >
                {label}
              </li>
            ))}
          </ol>
        </header>

        <div className="bnr-record-body">
          {step === 'break' ? (
            <BreakStep
              breakResult={breakResult}
              breakBalls={counts.breakBalls}
              luckyBall={preview.luckyBall}
              onBreakResult={handleBreakResult}
              onBreakBalls={(value) => setCounts((prev) => ({ ...prev, breakBalls: value }))}
            />
          ) : null}
          {step === 'end' ? <EndStep outcome={outcome} preview={preview} onOutcome={handleOutcome} /> : null}
          {step === 'balls' ? (
            <BallsStep
              counts={counts}
              preview={preview}
              onCount={(key, value) => setCounts((prev) => ({ ...prev, [key]: value }))}
            />
          ) : null}
          {step === 'summary' ? (
            <SummaryStep outcome={finalOutcome} counts={details} preview={preview} playerName={player?.name} />
          ) : null}
          {preview.error ? <p className="cc-modal-meta bnr-record-error">{preview.error}</p> : null}
          {step !== 'summary' && cashOutEmpty && step === 'balls' ? (
            <p className="cc-modal-meta bnr-record-error">Cash out needs at least one ball in the bank.</p>
          ) : null}
        </div>

        <div className="form-actions bnr-record-actions">
          {step === 'break' ? (
            <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
          ) : (
            <button type="button" className="btn-secondary" onClick={goBack}>Back</button>
          )}
          {step === 'summary' ? (
            <button type="submit" className="btn-primary" disabled={!canAdvance}>Save turn</button>
          ) : (
            <button type="submit" className="btn-primary" disabled={!canAdvance}>Next</button>
          )}
        </div>
      </form>
    </div>
  );
}

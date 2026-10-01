import React, { useState } from 'react';
import { formatMoney, previewTurn } from './breakAndRunEngine.js';
import { SummaryStep } from './BreakAndRunRecordSteps.jsx';
import './BreakAndRunWizard.css';
import './BreakAndRunTally.css';

const ROWS = [
  { key: 'breakBalls', label: 'On the break', valueKey: 'luckyBall' },
  { key: 'calledBalls', label: 'Called', valueKey: 'normalBall' },
  { key: 'extraBalls', label: 'Extra (slop)', valueKey: 'luckyBall' },
];

const EMPTY = { breakBalls: 0, calledBalls: 0, extraBalls: 0 };

function detailsFor(outcome, live) {
  if (outcome === 'scratch-break') return { outcome, ...EMPTY };
  return {
    outcome,
    breakBalls: live.breakBalls,
    calledBalls: live.calledBalls,
    extraBalls: live.extraBalls,
  };
}

/**
 * Live scoring for the started attempt: count balls as they drop, then tap how it
 * ended and save — no modal needed. Values are locked at Start attempt.
 */
export default function BreakAndRunTallyPanel({ tournament, playerId, playerName, live, onAdjust, onSave }) {
  const [pending, setPending] = useState('');
  if (!live) return null;

  const full = live.totalBalls >= 9;
  const previewFor = (outcome) => previewTurn(tournament, playerId, detailsFor(outcome, live));
  const endings = [
    { outcome: 'cash-out', label: 'Cash out', tone: 'good', disabled: live.bank <= 0 },
    { outcome: 'bust', label: 'Missed / fouled', tone: 'bad' },
    { outcome: 'early-ten', label: 'Early 10', tone: 'good' },
    { outcome: 'final-ten', label: 'Final 10', tone: 'gold' },
    { outcome: 'scratch-break', label: 'Scratch on break', tone: 'bad' },
  ];

  if (pending) {
    const preview = previewFor(pending);
    const details = detailsFor(pending, live);
    return (
      <div className="bnr-tally is-confirm" aria-label="Confirm turn">
        <SummaryStep outcome={pending} counts={details} preview={preview} playerName={playerName} />
        {preview.error ? <p className="cc-modal-meta bnr-record-error">{preview.error}</p> : null}
        {pending === 'early-ten' && live.bank <= 0 ? (
          <p className="cc-modal-meta bnr-record-warning">
            No balls tracked before the 10 — check this is right before saving.
          </p>
        ) : null}
        <div className="bnr-tally-confirm-actions">
          <button type="button" className="bnr-op-btn is-quiet" onClick={() => setPending('')}>
            Back
          </button>
          <button
            type="button"
            className="bnr-op-btn is-go"
            disabled={Boolean(preview.error)}
            onClick={() => {
              setPending('');
              onSave(playerId, details);
            }}
          >
            Save turn
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bnr-tally" aria-label="Live scoring">
      <div className="bnr-tally-locked">
        <span>Locked · called {formatMoney(live.normalBall)} · lucky {formatMoney(live.luckyBall)}</span>
        <strong>Bank {formatMoney(live.bank)}</strong>
      </div>
      <ul className="bnr-tally-rows">
        {ROWS.map((row) => (
          <li key={row.key}>
            <span className="bnr-tally-label">
              {row.label}
              <small>{formatMoney(live[row.valueKey])} each</small>
            </span>
            <button
              type="button"
              className="bnr-tally-step"
              onClick={() => onAdjust(row.key, -1)}
              disabled={!live[row.key]}
              aria-label={`Remove one ${row.label} ball`}
            >
              −
            </button>
            <strong className="bnr-tally-count">{live[row.key]}</strong>
            <button
              type="button"
              className="bnr-tally-step is-add"
              onClick={() => onAdjust(row.key, 1)}
              disabled={full}
              aria-label={`Add one ${row.label} ball`}
            >
              +
            </button>
          </li>
        ))}
      </ul>

      <p className="bnr-tally-end-label">How did it end?</p>
      <div className="bnr-tally-endings">
        {endings.map((end) => {
          const pays = previewFor(end.outcome).payout;
          return (
            <button
              key={end.outcome}
              type="button"
              className={`bnr-tally-end is-${end.tone}`}
              disabled={end.disabled}
              onClick={() => setPending(end.outcome)}
            >
              {end.label}
              <small>{pays > 0 ? formatMoney(pays) : '$0'}</small>
            </button>
          );
        })}
      </div>
    </div>
  );
}

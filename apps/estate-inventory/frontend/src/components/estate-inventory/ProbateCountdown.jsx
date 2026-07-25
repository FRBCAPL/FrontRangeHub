import React, { useEffect, useState } from 'react';
import { PROBATE_WINDOW_DAYS } from '@shared/utils/estateInventoryConstants.js';

function getRemaining(lettersIssuedAt) {
  if (!lettersIssuedAt) return null;
  const start = new Date(`${lettersIssuedAt}T00:00:00`);
  if (Number.isNaN(start.getTime())) return null;
  const end = new Date(start.getTime() + PROBATE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const ms = end.getTime() - Date.now();
  return { end, ms };
}

function pad(n) {
  return String(Math.max(0, n)).padStart(2, '0');
}

const ProbateCountdown = ({ lettersIssuedAt, caseNumber, onOpenSettings, readOnly = false }) => {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = getRemaining(lettersIssuedAt);
  void tick;

  let body;
  if (!lettersIssuedAt) {
    body = (
      <p className="ei-countdown-missing">
        {readOnly
          ? `Letters issued date not set yet — ${PROBATE_WINDOW_DAYS}-day countdown will appear when the Personal Representative sets it.`
          : `Set the Letters issued date to start the ${PROBATE_WINDOW_DAYS}-day countdown.`}
      </p>
    );
  } else if (!remaining) {
    body = <p className="ei-countdown-missing">Invalid Letters date.</p>;
  } else if (remaining.ms <= 0) {
    body = <p className="ei-countdown-expired">90-day window has ended.</p>;
  } else {
    const totalSec = Math.floor(remaining.ms / 1000);
    const days = Math.floor(totalSec / 86400);
    const hours = Math.floor((totalSec % 86400) / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    body = (
      <div className="ei-countdown-digits" aria-live="polite">
        <span>
          <strong>{pad(days)}</strong>
          <em>Days</em>
        </span>
        <span>
          <strong>{pad(hours)}</strong>
          <em>Hours</em>
        </span>
        <span>
          <strong>{pad(minutes)}</strong>
          <em>Min</em>
        </span>
        <span>
          <strong>{pad(seconds)}</strong>
          <em>Sec</em>
        </span>
      </div>
    );
  }

  return (
    <section className="ei-countdown" aria-label="Probate countdown">
      <div className="ei-countdown-top">
        <div>
          <p className="ei-eyebrow">Case {caseNumber || '—'}</p>
          <h2 className="ei-countdown-title">{PROBATE_WINDOW_DAYS}-day probate window</h2>
        </div>
        {!readOnly && onOpenSettings ? (
          <button type="button" className="ei-btn ei-btn-secondary ei-btn-small" onClick={onOpenSettings}>
            Settings
          </button>
        ) : null}
      </div>
      {body}
    </section>
  );
};

export default ProbateCountdown;

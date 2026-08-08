import React, { useEffect, useState } from 'react';
import {
  resolveProbateWindow,
  estateCalendarDaysRemaining
} from '@shared/utils/estateInventoryConstants.js';
import EstateRoleGuide from './EstateRoleGuide';
import GlossaryTerm from './GlossaryTerm';

function getRemainingMs(endDate) {
  if (!endDate) return null;
  // End of the selected calendar day (local)
  const end = new Date(
    endDate.getFullYear(),
    endDate.getMonth(),
    endDate.getDate(),
    23,
    59,
    59,
    999
  );
  return end.getTime() - Date.now();
}

function pad(n) {
  return String(Math.max(0, n)).padStart(2, '0');
}

function formatEndsOnDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function formatEndsOnShort(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

const ProbateCountdown = ({
  lettersIssuedAt,
  caseNumber,
  probateWindowMode,
  probateWindowAmount,
  probateWindowUnit,
  probateWindowEndDate,
  onOpenSettings,
  readOnly = false,
  roleGuide = null,
  variant = 'full'
}) => {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), variant === 'compact' ? 60000 : 1000);
    return () => clearInterval(id);
  }, [variant]);

  const windowInfo = resolveProbateWindow({
    letters_issued_at: lettersIssuedAt,
    probate_window_mode: probateWindowMode,
    probate_window_amount: probateWindowAmount,
    probate_window_unit: probateWindowUnit,
    probate_window_end_date: probateWindowEndDate
  });
  void tick;

  const remainingMs = getRemainingMs(windowInfo.end);
  const isCompact = variant === 'compact';

  if (isCompact) {
    let statusText = 'Probate window not set';
    let tone = 'probate';
    if (windowInfo.needsLetters) {
      statusText = 'Set Letters issued date';
      tone = 'setup';
    } else if (windowInfo.needsEndDate) {
      statusText = 'Set probate end date';
      tone = 'setup';
    } else if (!windowInfo.end || remainingMs == null) {
      statusText = 'Invalid probate window';
      tone = 'setup';
    } else if (remainingMs <= 0) {
      statusText = 'Probate window ended';
      tone = 'warn';
    } else {
      const days = estateCalendarDaysRemaining(windowInfo.end) ?? 0;
      const endsOn = formatEndsOnShort(windowInfo.end);
      if (days === 0) {
        statusText = endsOn ? `Ends today · ${endsOn}` : 'Ends today';
      } else {
        statusText = endsOn
          ? `${days} day${days === 1 ? '' : 's'} left · ends ${endsOn}`
          : `${days} day${days === 1 ? '' : 's'} left`;
      }
      tone = 'probate';
    }

    return (
      <section className={`ei-status-chip ei-status-chip--${tone}`} aria-label="Probate status">
        <div className="ei-status-chip-body">
          <span className="ei-status-chip-label">
            {windowInfo.label || 'Probate window'}
            <GlossaryTerm termKey="probate_window" iconOnly />
          </span>
          <strong className="ei-status-chip-value">{statusText}</strong>
          {caseNumber ? <span className="ei-status-chip-meta">Case {caseNumber}</span> : null}
        </div>
        {!readOnly && onOpenSettings ? (
          <button
            type="button"
            className="ei-btn ei-btn-secondary ei-btn-small"
            onClick={onOpenSettings}
          >
            Settings
          </button>
        ) : null}
      </section>
    );
  }

  let body;
  if (windowInfo.needsEndDate) {
    body = (
      <p className="ei-countdown-missing">
        {readOnly
          ? 'Probate end date not set yet — countdown will appear when the Personal Representative sets it.'
          : 'Set a probate end date in Settings to start the countdown.'}
      </p>
    );
  } else if (windowInfo.needsLetters) {
    body = (
      <p className="ei-countdown-missing">
        {readOnly
          ? `Letters issued date not set yet — ${windowInfo.label} will appear when the Personal Representative sets it.`
          : `Set the Letters issued date to start the ${windowInfo.label}.`}
      </p>
    );
  } else if (!windowInfo.end || remainingMs == null) {
    body = <p className="ei-countdown-missing">Invalid probate window.</p>;
  } else if (remainingMs <= 0) {
    body = <p className="ei-countdown-expired">Probate window has ended.</p>;
  } else {
    const totalSec = Math.floor(remainingMs / 1000);
    // Day digit matches header/timeline; hours/min/sec keep live EOD countdown.
    const days = estateCalendarDaysRemaining(windowInfo.end) ?? Math.floor(totalSec / 86400);
    const hours = Math.floor((totalSec % 86400) / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    const endsOn = formatEndsOnDate(windowInfo.end);
    body = (
      <>
        {endsOn ? <p className="ei-countdown-ends-on">Ends on {endsOn}</p> : null}
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
      </>
    );
  }

  return (
    <section className="ei-countdown" aria-label="Probate countdown">
      <div className="ei-countdown-top">
        <div>
          <p className="ei-eyebrow">Case {caseNumber || '—'}</p>
          <h2 className="ei-countdown-title">
            {windowInfo.label}
            <GlossaryTerm termKey="probate_window" iconOnly />
          </h2>
        </div>
        {!readOnly && onOpenSettings ? (
          <button
            type="button"
            className="ei-btn ei-btn-secondary ei-btn-small ei-countdown-settings"
            onClick={onOpenSettings}
          >
            Settings
          </button>
        ) : null}
      </div>
      {body}
      {roleGuide ? <EstateRoleGuide guide={roleGuide} /> : null}
    </section>
  );
};

export default ProbateCountdown;

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { hasPaymentInfo } from '../../utils/duezyLeaguePrefs.js';

const dismissKey = (leagueId) => `duezy-checklist-dismissed:${leagueId}`;

function readDismissed(key) {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

/**
 * One-line setup tip for the owner: shown only while the league has teams but no payment
 * instructions or tap-to-pay handles, so the reminder texts they copy can say where to send money.
 */
export default function DuezyGettingStarted({ league, teamCount, settingsTo }) {
  const key = dismissKey(league.id);
  const [hidden, setHidden] = useState(() => readDismissed(key));

  if (hidden || !settingsTo || teamCount === 0 || hasPaymentInfo(league)) return null;

  const dismiss = () => {
    try { localStorage.setItem(key, '1'); } catch { /* hidden for this visit */ }
    setHidden(true);
  };

  return (
    <p className="dz-tip dz-tip--quiet">
      <span className="dz-tip-text">
        Reminder tip: add Venmo or Cash App so texts tell teams where to pay.{' '}
        <Link to={`${settingsTo}?tab=league&section=payments`} className="dz-link dz-tip-cta">Add it&nbsp;›</Link>
      </span>
      <button type="button" className="dz-tip-close" onClick={dismiss} aria-label="Hide this tip">×</button>
    </p>
  );
}

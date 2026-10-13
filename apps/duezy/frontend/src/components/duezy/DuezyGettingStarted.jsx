import React, { useState } from 'react';
import { Link } from 'react-router-dom';

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
 * instructions, so the reminder texts they copy can say where to send money.
 */
export default function DuezyGettingStarted({ league, teamCount, settingsTo }) {
  const key = dismissKey(league.id);
  const [hidden, setHidden] = useState(() => readDismissed(key));

  if (hidden || !settingsTo || teamCount === 0 || league.payment_note) return null;

  const dismiss = () => {
    try { localStorage.setItem(key, '1'); } catch { /* hidden for this visit */ }
    setHidden(true);
  };

  return (
    <p className="dz-tip">
      <span aria-hidden="true">💡</span>
      <span className="dz-tip-text">
        <strong>Where should teams send dues?</strong>{' '}
        Add your Venmo or Cash App and it’s included in reminder texts.{' '}
        <Link to={settingsTo} className="dz-link">Add it ›</Link>
      </span>
      <button type="button" className="dz-tip-close" onClick={dismiss} aria-label="Hide this tip">×</button>
    </p>
  );
}

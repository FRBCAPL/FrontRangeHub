import React, { useState } from 'react';
import { defaultMethod, leagueMethods } from '../../utils/duezyLeaguePrefs.js';

/** Keyed by the league default too, so when the owner changes the default every device picks it up. */
const storageKey = (league) => `duezy-quick-method:${league.id}:${defaultMethod(league)}`;

function readSaved(league) {
  try {
    const saved = localStorage.getItem(storageKey(league));
    return leagueMethods(league).includes(saved) ? saved : defaultMethod(league);
  } catch {
    return defaultMethod(league);
  }
}

/** Method the one-tap "Paid" button records: the league default, unless changed on this device. */
export function useQuickMethod(league) {
  const [method, setMethod] = useState(() => readSaved(league));
  const choose = (next) => {
    setMethod(next);
    try {
      localStorage.setItem(storageKey(league), next);
    } catch {
      /* private mode — keep it for this visit only */
    }
  };
  return [leagueMethods(league).includes(method) ? method : defaultMethod(league), choose];
}

export default function DuezyQuickMethod({ league, value, onChange }) {
  return (
    <label className="dz-quick-method">
      <span className="dz-small dz-muted">“Paid” records full dues by</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label="Payment method for one-tap Paid">
        {leagueMethods(league).map((m) => <option key={m} value={m}>{m}</option>)}
      </select>
    </label>
  );
}

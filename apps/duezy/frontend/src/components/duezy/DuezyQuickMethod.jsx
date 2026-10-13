import React, { useState } from 'react';
import { METHODS } from '../../data/duezyOptions.js';

const storageKey = (leagueId) => `duezy-quick-method:${leagueId}`;

function readSaved(leagueId) {
  try {
    const saved = localStorage.getItem(storageKey(leagueId));
    return METHODS.includes(saved) ? saved : METHODS[0];
  } catch {
    return METHODS[0];
  }
}

/** Method the one-tap "Paid" button records, remembered per league on this device. */
export function useQuickMethod(leagueId) {
  const [method, setMethod] = useState(() => readSaved(leagueId));
  const choose = (next) => {
    setMethod(next);
    try {
      localStorage.setItem(storageKey(leagueId), next);
    } catch {
      /* private mode — keep it for this visit only */
    }
  };
  return [method, choose];
}

export default function DuezyQuickMethod({ value, onChange }) {
  return (
    <label className="dz-quick-method">
      <span className="dz-small dz-muted">“Paid” records full dues by</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label="Payment method for one-tap Paid">
        {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
      </select>
    </label>
  );
}

import React, { useState } from 'react';

const dismissKey = (leagueId, unitId) => `duezy-catchup-dismissed:${leagueId}:${unitId || 'single'}`;

function isDismissed(key) {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

/**
 * Started tracking mid-season? If no payments exist before the current week, offer to mark those
 * earlier weeks paid so every team doesn't show as late on day one.
 */
export default function DuezyCatchUp({ leagueId, stats, paymentIndex, onMarkPaid }) {
  const { unit, teams, dues, schedule } = stats;
  const key = dismissKey(leagueId, unit.id);
  const [hidden, setHidden] = useState(() => isDismissed(key));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const through = Math.min(schedule.lateThrough, schedule.currentWeek - 1);

  const hasEarlierRows = teams.some((t) => {
    for (let w = 1; w <= through; w += 1) if (paymentIndex.has(`${t.id}:${w}`)) return true;
    return false;
  });
  if (hidden || through < 1 || !teams.length || hasEarlierRows) return null;

  const span = through === 1 ? schedule.label(1) : `${schedule.label(1)} – ${schedule.label(through)}`;

  const dismiss = () => {
    try { localStorage.setItem(key, '1'); } catch { /* keep it hidden for this visit */ }
    setHidden(true);
  };

  const mark = async () => {
    setBusy(true);
    setError('');
    try {
      await onMarkPaid(teams.map((t) => t.id), through, dues);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <section className="dz-panel dz-catchup">
      <strong>Starting partway through the season?</strong>
      <p className="dz-small dz-muted">
        Nothing is recorded for {span}, so every team shows as late. If those weeks were already collected,
        mark them paid in one tap — you can still change any team afterwards.
      </p>
      {error ? <p className="dz-error">{error}</p> : null}
      <div className="dz-row dz-row--start">
        <button type="button" className="dz-btn dz-btn--primary dz-btn--sm" onClick={mark} disabled={busy}>
          {busy ? 'Saving…' : `Mark ${through === 1 ? 'that week' : `all ${through} weeks`} paid`}
        </button>
        <button type="button" className="dz-btn dz-btn--ghost dz-btn--sm" onClick={dismiss} disabled={busy}>No, they really are unpaid</button>
      </div>
    </section>
  );
}

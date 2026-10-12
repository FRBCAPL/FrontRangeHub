import React, { useState } from 'react';
import { matchesPerNight, money, weeklyDues } from '../../utils/duezyMath.js';
import { divisionReady, divisionToSave } from '../../utils/duezyDivisions.js';
import { shortDate } from '../../utils/duezySchedule.js';
import DuezyDivisionCard from './DuezyDivisionCard.jsx';

/** A saved division in Settings: collapsed summary, expands to edit. */
export default function DuezyDivisionEditRow({ division, index, sport, teamCount, canArchive, defaultGrace = 0, onSave }) {
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async (changes) => {
    setBusy(true);
    setError('');
    try {
      await onSave(changes);
      setForm(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const archive = () => {
    if (teamCount) return;
    if (window.confirm(`Archive ${division.name}? Nothing is deleted.`)) run({ archived: true });
  };

  if (!form) {
    return (
      <li className="dz-div-summary">
        <span>
          <strong>{division.name}</strong>
          <small className="dz-muted">
            {[
              division.play_day && `${division.play_day}s`,
              `${money(weeklyDues(division))}/team weekly`,
              matchesPerNight(division) > 1 && 'double play',
              `${division.total_weeks} weeks`,
              division.start_date && `starts ${shortDate(division.start_date)}`,
              `${teamCount} teams`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </small>
        </span>
        <span className="dz-div-actions">
          {!division.start_date ? (
            <button type="button" className="dz-btn dz-btn--primary dz-btn--sm" onClick={() => setForm({ ...division })}>Add dates</button>
          ) : null}
          <button type="button" className="dz-btn dz-btn--ghost dz-btn--sm" onClick={() => setForm({ ...division })}>Edit</button>
        </span>
      </li>
    );
  }

  const totalWeeks = Number(form.total_weeks) || 12;

  return (
    <li>
      <DuezyDivisionCard draft={form} sport={sport} index={index} defaultGrace={defaultGrace} onChange={(c) => setForm((p) => ({ ...p, ...c }))}>
        <p className="dz-small dz-muted">Changing dues updates what every team in this division owes, including past weeks.</p>
        {error ? <p className="dz-error">{error}</p> : null}
        <div className="dz-row">
          {canArchive ? (
            <button
              type="button"
              className="dz-link dz-link--danger dz-small"
              onClick={archive}
              disabled={busy || teamCount > 0}
              title={teamCount ? 'Move or remove its teams first' : undefined}
            >
              {teamCount ? `Move its ${teamCount} teams out to archive` : 'Archive division'}
            </button>
          ) : <span />}
          <span className="dz-row">
            <button type="button" className="dz-btn dz-btn--ghost dz-btn--sm" onClick={() => setForm(null)} disabled={busy}>Cancel</button>
            <button
              type="button"
              className="dz-btn dz-btn--primary dz-btn--sm"
              disabled={busy || !divisionReady(form)}
              onClick={() => run({ ...divisionToSave(form), current_week: Math.min(form.current_week, totalWeeks) })}
            >
              {busy ? 'Saving…' : 'Save'}
            </button>
          </span>
        </div>
      </DuezyDivisionCard>
    </li>
  );
}

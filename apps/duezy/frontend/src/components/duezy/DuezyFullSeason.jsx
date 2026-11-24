import React, { useState } from 'react';
import { money } from '../../utils/duezyMath.js';
import useSeasonTerms from '../../hooks/useSeasonTerms.js';
import DuezyModal from './DuezyModal.jsx';

const percent = (part, whole) => (whole > 0 ? Math.min(100, Math.round((part / whole) * 100)) : 0);

/**
 * Season-to-date summary card: collected vs dues due so far.
 * “Full season outlook” opens a small modal with the whole-season total.
 */
export default function DuezyFullSeason({ season, allDivisions = false }) {
  const terms = useSeasonTerms();
  const [open, setOpen] = useState(false);
  const collected = season.collected ?? 0;
  const expected = season.expected ?? 0;
  const collectedAll = season.collectedAll ?? collected;
  const seasonValue = season.seasonValue ?? 0;
  const ahead = Math.max(0, collectedAll - collected);
  const toDatePct = expected > 0 ? percent(collected, expected) : (collected > 0 ? 100 : 0);
  const fullPct = percent(collectedAll, seasonValue);
  const fullLeft = Math.max(0, seasonValue - collectedAll);

  if (!expected && !collectedAll && !seasonValue) return null;

  return (
    <div className="dz-stat dz-season-card">
      <small className="dz-owed-title">
        {terms.One} to date{allDivisions ? ' · all divisions' : ''}
      </small>
      <strong>{toDatePct}%</strong>
      <span
        className="dz-league-progress dz-season-card-bar"
        aria-label={`${toDatePct}% of dues due so far collected`}
      >
        <span style={{ width: `${toDatePct}%` }} />
      </span>
      <p className="dz-season-card-meta">
        <b>{money(collected)}</b> of {money(expected)} due
        {ahead > 0 ? <> · {money(ahead)} paid ahead</> : null}
      </p>
      {seasonValue > 0 ? (
        <button type="button" className="dz-link dz-season-card-link" onClick={() => setOpen(true)}>
          Full {terms.one} outlook ›
        </button>
      ) : null}

      {open ? (
        <DuezyModal title={`Full ${terms.one} outlook`} onClose={() => setOpen(false)} className="dz-season-outlook-modal">
          <p className="dz-small dz-muted">
            Every week of the {terms.one}
            {allDivisions ? ' across all divisions' : ''} — including money paid ahead.
          </p>
          <p className="dz-season-outlook-pct"><strong>{fullPct}%</strong> collected</p>
          <span className="dz-league-progress dz-season-card-bar" aria-hidden="true">
            <span style={{ width: `${fullPct}%` }} />
          </span>
          <p className="dz-season-card-meta">
            <b>{money(collectedAll)}</b> of {money(seasonValue)}
            {fullLeft > 0 ? <> · {money(fullLeft)} still to come</> : null}
          </p>
        </DuezyModal>
      ) : null}
    </div>
  );
}

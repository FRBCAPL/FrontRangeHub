import React from 'react';
import { money } from '../../utils/duezyMath.js';
import useSeasonTerms from '../../hooks/useSeasonTerms.js';

const percent = (part, whole) => (whole > 0 ? Math.min(100, Math.round((part / whole) * 100)) : 0);

/** Collapsed "Full season outlook": collected so far vs every week of the season, and what's still to come. */
export default function DuezyFullSeason({ season, allDivisions = false }) {
  const terms = useSeasonTerms();
  const collectedAll = season.collectedAll ?? season.collected;
  const { seasonValue } = season;
  if (!seasonValue) return null;
  const pct = percent(collectedAll, seasonValue);

  return (
    <details className="dz-season-total dz-full-season">
      <summary>
        <span className="dz-small dz-muted">Full {terms.one} outlook{allDivisions ? ' · all divisions' : ''}</span>
        <span className="dz-small"><strong>{pct}%</strong> <span className="dz-muted">collected</span></span>
      </summary>
      <span className="dz-league-progress" aria-label={`${pct}% of the full ${terms.one} collected`}>
        <span style={{ width: `${pct}%` }} />
      </span>
      <span className="dz-small dz-muted">
        {money(collectedAll)} of {money(seasonValue)} for every week of the {terms.one} · {money(Math.max(0, seasonValue - collectedAll))} still to come
      </span>
    </details>
  );
}

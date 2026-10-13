import React from 'react';
import { money } from '../../utils/duezyMath.js';

const percent = (part, whole) => (whole > 0 ? Math.min(100, Math.round((part / whole) * 100)) : 0);

/** One division's running total: season to date vs due so far, and progress toward the full season. */
export default function DuezyDivisionSeason({ season }) {
  const { collected, expected, seasonValue } = season;
  const collectedAll = season.collectedAll ?? collected;
  const early = Math.max(0, collectedAll - collected);
  const notStarted = expected === 0;
  if (!seasonValue && !collectedAll) return null;

  return (
    <section className="dz-season-total dz-season-total--division" aria-label="Season so far">
      <div className="dz-row dz-row--wrap">
        <span className="dz-small dz-muted">Season so far</span>
        <span className="dz-small">
          {notStarted ? (
            <>Not started · <strong>{money(collectedAll)}</strong> <span className="dz-muted">collected early</span></>
          ) : (
            <>
              <strong>{money(collected)}</strong> <span className="dz-muted">of</span> <strong>{money(expected)}</strong>{' '}
              <span className="dz-muted">due{early > 0 ? ` · ${money(early)} paid ahead` : ''}</span>
            </>
          )}
        </span>
      </div>
      {seasonValue > 0 ? (
        <>
          <span className="dz-league-progress" aria-label={`${percent(collectedAll, seasonValue)}% of the full season collected`}>
            <span style={{ width: `${percent(collectedAll, seasonValue)}%` }} />
          </span>
          <span className="dz-small dz-muted">
            {money(collectedAll)} of {money(seasonValue)} for the full season · {money(Math.max(0, seasonValue - collectedAll))} still to come
          </span>
        </>
      ) : null}
    </section>
  );
}

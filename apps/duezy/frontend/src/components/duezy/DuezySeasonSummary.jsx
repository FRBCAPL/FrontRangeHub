import React from 'react';
import { money } from '../../utils/duezyMath.js';

const percent = (part, whole) => (whole > 0 ? Math.min(100, Math.round((part / whole) * 100)) : 100);

/** All-divisions header: season to date (each division through its own week) + full-season value. */
export default function DuezySeasonSummary({ season, behind, dueTotal = 0, divisionCount }) {
  const { collected, expected, seasonValue } = season;
  const collectedAll = season.collectedAll ?? collected;
  const early = Math.max(0, collectedAll - collected);
  const notStarted = expected === 0;
  const pct = percent(collected, expected);
  const totalOwed = behind.reduce((s, x) => s + x.owed, 0);
  const seasonPct = percent(collectedAll, seasonValue);

  return (
    <>
      <section className="dz-summary">
        <div className="dz-summary-main">
          <div
            className="dz-ring"
            style={{ '--dz-pct': notStarted ? 0 : pct }}
            role="img"
            aria-label={notStarted ? 'Season not started yet' : `${pct}% of dues due so far collected`}
          >
            <span>{notStarted ? '—' : `${pct}%`}</span>
          </div>
          <div className="dz-summary-text">
            <small>Season so far{divisionCount > 1 ? ` · all ${divisionCount} divisions` : ''}</small>
            {notStarted ? (
              <strong>Not started yet <span>· {money(collectedAll)} collected early</span></strong>
            ) : (
              <strong>{money(collected)} <span>of {money(expected)} due</span></strong>
            )}
            <div className="dz-legend">
              <span className="is-paid">
                Each division counted through its current week
                {!notStarted && early > 0 ? ` · plus ${money(early)} paid ahead` : ''}
              </span>
            </div>
          </div>
        </div>
        <div className={`dz-stat ${behind.length ? 'is-bad' : 'is-good'}`}>
          <span className="dz-stat-icon" aria-hidden="true">{behind.length ? '!' : '✓'}</span>
          <strong>{behind.length}</strong>
          <span>{behind.length === 1 ? 'team late' : 'teams late'}</span>
        </div>
        <div className={`dz-stat ${totalOwed ? 'is-warn' : 'is-good'}`}>
          <span className="dz-stat-icon" aria-hidden="true">$</span>
          <strong>{money(totalOwed)}</strong>
          <span>late, all divisions{dueTotal > 0 ? ` · ${money(dueTotal)} due, not late yet` : ''}</span>
        </div>
      </section>

      {seasonValue > 0 ? (
        <section className="dz-season-total" aria-label="Full season">
          <div className="dz-row">
            <span className="dz-small dz-muted">Full season, all weeks</span>
            <span className="dz-small">
              <strong>{money(collectedAll)}</strong> <span className="dz-muted">collected of</span> <strong>{money(seasonValue)}</strong>
            </span>
          </div>
          <span className="dz-league-progress" aria-label={`${seasonPct}% of the full season collected`}>
            <span style={{ width: `${seasonPct}%` }} />
          </span>
          <span className="dz-small dz-muted">{money(Math.max(0, seasonValue - collectedAll))} still to come in over the rest of the season.</span>
        </section>
      ) : null}
    </>
  );
}

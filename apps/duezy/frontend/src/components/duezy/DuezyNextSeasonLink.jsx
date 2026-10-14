import React from 'react';
import { Link } from 'react-router-dom';
import { DUEZY_PATH } from '../../data/duezyOptions.js';
import { seasonIsOver } from '../../utils/duezyNextSeason.js';
import { seasonLabel, seasonTerms } from '../../utils/duezyTerms.js';
import { todayISO } from '../../utils/duezySchedule.js';

/**
 * "Start next season" entry points. `variant="card"` sits in league settings (always shown to the owner, with a
 * link back to last season); `variant="nudge"` shows on the league page only once every division has finished.
 */
export default function DuezyNextSeasonLink({ league, units = [], variant = 'card' }) {
  const to = `${DUEZY_PATH}/league/${league.id}/next-season`;
  const terms = seasonTerms(league);
  const label = seasonLabel(league);

  if (variant === 'nudge') {
    if (!seasonIsOver(units, todayISO(league.timezone))) return null;
    return (
      <p className="dz-ns-nudge" role="status">
        <span aria-hidden="true">🏁</span>
        <span>{label || `This ${terms.one}`} is done. Same teams next time?</span>
        <Link to={to} className="dz-btn dz-btn--primary dz-btn--sm">Start next {terms.one}</Link>
      </p>
    );
  }

  return (
    <section className="dz-card dz-ns-card">
      <div>
        <strong>Next {terms.one}</strong>
        <p className="dz-small dz-muted">
          Start a fresh {terms.one} of {league.name} with the same divisions, dues, payment settings and teams.
          Payments and history stay with {label || `this ${terms.one}`}.
        </p>
        {league.previous_league_id ? (
          <Link to={`${DUEZY_PATH}/league/${league.previous_league_id}`} className="dz-link dz-small">‹ Last {terms.one}</Link>
        ) : null}
      </div>
      <Link to={to} className="dz-btn dz-btn--ghost dz-btn--sm">Start next {terms.one}</Link>
    </section>
  );
}

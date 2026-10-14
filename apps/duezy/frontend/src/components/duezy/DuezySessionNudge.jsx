import React from 'react';
import { Link } from 'react-router-dom';
import { DUEZY_PATH } from '../../data/duezyOptions.js';
import { sessionIsOver } from '../../utils/duezySessions.js';
import { divisionTitle, seasonTerms } from '../../utils/duezyTerms.js';
import { todayISO } from '../../utils/duezySchedule.js';

/** League page, owner only: shows once one or more divisions have played out their session. */
export default function DuezySessionNudge({ league, units = [] }) {
  const today = todayISO(league.timezone);
  const done = units.filter((u) => u.id && sessionIsOver(u, today));
  if (!done.length) return null;
  const terms = seasonTerms(league);
  const to = `${DUEZY_PATH}/league/${league.id}/next-session?div=${done.map((u) => u.id).join(',')}`;
  const what = done.length === 1 ? `${divisionTitle(done[0])} is done.` : `${done.length} divisions have finished their ${terms.one}.`;
  return (
    <p className="dz-ns-nudge" role="status">
      <span aria-hidden="true">🏁</span>
      <span>{what} Same teams next time?</span>
      <Link to={to} className="dz-btn dz-btn--primary dz-btn--sm">Start next {terms.one}</Link>
    </p>
  );
}

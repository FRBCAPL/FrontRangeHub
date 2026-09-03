import React from 'react';
import { Link } from 'react-router-dom';
import { usaplNightLabel } from '../../data/usaplDivisions.js';
import { usaplDivisionLeagueNumbers } from '../../data/usaplLeagueNumbers.js';
import { formatUsaplSessionRange, usaplDivisionWinners } from '../../data/usaplPastDivisions.js';
import { usaplFormatWithoutInHouse } from '../../data/usaplFormat.js';
import UsaplDivisionWinners from './UsaplDivisionWinners.jsx';
import UsaplInHouseTag from './UsaplInHouseTag.jsx';

export default function UsaplPastDivisionCard({ division, stats }) {
  const dates = formatUsaplSessionRange(division);
  const league = usaplDivisionLeagueNumbers(division);
  const hasWinner = usaplDivisionWinners(division).length > 0;
  const title = league?.pairLabel || division.shortName;

  return (
    <article className="usapl-night-card">
      <div className="usapl-night-copy">
        <h2>
          {title}
          <UsaplInHouseTag division={division} />
        </h2>
        <p className="usapl-meta">
          {[league?.summary, usaplNightLabel(division.night), usaplFormatWithoutInHouse(division.format)]
            .filter(Boolean)
            .join(' · ')}
          {dates ? (
            <>
              <br />
              {dates}
            </>
          ) : null}
        </p>
        {hasWinner ? (
          <UsaplDivisionWinners division={division} stats={stats} />
        ) : (
          <p className="usapl-meta">Winner to be posted.</p>
        )}
      </div>
      <div className="usapl-actions" style={{ marginTop: 12 }}>
        <Link className="usapl-btn-secondary" to={`/usapl/divisions/${division.id}`}>Division page</Link>
      </div>
    </article>
  );
}

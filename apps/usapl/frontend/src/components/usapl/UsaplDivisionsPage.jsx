import React from 'react';
import { Link } from 'react-router-dom';
import { sortUsaplDivisionsByPlayDay, usaplDivisionSignupOpen, usaplDivisionSummaryLines } from '../../data/usaplDivisions.js';
import { useUsaplDivisions } from '../../hooks/useUsaplDivisions.js';
import UsaplInHouseTag from './UsaplInHouseTag.jsx';

export default function UsaplDivisionsPage() {
  const { divisions, loading } = useUsaplDivisions();
  const ordered = sortUsaplDivisionsByPlayDay(divisions);

  return (
    <div className="usapl-page">
      <h1>Where we play</h1>
      <p className="usapl-lede">
        Pick a night that fits. Full teams, partial teams, and individuals looking for a
        home are all welcome. Start a division with four teams and never pay dues as the rep.
      </p>
      {loading ? <p>Loading nights…</p> : null}
      <div className="usapl-night-list">
        {ordered.map((division) => (
          <article className="usapl-night-row" key={division.id}>
            <div className="usapl-night-copy">
              <h2>
                {division.shortName}
                <UsaplInHouseTag division={division} />
              </h2>
              <p className="usapl-meta">
                {usaplDivisionSummaryLines(division).map((line, index) => (
                  <span key={`${division.id}-${index}`}>
                    {index > 0 ? <br /> : null}
                    {line}
                  </span>
                ))}
              </p>
            </div>
            <div className="usapl-actions" style={{ marginTop: 0 }}>
              <Link className="usapl-btn-secondary" to={`/usapl/divisions/${division.id}`}>Divison Page</Link>
              {usaplDivisionSignupOpen(division) ? (
                <Link className="usapl-btn" to={`/usapl/signup?division=${division.id}`}>Join this division</Link>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

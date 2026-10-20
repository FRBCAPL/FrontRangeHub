import React from 'react';
import { Link } from 'react-router-dom';
import {
  usaplDivisionIsInSession,
  usaplDivisionSignupOpen,
  usaplDivisionSummaryLines,
} from '../../data/usaplDivisions.js';
import UsaplDivisionFlyer from './UsaplDivisionFlyer.jsx';
import UsaplPlayDayBadge from './UsaplPlayDayBadge.jsx';
import UsaplPlayPlaceBadge from './UsaplPlayPlaceBadge.jsx';

export default function UsaplDivisionCard({ division }) {
  const playing = usaplDivisionIsInSession(division);
  const open = usaplDivisionSignupOpen(division);
  let lines = [];
  try {
    const next = usaplDivisionSummaryLines(division);
    if (Array.isArray(next)) lines = next;
  } catch {
    lines = [];
  }
  const pill = playing ? 'Now playing' : (open ? 'Signup open' : 'Signup closed');

  return (
    <article className="usapl-night-card">
      <div className="usapl-night-card-main">
        <div className="usapl-night-copy">
          <h2>{division.shortName}</h2>
          <p className="usapl-meta">
            {lines.map((line, index) => (
              <span key={`${division.id}-${index}`}>
                {index > 0 ? <br /> : null}
                {line}
              </span>
            ))}
          </p>
          <div className="usapl-night-pills">
            <UsaplPlayDayBadge division={division} />
            <UsaplPlayPlaceBadge division={division} />
            <p className={`usapl-signup-pill${playing ? ' is-playing' : open ? ' is-open' : ''}`}>
              {pill}
            </p>
          </div>
        </div>
        <UsaplDivisionFlyer division={division} compact />
      </div>
      <div className="usapl-actions" style={{ marginTop: 12 }}>
        <Link className="usapl-btn-secondary" to={`/usapl/divisions/${division.id}`}>Division page</Link>
        {open ? (
          <Link className="usapl-btn" to={`/usapl/signup?division=${division.id}`}>Join</Link>
        ) : null}
      </div>
    </article>
  );
}

import React from 'react';
import { Link } from 'react-router-dom';
import {
  usaplDivisionIsInSession,
  usaplDivisionSignupOpen,
  usaplDivisionSummaryLines,
} from '../../data/usaplDivisions.js';
import UsaplInHouseTag from './UsaplInHouseTag.jsx';

export default function UsaplDivisionCard({ division }) {
  const playing = usaplDivisionIsInSession(division);
  const open = usaplDivisionSignupOpen(division);
  const lines = usaplDivisionSummaryLines(division);
  const pill = playing ? 'Now playing' : (open ? 'Signup open' : 'Signup closed');

  return (
    <article className="usapl-night-card">
      <div className="usapl-night-copy">
        <h2>
          {division.shortName}
          <UsaplInHouseTag division={division} />
        </h2>
        <p className="usapl-meta">
          {lines.map((line, index) => (
            <span key={`${division.id}-${index}`}>
              {index > 0 ? <br /> : null}
              {line}
            </span>
          ))}
        </p>
        <p className={`usapl-signup-pill${playing ? ' is-playing' : open ? ' is-open' : ''}`}>
          {pill}
        </p>
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

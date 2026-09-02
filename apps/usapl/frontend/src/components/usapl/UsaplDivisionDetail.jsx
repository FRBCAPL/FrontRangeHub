import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { getUsaplDivision, usaplDivisionIsInHouse, usaplDivisionSignupOpen, usaplNightLabel } from '../../data/usaplDivisions.js';
import { usaplFormatWithoutInHouse } from '../../data/usaplFormat.js';
import { usaplDivisionIsPast } from '../../data/usaplPastDivisions.js';
import { useUsaplDivisions } from '../../hooks/useUsaplDivisions.js';
import UsaplDivisionFacts from './UsaplDivisionFacts.jsx';
import UsaplDivisionWinners from './UsaplDivisionWinners.jsx';
import UsaplInHouseTag from './UsaplInHouseTag.jsx';
import UsaplPublicReport from './UsaplPublicReport.jsx';
import UsaplSchedulePic from './UsaplSchedulePic.jsx';

export default function UsaplDivisionDetail() {
  const { divisionId } = useParams();
  const { allDivisions, loading } = useUsaplDivisions();
  const division = getUsaplDivision(divisionId, allDivisions);

  if (loading && !division) {
    return (
      <div className="usapl-page">
        <p>Loading…</p>
      </div>
    );
  }

  if (!division) {
    return (
      <div className="usapl-page">
        <h1>Division not found</h1>
        <Link className="usapl-btn-secondary" to="/usapl/divisions">Back to divisions</Link>
      </div>
    );
  }

  return (
    <div className="usapl-page">
      <h1>
        {division.name}
        {' '}
        <UsaplInHouseTag division={division} />
      </h1>
      <p className="usapl-lede">
        {[
          usaplDivisionIsInHouse(division) ? 'In-house league' : '',
          usaplFormatWithoutInHouse(division.format) || division.format,
          usaplNightLabel(division.night),
        ].filter(Boolean).join(' · ')}
      </p>
      <div className="usapl-actions">
        {!loading && usaplDivisionSignupOpen(division) ? (
          <Link className="usapl-btn" to={`/usapl/signup?division=${division.id}`}>Sign up</Link>
        ) : null}
        <Link className="usapl-btn-secondary" to={`/usapl/roster?division=${division.id}`}>Team roster</Link>
        {usaplDivisionIsPast(division) ? (
          <Link className="usapl-btn-secondary" to="/usapl/past-divisions">Past divisions</Link>
        ) : null}
      </div>
      <UsaplDivisionWinners division={division} />
      <UsaplDivisionFacts division={division} />
      <UsaplPublicReport division={division} />
      <UsaplSchedulePic division={division} />
    </div>
  );
}

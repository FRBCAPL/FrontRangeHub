import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { getUsaplDivision, usaplDivisionIsInHouse, usaplDivisionSignupOpen, usaplNightLabel } from '../../data/usaplDivisions.js';
import { usaplFormatWithoutInHouse } from '../../data/usaplFormat.js';
import { usaplDivisionIsPast } from '../../data/usaplPastDivisions.js';
import { usaplFlyerImageUrl } from '../../data/usaplPublicReports.js';
import { useUsaplVegasSeedStats } from '../../hooks/useUsaplVegasSeedStats.js';
import UsaplDivisionFacts from './UsaplDivisionFacts.jsx';
import UsaplDivisionFactsBody from './UsaplDivisionFactsBody.jsx';
import UsaplDivisionFlyer from './UsaplDivisionFlyer.jsx';
import UsaplDivisionWinners from './UsaplDivisionWinners.jsx';
import UsaplInHouseTag from './UsaplInHouseTag.jsx';
import UsaplPublicReport from './UsaplPublicReport.jsx';
import UsaplSchedulePic from './UsaplSchedulePic.jsx';

export default function UsaplDivisionDetail() {
  const { divisionId } = useParams();
  const { allDivisions, loading, stats } = useUsaplVegasSeedStats();
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

  const flyer = usaplFlyerImageUrl(division);

  return (
    <div className="usapl-page usapl-division-page">
      <h1>
        {division.name}
        {' '}
        <UsaplInHouseTag division={division} />
      </h1>
      <p className="usapl-lede">
        {[
          usaplDivisionIsInHouse(division) ? 'In-house league' : 'Travel league',
          usaplFormatWithoutInHouse(division.format) || division.format,
          usaplNightLabel(division.night),
        ].filter(Boolean).join(' · ')}
      </p>
      <div className="usapl-actions usapl-division-page-actions">
        {!loading && usaplDivisionSignupOpen(division) ? (
          <Link className="usapl-btn" to={`/usapl/signup?division=${division.id}`}>Sign up</Link>
        ) : null}
        <div className="usapl-division-page-links">
          <UsaplDivisionFacts division={division} />
          <Link className="usapl-btn-secondary" to={`/usapl/roster?division=${division.id}`}>Team roster</Link>
        </div>
        {usaplDivisionIsPast(division) ? (
          <Link className="usapl-btn-secondary" to="/usapl/past-divisions">Past divisions</Link>
        ) : null}
      </div>
      {flyer ? (
        <div className="usapl-division-hero">
          <UsaplDivisionFlyer division={division} />
          <div className="usapl-division-hero-facts">
            <UsaplDivisionFactsBody division={division} summary />
          </div>
        </div>
      ) : (
        <UsaplDivisionFlyer division={division} />
      )}
      <UsaplDivisionWinners division={division} stats={stats} />
      <UsaplPublicReport division={division} />
      <UsaplSchedulePic division={division} />
    </div>
  );
}

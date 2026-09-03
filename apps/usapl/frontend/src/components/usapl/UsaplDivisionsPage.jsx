import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  groupUsaplDivisionsByNight,
  sortUsaplDivisionsForListing,
  usaplDivisionIsInSession,
  usaplDivisionSignupOpen,
} from '../../data/usaplDivisions.js';
import { useUsaplDivisions } from '../../hooks/useUsaplDivisions.js';
import UsaplDivisionCard from './UsaplDivisionCard.jsx';
import UsaplLeagueNumberGuide from './UsaplLeagueNumberGuide.jsx';
import UsaplVegasWinnerTicker from './UsaplVegasWinnerTicker.jsx';

function NightSections({ groups, night, titleFor }) {
  const visible = night === 'all' ? groups : groups.filter((group) => group.night === night);
  return visible.map((group) => (
    <section className="usapl-night-section" key={group.night}>
      <h2 className="usapl-night-section-title">{titleFor(group)}</h2>
      <div className="usapl-night-grid">
        {group.divisions.map((division) => (
          <UsaplDivisionCard key={division.id} division={division} />
        ))}
      </div>
    </section>
  ));
}

export default function UsaplDivisionsPage() {
  const { divisions, loading } = useUsaplDivisions();
  const [night, setNight] = useState('all');
  const groups = useMemo(() => groupUsaplDivisionsByNight(divisions), [divisions]);
  const playing = useMemo(
    () => sortUsaplDivisionsForListing(divisions.filter(usaplDivisionIsInSession)),
    [divisions]
  );
  const signupList = useMemo(
    () => sortUsaplDivisionsForListing(
      divisions.filter((row) => !usaplDivisionIsInSession(row) && usaplDivisionSignupOpen(row))
    ),
    [divisions]
  );
  const otherGroups = useMemo(
    () => groupUsaplDivisionsByNight(
      divisions.filter((row) => !usaplDivisionIsInSession(row) && !usaplDivisionSignupOpen(row))
    ),
    [divisions]
  );
  const visiblePlaying = night === 'all'
    ? playing
    : playing.filter((row) => row.night === night);
  const visibleSignup = night === 'all'
    ? signupList
    : signupList.filter((row) => row.night === night);

  return (
    <div className="usapl-page usapl-divisions-page">
      <h1>FRUSAPL Divisions</h1>
      <p className="usapl-lede">
        Pick a night that fits. Full teams, partial teams, and individuals looking for a
        home are all welcome.<br />
        {' '}
        <Link to="/usapl/past-divisions">Past divisions and winners</Link>
      </p>
      <UsaplVegasWinnerTicker />
      <UsaplLeagueNumberGuide />
      {groups.length > 1 ? (
        <div className="usapl-choice-row usapl-night-filters">
          <button
            type="button"
            className={`usapl-choice${night === 'all' ? ' selected' : ''}`}
            onClick={() => setNight('all')}
          >
            All nights
          </button>
          {groups.map((group) => (
            <button
              type="button"
              key={group.night}
              className={`usapl-choice${night === group.night ? ' selected' : ''}`}
              onClick={() => setNight(group.night)}
            >
              {group.label}
            </button>
          ))}
        </div>
      ) : null}
      {loading ? <p>Loading nights…</p> : null}
      {visiblePlaying.length ? (
        <section className="usapl-night-section">
          <h2 className="usapl-night-section-title">Now playing</h2>
          <div className="usapl-night-grid">
            {visiblePlaying.map((division) => (
              <UsaplDivisionCard key={division.id} division={division} />
            ))}
          </div>
        </section>
      ) : null}
      {visibleSignup.length ? (
        <section className="usapl-night-section">
          <h2 className="usapl-night-section-title">Taking signups</h2>
          <div className="usapl-night-grid">
            {visibleSignup.map((division) => (
              <UsaplDivisionCard key={division.id} division={division} />
            ))}
          </div>
        </section>
      ) : null}
      <NightSections
        groups={otherGroups}
        night={night}
        titleFor={(group) => group.label}
      />
    </div>
  );
}

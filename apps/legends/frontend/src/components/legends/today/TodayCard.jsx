import React from 'react';
import { Link } from 'react-router-dom';
import { activitiesOn, weekdayInTimeZone } from '../../../data/legendsSchedule.js';
import useLegendsToday from '../../../hooks/useLegendsToday.js';
import { buildLiveView, itemsNotCoveredByLive, liveBadges, updatedAgoLabel } from '../../../services/legendsLive.js';
import { ButtonLink } from '../LegendsUi.jsx';
import TodayMatches, { TodayBadge } from './TodayMatches.jsx';

function todayItems(now) {
  return activitiesOn(weekdayInTimeZone(now)).map((activity) => ({
    key: activity.slug,
    title: activity.title,
    to: `/legends/events/${activity.slug}`,
    category: activity.category,
  }));
}

export default function TodayCard() {
  const { summary, loaded, now } = useLegendsToday();
  if (!loaded) return <p className="lg-today__loading">Checking today&apos;s schedule…</p>;

  const live = buildLiveView(summary, now);
  const items = itemsNotCoveredByLive(todayItems(now), live);
  const matches = live?.matches ?? [];
  const leagueMatches = matches.filter((match) => match.kind === 'league');
  const tournaments = matches.filter((match) => match.kind === 'tournament');
  const hasMatches = matches.length > 0;
  const badges = liveBadges(live);
  const hasLiveContent = hasMatches || badges.leagues || badges.tournament;

  return (
    <article className="lg-today">
      {hasLiveContent ? (
        <div className="lg-today__head">
          <h3 className="lg-display lg-display--card">On the tables</h3>
          {!hasMatches && badges.leagues ? <TodayBadge className="lg-mt-4">Legends Leagues</TodayBadge> : null}
        </div>
      ) : null}

      <TodayMatches
        heading={tournaments.length > 1 ? 'Legends Tournaments' : 'Legends Tournament'}
        finishedText="Tournament play is finished for tonight."
        matches={tournaments}
      />
      <TodayMatches heading="Legends Leagues" finishedText="League play is finished for tonight." matches={leagueMatches} />

      {items.length > 0 ? (
        <div className="lg-today__group">
          <p className="lg-today__label">{hasMatches ? 'Also today' : 'On today'}</p>
          <ul className="lg-today__items">
            {items.map((item) => (
              <li key={item.key}>
                <Link to={item.to}>{item.title}</Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {!hasLiveContent && items.length === 0 ? <p className="lg-today__empty">Nothing is listed for today yet.</p> : null}

      <div className="lg-today__foot">
        <p className="lg-today__updated">{live ? `Table info ${updatedAgoLabel(live.updatedAt, now).toLowerCase()}` : null}</p>
        <ButtonLink to="/legends/events" variant="quiet">See schedule</ButtonLink>
      </div>
    </article>
  );
}

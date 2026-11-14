import React from 'react';
import { activitiesOn, weekdayInTimeZone } from '../../../data/legendsSchedule.js';
import { buildLiveView, liveBadges, updatedAgoLabel } from '../../../services/legendsLive.js';
import { ButtonLink } from '../LegendsUi.jsx';
import TodayMatches, { TodayBadge } from './TodayMatches.jsx';
import TodayScheduled, { SCHEDULED_TONIGHT } from './TodayScheduled.jsx';

/**
 * Leagues come only from CueSync, so a night without matches never shows them.
 * Karaoke and the Sunday tournament follow the weekly schedule; the tournament
 * switches to CueSync's bracket matches once they are listed.
 */
function scheduledTonight(now, tournamentMatches) {
  const categories = new Set(activitiesOn(weekdayInTimeZone(now)).map((activity) => activity.category));
  const kinds = [];
  if (categories.has('tournament') && tournamentMatches.length === 0) kinds.push('tournament');
  if (categories.has('karaoke')) kinds.push('karaoke');
  return kinds;
}

function cardHeading(hasLiveContent, scheduled) {
  if (hasLiveContent) return 'On the tables';
  if (scheduled.length > 0) return SCHEDULED_TONIGHT[scheduled[0]].heading;
  return 'No events today';
}

export default function TodayCard({ today }) {
  const { summary, loaded, now } = today;
  if (!loaded) return <p className="lg-today__loading">Checking today&apos;s schedule…</p>;

  const live = buildLiveView(summary, now);
  const matches = live?.matches ?? [];
  const leagueMatches = matches.filter((match) => match.kind === 'league');
  const tournaments = matches.filter((match) => match.kind === 'tournament');
  const hasMatches = matches.length > 0;
  const badges = liveBadges(live);
  const hasLiveContent = hasMatches || badges.leagues || badges.tournament;
  const scheduled = scheduledTonight(now, tournaments);

  return (
    <article className="lg-today">
      <div className="lg-today__head">
        <h3 className="lg-display lg-display--card">{cardHeading(hasLiveContent, scheduled)}</h3>
        {!hasMatches && badges.leagues ? <TodayBadge className="lg-mt-4">Legends Leagues</TodayBadge> : null}
      </div>

      <TodayMatches
        heading={tournaments.length > 1 ? 'Legends Tournaments' : 'Legends Tournament'}
        finishedText="Tournament play is finished for tonight."
        matches={tournaments}
      />
      <TodayMatches heading="Legends Leagues" finishedText="League play is finished for tonight." matches={leagueMatches} />

      {scheduled.map((kind, index) => (
        <TodayScheduled key={kind} kind={kind} withBadge={hasLiveContent || index > 0} />
      ))}

      <div className="lg-today__foot">
        <p className="lg-today__updated">{hasMatches ? `Table info ${updatedAgoLabel(live.updatedAt, now).toLowerCase()}` : null}</p>
        <ButtonLink to="/legends/events" variant="quiet">See schedule</ButtonLink>
      </div>
    </article>
  );
}

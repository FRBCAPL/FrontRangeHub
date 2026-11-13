import React from 'react';
import { Link } from 'react-router-dom';
import { LEGENDS_APPS } from '../../../data/legendsSite.js';
import { PageIntro } from '../LegendsUi.jsx';

const PLAY_HUBS = [
  ['/legends/play/leagues', 'Pool leagues', 'Every day. Names and start times are not published yet.'],
  ['/legends/play/tournaments', 'Sunday tournament', 'Every Sunday, plus other tournaments when they are scheduled.'],
  ['/legends/karaoke', 'Karaoke', 'Friday and Saturday nights.'],
  ['/legends/play/pool', 'Recreational pool', 'Open play is the reason the room exists.'],
];

function AppRegistry() {
  return (
    <ul className="lg-grid lg-grid--2">
      {LEGENDS_APPS.map((app) => (
        <li key={app.id} className="lg-card lg-card--solid">
          <p className="lg-eyebrow lg-eyebrow--muted">{app.url ? 'Link ready' : 'Link not configured'}</p>
          <h3 className="lg-display lg-display--card lg-mt-2">{app.name}</h3>
          <p className="lg-card__copy lg-mt-2">{app.description}</p>
          {app.url ? (
            <a href={app.url} className="lg-underline-link lg-mt-4">Open</a>
          ) : (
            <p className="lg-card__muted lg-mt-4">This link stays inactive until a real URL is configured.</p>
          )}
        </li>
      ))}
    </ul>
  );
}

export function PlayPage() {
  return (
    <div className="lg-page">
      <PageIntro eyebrow="Play" title="Find a game">
        <p className="lg-copy lg-mt-4 lg-max-2xl">
          This page points at what happens in the building. Existing Legends apps keep their own logic. A link turns on only when a real URL is configured.
        </p>
      </PageIntro>
      <div className="lg-grid lg-grid--2 lg-mt-8">
        {PLAY_HUBS.map(([to, title, copy]) => (
          <Link key={to} to={to} className="lg-card lg-card--solid lg-card--link">
            <h2 className="lg-display lg-display--card">{title}</h2>
            <p className="lg-card__copy lg-mt-2">{copy}</p>
          </Link>
        ))}
      </div>
      <h2 className="lg-display lg-display--sub lg-mt-12">Apps and results</h2>
      <p className="lg-card__copy lg-mt-3 lg-max-2xl">Leaderboards that name players should wait for an explicit opt-in. None are shown here.</p>
      <div className="lg-mt-6">
        <AppRegistry />
      </div>
    </div>
  );
}

export function PoolPage() {
  return (
    <article className="lg-page lg-page--narrow">
      <PageIntro eyebrow="Play" title="Recreational pool">
        <p className="lg-lede lg-mt-4">Pool is the main reason to walk in. Tables are open for casual play alongside the leagues and tournaments.</p>
        <p className="lg-copy lg-mt-4">Table rates, table counts, and house rules have not been published on this site. Ask the bar when you arrive.</p>
      </PageIntro>
      <div className="lg-link-row lg-mt-8">
        <Link to="/legends/play/leagues">Leagues</Link>
        <Link to="/legends/play/tournaments">Tournaments</Link>
        <Link to="/legends/visit">Visit</Link>
      </div>
    </article>
  );
}

export function LeaguesPage() {
  return (
    <article className="lg-page lg-page--narrow">
      <PageIntro eyebrow="Every day" title="Pool leagues">
        <p className="lg-lede lg-mt-4">
          League play is on the schedule every day of the week. This site does not list league names, formats, or start times until Legends publishes them.
        </p>
        <p className="lg-copy lg-mt-4">
          If you already play in a Legends league, your existing league app stays separate. A link appears on the Play page when its URL is configured.
        </p>
      </PageIntro>
      <Link to="/legends/events/pool-leagues" className="lg-text-link lg-mt-8">
        League schedule
      </Link>
    </article>
  );
}

export function TournamentsPage() {
  return (
    <article className="lg-page lg-page--narrow">
      <PageIntro eyebrow="Sunday" title="Tournaments">
        <p className="lg-lede lg-mt-4">A pool tournament runs every Sunday.</p>
        <p className="lg-copy lg-mt-4">
          Entry fees, race lengths, and start times are not listed because they have not been confirmed for this site. Other tournaments show up on Events when staff publish a date.
        </p>
      </PageIntro>
      <div className="lg-link-row lg-mt-8">
        <Link to="/legends/events/sunday-tournament">Sunday tournament</Link>
        <Link to="/legends/events">All events</Link>
      </div>
    </article>
  );
}

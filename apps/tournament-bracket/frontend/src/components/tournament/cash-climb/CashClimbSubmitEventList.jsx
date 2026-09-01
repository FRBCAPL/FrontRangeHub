import React from 'react';
import { formatTournamentDate } from './cashClimbEngine.js';
import './CashClimbSubmitPickModal.css';

function eventDetail(event) {
  const players = event.tournament?.players?.length || event.tournament?.stats?.length || 0;
  return [
    event.tournament?.gameType || 'Cash Climb',
    event.tournamentDate ? formatTournamentDate(event.tournamentDate) : '',
    players ? `${players} player${players === 1 ? '' : 's'}` : '',
  ].filter(Boolean).join(' • ');
}

export default function CashClimbSubmitEventList({
  events = [],
  loading = false,
  error = '',
  onPick,
  emptyMessage = 'No live tournaments are on the player list right now. Ask the director for the Share player link, or try again in a few seconds.',
}) {
  return (
    <>
      {loading ? <p className="cc-meta">Checking for live events…</p> : null}
      {!loading && error ? <p className="cc-banner cc-banner-warn">{error}</p> : null}
      {!loading && !error && !events.length ? <p className="cc-banner">{emptyMessage}</p> : null}
      {events.length ? (
        <ul className="cc-submit-pick-list">
          {events.map((event) => (
            <li key={event.id}>
              <button type="button" className="cc-submit-pick-item" onClick={() => onPick(event.id)}>
                <strong>{event.name}</strong>
                <span>{eventDetail(event)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

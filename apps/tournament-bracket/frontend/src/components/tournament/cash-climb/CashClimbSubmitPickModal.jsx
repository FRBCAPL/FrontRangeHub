import React, { useEffect, useRef, useState } from 'react';
import { listLiveCashClimbEventsResult } from './cashClimbCloud.js';
import { cashClimbListErrorMessage } from './cashClimbPublic.js';
import { formatTournamentDate } from './cashClimbEngine.js';
import './CashClimb.css';
import './CashClimbSubmitPickModal.css';

const POLL_MS = 2500;

export default function CashClimbSubmitPickModal({ onClose, onPick }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const onPickRef = useRef(onPick);
  const pickedRef = useRef(false);
  onPickRef.current = onPick;

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const result = await listLiveCashClimbEventsResult();
      if (cancelled) return;
      setEvents(result.events);
      setError(result.error ? cashClimbListErrorMessage(result.error) : '');
      setLoading(false);
      if (!pickedRef.current && result.events.length === 1) {
        pickedRef.current = true;
        onPickRef.current(result.events[0].id);
      }
    };
    refresh();
    const timer = setInterval(refresh, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="cc-modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="cc-submit-pick-title">
      <div className="cc-modal cc-submit-pick-modal" onClick={(e) => e.stopPropagation()}>
        <p className="cc-play-kicker">Cash Climb</p>
        <h3 id="cc-submit-pick-title">Current tournaments</h3>
        <p className="cc-modal-meta">Pick the event you are playing in.</p>
        {loading ? <p className="cc-meta">Checking for live events…</p> : null}
        {!loading && error ? <p className="cc-banner cc-banner-warn">{error}</p> : null}
        {!loading && !error && !events.length ? (
          <p className="cc-banner">
            No live Cash Climb is on the player list yet. Ask the director for the Share player
            link, or try again in a few seconds.
          </p>
        ) : null}
        {events.length ? (
          <ul className="cc-submit-pick-list">
            {events.map((event) => (
              <li key={event.id}>
                <button type="button" className="cc-submit-pick-item" onClick={() => onPick(event.id)}>
                  <strong>{event.name}</strong>
                  <span>
                    {event.tournament?.gameType || 'Cash Climb'}
                    {event.tournamentDate ? ` • ${formatTournamentDate(event.tournamentDate)}` : ''}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="form-actions">
          <button type="button" className="btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

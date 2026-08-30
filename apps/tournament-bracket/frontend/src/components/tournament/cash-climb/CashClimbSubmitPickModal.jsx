import React, { useEffect, useState } from 'react';
import { listLiveCashClimbEvents } from './cashClimbCloud.js';
import { formatTournamentDate } from './cashClimbEngine.js';
import './CashClimb.css';
import './CashClimbSubmitPickModal.css';

export default function CashClimbSubmitPickModal({ onClose, onPick }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    listLiveCashClimbEvents().then((rows) => {
      if (cancelled) return;
      setEvents(rows);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="cc-modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="cc-submit-pick-title">
      <div className="cc-modal cc-submit-pick-modal" onClick={(e) => e.stopPropagation()}>
        <p className="cc-play-kicker">Cash Climb</p>
        <h3 id="cc-submit-pick-title">Current tournaments</h3>
        <p className="cc-modal-meta">Pick the event you are playing in.</p>
        {loading ? <p className="cc-meta">Checking for live events…</p> : null}
        {!loading && !events.length ? (
          <p className="cc-banner">No tournament is taking results right now.</p>
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

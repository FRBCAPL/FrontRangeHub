import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listLiveElimEvents } from './elimCloud.js';
import { elimFormatLabel } from './elimStatus.js';
import { elimSubmitHash } from './elimSubmit.js';
import './TournamentBracketApp.css';
import './cash-climb/CashClimb.css';
import './cash-climb/CashClimbSubmitPage.css';
import './cash-climb/CashClimbSubmitPickModal.css';

const POLL_MS = 2500;

export default function ElimSubmitPicker() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Submit a result';
    let cancelled = false;
    const refresh = async () => {
      const next = await listLiveElimEvents();
      if (!cancelled) {
        setEvents(next);
        setLoading(false);
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
    <div className="cc-submit-shell">
      <div className="tournament-bracket-app cc-submit">
        <header className="cc-submit-head">
          <p className="cc-play-kicker">Elimination</p>
          <h1>Current tournaments</h1>
          <p className="cc-submit-note">Pick the bracket you are playing in, then submit your match result.</p>
        </header>
        <div className="cc-submit-pick-page">
          {loading ? <p className="cc-meta">Checking for live events…</p> : null}
          {!loading && !events.length ? (
            <p className="cc-banner">No live elimination brackets are on the player list right now.</p>
          ) : null}
          {events.length ? (
            <ul className="cc-submit-pick-list">
              {events.map((event) => (
                <li key={event.id}>
                  <button type="button" className="cc-submit-pick-item" onClick={() => navigate(elimSubmitHash(event.id))}>
                    <strong>{event.name}</strong>
                    <span>{elimFormatLabel(event.type) || 'Bracket'}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <button type="button" className="tb-btn-new" onClick={() => navigate('/')}>
          Back to home
        </button>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listLiveCashClimbEventsResult } from './cashClimbCloud.js';
import { cashClimbListErrorMessage } from './cashClimbPublic.js';
import { cashClimbSubmitHash } from './cashClimbSubmit.js';
import CashClimbSubmitEventList from './CashClimbSubmitEventList.jsx';
import '../TournamentBracketApp.css';
import './CashClimb.css';
import './CashClimbSubmitPage.css';

const POLL_MS = 2500;

export default function CashClimbSubmitPicker() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Submit a result';
    let cancelled = false;
    const refresh = async () => {
      const result = await listLiveCashClimbEventsResult();
      if (cancelled) return;
      setEvents(result.events);
      setError(result.error ? cashClimbListErrorMessage(result.error) : '');
      setLoading(false);
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
          <p className="cc-play-kicker">Cash Climb</p>
          <h1>Current tournaments</h1>
          <p className="cc-submit-note">
            Pick the event you are playing in, then submit your match result.
          </p>
        </header>
        <div className="cc-submit-pick-page">
          <CashClimbSubmitEventList
            events={events}
            loading={loading}
            error={error}
            onPick={(eventId) => navigate(cashClimbSubmitHash(eventId))}
          />
        </div>
        <button type="button" className="tb-btn-new" onClick={() => navigate('/')}>
          Back to home
        </button>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listLiveCashClimbEventsResult } from './cashClimbCloud.js';
import { cashClimbListErrorMessage } from './cashClimbPublic.js';
import { cashClimbSubmitHash } from './cashClimbSubmit.js';
import CashClimbSubmitEventList from './CashClimbSubmitEventList.jsx';
import { SHOWDOWN_PUBLIC_HASH } from '../showdown/public/showdownPublicRoutes.js';
import { showdownCloud } from '../showdown/cloud/showdownCloud.js';
import { listLiveShowdownItems } from '../showdown/public/showdownLiveList.js';
import { CASH_CLIMB_GUIDE_HASH } from './cashClimbGuideRoute.js';
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
      const [result, showdowns] = await Promise.all([listLiveCashClimbEventsResult(), listLiveShowdownItems(showdownCloud)]);
      if (cancelled) return;
      setEvents([...showdowns, ...result.events]);
      setError(result.error && !showdowns.length ? cashClimbListErrorMessage(result.error) : '');
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
            onPick={(eventId, event) => navigate(event?.path || cashClimbSubmitHash(eventId))}
          />
        </div>
        <button type="button" className="tb-btn-new" onClick={() => navigate(SHOWDOWN_PUBLIC_HASH)}>
          Live Showdowns
        </button>
        <button type="button" className="tb-btn-new" onClick={() => navigate(CASH_CLIMB_GUIDE_HASH)}>
          How Cash Climb works
        </button>
        <button type="button" className="tb-btn-new" onClick={() => navigate('/')}>
          Back to home
        </button>
      </div>
    </div>
  );
}

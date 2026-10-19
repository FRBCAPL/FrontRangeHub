import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { STATUS_LABELS } from '../operator/showdownView.js';
import { formatTournamentDate } from '../../cash-climb/cashClimbEngine.js';
import { showdownPublicHash } from './showdownPublicRoutes.js';
import { SHOWDOWN_GUIDE_HASH } from './showdownGuideRoute.js';
import { publicLoadMessage } from './useShowdownPublicEvent.js';
import '../../TournamentBracketApp.css';
import '../../cash-climb/CashClimb.css';
import '../../cash-climb/CashClimbSubmitPage.css';
import './ShowdownPublic.css';

const POLL_MS = 5000;

/** Started and recent Showdowns players can open. */
export default function ShowdownPublicList({ api }) {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Cash Climb Showdown';
    let cancelled = false;
    const refresh = async () => {
      const res = await api.publicList();
      if (cancelled) return;
      setRows(Array.isArray(res.data) ? res.data : []);
      setError(res.error ? publicLoadMessage(res.code) : '');
      setLoading(false);
    };
    refresh();
    const timer = setInterval(refresh, POLL_MS);
    return () => { cancelled = true; clearInterval(timer); };
  }, [api]);

  return (
    <div className="cc-submit-shell">
      <div className="tournament-bracket-app cc-submit sd-pub">
        <header className="cc-submit-head">
          <p className="cc-play-kicker">Cash Climb Showdown</p>
          <h1>Showdowns</h1>
          <p className="cc-submit-note">Pick an event to follow results or report a score.</p>
        </header>
        {loading ? <p className="cc-meta">Loading&hellip;</p> : null}
        {error ? <p className="cc-banner">{error}</p> : null}
        {!loading && !error && !rows.length ? <p className="cc-banner">No Showdowns are running right now.</p> : null}
        <ul className="sd-pub-list">
          {rows.map((r) => (
            <li key={r.id} className="sd-pub-match">
              <button type="button" className="sd-pub-event" onClick={() => navigate(showdownPublicHash(r.id))}>
                <strong>{r.name}</strong>
                <small>{[r.venue, formatTournamentDate(r.event_date), STATUS_LABELS[r.status] || r.status].filter(Boolean).join(' \u00b7 ')}</small>
              </button>
            </li>
          ))}
        </ul>
        <div className="cc-submit-nav">
          <button type="button" className="tb-btn-new" onClick={() => navigate(SHOWDOWN_GUIDE_HASH)}>How Showdown works</button>
          <button type="button" className="tb-btn-new" onClick={() => navigate('/tournament-bracket/submit')}>All tournaments</button>
          <button type="button" className="tb-btn-new" onClick={() => navigate('/')}>Back to home</button>
        </div>
      </div>
    </div>
  );
}

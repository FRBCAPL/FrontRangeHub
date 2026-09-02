import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { loadElimEventById, loadElimPending, submitElimPending } from './elimCloud.js';
import { elimFormatLabel } from './elimStatus.js';
import { elimSubmitEventId } from './elimSubmit.js';
import ElimSubmitPicker from './ElimSubmitPicker.jsx';
import ElimSubmitMatches from './ElimSubmitMatches.jsx';
import ElimWinnerModal from './ElimWinnerModal.jsx';
import './TournamentBracketApp.css';
import './cash-climb/CashClimb.css';
import './cash-climb/CashClimbSubmitPage.css';

const POLL_MS = 2500;

export default function ElimSubmitPage() {
  const location = useLocation();
  const eventId = elimSubmitEventId(location.pathname);
  if (!eventId) return <ElimSubmitPicker />;
  return <ElimSubmitEventPage eventId={eventId} />;
}

function ElimSubmitEventPage({ eventId }) {
  const navigate = useNavigate();
  const [tournament, setTournament] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    document.title = tournament?.status === 'completed' ? 'Elimination results' : 'Submit elimination result';
  }, [tournament?.status]);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const live = await loadElimEventById(eventId);
      if (cancelled) return;
      const next = live.tournament || null;
      setTournament(next);
      setLoadError(live.error && !next ? (live.error.message || 'Could not load this event.') : '');
      setLoading(false);
      if (!next?.id || next.status !== 'in-progress') {
        setSubmissions([]);
        return;
      }
      const rows = await loadElimPending(next.id);
      if (!cancelled) setSubmissions(rows);
    };
    refresh();
    const timer = setInterval(refresh, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [eventId]);

  const live = tournament?.status === 'in-progress';

  const handleSubmit = async (winnerId, score) => {
    if (!tournament?.id || !selected?.id) return;
    const result = await submitElimPending({
      eventId: tournament.id,
      matchId: selected.id,
      winnerId,
      score,
      submittedBy: winnerId,
    });
    setSelected(null);
    if (result.error) {
      setMessage(result.error.message || 'Could not send that result. Ask the director to enter it.');
      return;
    }
    setMessage('Sent. Waiting on the director to confirm.');
    setSubmissions(await loadElimPending(tournament.id));
  };

  return (
    <div className="cc-submit-shell">
      <div className="tournament-bracket-app cc-submit">
        <header className="cc-submit-head">
          <p className="cc-play-kicker">{elimFormatLabel(tournament?.type) || 'Elimination'}</p>
          <h1>{live ? 'Submit a result' : 'Bracket results'}</h1>
          <p className="cc-submit-note">
            {live
              ? `${tournament?.name || 'Tournament'} — click your match to submit a result. The director must confirm before the bracket advances.`
              : `${tournament?.name || 'Tournament'} is no longer taking player submits.`}
          </p>
        </header>

        {loading ? <p className="cc-meta">Loading this event…</p> : null}
        {!loading && !tournament ? (
          <p className="cc-banner">
            {loadError || 'That tournament is not on the player list. Pick a current event.'}
          </p>
        ) : null}

        {tournament && live ? (
          <div className="cc-submit-board">
            <ElimSubmitMatches
              tournament={tournament}
              submissions={submissions}
              onPick={setSelected}
            />
          </div>
        ) : null}

        {message ? <p className="cc-submit-status">{message}</p> : null}

        <div className="cc-submit-nav">
          <button type="button" className="tb-btn-new" onClick={() => navigate('/')}>
            Back to home
          </button>
        </div>
      </div>

      {selected && live ? (
        <ElimWinnerModal
          match={selected}
          title="Submit result"
          submitLabel="Send to director"
          note="The director must confirm before the bracket advances."
          onCancel={() => setSelected(null)}
          onSubmit={handleSubmit}
        />
      ) : null}
    </div>
  );
}

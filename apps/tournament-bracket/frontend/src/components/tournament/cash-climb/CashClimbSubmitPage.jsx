import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { sanitizeCashClimb, getCurrentRound, formatMoney } from './cashClimbEngine.js';
import { raceToForMatch } from './cashClimbRace.js';
import { cashClimbSubmitEventId } from './cashClimbSubmit.js';
import { loadPublicCashClimbEvent, loadCashClimbPending, submitCashClimbPending } from './cashClimbCloud.js';
import CashClimbStandings from './CashClimbStandings.jsx';
import CashClimbSubmitMatches from './CashClimbSubmitMatches.jsx';
import CashClimbResultModal from './CashClimbResultModal.jsx';
import '../TournamentBracketApp.css';
import './CashClimb.css';
import './CashClimbSubmitPage.css';

const POLL_MS = 2500;

function endedAtLabel(tournament) {
  const raw = tournament?.completedAt || tournament?.updated_at || '';
  if (!raw) return '';
  const when = new Date(raw);
  if (Number.isNaN(when.getTime())) return '';
  return when.toLocaleString();
}

export default function CashClimbSubmitPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const eventId = cashClimbSubmitEventId(location.pathname);
  const [tournament, setTournament] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = tournament && tournament.status !== 'in-progress'
      ? 'Cash Climb results'
      : 'Submit Cash Climb result';
  }, [tournament?.status]);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const live = await loadPublicCashClimbEvent(eventId);
      if (cancelled) return;
      const next = live.tournament ? sanitizeCashClimb(live.tournament) : null;
      setTournament(next);
      setLoading(false);
      if (!next?.id || next.status !== 'in-progress') {
        setSubmissions([]);
        return;
      }
      const rows = await loadCashClimbPending(next.id);
      if (!cancelled) setSubmissions(rows);
    };
    refresh();
    const timer = setInterval(refresh, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [eventId]);

  const round = tournament ? getCurrentRound(tournament) : null;

  const handleSubmit = async (winnerId, score, extras = {}) => {
    if (!tournament?.id || !selected?.id) return;
    const result = await submitCashClimbPending({
      eventId: tournament.id,
      matchId: selected.id,
      winnerId,
      score,
      submittedBy: winnerId === selected.player1_id ? selected.player1_name : selected.player2_name,
      playedGame: extras.playedGame || '',
    });
    setSelected(null);
    if (result.error) {
      setMessage(result.error.message || 'Could not send that result. Ask the director to enter it.');
      return;
    }
    setMessage('Sent. Waiting on the director to confirm.');
    setSubmissions(await loadCashClimbPending(tournament.id));
  };

  const live = tournament?.status === 'in-progress';
  const finished = tournament && !live;
  const paidOut = (tournament?.stats || []).reduce((sum, p) => sum + (p.total_payout || 0), 0);

  return (
    <div className="cc-submit-shell">
      <div className="tournament-bracket-app cc-submit">
        <header className="cc-submit-head">
          <p className="cc-play-kicker">Cash Climb</p>
          <h1>{finished ? 'Final results' : 'Submit a result'}</h1>
          <p className="cc-submit-note">
            {finished
              ? `${tournament.name}${endedAtLabel(tournament) ? ` • Completed ${endedAtLabel(tournament)}` : ''}`
              : 'Click your match to submit a result. The director must confirm before standings or money change.'}
          </p>
        </header>

        {loading ? <p className="cc-meta">Checking for a live event…</p> : null}
        {!loading && !tournament ? (
          <p className="cc-banner">No Cash Climb is running right now.</p>
        ) : null}
        {finished ? (
          <p className="cc-banner">
            This event is complete. Pool {formatMoney(tournament.totalPrizePool)} • Paid {formatMoney(paidOut)}.
          </p>
        ) : null}

        {tournament && (live || finished) ? (
          <div className={`cc-submit-board${finished ? ' is-final' : ''}`}>
            <section className="cc-submit-results" aria-label="Tournament results">
              <CashClimbStandings stats={tournament.stats} currentRound={round} tournament={tournament} briefNote />
            </section>
            {live ? (
              <CashClimbSubmitMatches
                tournament={tournament}
                round={round}
                submissions={submissions}
                onPick={setSelected}
              />
            ) : null}
          </div>
        ) : null}

        {message ? <p className="cc-submit-status">{message}</p> : null}

        <button type="button" className="tb-btn-new" onClick={() => navigate('/')}>
          Back to home
        </button>
      </div>

      {selected && live && (
        <CashClimbResultModal
          match={selected}
          raceTo={raceToForMatch(tournament, selected)}
          title="Submit result"
          submitLabel="Send to director"
          askPlayedGame
          onCancel={() => setSelected(null)}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}

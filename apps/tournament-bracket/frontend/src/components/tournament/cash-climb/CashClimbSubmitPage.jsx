import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sanitizeCashClimb, getCurrentRound } from './cashClimbEngine.js';
import { raceToForMatch } from './cashClimbRace.js';
import { loadLiveCashClimbEvent, loadCashClimbPending, submitCashClimbPending } from './cashClimbCloud.js';
import CashClimbStandings from './CashClimbStandings.jsx';
import CashClimbSubmitMatches from './CashClimbSubmitMatches.jsx';
import CashClimbResultModal from './CashClimbResultModal.jsx';
import '../TournamentBracketApp.css';
import './CashClimb.css';
import './CashClimbSubmitPage.css';

const POLL_MS = 2500;

export default function CashClimbSubmitPage() {
  const navigate = useNavigate();
  const [tournament, setTournament] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Submit Cash Climb result';
  }, []);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const live = await loadLiveCashClimbEvent();
      if (cancelled) return;
      const next = live.tournament ? sanitizeCashClimb(live.tournament) : null;
      setTournament(next);
      setLoading(false);
      if (!next?.id) {
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
  }, []);

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

  return (
    <div className="cc-submit-shell">
      <div className="tournament-bracket-app cc-submit">
        <header className="cc-submit-head">
          <p className="cc-play-kicker">Cash Climb</p>
          <h1>Submit a result</h1>
          <p className="cc-submit-note">
            Click your match to submit result. <br />Standings update after the director confirms.
          </p>
        </header>

        {loading ? <p className="cc-meta">Checking for a live event…</p> : null}
        {!loading && !tournament ? (
          <p className="cc-banner">No Cash Climb is running right now.</p>
        ) : null}
        {tournament && tournament.status !== 'in-progress' ? (
          <p className="cc-banner">This event is not taking results.</p>
        ) : null}

        {tournament && round && tournament.status === 'in-progress' ? (
          <div className="cc-submit-board">
            <section className="cc-submit-results" aria-label="Tournament results">
              <h2><center></center></h2>
              <p className="cc-meta"><center></center></p>
              <CashClimbStandings stats={tournament.stats} currentRound={round} tournament={tournament} briefNote />
            </section>
            <CashClimbSubmitMatches
              tournament={tournament}
              round={round}
              submissions={submissions}
              onPick={setSelected}
            />
          </div>
        ) : null}

        {message ? <p className="cc-submit-status">{message}</p> : null}

        <button type="button" className="tb-btn-new" onClick={() => navigate('/')}>
          Back to home
        </button>
      </div>

      {selected && (
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

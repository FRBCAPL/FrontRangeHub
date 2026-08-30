import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sanitizeCashClimb, formatMoney, getCurrentRound } from './cashClimbEngine.js';
import { cashClimbRrRaceTo, cashClimbKohRaceTo, formatRaceLabel, raceToForMatch } from './cashClimbRace.js';
import { pendingPlayableMatches, splitByTables, matchTableLabel } from './cashClimbProgress.js';
import { loadLiveCashClimbEvent, loadCashClimbPending, submitCashClimbPending } from './cashClimbCloud.js';
import { pendingByMatchId, pendingWinnerName } from './cashClimbSubmit.js';
import CashClimbMatchButton from './CashClimbMatchButton.jsx';
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
  const open = tournament && round ? pendingPlayableMatches(tournament, round) : [];
  const { atTable, onDeck } = splitByTables(open, tournament?.tableCount);
  const waiting = pendingByMatchId(submissions);

  const handleSubmit = async (winnerId, score) => {
    if (!tournament?.id || !selected?.id) return;
    const result = await submitCashClimbPending({
      eventId: tournament.id,
      matchId: selected.id,
      winnerId,
      score,
      submittedBy: winnerId === selected.player1_id ? selected.player1_name : selected.player2_name,
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
            Pick your match. The director confirms it before money posts. You cannot continue the round from here.
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
          <section className="cc-round">
            <h2>{round.round_name}</h2>
            {open[0] ? (
              <p className="cc-meta">
                {formatMoney(open[0].payout_amount)} per win
                {' • '}
                {formatRaceLabel(raceToForMatch(tournament, open[0]))}
                {' • RR '}
                {formatRaceLabel(cashClimbRrRaceTo(tournament))}
                {' • KOH '}
                {formatRaceLabel(cashClimbKohRaceTo(tournament))}
              </p>
            ) : (
              <p className="cc-meta">No open matches to submit. Wait for the director.</p>
            )}
            {atTable.length > 0 && (
              <ul className="cc-matches">
                {atTable.map((m, i) => (
                  <CashClimbMatchButton
                    key={m.id}
                    match={m}
                    tableLabel={waiting[m.id] ? `Waiting • ${pendingWinnerName(m, waiting[m.id]) || 'director'}` : matchTableLabel(i, tournament.tableCount)}
                    onPick={setSelected}
                  />
                ))}
              </ul>
            )}
            {onDeck.length > 0 && (
              <>
                <p className="cc-meta">On deck</p>
                <ul className="cc-matches">
                  {onDeck.map((m) => (
                    <CashClimbMatchButton
                      key={m.id}
                      match={m}
                      tableLabel={waiting[m.id] ? 'Waiting on director' : 'On deck'}
                      onPick={setSelected}
                      onDeck
                    />
                  ))}
                </ul>
              </>
            )}
          </section>
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
          onCancel={() => setSelected(null)}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}

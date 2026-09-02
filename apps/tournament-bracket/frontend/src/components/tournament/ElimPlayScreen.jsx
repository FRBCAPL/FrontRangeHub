import React, { useEffect, useState } from 'react';
import BracketDisplay from './BracketDisplay';
import DoubleElimDisplay from './DoubleElimDisplay';
import ElimPendingQueue from './ElimPendingQueue.jsx';
import ElimWinnerModal from './ElimWinnerModal.jsx';
import { elimChampion, elimFormatLabel } from './elimStatus.js';
import { applyElimWinner, findElimMatch } from './elimMatches.js';
import { hasElimResults, reseedElimBracket } from './elimSeed.js';
import { loadElimPending, deleteElimPending, clearElimPending } from './elimCloud.js';
import './cash-climb/CashClimb.css';

const POLL_MS = 2500;

export default function ElimPlayScreen({ tournament, onUpdate, onNew, onRemove }) {
  const champion = elimChampion(tournament);
  const completed = tournament.status === 'completed' || Boolean(champion);
  const [submissions, setSubmissions] = useState([]);
  const [resultMatch, setResultMatch] = useState(null);

  useEffect(() => {
    if (!tournament?.id || completed) {
      setSubmissions([]);
      return undefined;
    }
    let cancelled = false;
    const refresh = async () => {
      const rows = await loadElimPending(tournament.id);
      if (!cancelled) setSubmissions(rows);
    };
    refresh();
    const timer = setInterval(refresh, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [tournament?.id, completed]);

  const handleConfirm = async (row) => {
    const match = findElimMatch(tournament, row.match_id);
    const winner = row.winner_id;
    if (!match || !winner) return;
    onUpdate(applyElimWinner(tournament, row.match_id, winner, row.score));
    await deleteElimPending(tournament.id, row.match_id);
    setSubmissions((rows) => rows.filter((item) => String(item.match_id) !== String(row.match_id)));
  };

  const handleReject = async (row) => {
    await deleteElimPending(tournament.id, row.match_id);
    setSubmissions((rows) => rows.filter((item) => String(item.match_id) !== String(row.match_id)));
  };

  const started = completed || hasElimResults(tournament) || submissions.length > 0;

  const handleShuffle = async () => {
    if (started) return;
    onUpdate(reseedElimBracket(tournament));
    setResultMatch(null);
    if (tournament.id) {
      await clearElimPending(tournament.id);
      setSubmissions([]);
    }
  };

  return (
    <div className="tournament-bracket-app">
      <header className="tb-header">
        <h1>{tournament.name}</h1>
        <p>
          {elimFormatLabel(tournament.type)}
          {' • '}
          {tournament.entrantNames?.length || 0} entrants
          {champion ? ` • Winner: ${champion}` : ''}
        </p>
        {completed && onRemove ? (
          <button type="button" className="tb-btn-new" onClick={onRemove}>
            Remove tournament
          </button>
        ) : null}
        <button type="button" className="tb-btn-new" onClick={onNew}>
          New tournament
        </button>
        {!started ? (
          <button type="button" className="tb-btn-new" onClick={handleShuffle}>
            Shuffle players
          </button>
        ) : null}
      </header>
      {!completed ? (
        <ElimPendingQueue
          tournament={tournament}
          submissions={submissions}
          onConfirm={handleConfirm}
          onReject={handleReject}
        />
      ) : null}
      {tournament.type === 'single' && (
        <BracketDisplay
          rounds={tournament.rounds}
          onUpdate={(rounds) => onUpdate({ ...tournament, rounds })}
          onPickMatch={setResultMatch}
        />
      )}
      {tournament.type === 'double' && (
        <DoubleElimDisplay
          data={{
            winnersRounds: tournament.winnersRounds,
            loserRounds: tournament.loserRounds,
            grandFinal: tournament.grandFinal,
          }}
          onUpdate={(data) => onUpdate({ ...tournament, ...data })}
          onPickMatch={setResultMatch}
        />
      )}
      {resultMatch ? (
        <ElimWinnerModal
          match={resultMatch}
          title="Enter result"
          submitLabel="Save result"
          onCancel={() => setResultMatch(null)}
          onSubmit={(winnerId, score) => {
            onUpdate(applyElimWinner(tournament, resultMatch.matchId, winnerId, score));
            setResultMatch(null);
          }}
        />
      ) : null}
    </div>
  );
}

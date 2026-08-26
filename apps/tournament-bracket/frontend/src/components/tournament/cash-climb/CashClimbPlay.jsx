import React, { useState } from 'react';
import CashClimbStandings from './CashClimbStandings.jsx';
import CashClimbResultModal from './CashClimbResultModal.jsx';
import { formatMoney, formatTournamentDate, getCurrentRound, getRoundMatches } from './cashClimbEngine.js';
import { getFormatDisplay } from './openTournamentStructure.js';
import { estimateCashClimbDuration } from './cashClimbDuration.js';
import CashClimbDurationEstimate from './CashClimbDurationEstimate.jsx';
import { openCashClimbTv } from './cashClimbTv.js';

export default function CashClimbPlay({ tournament, onRecord, onNew, onLeave }) {
  const [selected, setSelected] = useState(null);
  const round = getCurrentRound(tournament);
  const matches = round ? getRoundMatches(tournament, round.id) : [];
  const pending = matches.filter((m) => {
    if (m.status !== 'pending') return false;
    if (m.is_bye || !m.player2_id) return false;
    const p1 = tournament.stats.find((p) => p.player_id === m.player1_id);
    const p2 = m.player2_id ? tournament.stats.find((p) => p.player_id === m.player2_id) : null;
    if (p1?.eliminated) return false;
    if (p2?.eliminated) return false;
    return true;
  });
  const done = matches.filter((m) => m.status === 'completed');
  const paidOut = tournament.stats.reduce((sum, p) => sum + (p.total_payout || 0), 0);
  const durationEstimate = estimateCashClimbDuration({
    playerCount: tournament.players?.length || tournament.stats?.length || 0,
    raceTo: tournament.raceTo,
    gameType: tournament.gameType,
    tableCount: tournament.tableCount,
  });

  return (
    <div className="cc-play">
      <header className="tb-header">
        <h1>{tournament.name}</h1>
        <p>
          {formatTournamentDate(tournament.tournamentDate)
            ? `${formatTournamentDate(tournament.tournamentDate)} • `
            : ''}
          {getFormatDisplay(tournament.roundRobinType)} • {tournament.gameType} • race to {tournament.raceTo}
          {tournament.tableCount ? ` • ${tournament.tableCount} table${tournament.tableCount === 1 ? '' : 's'}` : ''}
        </p>
        <p className="cc-meta">
          Pool {formatMoney(tournament.totalPrizePool)}
          {tournament.firstPlacePrize
            ? ` • 1st reserved ${formatMoney(tournament.firstPlacePrize)}${tournament.firstPlacePercent != null ? ` (${tournament.firstPlacePercent}%)` : ''}`
            : ''}
          {' '}• Paid {formatMoney(paidOut)}
          {tournament.status !== 'completed' && durationEstimate ? (
            <> • <CashClimbDurationEstimate estimate={durationEstimate} compact /></>
          ) : null}
          {' '}• {tournament.status === 'completed' ? 'Complete' : tournament.status}
        </p>
        {tournament.message && <p className="cc-banner">{tournament.message}</p>}
        {tournament.winner && (
          <p className="cc-winner">Winner: {tournament.winner.player_name} • {formatMoney(tournament.winner.total_payout)}</p>
        )}
        {onLeave && (
          <button type="button" className="tb-btn-new" onClick={onLeave}>
            All formats
          </button>
        )}
        <button type="button" className="tb-btn-new" onClick={() => openCashClimbTv('landscape')}>
          TV wide 16:9
        </button>
        <button type="button" className="tb-btn-new" onClick={() => openCashClimbTv('portrait')}>
          TV tall 9:16
        </button>
        <button type="button" className="tb-btn-new" onClick={onNew}>
          New tournament
        </button>
      </header>

      {tournament.status !== 'completed' && round && (
        <section className="cc-round">
          <h2>{round.round_name}</h2>
          {pending[0] && (
            <p className="cc-meta">This round: {formatMoney(pending[0].payout_amount)} per win</p>
          )}
          {pending.length === 0 && <p>No open matches in this round.</p>}
          <ul className="cc-matches">
            {pending.map((m) => (
              <li key={m.id}>
                <button type="button" className="cc-match" onClick={() => setSelected(m)}>
                  <span>{m.player1_name}</span>
                  <em>vs</em>
                  <span>{m.player2_name || 'Bye'}</span>
                  <small>{formatMoney(m.payout_amount)}</small>
                </button>
              </li>
            ))}
          </ul>
          {done.length > 0 && (
            <div className="cc-done">
              <h3>Completed this round</h3>
              <ul>
                {done.map((m) => (
                  <li key={m.id}>
                    {m.is_bye
                      ? `${m.winner_name} — bye (win only)`
                      : `${m.winner_name} beat ${m.loser_name || 'Bye'}`}
                    {m.score ? ` (${m.score})` : ''} • {formatMoney(m.payout_amount)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <CashClimbStandings stats={tournament.stats} currentRound={round} />

      {selected && (
        <CashClimbResultModal
          match={selected}
          raceTo={tournament.raceTo}
          onCancel={() => setSelected(null)}
          onSubmit={(winnerId, score) => {
            onRecord(selected.id, winnerId, score);
            setSelected(null);
          }}
        />
      )}
    </div>
  );
}

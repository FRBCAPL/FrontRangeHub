import React from 'react';
import { formatMoney } from './cashClimbEngine.js';
import { raceToForMatch } from './cashClimbRace.js';
import { matchTableLabel, pendingPlayableMatches, splitByTables } from './cashClimbProgress.js';
import { roundDisplayName } from './cashClimbSchedule.js';
import { pendingByMatchId, pendingWinnerName } from './cashClimbSubmit.js';
import CashClimbMatchButton from './CashClimbMatchButton.jsx';

export default function CashClimbSubmitMatches({ tournament, round, submissions, onPick }) {
  const open = pendingPlayableMatches(tournament, round);
  const { atTable, onDeck } = splitByTables(open, tournament?.tableCount);
  const waiting = pendingByMatchId(submissions);
  const race = raceToForMatch(tournament, open[0] || { round_id: round.id });

  return (
    <section className="cc-round cc-submit-matches">
      <h2>{roundDisplayName(round, tournament.gameType)}</h2>
      {open[0] ? (
        <p className="cc-submit-pay">{formatMoney(open[0].payout_amount)} per win</p>
      ) : null}
      <p className="cc-submit-race">Race to: {race}</p>
      {!open[0] ? (
        <p className="cc-meta cc-submit-empty">No open matches to submit. Wait for the director.</p>
      ) : null}
      {atTable.length > 0 && (
        <ul className="cc-matches">
          {atTable.map((m, i) => (
            <CashClimbMatchButton
              key={m.id}
              match={m}
              tableLabel={waiting[String(m.id)]
                ? `Waiting • ${pendingWinnerName(m, waiting[String(m.id)]) || 'director'}`
                : matchTableLabel(i, tournament.tableCount)}
              onPick={onPick}
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
                tableLabel={waiting[String(m.id)] ? 'Waiting on director' : 'On deck'}
                onPick={onPick}
                onDeck
              />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

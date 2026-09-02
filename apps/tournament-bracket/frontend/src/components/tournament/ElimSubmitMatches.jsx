import React from 'react';
import { playableElimMatches } from './elimMatches.js';
import { pendingByMatchId, pendingWinnerName } from './elimSubmit.js';

export default function ElimSubmitMatches({ tournament, submissions, onPick }) {
  const open = playableElimMatches(tournament);
  const waiting = pendingByMatchId(submissions);

  return (
    <section className="cc-round cc-submit-matches" aria-label="Active matches">
      <h2>Active matches</h2>
      {!open[0] ? (
        <p className="cc-meta cc-submit-empty">No open matches to submit. Wait for the director.</p>
      ) : null}
      {open.length ? (
        <ul className="cc-matches">
          {open.map((m) => {
            const pending = waiting[String(m.id)];
            return (
              <li key={m.id}>
                <button type="button" className="cc-match" onClick={() => onPick(m)}>
                  <span className="cc-match-table">
                    {pending
                      ? `Waiting • ${pendingWinnerName(m, pending) || 'director'}`
                      : (m.bracket || m.round_name || 'Match')}
                  </span>
                  <span>{m.player1_name}</span>
                  <em>vs</em>
                  <span>{m.player2_name}</span>
                  <small>{m.round_name}</small>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}

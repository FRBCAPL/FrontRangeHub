import React from 'react';
import BracketDisplay from './BracketDisplay';
import { setLoserAndAdvance } from './bracketLogic';
import './BracketDisplay.css';

/**
 * Renders full double-elimination: winner's bracket, loser's bracket, and grand final.
 * WB losers feed into LBR1; WB final loser feeds into LBR2; LB champ feeds into GF slot2.
 */
export default function DoubleElimDisplay({ data, onUpdate }) {
  const { winnersRounds, loserRounds, grandFinal } = data;

  const handleWinnersUpdate = (rounds) => {
    const updatedLoserRounds = loserRounds.map((r) => ({ ...r, matches: r.matches.map((m) => ({ ...m })) }));
    rounds.forEach((round) =>
      round.matches.forEach((m) => {
        if (m.winner && m.loserNextMatchId) {
          setLoserAndAdvance(rounds, m.matchId, updatedLoserRounds, grandFinal);
        }
      })
    );
    if (onUpdate) onUpdate({ ...data, winnersRounds: rounds, loserRounds: updatedLoserRounds });
  };

  const handleLosersUpdate = (rounds) => {
    if (onUpdate) onUpdate({ ...data, loserRounds: rounds });
  };

  const setGrandFinalWinner = (winner) => {
    if (!winner || !grandFinal.slot1 || !grandFinal.slot2) return;
    grandFinal.winner = winner;
    if (onUpdate) onUpdate({ ...data });
  };

  return (
    <div className="double-elim-display">
      <section className="winners-bracket-section">
        <h2 className="bracket-section-title">Winner&apos;s Bracket</h2>
        <BracketDisplay
          rounds={winnersRounds}
          onUpdate={handleWinnersUpdate}
          grandFinalRef={grandFinal}
          bracketKind="winners"
        />
      </section>
      {loserRounds && loserRounds.length > 0 && (
        <section className="losers-bracket-section">
          <h2 className="bracket-section-title">Loser&apos;s Bracket</h2>
          <BracketDisplay
            rounds={loserRounds}
            onUpdate={handleLosersUpdate}
            grandFinalRef={grandFinal}
            bracketKind="losers"
          />
        </section>
      )}
      <section className="grand-final-section">
        <h2 className="bracket-section-title">Grand Final</h2>
        <div className="bracket-match-paper grand-final-cell">
          <div
            className={`bracket-slot-paper top ${grandFinal.winner === grandFinal.slot1 ? 'winner' : ''}`}
            onClick={() => setGrandFinalWinner(grandFinal.slot1)}
          >
            {grandFinal.slot1 || 'TBD'}
          </div>
          <div className="bracket-match-divider" />
          <div
            className={`bracket-slot-paper bottom ${grandFinal.winner === grandFinal.slot2 ? 'winner' : ''}`}
            onClick={() => setGrandFinalWinner(grandFinal.slot2)}
          >
            {grandFinal.slot2 || 'TBD'}
          </div>
          {grandFinal.winner && (
            <div className="bracket-winner-badge">Champion: {grandFinal.winner}</div>
          )}
        </div>
      </section>
    </div>
  );
}

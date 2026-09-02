import React from 'react';
import BracketDisplay, { BracketSlot } from './BracketDisplay';
import { setLoserAndAdvance } from './bracketLogic';
import { isElimNamedPlayer, gamesFromElimScore } from './elimScore.js';
import './BracketDisplay.css';

/**
 * Renders full double-elimination: winner's bracket, loser's bracket, and grand final.
 * WB losers feed into LBR1; WB final loser feeds into LBR2; LB champ feeds into GF slot2.
 */
export default function DoubleElimDisplay({ data, onUpdate, onPickMatch }) {
  const { winnersRounds, loserRounds, grandFinal } = data;
  const gfGames = gamesFromElimScore(grandFinal?.score);
  const gfDecided = Boolean(grandFinal?.winner);

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

  const openGrandFinal = (clickedName) => {
    if (!isElimNamedPlayer(grandFinal.slot1) || !isElimNamedPlayer(grandFinal.slot2)) return;
    if (onPickMatch) {
      onPickMatch({
        id: grandFinal.matchId || 'gf',
        matchId: grandFinal.matchId || 'gf',
        player1_id: grandFinal.slot1,
        player1_name: grandFinal.slot1,
        player2_id: grandFinal.slot2,
        player2_name: grandFinal.slot2,
        winner: grandFinal.winner || '',
        score: grandFinal.score || '',
        round_name: 'Grand Final',
        bracket: 'Grand Final',
        preferredWinner: clickedName,
      });
      return;
    }
    setGrandFinalWinner(clickedName);
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
          onPickMatch={onPickMatch}
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
            onPickMatch={onPickMatch}
          />
        </section>
      )}
      <section className="grand-final-section">
        <h2 className="bracket-section-title">Grand Final</h2>
        <div className="bracket-match-paper grand-final-cell">
          <BracketSlot
            className="top"
            name={grandFinal.slot1 || 'TBD'}
            games={gfGames.p1}
            isWinner={grandFinal.winner === grandFinal.slot1}
            isLoser={gfDecided && isElimNamedPlayer(grandFinal.slot1) && grandFinal.winner !== grandFinal.slot1}
            onClick={() => openGrandFinal(grandFinal.slot1)}
          />
          <div className="bracket-match-divider" />
          <BracketSlot
            className="bottom"
            name={grandFinal.slot2 || 'TBD'}
            games={gfGames.p2}
            isWinner={grandFinal.winner === grandFinal.slot2}
            isLoser={gfDecided && isElimNamedPlayer(grandFinal.slot2) && grandFinal.winner !== grandFinal.slot2}
            onClick={() => openGrandFinal(grandFinal.slot2)}
          />
          {grandFinal.winner && (
            <div className="bracket-winner-badge">Champion: {grandFinal.winner}</div>
          )}
        </div>
      </section>
    </div>
  );
}

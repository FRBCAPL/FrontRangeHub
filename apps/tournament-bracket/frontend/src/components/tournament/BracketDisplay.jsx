import React, { useMemo, useRef, useEffect, useState } from 'react';
import { setWinnerAndAdvance, setLoserBracketWinner } from './bracketLogic';
import { isElimNamedPlayer, gamesFromElimScore } from './elimScore.js';
import './BracketDisplay.css';

const MATCH_WIDTH = 160;
const ROW_HEIGHT = 32;
const GAP_X = 48;
const GAP_Y = 8;

/**
 * Renders a single-elimination bracket in a paper-style layout with connecting lines.
 * If grandFinalRef is passed (double-elim), winner advances to grand final.
 * bracketKind='losers' uses loser's bracket advancement (winner → next LB match or GF slot2).
 */
export default function BracketDisplay({ rounds, onUpdate, grandFinalRef, bracketKind = 'winners', onPickMatch }) {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const matchRefs = useRef({});

  const handleSetWinner = (matchId, winner) => {
    if (!onUpdate) return;
    if (bracketKind === 'losers') {
      setLoserBracketWinner(rounds, matchId, winner, grandFinalRef);
    } else {
      setWinnerAndAdvance(rounds, matchId, winner, grandFinalRef);
    }
    onUpdate([...rounds]);
  };

  const openMatch = (match, roundName, clickedName) => {
    if (clickedName === 'Bye' || !clickedName) return;
    const p1 = isElimNamedPlayer(match.slot1);
    const p2 = isElimNamedPlayer(match.slot2);
    if (p1 && match.slot2 === 'Bye') {
      handleSetWinner(match.matchId, match.slot1);
      return;
    }
    if (p2 && match.slot1 === 'Bye') {
      handleSetWinner(match.matchId, match.slot2);
      return;
    }
    if (!p1 || !p2) return;
    if (onPickMatch) {
      onPickMatch({
        id: match.matchId,
        matchId: match.matchId,
        player1_id: match.slot1,
        player1_name: match.slot1,
        player2_id: match.slot2,
        player2_name: match.slot2,
        winner: match.winner || '',
        score: match.score || '',
        round_name: roundName,
        preferredWinner: clickedName,
      });
      return;
    }
    handleSetWinner(match.matchId, clickedName);
  };

  const layout = useMemo(() => {
    if (!rounds?.length) return null;
    const numRound1 = rounds[0].matches.length;
    const totalRows = numRound1 * 2; // each round-1 match uses 2 row slots
    const matchPositions = {};
    rounds.forEach((round, r) => {
      const span = Math.pow(2, r + 1);
      round.matches.forEach((match, i) => {
        const row = i * span;
        matchPositions[match.matchId] = { roundIndex: r, row, span, col: r };
      });
    });
    return {
      totalRows,
      numCols: rounds.length,
      matchPositions,
    };
  }, [rounds]);

  useEffect(() => {
    if (!containerRef.current || !layout) return;
    const el = containerRef.current;
    const totalWidth = layout.numCols * MATCH_WIDTH + (layout.numCols - 1) * GAP_X;
    const totalHeight = layout.totalRows * ROW_HEIGHT + (layout.totalRows - 1) * GAP_Y;
    setDimensions({ width: totalWidth, height: totalHeight });
  }, [layout]);

  if (!rounds?.length) return null;

  const totalRows = layout.totalRows;
  const numCols = layout.numCols;

  return (
    <div className="bracket-paper-wrap">
      <div className="bracket-paper" ref={containerRef} style={{ width: dimensions.width, minHeight: dimensions.height }}>
        <svg className="bracket-connectors" width={dimensions.width} height={dimensions.height}>
          <defs>
            <marker id="bracket-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="rgba(148, 163, 184, 0.6)" />
            </marker>
          </defs>
          {rounds.slice(0, -1).map((round) =>
            round.matches.map((match) => {
              if (!match.nextMatchId) return null;
              const pos = layout.matchPositions[match.matchId];
              const nextMatch = rounds[pos.roundIndex + 1].matches.find((m) => m.matchId === match.nextMatchId);
              const nextPos = nextMatch && layout.matchPositions[nextMatch.matchId];
              if (!pos || !nextPos) return null;
              const rightEdgeX = (pos.col + 1) * MATCH_WIDTH + pos.col * GAP_X;
              const leftEdgeX = nextPos.col * (MATCH_WIDTH + GAP_X);
              const y1 = (pos.row + pos.span / 2) * (ROW_HEIGHT + GAP_Y) - GAP_Y / 2 + ROW_HEIGHT / 2;
              const y2 = (nextPos.row + nextPos.span / 2) * (ROW_HEIGHT + GAP_Y) - GAP_Y / 2 + ROW_HEIGHT / 2;
              const midX = (rightEdgeX + leftEdgeX) / 2;
              return (
                <path
                  key={`line-${match.matchId}`}
                  d={`M ${rightEdgeX} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${leftEdgeX} ${y2}`}
                  fill="none"
                  stroke="rgba(120, 113, 108, 0.55)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              );
            })
          )}
        </svg>
        <div
          className="bracket-round-labels"
          style={{
            width: dimensions.width,
            gridTemplateColumns: `repeat(${numCols}, ${MATCH_WIDTH}px)`,
            gap: `0 ${GAP_X}px`,
          }}
        >
          {rounds.map((round) => (
            <div key={round.roundIndex} className="bracket-round-label">
              {round.name}
            </div>
          ))}
        </div>
        <div
          className="bracket-grid"
          style={{
            gridTemplateColumns: `repeat(${numCols}, ${MATCH_WIDTH}px)`,
            gridTemplateRows: `repeat(${totalRows}, ${ROW_HEIGHT}px)`,
            gap: `${GAP_Y}px ${GAP_X}px`,
            width: dimensions.width,
            height: dimensions.height,
          }}
        >
          {rounds.map((round) =>
            round.matches.map((match, i) => {
              const span = Math.pow(2, round.roundIndex + 1);
              const row = i * span;
              return (
                <div
                  key={match.matchId}
                  ref={(el) => { if (el) matchRefs.current[match.matchId] = el; }}
                  className="bracket-grid-cell"
                  style={{
                    gridColumn: round.roundIndex + 1,
                    gridRow: `${row + 1} / span ${span}`,
                  }}
                >
                  <MatchCell
                    match={match}
                    roundName={round.name}
                    onOpen={(clickedName) => openMatch(match, round.name, clickedName)}
                  />
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Paper-style match cell: two slots (top/bottom) with a divider, like printed brackets.
 */
function MatchCell({ match, onOpen, roundName }) {
  const slot1 = match.slot1 || '';
  const slot2 = match.slot2 || '';
  const winner = match.winner;
  const games = gamesFromElimScore(match.score);
  const decided = Boolean(winner);
  const ready = isElimNamedPlayer(slot1) && isElimNamedPlayer(slot2);

  return (
    <div className="bracket-match-paper">
      <BracketSlot
        className="top"
        name={slot1}
        games={games.p1}
        isWinner={winner === slot1}
        isLoser={decided && isElimNamedPlayer(slot1) && winner !== slot1}
        onClick={() => slot1 && onOpen(slot1)}
        title={ready ? `Enter result for ${roundName}` : ''}
      />
      <div className="bracket-match-divider" />
      <BracketSlot
        className="bottom"
        name={slot2}
        games={games.p2}
        isWinner={winner === slot2}
        isLoser={decided && isElimNamedPlayer(slot2) && winner !== slot2}
        onClick={() => slot2 && onOpen(slot2)}
        title={ready ? `Enter result for ${roundName}` : ''}
      />
    </div>
  );
}

export function BracketSlot({ className = '', name, games, isWinner, isLoser, onClick, title }) {
  const slotClass = [
    'bracket-slot-paper',
    className,
    isWinner ? 'winner' : '',
    isLoser ? 'loser' : '',
  ].filter(Boolean).join(' ');
  return (
    <div className={slotClass} onClick={onClick} title={title}>
      <span className="bracket-slot-name">{name || '—'}</span>
      {games !== '' ? <span className="bracket-slot-games">{games}</span> : null}
    </div>
  );
}

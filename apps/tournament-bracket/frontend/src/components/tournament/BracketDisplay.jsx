import React, { useMemo, useRef, useEffect, useState } from 'react';
import { setWinnerAndAdvance, setLoserBracketWinner } from './bracketLogic';
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
export default function BracketDisplay({ rounds, onUpdate, grandFinalRef, bracketKind = 'winners' }) {
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
                    onSetWinner={handleSetWinner}
                    roundName={round.name}
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
function MatchCell({ match, onSetWinner, roundName }) {
  const slot1 = match.slot1 || '';
  const slot2 = match.slot2 || '';
  const winner = match.winner;
  const display1 = slot1 || '—';
  const display2 = slot2 || '—';

  const setWinner = (name) => {
    if (name === 'Bye' || !name) return;
    onSetWinner(match.matchId, name);
  };

  return (
    <div className="bracket-match-paper">
      <div
        className={`bracket-slot-paper top ${winner === match.slot1 ? 'winner' : ''}`}
        onClick={() => match.slot1 && setWinner(match.slot1)}
        title={match.slot1 ? `Click to set ${match.slot1} as winner` : ''}
      >
        {display1}
      </div>
      <div className="bracket-match-divider" />
      <div
        className={`bracket-slot-paper bottom ${winner === match.slot2 ? 'winner' : ''}`}
        onClick={() => match.slot2 && setWinner(match.slot2)}
        title={match.slot2 ? `Click to set ${match.slot2} as winner` : ''}
      >
        {display2}
      </div>
    </div>
  );
}

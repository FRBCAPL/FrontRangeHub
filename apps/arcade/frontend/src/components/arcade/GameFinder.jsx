import React, { useEffect, useMemo, useState } from 'react';
import arcadeService from '@shared/services/arcadeService.js';
import { searchGames } from '../../utils/searchGames.js';
import './GameFinder.css';

const gameResultKey = (game) => `${game.number}|${game.name}`;

const GameFinder = ({ games, machineId, query, onQueryChange, onOpenLeaderboard, topScoreRefreshKey = 0 }) => {
  const results = useMemo(() => searchGames(games, query), [games, query]);
  const [topScores, setTopScores] = useState({});

  useEffect(() => {
    if (!results.length || !machineId) {
      setTopScores({});
      return undefined;
    }

    let cancelled = false;

    const loadTopScores = async () => {
      const entries = await Promise.all(
        results.map(async (game) => {
          const leader = await arcadeService.getTopScore(machineId, game.number, game.name);
          return [gameResultKey(game), leader];
        })
      );

      if (!cancelled) {
        setTopScores(Object.fromEntries(entries));
      }
    };

    loadTopScores();
    return () => {
      cancelled = true;
    };
  }, [results, machineId, topScoreRefreshKey]);

  return (
    <div className="arcade-finder">
      <div className="arcade-finder-search">
        <p className="arcade-finder-hint">Type a game name to find its menu number.</p>

        <input
          type="search"
          className="arcade-finder-input"
          placeholder="Galaga, Donkey Kong, Pac-Man…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          autoComplete="off"
          autoFocus
        />
      </div>

      {query.trim() && results.length === 0 && (
        <p className="arcade-finder-empty">No games match &ldquo;{query}&rdquo;</p>
      )}

      <ul className="arcade-finder-results">
        {results.map((game) => {
          const leader = topScores[gameResultKey(game)];
          return (
            <li key={`${game.number}-${game.name}`}>
              <button
                type="button"
                className="arcade-finder-result"
                onClick={() => onOpenLeaderboard?.(game)}
              >
                <span className="arcade-finder-number">#{game.number}</span>
                <span className="arcade-finder-name">{game.name}</span>
                <span className="arcade-finder-top-score">
                  <span className="arcade-finder-top-label">#1</span>
                  {leader ? (
                    <>
                      <span className="arcade-finder-top-initials">{leader.initials}</span>
                      <span className="arcade-finder-top-points">{leader.score.toLocaleString()}</span>
                    </>
                  ) : (
                    <span className="arcade-finder-top-empty">No High Scores Yet</span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default GameFinder;

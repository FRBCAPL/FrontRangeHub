import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DEFAULT_MACHINE, SAMPLE_GAMES } from '../../data/sampleGames.js';
import { findGameBySlug } from '../../utils/searchGames.js';
import arcadeService from '@shared/services/arcadeService.js';
import './ArcadeTvView.css';

const REFRESH_INTERVAL_MS = 30 * 1000;
const ROTATE_INTERVAL_MS = 20 * 1000;
const TOP_SCORES_LIMIT = 10;

const ArcadeTvView = () => {
  const [searchParams] = useSearchParams();
  const gameSlug = searchParams.get('game');
  const rotateMode = !gameSlug || searchParams.get('rotate') === '1';
  const isPortrait = searchParams.get('layout') === '9x16';

  const pinnedGame = useMemo(
    () => (gameSlug ? findGameBySlug(SAMPLE_GAMES, gameSlug) : null),
    [gameSlug]
  );

  const [rotateIndex, setRotateIndex] = useState(0);
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clock, setClock] = useState(() => new Date());

  const activeGame = rotateMode
    ? SAMPLE_GAMES[rotateIndex % SAMPLE_GAMES.length]
    : pinnedGame || SAMPLE_GAMES[0];

  useEffect(() => {
    const tick = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (!rotateMode) return undefined;
    const rotate = setInterval(() => {
      setRotateIndex((i) => (i + 1) % SAMPLE_GAMES.length);
    }, ROTATE_INTERVAL_MS);
    return () => clearInterval(rotate);
  }, [rotateMode]);

  useEffect(() => {
    if (!activeGame) return undefined;
    let cancelled = false;

    const loadScores = async () => {
      const result = await arcadeService.getScores(
        DEFAULT_MACHINE.id,
        activeGame.number,
        activeGame.name
      );
      if (!cancelled) {
        setScores((result.data || []).slice(0, TOP_SCORES_LIMIT));
        setLoading(false);
      }
    };

    setLoading(true);
    loadScores();
    const refresh = setInterval(loadScores, REFRESH_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(refresh);
    };
  }, [activeGame]);

  if (!activeGame) {
    return (
      <div className={`arcade-tv ${isPortrait ? 'portrait' : 'landscape'}`}>
        <p className="arcade-tv-empty">No games configured.</p>
      </div>
    );
  }

  return (
    <div className={`arcade-tv ${isPortrait ? 'portrait' : 'landscape'}`}>
      <header className="arcade-tv-header">
        <div className="arcade-tv-brand">
          <span className="arcade-tv-logo">🎮</span>
          <div>
            <h1>{DEFAULT_MACHINE.name}</h1>
            <p>{DEFAULT_MACHINE.location}</p>
          </div>
        </div>
        <div className="arcade-tv-clock">
          {clock.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
        </div>
      </header>

      <section className="arcade-tv-game-banner">
        <span className="arcade-tv-game-number">#{activeGame.number}</span>
        <h2 className="arcade-tv-game-name">{activeGame.name}</h2>
        {rotateMode && <span className="arcade-tv-rotate-badge">Rotating</span>}
      </section>

      <section className="arcade-tv-board">
        <h3>High Scores</h3>
        {loading ? (
          <p className="arcade-tv-status">Loading…</p>
        ) : scores.length === 0 ? (
          <p className="arcade-tv-status">No scores yet — be the first!</p>
        ) : (
          <ol className="arcade-tv-scores">
            {scores.map((entry, index) => (
              <li key={`${entry.initials}-${entry.score}-${index}`} className="arcade-tv-score-row">
                <span className="arcade-tv-rank">{index + 1}</span>
                <span className="arcade-tv-initials">{entry.initials}</span>
                <span className="arcade-tv-score">{entry.score.toLocaleString()}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <footer className="arcade-tv-footer">
        Submit your score on the cabinet tablet
      </footer>
    </div>
  );
};

export default ArcadeTvView;

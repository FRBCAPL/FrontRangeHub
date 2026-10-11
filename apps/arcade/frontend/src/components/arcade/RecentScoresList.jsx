import React, { useEffect, useState } from 'react';
import arcadeService from '@shared/services/arcadeService.js';
import './RecentScoresList.css';

const timeAgo = (iso) => {
  const ms = Date.now() - Date.parse(iso);
  if (!Number.isFinite(ms)) return '';
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'yesterday' : `${days} days ago`;
};

/** Newest leaderboard posts — shown in the Game Finder before the user types. */
const RecentScoresList = ({ games, machineId, refreshKey = 0, onOpenLeaderboard }) => {
  const [scores, setScores] = useState([]);

  useEffect(() => {
    let cancelled = false;
    arcadeService.getRecentScores(machineId).then((rows) => {
      if (!cancelled) setScores(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [machineId, refreshKey]);

  if (!scores.length) return null;

  const openGame = (row) => {
    const game = games.find((g) => String(g.number) === String(row.game_number))
      || { number: row.game_number, name: row.game_name || '' };
    onOpenLeaderboard?.(game);
  };

  return (
    <section className="arcade-recent" aria-label="Newest high scores">
      <h2 className="arcade-recent-title">🆕 New High Scores</h2>
      <ul className="arcade-finder-results arcade-recent-list">
        {scores.map((row) => {
          const game = games.find((g) => String(g.number) === String(row.game_number));
          const name = (game?.name || row.game_name || `Game ${row.game_number}`).toUpperCase();
          return (
            <li key={row.id}>
              <button type="button" className="arcade-finder-result" onClick={() => openGame(row)}>
                <span className="arcade-finder-number">#{row.game_number}</span>
                <span className="arcade-finder-name">{name}</span>
                <span className="arcade-finder-top-score">
                  <span className="arcade-finder-top-label">{timeAgo(row.updated_at)}</span>
                  <span className="arcade-finder-top-initials">{row.initials}</span>
                  <span className="arcade-finder-top-points">{Number(row.score).toLocaleString()}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default RecentScoresList;

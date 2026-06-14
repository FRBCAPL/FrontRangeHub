import React, { useEffect, useState } from 'react';
import arcadeService from '@shared/services/arcadeService.js';
import './LeaderboardPanel.css';

const MEDALS = ['🥇', '🥈', '🥉'];

const LeaderboardPanel = ({ games, machineId, initialGame = null }) => {
  const [selectedGame, setSelectedGame] = useState(initialGame || games[0] || null);
  const [scores, setScores] = useState([]);
  const [initials, setInitials] = useState('');
  const [scoreValue, setScoreValue] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialGame) {
      setSelectedGame(initialGame);
      setStatus('');
    }
  }, [initialGame]);

  useEffect(() => {
    if (!selectedGame) return;
    let cancelled = false;

    const loadScores = async () => {
      setLoading(true);
      const result = await arcadeService.getScores(machineId, selectedGame.number, selectedGame.name);
      if (!cancelled) {
        setScores(result.data || []);
        setLoading(false);
      }
    };

    loadScores();
    return () => {
      cancelled = true;
    };
  }, [machineId, selectedGame]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedGame) return;

    const parsedScore = Number(String(scoreValue).replace(/,/g, ''));
    if (!initials.trim() || !Number.isFinite(parsedScore) || parsedScore <= 0) {
      setStatus('Enter initials and a valid score.');
      return;
    }

    setStatus('Saving…');
    const result = await arcadeService.submitScore({
      machineId,
      gameNumber: selectedGame.number,
      gameName: selectedGame.name,
      initials: initials.trim().toUpperCase().slice(0, 3),
      score: Math.floor(parsedScore)
    });

    if (!result.success) {
      setStatus(result.error || 'Could not save score.');
      return;
    }

    setScores(result.data || []);
    setInitials('');
    setScoreValue('');
    setStatus('Score saved!');
  };

  if (!games.length) {
    return <p className="arcade-leaderboard-empty">No games loaded yet.</p>;
  }

  return (
    <div className="arcade-leaderboard">
      <label className="arcade-leaderboard-label">
        Game
        <select
          className="arcade-leaderboard-select"
          value={selectedGame ? `${selectedGame.number}|${selectedGame.name}` : ''}
          onChange={(e) => {
            const [number, ...nameParts] = e.target.value.split('|');
            const name = nameParts.join('|');
            setSelectedGame(games.find((g) => String(g.number) === number && g.name === name) || null);
            setStatus('');
          }}
        >
          {games.map((game) => (
            <option key={`${game.number}-${game.name}`} value={`${game.number}|${game.name}`}>
              #{game.number} — {game.name}
            </option>
          ))}
        </select>
      </label>

      <div className="arcade-leaderboard-board">
        <h3>{selectedGame?.name} — Legends Leaderboard</h3>
        {loading ? (
          <p className="arcade-leaderboard-status">Loading…</p>
        ) : scores.length === 0 ? (
          <p className="arcade-leaderboard-status">No scores yet. Be the first!</p>
        ) : (
          <>
            <div className="arcade-leaderboard-podium">
              {scores.slice(0, 3).map((entry, index) => (
                <div key={`podium-${entry.initials}-${entry.score}`} className="arcade-leaderboard-podium-row">
                  <span className="arcade-leaderboard-podium-medal">{MEDALS[index]}</span>
                  <span className="arcade-leaderboard-podium-score">{entry.score.toLocaleString()}</span>
                  <span className="arcade-leaderboard-podium-dash">—</span>
                  <span className="arcade-leaderboard-podium-initials">{entry.initials}</span>
                </div>
              ))}
            </div>
            {scores.length > 3 && (
              <ol className="arcade-leaderboard-list arcade-leaderboard-list--rest">
                {scores.slice(3).map((entry, index) => (
                  <li key={`${entry.initials}-${entry.score}-${index + 3}`}>
                    <span className="arcade-leaderboard-rank">{index + 4}</span>
                    <span className="arcade-leaderboard-initials">{entry.initials}</span>
                    <span className="arcade-leaderboard-score">{entry.score.toLocaleString()}</span>
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
      </div>

      <form className="arcade-leaderboard-form" onSubmit={handleSubmit}>
        <p className="arcade-leaderboard-form-title">Manual score entry (V2)</p>
        <div className="arcade-leaderboard-form-row">
          <input
            type="text"
            maxLength={3}
            placeholder="INI"
            value={initials}
            onChange={(e) => setInitials(e.target.value.toUpperCase())}
            className="arcade-leaderboard-input initials"
          />
          <input
            type="number"
            min="1"
            placeholder="Score"
            value={scoreValue}
            onChange={(e) => setScoreValue(e.target.value)}
            className="arcade-leaderboard-input score"
          />
          <button type="submit" className="arcade-leaderboard-submit">
            Save
          </button>
        </div>
        {status && <p className="arcade-leaderboard-status">{status}</p>}
      </form>
    </div>
  );
};

export default LeaderboardPanel;

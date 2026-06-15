import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import arcadeService from '@shared/services/arcadeService.js';
import { DEFAULT_MACHINE, SAMPLE_GAMES } from '../../data/sampleGames.js';
import './ArcadeAdmin.css';

const MACHINE_ID = DEFAULT_MACHINE.id;

const ArcadeAdmin = () => {
  const [machine, setMachine] = useState(null);
  const [gameNumber, setGameNumber] = useState(String(SAMPLE_GAMES[0]?.number || 1));
  const [scores, setScores] = useState([]);
  const [scoresSource, setScoresSource] = useState('');
  const [status, setStatus] = useState('');
  const [loadingScores, setLoadingScores] = useState(false);
  const [priceText, setPriceText] = useState('2 quarters ($0.50)');
  const [maintenanceMessage, setMaintenanceMessage] = useState(
    'Arcade cabinet is temporarily down for maintenance. Check back soon!'
  );
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const selectedGame = useMemo(
    () => SAMPLE_GAMES.find((g) => String(g.number) === gameNumber) || SAMPLE_GAMES[0],
    [gameNumber]
  );

  const loadMachine = useCallback(async () => {
    const result = await arcadeService.getMachine(MACHINE_ID);
    if (result.success && result.data) {
      setMachine(result.data);
      setMaintenanceMode(Boolean(result.data.maintenance_mode));
      setMaintenanceMessage(
        result.data.maintenance_message
          || 'Arcade cabinet is temporarily down for maintenance. Check back soon!'
      );
      setPriceText(result.data.price_text || '2 quarters ($0.50)');
    }
  }, []);

  const loadScores = useCallback(async () => {
    if (!selectedGame) return;
    setLoadingScores(true);
    setStatus('');
    const result = await arcadeService.getAllScores(MACHINE_ID, selectedGame.number, selectedGame.name);
    setScores(result.data || []);
    setScoresSource(result.source || '');
    setLoadingScores(false);
  }, [selectedGame]);

  useEffect(() => {
    loadMachine();
  }, [loadMachine]);

  useEffect(() => {
    loadScores();
  }, [loadScores]);

  const handleDelete = async (scoreId, initials) => {
    if (!window.confirm(`Delete score for ${initials}?`)) return;
    const result = await arcadeService.deleteScore(scoreId);
    if (result.success) {
      setStatus(`Deleted ${initials}.`);
      loadScores();
    } else {
      setStatus(result.error || 'Delete failed.');
    }
  };

  const handleEdit = async (scoreId, initials, currentScore) => {
    const raw = window.prompt(`New score for ${initials}:`, String(currentScore));
    if (raw === null) return;
    const next = parseInt(raw, 10);
    const result = await arcadeService.updateScoreValue(scoreId, next);
    if (result.success) {
      setStatus(`Updated ${initials}.`);
      loadScores();
    } else {
      setStatus(result.error || 'Update failed.');
    }
  };

  const saveCabinetSettings = async () => {
    const result = await arcadeService.updateMachine(MACHINE_ID, {
      maintenance_mode: maintenanceMode,
      maintenance_message: maintenanceMessage.trim(),
      price_text: priceText.trim()
    });
    if (result.success) {
      setStatus('Cabinet settings saved.');
      loadMachine();
    } else {
      setStatus(result.error || 'Could not save settings. Run arcade-admin-migration.sql in Supabase.');
    }
  };

  return (
    <div className="arcade-admin">
      <header className="arcade-admin-header">
        <h1>Arcade Admin</h1>
        <p>{DEFAULT_MACHINE.name} — score cleanup &amp; cabinet controls</p>
      </header>

      {status ? <p className="arcade-admin-status">{status}</p> : null}

      <section className="arcade-admin-card">
        <h2>Scores</h2>
        <p className="arcade-admin-hint">Fix bogus or prank entries. Source: {scoresSource || '…'}</p>
        <label className="arcade-admin-label">
          Game
          <select value={gameNumber} onChange={(e) => setGameNumber(e.target.value)}>
            {SAMPLE_GAMES.map((game) => (
              <option key={game.number} value={String(game.number)}>
                #{game.number} — {game.name}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="arcade-admin-btn" onClick={loadScores} disabled={loadingScores}>
          {loadingScores ? 'Loading…' : 'Refresh scores'}
        </button>
        <ul className="arcade-admin-score-list">
          {scores.length === 0 ? (
            <li className="arcade-admin-empty">No scores for this game.</li>
          ) : (
            scores.map((row) => (
              <li key={row.id} className="arcade-admin-score-row">
                <span className="arcade-admin-ini">{row.initials}</span>
                <span className="arcade-admin-score-val">{row.score}</span>
                <button type="button" onClick={() => handleEdit(row.id, row.initials, row.score)}>Edit</button>
                <button type="button" className="danger" onClick={() => handleDelete(row.id, row.initials)}>Delete</button>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="arcade-admin-card">
        <h2>Cabinet</h2>
        <label className="arcade-admin-check">
          <input
            type="checkbox"
            checked={maintenanceMode}
            onChange={(e) => setMaintenanceMode(e.target.checked)}
          />
          Maintenance mode (kiosk shows down message)
        </label>
        <label className="arcade-admin-label">
          Maintenance message
          <textarea
            rows={3}
            value={maintenanceMessage}
            onChange={(e) => setMaintenanceMessage(e.target.value)}
          />
        </label>
        <label className="arcade-admin-label">
          Pricing text (How to Play line 1)
          <input
            type="text"
            value={priceText}
            onChange={(e) => setPriceText(e.target.value)}
            placeholder="2 quarters ($0.50)"
          />
        </label>
        <button type="button" className="arcade-admin-btn primary" onClick={saveCabinetSettings}>
          Save cabinet settings
        </button>
        {machine ? (
          <p className="arcade-admin-meta">Machine active: {machine.is_active !== false ? 'yes' : 'no'}</p>
        ) : null}
      </section>

      <section className="arcade-admin-card">
        <h2>Tools</h2>
        <p className="arcade-admin-hint">
          Game list updates require redeploy after <code>node scripts/export-arcade-games-json.cjs</code>.
          OCR is not built yet.
        </p>
        <div className="arcade-admin-links">
          <a href="/arcade-kiosk-lite/" target="_blank" rel="noreferrer">Open lite kiosk</a>
          <a href="/arcade-kiosk-lite/admin.html" target="_blank" rel="noreferrer">Lite admin (PIN)</a>
          <a href="/arcade-tablet-diag.html" target="_blank" rel="noreferrer">Tablet diagnostics</a>
          <Link to="/arcade/kiosk">React kiosk</Link>
          <a href={`/arcade-kiosk-lite/?t=${Date.now()}`} target="_blank" rel="noreferrer">Reload kiosk (cache bust)</a>
        </div>
      </section>
    </div>
  );
};

export default ArcadeAdmin;

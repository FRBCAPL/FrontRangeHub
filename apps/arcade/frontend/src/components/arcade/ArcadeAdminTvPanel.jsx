import React, { useCallback, useEffect, useMemo, useState } from 'react';
import arcadeService from '@shared/services/arcadeService.js';
import { DEFAULT_MACHINE, SAMPLE_GAMES } from '../../data/sampleGames.js';

const MACHINE_ID = DEFAULT_MACHINE.id;
const MIN_COUNT = 1;
const MAX_COUNT = 20;

const clampCount = (value) => {
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return 8;
  return Math.max(MIN_COUNT, Math.min(MAX_COUNT, n));
};

const ArcadeAdminTvPanel = ({ onStatus }) => {
  const [count, setCount] = useState(8);
  const [autoMode, setAutoMode] = useState(true);
  const [picked, setPicked] = useState([]);
  const [addGame, setAddGame] = useState('');
  const [gomNumber, setGomNumber] = useState(4);
  const [gomPrize, setGomPrize] = useState('WIN A FREE BURGER');
  const [gomSubtitle, setGomSubtitle] = useState('Highest score wins — ask staff for details!');
  const [panelStatus, setPanelStatus] = useState('');
  const [saving, setSaving] = useState(false);

  const games = SAMPLE_GAMES;

  const loadSettings = useCallback(async () => {
    const result = await arcadeService.getMachine(MACHINE_ID);
    if (!result.success || !result.data) {
      setPanelStatus('Could not load TV settings from Supabase.');
      return;
    }
    const row = result.data;
    const nextCount = clampCount(row.tv_rotation_count || 8);
    const nums = Array.isArray(row.tv_rotation_games)
      ? row.tv_rotation_games.map((n) => parseInt(n, 10)).filter(Boolean)
      : [];

    setCount(nextCount);
    if (nums.length) {
      setAutoMode(false);
      setPicked(nums.slice(0, nextCount));
    } else {
      setAutoMode(true);
      setPicked([]);
    }
    setGomNumber(parseInt(row.tv_gom_number, 10) || 4);
    setGomPrize(row.tv_gom_prize || 'WIN A FREE BURGER');
    setGomSubtitle(row.tv_gom_subtitle || 'Highest score wins — ask staff for details!');
    setPanelStatus('');
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const pickedGames = useMemo(
    () => picked.map((num) => games.find((g) => g.number === num) || { number: num, name: `Game ${num}` }),
    [picked, games]
  );

  const handleAddGame = () => {
    const num = parseInt(addGame, 10);
    if (!num) {
      setPanelStatus('Choose a game from the list first.');
      return;
    }
    if (picked.includes(num)) {
      setPanelStatus('That game is already in the list.');
      return;
    }
    if (picked.length >= count) {
      setPanelStatus(`Remove a game first — limit is ${count}.`);
      return;
    }
    setPicked([...picked, num]);
    setAddGame('');
    setPanelStatus('');
  };

  const handleRemove = (num) => {
    setPicked(picked.filter((n) => n !== num));
    setPanelStatus('');
  };

  const handleCountChange = (value) => {
    const next = clampCount(value);
    setCount(next);
    if (picked.length > next) {
      setPicked(picked.slice(0, next));
    }
  };

  const saveSettings = async () => {
    if (!autoMode && !picked.length) {
      setPanelStatus('Pick at least one game, or enable automatic selection.');
      return;
    }
    setSaving(true);
    setPanelStatus('');
    const result = await arcadeService.updateMachine(MACHINE_ID, {
      tv_rotation_count: count,
      tv_rotation_games: autoMode ? [] : picked.slice(0, count),
      tv_gom_number: gomNumber || 4,
      tv_gom_prize: gomPrize.trim() || 'WIN A FREE BURGER',
      tv_gom_subtitle: gomSubtitle.trim()
    });
    setSaving(false);
    if (result.success) {
      const msg = autoMode
        ? `TV settings saved — automatic rotation (max ${count} games).`
        : `TV settings saved — showing ${picked.length} picked game(s).`;
      onStatus(msg);
      setPanelStatus('');
      loadSettings();
    } else {
      setPanelStatus(result.error || 'Could not save. Run arcade TV migrations in Supabase.');
    }
  };

  return (
    <section className="arcade-admin-panel arcade-admin-tv-panel" role="tabpanel">
      <p className="arcade-admin-hint">
        Controls which games rotate on the TV leaderboard at{' '}
        <a href="/arcade/tv" target="_blank" rel="noreferrer">/arcade/tv</a>.
      </p>

      <label className="arcade-admin-label">
        Games to rotate (high score slides)
        <input
          type="number"
          min={MIN_COUNT}
          max={MAX_COUNT}
          value={count}
          onChange={(e) => handleCountChange(e.target.value)}
        />
      </label>

      <label className="arcade-admin-check">
        <input
          type="checkbox"
          checked={autoMode}
          onChange={(e) => setAutoMode(e.target.checked)}
        />
        Automatic game selection (classics with scores first, then others, then unscored classics)
      </label>

      {!autoMode ? (
        <div className="arcade-admin-tv-pick">
          <p className="arcade-admin-tv-picked-count">
            {picked.length} / {count} games selected
          </p>
          <ul className="arcade-admin-tv-picked-list">
            {picked.length === 0 ? (
              <li className="arcade-admin-empty">No games picked yet — add games below.</li>
            ) : (
              pickedGames.map((game) => (
                <li key={game.number} className="arcade-admin-tv-picked-row">
                  <span>#{game.number} — {game.name}</span>
                  <button type="button" onClick={() => handleRemove(game.number)}>Remove</button>
                </li>
              ))
            )}
          </ul>
          <div className="arcade-admin-tv-add-row">
            <select value={addGame} onChange={(e) => setAddGame(e.target.value)} disabled={picked.length >= count}>
              <option value="">Choose a game…</option>
              {games.map((game) => (
                <option key={game.number} value={String(game.number)}>
                  #{game.number} — {game.name}
                </option>
              ))}
            </select>
            <button type="button" className="arcade-admin-btn" onClick={handleAddGame} disabled={picked.length >= count}>
              Add game
            </button>
          </div>
        </div>
      ) : null}

      <hr className="arcade-admin-tv-divider" />
      <h2 className="arcade-admin-section-title">Game of the Month</h2>
      <p className="arcade-admin-hint">Promo slide on the TV rotation.</p>

      <label className="arcade-admin-label">
        Game
        <select value={String(gomNumber)} onChange={(e) => setGomNumber(parseInt(e.target.value, 10) || 4)}>
          {games.map((game) => (
            <option key={game.number} value={String(game.number)}>
              #{game.number} — {game.name}
            </option>
          ))}
        </select>
      </label>

      <label className="arcade-admin-label">
        Prize line
        <input
          type="text"
          value={gomPrize}
          onChange={(e) => setGomPrize(e.target.value)}
          placeholder="WIN A FREE BURGER"
        />
      </label>

      <label className="arcade-admin-label">
        Subtitle (optional)
        <input
          type="text"
          value={gomSubtitle}
          onChange={(e) => setGomSubtitle(e.target.value)}
          placeholder="Highest score wins — ask staff for details!"
        />
      </label>

      <button type="button" className="arcade-admin-btn primary" onClick={saveSettings} disabled={saving}>
        {saving ? 'Saving…' : 'Save TV settings'}
      </button>

      {panelStatus ? <p className="arcade-admin-tv-status">{panelStatus}</p> : null}
    </section>
  );
};

export default ArcadeAdminTvPanel;

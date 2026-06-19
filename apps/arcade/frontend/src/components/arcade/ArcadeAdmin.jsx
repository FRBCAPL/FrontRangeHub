import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import arcadeService from '@shared/services/arcadeService.js';
import { DEFAULT_MACHINE, SAMPLE_GAMES } from '../../data/sampleGames.js';
import ArcadeAdminEditModal from './ArcadeAdminEditModal.jsx';
import ArcadeAdminTvPanel from './ArcadeAdminTvPanel.jsx';
import './ArcadeAdmin.css';

const MACHINE_ID = DEFAULT_MACHINE.id;

const TABS = [
  { id: 'scores', label: 'Scores' },
  { id: 'cabinet', label: 'Cabinet' },
  { id: 'tv', label: 'TV Display' },
  { id: 'tools', label: 'Tools' }
];

const ArcadeAdmin = () => {
  const [activeTab, setActiveTab] = useState('scores');
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
  const [editingRow, setEditingRow] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [addName, setAddName] = useState('');
  const [addScore, setAddScore] = useState('');
  const [addSaving, setAddSaving] = useState(false);

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
    if (activeTab === 'scores') {
      loadScores();
    }
  }, [activeTab, loadScores]);

  const closeEditModal = () => {
    if (editSaving) return;
    setEditingRow(null);
    setEditError('');
  };

  const openEditModal = (row) => {
    setEditError('');
    setEditingRow(row);
  };

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

  const handleEditSave = async ({ initials, score }) => {
    if (!editingRow) return;
    if (!initials || !score || score <= 0) {
      setEditError('Enter valid initials and score.');
      return;
    }
    setEditSaving(true);
    setEditError('');
    const result = await arcadeService.updateScoreEntry(editingRow.id, { initials, score });
    setEditSaving(false);
    if (result.success) {
      setStatus('Score updated.');
      setEditingRow(null);
      loadScores();
    } else {
      setEditError(result.error || 'Update failed.');
    }
  };

  const handleAddScore = async (e) => {
    e.preventDefault();
    if (!selectedGame) return;
    const name = addName.trim().slice(0, 40);
    const score = parseInt(addScore, 10);
    if (!name || !score || score <= 0) {
      setStatus('Enter a name and score greater than zero.');
      return;
    }
    setAddSaving(true);
    setStatus('');
    const result = await arcadeService.adminAddScore({
      machineId: MACHINE_ID,
      gameNumber: selectedGame.number,
      gameName: selectedGame.name,
      initials: name,
      score
    });
    setAddSaving(false);
    if (result.success) {
      setStatus(result.updated ? `Updated score for ${name}.` : `Added score for ${name}.`);
      setAddName('');
      setAddScore('');
      loadScores();
    } else {
      setStatus(result.error || 'Could not add score.');
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
        <p>{DEFAULT_MACHINE.name}</p>
      </header>

      <nav className="arcade-admin-tabs" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            className={`arcade-admin-tab${activeTab === tab.id ? ' active' : ''}`}
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {status ? <p className="arcade-admin-status">{status}</p> : null}

      {activeTab === 'scores' ? (
        <section className="arcade-admin-panel" role="tabpanel">
          <p className="arcade-admin-hint">Add scores manually or fix bogus entries. Source: {scoresSource || '…'}</p>
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

          <form className="arcade-admin-add-score" onSubmit={handleAddScore}>
            <h2 className="arcade-admin-section-title">Add score</h2>
            <label className="arcade-admin-label">
              Name on leaderboard
              <input
                type="text"
                maxLength={40}
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="e.g. Alex S or ABC"
              />
            </label>
            <label className="arcade-admin-label">
              Score
              <input
                type="number"
                min={1}
                value={addScore}
                onChange={(e) => setAddScore(e.target.value)}
                placeholder="12345"
              />
            </label>
            <button type="submit" className="arcade-admin-btn primary" disabled={addSaving}>
              {addSaving ? 'Saving…' : 'Add score'}
            </button>
          </form>

          <hr className="arcade-admin-tv-divider" />

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
                  <button type="button" onClick={() => openEditModal(row)}>Edit</button>
                  <button type="button" className="danger" onClick={() => handleDelete(row.id, row.initials)}>Delete</button>
                </li>
              ))
            )}
          </ul>
        </section>
      ) : null}

      {activeTab === 'cabinet' ? (
        <section className="arcade-admin-panel" role="tabpanel">
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
      ) : null}

      {activeTab === 'tv' ? (
        <ArcadeAdminTvPanel onStatus={setStatus} />
      ) : null}

      {activeTab === 'tools' ? (
        <section className="arcade-admin-panel" role="tabpanel">
          <p className="arcade-admin-hint">
            Game list updates require redeploy after <code>node scripts/export-arcade-games-json.cjs</code>.
            OCR is not built yet.
          </p>
          <p className="arcade-admin-hint">
            <strong>Pending score photos</strong> (from QR / phone submit) are on the lite staff page — not here.
          </p>
          <div className="arcade-admin-links">
            <a href="/arcade/tv" target="_blank" rel="noreferrer">Open TV leaderboard</a>
            <a href="/arcade-kiosk-lite/admin.html" target="_blank" rel="noreferrer">Review pending score photos (PIN)</a>
            <a href="/arcade-kiosk-lite/" target="_blank" rel="noreferrer">Open lite kiosk</a>
            <a href="/arcade-tablet-diag.html" target="_blank" rel="noreferrer">Tablet diagnostics</a>
            <Link to="/arcade/kiosk">React kiosk</Link>
            <a href={`/arcade-kiosk-lite/?t=${Date.now()}`} target="_blank" rel="noreferrer">Reload kiosk (cache bust)</a>
          </div>
        </section>
      ) : null}

      <ArcadeAdminEditModal
        row={editingRow}
        gameName={selectedGame?.name}
        saving={editSaving}
        error={editError}
        onClose={closeEditModal}
        onSave={handleEditSave}
      />
    </div>
  );
};

export default ArcadeAdmin;

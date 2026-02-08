import React, { useState } from 'react';
import AddPlayerModal from './AddPlayerModal';
import './CreateTournamentForm.css';

/**
 * Form to create a new tournament: name, type (single/double elim), and players added via Add Player modal.
 */
export default function CreateTournamentForm({ onSubmit, onCancel }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('single');
  const [players, setPlayers] = useState([]);
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);

  const handleAddPlayer = (player) => {
    setPlayers((prev) => [...prev, player]);
  };

  const handleRemovePlayer = (index) => {
    setPlayers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (players.length < 2) {
      alert('Please add at least 2 players using the Add Player button.');
      return;
    }
    const entrantNames = players.map((p) => p.name);
    onSubmit({
      name: name || 'Pool Tournament',
      type,
      entrantNames,
      entrants: players,
    });
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
  };

  return (
    <>
      <form className="create-tournament-form" onSubmit={handleSubmit}>
        <h3>New Tournament</h3>
        <label>
          Tournament name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Friday Night 8-Ball"
          />
        </label>
        <label>
          Format
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="single">Single elimination</option>
            <option value="double">Double elimination</option>
          </select>
        </label>
        <label>
          Players
          <div className="players-section">
            <button
              type="button"
              className="add-player-btn"
              onClick={() => setShowAddPlayerModal(true)}
            >
              + Add Player
            </button>
            {players.length > 0 && (
              <ul className="players-list">
                {players.map((p, i) => (
                  <li key={i} className="player-list-item">
                    <span className="player-list-name">{p.name}</span>
                    {(p.league || p.rank || p.fargorate) && (
                      <span className="player-list-detail">
                        {[p.league, p.rank, p.fargorate].filter(Boolean).join(' · ')}
                      </span>
                    )}
                    <button
                      type="button"
                      className="player-list-remove"
                      onClick={() => handleRemovePlayer(i)}
                      aria-label={`Remove ${p.name}`}
                    >
                      &times;
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {players.length > 0 && (
              <p className="players-count">{players.length} player{players.length !== 1 ? 's' : ''} added</p>
            )}
          </div>
        </label>
        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={handleCancel}>
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            Create bracket
          </button>
        </div>
      </form>

      <AddPlayerModal
        isOpen={showAddPlayerModal}
        onClose={() => setShowAddPlayerModal(false)}
        onAdd={handleAddPlayer}
      />
    </>
  );
}

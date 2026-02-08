import React, { useState } from 'react';
import './AddPlayerModal.css';

/**
 * Modal to add a player with name, email, league, rank, FargoRate.
 */
export default function AddPlayerModal({ isOpen, onClose, onAdd }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [league, setLeague] = useState('');
  const [rank, setRank] = useState('');
  const [fargorate, setFargorate] = useState('');

  const reset = () => {
    setName('');
    setEmail('');
    setLeague('');
    setRank('');
    setFargorate('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      alert('Please enter a name.');
      return;
    }
    onAdd({
      name: trimmedName,
      email: email.trim() || '',
      league: league.trim() || '',
      rank: rank.trim() || '',
      fargorate: fargorate.trim() || '',
    });
    reset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="add-player-modal-overlay" onClick={handleClose} role="dialog" aria-modal="true" aria-label="Add player">
      <div className="add-player-modal" onClick={(e) => e.stopPropagation()}>
        <div className="add-player-modal-header">
          <h3>Add Player</h3>
          <button type="button" className="add-player-modal-close" onClick={handleClose} aria-label="Close">
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit} className="add-player-modal-form">
          <label>
            Name <span className="required">*</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Player name"
              autoFocus
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
            />
          </label>
          <label>
            League
            <input
              type="text"
              value={league}
              onChange={(e) => setLeague(e.target.value)}
              placeholder="e.g. Front Range BCA"
            />
          </label>
          <label>
            Rank
            <input
              type="text"
              value={rank}
              onChange={(e) => setRank(e.target.value)}
              placeholder="e.g. A, B, C or 500"
            />
          </label>
          <label>
            FargoRate
            <input
              type="text"
              value={fargorate}
              onChange={(e) => setFargorate(e.target.value)}
              placeholder="e.g. 550"
            />
          </label>
          <div className="add-player-modal-actions">
            <button type="button" className="btn-secondary" onClick={handleClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Add Player
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { formatMoney } from './breakAndRunMath.js';
import '../AddPlayerModal.css';

function capitalizeName(value) {
  return String(value || '').replace(/(^|\s)(\S)/g, (_, space, letter) => space + letter.toUpperCase());
}

export default function BreakAndRunAddPlayerModal({
  isOpen,
  onClose,
  onAdd,
  memberFee = 10,
  openFee = 20,
  tournamentFee,
}) {
  const memberRate = Number.isFinite(Number(memberFee)) ? Number(memberFee) : Number(tournamentFee) || 10;
  const [name, setName] = useState('');
  const [entryKind, setEntryKind] = useState('open');

  const reset = () => {
    setName('');
    setEntryKind('open');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedName = capitalizeName(name).trim();
    if (!trimmedName) {
      alert('Please enter a name.');
      return;
    }
    onAdd({ name: trimmedName, entryKind });
    reset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="add-player-modal-overlay" onClick={handleClose}>
      <div className="add-player-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Add player">
        <div className="add-player-modal-header">
          <h3>Add Player</h3>
          <button type="button" className="add-player-modal-close" onClick={handleClose} aria-label="Close">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="add-player-modal-form">
          <label>
            Name <span className="required">*</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(capitalizeName(e.target.value))}
              placeholder="Player name"
              autoFocus
            />
          </label>
          <p className="cc-setup-note">Entry goes into the pot. Each entry is one attempt.</p>
          <label className="cc-winner-pick">
            <input
              type="radio"
              name="bnr-entry"
              checked={entryKind === 'member'}
              onChange={() => setEntryKind('member')}
            />
            USAPL member or that day’s tournament · {formatMoney(memberRate)}
          </label>
          <label className="cc-winner-pick">
            <input
              type="radio"
              name="bnr-entry"
              checked={entryKind === 'open'}
              onChange={() => setEntryKind('open')}
            />
            All other players · {formatMoney(openFee)}
          </label>
          <div className="add-player-modal-actions">
            <button type="button" className="btn-secondary" onClick={handleClose}>Cancel</button>
            <button type="submit" className="btn-primary">Add Player</button>
          </div>
        </form>
      </div>
    </div>
  );
}

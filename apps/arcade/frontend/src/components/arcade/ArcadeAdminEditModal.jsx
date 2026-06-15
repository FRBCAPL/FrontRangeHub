import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

const ArcadeAdminEditModal = ({ row, gameName, saving, error, onClose, onSave }) => {
  const [initials, setInitials] = useState('');
  const [score, setScore] = useState('');

  useEffect(() => {
    if (!row) return;
    setInitials(row.initials || '');
    setScore(String(row.score ?? ''));
  }, [row]);

  if (!row) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      initials: initials.trim().toUpperCase().slice(0, 3),
      score: parseInt(score, 10)
    });
  };

  return (
    <div className="arcade-admin-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="arcade-admin-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="arcade-edit-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="arcade-edit-title" className="arcade-admin-modal-title">Edit Score</h2>
        {gameName ? <p className="arcade-admin-modal-game">{gameName}</p> : null}

        <form onSubmit={handleSubmit}>
          <label className="arcade-admin-label" htmlFor="edit-initials">
            Initials
            <input
              id="edit-initials"
              type="text"
              className="arcade-admin-modal-ini"
              maxLength={3}
              value={initials}
              onChange={(e) => setInitials(e.target.value.toUpperCase())}
              autoComplete="off"
            />
          </label>
          <label className="arcade-admin-label" htmlFor="edit-score">
            Score
            <input
              id="edit-score"
              type="number"
              min={1}
              value={score}
              onChange={(e) => setScore(e.target.value)}
            />
          </label>

          {error ? <p className="arcade-admin-modal-error">{error}</p> : null}

          <div className="arcade-admin-modal-actions">
            <button type="button" className="arcade-admin-btn" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="arcade-admin-btn primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

ArcadeAdminEditModal.propTypes = {
  row: PropTypes.shape({
    id: PropTypes.string.isRequired,
    initials: PropTypes.string,
    score: PropTypes.number
  }),
  gameName: PropTypes.string,
  saving: PropTypes.bool,
  error: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired
};

export default ArcadeAdminEditModal;

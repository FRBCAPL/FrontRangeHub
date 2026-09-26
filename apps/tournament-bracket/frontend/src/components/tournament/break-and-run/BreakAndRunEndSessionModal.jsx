import React, { useEffect, useState } from 'react';

const cancelBtnStyle = {
  appearance: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '10px 18px',
  borderRadius: '8px',
  border: '1px solid #64748b',
  background: '#475569',
  color: '#f8fafc',
  fontWeight: 700,
  fontSize: '0.95rem',
  cursor: 'pointer',
};

const submitBtnStyle = {
  appearance: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '10px 18px',
  borderRadius: '8px',
  border: '1px solid #22c55e',
  background: '#16a34a',
  color: '#ffffff',
  fontWeight: 700,
  fontSize: '0.95rem',
  cursor: 'pointer',
};

/**
 * For each player who still has a turn, choose carry-forward or end turn
 * before closing the session.
 */
export default function BreakAndRunEndSessionModal({
  isOpen,
  players = [],
  onCancel,
  onConfirm,
}) {
  const [choices, setChoices] = useState({});

  useEffect(() => {
    if (!isOpen) return;
    const next = {};
    players.forEach((p) => {
      next[String(p.id)] = 'carry';
    });
    setChoices(next);
  }, [isOpen, players]);

  if (!isOpen) return null;

  const setChoice = (id, value) => {
    setChoices((prev) => ({ ...prev, [String(id)]: value }));
  };

  const finish = (carryIds) => {
    onConfirm?.({ carryIds });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const carryIds = players
      .filter((p) => choices[String(p.id)] === 'carry')
      .map((p) => String(p.id));
    finish(carryIds);
  };

  return (
    <div
      className="bnr-end-overlay"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="bnr-end-session-title"
    >
      <form
        className="bnr-end-panel"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <header className="bnr-end-head">
          <h3 id="bnr-end-session-title">End session</h3>
          <p>
            These players still have a turn. Carry them into the next session, or end their turn now.
            The pot stays open either way.
          </p>
        </header>

        <div className="bnr-end-actions">
          <button type="button" style={cancelBtnStyle} onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            style={submitBtnStyle}
            onClick={() => {
              const carryIds = players
                .filter((p) => choices[String(p.id)] === 'carry')
                .map((p) => String(p.id));
              finish(carryIds);
            }}
          >
            End session
          </button>
        </div>

        <div className="bnr-end-list">
          {players.map((player) => {
            const id = String(player.id);
            const choice = choices[id] || 'carry';
            return (
              <fieldset key={id} className="bnr-end-player">
                <legend>{player.name}</legend>
                <label className={choice === 'carry' ? 'is-selected' : ''}>
                  <input
                    type="radio"
                    name={`bnr-carry-${id}`}
                    checked={choice === 'carry'}
                    onChange={() => setChoice(id, 'carry')}
                  />
                  <span>Carry forward to next session</span>
                </label>
                <label className={choice === 'end' ? 'is-selected' : ''}>
                  <input
                    type="radio"
                    name={`bnr-carry-${id}`}
                    checked={choice === 'end'}
                    onChange={() => setChoice(id, 'end')}
                  />
                  <span>End turn</span>
                </label>
              </fieldset>
            );
          })}
        </div>
      </form>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { DEFAULT_EVENT_NAME } from './breakAndRunPayout.js';
import './BreakAndRun.css';

export default function BreakAndRunEditEventModal({ isOpen, tournament, onCancel, onSubmit }) {
  const [name, setName] = useState('');
  const [tournamentDate, setTournamentDate] = useState('');

  useEffect(() => {
    if (!isOpen || !tournament) return;
    setName(tournament.name || '');
    setTournamentDate(String(tournament.tournamentDate || tournament.startDate || '').slice(0, 10));
  }, [isOpen, tournament?.id, tournament?.name, tournament?.tournamentDate, tournament?.startDate]);

  if (!isOpen || !tournament) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = String(name || '').trim();
    if (!trimmed) {
      alert('Enter an event name.');
      return;
    }
    if (!tournamentDate) {
      alert('Pick a start date.');
      return;
    }
    onSubmit?.({
      name: trimmed,
      tournamentDate,
      startDate: tournamentDate,
    });
  };

  return (
    <div className="cc-modal-overlay" onClick={onCancel} role="dialog" aria-modal="true" aria-labelledby="bnr-edit-event-title">
      <form
        className="cc-modal cc-edit-modal bnr-session-modal"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <header className="bnr-session-head">
          <h3 id="bnr-edit-event-title">Rename pot</h3>
          <p className="cc-modal-meta">
            This is the continuous Break & Run pot name on Current Tournaments, TV, and the public board.
            Name each play night under Sessions instead of starting a new pot.
          </p>
        </header>

        <div className="bnr-session-body">
          <label>
            Pot / event name
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={DEFAULT_EVENT_NAME}
              autoFocus
            />
          </label>
          <label>
            Start date
            <input
              type="date"
              value={tournamentDate}
              onChange={(e) => setTournamentDate(e.target.value)}
              required
            />
          </label>
        </div>

        <div className="form-actions bnr-session-actions">
          <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn-primary">Save name</button>
        </div>
      </form>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { systemTurnDate } from './breakAndRunTurns.js';
import './BreakAndRun.css';

function defaultsFromSession(session, mode) {
  return {
    name: session?.name || (mode === 'start' ? '' : 'Session'),
    date: session?.date || systemTurnDate(),
    startTime: session?.startTime || '',
    endTime: session?.endTime || '',
    venue: session?.venue || '',
  };
}

export default function BreakAndRunSessionModal({
  isOpen,
  mode = 'edit',
  session = null,
  onCancel,
  onSubmit,
}) {
  const [name, setName] = useState('');
  const [date, setDate] = useState(systemTurnDate());
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [venue, setVenue] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const next = defaultsFromSession(session, mode);
    setName(next.name);
    setDate(next.date);
    setStartTime(next.startTime);
    setEndTime(next.endTime);
    setVenue(next.venue);
  }, [isOpen, mode, session?.id, session?.name, session?.date, session?.startTime, session?.endTime, session?.venue]);

  if (!isOpen) return null;

  const title = mode === 'start' ? 'Start session' : 'Session details';
  const submitLabel = mode === 'start' ? 'Start session' : 'Save details';

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedName = String(name || '').trim();
    if (!trimmedName) {
      alert('Enter a session or event name.');
      return;
    }
    if (!date) {
      alert('Pick a session date.');
      return;
    }
    const trimmedVenue = String(venue || '').trim();
    if (!trimmedVenue) {
      alert('Enter a location / venue so it shows on the public board.');
      return;
    }
    onSubmit?.({
      name: trimmedName,
      date,
      startTime,
      endTime,
      venue: trimmedVenue,
    });
  };

  return (
    <div className="cc-modal-overlay" onClick={onCancel} role="dialog" aria-modal="true" aria-labelledby="bnr-session-title">
      <form
        className="cc-modal cc-edit-modal bnr-session-modal"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <header className="bnr-session-head">
          <h3 id="bnr-session-title">{title}</h3>
          <p className="cc-modal-meta">
            {mode === 'start'
              ? 'Starts a new play window with players carried forward from the last session. Everyone else joins separately. The pot carries forward.'
              : 'Shown on the public board so players know when and where this session is.'}
          </p>
        </header>

        <div className="bnr-session-body">
          <label>
            Session / event name
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Friday night · with 550+ tournament"
              autoFocus
            />
          </label>
          <div className="bnr-session-row">
            <label>
              Date
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </label>
            <label>
              Start time
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </label>
            <label>
              End time
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </label>
          </div>
          <label>
            Location / venue <span className="required">*</span>
            <input
              type="text"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="Legends Brews & Cues"
              required
            />
          </label>
          <p className="cc-setup-note">
            Entry is in person at the table. These details help players find the right night and place.
          </p>
        </div>

        <div className="form-actions bnr-session-actions">
          <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn-primary">{submitLabel}</button>
        </div>
      </form>
    </div>
  );
}

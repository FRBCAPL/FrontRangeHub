import React, { useEffect, useState } from 'react';
import { listLiveCashClimbEventsResult } from './cashClimbCloud.js';
import { cashClimbListErrorMessage } from './cashClimbPublic.js';
import CashClimbSubmitEventList from './CashClimbSubmitEventList.jsx';
import './CashClimb.css';
import './CashClimbSubmitPickModal.css';

const POLL_MS = 2500;

export default function CashClimbSubmitPickModal({ onClose, onPick }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const result = await listLiveCashClimbEventsResult();
      if (cancelled) return;
      setEvents(result.events);
      setError(result.error ? cashClimbListErrorMessage(result.error) : '');
      setLoading(false);
    };
    refresh();
    const timer = setInterval(refresh, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="cc-modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="cc-submit-pick-title">
      <div className="cc-modal cc-submit-pick-modal" onClick={(e) => e.stopPropagation()}>
        <p className="cc-play-kicker">Cash Climb</p>
        <h3 id="cc-submit-pick-title">Current tournaments</h3>
        <p className="cc-modal-meta">Pick the event you are playing in.</p>
        <CashClimbSubmitEventList
          events={events}
          loading={loading}
          error={error}
          onPick={onPick}
        />
        <div className="form-actions">
          <button type="button" className="btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

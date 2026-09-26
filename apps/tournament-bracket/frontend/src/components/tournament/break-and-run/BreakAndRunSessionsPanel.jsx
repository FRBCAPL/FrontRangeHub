import React from 'react';
import { formatSessionDetails } from './breakAndRunSessions.js';
import './BreakAndRun.css';

export default function BreakAndRunSessionsPanel({ sessions = [], currentSessionId = '', onEdit }) {
  if (!sessions.length) return null;

  const ordered = [...sessions].reverse();

  return (
    <section className="bnr-sessions" aria-label="Sessions">
      <h2>Sessions</h2>
      <p className="cc-setup-note">
        Name each play night here (Friday · Legends, etc.). Money stays in the one continuous pot.
      </p>
      <ul className="bnr-sessions-list">
        {ordered.map((session) => {
          const isCurrent = String(session.id) === String(currentSessionId);
          const status = session.status === 'open' ? 'Open' : 'Ended';
          return (
            <li key={session.id} className={isCurrent ? 'is-current' : undefined}>
              <div>
                <strong>{session.name || 'Session'}</strong>
                <span>
                  {[status, formatSessionDetails(session, { includeVenue: true })]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </div>
              <button type="button" className="tb-btn-new" onClick={() => onEdit?.(session)}>
                Rename
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

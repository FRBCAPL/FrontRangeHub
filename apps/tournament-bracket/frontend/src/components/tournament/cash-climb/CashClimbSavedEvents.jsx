import React from 'react';
import { formatTournamentDate } from './cashClimbEngine.js';
import { savedStatusLabel } from './cashClimbSaved.js';
import { hubFormatLabel } from '../tournamentHubEvents.js';
import './CashClimbSavedEvents.css';

export default function CashClimbSavedEvents({
  events = [],
  onOpen,
  onRemove,
  title = 'Saved tournaments',
  note = 'Stored in the database. This tablet keeps a backup if the cloud is down.',
  emptyMessage = '',
}) {
  if (!events.length && !emptyMessage) return null;

  return (
    <section className="cc-saved" aria-label={title || emptyMessage || 'Tournaments'}>
      {title ? <h3>{title}</h3> : null}
      {note ? <p className="cc-setup-note">{note}</p> : null}
      {!events.length ? (
        <p className="cc-setup-note">{emptyMessage}</p>
      ) : (
        <ul>
          {events.map((item) => (
            <li key={item.id}>
              <div>
                <strong>{item.name}</strong>
                <span>
                  {[hubFormatLabel(item), savedStatusLabel(item.status), item.tournamentDate ? formatTournamentDate(item.tournamentDate) : '']
                    .filter(Boolean)
                    .join(' • ')}
                </span>
              </div>
              <div className="cc-saved-actions">
                <button type="button" className="tb-btn-new" onClick={() => onOpen?.(item)}>
                  Open
                </button>
                <button type="button" className="tb-btn-new cc-saved-remove" onClick={() => onRemove?.(item)}>
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

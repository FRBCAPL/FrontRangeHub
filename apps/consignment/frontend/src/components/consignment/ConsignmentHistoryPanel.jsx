import React, { useEffect, useState } from 'react';
import { addItemNote, loadItemEvents } from '../../services/consignmentPayoutService.js';
import { describeEvent } from '../../utils/consignmentEvents.js';
import { formatShortDate } from '../../utils/consignmentDates.js';

/** Item history (logged automatically by the database) plus admin notes. `reloadKey` refetches. */
export default function ConsignmentHistoryPanel({ itemId, reloadKey = 0 }) {
  const [events, setEvents] = useState([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    loadItemEvents(itemId)
      .then((rows) => { if (alive) setEvents(rows); })
      .catch((err) => { if (alive) setError(err.message); });
    return () => { alive = false; };
  }, [itemId, reloadKey]);

  const add = async () => {
    if (!note.trim()) return;
    setBusy(true);
    setError('');
    try {
      const row = await addItemNote(itemId, note.trim());
      setEvents((prev) => [row, ...prev]);
      setNote('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="cs-field">
      <label>History</label>
      {events.length ? (
        <ul className="cs-history">
          {events.map((ev) => (
            <li key={ev.id}>
              <span className="cs-meta">{formatShortDate(ev.created_at)}</span>
              <span>{describeEvent(ev)}{ev.note ? ` — ${ev.note}` : ''}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="cs-hint">No history yet.</p>
      )}
      <div className="cs-note-add">
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note (saves right away)" />
        <button type="button" className="cs-btn-secondary" onClick={add} disabled={busy || !note.trim()}>Add note</button>
      </div>
      {error ? <p className="cs-error">{error}</p> : null}
    </div>
  );
}

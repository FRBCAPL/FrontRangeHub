import React, { useEffect, useState } from 'react';
import { messageTopicLabel } from '../../data/consignmentConstants.js';
import { loadConsignmentMessages, setConsignmentMessageStatus } from '../../services/consignmentMessagesService.js';
import { formatDateTime } from '../../utils/consignmentAuctionDates.js';

const FILTERS = [
  { id: 'new', label: 'New' },
  { id: 'open', label: 'New & answered' },
  { id: 'answered', label: 'Answered' },
  { id: 'closed', label: 'Closed' },
  { id: 'all', label: 'All' },
];

function MessageCard({ msg, onStatus }) {
  const [note, setNote] = useState(msg.admin_note || '');
  const replySubject = encodeURIComponent(`FRPL Consignment${msg.item_number ? ` · ${msg.item_number}` : ''}`);
  return (
    <li className={`cs-msg cs-msg-${msg.status}`}>
      <div className="cs-msg-head">
        <strong>{msg.name}</strong>
        <span className="cs-msg-tag">{messageTopicLabel(msg.topic)}</span>
        {msg.item_number ? <span className="cs-msg-tag">{msg.item_number}</span> : null}
        <span className="cs-meta">{formatDateTime(msg.created_at)}</span>
      </div>
      <p className="cs-msg-body">{msg.message}</p>
      <p className="cs-meta">
        {msg.email ? <a href={`mailto:${msg.email}?subject=${replySubject}`}>{msg.email}</a> : null}
        {msg.email && msg.phone ? ' · ' : ''}
        {msg.phone ? <a href={`tel:${msg.phone}`}>{msg.phone}</a> : null}
        {msg.user_id ? ' · has an FRPL account' : ''}
      </p>
      <textarea
        className="cs-msg-note"
        rows={2}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Private note (what you told them, next steps)"
        aria-label="Private note"
      />
      <div className="cs-actions">
        {msg.status !== 'answered' ? (
          <button type="button" className="cs-btn" onClick={() => onStatus(msg, 'answered', note)}>Mark answered</button>
        ) : null}
        {msg.status !== 'closed' ? (
          <button type="button" className="cs-btn-secondary" onClick={() => onStatus(msg, 'closed', note)}>Close</button>
        ) : null}
        {msg.status !== 'new' ? (
          <button type="button" className="cs-btn-secondary" onClick={() => onStatus(msg, 'new', note)}>Mark new</button>
        ) : null}
        {note !== (msg.admin_note || '') ? (
          <button type="button" className="cs-btn-secondary" onClick={() => onStatus(msg, msg.status, note)}>Save note</button>
        ) : null}
      </div>
    </li>
  );
}

/** Admin inbox for messages sent through Contact FRPL. */
export default function ConsignmentMessagesPanel() {
  const [filter, setFilter] = useState('new');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = () => {
    setLoading(true);
    return loadConsignmentMessages(filter)
      .then((data) => { setRows(data); setError(''); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { refresh(); }, [filter]);

  const onStatus = (msg, status, note) => {
    setConsignmentMessageStatus(msg.id, status, note).then(refresh).catch((err) => setError(err.message));
  };

  return (
    <section>
      <div className="cs-filters">
        <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter messages">
          {FILTERS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>
      </div>
      {error ? <p className="cs-error">{error}</p> : null}
      {loading && !rows.length ? <p className="cs-meta">Loading messages…</p> : null}
      {!loading && !error && !rows.length ? <p className="cs-hint">No messages here.</p> : null}
      {rows.length ? (
        <ul className="cs-msg-list">
          {rows.map((m) => <MessageCard key={`${m.id}-${m.status}-${m.admin_note || ''}`} msg={m} onStatus={onStatus} />)}
        </ul>
      ) : null}
    </section>
  );
}

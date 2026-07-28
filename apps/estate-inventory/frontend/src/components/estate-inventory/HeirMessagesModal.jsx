import React, { useCallback, useEffect, useRef, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';

function formatMsgTime(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  } catch {
    return '';
  }
}

/**
 * Heir ↔ Personal Representative conversation (tracked, saved).
 */
const HeirMessagesModal = ({ open, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const result = await estateInventoryService.siblingListMessages();
    setLoading(false);
    if (!result.success) {
      setError(result.error || 'Could not load messages.');
      setMessages([]);
      return;
    }
    setMessages(result.data?.messages || []);
    await estateInventoryService.siblingMarkMessagesRead();
  }, []);

  useEffect(() => {
    if (!open) return;
    setDraft('');
    load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    bottomRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' });
  }, [open, messages]);

  if (!open) return null;

  const handleSend = async (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setError('');
    const result = await estateInventoryService.siblingSendMessage(text);
    setSending(false);
    if (!result.success) {
      setError(result.error || 'Could not send message.');
      return;
    }
    setDraft('');
    await load();
  };

  return (
    <div
      className="ei-modal-backdrop"
      role="presentation"
      onClick={() => {
        if (!sending) onClose?.();
      }}
    >
      <div
        className="ei-modal ei-modal-settings ei-messages-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ei-heir-messages-title"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="ei-modal-head">
          <h3 id="ei-heir-messages-title">Message Personal Representative</h3>
          <button
            type="button"
            className="ei-modal-close"
            onClick={onClose}
            aria-label="Close"
            disabled={sending}
          >
            ×
          </button>
        </div>
        <div className="ei-modal-body ei-messages-body">
          <p className="ei-settings-hint" style={{ marginTop: 0 }}>
            Messages are saved in the Estate Records.
          </p>
          {loading ? <p className="ei-status">Loading…</p> : null}
          {error ? <div className="ei-error">{error}</div> : null}
          {!loading && !messages.length ? (
            <p className="ei-settings-hint">No messages yet. Ask a question below.</p>
          ) : null}
          <ul className="ei-messages-list" aria-live="polite">
            {messages.map((m) => (
              <li
                key={m.id}
                className={`ei-message-bubble ei-message-bubble--${m.sender_role === 'admin' ? 'pr' : 'me'}`}
              >
                <p className="ei-message-meta">
                  {m.sender_role === 'admin' ? 'Personal Representative' : 'You'}
                  {m.created_at ? ` · ${formatMsgTime(m.created_at)}` : ''}
                </p>
                <p className="ei-message-text">{m.body}</p>
              </li>
            ))}
            <li ref={bottomRef} aria-hidden="true" className="ei-messages-anchor" />
          </ul>
        </div>
        <form className="ei-modal-foot ei-messages-compose" onSubmit={handleSend}>
          <label className="ei-sr-only" htmlFor="ei-heir-msg-draft">
            Your message
          </label>
          <textarea
            id="ei-heir-msg-draft"
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write a message…"
            maxLength={4000}
            disabled={sending}
          />
          <div className="ei-btn-row">
            <button type="button" className="ei-btn ei-btn-secondary" onClick={onClose} disabled={sending}>
              Close
            </button>
            <button type="submit" className="ei-btn" disabled={sending || !draft.trim()}>
              {sending ? 'Sending…' : 'Send'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HeirMessagesModal;

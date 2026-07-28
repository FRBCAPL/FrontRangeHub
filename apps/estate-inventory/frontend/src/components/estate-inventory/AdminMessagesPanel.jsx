import React, { useCallback, useEffect, useRef, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { heirPublicName } from '@shared/utils/estateInventoryConstants.js';
import { useEstateCase } from './EstateCaseContext';

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

function threadLabel(thread) {
  return heirPublicName(thread) || thread.display_name || thread.sibling_key || 'Heir';
}

/**
 * Admin: list heir threads + conversation with Personal Representative replies.
 */
const AdminMessagesPanel = ({ refreshKey = 0, onChanged }) => {
  const { caseNumber } = useEstateCase();
  const [threads, setThreads] = useState([]);
  const [activeKey, setActiveKey] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  const loadThreads = useCallback(async () => {
    setLoading(true);
    setError('');
    const result = await estateInventoryService.listMessageThreads(caseNumber);
    setLoading(false);
    if (!result.success) {
      setError(result.error || 'Could not load messages.');
      setThreads([]);
      return;
    }
    setThreads(result.data?.threads || []);
  }, [caseNumber]);

  const openThread = useCallback(
    async (siblingKey) => {
      if (!siblingKey) return;
      setActiveKey(siblingKey);
      setDraft('');
      setLoadingThread(true);
      setError('');
      const result = await estateInventoryService.listMessagesForHeir(siblingKey, caseNumber);
      if (!result.success) {
        setLoadingThread(false);
        setError(result.error || 'Could not load conversation.');
        setMessages([]);
        return;
      }
      setMessages(result.data || []);
      await estateInventoryService.markAdminMessagesRead(siblingKey, caseNumber);
      setLoadingThread(false);
      onChanged?.();
      const refreshed = await estateInventoryService.listMessageThreads(caseNumber);
      if (refreshed.success) setThreads(refreshed.data?.threads || []);
    },
    [onChanged, caseNumber]
  );

  useEffect(() => {
    loadThreads();
  }, [loadThreads, refreshKey]);

  useEffect(() => {
    if (!activeKey) return;
    bottomRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' });
  }, [activeKey, messages]);

  const activeThread = threads.find((t) => t.sibling_key === activeKey) || null;

  const handleSend = async (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !activeKey || sending) return;
    setSending(true);
    setError('');
    const result = await estateInventoryService.sendAdminMessage(activeKey, text, caseNumber);
    setSending(false);
    if (!result.success) {
      setError(result.error || 'Could not send message.');
      return;
    }
    setDraft('');
    await openThread(activeKey);
    onChanged?.();
  };

  if (loading) {
    return <p className="ei-status">Loading messages…</p>;
  }

  return (
    <section className="ei-home ei-messages-admin">
      <header className="ei-header">
        <p className="ei-eyebrow">Personal Representative</p>
        <h1>Messages</h1>
        <p className="ei-lede">
          Private conversations with each heir. Messages are saved in the Estate Records.
        </p>
      </header>

      {error ? <div className="ei-error">{error}</div> : null}

      <div className="ei-messages-admin-layout">
        <aside className="ei-messages-thread-list" aria-label="Heir conversations">
          {!threads.length ? (
            <p className="ei-settings-hint">No heirs on file yet. Add heirs in Settings.</p>
          ) : (
            <ul>
              {threads.map((t) => (
                <li key={t.sibling_key}>
                  <button
                    type="button"
                    className={`ei-messages-thread-btn${activeKey === t.sibling_key ? ' is-active' : ''}`}
                    onClick={() => openThread(t.sibling_key)}
                  >
                    <span className="ei-messages-thread-name">{threadLabel(t)}</span>
                    {t.unread_count > 0 ? (
                      <span className="ei-messages-unread">{t.unread_count}</span>
                    ) : null}
                    <span className="ei-messages-thread-preview">
                      {t.last_message?.body
                        ? t.last_message.body.slice(0, 72)
                        : 'No messages yet'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <div className="ei-messages-admin-chat">
          {!activeKey ? (
            <p className="ei-settings-hint">Select an heir to view or start a conversation.</p>
          ) : (
            <>
              <h2 className="ei-settings-subhead" style={{ marginTop: 0 }}>
                {activeThread ? threadLabel(activeThread) : 'Conversation'}
              </h2>
              {loadingThread ? <p className="ei-status">Loading conversation…</p> : null}
              <ul className="ei-messages-list">
                {messages.map((m) => (
                  <li
                    key={m.id}
                    className={`ei-message-bubble ei-message-bubble--${m.sender_role === 'admin' ? 'me' : 'heir'}`}
                  >
                    <p className="ei-message-meta">
                      {m.sender_role === 'admin' ? 'You (PR)' : threadLabel(activeThread || {})}
                      {m.created_at ? ` · ${formatMsgTime(m.created_at)}` : ''}
                    </p>
                    <p className="ei-message-text">{m.body}</p>
                  </li>
                ))}
                <li ref={bottomRef} aria-hidden="true" className="ei-messages-anchor" />
              </ul>
              <form className="ei-messages-compose" onSubmit={handleSend}>
                <label className="ei-sr-only" htmlFor="ei-admin-msg-draft">
                  Your message
                </label>
                <textarea
                  id="ei-admin-msg-draft"
                  rows={2}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Write a reply…"
                  maxLength={4000}
                  disabled={sending}
                />
                <div className="ei-btn-row">
                  <button type="submit" className="ei-btn" disabled={sending || !draft.trim()}>
                    {sending ? 'Sending…' : 'Send'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default AdminMessagesPanel;

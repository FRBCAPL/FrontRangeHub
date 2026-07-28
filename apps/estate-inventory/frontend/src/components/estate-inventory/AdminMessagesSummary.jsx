import React, { useCallback, useEffect, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';

/**
 * Homepage teaser for heir ↔ PR messages.
 */
const AdminMessagesSummary = ({ onOpenMessages, refreshKey = 0 }) => {
  const [totalUnread, setTotalUnread] = useState(0);
  const [threadCount, setThreadCount] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const result = await estateInventoryService.listMessageThreads();
    setLoading(false);
    if (!result.success) {
      setError(result.error || 'Could not check messages.');
      setTotalUnread(0);
      setThreadCount(0);
      return;
    }
    setTotalUnread(Number(result.data?.total_unread) || 0);
    setThreadCount((result.data?.threads || []).filter((t) => t.message_count > 0).length);
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  if (loading) {
    return <p className="ei-status">Checking messages…</p>;
  }

  if (error) {
    return (
      <section className="ei-pending-summary ei-pending-summary-clear">
        <div>
          <h2 className="ei-pending-title">Messages</h2>
          <div className="ei-error" style={{ margin: 0 }}>
            {error}
          </div>
        </div>
        <button type="button" className="ei-btn ei-btn-secondary" onClick={onOpenMessages}>
          Open messages
        </button>
      </section>
    );
  }

  if (!totalUnread && !threadCount) {
    return (
      <section className="ei-pending-summary ei-pending-summary-clear">
        <div>
          <h2 className="ei-pending-title">Messages</h2>
          <p className="ei-status" style={{ margin: 0 }}>
            No heir messages yet. You can start a conversation anytime.
          </p>
        </div>
        <button type="button" className="ei-btn ei-btn-secondary" onClick={onOpenMessages}>
          Open messages
        </button>
      </section>
    );
  }

  return (
    <section className="ei-pending-summary">
      <div>
        <h2 className="ei-pending-title">Messages</h2>
        <p className="ei-settings-hint" style={{ margin: 0 }}>
          {totalUnread > 0 ? (
            <>
              <strong>{totalUnread}</strong> unread message{totalUnread === 1 ? '' : 's'}
              {threadCount ? (
                <>
                  {' '}
                  across <strong>{threadCount}</strong> conversation
                  {threadCount === 1 ? '' : 's'}
                </>
              ) : null}
              .
            </>
          ) : (
            <>
              <strong>{threadCount}</strong> conversation{threadCount === 1 ? '' : 's'} on file.
            </>
          )}
        </p>
      </div>
      <button type="button" className="ei-btn" onClick={onOpenMessages}>
        {totalUnread > 0 ? `View messages (${totalUnread})` : 'View messages'}
      </button>
    </section>
  );
};

export default AdminMessagesSummary;

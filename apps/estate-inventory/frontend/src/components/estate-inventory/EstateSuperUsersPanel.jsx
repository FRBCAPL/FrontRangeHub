import React, { useEffect, useState } from 'react';
import {
  listOwners,
  setUserDisabled,
  setUserTestFlag,
  clearEvTombstone
} from '@shared/services/estateSuperAdminService.js';
import EstateSuperPurgeUserModal from './EstateSuperPurgeUserModal';

const EstateSuperUsersPanel = () => {
  const [owners, setOwners] = useState([]);
  const [search, setSearch] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [purgeTarget, setPurgeTarget] = useState(null);

  const load = async (q = search) => {
    setLoading(true);
    setError('');
    const result = await listOwners({ search: q });
    setLoading(false);
    if (!result.success) {
      setError(result.error || 'Could not list owners.');
      setOwners([]);
      return;
    }
    setOwners(result.data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const requireReason = (min = 5) => {
    if (reason.trim().length < min) {
      setError(`Enter a reason (at least ${min} characters) before this action.`);
      return false;
    }
    return true;
  };

  const toggleDisabled = async (owner, disabled) => {
    setError('');
    setMessage('');
    if (!requireReason(5)) return;
    const result = await setUserDisabled({
      userId: owner.owner_id,
      email: owner.owner_email,
      disabled,
      reason: reason.trim(),
      isTest: Boolean(owner.is_test)
    });
    if (!result.success) {
      setError(result.error || 'Could not update user.');
      return;
    }
    setMessage(
      disabled
        ? `Disabled EV sign-in for ${owner.owner_email || owner.owner_id}`
        : `Enabled EV sign-in for ${owner.owner_email || owner.owner_id}`
    );
    setReason('');
    await load();
  };

  const toggleTest = async (owner, isTest) => {
    setError('');
    setMessage('');
    if (!requireReason(5)) return;
    const result = await setUserTestFlag({
      userId: owner.owner_id,
      email: owner.owner_email,
      isTest,
      reason: reason.trim()
    });
    if (!result.success) {
      setError(result.error || 'Could not update test flag.');
      return;
    }
    setMessage(
      isTest
        ? `Marked ${owner.owner_email || owner.owner_id} as EV test user`
        : `Unmarked ${owner.owner_email || owner.owner_id} as EV test user`
    );
    setReason('');
    await load();
  };

  const clearTombstone = async (owner) => {
    setError('');
    setMessage('');
    if (!requireReason(5)) return;
    const result = await clearEvTombstone({
      userId: owner.owner_id,
      reason: reason.trim()
    });
    if (!result.success) {
      setError(result.error || 'Could not clear tombstone.');
      return;
    }
    setMessage(
      `Cleared EV-deleted tombstone for ${owner.owner_email || owner.owner_id}. Purged estates are not restored.`
    );
    setReason('');
    await load();
  };

  return (
    <section className="ei-super-panel">
      <div className="ei-super-toolbar">
        <input
          type="search"
          placeholder="Search owner email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') load(search);
          }}
        />
        <button type="button" className="ei-btn ei-btn-secondary ei-btn-small" onClick={() => load()}>
          Refresh
        </button>
      </div>

      <div className="ei-field">
        <label htmlFor="super-user-reason">Reason for next action</label>
        <input
          id="super-user-reason"
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Cleanup throwaway test PR account"
        />
      </div>

      {error ? <div className="ei-error">{error}</div> : null}
      {message ? <p className="ei-status">{message}</p> : null}
      {loading ? <p className="ei-status">Loading owners…</p> : null}

      <div className="ei-super-table-wrap">
        <table className="ei-super-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>User id</th>
              <th>Estates</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {owners.map((o) => {
              const nonTest = o.non_test_estate_count || 0;
              const canPurge = o.is_test && !o.ev_deleted && nonTest === 0;
              return (
                <tr key={o.owner_id}>
                  <td>{o.owner_email || '—'}</td>
                  <td className="ei-super-muted">
                    <code>{String(o.owner_id).slice(0, 8)}…</code>
                  </td>
                  <td>
                    {o.estate_count || 0}
                    {o.test_estate_count != null ? (
                      <span className="ei-super-muted">
                        {' '}
                        ({o.test_estate_count || 0} test
                        {nonTest ? ` / ${nonTest} live` : ''})
                      </span>
                    ) : null}
                  </td>
                  <td>
                    {o.ev_deleted ? (
                      <span className="ei-super-badge ei-super-badge-deleted">EV DELETED</span>
                    ) : null}
                    {o.is_test && !o.ev_deleted ? (
                      <span className="ei-super-badge ei-super-badge-test">TEST</span>
                    ) : null}
                    {o.disabled && !o.ev_deleted ? (
                      <span className="ei-super-badge ei-super-badge-deleted">DISABLED</span>
                    ) : null}
                    {!o.ev_deleted && !o.disabled && !o.is_test ? (
                      <span className="ei-super-badge">ACTIVE</span>
                    ) : null}
                  </td>
                  <td className="ei-super-actions">
                    {o.ev_deleted ? (
                      <button
                        type="button"
                        className="ei-btn ei-btn-secondary ei-btn-small"
                        onClick={() => clearTombstone(o)}
                      >
                        Clear tombstone
                      </button>
                    ) : (
                      <>
                        {o.is_test ? (
                          <button
                            type="button"
                            className="ei-btn ei-btn-secondary ei-btn-small"
                            onClick={() => toggleTest(o, false)}
                          >
                            Unmark test
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="ei-btn ei-btn-secondary ei-btn-small"
                            onClick={() => toggleTest(o, true)}
                          >
                            Mark test
                          </button>
                        )}
                        {o.disabled ? (
                          <button
                            type="button"
                            className="ei-btn ei-btn-small"
                            onClick={() => toggleDisabled(o, false)}
                          >
                            Enable
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="ei-btn ei-btn-secondary ei-btn-small"
                            onClick={() => toggleDisabled(o, true)}
                          >
                            Disable EV sign-in
                          </button>
                        )}
                        {canPurge ? (
                          <button
                            type="button"
                            className="ei-btn ei-btn-danger ei-btn-small"
                            onClick={() => setPurgeTarget(o)}
                          >
                            Delete EV data…
                          </button>
                        ) : null}
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
            {!loading && owners.length === 0 ? (
              <tr>
                <td colSpan={5}>No owners found.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <p className="ei-settings-hint">
        <strong>Disable EV sign-in</strong> blocks Estate Vault only (reversible).{' '}
        <strong>Mark test</strong> then <strong>Delete EV data</strong> permanently removes that
        owner&apos;s Estate Vault estates after a sealed archive — the Google/email login and other
        apps are never deleted. Purge refuses if any estate is not marked test.
      </p>

      <EstateSuperPurgeUserModal
        open={Boolean(purgeTarget)}
        owner={purgeTarget}
        onClose={() => setPurgeTarget(null)}
        onDone={(data) => {
          setMessage(
            `Deleted EV data for ${data?.email || purgeTarget?.owner_email || 'user'}` +
              (data?.estate_count != null ? ` (${data.estate_count} estate(s))` : '') +
              '. Login identity preserved.'
          );
          setPurgeTarget(null);
          load();
        }}
      />
    </section>
  );
};

export default EstateSuperUsersPanel;

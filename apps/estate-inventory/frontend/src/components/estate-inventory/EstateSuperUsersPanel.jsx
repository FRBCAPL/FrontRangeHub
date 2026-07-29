import React, { useEffect, useState } from 'react';
import { listOwners, setUserDisabled } from '@shared/services/estateSuperAdminService.js';

const EstateSuperUsersPanel = () => {
  const [owners, setOwners] = useState([]);
  const [search, setSearch] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

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

  const toggle = async (owner, disabled) => {
    setError('');
    setMessage('');
    if (reason.trim().length < 5) {
      setError('Enter a reason (at least 5 characters) before changing user access.');
      return;
    }
    const result = await setUserDisabled({
      userId: owner.owner_id,
      email: owner.owner_email,
      disabled,
      reason: reason.trim(),
      isTest: true
    });
    if (!result.success) {
      setError(result.error || 'Could not update user.');
      return;
    }
    setMessage(disabled ? `Disabled ${owner.owner_email || owner.owner_id}` : `Enabled ${owner.owner_email || owner.owner_id}`);
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
          placeholder="e.g. Test account — block Estate Vault sign-in"
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
            {owners.map((o) => (
              <tr key={o.owner_id}>
                <td>{o.owner_email || '—'}</td>
                <td className="ei-super-muted">
                  <code>{String(o.owner_id).slice(0, 8)}…</code>
                </td>
                <td>{o.estate_count}</td>
                <td>
                  {o.disabled ? (
                    <span className="ei-super-badge ei-super-badge-deleted">DISABLED</span>
                  ) : (
                    <span className="ei-super-badge">ACTIVE</span>
                  )}
                </td>
                <td className="ei-super-actions">
                  {o.disabled ? (
                    <button
                      type="button"
                      className="ei-btn ei-btn-small"
                      onClick={() => toggle(o, false)}
                    >
                      Enable
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="ei-btn ei-btn-secondary ei-btn-small"
                      onClick={() => toggle(o, true)}
                    >
                      Disable EV sign-in
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!loading && owners.length === 0 ? (
              <tr>
                <td colSpan={5}>No owners found.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <p className="ei-settings-hint">
        Disable blocks Estate Vault PR sign-in for that Auth user. It does not delete Hub accounts.
        Hard Auth delete is intentionally not offered here.
      </p>
    </section>
  );
};

export default EstateSuperUsersPanel;

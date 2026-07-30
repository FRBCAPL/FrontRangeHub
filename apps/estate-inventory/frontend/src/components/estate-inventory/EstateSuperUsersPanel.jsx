import React, { useEffect, useState } from 'react';
import {
  listOwners,
  setUserDisabled,
  clearEvTombstone
} from '@shared/services/estateSuperAdminService.js';
import EstateSuperPurgeUserModal from './EstateSuperPurgeUserModal';
import EstateSuperConfirmModal from './EstateSuperConfirmModal';

const EstateSuperUsersPanel = () => {
  const [owners, setOwners] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [purgeTarget, setPurgeTarget] = useState(null);
  const [confirm, setConfirm] = useState(null);

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

  const who = (o) => o.owner_email || o.owner_id;

  const askBlock = (owner) =>
    setConfirm({
      title: 'Temporarily block Estate Vault sign-in',
      target: who(owner),
      summary: 'Stops this person from signing in to Estate Vault. Nothing is deleted.',
      effects: [
        'They cannot open Estate Vault as a Personal Representative',
        'All of their estates and items stay exactly as they are',
        'Their Google / email login keeps working for every other app'
      ],
      reversible: 'Reversible any time with “Allow EV sign-in”.',
      confirmLabel: 'Block EV sign-in',
      busyLabel: 'Blocking…',
      reasonPlaceholder: 'e.g. Suspended pending identity check',
      run: (reason) =>
        setUserDisabled({
          userId: owner.owner_id,
          email: owner.owner_email,
          disabled: true,
          reason
        }),
      done: () => `Blocked Estate Vault sign-in for ${who(owner)}.`
    });

  const askAllow = (owner) =>
    setConfirm({
      title: 'Allow Estate Vault sign-in again',
      target: who(owner),
      summary: 'Removes the Estate Vault sign-in block for this person.',
      effects: ['They can sign in to Estate Vault again', 'Their existing estates are unchanged'],
      confirmLabel: 'Allow EV sign-in',
      busyLabel: 'Unblocking…',
      reasonPlaceholder: 'e.g. Verified identity, restoring access',
      run: (reason) =>
        setUserDisabled({
          userId: owner.owner_id,
          email: owner.owner_email,
          disabled: false,
          reason
        }),
      done: () => `Restored Estate Vault sign-in for ${who(owner)}.`
    });

  const askClearTombstone = (owner) =>
    setConfirm({
      title: 'Let this deleted account use Estate Vault again',
      target: who(owner),
      summary:
        'This account’s Estate Vault data was deleted earlier. Clearing the marker lets them start fresh.',
      effects: [
        'They can sign in to Estate Vault and create new estates',
        'Previously deleted estates are NOT restored — that data is gone',
        'The original deletion stays in the operator audit log'
      ],
      confirmLabel: 'Allow fresh start',
      busyLabel: 'Clearing…',
      reasonPlaceholder: 'e.g. Reusing this address for new testing',
      run: (reason) => clearEvTombstone({ userId: owner.owner_id, reason }),
      done: () => `${who(owner)} can use Estate Vault again. Deleted estates were not restored.`
    });

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
        <button
          type="button"
          className="ei-btn ei-btn-secondary ei-btn-small"
          onClick={() => load()}
          title="Reload the owner list from the database."
        >
          Refresh
        </button>
      </div>

      <p className="ei-settings-hint">
        Hover any button for a short explanation. Clicking an action opens a confirmation window —
        nothing changes until you confirm there. For throwaway test accounts, use Delete their EV
        data.
      </p>

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
                <td>{o.estate_count || 0}</td>
                <td>
                  {o.ev_deleted ? (
                    <span className="ei-super-badge ei-super-badge-deleted">EV DATA DELETED</span>
                  ) : null}
                  {o.disabled && !o.ev_deleted ? (
                    <span className="ei-super-badge ei-super-badge-deleted">BLOCKED</span>
                  ) : null}
                  {!o.ev_deleted && !o.disabled ? (
                    <span className="ei-super-badge">ACTIVE</span>
                  ) : null}
                </td>
                <td className="ei-super-actions">
                  {o.ev_deleted ? (
                    <button
                      type="button"
                      className="ei-btn ei-btn-secondary ei-btn-small"
                      onClick={() => askClearTombstone(o)}
                      title="Let this email use Estate Vault again later. Previously deleted estates are NOT restored."
                    >
                      Allow fresh start…
                    </button>
                  ) : (
                    <>
                      {o.disabled ? (
                        <button
                          type="button"
                          className="ei-btn ei-btn-small"
                          onClick={() => askAllow(o)}
                          title="Remove the Estate Vault sign-in block so this person can open EV again. Estates are unchanged."
                        >
                          Allow EV sign-in…
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="ei-btn ei-btn-secondary ei-btn-small"
                          onClick={() => askBlock(o)}
                          title="Temporarily stop this person from signing into Estate Vault. Deletes nothing. Other apps keep working."
                        >
                          Block EV sign-in…
                        </button>
                      )}
                      <button
                        type="button"
                        className="ei-btn ei-btn-danger ei-btn-small"
                        onClick={() => setPurgeTarget(o)}
                        title="Permanently remove this person’s Estate Vault estates, photos, and exports. Their Google/email login and other apps are never deleted."
                      >
                        Delete their EV data…
                      </button>
                    </>
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
        <strong>Block EV sign-in</strong> is a temporary lock and deletes nothing.{' '}
        <strong>Delete their EV data</strong> permanently removes that person&apos;s Estate Vault
        estates, photos, and exports. Neither one ever deletes their Google / email login, and
        neither affects the Hub or any other app.
      </p>

      <EstateSuperConfirmModal
        open={Boolean(confirm)}
        title={confirm?.title}
        target={confirm?.target}
        summary={confirm?.summary}
        effects={confirm?.effects || []}
        reversible={confirm?.reversible}
        confirmLabel={confirm?.confirmLabel}
        busyLabel={confirm?.busyLabel}
        reasonPlaceholder={confirm?.reasonPlaceholder}
        onCancel={() => setConfirm(null)}
        onConfirm={async (reason) => {
          const result = await confirm.run(reason);
          if (!result.success) return result;
          setError('');
          setMessage(confirm.done(result.data));
          setConfirm(null);
          await load();
          return result;
        }}
      />

      <EstateSuperPurgeUserModal
        open={Boolean(purgeTarget)}
        owner={purgeTarget}
        onClose={() => setPurgeTarget(null)}
        onDone={(data) => {
          setError('');
          setMessage(
            `Deleted Estate Vault data for ${data?.email || purgeTarget?.owner_email || 'user'}` +
              (data?.estate_count != null ? ` (${data.estate_count} estate(s))` : '') +
              '. Their login still works for other apps.'
          );
          setPurgeTarget(null);
          load();
        }}
      />
    </section>
  );
};

export default EstateSuperUsersPanel;

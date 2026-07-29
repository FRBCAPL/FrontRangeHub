import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  listEstates,
  softDeleteEstate,
  restoreEstate,
  setTestFlag,
  forceAdminRotation,
  clearSessions,
  logEstateView,
  assistUpdateSettings
} from '@shared/services/estateSuperAdminService.js';
import { estateitCasePath } from '@shared/utils/estateInventoryConstants.js';
import EstateSuperPurgeModal from './EstateSuperPurgeModal';

const EstateSuperEstatesPanel = () => {
  const [estates, setEstates] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [reason, setReason] = useState('');
  const [purgeTarget, setPurgeTarget] = useState(null);
  const [assistName, setAssistName] = useState('');

  const load = async (q = search) => {
    setLoading(true);
    setError('');
    const result = await listEstates({ includeDeleted: true, search: q });
    setLoading(false);
    if (!result.success) {
      setError(result.error || 'Could not list estates.');
      setEstates([]);
      return;
    }
    setEstates(result.data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const needReason = () => {
    if (reason.trim().length < 5) {
      setError('Enter a reason (at least 5 characters) in the box above before acting.');
      return false;
    }
    return true;
  };

  const run = async (fn, okMsg) => {
    setError('');
    setMessage('');
    if (!needReason()) return false;
    const result = await fn();
    if (!result.success) {
      setError(result.error || 'Action failed.');
      return false;
    }
    setMessage(okMsg);
    setReason('');
    await load();
    return true;
  };

  return (
    <section className="ei-super-panel">
      <div className="ei-super-toolbar">
        <input
          type="search"
          placeholder="Search case, name, owner email…"
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
        <label htmlFor="super-estate-reason">Reason for next action (required for changes)</label>
        <input
          id="super-estate-reason"
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Cleaning TESTV3A sandbox after audit"
        />
      </div>
      <div className="ei-field">
        <label htmlFor="super-assist-name">Assist: new estate display name (optional)</label>
        <input
          id="super-assist-name"
          type="text"
          value={assistName}
          onChange={(e) => setAssistName(e.target.value)}
          placeholder="Only used with Rename assist on a row"
        />
      </div>

      {error ? <div className="ei-error">{error}</div> : null}
      {message ? <p className="ei-status">{message}</p> : null}
      {loading ? <p className="ei-status">Loading estates…</p> : null}

      <div className="ei-super-table-wrap">
        <table className="ei-super-table">
          <thead>
            <tr>
              <th>Case</th>
              <th>Name</th>
              <th>Owner</th>
              <th>Flags</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {estates.map((e) => (
              <tr key={e.id} className={e.deleted_at ? 'is-deleted' : ''}>
                <td>
                  <code>{e.case_number}</code>
                </td>
                <td>{e.estate_name}</td>
                <td className="ei-super-muted">{e.owner_email || '—'}</td>
                <td>
                  {e.is_test ? <span className="ei-super-badge ei-super-badge-test">TEST</span> : null}
                  {e.deleted_at ? (
                    <span className="ei-super-badge ei-super-badge-deleted">SOFT DELETED</span>
                  ) : null}
                  {e.suspended_at ? (
                    <span className="ei-super-badge">SUSPENDED</span>
                  ) : null}
                </td>
                <td className="ei-super-actions">
                  {!e.deleted_at ? (
                    <Link
                      className="ei-btn ei-btn-secondary ei-btn-small"
                      to={estateitCasePath(e.case_number)}
                      onClick={() => logEstateView(e.case_number, 'view', reason || 'Operator open')}
                    >
                      Open
                    </Link>
                  ) : null}
                  {e.deleted_at ? (
                    <button
                      type="button"
                      className="ei-btn ei-btn-small"
                      onClick={() =>
                        run(
                          () => restoreEstate(e.case_number, reason.trim()),
                          `Restored ${e.case_number}`
                        )
                      }
                    >
                      Restore
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="ei-btn ei-btn-secondary ei-btn-small"
                      onClick={() =>
                        run(
                          () => softDeleteEstate(e.case_number, reason.trim()),
                          `Soft-deleted ${e.case_number}`
                        )
                      }
                    >
                      Soft-delete
                    </button>
                  )}
                  <button
                    type="button"
                    className="ei-btn ei-btn-secondary ei-btn-small"
                    onClick={() =>
                      run(
                        () => setTestFlag(e.case_number, !e.is_test, reason.trim()),
                        e.is_test ? `Unmarked test ${e.case_number}` : `Marked test ${e.case_number}`
                      )
                    }
                  >
                    {e.is_test ? 'Unmark test' : 'Mark test'}
                  </button>
                  <button
                    type="button"
                    className="ei-btn ei-btn-secondary ei-btn-small"
                    onClick={() =>
                      run(
                        () => forceAdminRotation(e.case_number, reason.trim()),
                        `Forced admin PIN rotation for ${e.case_number}`
                      )
                    }
                  >
                    Force PIN rotate
                  </button>
                  <button
                    type="button"
                    className="ei-btn ei-btn-secondary ei-btn-small"
                    onClick={() =>
                      run(
                        () => clearSessions(e.case_number, reason.trim()),
                        `Cleared sessions for ${e.case_number}`
                      )
                    }
                  >
                    Clear sessions
                  </button>
                  {!e.deleted_at && assistName.trim() ? (
                    <button
                      type="button"
                      className="ei-btn ei-btn-secondary ei-btn-small"
                      onClick={async () => {
                        const ok = await run(
                          () =>
                            assistUpdateSettings(e.case_number, reason.trim(), {
                              estateName: assistName.trim()
                            }),
                          `Renamed ${e.case_number} (assist)`
                        );
                        if (ok) setAssistName('');
                      }}
                    >
                      Rename assist
                    </button>
                  ) : null}
                  {e.is_test ? (
                    <button
                      type="button"
                      className="ei-btn ei-btn-danger ei-btn-small"
                      onClick={() => setPurgeTarget(e)}
                    >
                      Purge…
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
            {!loading && estates.length === 0 ? (
              <tr>
                <td colSpan={5}>No estates found.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <EstateSuperPurgeModal
        open={Boolean(purgeTarget)}
        estate={purgeTarget}
        onClose={() => setPurgeTarget(null)}
        onDone={() => {
          setMessage(`Purged ${purgeTarget?.case_number}`);
          setPurgeTarget(null);
          load();
        }}
      />
    </section>
  );
};

export default EstateSuperEstatesPanel;

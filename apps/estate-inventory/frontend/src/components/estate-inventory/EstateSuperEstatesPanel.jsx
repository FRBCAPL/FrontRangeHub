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
import EstateSuperConfirmModal from './EstateSuperConfirmModal';

const EstateSuperEstatesPanel = () => {
  const [estates, setEstates] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [purgeTarget, setPurgeTarget] = useState(null);
  const [confirm, setConfirm] = useState(null);

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

  const label = (e) => `${e.estate_name || e.case_number} (${e.case_number})`;

  const askHide = (e) =>
    setConfirm({
      title: 'Hide this estate',
      target: label(e),
      summary: 'Hides the estate from everyone without deleting anything.',
      effects: [
        'The PR no longer sees it in “My estates”',
        'Family and helper links for this case stop working',
        'All items, photos, and history are kept'
      ],
      reversible: 'Reversible any time with “Unhide”.',
      confirmLabel: 'Hide estate',
      busyLabel: 'Hiding…',
      reasonPlaceholder: 'e.g. Hiding sandbox case during audit',
      run: (reason) => softDeleteEstate(e.case_number, reason),
      done: () => `Hid ${e.case_number}. Nothing was deleted.`
    });

  const askUnhide = (e) =>
    setConfirm({
      title: 'Unhide this estate',
      target: label(e),
      summary: 'Makes the estate visible and usable again.',
      effects: ['The PR sees it in “My estates” again', 'Family and helper access resumes'],
      confirmLabel: 'Unhide estate',
      busyLabel: 'Restoring…',
      reasonPlaceholder: 'e.g. Audit finished, restoring access',
      run: (reason) => restoreEstate(e.case_number, reason),
      done: () => `Unhid ${e.case_number}.`
    });

  const askTest = (e) => {
    const marking = !e.is_test;
    return setConfirm({
      title: marking ? 'Mark estate as test data' : 'Unmark estate as test data',
      target: label(e),
      summary: marking
        ? 'Labels this estate as throwaway test data so it can be permanently deleted.'
        : 'Removes the test label, protecting this estate from permanent deletion.',
      effects: marking
        ? [
            'A TEST badge appears on this estate',
            'A “Delete permanently” button becomes available for it',
            'Nothing is deleted right now'
          ]
        : ['The TEST badge is removed', 'Permanent deletion is no longer offered'],
      reversible: 'Reversible any time.',
      confirmLabel: marking ? 'Mark as test' : 'Unmark as test',
      busyLabel: 'Saving…',
      reasonPlaceholder: marking
        ? 'e.g. Sandbox case I created while testing'
        : 'e.g. Marked by mistake, this is a real estate',
      run: (reason) => setTestFlag(e.case_number, marking, reason),
      done: () => (marking ? `Marked ${e.case_number} as test.` : `Unmarked ${e.case_number}.`)
    });
  };

  const askRotate = (e) =>
    setConfirm({
      title: 'Force a new admin PIN',
      target: label(e),
      summary: 'Requires the PR to set a brand-new admin PIN the next time they open this estate.',
      effects: [
        'The current admin PIN stops working',
        'The PR is prompted to choose a new one at next unlock',
        'No estate data is changed or deleted'
      ],
      confirmLabel: 'Force new PIN',
      busyLabel: 'Applying…',
      reasonPlaceholder: 'e.g. PR reported the PIN was shared by mistake',
      run: (reason) => forceAdminRotation(e.case_number, reason),
      done: () => `${e.case_number} will require a new admin PIN at next unlock.`
    });

  const askClearSessions = (e) =>
    setConfirm({
      title: 'Sign out all family and helper devices',
      target: label(e),
      summary: 'Ends every active heir and helper session for this estate.',
      effects: [
        'Family and helpers must enter their access code again',
        'Useful when someone is stuck on an old device',
        'No estate data is changed or deleted'
      ],
      confirmLabel: 'Sign out all devices',
      busyLabel: 'Clearing…',
      reasonPlaceholder: 'e.g. Helper stuck in a bad session on old tablet',
      run: (reason) => clearSessions(e.case_number, reason),
      done: () => `Cleared family/helper sessions for ${e.case_number}.`
    });

  const askRename = (e) =>
    setConfirm({
      title: 'Rename this estate for the PR',
      target: label(e),
      summary: 'Changes the estate display name on the PR’s behalf.',
      effects: [
        'The new name shows everywhere for this case',
        'The old and new names are both saved in the operator audit log'
      ],
      confirmLabel: 'Rename estate',
      busyLabel: 'Renaming…',
      reasonPlaceholder: 'e.g. PR asked me to fix a typo in the name',
      extraField: {
        label: 'New estate display name',
        placeholder: 'e.g. Estate of Jane Doe',
        required: true,
        initialValue: e.estate_name || ''
      },
      run: (reason, estateName) => assistUpdateSettings(e.case_number, reason, { estateName }),
      done: () => `Renamed ${e.case_number}.`
    });

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
        <button
          type="button"
          className="ei-btn ei-btn-secondary ei-btn-small"
          onClick={() => load()}
          title="Reload the estate list from the database."
        >
          Refresh
        </button>
      </div>

      <p className="ei-settings-hint">
        Hover any button for a short explanation. Clicking an action opens a confirmation window —
        nothing changes until you confirm there.
      </p>

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
                    <span className="ei-super-badge ei-super-badge-deleted">HIDDEN</span>
                  ) : null}
                  {e.suspended_at ? <span className="ei-super-badge">SUSPENDED</span> : null}
                </td>
                <td className="ei-super-actions">
                  {!e.deleted_at ? (
                    <Link
                      className="ei-btn ei-btn-secondary ei-btn-small"
                      to={estateitCasePath(e.case_number)}
                      onClick={() => logEstateView(e.case_number, 'view', 'Operator open')}
                      title="Open this estate to inspect it. Does not change any data by itself."
                    >
                      Open
                    </Link>
                  ) : null}
                  {e.deleted_at ? (
                    <button
                      type="button"
                      className="ei-btn ei-btn-small"
                      onClick={() => askUnhide(e)}
                      title="Make this estate visible again to the PR, family, and helpers. Data was never deleted."
                    >
                      Unhide…
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="ei-btn ei-btn-secondary ei-btn-small"
                      onClick={() => askHide(e)}
                      title="Hide this estate from the PR, family, and helpers without deleting anything. Reversible with Unhide."
                    >
                      Hide…
                    </button>
                  )}
                  <button
                    type="button"
                    className="ei-btn ei-btn-secondary ei-btn-small"
                    onClick={() => askTest(e)}
                    title={
                      e.is_test
                        ? 'Remove the TEST label so this estate can no longer be permanently deleted from here.'
                        : 'Label this estate as throwaway test data. Nothing is deleted yet — this only unlocks Delete permanently.'
                    }
                  >
                    {e.is_test ? 'Unmark test…' : 'Mark test…'}
                  </button>
                  <button
                    type="button"
                    className="ei-btn ei-btn-secondary ei-btn-small"
                    onClick={() => askRename(e)}
                    title="Change the estate display name for the PR (for example fixing a typo). Audited."
                  >
                    Rename…
                  </button>
                  <button
                    type="button"
                    className="ei-btn ei-btn-secondary ei-btn-small"
                    onClick={() => askRotate(e)}
                    title="Invalidate the admin PIN so the PR must set a new one next unlock. Use if a PIN was shared or forgotten. Does not delete inventory."
                  >
                    Force new PIN…
                  </button>
                  <button
                    type="button"
                    className="ei-btn ei-btn-secondary ei-btn-small"
                    onClick={() => askClearSessions(e)}
                    title="End all family/helper sessions so they must enter their access code again. Useful for stuck devices. Does not delete inventory."
                  >
                    Sign out devices…
                  </button>
                  {e.is_test ? (
                    <button
                      type="button"
                      className="ei-btn ei-btn-danger ei-btn-small"
                      onClick={() => setPurgeTarget(e)}
                      title="Permanently delete this TEST estate’s Estate Vault data after confirmation. Irreversible. Real estates cannot use this."
                    >
                      Delete permanently…
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

      <p className="ei-settings-hint">
        <strong>Hide</strong> is reversible and keeps all data. <strong>Delete permanently</strong>{' '}
        only appears on estates you have marked as test, and cannot be undone.
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
        extraField={confirm?.extraField}
        onCancel={() => setConfirm(null)}
        onConfirm={async (reason, extra) => {
          const result = await confirm.run(reason, extra);
          if (!result.success) return result;
          setError('');
          setMessage(confirm.done(result.data));
          setConfirm(null);
          await load();
          return result;
        }}
      />

      <EstateSuperPurgeModal
        open={Boolean(purgeTarget)}
        estate={purgeTarget}
        onClose={() => setPurgeTarget(null)}
        onDone={() => {
          setError('');
          setMessage(`Permanently deleted ${purgeTarget?.case_number}.`);
          setPurgeTarget(null);
          load();
        }}
      />
    </section>
  );
};

export default EstateSuperEstatesPanel;

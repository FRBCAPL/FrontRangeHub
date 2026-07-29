import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { purgeTestEstate } from '@shared/services/estateSuperAdminService.js';

/**
 * Hard-purge a test estate after sealed archive + typed confirmation.
 */
const EstateSuperPurgeModal = ({ estate, open, onClose, onDone }) => {
  const [reason, setReason] = useState('');
  const [phrase, setPhrase] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const expected = useMemo(() => {
    const cn = String(estate?.case_number || '').trim().toUpperCase();
    return cn ? `DELETE TEST ESTATE ${cn}` : '';
  }, [estate?.case_number]);

  if (!open || !estate) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!estate.is_test) {
      setError('Only estates marked as test can be hard-purged.');
      return;
    }
    if (reason.trim().length < 8) {
      setError('Reason must be at least 8 characters.');
      return;
    }
    if (phrase.trim().toUpperCase() !== expected) {
      setError(`Type exactly: ${expected}`);
      return;
    }
    setBusy(true);
    const result = await purgeTestEstate(estate.case_number, reason.trim(), phrase.trim());
    setBusy(false);
    if (!result.success) {
      setError(result.error || 'Purge failed.');
      return;
    }
    onDone?.(result.data);
    onClose?.();
  };

  const modal = (
    <div className="ei-force-pwd-screen" role="presentation">
      <div className="ei-modal ei-super-purge-modal" role="dialog" aria-modal="true">
        <div className="ei-modal-head">
          <h3>Purge test estate</h3>
        </div>
        <form className="ei-modal-form" onSubmit={handleSubmit}>
          <div className="ei-modal-body">
            <p className="ei-force-pwd-warning">
              This permanently deletes <strong>{estate.estate_name}</strong> (
              {estate.case_number}) after writing a sealed archive. Real estates cannot use this
              path — soft-delete them instead.
            </p>
            <div className="ei-field">
              <label htmlFor="super-purge-reason">Reason (required)</label>
              <textarea
                id="super-purge-reason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="ei-field">
              <label htmlFor="super-purge-phrase">Type {expected}</label>
              <input
                id="super-purge-phrase"
                type="text"
                value={phrase}
                onChange={(e) => setPhrase(e.target.value)}
                autoComplete="off"
                required
              />
            </div>
            {error ? <div className="ei-error">{error}</div> : null}
          </div>
          <div className="ei-modal-foot ei-btn-row">
            <button type="button" className="ei-btn ei-btn-secondary" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="ei-btn ei-btn-danger" disabled={busy}>
              {busy ? 'Purging…' : 'Purge permanently'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return modal;
  return createPortal(modal, document.body);
};

export default EstateSuperPurgeModal;

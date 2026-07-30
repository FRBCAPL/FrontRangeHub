import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * One confirmation dialog for every Super Admin action.
 *
 * Each action states its own target, consequences, and reversibility, so the
 * operator never has to guess which row a floating reason box applies to.
 */
const EstateSuperConfirmModal = ({
  open,
  title,
  target,
  summary,
  effects = [],
  reversible = null,
  danger = false,
  confirmLabel = 'Confirm',
  busyLabel = 'Working…',
  reasonPlaceholder = 'Why are you doing this?',
  reasonMinLength = 5,
  extraField = null,
  onCancel,
  onConfirm
}) => {
  const [reason, setReason] = useState('');
  const [extra, setExtra] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setReason('');
      setExtra(extraField?.initialValue || '');
      setError('');
      setBusy(false);
    }
  }, [open, extraField?.initialValue]);

  if (!open) return null;

  const reasonShort = reason.trim().length < reasonMinLength;
  const extraMissing = Boolean(extraField?.required) && !extra.trim();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (reasonShort) {
      setError(`Reason must be at least ${reasonMinLength} characters.`);
      return;
    }
    if (extraMissing) {
      setError(`${extraField.label} is required.`);
      return;
    }
    setBusy(true);
    const result = await onConfirm(reason.trim(), extra.trim());
    setBusy(false);
    if (result && result.success === false) {
      setError(result.error || 'Action failed.');
    }
  };

  const modal = (
    <div className="ei-force-pwd-screen" role="presentation">
      <div
        className={`ei-modal ei-super-confirm-modal${danger ? ' ei-super-confirm-danger' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ei-super-confirm-title"
      >
        <div className="ei-modal-head">
          <h3 id="ei-super-confirm-title">{title}</h3>
        </div>
        <form className="ei-modal-form" onSubmit={handleSubmit}>
          <div className="ei-modal-body">
            {target ? <p className="ei-super-confirm-target">{target}</p> : null}
            {summary ? <p className="ei-super-confirm-summary">{summary}</p> : null}

            {effects.length ? (
              <ul className="ei-super-effects">
                {effects.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : null}

            {reversible ? <p className="ei-settings-hint">{reversible}</p> : null}

            {extraField ? (
              <div className="ei-field">
                <label htmlFor="ei-super-confirm-extra">{extraField.label}</label>
                <input
                  id="ei-super-confirm-extra"
                  type="text"
                  value={extra}
                  onChange={(e) => setExtra(e.target.value)}
                  placeholder={extraField.placeholder || ''}
                  autoComplete="off"
                />
              </div>
            ) : null}

            <div className="ei-field">
              <label htmlFor="ei-super-confirm-reason">
                Reason for the operator log (required)
              </label>
              <textarea
                id="ei-super-confirm-reason"
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={reasonPlaceholder}
                minLength={reasonMinLength}
                required
              />
              <p className="ei-field-hint">
                Recorded permanently in the operator audit log with your email and the time.
              </p>
            </div>

            {error ? <div className="ei-error">{error}</div> : null}
          </div>
          <div className="ei-modal-foot ei-btn-row">
            <button
              type="button"
              className="ei-btn ei-btn-secondary"
              onClick={onCancel}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`ei-btn${danger ? ' ei-btn-danger' : ''}`}
              disabled={busy}
            >
              {busy ? busyLabel : confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return modal;
  return createPortal(modal, document.body);
};

export default EstateSuperConfirmModal;

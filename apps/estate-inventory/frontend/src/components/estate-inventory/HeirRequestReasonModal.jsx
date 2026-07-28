import React, { useEffect, useState } from 'react';

/**
 * Short reason required before an heir request is submitted.
 */
const HeirRequestReasonModal = ({ open, itemName, onClose, onSubmit, busy }) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setReason('');
    setError('');
  }, [open]);

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (trimmed.length < 3) {
      setError('Please enter a short reason (at least a few words).');
      return;
    }
    onSubmit?.(trimmed);
  };

  return (
    <div className="ei-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="ei-modal ei-modal-settings"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ei-request-reason-title"
        onClick={(ev) => ev.stopPropagation()}
        style={{ height: 'auto', maxHeight: 'min(88vh, 88dvh)' }}
      >
        <div className="ei-modal-head">
          <h3 id="ei-request-reason-title">Request this item</h3>
          <button type="button" className="ei-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <form className="ei-modal-form" onSubmit={handleSubmit}>
          <div className="ei-modal-body">
            <p className="ei-settings-intro">
              {itemName ? (
                <>
                  <strong> {itemName}</strong>.
                </>
              ) : (
                'Why are you asking for this item?'
              )}
            </p>
            <div className="ei-field">
              <label htmlFor="ei-request-reason">Please give a short reason for your request.</label>
              <textarea
                id="ei-request-reason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Sentimental value — Mom used this every holiday"
                maxLength={500}
                required
              />
            </div>
            {error ? <div className="ei-error">{error}</div> : null}
          </div>
          <div className="ei-modal-foot ei-btn-row">
            <button type="button" className="ei-btn ei-btn-secondary" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="ei-btn" disabled={busy}>
              {busy ? 'Submitting…' : 'Submit request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HeirRequestReasonModal;

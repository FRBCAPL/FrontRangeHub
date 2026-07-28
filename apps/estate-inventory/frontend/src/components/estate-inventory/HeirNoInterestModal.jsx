import React from 'react';

/**
 * Confirm heir “no interest / approve for public sale” without a browser alert.
 */
const HeirNoInterestModal = ({ open, itemName, onClose, onConfirm, busy }) => {
  if (!open) return null;

  return (
    <div
      className="ei-modal-backdrop"
      role="presentation"
      onClick={() => {
        if (!busy) onClose?.();
      }}
    >
      <div
        className="ei-modal ei-modal-settings"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ei-no-interest-title"
        onClick={(ev) => ev.stopPropagation()}
        style={{ height: 'auto', maxHeight: 'min(88vh, 88dvh)' }}
      >
        <div className="ei-modal-head">
          <h3 id="ei-no-interest-title">No interest / public sale</h3>
          <button
            type="button"
            className="ei-modal-close"
            onClick={onClose}
            aria-label="Close"
            disabled={busy}
          >
            ×
          </button>
        </div>
        <div className="ei-modal-body">
          <p className="ei-settings-intro">
            {itemName ? (
              <>
                Mark <strong>{itemName}</strong> as no interest and approve it for public sale?
              </>
            ) : (
              'Mark this item as no interest and approve it for public sale?'
            )}
          </p>
          <p className="ei-settings-hint" style={{ marginTop: '0.65rem' }}>
            This means you do not wish to retain it for personal use and authorize the estate to
            liquidate it to fund estate expenses.
          </p>
          <p className="ei-settings-hint" style={{ marginTop: '0.45rem' }}>
            It lists for public sale only after all named heirs also approve. Unclaimed items may
            still be added to public sale after the probate end date.
          </p>
        </div>
        <div className="ei-modal-foot ei-btn-row">
          <button type="button" className="ei-btn ei-btn-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="ei-btn" onClick={onConfirm} disabled={busy}>
            {busy ? 'Saving…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default HeirNoInterestModal;

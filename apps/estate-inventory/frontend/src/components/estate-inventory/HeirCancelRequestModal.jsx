import React from 'react';

/**
 * Confirm withdrawing an heir item request without a browser alert.
 */
const HeirCancelRequestModal = ({ open, itemName, onClose, onConfirm, busy }) => {
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
        aria-labelledby="ei-cancel-request-title"
        onClick={(ev) => ev.stopPropagation()}
        style={{ height: 'auto', maxHeight: 'min(88vh, 88dvh)' }}
      >
        <div className="ei-modal-head">
          <h3 id="ei-cancel-request-title">Cancel request</h3>
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
                Withdraw your request for <strong>{itemName}</strong>?
              </>
            ) : (
              'Withdraw your request for this item?'
            )}
          </p>
          <p className="ei-settings-hint" style={{ marginTop: '0.65rem' }}>
            You can request it again later if it is still available.
          </p>
        </div>
        <div className="ei-modal-foot ei-btn-row">
          <button type="button" className="ei-btn ei-btn-secondary" onClick={onClose} disabled={busy}>
            Keep request
          </button>
          <button type="button" className="ei-btn" onClick={onConfirm} disabled={busy}>
            {busy ? 'Cancelling…' : 'Withdraw request'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default HeirCancelRequestModal;

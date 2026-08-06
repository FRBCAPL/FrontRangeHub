import React from 'react';
import { createPortal } from 'react-dom';

/**
 * Confirm withdrawing an heir item request without a browser alert.
 * Portaled above room browse when opened from a room’s item list.
 */
const HeirCancelRequestModal = ({ open, itemName, onClose, onConfirm, busy }) => {
  if (!open) return null;

  const modal = (
    <div className="estate-inventory ei-modal-portal">
      <div
        className="ei-modal-backdrop ei-heir-stack-backdrop"
        role="presentation"
        onClick={() => {
          if (!busy) onClose?.();
        }}
      >
        <div
          className="ei-modal ei-modal-settings ei-heir-stack-modal"
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
    </div>
  );

  if (typeof document !== 'undefined' && document.body) {
    return createPortal(modal, document.body);
  }
  return modal;
};

export default HeirCancelRequestModal;

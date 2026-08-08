import React from 'react';
import { createPortal } from 'react-dom';

/**
 * Confirm heir marks no interest on remaining items in one room
 * (keeps any items they already requested in that room).
 */
const HeirBulkNoInterestModal = ({
  open,
  roomName = '',
  remainingCount = 0,
  keptClaimCount = 0,
  onClose,
  onConfirm,
  busy = false,
  progressText = ''
}) => {
  if (!open) return null;

  const roomLabel = String(roomName || '').trim() || 'this room';

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
          aria-labelledby="ei-bulk-no-interest-title"
          onClick={(ev) => ev.stopPropagation()}
          style={{ height: 'auto', maxHeight: 'min(88vh, 88dvh)' }}
        >
          <div className="ei-modal-head">
            <h3 id="ei-bulk-no-interest-title">No interest in remaining items in this room</h3>
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
              Mark <strong>{remainingCount}</strong> remaining item
              {remainingCount === 1 ? '' : 's'} in <strong>{roomLabel}</strong> as no interest /
              approve for sale inventory?
            </p>
            {keptClaimCount > 0 ? (
              <p className="ei-settings-hint" style={{ marginTop: '0.65rem' }}>
                Your <strong>{keptClaimCount}</strong> requested item
                {keptClaimCount === 1 ? '' : 's'} in this room stay claimed and are not included.
              </p>
            ) : (
              <p className="ei-settings-hint" style={{ marginTop: '0.65rem' }}>
                You have no open requests in this room — this covers all remaining items here you can
                release.
              </p>
            )}
            <p className="ei-settings-hint" style={{ marginTop: '0.45rem' }}>
              Only this room is affected. Other rooms are unchanged. This does not automatically add
              anything to the sale inventory until other named heirs also release (or the Personal
              Representative acts). Memorandum gifts and items already settled are skipped.
            </p>
            {busy && progressText ? (
              <p className="ei-status" style={{ marginTop: '0.75rem' }} role="status">
                {progressText}
              </p>
            ) : null}
          </div>
          <div className="ei-modal-foot ei-btn-row">
            <button
              type="button"
              className="ei-btn ei-btn-secondary"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="button"
              className="ei-btn"
              onClick={onConfirm}
              disabled={busy || remainingCount < 1}
            >
              {busy ? 'Saving…' : 'Confirm no interest'}
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

export default HeirBulkNoInterestModal;

import React from 'react';

/** Below-par or low-stock warning shown before a transfer; the transfer waits for "Transfer anyway". */
export default function ItemsureTransferWarning({ warning, busy, confirmLabel = 'Transfer anyway', onConfirm, onCancel }) {
  return (
    <div className={`isu-transfer-warning isu-transfer-warning--${warning.tone}`} role="alert">
      {warning.changed ? <p><strong>Stock or levels changed since you looked.</strong> Check the new figures and confirm again.</p> : null}
      <strong>{warning.title}</strong>
      <p>{warning.text}</p>
      <div className="isu-restock-move-actions">
        <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={onCancel}>Go back</button>
        <button type="button" className="isu-btn isu-btn--primary isu-btn--sm" disabled={busy} onClick={onConfirm}>
          {busy ? 'Transferring…' : confirmLabel}
        </button>
      </div>
    </div>
  );
}

import React from 'react';
import '../../AddPlayerModal.css';

/** Modal shell in the tournament app's existing modal style. `busy` blocks closing while a save runs. */
export default function CashClimbV3Dialog({ title, onClose, busy = false, children }) {
  const close = () => { if (!busy) onClose(); };
  return (
    <div className="add-player-modal-overlay ccv3-dialog-overlay" onClick={close}>
      <div className="add-player-modal ccv3-dialog" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="add-player-modal-header">
          <h3>{title}</h3>
          <button type="button" className="add-player-modal-close" onClick={close} aria-label="Close" disabled={busy}>&times;</button>
        </div>
        <div className="ccv3-dialog-body">{children}</div>
      </div>
    </div>
  );
}

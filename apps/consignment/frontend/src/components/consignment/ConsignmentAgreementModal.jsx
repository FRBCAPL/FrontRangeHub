import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import ConsignmentModal from './ConsignmentModal.jsx';

/**
 * Sell page: read the consignment or auction agreement in a dialog. text is already filled in from settings.
 * Opens over the sell wizard, which closes on any Escape, so Escape is caught first here and only closes this.
 */
export default function ConsignmentAgreementModal({ method, text, onClose }) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const title = method === 'auction' ? 'Online auction agreement' : 'Consignment agreement';

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      closeRef.current();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  return createPortal(
    <div className="cs-portal">
      <ConsignmentModal titleId="cs-agreement-modal-title" onClose={onClose}>
        <div className="cs-modal-card cs-agreement-modal">
          <h2 id="cs-agreement-modal-title">{title}</h2>
          <div className="cs-wiz-agree cs-terms-text cs-agreement-modal-text" tabIndex={0}>{text}</div>
          <p className="cs-hint">You’ll read and accept this again at the last step, before you submit.</p>
          <div className="cs-actions">
            <button type="button" className="cs-btn" onClick={onClose}>Close</button>
          </div>
        </div>
      </ConsignmentModal>
    </div>,
    document.body,
  );
}

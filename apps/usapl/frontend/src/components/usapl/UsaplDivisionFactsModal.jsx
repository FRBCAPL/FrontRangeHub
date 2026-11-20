import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function UsaplDivisionFactsModal({
  title,
  kicker = 'Details',
  onClose,
  children,
  className = '',
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return createPortal(
    <div className="usapl-info-overlay" role="presentation" onClick={onClose}>
      <div
        className={`usapl-info-dialog usapl-facts-modal${className ? ` ${className}` : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="usapl-division-facts-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="usapl-facts-modal-head">
          <div className="usapl-facts-modal-head-copy">
            {kicker ? <p className="usapl-facts-modal-kicker">{kicker}</p> : null}
            <h2 id="usapl-division-facts-title">{title}</h2>
          </div>
          <button
            type="button"
            className="usapl-facts-modal-x"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </header>
        <div className="usapl-info-dialog-body">{children}</div>
        <div className="usapl-actions usapl-facts-modal-foot">
          <button className="usapl-btn" type="button" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

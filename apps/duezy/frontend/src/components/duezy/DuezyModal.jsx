import React, { useEffect, useId } from 'react';
import { createPortal } from 'react-dom';

/** Popup shell: full screen on phones, centered card on bigger screens. Escape or the backdrop closes it. */
export default function DuezyModal({ title, onClose, children, className = '' }) {
  const titleId = useId();

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  // Portal into .dz-app so inputs keep Duezy styles; .dz-main's animation transform would break position:fixed.
  const host = document.querySelector('.dz-app') || document.body;
  return createPortal(
    <div className="dz-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`dz-modal ${className}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="dz-modal-head">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="dz-modal-close" onClick={onClose} aria-label="Close">×</button>
        </header>
        {children}
      </div>
    </div>,
    host
  );
}

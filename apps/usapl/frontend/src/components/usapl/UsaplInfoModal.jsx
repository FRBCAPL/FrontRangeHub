import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function UsaplInfoModal({ title, onClose, children, fillHeight = false }) {
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
    <div
      className="usapl-info-topic-overlay"
      role="presentation"
      onClick={onClose}
    >
      <div
        className={`usapl-info-topic-modal${fillHeight ? ' is-fill' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="usapl-info-topic-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="usapl-info-topic-title">{title}</h2>
        <div className="usapl-info-topic-body">{children}</div>
        <div className="usapl-actions">
          <button className="usapl-btn" type="button" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

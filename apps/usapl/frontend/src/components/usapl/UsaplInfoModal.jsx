import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function UsaplInfoModal({
  title,
  kicker = '',
  tone = 'rack',
  onClose,
  children,
  fillHeight = false,
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
    <div
      className="usapl-info-topic-overlay"
      role="presentation"
      onClick={onClose}
    >
      <div
        className={`usapl-info-topic-modal tone-${tone}${fillHeight ? ' is-fill' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="usapl-info-topic-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="usapl-info-topic-head">
          <div className="usapl-info-topic-head-copy">
            {kicker ? <p className="usapl-info-topic-kicker">{kicker}</p> : null}
            <h2 id="usapl-info-topic-title">{title}</h2>
          </div>
          <button
            type="button"
            className="usapl-info-topic-x"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </header>
        <div className="usapl-info-topic-body">{children}</div>
        <div className="usapl-actions usapl-info-topic-foot">
          <button className="usapl-btn" type="button" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

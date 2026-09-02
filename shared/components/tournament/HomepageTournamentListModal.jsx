import React, { useEffect } from 'react';
import './TournamentBannerAll.css';

export default function HomepageTournamentListModal({
  title,
  items = [],
  loading = false,
  onClose,
  onPick,
}) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const note = loading
    ? 'Looking for live events…'
    : items.length
      ? 'Pick the event you want.'
      : '';

  return (
    <div
      className="tba-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tba-list-title"
    >
      <div className="tba-modal" onClick={(e) => e.stopPropagation()}>
        <div className="tba-modal-head">
          <h2 id="tba-list-title">{title || 'Current tournaments'}</h2>
          <button type="button" className="tba-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        {note ? <p className="tba-modal-note">{note}</p> : null}
        {loading ? null : items.length ? (
          <ul className="tba-modal-list">
            {items.map((item) => (
              <li key={item.id}>
                <button type="button" className="tba-modal-item" onClick={() => onPick(item)}>
                  <span className="tba-modal-item-top">
                    <strong>{item.label}</strong>
                    {item.live ? <em className="tba-pill">Live</em> : null}
                    {item.urgent && !item.live ? <em className="tba-pill">Soon</em> : null}
                  </span>
                  {item.detail ? <span className="tba-modal-item-detail">{item.detail}</span> : null}
                  {item.cta ? <span className="tba-modal-item-cta">{item.cta}</span> : null}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="tba-modal-empty">No live tournaments right now.</p>
        )}
        <div className="tba-modal-foot">
          <button type="button" className="tba-modal-done" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

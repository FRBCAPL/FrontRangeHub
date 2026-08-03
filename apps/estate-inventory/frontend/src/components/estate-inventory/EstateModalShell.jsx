import React, { useEffect, useRef } from 'react';

/** Shared dialog chrome: pinned head and foot, scrolling body.
 * Prefer this for new Estate Vault modals — do not hand-roll
 * height:auto + overflow:hidden shells (body will clip and not scroll).
 */
const EstateModalShell = ({
  title,
  subtitle,
  onClose,
  children,
  foot,
  className = '',
  compact = false
}) => {
  const closeBtnRef = useRef(null);

  useEffect(() => {
    closeBtnRef.current?.focus();
  }, []);

  useEffect(() => {
    if (typeof onClose !== 'function') return undefined;
    const onKeyDown = (ev) => {
      if (ev.key === 'Escape') {
        ev.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="ei-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className={`ei-modal ei-modal-shell${compact ? ' ei-modal-shell--compact' : ''}${
          className ? ` ${className}` : ''
        }`}
        role="dialog"
        aria-modal="true"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="ei-modal-head">
          <div>
            <h3>{title}</h3>
            {subtitle ? (
              <p className="ei-settings-hint" style={{ margin: '0.2rem 0 0' }}>
                {subtitle}
              </p>
            ) : null}
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            className="ei-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="ei-modal-body">{children}</div>
        <div className="ei-modal-foot ei-btn-row">
          {foot || (
            <button type="button" className="ei-btn ei-btn-secondary" onClick={onClose}>
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EstateModalShell;

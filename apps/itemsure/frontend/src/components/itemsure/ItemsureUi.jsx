import React, { useEffect, useId, useRef } from 'react';

export function Field({ label, hint, children }) {
  const id = useId();
  const child = React.Children.only(children);
  return (
    <div className="isu-field">
      <label htmlFor={id}>{label}</label>
      {React.cloneElement(child, { id, 'aria-describedby': hint ? `${id}-hint` : undefined })}
      {hint ? <p id={`${id}-hint`} className="isu-hint">{hint}</p> : null}
    </div>
  );
}

export function ErrorNote({ message }) {
  if (!message) return null;
  return <p className="isu-error" role="alert">{message}</p>;
}

/** A page whose data could not load. Never shown as an empty list. */
export function LoadFailed({ message, onRetry }) {
  return (
    <div className="isu-card isu-empty">
      <h2>Couldn&apos;t load this page</h2>
      <p className="isu-muted">{message}</p>
      {onRetry ? <button type="button" className="isu-btn isu-btn--ghost" onClick={onRetry}>Try again</button> : null}
    </div>
  );
}

export function Card({ title, eyebrow, children, actions }) {
  return (
    <section className="isu-card">
      {eyebrow ? <p className="isu-eyebrow">{eyebrow}</p> : null}
      {title || actions ? (
        <div className="isu-card-head">
          {title ? <h2>{title}</h2> : <span />}
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function PageHead({ title, description, action }) {
  return (
    <div className="isu-page-head">
      <div>
        <h1>{title}</h1>
        {description ? <p className="isu-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Modal({ open, title, onClose, wide = false, className = '', children }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (open) panelRef.current?.querySelector('input, select, textarea')?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="isu-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`isu-modal${wide ? ' is-wide' : ''}${className ? ` ${className}` : ''}`} role="dialog" aria-modal="true" aria-label={title} ref={panelRef}>
        <div className="isu-modal-head">
          <h2>{title}</h2>
          <button type="button" className="isu-icon-btn" onClick={onClose} aria-label="Close">
            {'\u00d7'}
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

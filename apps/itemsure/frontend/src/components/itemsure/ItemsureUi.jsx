import React, { useEffect, useId, useRef } from 'react';
import { focusFirstField } from '../../utils/itemsureFocus.js';

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

/**
 * `headStart` sits left of the title (e.g. Edit). `subtitle` is a quiet line under the title.
 * `ariaLabel` overrides the dialog name when `title` is long or visual-only.
 */
export function Modal({ open, title, subtitle = null, headStart = null, onClose, wide = false, nested = false, className = '', ariaLabel = null, children }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (open) focusFirstField(panelRef.current);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    // Nested dialogs listen in capture and stop Escape so the parent item window stays open.
    const onKey = (event) => {
      if (event.key !== 'Escape') return;
      if (nested) event.stopImmediatePropagation();
      onClose();
    };
    document.addEventListener('keydown', onKey, nested);
    return () => document.removeEventListener('keydown', onKey, nested);
  }, [open, onClose, nested]);

  if (!open) return null;
  return (
    <div className={`isu-modal-backdrop${nested ? ' is-nested' : ''}`} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className={`isu-modal${wide ? ' is-wide' : ''}${className ? ` ${className}` : ''}${headStart ? ' has-head-start' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel || (typeof title === 'string' ? title : 'Dialog')}
        ref={panelRef}
      >
        <div className="isu-modal-head">
          {headStart ? <div className="isu-modal-head-start">{headStart}</div> : null}
          <div className="isu-modal-title">
            <h2>{title}</h2>
            {subtitle ? <p className="isu-modal-subtitle">{subtitle}</p> : null}
          </div>
          <button type="button" className="isu-icon-btn" onClick={onClose} aria-label="Close">
            {'\u00d7'}
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

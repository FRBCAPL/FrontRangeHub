import React, { useCallback, useEffect, useRef, useState } from 'react';
import './BreakAndRun.css';

/** In-app replacement for window.confirm; message paragraphs split on blank lines. */
export function BreakAndRunConfirmDialog({
  title = 'Are you sure?',
  message = '',
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
  tone = 'go',
  onConfirm,
  onCancel,
}) {
  const confirmRef = useRef(null);

  useEffect(() => {
    confirmRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const paragraphs = String(message).split(/\n\s*\n/).filter(Boolean);

  return (
    <div
      className="cc-modal-overlay bnr-confirm-overlay"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="bnr-confirm-title"
      onClick={(e) => {
        e.stopPropagation();
        onCancel();
      }}
    >
      <div className="cc-modal bnr-confirm" onClick={(e) => e.stopPropagation()}>
        <h3 id="bnr-confirm-title">{title}</h3>
        {paragraphs.map((text, index) => (
          <p key={index} className="bnr-confirm-text">{text}</p>
        ))}
        <div className="form-actions bnr-confirm-actions">
          <button type="button" className="btn-secondary" onClick={onCancel}>{cancelLabel}</button>
          <button
            ref={confirmRef}
            type="button"
            className={`btn-primary${tone === 'danger' ? ' bnr-confirm-danger' : ''}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * const [confirm, confirmDialog] = useBreakAndRunConfirm();
 * if (!(await confirm({ title, message, confirmLabel }))) return;
 * Render {confirmDialog} somewhere in the component.
 */
export default function useBreakAndRunConfirm() {
  const [request, setRequest] = useState(null);
  const resolveRef = useRef(null);

  const confirm = useCallback((options = {}) => new Promise((resolve) => {
    resolveRef.current?.(false);
    resolveRef.current = resolve;
    setRequest(options);
  }), []);

  const close = useCallback((ok) => {
    const resolve = resolveRef.current;
    resolveRef.current = null;
    setRequest(null);
    resolve?.(ok);
  }, []);

  const handleCancel = useCallback(() => close(false), [close]);
  const handleConfirm = useCallback(() => close(true), [close]);

  const dialog = request ? (
    <BreakAndRunConfirmDialog
      title={request.title}
      message={request.message}
      confirmLabel={request.confirmLabel}
      cancelLabel={request.cancelLabel}
      tone={request.tone}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  ) : null;

  return [confirm, dialog];
}

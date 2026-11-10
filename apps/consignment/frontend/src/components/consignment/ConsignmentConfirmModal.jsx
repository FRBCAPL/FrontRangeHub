import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import ConsignmentModal from './ConsignmentModal.jsx';
import './consignment-confirm.css';

/**
 * The yes/no (or short note) dialog behind useConsignmentConfirm. It can open over other dialogs, including the
 * sell wizard that closes on any Escape, so Escape is caught first here and only cancels this one.
 */
export default function ConsignmentConfirmModal({ dialog, onDone }) {
  const { title, message, lines, confirmLabel, cancelLabel, inputLabel, placeholder, withInput } = dialog;
  const [text, setText] = useState('');
  const cancelRef = useRef(null);
  const cancel = () => onDone(withInput ? null : false);
  cancelRef.current = cancel;

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      cancelRef.current();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  const submit = (e) => {
    e.preventDefault();
    onDone(withInput ? text.trim() : true);
  };

  return createPortal(
    <div className="cs-portal cs-confirm-portal">
      <ConsignmentModal titleId="cs-confirm-title" onClose={cancel}>
        <form className="cs-modal-card cs-confirm" onSubmit={submit}>
          <h2 id="cs-confirm-title">{title}</h2>
          {message ? <p className="cs-confirm-message">{message}</p> : null}
          {lines.length ? (
            <ul className="cs-confirm-lines">
              {lines.map((line) => <li key={line}>{line}</li>)}
            </ul>
          ) : null}
          {withInput ? (
            <>
              <label htmlFor="cs-confirm-input">{inputLabel || 'Note (optional)'}</label>
              <textarea
                id="cs-confirm-input"
                rows={3}
                maxLength={500}
                value={text}
                placeholder={placeholder}
                onChange={(e) => setText(e.target.value)}
              />
            </>
          ) : null}
          <div className="cs-actions">
            <button type="submit" className="cs-btn">{confirmLabel}</button>
            <button type="button" className="cs-btn-secondary" onClick={cancel}>{cancelLabel}</button>
          </div>
        </form>
      </ConsignmentModal>
    </div>,
    document.body,
  );
}

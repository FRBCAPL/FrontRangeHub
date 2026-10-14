import React, { useEffect, useRef } from 'react';

const FOCUSABLE = 'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [href]';
const stack = [];

/**
 * Admin dialog shell: aria-modal, Escape closes (top dialog only, while not busy), focus moves into the
 * dialog on open and returns to the opener on close. Children are the dialog card (usually a form).
 */
export default function ConsignmentModal({ titleId, onClose, busy = false, children }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  const busyRef = useRef(busy);
  closeRef.current = onClose;
  busyRef.current = busy;

  useEffect(() => {
    const node = ref.current;
    const opener = document.activeElement;
    stack.push(node);
    const first = node?.querySelector(FOCUSABLE);
    (first || node)?.focus({ preventScroll: true });
    const onKey = (e) => {
      if (e.key !== 'Escape' || stack[stack.length - 1] !== node || busyRef.current) return;
      e.stopPropagation();
      closeRef.current?.();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      const i = stack.indexOf(node);
      if (i >= 0) stack.splice(i, 1);
      if (opener && typeof opener.focus === 'function' && document.contains(opener)) opener.focus({ preventScroll: true });
    };
  }, []);

  return (
    <div ref={ref} className="cs-modal" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
      {children}
    </div>
  );
}

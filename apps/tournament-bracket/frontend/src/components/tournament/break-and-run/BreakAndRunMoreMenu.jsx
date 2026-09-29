import React, { useEffect, useRef, useState } from 'react';
import './BreakAndRunOperator.css';

/** items: [{ label, onClick, danger? }] — falsy entries are skipped. */
export default function BreakAndRunMoreMenu({ items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const visible = (items || []).filter(Boolean);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!visible.length) return null;

  return (
    <div className="bnr-more" ref={ref}>
      <button
        type="button"
        className="tb-btn-new"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        More ▾
      </button>
      {open ? (
        <ul className="bnr-more-menu" role="menu">
          {visible.map((item) => (
            <li key={item.label} role="none">
              <button
                type="button"
                role="menuitem"
                className={item.danger ? 'is-danger' : undefined}
                onClick={() => {
                  setOpen(false);
                  item.onClick();
                }}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

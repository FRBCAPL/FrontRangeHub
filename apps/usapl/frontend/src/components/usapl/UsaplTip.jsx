import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export default function UsaplTip({ className, children, tip }) {
  const wrapRef = useRef(null);
  const tipId = useId();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, above: false });

  function place() {
    const box = wrapRef.current?.getBoundingClientRect();
    if (!box) return;
    const above = window.innerHeight - box.bottom < 96;
    setPos({
      top: above ? box.top - 8 : box.bottom + 8,
      left: box.left + box.width / 2,
      above,
    });
  }

  function show() {
    place();
    setOpen(true);
  }

  function hide() {
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return undefined;
    const close = () => setOpen(false);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  return (
    <>
      <span
        ref={wrapRef}
        className={`${className} usapl-tip-wrap`}
        tabIndex={0}
        aria-describedby={open ? tipId : undefined}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        {children}
      </span>
      {open
        ? createPortal(
            <span
              id={tipId}
              className={`usapl-tip is-open${pos.above ? ' is-above' : ''}`}
              role="tooltip"
              style={{ top: pos.top, left: pos.left }}
            >
              {tip}
            </span>,
            document.body
          )
        : null}
    </>
  );
}

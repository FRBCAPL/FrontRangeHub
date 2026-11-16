import React, { useEffect, useId, useRef, useState } from 'react';

/**
 * Short tip for icons and compact controls. Mouse hover shows it; keyboard focus-visible
 * shows it (mouse click focus does not pin it open). Touch taps toggle it. Escape or tap
 * outside closes. `label` is one short line. Pass `side` as top (default), bottom, left, or right.
 */
export default function Tip({ label, children, side = 'top', className = '' }) {
  const tipId = useId();
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  /** After a click/activation, ignore focus so the tip does not stick on the focused control. */
  const suppressRef = useRef(false);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDoc, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDoc, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!label) return children;

  let body = children;
  if (React.isValidElement(children) && children.type !== React.Fragment) {
    const prior = children.props['aria-describedby'];
    body = React.cloneElement(children, {
      title: undefined,
      'aria-describedby': prior ? `${prior} ${tipId}` : tipId,
    });
  }

  const hide = () => setOpen(false);
  const afterActivate = () => {
    suppressRef.current = true;
    setOpen(false);
  };

  return (
    <span
      ref={rootRef}
      className={`isu-tip isu-tip--${side}${open ? ' is-open' : ''}${className ? ` ${className}` : ''}`}
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') {
          suppressRef.current = false;
          setOpen(true);
        }
      }}
      onPointerLeave={() => {
        suppressRef.current = false;
        hide();
      }}
      onFocus={(event) => {
        if (suppressRef.current) return;
        // Keyboard only — mouse click leaves focus but must not pin the tip open.
        const focused = event.target;
        if (typeof focused?.matches === 'function' && focused.matches(':focus-visible')) {
          setOpen(true);
        }
      }}
      onBlur={hide}
      onPointerDown={(event) => {
        if (event.pointerType === 'touch' || event.pointerType === 'pen') {
          suppressRef.current = false;
          setOpen((on) => !on);
          return;
        }
        afterActivate();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') afterActivate();
      }}
    >
      {body}
      <span className="isu-tip-bubble" role="tooltip" id={tipId}>{label}</span>
    </span>
  );
}

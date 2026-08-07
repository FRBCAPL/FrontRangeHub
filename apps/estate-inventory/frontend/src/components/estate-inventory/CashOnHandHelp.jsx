import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CASH_AVAILABLE_RECONCILIATION } from '@shared/utils/estateCashCopy.js';

const TIP_WIDTH = () => Math.min(20 * 16, typeof window !== 'undefined' ? window.innerWidth * 0.86 : 320);
const VIEW_PAD = 8;
const GAP = 8;

function placeTip(anchorEl, tipEl) {
  if (!anchorEl || typeof window === 'undefined') return null;
  const rect = anchorEl.getBoundingClientRect();
  const width = TIP_WIDTH();
  const tipH = tipEl?.offsetHeight || 160;
  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;
  const preferAbove = spaceBelow < tipH + GAP + 24 && spaceAbove > spaceBelow;

  let top = preferAbove ? rect.top - tipH - GAP : rect.bottom + GAP;
  if (top < VIEW_PAD) top = VIEW_PAD;
  if (top + tipH > window.innerHeight - VIEW_PAD) {
    top = Math.max(VIEW_PAD, window.innerHeight - tipH - VIEW_PAD);
  }

  let left = rect.left + rect.width / 2 - width / 2;
  left = Math.min(Math.max(VIEW_PAD, left), window.innerWidth - width - VIEW_PAD);

  return {
    position: 'fixed',
    top: `${Math.round(top)}px`,
    left: `${Math.round(left)}px`,
    width: `${Math.round(width)}px`,
    zIndex: 12000
  };
}

/**
 * Cash on hand label + ? tip for the Money overview card.
 * Opens on hover (desktop) and click/tap (mobile); tip portals to body.
 */
const CashOnHandHelp = () => {
  const [open, setOpen] = useState(false);
  const [tipStyle, setTipStyle] = useState(null);
  const wrapRef = useRef(null);
  const btnRef = useRef(null);
  const tipRef = useRef(null);
  const closeTimer = useRef(null);
  const tipId = useId();

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const openTip = () => {
    cancelClose();
    setOpen(true);
  };

  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 160);
  };

  useLayoutEffect(() => {
    if (!open) {
      setTipStyle(null);
      return undefined;
    }
    const update = () => setTipStyle(placeTip(btnRef.current, tipRef.current));
    update();
    const raf = requestAnimationFrame(update);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    let remove = () => {};
    const timer = window.setTimeout(() => {
      const onDoc = (ev) => {
        const t = ev.target;
        if (wrapRef.current?.contains(t)) return;
        if (tipRef.current?.contains(t)) return;
        cancelClose();
        setOpen(false);
      };
      const onKey = (ev) => {
        if (ev.key === 'Escape') {
          cancelClose();
          setOpen(false);
        }
      };
      document.addEventListener('mousedown', onDoc);
      document.addEventListener('keydown', onKey);
      remove = () => {
        document.removeEventListener('mousedown', onDoc);
        document.removeEventListener('keydown', onKey);
      };
    }, 0);
    return () => {
      window.clearTimeout(timer);
      remove();
    };
  }, [open]);

  useEffect(
    () => () => {
      cancelClose();
    },
    []
  );

  const tip =
    open && typeof document !== 'undefined' && document.body
      ? createPortal(
          <div
            ref={tipRef}
            className="ei-cash-help-tip"
            role="tooltip"
            id={tipId}
            style={tipStyle || { position: 'fixed', visibility: 'hidden', zIndex: 12000 }}
            onMouseEnter={openTip}
            onMouseLeave={scheduleClose}
          >
            <strong>Cash on hand</strong>
            <p>{CASH_AVAILABLE_RECONCILIATION}</p>
          </div>,
          document.body
        )
      : null;

  return (
    <span
      className="ei-cash-help"
      ref={wrapRef}
      onMouseEnter={openTip}
      onMouseLeave={scheduleClose}
    >
      <span className="ei-cash-help-label">Cash on hand</span>
      <button
        ref={btnRef}
        type="button"
        className="ei-cash-help-btn"
        aria-label="What is Cash on hand?"
        aria-expanded={open}
        aria-controls={open ? tipId : undefined}
        onFocus={openTip}
        onBlur={(ev) => {
          if (tipRef.current?.contains(ev.relatedTarget)) return;
          scheduleClose();
        }}
        onClick={(ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          cancelClose();
          setOpen((v) => !v);
        }}
      >
        ?
      </button>
      {tip}
    </span>
  );
};

export default CashOnHandHelp;

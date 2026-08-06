import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getGlossaryEntry } from '@shared/utils/estateGlossary.js';

const TIP_WIDTH = () => Math.min(20 * 16, window.innerWidth * 0.78);
const VIEW_PAD = 8;
const GAP = 8;

function placeTip(anchorEl, tipEl) {
  if (!anchorEl) return null;
  const rect = anchorEl.getBoundingClientRect();
  const width = TIP_WIDTH();
  const tipH = tipEl?.offsetHeight || 120;
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
 * Inline plain-language help for probate terms. Works on hover (desktop) and
 * tap (mobile); closes on outside click or Escape. Purely presentational —
 * safe to drop next to any label.
 *
 * Usage:
 *   <GlossaryTerm termKey="letters" />                // renders the term + help
 *   <GlossaryTerm termKey="letters">Letters date</GlossaryTerm>  // custom label
 *   <GlossaryTerm termKey="letters" iconOnly />       // just the (?) button
 */
const GlossaryTerm = ({ termKey, children, iconOnly = false, className = '' }) => {
  const entry = getGlossaryEntry(termKey);
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

  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 140);
  };

  const openTip = () => {
    cancelClose();
    setOpen(true);
  };

  useLayoutEffect(() => {
    if (!open) {
      setTipStyle(null);
      return undefined;
    }

    const update = () => {
      setTipStyle(placeTip(btnRef.current, tipRef.current));
    };
    update();
    // Second pass after tip paints so height-based flip is accurate.
    const raf = requestAnimationFrame(update);

    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, entry?.term, entry?.full, entry?.short]);

  useEffect(() => {
    if (!open) return undefined;
    const onDocClick = (ev) => {
      const t = ev.target;
      if (wrapRef.current?.contains(t)) return;
      if (tipRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (ev) => {
      if (ev.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(
    () => () => {
      cancelClose();
    },
    []
  );

  if (!entry) {
    return children ? <>{children}</> : null;
  }

  const label = children != null ? children : entry.term;
  const canPortal = typeof document !== 'undefined' && document.body;

  const tip =
    open && canPortal
      ? createPortal(
          <span
            ref={tipRef}
            className="ei-term-pop ei-term-pop--portal"
            role="tooltip"
            id={tipId}
            style={tipStyle || { position: 'fixed', visibility: 'hidden', zIndex: 12000 }}
            onMouseEnter={openTip}
            onMouseLeave={scheduleClose}
          >
            <strong>{entry.term}</strong>
            <span>{entry.full || entry.short}</span>
          </span>,
          document.body
        )
      : null;

  return (
    <span
      className={`ei-term${className ? ` ${className}` : ''}`}
      ref={wrapRef}
      onMouseEnter={openTip}
      onMouseLeave={scheduleClose}
    >
      {!iconOnly ? <span className="ei-term-label">{label}</span> : null}
      <button
        ref={btnRef}
        type="button"
        className="ei-term-btn"
        aria-label={`What is ${entry.term}?`}
        aria-expanded={open}
        aria-describedby={open ? tipId : undefined}
        style={{
          width: '23px',
          height: '23px',
          minWidth: '23px',
          minHeight: '23px',
          maxWidth: '23px',
          maxHeight: '23px',
          padding: 0,
          fontSize: '13px',
          lineHeight: 1,
          boxSizing: 'border-box'
        }}
        onClick={(ev) => {
          ev.stopPropagation();
          cancelClose();
          setOpen((v) => !v);
        }}
        onFocus={openTip}
        onBlur={(ev) => {
          if (tipRef.current?.contains(ev.relatedTarget)) return;
          scheduleClose();
        }}
      >
        ?
      </button>
      {tip}
    </span>
  );
};

export default GlossaryTerm;

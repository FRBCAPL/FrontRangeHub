import React, { useEffect, useId, useRef, useState } from 'react';
import { getGlossaryEntry } from '@shared/utils/estateGlossary.js';

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
  const wrapRef = useRef(null);
  const tipId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const onDocClick = (ev) => {
      if (wrapRef.current && !wrapRef.current.contains(ev.target)) setOpen(false);
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

  if (!entry) {
    return children ? <>{children}</> : null;
  }

  const label = children != null ? children : entry.term;

  return (
    <span
      className={`ei-term${className ? ` ${className}` : ''}`}
      ref={wrapRef}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {!iconOnly ? <span className="ei-term-label">{label}</span> : null}
      <button
        type="button"
        className="ei-term-btn"
        aria-label={`What is ${entry.term}?`}
        aria-expanded={open}
        aria-describedby={open ? tipId : undefined}
        onClick={(ev) => {
          ev.stopPropagation();
          setOpen((v) => !v);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        ?
      </button>
      {open ? (
        <span className="ei-term-pop" role="tooltip" id={tipId}>
          <strong>{entry.term}</strong>
          <span>{entry.full || entry.short}</span>
        </span>
      ) : null}
    </span>
  );
};

export default GlossaryTerm;

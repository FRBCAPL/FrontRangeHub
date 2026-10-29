import React, { useEffect, useId, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

const DESKTOP = '(min-width: 820px)';
const isDesktop = () => typeof window !== 'undefined' && window.matchMedia?.(DESKTOP).matches;

/**
 * The "More" menu entry. On phones it opens a panel above the bottom bar and
 * closes after a choice; in the desktop sidebar it expands in place and stays
 * open while one of its pages is showing.
 */
export default function ItemsureNavMore({ links, linkClass }) {
  const { pathname } = useLocation();
  const panelId = useId();
  const rootRef = useRef(null);
  const current = links.some((l) => pathname === l.to || pathname.startsWith(`${l.to}/`));
  const [open, setOpen] = useState(() => current && isDesktop());

  useEffect(() => {
    setOpen(current && isDesktop());
  }, [pathname, current]);

  useEffect(() => {
    if (!open || isDesktop()) return undefined;
    const onDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!links.length) return null;

  return (
    <div className={`isu-nav-more${open ? ' is-open' : ''}`} ref={rootRef}>
      <button
        type="button"
        className={`isu-nav-link isu-nav-more-btn${current ? ' is-active' : ''}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
      >
        <span aria-hidden="true" className="isu-nav-icon">{'\u22EF'}</span>
        <span>More</span>
        <span aria-hidden="true" className="isu-nav-more-caret">{open ? '\u25B4' : '\u25BE'}</span>
      </button>
      {open ? (
        <div id={panelId} className="isu-nav-more-panel">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} className={linkClass}>
              <span aria-hidden="true" className="isu-nav-icon">{link.icon}</span>
              <span>{link.label}</span>
            </NavLink>
          ))}
        </div>
      ) : null}
    </div>
  );
}

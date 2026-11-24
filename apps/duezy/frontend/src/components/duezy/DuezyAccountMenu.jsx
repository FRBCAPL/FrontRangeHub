import React, { useEffect, useRef, useState } from 'react';
import { Link, matchPath, useLocation } from 'react-router-dom';
import { DUEZY_PATH } from '../../data/duezyOptions.js';

/** League id from /duezy/league/:id/…, or null on the home / billing / admin pages. */
function leagueIdFromPath(pathname) {
  const match = matchPath({ path: `${DUEZY_PATH}/league/:leagueId/*`, end: false }, pathname)
    || matchPath({ path: `${DUEZY_PATH}/league/:leagueId`, end: true }, pathname);
  return match?.params?.leagueId || null;
}

/** Avatar button → this league's settings (when on a league), Billing, Admin (admins only), Log out. */
export default function DuezyAccountMenu({ user, isAdmin, onSignOut }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const buttonRef = useRef(null);
  const location = useLocation();
  const leagueId = leagueIdFromPath(location.pathname);
  const name = user?.user_metadata?.full_name || user?.email || '';
  const initial = (name.trim()[0] || '?').toUpperCase();

  useEffect(() => { setOpen(false); }, [location.pathname, location.search]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
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

  return (
    <div className="dz-account" ref={ref}>
      <button
        ref={buttonRef}
        type="button"
        className="dz-account-button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${user?.email || 'you'}`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="dz-avatar dz-avatar--sm" aria-hidden="true">{initial}</span>
        <span className="dz-header-email">{user?.email}</span>
        <span className="dz-account-caret" aria-hidden="true">▾</span>
      </button>
      {open ? (
        <div className="dz-account-menu" role="menu">
          <div className="dz-account-who">
            <strong>{user?.user_metadata?.full_name || 'Signed in'}</strong>
            <small className="dz-muted">{user?.email}</small>
          </div>
          <Link role="menuitem" to={DUEZY_PATH} className="dz-account-item">Your leagues</Link>
          {leagueId ? (
            <Link role="menuitem" to={`${DUEZY_PATH}/league/${leagueId}/settings`} className="dz-account-item">
              League settings
            </Link>
          ) : null}
          <Link role="menuitem" to={`${DUEZY_PATH}/billing`} className="dz-account-item">Billing &amp; plan</Link>
          {isAdmin ? <Link role="menuitem" to={`${DUEZY_PATH}/admin`} className="dz-account-item">Admin</Link> : null}
          <button role="menuitem" type="button" className="dz-account-item is-danger" onClick={onSignOut}>Log out</button>
        </div>
      ) : null}
    </div>
  );
}

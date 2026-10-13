import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { DUEZY_PATH } from '../../data/duezyOptions.js';

/** Avatar button → Billing, Admin (admins only), Log out. Closes on outside click, Escape or navigation. */
export default function DuezyAccountMenu({ user, isAdmin, onSignOut }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const buttonRef = useRef(null);
  const location = useLocation();
  const name = user?.user_metadata?.full_name || user?.email || '';
  const initial = (name.trim()[0] || '?').toUpperCase();

  useEffect(() => { setOpen(false); }, [location.pathname]);

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
          <Link role="menuitem" to={`${DUEZY_PATH}/billing`} className="dz-account-item">Billing &amp; plan</Link>
          {isAdmin ? <Link role="menuitem" to={`${DUEZY_PATH}/admin`} className="dz-account-item">Admin</Link> : null}
          <button role="menuitem" type="button" className="dz-account-item is-danger" onClick={onSignOut}>Log out</button>
        </div>
      ) : null}
    </div>
  );
}

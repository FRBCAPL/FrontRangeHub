import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { activeGroups } from './adminAttentionSources.js';
import { ADMIN_INBOX_PATH } from './adminAttentionService.js';
import './adminInbox.css';

/** Nav bell for admins: badge with the total, dropdown with what's waiting and where to handle it. */
export default function AdminAlertsBell({ attention }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const { counts, total, error } = attention;

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const go = (to) => {
    setOpen(false);
    navigate(to);
  };

  const groups = activeGroups(counts);
  const label = total ? `Admin alerts: ${total} waiting` : 'Admin alerts: all clear';

  return (
    <div className="aib" ref={wrapRef}>
      <button
        type="button"
        className={`aib-btn${total ? ' has-alerts' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label={label}
        aria-expanded={open}
        title={label}
      >
        <span aria-hidden="true">🔔</span>
        {total ? <span className="aib-badge">{total > 99 ? '99+' : total}</span> : null}
      </button>
      {open ? (
        <div className="aib-menu" role="menu">
          <div className="aib-menu-head">Needs your attention</div>
          {error ? <p className="aib-error">{error}</p> : null}
          {!error && !groups.length ? <p className="aib-clear">All clear. Nothing is waiting on you.</p> : null}
          {groups.map((g) => (
            <div key={g.id} className="aib-group">
              <div className="aib-group-title"><span aria-hidden="true">{g.icon}</span> {g.app}</div>
              {g.items.map((it) => (
                <button key={it.key} type="button" role="menuitem" className="aib-item" onClick={() => go(it.to)}>
                  <span>{it.label}</span>
                  <span className="aib-count">{counts[it.key]}</span>
                </button>
              ))}
            </div>
          ))}
          <button type="button" className="aib-all" onClick={() => go(ADMIN_INBOX_PATH)}>Open Admin Inbox</button>
        </div>
      ) : null}
    </div>
  );
}

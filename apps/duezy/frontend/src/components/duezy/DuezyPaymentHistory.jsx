import React, { useEffect, useState } from 'react';
import { listPaymentHistory } from '../../services/duezyService.js';
import { getSession } from '../../services/duezyAuthService.js';
import { byWhom, historyChange, shortStamp } from '../../utils/duezyHistory.js';

/** Collapsible audit trail for one team: every payment created or changed, who did it, and when. */
export default function DuezyPaymentHistory({ teamId, weekLabel, refreshKey }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState(undefined);
  const [me, setMe] = useState('');

  useEffect(() => {
    if (!open) return undefined;
    let alive = true;
    getSession().then((s) => alive && setMe(s?.user?.email || '')).catch(() => {});
    listPaymentHistory(teamId)
      .then((r) => alive && setRows(r))
      .catch(() => alive && setRows([]));
    return () => { alive = false; };
  }, [open, teamId, refreshKey]);

  return (
    <div className="dz-history">
      <button type="button" className="dz-link dz-small" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        {open ? 'Hide payment history' : 'Payment history'}
      </button>
      {open ? (
        rows === undefined ? <p className="dz-small dz-muted">Loading…</p>
          : rows === null ? <p className="dz-small dz-muted">History starts once the payment-history database update is run.</p>
            : !rows.length ? <p className="dz-small dz-muted">No changes recorded yet.</p>
              : (
                <ul className="dz-history-list">
                  {rows.map((r) => (
                    <li key={r.id}>
                      <span>{historyChange(r, weekLabel)}</span>
                      <small className="dz-muted">{[shortStamp(r.changed_at), byWhom(r.changed_by_email, me)].filter(Boolean).join(' · ')}</small>
                    </li>
                  ))}
                </ul>
              )
      ) : null}
    </div>
  );
}

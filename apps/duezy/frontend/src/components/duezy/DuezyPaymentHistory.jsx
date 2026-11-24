import React, { useEffect, useState } from 'react';
import { listPaymentHistory } from '../../services/duezyService.js';
import { getSession } from '../../services/duezyAuthService.js';
import { byWhom, historyChange, shortStamp } from '../../utils/duezyHistory.js';
import { useDuezyDemo } from '../../hooks/useDuezyDemo.js';
import DuezyModal from './DuezyModal.jsx';

/** Opens a modal audit trail for one team: every payment created or changed, who did it, and when. */
export default function DuezyPaymentHistory({ teamId, teamName = '', weekLabel, refreshKey }) {
  const demo = useDuezyDemo();
  const [open, setOpen] = useState(false);
  const [loaded, setRows] = useState(undefined);
  const [myEmail, setMe] = useState('');
  const rows = demo ? demo.history.filter((h) => h.team_id === teamId) : loaded;
  const me = demo ? demo.me : myEmail;
  const title = teamName ? `Payment history · ${teamName}` : 'Payment history';

  useEffect(() => {
    if (!open || demo) return undefined;
    let alive = true;
    getSession().then((s) => alive && setMe(s?.user?.email || '')).catch(() => {});
    listPaymentHistory(teamId)
      .then((r) => alive && setRows(r))
      .catch(() => alive && setRows([]));
    return () => { alive = false; };
  }, [open, teamId, refreshKey, demo]);

  return (
    <div className="dz-history">
      <button type="button" className="dz-btn dz-btn--ghost dz-btn--sm" onClick={() => setOpen(true)}>
        Payment history
      </button>
      {open ? (
        <DuezyModal title={title} onClose={() => setOpen(false)} className="dz-history-modal">
          {rows === undefined ? <p className="dz-small dz-muted">Loading…</p>
            : rows === null ? <p className="dz-small dz-muted">History starts once the payment-history database update is run.</p>
              : !rows.length ? <p className="dz-small dz-muted">No changes recorded yet.</p>
                : (
                  <ul className="dz-history-list dz-history-list--modal">
                    {rows.map((r) => (
                      <li key={r.id}>
                        <span>{historyChange(r, weekLabel)}</span>
                        <small className="dz-muted">{[shortStamp(r.changed_at), byWhom(r.changed_by_email, me)].filter(Boolean).join(' · ')}</small>
                      </li>
                    ))}
                  </ul>
                )}
        </DuezyModal>
      ) : null}
    </div>
  );
}

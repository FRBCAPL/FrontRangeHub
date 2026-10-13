import React, { useEffect, useState } from 'react';
import { listLeagueHistory } from '../../services/duezyService.js';
import { getSession } from '../../services/duezyAuthService.js';
import { byWhom, changeKind, historyChange, shortStamp } from '../../utils/duezyHistory.js';
import { historyCsv, historyFileName } from '../../utils/duezyHistoryExport.js';
import { downloadCsv } from '../../utils/duezyExport.js';
import { todayISO } from '../../utils/duezySchedule.js';

const SHOWN = 30;
const EXPORT_LIMIT = 5000;

/** League-wide audit trail: every payment recorded or changed, newest first, corrections flagged. */
export default function DuezyActivityPanel({ league, units, refreshKey }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState(undefined);
  const [me, setMe] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const several = units.length > 1;
  const unitName = (divisionId) => (several ? units.find((u) => u.id === divisionId)?.name : '') || '';

  useEffect(() => {
    if (!open) return undefined;
    let alive = true;
    getSession().then((s) => alive && setMe(s?.user?.email || '')).catch(() => {});
    listLeagueHistory(league.id, SHOWN)
      .then((r) => alive && setRows(r))
      .catch((e) => { if (alive) { setRows([]); setError(e.message); } });
    return () => { alive = false; };
  }, [open, league.id, refreshKey]);

  const download = async () => {
    setBusy(true);
    setError('');
    try {
      const all = await listLeagueHistory(league.id, EXPORT_LIMIT);
      const today = todayISO(league.timezone);
      downloadCsv(historyCsv({ rows: all || [], units }), historyFileName(league.name, today));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="dz-panel dz-activity">
      <div className="dz-row dz-panel-head">
        <button type="button" className="dz-activity-toggle dz-h3" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          <span aria-hidden="true">{open ? '▾' : '▸'}</span> Recent changes
        </button>
        <button type="button" className="dz-btn dz-btn--ghost dz-btn--sm" onClick={download} disabled={busy}
          title="Every payment recorded or changed, who did it and when — opens in Excel or Google Sheets">
          {busy ? 'Preparing…' : 'Download change history (CSV)'}
        </button>
      </div>
      <p className="dz-muted dz-small dz-panel-hint">
        Every payment entry and correction across the league, with who made it. Entries can be changed but never erased.
      </p>
      {error ? <p className="dz-error">{error}</p> : null}
      {open ? (
        rows === undefined ? <p className="dz-small dz-muted">Loading…</p>
          : rows === null ? <p className="dz-small dz-muted">History starts once the payment-history database update is run.</p>
            : !rows.length ? <p className="dz-small dz-muted">Nothing recorded yet.</p>
              : (
                <ul className="dz-history-list dz-activity-list">
                  {rows.map((r) => {
                    const kind = changeKind(r);
                    return (
                      <li key={r.id}>
                        <span>
                          {kind === 'Correction' ? <em className="dz-activity-tag">Correction</em> : null}
                          <strong>{r.team?.name || 'Removed team'}</strong>
                          {unitName(r.team?.division_id) ? <span className="dz-muted"> · {unitName(r.team?.division_id)}</span> : null}
                          {' — '}{historyChange(r)}
                        </span>
                        <small className="dz-muted">{[shortStamp(r.changed_at), byWhom(r.changed_by_email, me)].filter(Boolean).join(' · ')}</small>
                      </li>
                    );
                  })}
                </ul>
              )
      ) : null}
    </section>
  );
}

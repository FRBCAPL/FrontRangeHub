import React, { useEffect, useMemo, useState } from 'react';
import { usaplVisitPageLabel } from '../../data/usaplVisitPages.js';
import { summarizeUsaplVisits, usaplVisitsSinceIso } from '../../data/usaplVisitStats.js';
import { useUsaplDivisions } from '../../hooks/useUsaplDivisions.js';
import { getUsaplVisitorId, listUsaplPageVisits } from '../../services/usaplPageVisits.js';
import UsaplAdminSubnav from './UsaplAdminSubnav.jsx';
import UsaplAdminVisitSummary from './UsaplAdminVisitSummary.jsx';
import UsaplAdminVisitTables from './UsaplAdminVisitTables.jsx';

const RANGES = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
];

function hubEmail() {
  try {
    return String(localStorage.getItem('userEmail') || '').trim();
  } catch {
    return '';
  }
}

export default function UsaplAdminVisits() {
  const { divisions } = useUsaplDivisions();
  const [days, setDays] = useState(30);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async (rangeDays) => {
    setLoading(true);
    setError('');
    try {
      const data = await listUsaplPageVisits({ sinceIso: usaplVisitsSinceIso(rangeDays) });
      setRows(data);
    } catch (err) {
      setError(err?.message || 'Could not load visits. Run the USAPL page-visits SQL in Supabase, then refresh.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(days);
  }, [days]);

  const labelFor = (row) => usaplVisitPageLabel(row.path, divisions) || row.page_label || row.path;
  const mineId = getUsaplVisitorId();
  const mineEmail = hubEmail();
  const stats = useMemo(
    () => summarizeUsaplVisits(rows, divisions, (row) => (
      usaplVisitPageLabel(row.path, divisions) || row.page_label || row.path
    ), mineId, mineEmail),
    [rows, divisions, mineId, mineEmail]
  );

  return (
    <div className="usapl-page">
      <UsaplAdminSubnav />
      <h1>Visitor stats</h1>
      <p className="usapl-lede">
        Unique visitors: signed-in Google / Hub accounts show as their email. Guests
        stay anonymous. Your own views are this Google account (any browser) plus
        this browser when you were not signed in. Older visits from before email
        tracking still look like guests. Admin pages are never counted. After you
        add the visitor-email SQL in Supabase, new signed-in visits will show emails.
      </p>
      <div className="usapl-choice-row" style={{ margin: '16px 0' }}>
        {RANGES.map((range) => (
          <button
            key={range.days}
            type="button"
            className={`usapl-choice ${days === range.days ? 'selected' : ''}`}
            onClick={() => setDays(range.days)}
          >
            {range.label}
          </button>
        ))}
      </div>
      {loading ? <p>Loading…</p> : null}
      {error ? <div className="usapl-error">{error}</div> : null}
      {!loading && !error ? (
        <>
          <UsaplAdminVisitSummary stats={stats} />
          <UsaplAdminVisitTables stats={stats} pageLabel={labelFor} />
        </>
      ) : null}
    </div>
  );
}

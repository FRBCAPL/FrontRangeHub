import React, { useEffect, useMemo, useState } from 'react';
import { usaplVisitPageLabel } from '../../data/usaplVisitPages.js';
import { summarizeUsaplVisits, usaplVisitsSinceIso } from '../../data/usaplVisitStats.js';
import { useUsaplDivisions } from '../../hooks/useUsaplDivisions.js';
import { listUsaplPageVisits } from '../../services/usaplPageVisits.js';
import UsaplAdminSubnav from './UsaplAdminSubnav.jsx';
import UsaplAdminVisitSummary from './UsaplAdminVisitSummary.jsx';
import UsaplAdminVisitTables from './UsaplAdminVisitTables.jsx';

const RANGES = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
];

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
      setError(err?.message || 'Could not load visits. Run usapl-page-visits-2026-09.sql in Supabase, then refresh.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(days);
  }, [days]);

  const labelFor = (row) => usaplVisitPageLabel(row.path, divisions) || row.page_label || row.path;
  const stats = useMemo(
    () => summarizeUsaplVisits(rows, divisions, (row) => (
      usaplVisitPageLabel(row.path, divisions) || row.page_label || row.path
    )),
    [rows, divisions]
  );

  return (
    <div className="usapl-page">
      <UsaplAdminSubnav />
      <h1>Visitor stats</h1>
      <p className="usapl-lede">
        Anonymous counts for the FRUSAPL site. Visitors are remembered in the browser, not by name or email.
        Admin pages are not counted.
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

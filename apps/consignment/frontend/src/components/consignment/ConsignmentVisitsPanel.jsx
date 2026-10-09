import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@shared/config/supabase.js';
import { getConsignmentVisitorId, listConsignmentPageVisits } from '../../services/consignmentPageVisits.js';
import { consignmentVisitPageLabel } from '../../utils/consignmentVisitPages.js';
import { summarizeVisits, visitsSinceIso } from '../../utils/consignmentVisitStats.js';
import ConsignmentVisitTables from './ConsignmentVisitTables.jsx';
import './consignment-visits.css';

const RANGES = [7, 30, 90];

const labelFor = (row) => consignmentVisitPageLabel(row.path) || row.page_label || row.path;

/** Admin Visitors tab: who looked at the shop, which pages, and where they came from. */
export default function ConsignmentVisitsPanel() {
  const [days, setDays] = useState(30);
  const [rows, setRows] = useState([]);
  const [mineEmail, setMineEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data }) => setMineEmail(String(data?.session?.user?.email || '')))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    listConsignmentPageVisits({ sinceIso: visitsSinceIso(days) })
      .then((data) => { if (alive) setRows(data); })
      .catch((err) => { if (alive) { setRows([]); setError(err?.message || 'Could not load visits.'); } })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [days]);

  const mineId = getConsignmentVisitorId();
  const stats = useMemo(() => summarizeVisits(rows, labelFor, mineId, mineEmail), [rows, mineId, mineEmail]);

  return (
    <section className="cs-visits">
      <p className="cs-meta">
        Signed-in visitors show their email; guests stay anonymous. Your own views (your sign-in on any
        device, plus this browser) are counted separately. Admin pages and print tags are never counted.
      </p>
      <div className="cs-visits-ranges" role="group" aria-label="Date range">
        {RANGES.map((n) => (
          <button key={n} type="button" className={days === n ? 'active' : ''} onClick={() => setDays(n)}>
            {n} days
          </button>
        ))}
      </div>
      {loading ? <p className="cs-meta">Loading…</p> : null}
      {error ? <p className="cs-error">{error}</p> : null}
      {!loading && !error ? <ConsignmentVisitTables stats={stats} pageLabel={labelFor} /> : null}
    </section>
  );
}

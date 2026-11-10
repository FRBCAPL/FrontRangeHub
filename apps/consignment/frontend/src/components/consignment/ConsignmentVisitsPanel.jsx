import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@shared/config/supabase.js';
import { getConsignmentVisitorId, listConsignmentPageVisits } from '../../services/consignmentPageVisits.js';
import { consignmentVisitPageLabel } from '../../utils/consignmentVisitPages.js';
import { summarizeVisits, visitIsMine, visitsSinceIso } from '../../utils/consignmentVisitStats.js';
import { visitWhen, visitWhoLabel } from '../../utils/consignmentVisitHistory.js';
import ConsignmentVisitPagesModal from './ConsignmentVisitPagesModal.jsx';
import ConsignmentVisitorsModal from './ConsignmentVisitorsModal.jsx';
import './consignment-visits.css';

const RANGES = [
  { id: 7, label: '7 days' },
  { id: 30, label: '30 days' },
  { id: 90, label: '90 days' },
  { id: 365, label: '1 year' },
  { id: 'all', label: 'All time' },
];

const labelFor = (row) => consignmentVisitPageLabel(row.path) || row.page_label || row.path;

function Stat({ label, value, note }) {
  return (
    <div className="cs-visit-stat">
      <span className="cs-meta">{label}</span>
      <strong>{value}</strong>
      {note ? <span className="cs-meta">{note}</span> : null}
    </div>
  );
}

/** Admin Visitors tab: totals for the range, with Page views and Visitors each opening their own window. */
export default function ConsignmentVisitsPanel() {
  const [range, setRange] = useState(30);
  const [rows, setRows] = useState([]);
  const [mineEmail, setMineEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(null);

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data }) => setMineEmail(String(data?.session?.user?.email || '')))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    listConsignmentPageVisits({ sinceIso: range === 'all' ? null : visitsSinceIso(range) })
      .then((data) => { if (alive) setRows(data); })
      .catch((err) => { if (alive) { setRows([]); setError(err?.message || 'Could not load visits.'); } })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [range]);

  const mineId = getConsignmentVisitorId();
  const stats = useMemo(() => summarizeVisits(rows, labelFor, mineId, mineEmail), [rows, mineId, mineEmail]);
  const otherRows = useMemo(() => rows.filter((row) => !visitIsMine(row, mineId, mineEmail)), [rows, mineId, mineEmail]);
  const rangeLabel = range === 'all' ? 'all time' : `last ${RANGES.find((r) => r.id === range)?.label}`;
  const latest = otherRows[0];
  const topPage = stats.pages[0];

  return (
    <section className="cs-visits">
      <p className="cs-meta">
        Your own views (your sign-in on any device, plus this browser) are counted separately. Admin pages and print
        tags are never counted.
      </p>
      <div className="cs-visits-ranges" role="group" aria-label="Date range">
        {RANGES.map((r) => (
          <button key={r.id} type="button" className={range === r.id ? 'active' : ''} onClick={() => setRange(r.id)}>
            {r.label}
          </button>
        ))}
      </div>
      {loading ? <p className="cs-meta">Loading…</p> : null}
      {error ? <p className="cs-error">{error}</p> : null}
      {!loading && !error ? (
        <>
          <div className="cs-visit-summary">
            <Stat label="Other visitors" value={stats.visitors} note="Not you" />
            <Stat label="Their page views" value={stats.views} />
            <Stat label="Your views" value={stats.mineViews} />
            <Stat label="Today · others" value={stats.todayVisitors} note={`${stats.todayViews} views`} />
          </div>
          <div className="cs-visit-launchers">
            <button type="button" className="cs-visit-launch" onClick={() => setOpen('pages')}>
              <span className="cs-visit-launch-title">📄 Page views</span>
              <span className="cs-meta">
                {stats.views} views on {stats.pages.length} pages
                {topPage ? ` · most viewed: ${topPage.label} (${topPage.views})` : ''}
              </span>
              <span className="cs-visit-launch-cta">Open pages & sources →</span>
            </button>
            <button type="button" className="cs-visit-launch" onClick={() => setOpen('visitors')}>
              <span className="cs-visit-launch-title">👥 Visitors</span>
              <span className="cs-meta">
                {stats.visitors} {stats.visitors === 1 ? 'person' : 'people'}
                {latest ? ` · latest: ${visitWhoLabel(latest, false)}, ${visitWhen(latest.created_at)}` : ''}
              </span>
              <span className="cs-visit-launch-cta">Open full visitor history →</span>
            </button>
          </div>
        </>
      ) : null}
      {open === 'pages' ? (
        <ConsignmentVisitPagesModal pages={stats.pages} otherRows={otherRows} rangeLabel={rangeLabel} onClose={() => setOpen(null)} />
      ) : null}
      {open === 'visitors' ? (
        <ConsignmentVisitorsModal
          rows={rows}
          mineId={mineId}
          mineEmail={mineEmail}
          pageLabel={labelFor}
          rangeLabel={rangeLabel}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </section>
  );
}

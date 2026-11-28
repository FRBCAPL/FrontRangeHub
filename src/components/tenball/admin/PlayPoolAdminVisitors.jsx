import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@shared/config/supabase.js';
import { getPlayPoolVisitorId, listPlayPoolPageVisits } from '../visits/playPoolPageVisits';
import { playPoolVisitPageLabel } from '../visits/playPoolVisitPages';
import {
  summarizeVisits,
  visitIsMine,
  visitorHistory,
  visitsSinceIso,
  visitWhen,
  visitWhoLabel
} from '../visits/playPoolVisitStats';
import styles from './PlayPoolAdmin.module.css';

const RANGES = [
  { id: 7, label: '7 days' },
  { id: 30, label: '30 days' },
  { id: 90, label: '90 days' },
  { id: 365, label: '1 year' },
  { id: 'all', label: 'All time' }
];

const labelFor = (row) => playPoolVisitPageLabel(row.path) || row.page_label || row.path;

function Stat({ label, value, note }) {
  return (
    <div className={styles.statCard}>
      <strong>{value}</strong>
      <span>{label}</span>
      {note ? <span>{note}</span> : null}
    </div>
  );
}

export default function PlayPoolAdminVisitors() {
  const [range, setRange] = useState(30);
  const [rows, setRows] = useState([]);
  const [mineEmail, setMineEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [includeMine, setIncludeMine] = useState(false);

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data }) => setMineEmail(String(data?.session?.user?.email || '')))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    listPlayPoolPageVisits({ sinceIso: range === 'all' ? null : visitsSinceIso(range) })
      .then((data) => { if (alive) setRows(data); })
      .catch((err) => {
        if (alive) {
          setRows([]);
          setError(err?.message || 'Could not load visits.');
        }
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [range]);

  const mineId = getPlayPoolVisitorId();
  const stats = useMemo(
    () => summarizeVisits(rows, labelFor, mineId, mineEmail),
    [rows, mineId, mineEmail]
  );
  const people = useMemo(() => {
    const list = visitorHistory(rows, mineId, mineEmail);
    return includeMine ? list : list.filter((p) => !p.isMine);
  }, [rows, mineId, mineEmail, includeMine]);

  return (
    <div className={styles.panel}>
      <h2>Visitors</h2>
      <p className={styles.hint}>
        Page views for Play Pool. Your own views (this browser + your sign-in email) are counted separately.
        Admin is never recorded. Guests stay anonymous; signed-in players show email from auth.
      </p>

      <div className={styles.visitRanges} role="group" aria-label="Date range">
        {RANGES.map((r) => (
          <button
            key={r.id}
            type="button"
            className={range === r.id ? styles.visitRangeActive : styles.visitRange}
            onClick={() => setRange(r.id)}
          >
            {r.label}
          </button>
        ))}
      </div>

      {loading ? <p className={styles.hint}>Loading…</p> : null}
      {error ? <p className={styles.visitError}>{error}</p> : null}

      {!loading && !error ? (
        <>
          <div className={styles.statGrid}>
            <Stat label="Other visitors" value={stats.visitors} note="Not you" />
            <Stat label="Their page views" value={stats.views} />
            <Stat label="Your views" value={stats.mineViews} />
            <Stat label="Today · others" value={stats.todayVisitors} note={`${stats.todayViews} views`} />
          </div>

          <h3 className={styles.visitSubhead}>Pages</h3>
          {stats.pages.length === 0 ? (
            <p className={styles.hint}>No other visitors in this range yet.</p>
          ) : (
            <table className={styles.visitTable}>
              <thead>
                <tr>
                  <th>Page</th>
                  <th>Views</th>
                  <th>People</th>
                </tr>
              </thead>
              <tbody>
                {stats.pages.map((page) => (
                  <tr key={page.path}>
                    <td>
                      <strong>{page.label}</strong>
                      <div className={styles.hint}>{page.path}</div>
                    </td>
                    <td>{page.views}</td>
                    <td>{page.visitors}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className={styles.visitPeopleHead}>
            <h3 className={styles.visitSubhead}>People</h3>
            <label className={styles.visitMine}>
              <input
                type="checkbox"
                checked={includeMine}
                onChange={(event) => setIncludeMine(event.target.checked)}
              />
              Include me
            </label>
          </div>
          {people.length === 0 ? (
            <p className={styles.hint}>No visitors to list.</p>
          ) : (
            <table className={styles.visitTable}>
              <thead>
                <tr>
                  <th>Who</th>
                  <th>Views</th>
                  <th>Pages</th>
                  <th>Last seen</th>
                </tr>
              </thead>
              <tbody>
                {people.slice(0, 100).map((person) => (
                  <tr key={person.key} className={person.isMine ? styles.visitYou : undefined}>
                    <td>{person.label}</td>
                    <td>{person.views}</td>
                    <td>{person.pageCount}</td>
                    <td>{visitWhen(person.lastSeen)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <h3 className={styles.visitSubhead}>Recent visits</h3>
          <table className={styles.visitTable}>
            <thead>
              <tr>
                <th>When</th>
                <th>Who</th>
                <th>Page</th>
              </tr>
            </thead>
            <tbody>
              {rows
                .filter((row) => includeMine || !visitIsMine(row, mineId, mineEmail))
                .slice(0, 40)
                .map((row) => {
                  const mine = visitIsMine(row, mineId, mineEmail);
                  return (
                    <tr key={row.id} className={mine ? styles.visitYou : undefined}>
                      <td>{visitWhen(row.created_at)}</td>
                      <td>{visitWhoLabel(row, mine)}</td>
                      <td>{labelFor(row)}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </>
      ) : null}
    </div>
  );
}

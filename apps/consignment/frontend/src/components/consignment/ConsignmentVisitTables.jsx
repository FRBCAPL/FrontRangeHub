import React from 'react';

function when(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch {
    return iso;
  }
}

function Stat({ label, value, note }) {
  return (
    <div className="cs-visit-stat">
      <span className="cs-meta">{label}</span>
      <strong>{value}</strong>
      {note ? <span className="cs-meta">{note}</span> : null}
    </div>
  );
}

export default function ConsignmentVisitTables({ stats, pageLabel }) {
  return (
    <>
      <div className="cs-visit-summary">
        <Stat label="Other visitors" value={stats.visitors} note="Not you" />
        <Stat label="Their page views" value={stats.views} />
        <Stat label="Your views" value={stats.mineViews} />
        <Stat label="Today · others" value={stats.todayVisitors} note={`${stats.todayViews} views`} />
      </div>

      <h3>Pages · everyone except you</h3>
      {stats.pages.length ? (
        <table className="cs-table cs-visit-table">
          <thead>
            <tr>
              <th>Page</th>
              <th className="cs-visit-num">Views</th>
              <th className="cs-visit-num">Visitors</th>
            </tr>
          </thead>
          <tbody>
            {stats.pages.map((row) => (
              <tr key={row.path}>
                <td>
                  <strong>{row.label}</strong>
                  <div className="cs-meta">{row.path}</div>
                </td>
                <td className="cs-visit-num">{row.views}</td>
                <td className="cs-visit-num">{row.visitors}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="cs-meta">No page views in this range yet.</p>
      )}

      <h3>Recent visits</h3>
      {stats.recent.length ? (
        <table className="cs-table cs-visit-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Who</th>
              <th>Page</th>
              <th>From</th>
            </tr>
          </thead>
          <tbody>
            {stats.recent.map((row) => (
              <tr key={row.id} className={row.isMine ? 'is-you' : ''}>
                <td>{when(row.created_at)}</td>
                <td className="cs-visit-who">{row.whoLabel}</td>
                <td>{pageLabel(row)}</td>
                <td className="cs-meta">{row.referrer || 'direct / in-site'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="cs-meta">Nothing recorded yet.</p>
      )}
    </>
  );
}

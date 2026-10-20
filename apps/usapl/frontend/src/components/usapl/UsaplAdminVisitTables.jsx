import React from 'react';

function when(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function UsaplAdminVisitTables({ stats, pageLabel }) {
  return (
    <>
      <section className="usapl-card">
        <h2>Pages</h2>
        {stats.pages.length ? (
          <table className="usapl-visit-table">
            <thead>
              <tr>
                <th>Page</th>
                <th className="usapl-visit-num">Views</th>
                <th className="usapl-visit-num">Visitors</th>
              </tr>
            </thead>
            <tbody>
              {stats.pages.map((row) => (
                <tr key={row.path}>
                  <td>
                    <strong>{row.label}</strong>
                    <p className="usapl-meta">{row.path}</p>
                  </td>
                  <td className="usapl-visit-num">{row.views}</td>
                  <td className="usapl-visit-num">{row.visitors}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="usapl-lede">No page views in this range yet.</p>
        )}
      </section>
      <section className="usapl-card">
        <h2>Recent visits</h2>
        {stats.recent.length ? (
          <table className="usapl-visit-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Page</th>
                <th>From</th>
              </tr>
            </thead>
            <tbody>
              {stats.recent.map((row) => (
                <tr key={row.id}>
                  <td>{when(row.created_at)}</td>
                  <td>{pageLabel(row)}</td>
                  <td className="usapl-meta">{row.referrer || 'direct / in-site'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="usapl-lede">Nothing recorded yet.</p>
        )}
      </section>
    </>
  );
}

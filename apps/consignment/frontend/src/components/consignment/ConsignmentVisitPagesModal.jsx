import React, { useMemo, useState } from 'react';
import { topReferrers } from '../../utils/consignmentVisitHistory.js';
import ConsignmentModal from './ConsignmentModal.jsx';

/** Admin → Visitors → Page views: every page, how often it was seen, and where visitors came from. */
export default function ConsignmentVisitPagesModal({ pages, otherRows, rangeLabel, onClose }) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const shown = q ? pages.filter((p) => `${p.label} ${p.path}`.toLowerCase().includes(q)) : pages;
  const sources = useMemo(() => topReferrers(otherRows), [otherRows]);
  const totalViews = pages.reduce((sum, p) => sum + p.views, 0);

  return (
    <ConsignmentModal titleId="cs-visit-pages-title" onClose={onClose}>
      <div className="cs-modal-card cs-visit-modal">
        <div className="cs-visit-modal-head">
          <h2 id="cs-visit-pages-title">📄 Page views · {rangeLabel}</h2>
          <button type="button" className="cs-btn-secondary" onClick={onClose}>Close</button>
        </div>
        <p className="cs-meta">
          {totalViews} view{totalViews === 1 ? '' : 's'} on {pages.length} page{pages.length === 1 ? '' : 's'}, not counting yours.
        </p>
        <input
          type="search"
          className="cs-visit-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find a page or item number"
          aria-label="Find a page"
        />
        {shown.length ? (
          <table className="cs-table cs-visit-table">
            <thead>
              <tr>
                <th>Page</th>
                <th className="cs-visit-num">Views</th>
                <th className="cs-visit-num">Visitors</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((row) => (
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
        ) : <p className="cs-meta">{q ? 'No pages match.' : 'No page views in this range yet.'}</p>}

        <h3>Where they came from</h3>
        {sources.length ? (
          <table className="cs-table cs-visit-table">
            <thead>
              <tr>
                <th>Source</th>
                <th className="cs-visit-num">Views</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((row) => (
                <tr key={row.source}>
                  <td>{row.source}</td>
                  <td className="cs-visit-num">{row.views}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="cs-meta">Nothing yet.</p>}
      </div>
    </ConsignmentModal>
  );
}

import React, { useEffect, useMemo, useState } from 'react';
import { visitIsMine } from '../../utils/consignmentVisitStats.js';
import { VISIT_PAGE_SIZE, visitMatches, visitorHistory, visitWhen, visitWhoLabel } from '../../utils/consignmentVisitHistory.js';
import ConsignmentModal from './ConsignmentModal.jsx';
import ConsignmentVisitorRow from './ConsignmentVisitorRow.jsx';

const VIEWS = [
  { id: 'people', label: 'By person' },
  { id: 'visits', label: 'Every visit' },
];

/** Admin → Visitors → Visitors: everyone who looked at the shop in the range, with their full history. */
export default function ConsignmentVisitorsModal({ rows, mineId, mineEmail, pageLabel, rangeLabel, onClose }) {
  const [view, setView] = useState('people');
  const [query, setQuery] = useState('');
  const [includeMine, setIncludeMine] = useState(false);
  const [shown, setShown] = useState(VISIT_PAGE_SIZE);

  useEffect(() => { setShown(VISIT_PAGE_SIZE); }, [view, query, includeMine]);

  const filtered = useMemo(() => rows.filter((row) => (includeMine || !visitIsMine(row, mineId, mineEmail))
    && visitMatches(row, query, pageLabel)), [rows, includeMine, query, mineId, mineEmail, pageLabel]);
  const people = useMemo(() => visitorHistory(filtered, mineId, mineEmail), [filtered, mineId, mineEmail]);
  const list = view === 'people' ? people : filtered;
  const more = list.length - shown;

  return (
    <ConsignmentModal titleId="cs-visitors-title" onClose={onClose}>
      <div className="cs-modal-card cs-visit-modal">
        <div className="cs-visit-modal-head">
          <h2 id="cs-visitors-title">👥 Visitors · {rangeLabel}</h2>
          <button type="button" className="cs-btn-secondary" onClick={onClose}>Close</button>
        </div>
        <p className="cs-meta">
          {people.length} {people.length === 1 ? 'person' : 'people'}, {filtered.length} visit{filtered.length === 1 ? '' : 's'}.
          Signed-in visitors show their email; each guest has a short code so you can tell them apart.
        </p>
        <div className="cs-visits-ranges" role="tablist" aria-label="Visitor view">
          {VIEWS.map((v) => (
            <button key={v.id} type="button" role="tab" aria-selected={view === v.id} className={view === v.id ? 'active' : ''} onClick={() => setView(v.id)}>
              {v.label}
            </button>
          ))}
        </div>
        <div className="cs-visit-filters">
          <input
            type="search"
            className="cs-visit-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find an email, page, item number or source"
            aria-label="Find visits"
          />
          <label className="cs-visit-mine">
            <input type="checkbox" checked={includeMine} onChange={(e) => setIncludeMine(e.target.checked)} /> Show my visits
          </label>
        </div>

        {!list.length ? <p className="cs-meta">{query ? 'Nothing matches.' : 'No visits in this range yet.'}</p> : null}
        {view === 'people' && list.length ? (
          <ul className="cs-visitor-list">
            {people.slice(0, shown).map((p) => <ConsignmentVisitorRow key={p.key} person={p} pageLabel={pageLabel} />)}
          </ul>
        ) : null}
        {view === 'visits' && list.length ? (
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
              {filtered.slice(0, shown).map((row) => {
                const mine = visitIsMine(row, mineId, mineEmail);
                return (
                  <tr key={row.id} className={mine ? 'is-you' : ''}>
                    <td className="cs-visit-when">{visitWhen(row.created_at)}</td>
                    <td className="cs-visit-who">{visitWhoLabel(row, mine)}</td>
                    <td>{pageLabel(row)}</td>
                    <td className="cs-meta">{row.referrer || 'direct / in-site'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : null}
        {more > 0 ? (
          <button type="button" className="cs-btn-secondary cs-visit-more" onClick={() => setShown((n) => n + VISIT_PAGE_SIZE)}>
            Show {Math.min(more, VISIT_PAGE_SIZE)} more ({more} left)
          </button>
        ) : null}
      </div>
    </ConsignmentModal>
  );
}

import React, { useState } from 'react';
import { VISIT_PAGE_SIZE, visitWhen } from '../../utils/consignmentVisitHistory.js';

function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/** One person in the Visitors modal; opens to show each of their visits. */
export default function ConsignmentVisitorRow({ person, pageLabel }) {
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(VISIT_PAGE_SIZE);
  const sameDay = visitWhen(person.firstSeen) === visitWhen(person.lastSeen);
  return (
    <li className={`cs-visitor${person.isMine ? ' is-you' : ''}`}>
      <button type="button" className="cs-visitor-head" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="cs-visitor-who">
          <strong>{person.label}</strong>
          {person.signedIn && !person.isMine ? <span className="cs-visitor-tag">signed in</span> : null}
        </span>
        <span className="cs-meta">
          {plural(person.views, 'view')} · {plural(person.pageCount, 'page')} · last {visitWhen(person.lastSeen)}
          {sameDay ? '' : ` · first ${visitWhen(person.firstSeen)}`}
        </span>
        <span className="cs-visitor-caret" aria-hidden="true">{open ? '▾' : '▸'}</span>
      </button>
      {open ? (
        <div className="cs-visitor-visits">
          <table className="cs-table cs-visit-table">
            <tbody>
              {person.visits.slice(0, shown).map((row) => (
                <tr key={row.id}>
                  <td className="cs-visit-when">{visitWhen(row.created_at)}</td>
                  <td>{pageLabel(row)}</td>
                  <td className="cs-meta">{row.referrer || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {person.visits.length > shown ? (
            <button type="button" className="cs-btn-secondary" onClick={() => setShown((n) => n + VISIT_PAGE_SIZE)}>
              Show more ({person.visits.length - shown} left)
            </button>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

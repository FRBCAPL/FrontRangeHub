import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CONSIGNMENT_PATH, itemLabel } from '../../data/consignmentConstants.js';
import { loadAdminItems } from '../../services/consignmentService.js';
import useTaxRate from '../../hooks/useTaxRate.js';
import useTagShape from '../../hooks/useTagShape.js';
import { recentlyAdded, sheetPages, TAGS_PER_SHEET } from '../../utils/consignmentTagText.js';
import ConsignmentTag from './ConsignmentTag.jsx';
import ConsignmentTagShapeToggle from './ConsignmentTagShapeToggle.jsx';

const byNumber = (a, b) => String(a.item_number).localeCompare(String(b.item_number), undefined, { numeric: true });

/** Admin: print tags for several listed items on letter paper (10 cards or 12 hang tags per page). */
export default function ConsignmentTagSheet({ canAdmin }) {
  const navigate = useNavigate();
  const [items, setItems] = useState(null);
  const [picked, setPicked] = useState(() => new Set());
  const [error, setError] = useState('');
  const [shape, setShape] = useTagShape();
  const rate = useTaxRate();

  useEffect(() => {
    if (!canAdmin) return undefined;
    let alive = true;
    loadAdminItems('available')
      .then((rows) => {
        if (!alive) return;
        const listed = rows.filter((row) => !row.is_example).sort(byNumber);
        setItems(listed);
        setPicked(new Set(listed.filter((row) => recentlyAdded(row)).map((row) => row.id)));
      })
      .catch((err) => { if (alive) setError(err.message); });
    return () => { alive = false; };
  }, [canAdmin]);

  if (!canAdmin) return <div className="cs-print"><p>Log in as an admin to print tags.</p></div>;
  if (error) return <div className="cs-print"><p>{error}</p></div>;
  if (!items) return <div className="cs-print"><p>Loading items…</p></div>;

  const toggle = (id) => setPicked((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const chosen = items.filter((row) => picked.has(row.id));
  const pages = sheetPages(chosen, shape);

  return (
    <div className="cs-print">
      <div className="cs-print-bar">
        <button type="button" onClick={() => window.print()} disabled={!chosen.length}>
          Print {chosen.length} tag{chosen.length === 1 ? '' : 's'}
        </button>
        <button type="button" onClick={() => navigate(`${CONSIGNMENT_PATH}/admin`)}>Back to admin</button>
        <ConsignmentTagShapeToggle value={shape} onChange={setShape} />
      </div>
      <section className="cs-sheet-picker">
        <p className="cs-print-help">
          {TAGS_PER_SHEET[shape]} tags per letter page ({pages.length} page{pages.length === 1 ? '' : 's'}). Items added in
          the last 7 days start checked. Print at 100% scale with default margins; cards line up with business-card sheets
          like Avery 8371.
        </p>
        <div className="cs-print-bar">
          <button type="button" onClick={() => setPicked(new Set(items.map((row) => row.id)))}>Select all</button>
          <button type="button" onClick={() => setPicked(new Set())}>Select none</button>
        </div>
        {items.length ? (
          <ul>
            {items.map((row) => (
              <li key={row.id}>
                <label>
                  <input type="checkbox" checked={picked.has(row.id)} onChange={() => toggle(row.id)} />
                  <strong>{itemLabel(row)}</strong> {row.name}
                  {row.sale_method === 'auction' ? <span className="cs-sheet-muted"> · auction</span> : null}
                </label>
              </li>
            ))}
          </ul>
        ) : <p>No items are listed right now.</p>}
      </section>
      {pages.map((page, i) => (
        <div key={i} className={`cs-sheet-page cs-sheet-${shape}`}>
          {page.map((row) => <ConsignmentTag key={row.id} item={row} rate={rate} shape={shape} />)}
        </div>
      ))}
    </div>
  );
}

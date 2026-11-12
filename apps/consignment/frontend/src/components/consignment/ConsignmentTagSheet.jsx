import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CONSIGNMENT_PATH, itemLabel } from '../../data/consignmentConstants.js';
import { loadAdminItems } from '../../services/consignmentService.js';
import useTaxRate from '../../hooks/useTaxRate.js';
import useTagShape from '../../hooks/useTagShape.js';
import { formatShortDate } from '../../utils/consignmentDates.js';
import {
  blanksToFillPage, clampBlankCount, MAX_BLANK_TAGS, normalizeTagKind, recentlyAdded, recentlySold, sheetPages,
  TAGS_PER_SHEET,
} from '../../utils/consignmentTagText.js';
import ConsignmentSoldTag from './ConsignmentSoldTag.jsx';
import ConsignmentTag from './ConsignmentTag.jsx';
import ConsignmentTagKindToggle from './ConsignmentTagKindToggle.jsx';
import ConsignmentTagShapeToggle from './ConsignmentTagShapeToggle.jsx';

const byNumber = (a, b) => String(a.item_number).localeCompare(String(b.item_number), undefined, { numeric: true });
const bySoldNewest = (a, b) => String(b.sold_at || '').localeCompare(String(a.sold_at || ''));

/**
 * Admin: print tags for several items on letter paper (10 cards or 12 hang tags per page).
 * ?kind=sold prints SOLD tags for sold items instead of shop tags for listed ones.
 */
export default function ConsignmentTagSheet({ canAdmin }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const kind = normalizeTagKind(searchParams.get('kind'));
  const sold = kind === 'sold';
  const [items, setItems] = useState(null);
  const [picked, setPicked] = useState(() => new Set());
  const [blankCount, setBlankCount] = useState(0);
  const [error, setError] = useState('');
  const [shape, setShape] = useTagShape();
  const rate = useTaxRate();

  useEffect(() => {
    if (!canAdmin) return undefined;
    let alive = true;
    setItems(null);
    setError('');
    loadAdminItems(sold ? 'sold' : 'available')
      .then((rows) => {
        if (!alive) return;
        const list = rows.filter((row) => !row.is_example).sort(sold ? bySoldNewest : byNumber);
        const fresh = sold ? recentlySold : recentlyAdded;
        setItems(list);
        setPicked(new Set(list.filter((row) => fresh(row)).map((row) => row.id)));
      })
      .catch((err) => { if (alive) setError(err.message); });
    return () => { alive = false; };
  }, [canAdmin, sold]);

  if (!canAdmin) return <div className="cs-print"><p>Log in as an admin to print tags.</p></div>;
  if (error) return <div className="cs-print"><p>{error}</p></div>;

  const setKind = (next) => setSearchParams(next === 'sold' ? { kind: 'sold' } : {}, { replace: true });
  const toggle = (id) => setPicked((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const chosen = (items || []).filter((row) => picked.has(row.id));
  const blanks = sold ? Array.from({ length: blankCount }, (_, i) => ({ id: `blank-${i}`, blank: true })) : [];
  const tags = [...chosen, ...blanks];
  const pages = sheetPages(tags, shape);

  return (
    <div className="cs-print">
      <div className="cs-print-bar">
        <button type="button" onClick={() => window.print()} disabled={!tags.length}>
          Print {tags.length} tag{tags.length === 1 ? '' : 's'}
        </button>
        <button type="button" onClick={() => navigate(`${CONSIGNMENT_PATH}/admin`)}>Back to admin</button>
        <ConsignmentTagKindToggle value={kind} onChange={setKind} plural />
        <ConsignmentTagShapeToggle value={shape} onChange={setShape} />
      </div>
      {!items ? <p>Loading items…</p> : (
        <section className="cs-sheet-picker">
          <p className="cs-print-help">
            {TAGS_PER_SHEET[shape]} tags per letter page ({pages.length} page{pages.length === 1 ? '' : 's'}). Items{' '}
            {sold ? 'sold' : 'added'} in the last 7 days start checked. Print at 100% scale with default margins; cards line up
            with business-card sheets like Avery 8371.
          </p>
          {sold ? (
            <div className="cs-sheet-blank">
              <label htmlFor="cs-blank-count">Blank SOLD tags (write in the item, buyer and date):</label>
              <input
                id="cs-blank-count"
                type="number"
                min="0"
                max={MAX_BLANK_TAGS}
                value={blankCount}
                onChange={(e) => setBlankCount(clampBlankCount(e.target.value))}
              />
              <div className="cs-print-bar" style={{ margin: 0 }}>
                <button type="button" onClick={() => setBlankCount(clampBlankCount(blankCount + blanksToFillPage(tags.length, shape)))}>
                  {tags.length % TAGS_PER_SHEET[shape] ? 'Fill the page' : 'Add a page'}
                </button>
                {blankCount ? <button type="button" onClick={() => setBlankCount(0)}>No blanks</button> : null}
              </div>
            </div>
          ) : null}
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
                    {sold ? <span className="cs-sheet-muted"> · sold {formatShortDate(row.sold_at)}</span> : null}
                    {!sold && row.sale_method === 'auction' ? <span className="cs-sheet-muted"> · auction</span> : null}
                  </label>
                </li>
              ))}
            </ul>
          ) : <p>{sold ? 'No sold items.' : 'No items are listed right now.'}</p>}
        </section>
      )}
      {pages.map((page, i) => (
        <div key={i} className={`cs-sheet-page cs-sheet-${shape}`}>
          {page.map((row) => (sold
            ? <ConsignmentSoldTag key={row.id} item={row.blank ? null : row} shape={shape} />
            : <ConsignmentTag key={row.id} item={row} rate={rate} shape={shape} />))}
        </div>
      ))}
    </div>
  );
}

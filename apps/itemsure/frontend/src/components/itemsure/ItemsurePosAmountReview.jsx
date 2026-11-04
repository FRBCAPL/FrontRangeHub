import React, { useMemo, useState } from 'react';
import { ErrorNote } from './ItemsureUi.jsx';
import { isGroupUnit } from '../../utils/itemsureCategoryKind.js';

const SHOW_AT_ONCE = 50;
const SHORT_LIST = 5;
const FILTERS = { guessed: 'Guessed', needs: 'Needs you', all: 'All' };
const trim = (n) => (n == null ? '' : String(Math.round(n * 1000) / 1000));

/**
 * "How much does each sale use?" for every matched Clover item without an amount, filled in
 * with guesses. Guessed rows start ticked; typing an amount ticks a row. onSave([{ row, amount, unit }]).
 */
export default function ItemsurePosAmountReview({ rows, piecesReady = false, busy, error = '', onSave, onCancel }) {
  const singles = (r) => piecesReady && isGroupUnit(r.unit);
  const startUnit = (r) => {
    if (r.suggestion?.unit) return r.suggestion.unit === 'base' && singles(r) ? 'piece' : r.suggestion.unit;
    if (singles(r)) return 'piece';
    return r.unit?.code === 'each' ? 'base' : 'fl_oz';
  };
  const [edits, setEdits] = useState(() => Object.fromEntries(rows.map((r) => [r.key, {
    ticked: Boolean(r.suggestion),
    amount: trim(r.suggestion?.amount ?? (singles(r) ? 1 : null)),
    unit: startUnit(r),
  }])));
  const short = rows.length <= SHORT_LIST;
  const [filter, setFilter] = useState(() => (short ? 'all' : rows.some((r) => r.suggestion) ? 'guessed' : 'needs'));
  const [limit, setLimit] = useState(SHOW_AT_ONCE);

  const shown = useMemo(() => rows.filter((r) => filter === 'all' || (filter === 'guessed') === Boolean(r.suggestion)), [rows, filter]);
  const valid = (e) => Number(e.amount) > 0 && Number(e.amount) <= 100000;
  const ticked = rows.filter((r) => edits[r.key].ticked && valid(edits[r.key]));
  const change = (key, patch) => setEdits((all) => {
    const next = { ...all[key], ...patch };
    if ('amount' in patch) next.ticked = valid(next);
    return { ...all, [key]: next };
  });
  const tickShown = (on) => setEdits((all) => {
    const next = { ...all };
    for (const r of shown) next[r.key] = { ...next[r.key], ticked: on && valid(next[r.key]) };
    return next;
  });
  const count = (key) => rows.filter((r) => key === 'all' || (key === 'guessed') === Boolean(r.suggestion)).length;

  return (
    <div className="isu-stack">
      <p className="isu-muted isu-small">Check the amounts, change any that are wrong, and untick ones you&apos;re not sure about. Only ticked rows are saved.</p>
      {short ? null : (
        <>
          <div className="isu-pos-filters" role="group" aria-label="Show">
            {Object.entries(FILTERS).map(([key, label]) => (
              <button key={key} type="button" className={`isu-chip${filter === key ? ' is-active' : ''}`} aria-pressed={filter === key} onClick={() => { setFilter(key); setLimit(SHOW_AT_ONCE); }}>
                {label} ({count(key)})
              </button>
            ))}
          </div>
          <div className="isu-pos-actions">
            <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={() => tickShown(true)}>Tick all shown</button>
            <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={() => tickShown(false)}>Untick all shown</button>
          </div>
        </>
      )}
      <ul className="isu-pos-review isu-pos-amounts">
        {shown.slice(0, limit).map((r) => {
          const e = edits[r.key];
          const unitName = (r.unit?.name || 'unit').toLowerCase();
          return (
            <li key={r.key}>
              <label className="isu-check">
                <input type="checkbox" checked={e.ticked} disabled={!valid(e)} onChange={() => change(r.key, { ticked: !e.ticked })} />
                <span><strong>{r.pos.name}</strong> uses</span>
              </label>
              <span className="isu-pos-amount-line">
                <input type="number" inputMode="decimal" min="0" step="any" value={e.amount} placeholder="?" onChange={(ev) => change(r.key, { amount: ev.target.value })} aria-label={`Amount of ${r.item.name} in ${r.pos.name}`} />
                <select value={e.unit} onChange={(ev) => change(r.key, { unit: ev.target.value })} aria-label="Unit">
                  <option value="fl_oz">oz</option>
                  <option value="ml">ml</option>
                  <option value="base">{unitName}</option>
                  {singles(r) ? <option value="piece">single from the {unitName}</option> : null}
                </select>
                <span>of <strong>{r.item.name}</strong></span>
              </span>
              <span className="isu-muted isu-small">{r.suggestion ? r.suggestion.reason : 'No guess: type how much each one sold uses'}</span>
            </li>
          );
        })}
      </ul>
      {shown.length > limit ? (
        <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={() => setLimit((n) => n + SHOW_AT_ONCE)}>Show more ({shown.length - limit} left)</button>
      ) : null}
      <ErrorNote message={error} />
      <div className="isu-pos-actions">
        <button type="button" className="isu-btn isu-btn--primary" disabled={busy || !ticked.length} onClick={() => onSave(ticked.map((r) => ({ row: r, amount: Number(edits[r.key].amount), unit: edits[r.key].unit })))}>
          {busy ? 'Saving…' : `Save ticked (${ticked.length})`}
        </button>
        <button type="button" className="isu-btn isu-btn--ghost" disabled={busy} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

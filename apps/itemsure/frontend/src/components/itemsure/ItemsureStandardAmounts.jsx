import React, { useState } from 'react';
import { ErrorNote } from './ItemsureUi.jsx';

const UNITS = { fl_oz: 'oz', ml: 'ml', base: 'whole (1 of the item)' };
const cleanWord = (w) => w.trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * House amounts: "shot = 1.5 oz". When a Clover item's name has the word, its amount is
 * suggested. `canSave` is false until the database update is applied. onSave(rows).
 */
export default function ItemsureStandardAmounts({ standards, canSave, busy, error = '', onSave, onCancel }) {
  const [rows, setRows] = useState(() => standards.map((s) => ({ keyword: s.keyword, amount: String(s.amount), unit: s.unit })));
  const set = (i, patch) => setRows((all) => all.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const words = rows.map((r) => cleanWord(r.keyword));
  const problem = rows.some((r, i) => !words[i] || words[i].length > 40 || !(Number(r.amount) > 0) || Number(r.amount) > 100000)
    ? 'Every row needs a word and an amount above 0.'
    : new Set(words).size !== words.length ? 'Each word can only be listed once.' : '';

  return (
    <div className="isu-stack">
      <p className="isu-muted isu-small">When a Clover item&apos;s name has one of these words, ItemSure suggests that amount. You still confirm every suggestion.</p>
      <ul className="isu-pos-review isu-standard-amounts">
        {rows.map((r, i) => (
          <li key={i} className="isu-pos-amount-line">
            <input value={r.keyword} onChange={(e) => set(i, { keyword: e.target.value })} maxLength={40} placeholder="Word, like shot" aria-label="Word" />
            <span>=</span>
            <input type="number" inputMode="decimal" min="0" step="any" value={r.amount} onChange={(e) => set(i, { amount: e.target.value })} aria-label={`Amount for ${r.keyword || 'this word'}`} />
            <select value={r.unit} onChange={(e) => set(i, { unit: e.target.value })} aria-label="Unit">
              {Object.entries(UNITS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
            <button type="button" className="isu-extra-category-remove" onClick={() => setRows((all) => all.filter((_, j) => j !== i))} aria-label={`Remove ${r.keyword}`}>{'\u00d7'}</button>
          </li>
        ))}
      </ul>
      <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={() => setRows((all) => [...all, { keyword: '', amount: '', unit: 'fl_oz' }])}>+ Add a word</button>
      {!canSave ? <p className="isu-notice">Saving your own list needs a database update first. Until then these starting amounts are used.</p> : null}
      {rows.length && problem ? <p className="isu-hint">{problem}</p> : null}
      <ErrorNote message={error} />
      <div className="isu-pos-actions">
        <button
          type="button"
          className="isu-btn isu-btn--primary"
          disabled={busy || !canSave || Boolean(problem)}
          onClick={() => onSave(rows.map((r, i) => ({ keyword: words[i], amount: Number(r.amount), unit: r.unit })))}
        >
          {busy ? 'Saving…' : 'Save house amounts'}
        </button>
        <button type="button" className="isu-btn isu-btn--ghost" disabled={busy} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

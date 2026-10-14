import React from 'react';
import { COLUMN_KINDS } from '../../utils/duezyRoster.js';

const PLAYER_ROW_LABELS = { players: 'Player name', captain: 'Captain / Y' };

const letter = (i) => (i < 26 ? String.fromCharCode(65 + i) : `${String.fromCharCode(64 + Math.floor(i / 26))}${String.fromCharCode(65 + (i % 26))}`);

/** "Match your columns": one dropdown per spreadsheet column, with a couple of sample values. */
export default function DuezyColumnMap({ rows, kinds, hasHeadings, perPlayer = false, onKinds, onHeadings }) {
  const label = (k) => (perPlayer && PLAYER_ROW_LABELS[k.value]) || k.label;
  const data = hasHeadings ? rows.slice(1) : rows;
  const width = Math.max(0, ...rows.map((r) => r.length));
  const columns = Array.from({ length: width }, (_, i) => ({
    i,
    heading: hasHeadings ? rows[0][i] : '',
    samples: data.map((r) => r[i]).filter(Boolean).slice(0, 2),
  })).filter((c) => c.heading || c.samples.length);

  return (
    <fieldset className="dz-colmap">
      <legend>Match your columns</legend>
      <label className="dz-colmap-headings">
        <input type="checkbox" checked={hasHeadings} onChange={(e) => onHeadings(e.target.checked)} />
        First row is headings
      </label>
      <ul>
        {columns.map((c) => (
          <li key={c.i}>
            <div className="dz-colmap-col">
              <strong>{c.heading || `Column ${letter(c.i)}`}</strong>
              <small>{c.samples.join(' · ') || 'empty'}</small>
            </div>
            <select
              value={kinds[c.i] || 'skip'}
              onChange={(e) => onKinds(kinds.map((k, j) => (j === c.i ? e.target.value : k)))}
              aria-label={`Column ${c.heading || letter(c.i)} is`}
            >
              {COLUMN_KINDS.map((k) => <option key={k.value} value={k.value}>{label(k)}</option>)}
            </select>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}

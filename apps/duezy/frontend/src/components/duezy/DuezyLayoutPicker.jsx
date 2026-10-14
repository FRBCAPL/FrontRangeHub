import React from 'react';

const PREVIEW_ROWS = 8;
const rowPreview = (row) => row.filter(Boolean).slice(0, 4).join(' · ').slice(0, 60) || '(empty)';

/** Sheet layout: each row a team or a player, and which row the list starts on. */
export default function DuezyLayoutPicker({ rows, layout, onPerPlayer, onStartRow }) {
  const options = rows.slice(0, PREVIEW_ROWS);

  return (
    <div className="dz-layout-picker">
      <div className="dz-layout-mode" role="radiogroup" aria-label="Each row in the sheet is">
        <span>Each row is</span>
        {[{ value: false, label: 'a team' }, { value: true, label: 'a player' }].map((o) => (
          <button
            key={o.label}
            type="button"
            role="radio"
            aria-checked={layout.perPlayer === o.value}
            className={`dz-layout-chip${layout.perPlayer === o.value ? ' is-active' : ''}`}
            onClick={() => onPerPlayer(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
      {layout.perPlayer ? (
        <p className="dz-team-modal-hint">
          Rows with the same team name are grouped. A blank team cell counts as the team above. Mark the captain with a
          Captain column (their name, or Y / X on their row); otherwise the first player listed is the captain.
        </p>
      ) : null}
      {options.length > 1 ? (
        <label className="dz-field dz-layout-start">
          <span>{layout.hasHeadings ? 'Headings row' : 'List starts at'}</span>
          <select value={layout.startRow} onChange={(e) => onStartRow(Number(e.target.value))}>
            {options.map((row, i) => (
              <option key={i} value={i}>Row {i + 1}: {rowPreview(row)}</option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
}

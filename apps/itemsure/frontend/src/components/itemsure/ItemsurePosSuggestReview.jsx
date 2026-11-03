import React, { useState } from 'react';
import { posPrice } from '../../utils/itemsurePosMatch.js';
import { ErrorNote } from './ItemsureUi.jsx';

/**
 * Review suggested matches before saving: every suggestion with a tick box (all ticked to start).
 * `suggestions` is [{ pos, item }]; `onMatch(list)` saves the ticked ones.
 */
export default function ItemsurePosSuggestReview({ suggestions, busy, error = '', onMatch, onCancel }) {
  const [skipped, setSkipped] = useState(() => new Set());
  const ticked = suggestions.filter((s) => !skipped.has(s.pos.external_id));
  const toggle = (id) => setSkipped((s) => {
    const next = new Set(s);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  return (
    <div className="isu-stack">
      <p className="isu-muted isu-small">Untick any that are wrong. Only ticked ones are matched; the rest stay under &ldquo;Not matched&rdquo;.</p>
      <div className="isu-pos-actions">
        <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={() => setSkipped(new Set())}>Tick all</button>
        <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={() => setSkipped(new Set(suggestions.map((s) => s.pos.external_id)))}>Untick all</button>
      </div>
      <ul className="isu-pos-review">
        {suggestions.map(({ pos, item }) => (
          <li key={pos.external_id}>
            <label className="isu-check">
              <input type="checkbox" checked={!skipped.has(pos.external_id)} onChange={() => toggle(pos.external_id)} />
              <span>
                <strong>{pos.name}</strong>
                {posPrice(pos) ? <span className="isu-muted isu-small"> · {posPrice(pos)}</span> : null}
                <span className="isu-pos-review-arrow" aria-hidden="true"> → </span>
                <span className="isu-sr-only"> matches </span>
                {item.name}
              </span>
            </label>
          </li>
        ))}
      </ul>
      <ErrorNote message={error} />
      <div className="isu-pos-actions">
        <button type="button" className="isu-btn isu-btn--primary" disabled={busy || !ticked.length} onClick={() => onMatch(ticked)}>
          {busy ? 'Matching…' : `Match ticked (${ticked.length})`}
        </button>
        <button type="button" className="isu-btn isu-btn--ghost" disabled={busy} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { posPrice } from '../../utils/itemsurePosMatch.js';
import { ErrorNote } from './ItemsureUi.jsx';

/**
 * Review suggested matches before saving: every suggestion with a tick box (all ticked to start).
 * `suggestions` is [{ pos, item }]; `onMatch(ticked, { ignoreUnticked })` saves ticked links and
 * permanently dismisses unticked guesses when `canIgnore` is true.
 */
export default function ItemsurePosSuggestReview({
  suggestions, busy, error = '', canIgnore = false, onMatch, onCancel,
}) {
  const [skipped, setSkipped] = useState(() => new Set());
  const [forgetUnticked, setForgetUnticked] = useState(true);
  const ticked = suggestions.filter((s) => !skipped.has(s.pos.external_id));
  const unticked = suggestions.filter((s) => skipped.has(s.pos.external_id));
  const toggle = (id) => setSkipped((s) => {
    const next = new Set(s);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
  const willIgnore = canIgnore && forgetUnticked && unticked.length > 0;
  const canSave = ticked.length > 0 || willIgnore;
  const save = () => onMatch(ticked, {
    ignoreUnticked: willIgnore ? unticked : [],
  });
  const saveLabel = () => {
    if (busy) return ticked.length ? 'Matching…' : 'Saving…';
    if (ticked.length && willIgnore) return `Match ${ticked.length}, hide ${unticked.length}`;
    if (ticked.length) return `Match ticked (${ticked.length})`;
    return `Don’t suggest again (${unticked.length})`;
  };

  return (
    <div className="isu-stack">
      <p className="isu-muted isu-small">
        Untick any that are wrong. Only ticked ones are matched
        {canIgnore ? '; unticked can be hidden from suggestions next time' : '; the rest stay under “Not matched”'}.
      </p>
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
      {canIgnore && unticked.length ? (
        <label className="isu-check">
          <input type="checkbox" checked={forgetUnticked} onChange={(e) => setForgetUnticked(e.target.checked)} />
          <span>Don&apos;t suggest the unticked ones again ({unticked.length})</span>
        </label>
      ) : null}
      <ErrorNote message={error} />
      <div className="isu-pos-actions">
        <button type="button" className="isu-btn isu-btn--primary" disabled={busy || !canSave} onClick={save}>
          {saveLabel()}
        </button>
        <button type="button" className="isu-btn isu-btn--ghost" disabled={busy} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

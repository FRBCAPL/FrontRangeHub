import React from 'react';
import { doubledItems } from '../../utils/itemsurePosModifiers.js';

/**
 * On a Clover item matched to several items: which ones a Double pours more of (the liquor, not
 * the mixer). Shown as ticks; at least one stays ticked. Choosing only the main item saves as the
 * default. onSave(itemIds) with [] meaning "main item only".
 */
export default function ItemsurePosDoubles({ posName, matched, chosen, canEdit, busy, onSave }) {
  const ids = matched.map((i) => i.id);
  const ticked = new Set(doubledItems(ids, chosen));

  const toggle = (id) => {
    const next = ids.filter((x) => (x === id ? !ticked.has(x) : ticked.has(x)));
    if (!next.length) return;
    onSave(next.length === 1 && next[0] === ids[0] ? [] : next);
  };

  return (
    <div className="isu-pos-doubles" role="group" aria-label={`What a Double of ${posName} pours more of`}>
      <span className="isu-muted">A Double pours more of:</span>
      {matched.map((item) => {
        const on = ticked.has(item.id);
        return (
          <label key={item.id}>
            <input type="checkbox" checked={on} disabled={!canEdit || busy || (on && ticked.size === 1)} onChange={() => toggle(item.id)} />
            {item.name}
          </label>
        );
      })}
    </div>
  );
}

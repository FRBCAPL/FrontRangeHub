import React from 'react';

/**
 * "Also from": other suppliers that sell the item, as removable chips plus a dropdown to add one.
 * The main supplier ("Buy from") is never listed here. Archived suppliers already linked stay,
 * marked, so they can be removed. Hidden until a main supplier is chosen (unless some are linked).
 */
export default function ItemsureOtherSuppliersPicker({ suppliers, mainId, value, onChange }) {
  const chosen = value.filter((id) => id && id !== mainId);
  const byId = new Map(suppliers.map((s) => [s.id, s]));
  const left = suppliers.filter((s) => s.is_active && s.id !== mainId && !chosen.includes(s.id));
  if (!mainId && !chosen.length) return null;
  if (!chosen.length && !left.length) return null;
  const nameOf = (id) => {
    const s = byId.get(id);
    return s ? `${s.name}${s.is_active ? '' : ' (archived)'}` : 'Unknown supplier';
  };

  return (
    <div className="isu-extra-categories isu-field">
      <span>Also from (optional)</span>
      <p className="isu-hint">Other suppliers that sell it. Shopping still lists it under the main one.</p>
      {chosen.length ? (
        <ul className="isu-extra-category-list" aria-label="Also from">
          {chosen.map((id) => (
            <li key={id} className="isu-chip">
              {nameOf(id)}
              <button type="button" className="isu-extra-category-remove" onClick={() => onChange(chosen.filter((x) => x !== id))} aria-label={`Remove ${nameOf(id)}`}>
                {'\u00d7'}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {left.length ? (
        <select
          value=""
          aria-label="Add another supplier"
          onChange={(e) => e.target.value && onChange([...chosen, e.target.value])}
        >
          <option value="">+ Add {chosen.length ? 'another' : 'a'} supplier…</option>
          {left.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      ) : null}
    </div>
  );
}

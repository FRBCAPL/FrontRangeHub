import React, { useMemo, useState } from 'react';
import { singularUnit } from '../../utils/itemsureItemLook.js';
import { MAX_INGREDIENTS } from '../../utils/itemsureRecipes.js';
import { ErrorNote } from './ItemsureUi.jsx';
import ItemsureItemSearchPick from './ItemsureItemSearchPick.jsx';

/**
 * Add one catalog item to many recipes at once. Recipes that already have it (or are full) are
 * listed but not ticked. onSave(itemId, amount|null, unit|null, recipeIds) returns
 * { updated, skippedHave, skippedFull } or false.
 */
export default function ItemsureRecipeBulkAdd({ recipes, items, error, onSave, onClose }) {
  const [itemId, setItemId] = useState('');
  const [amount, setAmount] = useState('1');
  const [unit, setUnit] = useState('base');
  const [picked, setPicked] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const [done, setDone] = useState(null);

  const item = items.find((i) => i.id === itemId);
  const unitName = singularUnit(item?.unitName || 'unit').toLowerCase();
  const activeItems = useMemo(() => items.filter((i) => i.is_active), [items]);

  const rows = useMemo(() => (recipes || []).map((r) => {
    const has = r.lines.some((l) => l.itemId === itemId);
    const full = r.lines.length >= MAX_INGREDIENTS;
    return { recipe: r, has, full, blocked: has || full };
  }), [recipes, itemId]);

  const eligible = rows.filter((r) => !r.blocked);
  const toggle = (id, on) => setPicked((s) => {
    const next = new Set(s);
    if (on) next.add(id);
    else next.delete(id);
    return next;
  });
  const pickAll = () => setPicked(new Set(eligible.map((r) => r.recipe.id)));

  const submit = async (e) => {
    e.preventDefault();
    if (!itemId) {
      setProblem('Pick an ingredient.');
      return;
    }
    const ids = [...picked].filter((id) => eligible.some((r) => r.recipe.id === id));
    if (!ids.length) {
      setProblem('Tick at least one recipe.');
      return;
    }
    const text = String(amount ?? '').trim();
    let amt = null;
    let unt = null;
    if (text) {
      const n = Number(text);
      if (!(n > 0) || n > 100000) {
        setProblem('Amount must be more than 0, or left empty for the usual pour.');
        return;
      }
      amt = n;
      unt = unit || 'base';
    }
    setProblem('');
    setBusy(true);
    const result = await onSave(itemId, amt, unt, ids);
    setBusy(false);
    if (!result) return;
    setDone(result);
    setPicked(new Set());
  };

  if (done) {
    return (
      <div className="isu-stack">
        <p>
          Added to {done.updated} recipe{done.updated === 1 ? '' : 's'}.
          {done.skippedHave ? ` ${done.skippedHave} already had it.` : ''}
          {done.skippedFull ? ` ${done.skippedFull} were already full.` : ''}
        </p>
        <button type="button" className="isu-btn isu-btn--primary isu-btn--sm" onClick={onClose}>Done</button>
      </div>
    );
  }

  return (
    <form className="isu-stack" onSubmit={submit}>
      <p className="isu-muted isu-small">
        One ingredient, many recipes — like checkered sheets on every food plate. Clover buttons already using those recipes update too.
      </p>
      {!itemId ? (
        <ItemsureItemSearchPick
          items={activeItems}
          label="Pick the ingredient"
          placeholder="Type to find an item"
          disabled={busy}
          onPick={(id) => { setItemId(id); setPicked(new Set()); }}
        />
      ) : (
        <div className="isu-pos-mod-line">
          <strong>{item?.name || 'Item'}</strong>
          <span className="isu-pos-pour-inputs">
            <input type="number" inputMode="decimal" min="0" step="any" value={amount} placeholder="usual" disabled={busy}
              onChange={(e) => setAmount(e.target.value)} aria-label="Amount" />
            <select value={unit} disabled={busy || !String(amount).trim()} onChange={(e) => setUnit(e.target.value)} aria-label="Unit">
              <option value="base">{unitName}</option>
              <option value="piece">single from the {unitName}</option>
              <option value="fl_oz">oz</option>
              <option value="ml">ml</option>
            </select>
            <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={() => { setItemId(''); setPicked(new Set()); }}>
              Change
            </button>
          </span>
        </div>
      )}

      {itemId ? (
        <>
          <div className="isu-pos-ask-actions">
            <span className="isu-small"><strong>Recipes</strong></span>
            {eligible.length ? (
              <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={pickAll}>
                Select all ({eligible.length})
              </button>
            ) : null}
          </div>
          {!rows.length ? <p className="isu-muted">No recipes yet.</p> : null}
          <ul className="isu-recipe-buttons" aria-label="Recipes">
            {rows.map(({ recipe: r, has, full, blocked }) => (
              <li key={r.id}>
                <label className="isu-check">
                  <input
                    type="checkbox"
                    checked={picked.has(r.id)}
                    disabled={busy || blocked}
                    onChange={(e) => toggle(r.id, e.target.checked)}
                  />
                  <span>
                    <strong>{r.name}</strong>
                    <span className="isu-muted isu-small">
                      {' '}
                      {has ? 'Already has it' : full ? 'Already has 20 ingredients' : `${r.lines.length} ingredient${r.lines.length === 1 ? '' : 's'}`}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <ErrorNote message={problem || error} />
      <div className="isu-pos-ask-actions">
        <button type="submit" className="isu-btn isu-btn--primary isu-btn--sm" disabled={busy || !itemId}>
          {busy ? 'Saving…' : 'Add to recipes'}
        </button>
        <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={onClose}>Cancel</button>
      </div>
    </form>
  );
}

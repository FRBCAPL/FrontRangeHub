import React, { useMemo, useState } from 'react';
import { isGroupUnit } from '../../utils/itemsureCategoryKind.js';
import { matchItemByModifierName, ruleLines } from '../../utils/itemsurePosModifiers.js';
import { singularUnit } from '../../utils/itemsureItemLook.js';
import ItemsurePosModifierLines from './ItemsurePosModifierLines.jsx';

function defaultUnitFor(item) {
  if (!item) return 'fl_oz';
  if (isGroupUnit({ name: item.unitName || '', code: '' })) return 'piece';
  const u = singularUnit(item.unitName || '').toLowerCase();
  if (u.includes('bottle') || u.includes('can') || u.includes('each')) return 'base';
  return 'fl_oz';
}

function startLines(start, nameMatch, itemsById) {
  const fromRule = (start.action === 'recipe' ? [] : ruleLines(start))
    .filter((l) => l.itemId)
    .map((l) => ({ itemId: l.itemId, amount: String(l.amount ?? 1), unit: l.unit || defaultUnitFor(itemsById.get(l.itemId)) }));
  if (fromRule.length) return fromRule;
  if (nameMatch) {
    return [{ itemId: nameMatch.id, amount: '1', unit: defaultUnitFor(nameMatch) }];
  }
  return [];
}

function startAction(modifier, nameMatch) {
  const start = modifier.rule || modifier.guess;
  if (start?.action === 'items') return 'item';
  if (start?.action) return start.action;
  // Unset + same-named stock (Ranch): start on "takes stock", not "nothing".
  if (nameMatch) return 'item';
  return '';
}

/**
 * Settings → Add-ons modal: plain cards for what one Clover tap should do to stock.
 * Same-name sides (Ranch → Ranch) lead with “takes stock of that item”, not “nothing”.
 */
export default function ItemsurePosModifierForm({ modifier, items, recipes = null, multiReady = false, onSave, onCancel }) {
  const itemsById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const nameMatch = useMemo(() => matchItemByModifierName(modifier.name, items), [modifier.name, items]);
  const start = modifier.rule || modifier.guess || { action: 'none' };

  const [action, setAction] = useState(() => startAction(modifier, nameMatch));
  const [recipeId, setRecipeId] = useState(start.action === 'recipe' ? start.recipeId : '');
  const [pours, setPours] = useState(String(start.extraPours ?? 1));
  const [lines, setLines] = useState(() => startLines(start, nameMatch, itemsById));
  const [busy, setBusy] = useState(false);
  const [showRecipe, setShowRecipe] = useState(start.action === 'recipe');

  const known = new Set(items.map((i) => i.id));
  const p = Number(pours);
  const linesOk = lines.length > 0 && (multiReady || lines.length === 1) && lines.length <= 20
    && lines.every((l) => known.has(l.itemId) && Number(l.amount) > 0 && Number(l.amount) <= 100000);
  const valid = action === 'none'
    || (action === 'extra' && p > 0 && p <= 100)
    || (action === 'item' && linesOk)
    || (action === 'recipe' && (recipes || []).some((r) => r.id === recipeId));

  const toRule = () => {
    if (action === 'extra') return { action, extraPours: p };
    if (action === 'recipe') return { action, recipeId };
    if (action !== 'item') return { action: 'none' };
    const out = lines.map((l) => ({ itemId: l.itemId, amount: Number(l.amount), unit: l.unit }));
    return out.length === 1 ? { action: 'item', ...out[0] } : { action: 'items', lines: out };
  };

  const pick = (value) => {
    setAction(value);
    if (value === 'item' && !lines.length && nameMatch) {
      setLines([{ itemId: nameMatch.id, amount: '1', unit: defaultUnitFor(nameMatch) }]);
    }
    if (value === 'recipe') setShowRecipe(true);
  };

  const save = async (e) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    const ok = await onSave(toRule());
    setBusy(false);
    if (ok) onCancel();
  };

  const card = (value, title, hint) => (
    <button
      key={value}
      type="button"
      className={`isu-pos-fix-choice${action === value ? ' is-on' : ''}`}
      disabled={busy}
      aria-pressed={action === value}
      onClick={() => pick(value)}
    >
      <strong>{title}</strong>
      <span className="isu-muted isu-small">{hint}</span>
    </button>
  );

  const label = modifier.name || 'this add-on';
  const stockTitle = nameMatch
    ? `Takes stock of ${nameMatch.name}`
    : 'Takes stock of an item';
  const stockHint = nameMatch
    ? 'Correct for sides and add-ins you keep in inventory — even when the names match.'
    : 'Red Bull, a sauce, a can, a side — pick what leaves the shelf.';

  return (
    <form className="isu-pos-mod-form isu-pos-mod-form--cards" onSubmit={save} aria-label={`What ${label} uses`}>
      <p className="isu-pos-mod-lead">
        Staff tap <strong>{label}</strong> in Clover. What should ItemSure count against inventory?
      </p>

      {nameMatch && !modifier.rule ? (
        <div className="isu-notice isu-pos-mod-recommend" role="status">
          <p className="isu-small">
            You already have stock named <strong>{nameMatch.name}</strong>. Start with the first option below — that is the usual answer for sides like this.
          </p>
        </div>
      ) : null}

      <div className="isu-pos-fix-choices" role="group" aria-label="What this add-on uses">
        {card('item', stockTitle, stockHint)}
        {card('extra', 'More of the same drink', 'Double, Triple, or an extra shot of whatever was already poured.')}
        {card('none', 'Nothing from stock', 'Only a preference — Rocks, Neat, lime, salt rim. No inventory moves.')}
      </div>

      {action === 'item' ? (
        <div className="isu-pos-mod-detail">
          <p className="isu-small"><strong>How much leaves stock each time?</strong></p>
          {nameMatch && lines.length === 1 && lines[0].itemId === nameMatch.id ? (
            <p className="isu-muted isu-small">
              Keeping <strong>{nameMatch.name}</strong> selected is right. You are not picking “another” product — this add-on <em>is</em> that stock.
            </p>
          ) : null}
          <ItemsurePosModifierLines lines={lines} items={items} multiReady={multiReady} busy={busy} onChange={setLines} />
        </div>
      ) : null}

      {action === 'extra' ? (
        <div className="isu-pos-mod-detail">
          <label className="isu-pos-pour-field">
            <span>How many extra pours? (Double = 1, Triple = 2)</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={pours}
              disabled={busy}
              onChange={(e) => setPours(e.target.value)}
              aria-label="Extra pours"
            />
          </label>
          <p className="isu-muted isu-small">Which drink categories count as “the pour” is set at the top of the Add-ons page.</p>
        </div>
      ) : null}

      {action === 'none' ? (
        <div className="isu-pos-mod-detail">
          <p className="isu-muted isu-small">
            Sales reports will ignore this tap for inventory. Use this only when nothing physical comes off the shelf.
          </p>
        </div>
      ) : null}

      {recipes ? (
        showRecipe || action === 'recipe' ? (
          <div className="isu-pos-mod-detail">
            {card('recipe', 'Uses a whole recipe', 'Make it a Margarita — every line in that recipe. Changing the recipe changes this too.')}
            {action === 'recipe' ? (
              recipes.length ? (
                <label className="isu-pos-pour-field">
                  <span>Which recipe?</span>
                  <select value={recipeId} disabled={busy} onChange={(e) => setRecipeId(e.target.value)} aria-label="Recipe">
                    <option value="">Pick a recipe…</option>
                    {recipes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </label>
              ) : (
                <p className="isu-muted isu-small">No recipes yet. Add them under Inventory → Recipes, then come back.</p>
              )
            ) : null}
          </div>
        ) : (
          <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={() => setShowRecipe(true)}>
            Need a whole recipe instead?
          </button>
        )
      ) : null}

      {!action ? (
        <p className="isu-muted isu-small">Tap one of the options above to continue.</p>
      ) : null}

      <div className="isu-pos-ask-actions">
        <button type="submit" className="isu-btn isu-btn--primary" disabled={busy || !valid}>
          {busy ? 'Saving…' : 'Save'}
        </button>
        <button type="button" className="isu-btn isu-btn--ghost" disabled={busy} onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

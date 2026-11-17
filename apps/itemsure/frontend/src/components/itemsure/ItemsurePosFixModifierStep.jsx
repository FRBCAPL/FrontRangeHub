import React, { useMemo, useState } from 'react';
import { isGroupUnit } from '../../utils/itemsureCategoryKind.js';
import { ruleLines } from '../../utils/itemsurePosModifiers.js';
import { singularUnit } from '../../utils/itemsureItemLook.js';
import ItemsureItemSearchPick from './ItemsureItemSearchPick.jsx';

/**
 * One add-on in the Fix-it walkthrough: three plain choices, then only the follow-up that
 * choice needs. `focusItemId` pre-fills “another item” with the stock item being fixed.
 * `preferPiece`: case/pack items should start as “1 single from the case”, not ounces.
 * onSave(rule) → true when saved.
 */
export default function ItemsurePosFixModifierStep({
  modifier, items, focusItemId = null, itemName = 'this item', preferPiece = false, onSave, onBack, onSkip,
}) {
  const guess = modifier.guess;
  const start = modifier.rule || guess || null;
  const startAction = start?.action === 'items' ? 'item' : start?.action || '';
  const [action, setAction] = useState(startAction);
  const [pours, setPours] = useState(String(start?.extraPours ?? (guess?.extraPours ?? 1)));
  const [line, setLine] = useState(() => {
    const fromRule = ruleLines(start).find((l) => l.itemId);
    const pieceUnit = (unit) => (preferPiece && (unit === 'fl_oz' || unit === 'ml' || !unit) ? 'piece' : (unit || (preferPiece ? 'piece' : 'base')));
    if (fromRule) {
      return {
        itemId: fromRule.itemId,
        amount: String(fromRule.amount ?? 1),
        unit: pieceUnit(fromRule.unit),
      };
    }
    if (focusItemId) return { itemId: focusItemId, amount: '1', unit: preferPiece ? 'piece' : 'base' };
    return null;
  });
  const [busy, setBusy] = useState(false);
  const [showMore, setShowMore] = useState(startAction === 'recipe');
  const [recipeId, setRecipeId] = useState(start?.action === 'recipe' ? start.recipeId || '' : '');

  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const picked = line ? byId.get(line.itemId) : null;
  const unitName = singularUnit(picked?.unitName || 'unit').toLowerCase();

  const p = Number(pours);
  const lineOk = line && byId.has(line.itemId) && Number(line.amount) > 0 && Number(line.amount) <= 100000;
  const valid = (action === 'none')
    || (action === 'extra' && p > 0 && p <= 100)
    || (action === 'item' && lineOk)
    || (action === 'recipe' && recipeId);

  const toRule = () => {
    if (action === 'extra') return { action: 'extra', extraPours: p };
    if (action === 'recipe') return { action: 'recipe', recipeId };
    if (action === 'item') {
      return { action: 'item', itemId: line.itemId, amount: Number(line.amount), unit: line.unit };
    }
    return { action: 'none' };
  };

  const save = async (rule) => {
    setBusy(true);
    const ok = await onSave(rule);
    setBusy(false);
    return ok;
  };

  const pick = (next) => {
    setAction(next);
    if (next === 'item' && !line && focusItemId) {
      setLine({ itemId: focusItemId, amount: '1', unit: preferPiece ? 'piece' : 'base' });
    }
  };

  const groupPick = picked && isGroupUnit({ name: picked.unitName || '', code: '' });

  const choice = (value, title, hint) => (
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

  return (
    <div className="isu-stack isu-pos-fix-step">
      <p className="isu-muted isu-small">
        Staff tapped <strong>{modifier.name || 'this add-on'}</strong> on a sale that used {itemName}.
        What should ItemSure take off stock for that tap?
      </p>

      {!modifier.rule && guess?.action === 'extra' ? (
        <div className="isu-notice isu-pos-fix-suggest" role="status">
          <p className="isu-small">
            This looks like a <strong>Double</strong> (or Triple): more of the same drink.
          </p>
          <button
            type="button"
            className="isu-btn isu-btn--primary isu-btn--sm"
            disabled={busy}
            onClick={() => save({ action: 'extra', extraPours: guess.extraPours || 1 })}
          >
            Yes, save that
          </button>
        </div>
      ) : null}
      {!modifier.rule && guess?.action === 'none' ? (
        <div className="isu-notice isu-pos-fix-suggest" role="status">
          <p className="isu-small">This looks like garnish / ice / rocks — usually nothing from stock.</p>
          <button
            type="button"
            className="isu-btn isu-btn--primary isu-btn--sm"
            disabled={busy}
            onClick={() => save({ action: 'none' })}
          >
            Yes, nothing from stock
          </button>
        </div>
      ) : null}

      <div className="isu-pos-fix-choices" role="group" aria-label="What this add-on uses">
        {choice('extra', 'More of the same drink', 'Double, Triple, extra shot')}
        {choice('item', `Takes ${itemName} (or another item)`, 'Add Red Bull, ranch, a can, a side')}
        {choice('none', 'Nothing from stock', 'Rocks, neat, lime, salt rim')}
      </div>

      {action === 'extra' ? (
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
      ) : null}

      {action === 'item' ? (
        <div className="isu-pos-pour-field">
          {picked ? (
            <div className="isu-pos-mod-line">
              <strong>{picked.name}</strong>
              <span className="isu-pos-pour-inputs">
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  value={line.amount}
                  disabled={busy}
                  onChange={(e) => setLine((l) => ({ ...l, amount: e.target.value }))}
                  aria-label={`How much ${picked.name}`}
                />
                <select
                  value={line.unit}
                  disabled={busy}
                  onChange={(e) => setLine((l) => ({ ...l, unit: e.target.value }))}
                  aria-label="Unit"
                >
                  {(groupPick || preferPiece) ? <option value="piece">1 single from the {unitName}</option> : null}
                  <option value="base">{unitName}(s)</option>
                  <option value="fl_oz">oz</option>
                  <option value="ml">ml</option>
                </select>
                <button
                  type="button"
                  className="isu-btn isu-btn--ghost isu-btn--sm"
                  disabled={busy}
                  onClick={() => setLine(null)}
                >
                  Change item
                </button>
              </span>
              <span className="isu-muted isu-small">
                {(groupPick || preferPiece)
                  ? `For a ${unitName}, pick “single from the ${unitName}”. A full can is 1; a splash/add-on can be a fraction (0.25, 0.5, …). Ounces are for poured bottles, not cases.`
                  : `Prefer “${unitName}(s)” or “single” when you can — oz/ml also need a bottle size on the item.`}
              </span>
            </div>
          ) : (
            <ItemsureItemSearchPick
              items={items}
              label="Which item does it take?"
              disabled={busy}
              onPick={(id) => {
                const it = byId.get(id);
                const group = isGroupUnit({ name: it?.unitName || '', code: '' });
                setLine({ itemId: id, amount: '1', unit: group || preferPiece ? 'piece' : 'base' });
              }}
            />
          )}
        </div>
      ) : null}

      {showMore ? (
        (modifier.recipes || []).length ? (
          <label className="isu-pos-pour-field">
            <span>Recipe (optional)</span>
            <select
              value={action === 'recipe' ? recipeId : ''}
              disabled={busy}
              onChange={(e) => {
                setRecipeId(e.target.value);
                if (e.target.value) setAction('recipe');
              }}
              aria-label="Recipe"
            >
              <option value="">Pick a recipe…</option>
              {modifier.recipes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </label>
        ) : (
          <p className="isu-muted isu-small">No recipes yet. Add them under Inventory → Recipes if you need one.</p>
        )
      ) : (
        <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={() => setShowMore(true)}>
          Need a whole recipe instead?
        </button>
      )}

      <div className="isu-pos-actions">
        <button
          type="button"
          className="isu-btn isu-btn--primary"
          disabled={busy || !valid}
          onClick={() => save(toRule())}
        >
          {busy ? 'Saving…' : 'Save & next'}
        </button>
        {onSkip ? (
          <button type="button" className="isu-btn isu-btn--ghost" disabled={busy} onClick={onSkip}>Skip for now</button>
        ) : null}
        {onBack ? (
          <button type="button" className="isu-btn isu-btn--ghost" disabled={busy} onClick={onBack}>Back</button>
        ) : null}
      </div>
    </div>
  );
}
